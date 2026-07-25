import { NextResponse } from "next/server";
import { isExpectedOrigin, safeNextPath } from "@/lib/server/auth";
import { createSupabaseServerClient } from "@/lib/server/supabase";

interface EmailAuthInput {
  readonly email?: unknown;
  readonly mode?: unknown;
  readonly next?: unknown;
  readonly password?: unknown;
}

function privateJson(
  body: Record<string, unknown>,
  status = 200,
): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isExpectedOrigin(request)) {
    return privateJson({ error: "Request not allowed." }, 403);
  }

  let input: EmailAuthInput;
  try {
    input = (await request.json()) as EmailAuthInput;
  } catch {
    return privateJson({ error: "Enter a valid email and password." }, 400);
  }

  const email = typeof input.email === "string" ? input.email.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const mode = input.mode;
  const nextPath = safeNextPath(
    typeof input.next === "string" ? input.next : null,
  );
  if (
    !email ||
    email.length > 254 ||
    password.length < 8 ||
    password.length > 128 ||
    (mode !== "sign-in" && mode !== "sign-up")
  ) {
    return privateJson({ error: "Enter a valid email and password." }, 400);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return privateJson(
      { error: "Authentication is unavailable right now." },
      503,
    );
  }

  if (mode === "sign-in") {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return privateJson({ error: "Email or password not accepted." }, 400);
    }
    return privateJson({ next: nextPath });
  }

  const callback = new URL("/auth/callback", request.url);
  callback.searchParams.set("next", nextPath);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callback.toString() },
  });
  if (error) {
    return privateJson({ error: "Could not create the account." }, 400);
  }
  return privateJson({
    needsEmailConfirmation: !data.session,
    next: nextPath,
  });
}
