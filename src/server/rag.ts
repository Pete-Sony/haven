import {
  storedSupportMemorySchema,
  SUPPORT_MEMORY_LIMIT,
  type StoredSupportMemory,
} from "@/domain/rag";
import { decryptBoundJson, type StoredEncryptedValue } from "@/server/crypto";
import { createSupabaseServerClient } from "@/server/supabase";

const PERSONAL_RETRIEVAL_TIMEOUT_MS = 600;

interface EncryptedMemoryRow {
  readonly id: string;
  readonly ciphertext: string;
  readonly iv: string;
  readonly auth_tag: string;
  readonly key_version: number;
  readonly context_version?: number;
}

export function supportMemoryAad(userId: string, memoryId: string): string {
  return `support-memory:${userId}:${memoryId}`;
}

async function queryPersonalSupportMemories(): Promise<StoredSupportMemory[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];

  const { data, error } = await supabase
    .from("support_memories")
    .select("id,ciphertext,iv,auth_tag,key_version,context_version")
    .eq("user_id", authData.user.id)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(SUPPORT_MEMORY_LIMIT);
  if (error || !data) return [];

  return (data as EncryptedMemoryRow[]).flatMap((row) => {
    try {
      const decrypted = decryptBoundJson<unknown>(
        {
          ciphertext: row.ciphertext,
          iv: row.iv,
          authTag: row.auth_tag,
          keyVersion: row.key_version,
          contextVersion: row.context_version as 1 | 2 | undefined,
        } as StoredEncryptedValue,
        supportMemoryAad(authData.user.id, row.id),
        supportMemoryAad(authData.user.id, row.id),
      );
      const parsed = storedSupportMemorySchema.safeParse(decrypted);
      return parsed.success ? [parsed.data] : [];
    } catch {
      return [];
    }
  });
}

/**
 * Personal retrieval is optional and fails closed to an empty lane. It cannot
 * delay or block the deterministic educational/fallback path.
 */
export async function loadPersonalSupportMemories(): Promise<
  StoredSupportMemory[]
> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      queryPersonalSupportMemories(),
      new Promise<StoredSupportMemory[]>((resolve) => {
        timeout = setTimeout(() => resolve([]), PERSONAL_RETRIEVAL_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return [];
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
