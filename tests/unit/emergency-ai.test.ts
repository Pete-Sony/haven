import { describe, expect, it } from "vitest";
import type { SafetyInput } from "@/domain/contracts";
import {
  renderEmergencyWordingArtifact,
  validateEmergencyWordingArtifact,
} from "@/server/ai/emergency";

const input: SafetyInput = {
  schemaVersion: "1.0",
  role: "caregiver",
  situationIds: ["recent_use"],
  observableSignalIds: ["collapsed", "abnormal_breathing"],
  intensityBand: "overwhelming",
  goalId: "call_someone",
  tone: "warm",
  language: "en-IN",
  jurisdiction: { country: "IN" },
  isAlone: false,
};

const validArtifact = {
  schemaVersion: "1.0",
  role: "caregiver",
  tone: "warm",
  signalIds: ["abnormal_breathing", "collapsed"],
  openingId: "calm_request",
} as const;

describe("emergency wording artifact", () => {
  it("accepts exact observed facts regardless of order and renders reviewed prose", () => {
    const artifact = validateEmergencyWordingArtifact(validArtifact, input);
    expect(artifact).not.toBeNull();
    expect(renderEmergencyWordingArtifact(artifact!)).toBe(
      "I need calm emergency help. A person is not breathing normally and collapsed. Our location is unknown until I state it. Please send emergency assistance. I will follow the dispatcher's instructions.",
    );
  });

  it("rejects added or removed safety facts", () => {
    expect(
      validateEmergencyWordingArtifact(
        { ...validArtifact, signalIds: ["collapsed", "seizure"] },
        input,
      ),
    ).toBeNull();
  });

  it("rejects a phrase ID that does not match the requested tone", () => {
    expect(
      validateEmergencyWordingArtifact(
        { ...validArtifact, openingId: "direct_request" },
        input,
      ),
    ).toBeNull();
  });

  it("rejects duplicate facts", () => {
    expect(
      validateEmergencyWordingArtifact(
        {
          ...validArtifact,
          signalIds: ["collapsed", "collapsed", "abnormal_breathing"],
        },
        input,
      ),
    ).toBeNull();
  });
});
