import { z } from "zod";
import { requireUser } from "@/server/auth";
import { privateJson, readBoundedJson, requireSameOrigin } from "@/server/http";
import { createSupabaseAdminClient } from "@/server/supabase";

const deleteAccountSchema = z.object({ confirm: z.literal(true) }).strict();

export async function DELETE(request: Request) {
  if (!requireSameOrigin(request)) {
    return privateJson({ error: "invalid_origin" }, 403);
  }
  const account = await requireUser();
  if (!account) return privateJson({ error: "unauthorized" }, 401);
  try {
    deleteAccountSchema.parse(await readBoundedJson(request, 256));
  } catch {
    return privateJson({ error: "confirmation_required" }, 400);
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return privateJson({ error: "account_deletion_unavailable" }, 503);
  }
  const { error } = await admin.auth.admin.deleteUser(account.user.id);
  if (error) return privateJson({ error: "account_deletion_failed" }, 500);

  await account.supabase.auth.signOut({ scope: "local" });
  return privateJson({ deleted: true });
}
