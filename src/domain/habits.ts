import { z } from "zod";

export const recoveryHabitIdSchema = z.enum([
  "connect_with_someone",
  "use_grounding_tool",
  "follow_support_plan",
  "move_to_safety",
  "care_for_basics",
]);
export type RecoveryHabitId = z.infer<typeof recoveryHabitIdSchema>;

export const habitStatusSchema = z.enum(["completed", "partial", "not_today"]);
export type HabitStatus = z.infer<typeof habitStatusSchema>;

export const habitTrackerInputSchema = z
  .object({
    habitIds: z.array(recoveryHabitIdSchema).min(1).max(5),
  })
  .strict()
  .refine((value) => new Set(value.habitIds).size === value.habitIds.length, {
    message: "Choose each practice once",
  });
export type HabitTrackerInput = z.infer<typeof habitTrackerInputSchema>;

export const habitCheckinInputSchema = z
  .object({
    entries: z
      .array(
        z
          .object({
            habitId: recoveryHabitIdSchema,
            status: habitStatusSchema,
          })
          .strict(),
      )
      .min(1)
      .max(5),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.entries.map((entry) => entry.habitId)).size ===
      value.entries.length,
    { message: "Check in once per practice" },
  );
export type HabitCheckinInput = z.infer<typeof habitCheckinInputSchema>;

export interface StoredHabitTracker extends HabitTrackerInput {
  readonly schemaVersion: "1.0";
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StoredHabitCheckin extends HabitCheckinInput {
  readonly schemaVersion: "1.0";
  readonly localDate: string;
  readonly savedAt: string;
}

export interface HabitMetrics {
  readonly eligibleDays: number;
  readonly practicedDays: number;
  readonly currentPracticeRun: number;
  readonly last7Days: HabitWindowSummary;
  readonly last30Days: HabitWindowSummary;
}

export interface HabitWindowSummary {
  readonly eligibleDays: number;
  readonly practicedDays: number;
}

const INDIA_TIME_ZONE = "Asia/Kolkata";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INDIA_OFFSET = "+05:30";
const HABIT_RETENTION_DAYS = 90;

function requireCalendarDate(localDate: string): void {
  if (!DATE_PATTERN.test(localDate)) throw new Error("invalid_local_date");
  const parsed = new Date(`${localDate}T00:00:00.000Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== localDate
  ) {
    throw new Error("invalid_local_date");
  }
}

export function indiaDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Anchor retention to the check-in's India-local calendar day. Editing an
 * existing daily check-in must not extend its retention window.
 */
export function habitCheckinExpiresAt(localDate: string): string {
  requireCalendarDate(localDate);
  const start = new Date(`${localDate}T00:00:00.000${INDIA_OFFSET}`);
  start.setUTCDate(start.getUTCDate() + HABIT_RETENTION_DAYS);
  return start.toISOString();
}

function epochDay(localDate: string): number {
  requireCalendarDate(localDate);
  const value = Date.parse(`${localDate}T00:00:00.000Z`);
  return Math.floor(value / 86_400_000);
}

function windowSummary(
  practiced: ReadonlySet<string>,
  startDay: number,
  endDay: number,
  windowDays: number,
): HabitWindowSummary {
  const windowStartDay = Math.max(startDay, endDay - windowDays + 1);
  let practicedDays = 0;
  for (const date of practiced) {
    const day = epochDay(date);
    if (day >= windowStartDay && day <= endDay) practicedDays += 1;
  }
  return {
    eligibleDays: endDay - windowStartDay + 1,
    practicedDays,
  };
}

export function calculateHabitMetrics(
  trackerCreatedAt: string,
  checkins: readonly StoredHabitCheckin[],
  today = indiaDate(),
): HabitMetrics {
  const start = indiaDate(new Date(trackerCreatedAt));
  const endDay = epochDay(today);
  const startDay = Math.min(epochDay(start), endDay);
  const eligibleDays = endDay - startDay + 1;
  const practiced = new Set(
    checkins
      .filter((checkin) =>
        checkin.entries.some((entry) => entry.status !== "not_today"),
      )
      .map((checkin) => checkin.localDate),
  );

  let currentPracticeRun = 0;
  let cursor = endDay;
  if (!practiced.has(today)) cursor -= 1;
  while (cursor >= startDay) {
    const date = new Date(cursor * 86_400_000).toISOString().slice(0, 10);
    if (!practiced.has(date)) break;
    currentPracticeRun += 1;
    cursor -= 1;
  }

  return {
    eligibleDays,
    practicedDays: [...practiced].filter((date) => {
      const day = epochDay(date);
      return day >= startDay && day <= endDay;
    }).length,
    currentPracticeRun,
    last7Days: windowSummary(practiced, startDay, endDay, 7),
    last30Days: windowSummary(practiced, startDay, endDay, 30),
  };
}
