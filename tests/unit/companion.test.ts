import { describe, expect, it } from "vitest";
import {
  companionRequestContextSchema,
  companionTurnResponseSchema,
  createCompanionFallback,
  detectExplicitEmergencySignals,
  MAX_COMPANION_TURNS,
  validateCompanionArtifact,
  type CompanionArtifact,
} from "@/domain/companion";
import {
  buildCompanionPayload,
  buildCompanionPrompt,
} from "@/server/ai/companion";

const historyItem = {
  user: "I feel pulled in two directions.",
  assistant: "What would make the next minute feel a little more manageable?",
};

const safeArtifact: CompanionArtifact = {
  transcript: null,
  explicitFacts: ["The person feels pressure."],
  unknownFacts: [],
  safetyConfirmationSignalIds: [],
  reply: {
    kind: "reflect",
    text: "It sounds like this moment feels crowded. What needs attention first?",
    actionId: null,
  },
};

describe("companion request contracts", () => {
  it("accepts at most three prior exchanges for a four-turn session", () => {
    const parsed = companionRequestContextSchema.parse({
      history: Array.from(
        { length: MAX_COMPANION_TURNS - 1 },
        () => historyItem,
      ),
      text: "I want to slow this down.",
    });
    expect(parsed.history).toHaveLength(3);
  });

  it("rejects a fifth turn, oversized text, and extra keys", () => {
    expect(
      companionRequestContextSchema.safeParse({
        history: Array.from({ length: MAX_COMPANION_TURNS }, () => historyItem),
        text: "One more turn",
      }).success,
    ).toBe(false);
    expect(
      companionRequestContextSchema.safeParse({
        history: [],
        text: "x".repeat(501),
      }).success,
    ).toBe(false);
    expect(
      companionRequestContextSchema.safeParse({
        history: [],
        text: "Hello",
        secret: "not allowed",
      }).success,
    ).toBe(false);
  });
});

describe("companion semantic validation", () => {
  it("accepts a bounded text reply and a transcribed audio reply", () => {
    expect(validateCompanionArtifact(safeArtifact, false).success).toBe(true);
    expect(
      validateCompanionArtifact(
        { ...safeArtifact, transcript: "I need a quiet minute." },
        true,
      ).success,
    ).toBe(true);
  });

  it("rejects malformed output and transcript contract mismatches", () => {
    expect(validateCompanionArtifact({ reply: "hello" }, false)).toEqual({
      success: false,
      reason: "schema_invalid",
    });
    expect(
      validateCompanionArtifact(
        { ...safeArtifact, transcript: "Unexpected transcript" },
        false,
      ),
    ).toMatchObject({ reason: "transcript_contract_invalid" });
    expect(validateCompanionArtifact(safeArtifact, true)).toMatchObject({
      reason: "transcript_contract_invalid",
    });
  });

  it("accepts danger only when the normal reply is null", () => {
    const danger = {
      ...safeArtifact,
      safetyConfirmationSignalIds: ["abnormal_breathing"],
      reply: null,
    };
    expect(validateCompanionArtifact(danger, false).success).toBe(true);
    expect(
      validateCompanionArtifact(
        { ...danger, reply: safeArtifact.reply },
        false,
      ),
    ).toMatchObject({ reason: "danger_with_reply" });
  });

  it("requires a reply for a non-danger turn", () => {
    expect(
      validateCompanionArtifact({ ...safeArtifact, reply: null }, false),
    ).toMatchObject({ reason: "missing_reply" });
  });

  it.each([
    "This is a diagnosis.",
    "Take this dosage.",
    "You are safe.",
    "Visit https://example.com.",
    "Call +91 12345 67890.",
  ])("rejects prohibited reply content: %s", (text) => {
    expect(
      validateCompanionArtifact(
        {
          ...safeArtifact,
          reply: { ...safeArtifact.reply!, text },
        },
        false,
      ),
    ).toMatchObject({ reason: "prohibited_reply" });
  });

  it("permits at most one question", () => {
    expect(
      validateCompanionArtifact(
        {
          ...safeArtifact,
          reply: {
            ...safeArtifact.reply!,
            text: "What happened? What do you need?",
          },
        },
        false,
      ),
    ).toMatchObject({ reason: "too_many_questions" });
  });

  it("requires action IDs only for suggested actions", () => {
    expect(
      validateCompanionArtifact(
        {
          ...safeArtifact,
          reply: {
            kind: "suggest_allowed_action",
            text: "Move to a quieter place for one minute.",
            actionId: null,
          },
        },
        false,
      ),
    ).toMatchObject({ reason: "action_contract_invalid" });
    expect(
      validateCompanionArtifact(
        {
          ...safeArtifact,
          reply: {
            kind: "reflect",
            text: "This sounds like a heavy moment.",
            actionId: "move_to_safer_context",
          },
        },
        false,
      ),
    ).toMatchObject({ reason: "action_contract_invalid" });
    expect(
      validateCompanionArtifact(
        {
          ...safeArtifact,
          reply: {
            kind: "suggest_allowed_action",
            text: "Move somewhere quieter.",
            actionId: "move_to_quiet_place",
          },
        },
        false,
      ),
    ).toMatchObject({ reason: "schema_invalid" });
    expect(
      validateCompanionArtifact(
        {
          ...safeArtifact,
          reply: {
            kind: "suggest_allowed_action",
            text: "Move somewhere quieter.",
            actionId: "move_to_safer_context",
          },
        },
        false,
      ).success,
    ).toBe(true);
  });
});

describe("explicit typed emergency detection", () => {
  it.each([
    ["They are not responding.", "not_responding"],
    ["He is not breathing.", "abnormal_breathing"],
    ["They are having a seizure.", "seizure"],
    ["She collapsed.", "collapsed"],
    ["I am going to kill myself.", "immediate_self_harm"],
    ["Someone is attacking me.", "immediate_danger"],
    ["I am unsafe here.", "caregiver_unsafe"],
    ["I am not sure if this is an emergency.", "not_sure"],
  ] as const)("maps %s to %s", (text, signal) => {
    expect(detectExplicitEmergencySignals(text)).toContain(signal);
  });

  it("does not route explicit negations as danger", () => {
    expect(
      detectExplicitEmergencySignals(
        "I am not in immediate danger and I am not going to kill myself.",
      ),
    ).toEqual([]);
  });

  it("caps even a pathological input at four signals", () => {
    expect(
      detectExplicitEmergencySignals(
        "Not responding, not breathing, seizure, collapsed, and someone is attacking me with a weapon.",
      ),
    ).toHaveLength(4);
  });
});

describe("companion fallback and prompt", () => {
  it("does not invent a transcript after failed audio", () => {
    const result = createCompanionFallback(null, 3, "provider_timeout");
    expect(result.transcript).toBeNull();
    expect(result.reply?.text).toContain("could not transcribe");
    expect(companionTurnResponseSchema.parse(result)).toEqual(result);
  });

  it("preserves typed input and normalizes an empty failure reason", () => {
    const result = createCompanionFallback("Typed message", 2, "");
    expect(result.transcript).toBe("Typed message");
    expect(result.fallbackReason).toBe("provider_error");
    expect(result.reply?.text).toContain("could not personalize");
  });

  it("marks history as untrusted and distinguishes audio from text", () => {
    const context = { history: [historyItem], text: "Current text" };
    const textPrompt = buildCompanionPrompt(context, false);
    const audioPrompt = buildCompanionPrompt({ history: [historyItem] }, true);
    expect(textPrompt).toContain("untrusted user data");
    expect(textPrompt).toContain("Set transcript to null");
    expect(audioPrompt).toContain("Transcribe only the spoken words");
    expect(audioPrompt).toContain("set reply to null");
  });

  it("redacts contact, URL, timestamp, and labeled private details", () => {
    const payload = buildCompanionPayload({
      history: [
        {
          user: "My name is Joel. Call +91 98765 43210.",
          assistant: "Saved at 2026-07-25T12:30:00Z.",
        },
      ],
      text: "Email me@example.com or visit https://example.com. Safe place is Home.",
    });
    expect(payload).not.toContain("Joel");
    expect(payload).not.toContain("98765");
    expect(payload).not.toContain("2026-07-25");
    expect(payload).not.toContain("me@example.com");
    expect(payload).not.toContain("https://example.com");
    expect(payload).not.toContain("Home");
    expect(payload).toContain("[redacted-private-detail]");
  });
});
