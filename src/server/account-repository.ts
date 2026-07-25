import type { SupabaseClient } from "@supabase/supabase-js";
import {
  savedPlanInputSchema,
  trustedContactInputSchema,
  type SavedPlanInput,
  type TrustedContactInput,
} from "@/domain/contracts";
import {
  storedSupportMemorySchema,
  type StoredSupportMemory,
} from "@/domain/rag";
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
  savedPlanContext,
  supportProfileContext,
  trustedContactContext,
} from "@/server/account-data";
import {
  parseStoredHabitCheckin,
  parseStoredHabitTracker,
} from "@/server/habits";
import { supportMemoryAad } from "@/server/rag";

interface CipherRow {
  readonly ciphertext: string;
  readonly iv: string;
  readonly auth_tag: string;
  readonly key_version: number;
  readonly context_version?: number;
}

function encrypted(row: CipherRow): StoredEncryptedValue {
  if (row.key_version !== 1) {
    throw new Error("key_version_unsupported");
  }
  if (
    row.context_version !== undefined &&
    row.context_version !== 1 &&
    row.context_version !== 2
  ) {
    throw new Error("context_version_unsupported");
  }
  return {
    ciphertext: row.ciphertext,
    iv: row.iv,
    authTag: row.auth_tag,
    keyVersion: 1,
    ...(row.context_version === undefined
      ? {}
      : { contextVersion: row.context_version }),
  };
}

export class AccountRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly userId: string,
  ) {}

  async getPlan(): Promise<SavedPlanInput | null> {
    const { data, error } = await this.supabase
      .from("saved_plans")
      .select("ciphertext,iv,auth_tag,key_version,context_version")
      .eq("user_id", this.userId)
      .maybeSingle();
    if (error) throw new Error("storage_failed");
    if (!data) return null;
    return savedPlanInputSchema.parse(
      decryptBoundJson(
        encrypted(data as CipherRow),
        savedPlanContext(this.userId),
      ),
    );
  }

  async savePlan(plan: SavedPlanInput): Promise<void> {
    const value = encryptBoundJson(plan, savedPlanContext(this.userId));
    const { error } = await this.supabase.from("saved_plans").upsert(
      {
        user_id: this.userId,
        ciphertext: value.ciphertext,
        iv: value.iv,
        auth_tag: value.authTag,
        key_version: value.keyVersion,
        context_version: value.contextVersion,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error("storage_failed");
  }

  async deletePlan(): Promise<void> {
    const { error } = await this.supabase
      .from("saved_plans")
      .delete()
      .eq("user_id", this.userId);
    if (error) throw new Error("storage_failed");
  }

  async getContact(): Promise<(TrustedContactInput & { id: string }) | null> {
    const { data, error } = await this.supabase
      .from("trusted_contacts")
      .select("id,ciphertext,iv,auth_tag,key_version,context_version")
      .eq("user_id", this.userId)
      .maybeSingle();
    if (error) throw new Error("storage_failed");
    if (!data) return null;
    const contact = trustedContactInputSchema.parse(
      decryptBoundJson(
        encrypted(data as CipherRow),
        trustedContactContext(this.userId),
      ),
    );
    return { id: data.id as string, ...contact };
  }

  async saveContact(contact: TrustedContactInput): Promise<string> {
    const value = encryptBoundJson(contact, trustedContactContext(this.userId));
    const { data, error } = await this.supabase
      .from("trusted_contacts")
      .upsert(
        {
          user_id: this.userId,
          ciphertext: value.ciphertext,
          iv: value.iv,
          auth_tag: value.authTag,
          key_version: value.keyVersion,
          context_version: value.contextVersion,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("id")
      .single();
    if (error || !data) throw new Error("storage_failed");
    return data.id as string;
  }

  async deleteContact(): Promise<void> {
    const { error } = await this.supabase
      .from("trusted_contacts")
      .delete()
      .eq("user_id", this.userId);
    if (error) throw new Error("storage_failed");
  }

  async getProfile(): Promise<SupportProfileInput | null> {
    const { data, error } = await this.supabase
      .from("support_profiles")
      .select("ciphertext,iv,auth_tag,key_version,context_version")
      .eq("user_id", this.userId)
      .maybeSingle();
    if (error) throw new Error("storage_failed");
    if (!data) return null;
    return supportProfileInputSchema.parse(
      decryptBoundJson(
        encrypted(data as CipherRow),
        supportProfileContext(this.userId),
      ),
    );
  }

  async saveProfile(profile: SupportProfileInput): Promise<void> {
    const value = encryptBoundJson(profile, supportProfileContext(this.userId));
    const { error } = await this.supabase.from("support_profiles").upsert(
      {
        user_id: this.userId,
        ciphertext: value.ciphertext,
        iv: value.iv,
        auth_tag: value.authTag,
        key_version: value.keyVersion,
        context_version: value.contextVersion,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error("storage_failed");
  }

  async deleteProfile(): Promise<void> {
    const { error } = await this.supabase
      .from("support_profiles")
      .delete()
      .eq("user_id", this.userId);
    if (error) throw new Error("storage_failed");
  }

  async exportData(email: string | undefined) {
    const now = new Date().toISOString();
    const [profile, contact, plan, memories, tracker, checkins] =
      await Promise.all([
        this.getProfile(),
        this.getContact(),
        this.getPlan(),
        this.supabase
          .from("support_memories")
          .select(
            "id,ciphertext,iv,auth_tag,key_version,context_version,expires_at",
          )
          .eq("user_id", this.userId)
          .gt("expires_at", now)
          .order("created_at", { ascending: false }),
        this.supabase
          .from("habit_trackers")
          .select("ciphertext,iv,auth_tag,key_version,context_version")
          .eq("user_id", this.userId)
          .maybeSingle(),
        this.supabase
          .from("habit_checkins")
          .select(
            "local_date,ciphertext,iv,auth_tag,key_version,context_version",
          )
          .eq("user_id", this.userId)
          .gt("expires_at", now)
          .order("local_date", { ascending: false }),
      ]);

    if (memories.error || tracker.error || checkins.error) {
      throw new Error("storage_failed");
    }
    const supportMemories = (memories.data ?? []).map((row) =>
      storedSupportMemorySchema.parse(
        decryptBoundJson<StoredSupportMemory>(
          encrypted(row as CipherRow),
          supportMemoryAad(this.userId, row.id as string),
          supportMemoryAad(this.userId, row.id as string),
        ),
      ),
    );
    const habitTracker = tracker.data
      ? parseStoredHabitTracker(
          encrypted(tracker.data as CipherRow),
          this.userId,
        )
      : null;
    const habitCheckins = (checkins.data ?? []).map((row) =>
      parseStoredHabitCheckin(
        encrypted(row as CipherRow),
        this.userId,
        row.local_date as string,
      ),
    );

    return {
      schemaVersion: "1.0",
      exportedAt: now,
      account: { email: email ?? null },
      supportProfile: profile,
      trustedContact: contact,
      savedPlan: plan,
      supportMemories,
      habits: { tracker: habitTracker, checkins: habitCheckins },
    };
  }
}
