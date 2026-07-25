import { z } from "zod";
import { privateJson, readBoundedJson, requireSameOrigin } from "@/server/http";
import { consumeAuthBudget } from "@/server/rate-limit";
import { createSupabaseServerClient } from "@/server/supabase";

const inputSchema = z
  .object({ email: z.string().trim().email().max(254) })
  .strict();

const GENERIC_RESPONSE = {
  accepted: true,
  message:
    "If an account exists for that email, Haven has sent reset instructions.",
};

export async function POST(request: Request) {
  if (!requireSameOrigin(request)) {
    return privateJson({ error: "invalid_origin" }, 403);
  }
  const budget = consumeAuthBudget(request);
  if (!budget.allowed) {
    const response = privateJson(GENERIC_RESPONSE);
    response.headers.set("Retry-After", String(budget.retryAfterSeconds));
    return response;
  }

  let email: string;
  try {
    email = inputSchema.parse(await readBoundedJson(request, 1_024)).email;
  } catch {
    return privateJson(GENERIC_RESPONSE);
  }
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const redirectTo = new URL("/auth/callback", request.url);
    redirectTo.searchParams.set("next", "/auth/reset-password");
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo.toString(),
    });
  }
  return privateJson(GENERIC_RESPONSE);
}
