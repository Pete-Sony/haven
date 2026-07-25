import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  createContentSecurityPolicy,
  createRequestNonce,
} from "@/server/security-headers";

const ACCOUNT_BACKED_PATHS = [
  "/auth",
  "/companion",
  "/check-in",
  "/onboarding",
  "/plan",
  "/api/account",
  "/api/companion",
] as const;

function requiresSessionRefresh(pathname: string): boolean {
  return ACCOUNT_BACKED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Refreshes Supabase cookies only on account-backed routes. Public urgent,
 * prevention, resource, and emergency pages never wait on authentication.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const nonce = createRequestNonce();
  const policy = createContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  // Next reads the request CSP to apply this nonce to framework scripts.
  requestHeaders.set("Content-Security-Policy", policy);
  requestHeaders.set("x-nonce", nonce);

  const nextResponse = () =>
    NextResponse.next({ request: { headers: requestHeaders } });
  const finalize = (response: NextResponse) => {
    response.headers.set("Content-Security-Policy", policy);
    return response;
  };

  if (!requiresSessionRefresh(request.nextUrl.pathname)) {
    return finalize(nextResponse());
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return finalize(nextResponse());

  let response = nextResponse();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = nextResponse();
        items.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return finalize(response);
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
