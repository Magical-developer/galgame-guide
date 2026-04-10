import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { siteConfig } from "@/lib/config";

function isAuthorized(authorization: string | null, userAgent: string | null) {
  if (siteConfig.cronSecret && authorization === `Bearer ${siteConfig.cronSecret}`) {
    return true;
  }

  return userAgent?.includes("vercel-cron") ?? false;
}

export async function GET() {
  const requestHeaders = await headers();
  const authorization = requestHeaders.get("authorization");
  const userAgent = requestHeaders.get("user-agent");

  if (!isAuthorized(authorization, userAgent)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.VERCEL_TOKEN;
  // Vercel auto-injects VERCEL_PROJECT_ID and VERCEL_ORG_ID in every deployment
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_ORG_ID;

  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "VERCEL_TOKEN is not set. Create a Vercel API token and add it as an environment variable.",
      },
      { status: 500 }
    );
  }

  if (!projectId) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "VERCEL_PROJECT_ID is not available. This is normally injected automatically by Vercel.",
      },
      { status: 500 }
    );
  }

  // Find the latest successful production deployment
  const listParams = new URLSearchParams({
    projectId,
    limit: "1",
    state: "READY",
    target: "production",
  });
  if (teamId) listParams.set("teamId", teamId);

  const listResponse = await fetch(
    `https://api.vercel.com/v6/deployments?${listParams}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!listResponse.ok) {
    const text = await listResponse.text();
    return NextResponse.json(
      { ok: false, message: `Failed to fetch deployments: ${listResponse.status} ${text}` },
      { status: 502 }
    );
  }

  const { deployments } = await listResponse.json();
  const latestId = deployments?.[0]?.uid;

  if (!latestId) {
    return NextResponse.json(
      { ok: false, message: "No production deployments found to redeploy." },
      { status: 404 }
    );
  }

  // Trigger a new deployment from the latest production build
  const redeployParams = new URLSearchParams();
  if (teamId) redeployParams.set("teamId", teamId);

  const redeployResponse = await fetch(
    `https://api.vercel.com/v13/deployments?${redeployParams}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        deploymentId: latestId,
        name: "galgame-guide",
        target: "production",
      }),
    }
  );

  if (!redeployResponse.ok) {
    const text = await redeployResponse.text();
    return NextResponse.json(
      { ok: false, message: `Redeploy failed: ${redeployResponse.status} ${text}` },
      { status: 502 }
    );
  }

  const result = await redeployResponse.json();

  return NextResponse.json({
    ok: true,
    message: "Redeploy triggered. Content sync will run as part of the new build.",
    deploymentUrl: result.url ? `https://${result.url}` : undefined,
  });
}
