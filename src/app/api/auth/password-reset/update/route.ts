import { z } from "zod";
import { privateJson, readBoundedJson, requireSameOrigin } from "@/server/http";
import { consumeAuthBudget } from "@/server/rate-limit";
import { createSupabaseServerClient } from "@/server/supabase";

const inputSchema = z.object({ password: z.string().min(8).max(128) }).strict();

export async function POST(request: Request) {
  if (!requireSameOrigin(request)) {
    return privateJson({ error: "invalid_origin" }, 403);
  }
  const budget = consumeAuthBudget(request);
  if (!budget.allowed) {
    const response = privateJson({ error: "try_again_later" }, 429);
    response.headers.set("Retry-After", String(budget.retryAfterSeconds));
    return response;
  }
  let password: string;
  try {
    password = inputSchema.parse(
      await readBoundedJson(request, 1_024),
    ).password;
  } catch {
    return privateJson({ error: "invalid_password" }, 400);
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return privateJson({ error: "authentication_unavailable" }, 503);
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return privateJson({ error: "reset_link_required" }, 401);
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return privateJson({ error: "password_update_failed" }, 400);
  return privateJson({ updated: true, next: "/account" });
}
