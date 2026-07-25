import { NextResponse } from "next/server";
import {
  supportProfileInputSchema,
  type SupportProfileInput,
} from "@/lib/domain/support-profile";
import {
  decryptJson,
  encryptJson,
  type EncryptedValue,
} from "@/lib/server/crypto";
import { getAuthenticatedClient, isExpectedOrigin } from "@/lib/server/auth";

function privateJson(body: unknown, status = 200): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(): Promise<NextResponse> {
  const authenticated = await getAuthenticatedClient();
  if (!authenticated) {
    return privateJson({ error: "unauthorized" }, 401);
  }
  const { supabase, user } = authenticated;
  const { data, error } = await supabase
    .from("support_profiles")
    .select("ciphertext,iv,auth_tag,key_version")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    return privateJson({ error: "storage_failed" }, 500);
  }
  if (!data) return privateJson({ profile: null });
  try {
    const decrypted = decryptJson<SupportProfileInput>({
      ciphertext: data.ciphertext,
      iv: data.iv,
      authTag: data.auth_tag,
      keyVersion: data.key_version,
    } as EncryptedValue);
    const profile = supportProfileInputSchema.parse(decrypted);
    return privateJson({ profile });
  } catch {
    return privateJson({ error: "decryption_failed" }, 500);
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  if (!isExpectedOrigin(request)) {
    return privateJson({ error: "invalid_origin" }, 403);
  }
  const authenticated = await getAuthenticatedClient();
  if (!authenticated) {
    return privateJson({ error: "unauthorized" }, 401);
  }
  const { supabase, user } = authenticated;
  let profile: SupportProfileInput;
  try {
    profile = supportProfileInputSchema.parse(await request.json());
  } catch {
    return privateJson({ error: "invalid_profile" }, 400);
  }
  try {
    const encrypted = encryptJson(profile);
    const { error } = await supabase.from("support_profiles").upsert(
      {
        user_id: user.id,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        auth_tag: encrypted.authTag,
        key_version: encrypted.keyVersion,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      return privateJson({ error: "storage_failed" }, 500);
    }
    return privateJson({ saved: true, profile });
  } catch {
    return privateJson({ error: "storage_failed" }, 500);
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  if (!isExpectedOrigin(request)) {
    return privateJson({ error: "invalid_origin" }, 403);
  }
  const authenticated = await getAuthenticatedClient();
  if (!authenticated) {
    return privateJson({ error: "unauthorized" }, 401);
  }
  const { supabase, user } = authenticated;
  const { error } = await supabase
    .from("support_profiles")
    .delete()
    .eq("user_id", user.id);
  if (error) {
    return privateJson({ error: "storage_failed" }, 500);
  }
  return privateJson({ deleted: true });
}
