import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createStoredSupportMemory,
  storedSupportMemorySchema,
  SUPPORT_MEMORY_LIMIT,
  supportMemoryInputSchema,
  type StoredSupportMemory,
} from "@/lib/domain/rag";
import {
  decryptJson,
  encryptJson,
  type EncryptedValue,
} from "@/lib/server/crypto";
import { supportMemoryAad } from "@/lib/server/rag";
import { createSupabaseServerClient } from "@/lib/server/supabase";

const MAX_REQUEST_BYTES = 1_500;
const deleteRequestSchema = z.object({ id: z.string().uuid() }).strict();

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const requestUrl = new URL(request.url);
  const forwardedHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProtocol =
    request.headers.get("x-forwarded-proto") ??
    requestUrl.protocol.slice(0, -1);
  const allowedOrigins = new Set([requestUrl.origin]);
  if (forwardedHost) {
    allowedOrigins.add(`${forwardedProtocol}://${forwardedHost}`);
  }
  return allowedOrigins.has(origin);
}

async function boundedJson(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) throw new Error("request_too_large");
  const raw = await request.text();
  if (raw.length === 0 || raw.length > MAX_REQUEST_BYTES) {
    throw new Error("invalid_body");
  }
  return JSON.parse(raw) as unknown;
}

async function userClient() {
  const supabase = await createSupabaseServerClient();
  const { data } = (await supabase?.auth.getUser()) ?? {
    data: { user: null },
  };
  return { supabase, user: data.user };
}

export async function GET(): Promise<NextResponse> {
  const { supabase, user } = await userClient();
  if (!supabase || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await supabase
    .from("support_memories")
    .delete()
    .eq("user_id", user.id)
    .lte("expires_at", new Date().toISOString());
  const { data, error } = await supabase
    .from("support_memories")
    .select("id,ciphertext,iv,auth_tag,key_version,created_at,expires_at")
    .eq("user_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(SUPPORT_MEMORY_LIMIT);
  if (error) {
    return NextResponse.json({ error: "storage_failed" }, { status: 500 });
  }

  const memories = (data ?? []).flatMap((row) => {
    try {
      const decrypted = decryptJson<StoredSupportMemory>(
        {
          ciphertext: row.ciphertext,
          iv: row.iv,
          authTag: row.auth_tag,
          keyVersion: row.key_version,
        } as EncryptedValue,
        supportMemoryAad(user.id, row.id),
      );
      const parsed = storedSupportMemorySchema.safeParse(decrypted);
      return parsed.success ? [{ id: row.id, ...parsed.data }] : [];
    } catch {
      return [];
    }
  });
  return NextResponse.json({ memories });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  const { supabase, user } = await userClient();
  if (!supabase || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const input = supportMemoryInputSchema.parse(await boundedJson(request));
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
      return NextResponse.json({ error: "storage_failed" }, { status: 500 });
    }
    if ((count ?? 0) >= SUPPORT_MEMORY_LIMIT) {
      return NextResponse.json(
        { error: "memory_limit_reached" },
        { status: 409 },
      );
    }

    const memory = createStoredSupportMemory(input);
    const id = randomUUID();
    const encrypted = encryptJson(memory, supportMemoryAad(user.id, id));
    const { data, error } = await supabase
      .from("support_memories")
      .insert({
        id,
        user_id: user.id,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        auth_tag: encrypted.authTag,
        key_version: encrypted.keyVersion,
        expires_at: memory.expiresAt,
        consent_version: memory.consentVersion,
      })
      .select("id")
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "storage_failed" }, { status: 500 });
    }
    return NextResponse.json(
      { saved: true, id: data.id, expiresAt: memory.expiresAt },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "invalid_memory" }, { status: 400 });
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  const { supabase, user } = await userClient();
  if (!supabase || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const { id } = deleteRequestSchema.parse(await boundedJson(request));
    const { error } = await supabase
      .from("support_memories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: "storage_failed" }, { status: 500 });
    }
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "invalid_memory" }, { status: 400 });
  }
}
