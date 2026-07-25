import { describe, expect, it } from "vitest";
import type { SafetyInput } from "@/lib/domain/contracts";
import { routeSafety } from "@/lib/domain/safety";
import { buildInterventionPrompt } from "@/lib/server/ai/prompts";

const individualInput: SafetyInput = {
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

describe("buildInterventionPrompt", () => {
  it("supplies only the individual route's exact educational source", () => {
    const prompt = buildInterventionPrompt(
      individualInput,
      routeSafety(individualInput),
      false,
    );
    expect(prompt).toContain("haven.craving-support.v1");
    expect(prompt).not.toContain("haven.caregiver-talk.v1");
    expect(prompt).not.toContain("in.nmba.14446");
  });

  it("supplies only the caregiver route's exact educational source", () => {
    const caregiverInput = {
      ...individualInput,
      role: "caregiver" as const,
    };
    const prompt = buildInterventionPrompt(
      caregiverInput,
      routeSafety(caregiverInput),
      true,
    );
    expect(prompt).toContain("haven.caregiver-talk.v1");
    expect(prompt).not.toContain("haven.craving-support.v1");
  });

  it("requires one artifact and forbids coping composition after voice danger", () => {
    const prompt = buildInterventionPrompt(
      individualInput,
      routeSafety(individualInput),
      true,
    );
    expect(prompt).toContain("one bounded Haven artifact");
    expect(prompt).toContain("set intervention to null");
    expect(prompt).toContain(
      "Do not compose normal coping content from an emergency observation.",
    );
  });
});
