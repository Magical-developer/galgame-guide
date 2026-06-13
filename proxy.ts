import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { slugRedirects } from "@/lib/generated-redirects";

export const config = {
  matcher: ["/((?!api|_next|static|go|favicon.ico|sitemap.xml|robots.txt).*)"],
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only handle top-level slugs like /some-slug, not nested paths.
  if (pathname.split("/").length > 2) {
    return NextResponse.next();
  }

  const slug = pathname.slice(1);
  if (!slug) return NextResponse.next();

  const target = slugRedirects[slug];
  if (!target) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${target}`;
  return NextResponse.redirect(url, 301);
}
