import { describe, expect, it } from "vitest";
import type {
  InterventionResult,
  SafetyDecision,
} from "@/lib/domain/contracts";
import { validateIntervention } from "@/lib/server/ai/validation";

const decision: SafetyDecision = {
  tier: "coping",
  reasonCode: "test",
  actionIds: ["move_to_safer_context", "contact_trusted_person"],
  resourceIds: ["in.nmba.14446"],
  modelMayPersonalize: true,
};

const valid: InterventionResult = {
  schemaVersion: "1.0",
  headline: "Make the next minute smaller.",
  steps: [
    {
      actionId: "contact_trusted_person",
      label: "Contact one trusted person for five minutes.",
    },
  ],
  spokenSummary: "Contact one trusted person for five minutes.",
  verbatimScript: "Could you stay with me for five minutes?",
  supportMessageDraft: "Could you call me for five minutes?",
  mindsetReframe: "Only the next action is required.",
  sourceIds: ["haven.craving-support.v1"],
  unknownFacts: [],
  provider: "gemini-3.6-flash",
  promptVersion: "haven-composer-1",
  contentVersion: "2026-07-25",
};

describe("validateIntervention", () => {
  it("accepts a structurally and semantically valid artifact", () => {
    expect(validateIntervention(valid, decision)).toMatchObject({
      success: true,
    });
  });

  it("rejects malformed output", () => {
    expect(validateIntervention({ headline: "short" }, decision).reason).toBe(
      "schema_invalid",
    );
  });

  it.each([
    "You are safe.",
    "This is a diagnosis.",
    "Take this dosage.",
    "Your message was sent.",
    "This is guaranteed.",
  ])("rejects prohibited claim: %s", (headline) => {
    expect(validateIntervention({ ...valid, headline }, decision).reason).toBe(
      "prohibited_language",
    );
  });

  it("rejects an action outside the safety decision", () => {
    const result = {
      ...valid,
      steps: [{ actionId: "contact_professional", label: "Contact support." }],
    };
    expect(validateIntervention(result, decision).reason).toBe(
      "action_not_allowed",
    );
  });

  it("rejects invented source identifiers", () => {
    expect(
      validateIntervention(
        { ...valid, sourceIds: ["invented.source"] },
        decision,
      ).reason,
    ).toBe("source_not_allowed");
  });

  it("permits a tier-matched service source", () => {
    expect(
      validateIntervention({ ...valid, sourceIds: ["in.nmba.14446"] }, decision)
        .success,
    ).toBe(true);
  });
});
