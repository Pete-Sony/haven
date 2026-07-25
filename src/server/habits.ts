import {
  habitCheckinInputSchema,
  habitTrackerInputSchema,
  type StoredHabitCheckin,
  type StoredHabitTracker,
} from "@/domain/habits";
import { decryptBoundJson, type StoredEncryptedValue } from "@/server/crypto";

export function habitTrackerAad(userId: string): string {
  return `habit-tracker:${userId}`;
}

export function habitCheckinAad(userId: string, localDate: string): string {
  return `habit-checkin:${userId}:${localDate}`;
}

export function parseStoredHabitTracker(
  encrypted: StoredEncryptedValue,
  userId: string,
): StoredHabitTracker {
  const stored = decryptBoundJson<StoredHabitTracker>(
    encrypted,
    habitTrackerAad(userId),
    habitTrackerAad(userId),
  );
  const parsed = habitTrackerInputSchema.parse(stored);
  if (
    stored.schemaVersion !== "1.0" ||
    typeof stored.createdAt !== "string" ||
    typeof stored.updatedAt !== "string"
  ) {
    throw new Error("invalid_habit_tracker");
  }
  return { ...parsed, ...stored };
}

export function parseStoredHabitCheckin(
  encrypted: StoredEncryptedValue,
  userId: string,
  localDate: string,
): StoredHabitCheckin {
  const stored = decryptBoundJson<StoredHabitCheckin>(
    encrypted,
    habitCheckinAad(userId, localDate),
    habitCheckinAad(userId, localDate),
  );
  const parsed = habitCheckinInputSchema.parse(stored);
  if (
    stored.schemaVersion !== "1.0" ||
    stored.localDate !== localDate ||
    typeof stored.savedAt !== "string"
  ) {
    throw new Error("invalid_habit_checkin");
  }
  return { ...parsed, ...stored };
}
