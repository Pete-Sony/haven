import { NextResponse } from "next/server";
import { isExpectedOrigin, safeNextPath } from "@/lib/server/auth";
import { createSupabaseServerClient } from "@/lib/server/supabase";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isExpectedOrigin(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const nextPath = safeNextPath(new URL(request.url).searchParams.get("next"));
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  const response = NextResponse.redirect(new URL(nextPath, request.url), {
    status: 303,
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
