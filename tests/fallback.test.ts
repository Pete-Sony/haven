import { describe, expect, it } from "vitest";
import type { SafetyInput } from "@/lib/domain/contracts";
import { createFallback } from "@/lib/domain/fallback";
import { routeSafety } from "@/lib/domain/safety";

const base: SafetyInput = {
  schemaVersion: "1.0",
  role: "individual",
  situationIds: ["stress"],
  observableSignalIds: [],
  intensityBand: "strong",
  goalId: "get_through_minute",
  tone: "warm",
  language: "en-IN",
  jurisdiction: { country: "IN" },
  isAlone: false,
};

describe("createFallback", () => {
  it.each([
    "social_pressure",
    "stress",
    "loneliness",
    "pain",
    "recent_use",
    "withdrawal_concern",
    "emotional_distress",
  ] as const)("returns a complete, bounded result for %s", (situation) => {
    const input = { ...base, situationIds: [situation] };
    const result = createFallback(input, routeSafety(input), "test");
    expect(result.steps).toHaveLength(1);
    expect(result.verbatimScript.length).toBeGreaterThan(10);
    expect(result.provider).toBe("deterministic");
    expect(result.fallbackReason).toBe("test");
  });

  it("uses the caregiver-specific path", () => {
    const input = { ...base, role: "caregiver" as const };
    const result = createFallback(input, routeSafety(input));
    expect(result.headline).toContain("Stay present");
    expect(result.sourceIds).toEqual(["haven.caregiver-talk.v1"]);
  });

  it("changes the headline for urgent support", () => {
    const input = { ...base, situationIds: ["recent_use" as const] };
    expect(createFallback(input, routeSafety(input)).headline).toContain(
      "another person",
    );
  });
});
