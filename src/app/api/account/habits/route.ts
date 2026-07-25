import { z } from "zod";
import {
  calculateHabitMetrics,
  habitCheckinInputSchema,
  habitCheckinExpiresAt,
  habitTrackerInputSchema,
  indiaDate,
  type StoredHabitCheckin,
  type StoredHabitTracker,
} from "@/domain/habits";
import { encryptBoundJson, type StoredEncryptedValue } from "@/server/crypto";
import {
  habitCheckinAad,
  habitTrackerAad,
  parseStoredHabitCheckin,
  parseStoredHabitTracker,
} from "@/server/habits";
import { requireCompletedAccount } from "@/server/auth";
import { privateJson, readBoundedJson, requireSameOrigin } from "@/server/http";

const requestSchema = z.discriminatedUnion("operation", [
  z
    .object({
      operation: z.literal("configure"),
      tracker: habitTrackerInputSchema,
    })
    .strict(),
  z
    .object({
      operation: z.literal("checkin"),
      checkin: habitCheckinInputSchema,
    })
    .strict(),
]);

async function readyAccount() {
  const access = await requireCompletedAccount();
  if (access.status === "unauthenticated") {
    return { response: privateJson({ error: "unauthorized" }, 401) };
  }
  if (access.status === "onboarding_required") {
    return { response: privateJson({ error: "onboarding_required" }, 403) };
  }
  return { account: access.account };
}

export async function GET() {
  const access = await readyAccount();
  if ("response" in access) return access.response;
  const { supabase, user } = access.account;
  const now = new Date().toISOString();
  await supabase
    .from("habit_checkins")
    .delete()
    .eq("user_id", user.id)
    .lte("expires_at", now);
  const [trackerResult, checkinsResult] = await Promise.all([
    supabase
      .from("habit_trackers")
      .select("ciphertext,iv,auth_tag,key_version,context_version")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("habit_checkins")
      .select("local_date,ciphertext,iv,auth_tag,key_version,context_version")
      .eq("user_id", user.id)
      .gt("expires_at", now)
      .order("local_date", { ascending: false })
      .limit(90),
  ]);
  if (trackerResult.error || checkinsResult.error) {
    return privateJson({ error: "storage_failed" }, 500);
  }
  if (!trackerResult.data) {
    return privateJson({ tracker: null, checkins: [], metrics: null });
  }
  try {
    const tracker = parseStoredHabitTracker(
      {
        ciphertext: trackerResult.data.ciphertext,
        iv: trackerResult.data.iv,
        authTag: trackerResult.data.auth_tag,
        keyVersion: trackerResult.data.key_version,
        contextVersion: trackerResult.data.context_version as 1 | 2,
      } as StoredEncryptedValue,
      user.id,
    );
    const checkins = (checkinsResult.data ?? []).flatMap((row) => {
      try {
        return [
          parseStoredHabitCheckin(
            {
              ciphertext: row.ciphertext,
              iv: row.iv,
              authTag: row.auth_tag,
              keyVersion: row.key_version,
              contextVersion: row.context_version as 1 | 2,
            } as StoredEncryptedValue,
            user.id,
            row.local_date,
          ),
        ];
      } catch {
        return [];
      }
    });
    return privateJson({
      tracker,
      checkins,
      metrics: calculateHabitMetrics(tracker.createdAt, checkins),
      today: indiaDate(),
    });
  } catch {
    return privateJson({ error: "decryption_failed" }, 500);
  }
}

export async function PUT(request: Request) {
  if (!requireSameOrigin(request)) {
    return privateJson({ error: "invalid_origin" }, 403);
  }
  const access = await readyAccount();
  if ("response" in access) return access.response;
  const { supabase, user } = access.account;
  try {
    const input = requestSchema.parse(await readBoundedJson(request, 4_096));
    const now = new Date().toISOString();
    if (input.operation === "configure") {
      const existing = await supabase
        .from("habit_trackers")
        .select("ciphertext,iv,auth_tag,key_version,context_version")
        .eq("user_id", user.id)
        .maybeSingle();
      let createdAt = now;
      if (existing.data) {
        try {
          createdAt = parseStoredHabitTracker(
            {
              ciphertext: existing.data.ciphertext,
              iv: existing.data.iv,
              authTag: existing.data.auth_tag,
              keyVersion: existing.data.key_version,
              contextVersion: existing.data.context_version as 1 | 2,
            } as StoredEncryptedValue,
            user.id,
          ).createdAt;
        } catch {
          return privateJson({ error: "decryption_failed" }, 500);
        }
      }
      const tracker: StoredHabitTracker = {
        schemaVersion: "1.0",
        ...input.tracker,
        createdAt,
        updatedAt: now,
      };
      const encrypted = encryptBoundJson(tracker, habitTrackerAad(user.id));
      const { error } = await supabase.from("habit_trackers").upsert(
        {
          user_id: user.id,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          auth_tag: encrypted.authTag,
          key_version: encrypted.keyVersion,
          context_version: encrypted.contextVersion,
          updated_at: now,
        },
        { onConflict: "user_id" },
      );
      if (error) return privateJson({ error: "storage_failed" }, 500);
      return privateJson({ saved: true, tracker });
    }

    const trackerResult = await supabase
      .from("habit_trackers")
      .select("ciphertext,iv,auth_tag,key_version,context_version")
      .eq("user_id", user.id)
      .maybeSingle();
    if (trackerResult.error || !trackerResult.data) {
      return privateJson({ error: "tracker_required" }, 409);
    }
    const tracker = parseStoredHabitTracker(
      {
        ciphertext: trackerResult.data.ciphertext,
        iv: trackerResult.data.iv,
        authTag: trackerResult.data.auth_tag,
        keyVersion: trackerResult.data.key_version,
        contextVersion: trackerResult.data.context_version as 1 | 2,
      } as StoredEncryptedValue,
      user.id,
    );
    const submitted = new Set(
      input.checkin.entries.map((entry) => entry.habitId),
    );
    if (
      submitted.size !== tracker.habitIds.length ||
      tracker.habitIds.some((id) => !submitted.has(id))
    ) {
      return privateJson({ error: "checkin_must_match_tracker" }, 400);
    }
    const localDate = indiaDate();
    const checkin: StoredHabitCheckin = {
      schemaVersion: "1.0",
      ...input.checkin,
      localDate,
      savedAt: now,
    };
    const encrypted = encryptBoundJson(
      checkin,
      habitCheckinAad(user.id, localDate),
    );
    const expiresAt = habitCheckinExpiresAt(localDate);
    const { error } = await supabase.from("habit_checkins").upsert(
      {
        user_id: user.id,
        local_date: localDate,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        auth_tag: encrypted.authTag,
        key_version: encrypted.keyVersion,
        context_version: encrypted.contextVersion,
        expires_at: expiresAt,
        updated_at: now,
      },
      { onConflict: "user_id,local_date" },
    );
    if (error) return privateJson({ error: "storage_failed" }, 500);
    return privateJson({ saved: true, checkin });
  } catch {
    return privateJson({ error: "invalid_habit_request" }, 400);
  }
}

export async function DELETE(request: Request) {
  if (!requireSameOrigin(request)) {
    return privateJson({ error: "invalid_origin" }, 403);
  }
  const access = await readyAccount();
  if ("response" in access) return access.response;
  const { supabase, user } = access.account;
  const scope = new URL(request.url).searchParams.get("scope");
  if (scope === "today") {
    const { error } = await supabase
      .from("habit_checkins")
      .delete()
      .eq("user_id", user.id)
      .eq("local_date", indiaDate());
    if (error) return privateJson({ error: "storage_failed" }, 500);
    return privateJson({ deleted: true, scope });
  }
  if (scope === "tracker") {
    const [checkins, tracker] = await Promise.all([
      supabase.from("habit_checkins").delete().eq("user_id", user.id),
      supabase.from("habit_trackers").delete().eq("user_id", user.id),
    ]);
    if (checkins.error || tracker.error) {
      return privateJson({ error: "storage_failed" }, 500);
    }
    return privateJson({ deleted: true, scope });
  }
  return privateJson({ error: "invalid_scope" }, 400);
}
