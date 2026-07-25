import { describe, expect, it } from "vitest";
import { supportProfileInputSchema } from "@/domain/support-profile";

const validProfile = {
  schemaVersion: "1.0",
  language: "en-IN",
  readAloudByDefault: true,
  tone: "warm",
  commonPressurePatternId: "stress",
  firstHelpfulActionId: "call_someone",
  saferContextId: "shared_room",
  preferredHumanSupportType: "trusted_person",
  groundingPreferenceId: "sensory",
} as const;

describe("supportProfileInputSchema", () => {
  it("accepts a minimized support card and trims optional labels", () => {
    expect(
      supportProfileInputSchema.parse({
        ...validProfile,
        preferredName: "  Sam  ",
        safePlaceLabel: "  shared lounge  ",
        supportSentence: "  Take one step and ask for company.  ",
      }),
    ).toEqual({
      ...validProfile,
      preferredName: "Sam",
      safePlaceLabel: "shared lounge",
      supportSentence: "Take one step and ask for company.",
    });
  });

  it.each(["social_pressure", "stress", "loneliness", "pain"] as const)(
    "accepts the allowlisted pressure pattern %s",
    (pattern) => {
      expect(
        supportProfileInputSchema.parse({
          ...validProfile,
          commonPressurePatternId: pattern,
        }).commonPressurePatternId,
      ).toBe(pattern);
    },
  );

  it("rejects clinical history and acute safety fields", () => {
    for (const forbiddenField of [
      "substance",
      "diagnosis",
      "medication",
      "lastUseAt",
      "observableSignalIds",
      "isAlone",
      "intensityBand",
    ]) {
      expect(
        supportProfileInputSchema.safeParse({
          ...validProfile,
          [forbiddenField]: "not allowed",
        }).success,
      ).toBe(false);
    }
  });

  it("rejects blank or overlong optional text", () => {
    expect(
      supportProfileInputSchema.safeParse({
        ...validProfile,
        preferredName: " ",
      }).success,
    ).toBe(false);
    expect(
      supportProfileInputSchema.safeParse({
        ...validProfile,
        supportSentence: "x".repeat(161),
      }).success,
    ).toBe(false);
    expect(
      supportProfileInputSchema.safeParse({
        ...validProfile,
        safePlaceLabel: "x".repeat(81),
      }).success,
    ).toBe(false);
  });

  it("rejects unsupported language and non-allowlisted choices", () => {
    expect(
      supportProfileInputSchema.safeParse({
        ...validProfile,
        language: "en-US",
      }).success,
    ).toBe(false);
    expect(
      supportProfileInputSchema.safeParse({
        ...validProfile,
        groundingPreferenceId: "medication",
      }).success,
    ).toBe(false);
  });
});
