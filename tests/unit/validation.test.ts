import { describe, expect, it } from "vitest";
import type { InterventionArtifact, SafetyDecision } from "@/domain/contracts";
import { validateIntervention } from "@/server/ai/validation";

const decision: SafetyDecision = {
  tier: "coping",
  reasonCode: "test",
  actionIds: ["move_to_safer_context", "contact_trusted_person"],
  resourceIds: ["in.nmba.14446"],
  modelMayPersonalize: true,
};

const valid: InterventionArtifact = {
  schemaVersion: "1.0",
  headline: "Make the next minute smaller.",
  steps: [
    {
      actionId: "contact_trusted_person",
    },
  ],
  spokenSummary: "Contact one trusted person for five minutes.",
  verbatimScript: "Could you stay with me for five minutes?",
  supportMessageDraft: "Could you call me for five minutes?",
  sourceIds: ["haven.craving-support.v1"],
  unknownFacts: [],
};
const individualSources = ["haven.craving-support.v1"] as const;
const validationContext = {
  input: { role: "individual" as const },
  educationalClaim: "Only the reviewed next action is required.",
  provider: "gemini-3.6-flash" as const,
  promptVersion: "haven-composer-1",
  contentVersion: "2026-07-25",
};

function validate(value: unknown) {
  return validateIntervention(
    value,
    decision,
    individualSources,
    validationContext,
  );
}

describe("validateIntervention", () => {
  it("accepts a structurally and semantically valid artifact", () => {
    expect(validate(valid)).toMatchObject({
      success: true,
      result: {
        mindsetReframe: validationContext.educationalClaim,
        steps: [
          {
            actionId: "contact_trusted_person",
            label:
              "Contact one trusted person and ask for five minutes of company.",
          },
        ],
      },
    });
  });

  it("rejects model-authored action labels", () => {
    expect(
      validate({
        ...valid,
        steps: [
          {
            actionId: "contact_trusted_person",
            label: "A model-authored label.",
          },
        ],
      }).reason,
    ).toBe("schema_invalid");
  });

  it("rejects malformed output", () => {
    expect(validate({ headline: "short" }).reason).toBe("schema_invalid");
  });

  it.each([
    "You are safe.",
    "This is a diagnosis.",
    "Take this dosage.",
    "Your message was sent.",
    "This is guaranteed.",
    "Take this medication.",
    "Help is on the way.",
  ])("rejects prohibited claim: %s", (headline) => {
    expect(validate({ ...valid, headline }).reason).toBe("prohibited_language");
  });

  it("rejects coercive generated language", () => {
    expect(
      validate({ ...valid, headline: "You must do as I say." }).reason,
    ).toBe("coercive_language");
  });

  it.each([
    ["Visit https://example.com.", "url_not_allowed"],
    ["Email helper@example.com.", "email_not_allowed"],
    ["Call +91 98765 43210.", "phone_not_allowed"],
  ])("rejects generated contact detail: %s", (headline, reason) => {
    expect(validate({ ...valid, headline }).reason).toBe(reason);
  });

  it("rejects an action outside the safety decision", () => {
    const result = {
      ...valid,
      steps: [{ actionId: "contact_professional" }],
    };
    expect(validate(result).reason).toBe("action_not_allowed");
  });

  it("rejects invented source identifiers", () => {
    expect(validate({ ...valid, sourceIds: ["invented.source"] }).reason).toBe(
      "source_not_allowed",
    );
  });

  it("rejects a real service source that was not selected for composition", () => {
    expect(validate({ ...valid, sourceIds: ["in.nmba.14446"] }).reason).toBe(
      "source_not_allowed",
    );
  });

  it("rejects laundering a real caregiver source into an individual route", () => {
    expect(
      validate({ ...valid, sourceIds: ["haven.caregiver-talk.v1"] }).reason,
    ).toBe("source_not_allowed");
  });

  it("rejects duplicate sources even when the identifier is allowed", () => {
    expect(
      validate({
        ...valid,
        sourceIds: ["haven.craving-support.v1", "haven.craving-support.v1"],
      }).reason,
    ).toBe("source_not_allowed");
  });
});
