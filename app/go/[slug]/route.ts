import { NextResponse } from "next/server";

import { buildMainSiteGameUrl } from "@/lib/config";
import { getGameBySlug } from "@/lib/games";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const response = NextResponse.redirect(buildMainSiteGameUrl(game), 302);
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Cache-Control", "no-store");

  return response;
}
