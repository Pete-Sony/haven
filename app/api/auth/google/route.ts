import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/server/supabase";

export async function GET(request: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(
      new URL("/plan?error=accounts_unavailable", request.url),
    );
  }
  const origin = new URL(request.url).origin;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) {
    return NextResponse.redirect(
      new URL("/plan?error=sign_in_failed", request.url),
    );
  }
  return NextResponse.redirect(data.url);
}
