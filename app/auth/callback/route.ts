import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/server/supabase";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const supabase = await createSupabaseServerClient();
  if (!code || !supabase) {
    return NextResponse.redirect(
      new URL("/plan?error=sign_in_failed", url.origin),
    );
  }
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(
    new URL(error ? "/plan?error=sign_in_failed" : "/plan", url.origin),
  );
}
