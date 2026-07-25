import { NextResponse } from "next/server";
import { safeNextPath } from "@/server/auth";
import { createSupabaseServerClient } from "@/server/supabase";

function authErrorResponse(url: URL, nextPath: string): NextResponse {
  const destination = new URL("/auth", url.origin);
  destination.searchParams.set("error", "sign_in_failed");
  destination.searchParams.set("next", nextPath);
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = safeNextPath(url.searchParams.get("next"));
  const supabase = await createSupabaseServerClient();
  if (!code || !supabase) {
    return authErrorResponse(url, nextPath);
  }
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return authErrorResponse(url, nextPath);

  const response = NextResponse.redirect(new URL(nextPath, url.origin));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
