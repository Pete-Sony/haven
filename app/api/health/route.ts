import { NextResponse } from "next/server";
import { CONTENT_VERSION } from "@/lib/domain/resources";

export function GET(): NextResponse {
  return NextResponse.json({
    status: "ok",
    service: "haven",
    contentVersion: CONTENT_VERSION,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    accountsConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.GOOGLE_OAUTH_ENABLED === "true",
    ),
  });
}
