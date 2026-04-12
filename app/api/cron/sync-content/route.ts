import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { siteConfig } from "@/lib/config";

function isAuthorized(authorization: string | null, userAgent: string | null) {
  // Allow manual requests with the correct secret header
  if (
    siteConfig.cronSecret &&
    authorization === `Bearer ${siteConfig.cronSecret}`
  ) {
    return true;
  }

  // Vercel Cron requests have a specific user-agent
  if (userAgent?.includes("vercel-cron")) {
    return true;
  }

  return false;
}

export async function GET() {
  const requestHeaders = await headers();
  const authorization = requestHeaders.get("authorization");
  const userAgent = requestHeaders.get("user-agent");

  console.log("[Cron] Incoming request:", {
    userAgent,
    hasAuth: !!authorization,
  });

  if (!isAuthorized(authorization, userAgent)) {
    console.error("[Cron] Unauthorized access attempt.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_ORG_ID;

  if (!token || !projectId) {
    console.error(
      "[Cron] Configuration error: VERCEL_TOKEN or VERCEL_PROJECT_ID is missing from environment variables.",
    );
    return NextResponse.json(
      {
        ok: false,
        message: "Server configuration error (missing environment variables).",
      },
      { status: 500 },
    );
  }

  try {
    console.log(
      "[Cron] Fetching latest production deployment for project:",
      projectId,
    );

    // Find the latest successful production deployment
    const listParams = new URLSearchParams({
      projectId,
      limit: "1",
      state: "READY",
      target: "production",
    });
    // Only add teamId if it's actually set (Team account vs Personal account)
    if (teamId) listParams.set("teamId", teamId);

    const listUrl = `https://api.vercel.com/v6/deployments?${listParams.toString()}`;
    const listResponse = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error(
        "[Cron] Vercel List API failed:",
        listResponse.status,
        errorText,
      );
      return NextResponse.json(
        {
          ok: false,
          message: `Vercel List API error: ${listResponse.status}`,
          details: errorText,
        },
        { status: 502 },
      );
    }

    const { deployments } = await listResponse.json();
    const latestId = deployments?.[0]?.uid;

    if (!latestId) {
      console.warn("[Cron] No production deployment found to redeploy.");
      return NextResponse.json(
        { ok: false, message: "No production deployments found to redeploy." },
        { status: 404 },
      );
    }

    console.log("[Cron] Triggering redeploy for deployment ID:", latestId);

    // Trigger a new deployment from the latest production build
    const redeployParams = new URLSearchParams();
    if (teamId) redeployParams.set("teamId", teamId);

    const redeployResponse = await fetch(
      `https://api.vercel.com/v13/deployments?${redeployParams.toString()}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deploymentId: latestId,
          name: "galgame-guide",
          target: "production",
        }),
      },
    );

    if (!redeployResponse.ok) {
      const errorText = await redeployResponse.text();
      console.error(
        "[Cron] Vercel Redeploy API failed:",
        redeployResponse.status,
        errorText,
      );
      return NextResponse.json(
        {
          ok: false,
          message: `Redeploy failed: ${redeployResponse.status}`,
          details: errorText,
        },
        { status: 502 },
      );
    }

    const result = await redeployResponse.json();
    console.log(
      "[Cron] Redeploy successfully triggered:",
      result.id || result.url,
    );

    return NextResponse.json({
      ok: true,
      message:
        "Redeploy triggered. Content sync will run as part of the new build.",
      deploymentId: result.id,
      deploymentUrl: result.url ? `https://${result.url}` : undefined,
    });
  } catch (error: any) {
    console.error(
      "[Cron] Fatal error during sync-content execution:",
      error.message,
      error.stack,
    );
    return NextResponse.json(
      {
        ok: false,
        message: "Internal server error occurred while triggering redeploy.",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
