import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  createStoredSupportMemory,
  storedSupportMemorySchema,
  SUPPORT_MEMORY_LIMIT,
  supportMemoryInputSchema,
  type StoredSupportMemory,
} from "@/domain/rag";
import {
  decryptBoundJson,
  encryptBoundJson,
  type StoredEncryptedValue,
} from "@/server/crypto";
import { supportMemoryAad } from "@/server/rag";
import { requireCompletedAccount } from "@/server/auth";
import { privateJson, readBoundedJson, requireSameOrigin } from "@/server/http";

const MAX_REQUEST_BYTES = 1_500;
const deleteRequestSchema = z.object({ id: z.string().uuid() }).strict();

async function userClient() {
  const access = await requireCompletedAccount();
  if (access.status !== "ready") {
    return { supabase: null, user: null, status: access.status };
  }
  return { ...access.account, status: access.status };
}

function accessDenied(status: "unauthenticated" | "onboarding_required") {
  return privateJson(
    {
      error: status === "unauthenticated" ? "unauthorized" : status,
    },
    status === "unauthenticated" ? 401 : 403,
  );
}

export async function GET() {
  const { supabase, user, status } = await userClient();
  if (!supabase || !user) {
    return accessDenied(status as "unauthenticated" | "onboarding_required");
  }
  await supabase
    .from("support_memories")
    .delete()
    .eq("user_id", user.id)
    .lte("expires_at", new Date().toISOString());
  const { data, error } = await supabase
    .from("support_memories")
    .select(
      "id,ciphertext,iv,auth_tag,key_version,context_version,created_at,expires_at",
    )
    .eq("user_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(SUPPORT_MEMORY_LIMIT);
  if (error) {
    return privateJson({ error: "storage_failed" }, 500);
  }

  const memories = (data ?? []).flatMap((row) => {
    try {
      const decrypted = decryptBoundJson<StoredSupportMemory>(
        {
          ciphertext: row.ciphertext,
          iv: row.iv,
          authTag: row.auth_tag,
          keyVersion: row.key_version,
          contextVersion: row.context_version as 1 | 2,
        } as StoredEncryptedValue,
        supportMemoryAad(user.id, row.id),
        supportMemoryAad(user.id, row.id),
      );
      const parsed = storedSupportMemorySchema.safeParse(decrypted);
      return parsed.success ? [{ id: row.id, ...parsed.data }] : [];
    } catch {
      return [];
    }
  });
  return privateJson({ memories });
}

export async function POST(request: Request) {
  if (!requireSameOrigin(request)) {
    return privateJson({ error: "invalid_origin" }, 403);
  }
  const { supabase, user, status } = await userClient();
  if (!supabase || !user) {
    return accessDenied(status as "unauthenticated" | "onboarding_required");
  }

  try {
    const input = supportMemoryInputSchema.parse(
      await readBoundedJson(request, MAX_REQUEST_BYTES),
    );
    await supabase
      .from("support_memories")
      .delete()
      .eq("user_id", user.id)
      .lte("expires_at", new Date().toISOString());
    const { count, error: countError } = await supabase
      .from("support_memories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString());
    if (countError) {
      return privateJson({ error: "storage_failed" }, 500);
    }
    if ((count ?? 0) >= SUPPORT_MEMORY_LIMIT) {
      return privateJson({ error: "memory_limit_reached" }, 409);
    }

    const memory = createStoredSupportMemory(input);
    const id = randomUUID();
    const encrypted = encryptBoundJson(memory, supportMemoryAad(user.id, id));
    const { data, error } = await supabase
      .from("support_memories")
      .insert({
        id,
        user_id: user.id,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        auth_tag: encrypted.authTag,
        key_version: encrypted.keyVersion,
        context_version: encrypted.contextVersion,
        expires_at: memory.expiresAt,
        consent_version: memory.consentVersion,
      })
      .select("id")
      .single();
    if (error || !data) {
      return privateJson({ error: "storage_failed" }, 500);
    }
    return privateJson(
      { saved: true, id: data.id, expiresAt: memory.expiresAt },
      201,
    );
  } catch {
    return privateJson({ error: "invalid_memory" }, 400);
  }
}

export async function DELETE(request: Request) {
  if (!requireSameOrigin(request)) {
    return privateJson({ error: "invalid_origin" }, 403);
  }
  const { supabase, user, status } = await userClient();
  if (!supabase || !user) {
    return accessDenied(status as "unauthenticated" | "onboarding_required");
  }
  try {
    const { id } = deleteRequestSchema.parse(
      await readBoundedJson(request, MAX_REQUEST_BYTES),
    );
    const { error } = await supabase
      .from("support_memories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      return privateJson({ error: "storage_failed" }, 500);
    }
    return privateJson({ deleted: true });
  } catch {
    return privateJson({ error: "invalid_memory" }, 400);
  }
}
