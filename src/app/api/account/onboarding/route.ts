import { z } from "zod";
import {
  trustedContactInputSchema,
  type TrustedContactInput,
} from "@/domain/contracts";
import {
  supportProfileInputSchema,
  type SupportProfileInput,
} from "@/domain/support-profile";
import {
  decryptBoundJson,
  encryptBoundJson,
  type StoredEncryptedValue,
} from "@/server/crypto";
import {
  supportProfileContext,
  trustedContactContext,
} from "@/server/account-data";
import { requireUser } from "@/server/auth";
import { privateJson, readBoundedJson, requireSameOrigin } from "@/server/http";

const onboardingInputSchema = z
  .object({
    profile: supportProfileInputSchema,
    contact: trustedContactInputSchema,
  })
  .strict();

export async function GET() {
  const account = await requireUser();
  if (!account) return privateJson({ error: "unauthorized" }, 401);
  const { supabase, user } = account;
  const [profileResult, contactResult] = await Promise.all([
    supabase
      .from("support_profiles")
      .select("ciphertext,iv,auth_tag,key_version,context_version")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("trusted_contacts")
      .select("id,ciphertext,iv,auth_tag,key_version,context_version")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (profileResult.error || contactResult.error) {
    return privateJson({ error: "storage_failed" }, 500);
  }
  if (!profileResult.data || !contactResult.data) {
    return privateJson({ completed: false, profile: null, contact: null });
  }
  try {
    const profile = supportProfileInputSchema.parse(
      decryptBoundJson<SupportProfileInput>(
        {
          ciphertext: profileResult.data.ciphertext,
          iv: profileResult.data.iv,
          authTag: profileResult.data.auth_tag,
          keyVersion: profileResult.data.key_version,
          contextVersion: profileResult.data.context_version as 1 | 2,
        } as StoredEncryptedValue,
        supportProfileContext(user.id),
      ),
    );
    const contact = trustedContactInputSchema.parse(
      decryptBoundJson<TrustedContactInput>(
        {
          ciphertext: contactResult.data.ciphertext,
          iv: contactResult.data.iv,
          authTag: contactResult.data.auth_tag,
          keyVersion: contactResult.data.key_version,
          contextVersion: contactResult.data.context_version as 1 | 2,
        } as StoredEncryptedValue,
        trustedContactContext(user.id),
      ),
    );
    return privateJson({
      completed: true,
      profile,
      contact: { id: contactResult.data.id, ...contact },
    });
  } catch {
    return privateJson({ error: "decryption_failed" }, 500);
  }
}

export async function PUT(request: Request) {
  if (!requireSameOrigin(request)) {
    return privateJson({ error: "invalid_origin" }, 403);
  }
  const account = await requireUser();
  if (!account) return privateJson({ error: "unauthorized" }, 401);
  try {
    const input = onboardingInputSchema.parse(
      await readBoundedJson(request, 8_192),
    );
    const profile = encryptBoundJson(
      input.profile,
      supportProfileContext(account.user.id),
    );
    const contact = encryptBoundJson(
      input.contact,
      trustedContactContext(account.user.id),
    );
    const { data, error } = await account.supabase.rpc(
      "save_haven_onboarding_v2",
      {
        p_profile_ciphertext: profile.ciphertext,
        p_profile_iv: profile.iv,
        p_profile_auth_tag: profile.authTag,
        p_profile_key_version: profile.keyVersion,
        p_profile_context_version: profile.contextVersion,
        p_contact_ciphertext: contact.ciphertext,
        p_contact_iv: contact.iv,
        p_contact_auth_tag: contact.authTag,
        p_contact_key_version: contact.keyVersion,
        p_contact_context_version: contact.contextVersion,
      },
    );
    if (error || typeof data !== "string") {
      return privateJson({ error: "storage_failed" }, 500);
    }
    return privateJson({
      completed: true,
      contactId: data,
      profile: input.profile,
      contact: input.contact,
    });
  } catch {
    return privateJson({ error: "invalid_onboarding" }, 400);
  }
}

export async function DELETE(request: Request) {
  if (!requireSameOrigin(request)) {
    return privateJson({ error: "invalid_origin" }, 403);
  }
  const account = await requireUser();
  if (!account) return privateJson({ error: "unauthorized" }, 401);
  const { error } = await account.supabase.rpc("delete_haven_onboarding");
  if (error) {
    return privateJson({ error: "storage_failed" }, 500);
  }
  return privateJson({ deleted: true });
}
