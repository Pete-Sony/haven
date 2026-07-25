import { NextResponse } from "next/server";
import {
  trustedContactInputSchema,
  type TrustedContactInput,
} from "@/lib/domain/contracts";
import {
  decryptJson,
  encryptJson,
  type EncryptedValue,
} from "@/lib/server/crypto";
import { createSupabaseServerClient } from "@/lib/server/supabase";

async function userClient() {
  const supabase = await createSupabaseServerClient();
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  return { supabase, user: data.user };
}

export async function GET(): Promise<NextResponse> {
  const { supabase, user } = await userClient();
  if (!supabase || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("trusted_contacts")
    .select("id,ciphertext,iv,auth_tag,key_version")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "storage_failed" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ contact: null });
  try {
    const contact = decryptJson<TrustedContactInput>({
      ciphertext: data.ciphertext,
      iv: data.iv,
      authTag: data.auth_tag,
      keyVersion: data.key_version,
    } as EncryptedValue);
    return NextResponse.json({ contact: { id: data.id, ...contact } });
  } catch {
    return NextResponse.json({ error: "decryption_failed" }, { status: 500 });
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  const { supabase, user } = await userClient();
  if (!supabase || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const contact = trustedContactInputSchema.parse(await request.json());
    const encrypted = encryptJson(contact);
    const { data, error } = await supabase
      .from("trusted_contacts")
      .upsert(
        {
          user_id: user.id,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          auth_tag: encrypted.authTag,
          key_version: encrypted.keyVersion,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("id")
      .single();
    if (error) {
      return NextResponse.json({ error: "storage_failed" }, { status: 500 });
    }
    return NextResponse.json({ saved: true, id: data.id });
  } catch {
    return NextResponse.json({ error: "invalid_contact" }, { status: 400 });
  }
}
