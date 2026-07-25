import { describe, expect, it } from "vitest";
import type { SafetyInput } from "@/domain/contracts";
import {
  buildEmergencyScript,
  containsEmergencySignal,
  mergeVoiceSafetySignals,
  routeSafety,
} from "@/domain/safety";

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

  it.each(["strong", "overwhelming"] as const)(
    "routes %s intensity while alone to timely support",
    (intensityBand) => {
      expect(
        routeSafety({ ...base, intensityBand, isAlone: true }),
      ).toMatchObject({
        tier: "urgent_support",
        reasonCode: `${intensityBand}_while_alone`,
      });
    },
  );

  it("routes non-immediate self-harm thoughts to urgent human support", () => {
    expect(
      routeSafety({
        ...base,
        observableSignalIds: ["self_harm_thoughts"],
        intensityBand: "manageable",
      }),
    ).toMatchObject({
      tier: "urgent_support",
      reasonCode: "non_immediate_self_harm_thoughts",
      modelMayPersonalize: true,
    });
  });

  it("keeps a non-danger moment on the coping route", () => {
    expect(routeSafety(base)).toMatchObject({
      tier: "coping",
      modelMayPersonalize: true,
    });
  });

  it("authorizes the caregiver fallback action in the decision", () => {
    const decision = routeSafety({ ...base, role: "caregiver" });
    expect(decision.actionIds).toContain("keep_safe_distance");
  });

  it("authorizes an existing care plan for a pain coping route", () => {
    const decision = routeSafety({
      ...base,
      situationIds: ["pain"],
      intensityBand: "manageable",
    });
    expect(decision.actionIds).toContain("use_existing_plan");
  });

  it("gives an emergency observation precedence over contradictory low-risk input", () => {
    const decision = routeSafety({
      ...base,
      situationIds: ["stress"],
      intensityBand: "manageable",
      isAlone: false,
      observableSignalIds: ["not_responding"],
    });
    expect(decision).toMatchObject({
      tier: "emergency",
      modelMayPersonalize: false,
      reasonCode: "observable_not_responding",
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

  it("feeds voice-derived observable danger back through deterministic routing", () => {
    const checked = mergeVoiceSafetySignals(base, ["abnormal_breathing"]);
    expect(checked.observableSignalIds).toEqual(["abnormal_breathing"]);
    expect(routeSafety(checked).tier).toBe("emergency");
  });

  it("deduplicates tapped and voice-derived safety signals", () => {
    const checked = mergeVoiceSafetySignals(
      { ...base, observableSignalIds: ["collapsed"] },
      ["collapsed", "seizure"],
    );
    expect(checked.observableSignalIds).toEqual(["collapsed", "seizure"]);
  });
});
