import { NextResponse } from "next/server";
import { safeNextPath } from "@/server/auth";
import {
  createSupabaseServerClient,
  isGoogleOAuthEnabled,
} from "@/server/supabase";

function authErrorResponse(
  request: Request,
  error: "accounts_unavailable" | "sign_in_failed",
  nextPath: string,
): NextResponse {
  const destination = new URL("/auth", request.url);
  destination.searchParams.set("error", error);
  destination.searchParams.set("next", nextPath);
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const nextPath = safeNextPath(requestUrl.searchParams.get("next"), "/plan");
  if (!isGoogleOAuthEnabled()) {
    return authErrorResponse(request, "accounts_unavailable", nextPath);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return authErrorResponse(request, "accounts_unavailable", nextPath);
  }

  const callback = new URL("/auth/callback", requestUrl.origin);
  callback.searchParams.set("next", nextPath);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      scopes: "openid email profile",
    },
  });
  if (error || !data.url) {
    return authErrorResponse(request, "sign_in_failed", nextPath);
  }

  const response = NextResponse.redirect(data.url);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
