import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { siteConfig } from "@/lib/config";

function isAuthorized(authorization: string | null, userAgent: string | null) {
  if (
    siteConfig.cronSecret &&
    authorization === `Bearer ${siteConfig.cronSecret}`
  ) {
    return true;
  }
  if (userAgent?.includes("vercel-cron")) {
    return true;
  }
  return false;
}

export const maxDuration = 60;

export async function GET() {
  const requestHeaders = await headers();
  const authorization = requestHeaders.get("authorization");
  const userAgent = requestHeaders.get("user-agent");

  console.log("[Cron] Incoming request:", { userAgent, hasAuth: !!authorization });

  if (!isAuthorized(authorization, userAgent)) {
    console.error("[Cron] Unauthorized access attempt.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // NOTE: Data sync has been moved to GitHub Actions because the source API
  // blocks all Vercel IP ranges. This cron only triggers a redeploy.
  console.log("[Cron] Data sync runs on GitHub Actions. Triggering redeploy only...");

  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_ORG_ID;

  if (!token || !projectId) {
    console.error("[Cron] Missing VERCEL_TOKEN or VERCEL_PROJECT_ID.");
    return NextResponse.json(
      { ok: false, message: "Missing redeploy config." },
      { status: 500 }
    );
  }

  try {
    console.log("[Cron] Fetching latest production deployment...");
    const listParams = new URLSearchParams({
      projectId,
      limit: "1",
      state: "READY",
      target: "production",
    });
    if (teamId) listParams.set("teamId", teamId);

    const listResponse = await fetch(
      `https://api.vercel.com/v6/deployments?${listParams.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!listResponse.ok) {
      const text = await listResponse.text();
      console.error("[Cron] Vercel List API failed:", listResponse.status, text);
      return NextResponse.json(
        { ok: false, message: `Vercel List API error: ${listResponse.status}` },
        { status: 502 }
      );
    }

    const { deployments } = await listResponse.json();
    const latestId = deployments?.[0]?.uid;
    if (!latestId) {
      return NextResponse.json(
        { ok: false, message: "No production deployment found." },
        { status: 404 }
      );
    }

    console.log("[Cron] Triggering redeploy for deployment ID:", latestId);
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
      }
    );

    if (!redeployResponse.ok) {
      const text = await redeployResponse.text();
      console.error("[Cron] Redeploy failed:", redeployResponse.status, text);
      return NextResponse.json(
        { ok: false, message: `Redeploy failed: ${redeployResponse.status}` },
        { status: 502 }
      );
    }

    const result = await redeployResponse.json();
    console.log("[Cron] Redeploy triggered:", result.id || result.url);

    return NextResponse.json({
      ok: true,
      message: "Redeploy triggered. Data sync runs on GitHub Actions.",
      deploymentId: result.id,
    });
  } catch (error: any) {
    console.error("[Cron] Fatal error:", error.message);
    return NextResponse.json(
      { ok: false, message: "Internal error.", error: error.message },
      { status: 500 }
    );
  }
}
