import { describe, expect, it } from "vitest";
import type { SafetyInput } from "@/lib/domain/contracts";
import {
  buildEmergencyScript,
  containsEmergencySignal,
  routeSafety,
} from "@/lib/domain/safety";

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

describe("routeSafety", () => {
  it.each([
    "not_responding",
    "abnormal_breathing",
    "seizure",
    "collapsed",
    "immediate_self_harm",
    "immediate_danger",
    "caregiver_unsafe",
    "not_sure",
  ] as const)(
    "routes %s to emergency without model personalization",
    (signal) => {
      const decision = routeSafety({ ...base, observableSignalIds: [signal] });
      expect(decision).toMatchObject({
        tier: "emergency",
        modelMayPersonalize: false,
        resourceIds: ["in.erss.112"],
      });
    },
  );

  it.each(["recent_use", "withdrawal_concern", "emotional_distress"] as const)(
    "routes %s to timely human support",
    (situation) => {
      expect(routeSafety({ ...base, situationIds: [situation] }).tier).toBe(
        "urgent_support",
      );
    },
  );

  it("routes overwhelming and alone to timely support", () => {
    expect(
      routeSafety({ ...base, intensityBand: "overwhelming", isAlone: true })
        .tier,
    ).toBe("urgent_support");
  });

  it("keeps a non-danger moment on the coping route", () => {
    expect(routeSafety(base)).toMatchObject({
      tier: "coping",
      modelMayPersonalize: true,
    });
  });
});

describe("emergency script", () => {
  it("contains selected observable facts and explicit unknown location", () => {
    const script = buildEmergencyScript(["collapsed", "abnormal_breathing"]);
    expect(script).toContain("collapsed");
    expect(script).toContain("not breathing normally");
    expect(script).toContain("location is unknown");
  });

  it("uses a safe generic observation when no fact is selected", () => {
    expect(buildEmergencyScript([])).toContain("may be an emergency");
  });

  it("deduplicates observable facts", () => {
    const script = buildEmergencyScript(["collapsed", "collapsed"]);
    expect(script.match(/collapsed/g)).toHaveLength(1);
  });

  it("recognizes emergency signals", () => {
    expect(containsEmergencySignal(["stress" as never, "seizure"])).toBe(true);
    expect(containsEmergencySignal([])).toBe(false);
  });
});
