import { describe, expect, it } from "vitest";
import {
  calculateHabitMetrics,
  habitCheckinInputSchema,
  habitCheckinExpiresAt,
  habitTrackerInputSchema,
  indiaDate,
  type StoredHabitCheckin,
} from "@/domain/habits";

function checkin(
  localDate: string,
  status: "completed" | "partial" | "not_today" = "completed",
): StoredHabitCheckin {
  return {
    schemaVersion: "1.0",
    localDate,
    savedAt: `${localDate}T12:00:00.000Z`,
    entries: [{ habitId: "connect_with_someone", status }],
  };
}

describe("daily habit contracts", () => {
  it("anchors 90-day retention to the India-local check-in date", () => {
    expect(habitCheckinExpiresAt("2026-07-25")).toBe(
      "2026-10-22T18:30:00.000Z",
    );
    expect(() => habitCheckinExpiresAt("not-a-date")).toThrow(
      "invalid_local_date",
    );
    expect(() => habitCheckinExpiresAt("2026-02-30")).toThrow(
      "invalid_local_date",
    );
  });

  it("accepts allowlisted zero-typing practices without free text", () => {
    expect(
      habitTrackerInputSchema.parse({
        habitIds: ["connect_with_someone", "use_grounding_tool"],
      }),
    ).toEqual({
      habitIds: ["connect_with_someone", "use_grounding_tool"],
    });
    expect(
      habitCheckinInputSchema.parse({
        entries: [
          { habitId: "connect_with_someone", status: "completed" },
          { habitId: "use_grounding_tool", status: "not_today" },
        ],
      }),
    ).toBeDefined();
  });

  it("rejects duplicates, free text, clinical values, and unknown statuses", () => {
    expect(
      habitTrackerInputSchema.safeParse({
        habitIds: ["care_for_basics", "care_for_basics"],
      }).success,
    ).toBe(false);
    expect(
      habitCheckinInputSchema.safeParse({
        entries: [
          {
            habitId: "follow_support_plan",
            status: "relapsed",
            note: "private narrative",
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      habitCheckinInputSchema.safeParse({
        entries: [
          { habitId: "move_to_safety", status: "partial" },
          { habitId: "move_to_safety", status: "completed" },
        ],
      }).success,
    ).toBe(false);
  });

  it("uses the India calendar day at the UTC boundary", () => {
    expect(indiaDate(new Date("2026-07-24T20:00:00.000Z"))).toBe("2026-07-25");
    expect(indiaDate(new Date("2026-07-24T17:00:00.000Z"))).toBe("2026-07-24");
  });

  it("reports practiced eligible days and a current run without scoring", () => {
    expect(
      calculateHabitMetrics(
        "2026-07-21T06:00:00.000Z",
        [
          checkin("2026-07-21"),
          checkin("2026-07-22", "not_today"),
          checkin("2026-07-23", "partial"),
          checkin("2026-07-24"),
        ],
        "2026-07-25",
      ),
    ).toEqual({
      eligibleDays: 5,
      practicedDays: 3,
      currentPracticeRun: 2,
      last7Days: { eligibleDays: 5, practicedDays: 3 },
      last30Days: { eligibleDays: 5, practicedDays: 3 },
    });
  });

  it("counts a run through today and ignores dates outside eligibility", () => {
    expect(
      calculateHabitMetrics(
        "2026-07-24T04:00:00.000Z",
        [
          checkin("2026-07-20"),
          checkin("2026-07-24", "partial"),
          checkin("2026-07-25"),
        ],
        "2026-07-25",
      ),
    ).toEqual({
      eligibleDays: 2,
      practicedDays: 2,
      currentPracticeRun: 2,
      last7Days: { eligibleDays: 2, practicedDays: 2 },
      last30Days: { eligibleDays: 2, practicedDays: 2 },
    });
  });

  it("reports bounded 7-day and 30-day persistence summaries", () => {
    const checkins = [
      checkin("2026-06-01"),
      checkin("2026-06-26"),
      checkin("2026-07-19"),
      checkin("2026-07-20", "not_today"),
      checkin("2026-07-24", "partial"),
      checkin("2026-07-25"),
    ];
    expect(
      calculateHabitMetrics("2026-06-01T04:00:00.000Z", checkins, "2026-07-25"),
    ).toMatchObject({
      last7Days: { eligibleDays: 7, practicedDays: 3 },
      last30Days: { eligibleDays: 30, practicedDays: 4 },
    });
  });

  it("rejects malformed local dates", () => {
    expect(() =>
      calculateHabitMetrics(
        "2026-07-24T04:00:00.000Z",
        [checkin("bad-date")],
        "2026-07-25",
      ),
    ).toThrow("invalid_local_date");
  });
});
