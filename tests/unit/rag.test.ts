import { describe, expect, it } from "vitest";
import type { SafetyDecision, SafetyInput } from "@/domain/contracts";
import {
  createStoredSupportMemory,
  retrieveRagContext,
  storedSupportMemorySchema,
  supportMemoryInputSchema,
} from "@/domain/rag";
import {
  ACTION_IDS,
  isSupportMemoryActionId,
  SUPPORT_MEMORY_ACTION_IDS,
} from "@/domain/actions";

const now = new Date("2026-07-25T12:00:00.000Z");
const input: SafetyInput = {
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
const decision: SafetyDecision = {
  tier: "coping",
  reasonCode: "no_explicit_danger",
  actionIds: ["move_to_safer_context", "contact_trusted_person"],
  resourceIds: ["in.nmba.14446"],
  modelMayPersonalize: true,
};

function memory(
  situationIds: SafetyInput["situationIds"],
  actionId:
    "move_to_safer_context" | "contact_trusted_person" | "open_human_support",
  helpfulness: "helpful" | "not_helpful" = "helpful",
  savedAt = "2026-07-24T12:00:00.000Z",
) {
  return storedSupportMemorySchema.parse({
    schemaVersion: "1.0",
    situationIds,
    actionId,
    helpfulness,
    consentVersion: "1.0",
    savedAt,
    expiresAt: "2026-10-24T12:00:00.000Z",
  });
}

describe("support memory guardrails", () => {
  it("derives memory eligibility from the canonical action registry", () => {
    expect(
      ACTION_IDS.filter((actionId) => isSupportMemoryActionId(actionId)),
    ).toEqual(SUPPORT_MEMORY_ACTION_IDS);
  });

  it("creates a consented memory with a 90-day expiry", () => {
    const stored = createStoredSupportMemory(
      {
        schemaVersion: "1.0",
        situationIds: ["stress"],
        actionId: "contact_trusted_person",
        helpfulness: "helpful",
      },
      now,
    );
    expect(stored.savedAt).toBe("2026-07-25T12:00:00.000Z");
    expect(stored.expiresAt).toBe("2026-10-23T12:00:00.000Z");
    expect(stored.consentVersion).toBe("1.0");
  });

  it.each([
    "transcript",
    "audio",
    "diagnosis",
    "medication",
    "substance",
    "location",
    "generatedScript",
    "caregiverObservation",
  ])("rejects forbidden free-form history field %s", (field) => {
    expect(
      supportMemoryInputSchema.safeParse({
        schemaVersion: "1.0",
        situationIds: ["stress"],
        actionId: "contact_trusted_person",
        helpfulness: "helpful",
        [field]: "sensitive value",
      }).success,
    ).toBe(false);
  });
});

describe("two-lane RAG retrieval", () => {
  it("bypasses both retrieval lanes for an emergency", () => {
    expect(
      retrieveRagContext(
        input,
        {
          ...decision,
          tier: "emergency",
          actionIds: ["call_112", "dispatcher_script"],
          resourceIds: ["in.erss.112"],
          modelMayPersonalize: false,
        },
        [memory(["stress"], "contact_trusted_person")],
        now,
      ),
    ).toEqual({ status: "emergency_bypass" });
  });

  it("retrieves exact educational evidence and matching personal memories", () => {
    const context = retrieveRagContext(
      input,
      decision,
      [
        memory(["loneliness"], "contact_trusted_person"),
        memory(["stress"], "open_human_support"),
        memory(
          ["stress"],
          "contact_trusted_person",
          "not_helpful",
          "2026-07-25T11:00:00.000Z",
        ),
        memory(["stress"], "move_to_safer_context"),
      ],
      now,
    );
    expect(context.status).toBe("ready");
    if (context.status !== "ready") throw new Error("expected ready RAG");
    expect(context.context.educational.sourceId).toBe(
      "haven.craving-support.v1",
    );
    expect(context.context.personal).toEqual([
      {
        situationIds: ["stress"],
        actionId: "contact_trusted_person",
        helpfulness: "not_helpful",
      },
      {
        situationIds: ["stress"],
        actionId: "move_to_safer_context",
        helpfulness: "helpful",
      },
    ]);
  });

  it("does not expose personal history in caregiver mode", () => {
    const caregiverInput = { ...input, role: "caregiver" as const };
    const context = retrieveRagContext(
      caregiverInput,
      decision,
      [memory(["stress"], "contact_trusted_person")],
      now,
    );
    expect(context.status).toBe("ready");
    if (context.status !== "ready") throw new Error("expected ready RAG");
    expect(context.context.educational.sourceId).toBe(
      "haven.caregiver-talk.v1",
    );
    expect(context.context.personal).toEqual([]);
  });

  it("drops expired, mismatched, and safety-disallowed memories", () => {
    const expired = {
      ...memory(["stress"], "contact_trusted_person"),
      expiresAt: "2026-07-25T11:59:59.000Z",
    };
    const context = retrieveRagContext(
      input,
      decision,
      [
        expired,
        memory(["pain"], "contact_trusted_person"),
        memory(["stress"], "open_human_support"),
      ],
      now,
    );
    expect(context.status).toBe("ready");
    if (context.status !== "ready") throw new Error("expected ready RAG");
    expect(context.context.personal).toEqual([]);
  });

  it("fails closed when the explicitly mapped evidence is stale", () => {
    expect(
      retrieveRagContext(input, decision, [], new Date("2026-09-01T00:00:00Z")),
    ).toEqual({
      status: "grounding_unavailable",
      reason: "educational_evidence_not_found",
    });
  });
});
