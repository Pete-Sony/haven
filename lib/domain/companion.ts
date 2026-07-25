import { z } from "zod";
import { observableSignalIdSchema } from "@/lib/domain/contracts";

export const MAX_COMPANION_TURNS = 4;
export const MAX_COMPANION_AUDIO_BYTES = 1_000_000;

export const companionHistoryItemSchema = z
  .object({
    user: z.string().trim().min(1).max(500),
    assistant: z.string().trim().min(1).max(320),
  })
  .strict();
export type CompanionHistoryItem = z.infer<typeof companionHistoryItemSchema>;

export const companionRequestContextSchema = z
  .object({
    history: z.array(companionHistoryItemSchema).max(MAX_COMPANION_TURNS - 1),
    text: z.string().trim().min(1).max(500).optional(),
  })
  .strict();
export type CompanionRequestContext = z.infer<
  typeof companionRequestContextSchema
>;

export const companionActionIdSchema = z.enum([
  "move_to_quiet_place",
  "contact_trusted_person",
  "open_human_support",
]);
export type CompanionActionId = z.infer<typeof companionActionIdSchema>;

export const companionReplySchema = z
  .object({
    kind: z.enum([
      "reflect",
      "ask_one_question",
      "suggest_allowed_action",
      "human_handoff",
    ]),
    text: z.string().trim().min(3).max(320),
    actionId: companionActionIdSchema.nullable(),
  })
  .strict();
export type CompanionReply = z.infer<typeof companionReplySchema>;

export const companionArtifactSchema = z
  .object({
    transcript: z.string().trim().min(1).max(500).nullable(),
    explicitFacts: z.array(z.string().trim().min(1).max(160)).max(4),
    unknownFacts: z.array(z.string().trim().min(1).max(100)).max(4),
    safetyConfirmationSignalIds: z.array(observableSignalIdSchema).max(4),
    reply: companionReplySchema.nullable(),
  })
  .strict();
export type CompanionArtifact = z.infer<typeof companionArtifactSchema>;

export const companionTurnResponseSchema = z
  .object({
    emergency: z.boolean(),
    transcript: z.string().min(1).max(500).nullable(),
    reply: companionReplySchema.nullable(),
    safetySignalIds: z.array(observableSignalIdSchema).max(4),
    emergencyScript: z.string().min(1).max(600).optional(),
    remainingTurns: z.number().int().min(0).max(MAX_COMPANION_TURNS),
    provider: z.enum(["gemini-3.6-flash", "deterministic"]),
    fallbackReason: z.string().min(1).max(100).optional(),
  })
  .strict();
export type CompanionTurnResponse = z.infer<typeof companionTurnResponseSchema>;

const PROHIBITED_REPLY_LANGUAGE =
  /\b(diagnos(?:e|is|ed|tic)|dos(?:e|age)|taper|detox at home|you are safe|guarantee(?:d)?|clinically proven|message (?:was|has been) sent)\b/i;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)/i;
const PHONE_PATTERN = /\b(?:\+?\d[\d ().-]{6,}\d)\b/;

export type CompanionValidationResult =
  | { readonly success: true; readonly artifact: CompanionArtifact }
  | { readonly success: false; readonly reason: string };

/** Applies semantic policy after structured model-output validation. */
export function validateCompanionArtifact(
  value: unknown,
  hasAudio: boolean,
): CompanionValidationResult {
  const parsed = companionArtifactSchema.safeParse(value);
  if (!parsed.success) return { success: false, reason: "schema_invalid" };

  const artifact = parsed.data;
  if (hasAudio !== Boolean(artifact.transcript)) {
    return { success: false, reason: "transcript_contract_invalid" };
  }
  if (artifact.safetyConfirmationSignalIds.length > 0) {
    return artifact.reply === null
      ? { success: true, artifact }
      : { success: false, reason: "danger_with_reply" };
  }
  if (!artifact.reply) return { success: false, reason: "missing_reply" };
  if (
    PROHIBITED_REPLY_LANGUAGE.test(artifact.reply.text) ||
    URL_PATTERN.test(artifact.reply.text) ||
    PHONE_PATTERN.test(artifact.reply.text)
  ) {
    return { success: false, reason: "prohibited_reply" };
  }
  const questionCount = artifact.reply.text.match(/\?/g)?.length ?? 0;
  if (questionCount > 1) {
    return { success: false, reason: "too_many_questions" };
  }
  const suggestsAction = artifact.reply.kind === "suggest_allowed_action";
  if (suggestsAction !== Boolean(artifact.reply.actionId)) {
    return { success: false, reason: "action_contract_invalid" };
  }
  return { success: true, artifact };
}

const SIGNAL_PATTERNS = [
  [
    "not_responding",
    /\b(?:not responding|unresponsive|cannot wake|can't wake|won't wake)\b/i,
  ],
  [
    "abnormal_breathing",
    /\b(?:not breathing|stopped breathing|gasping for air|breathing (?:is )?(?:abnormal|irregular))\b/i,
  ],
  ["seizure", /\b(?:seizure|convulsing)\b/i],
  ["collapsed", /\b(?:collapsed|passed out)\b/i],
  [
    "immediate_self_harm",
    /\b(?:going to kill myself|about to kill myself|end my life now|hurt myself now)\b/i,
  ],
  [
    "immediate_danger",
    /\b(?:in immediate danger|being attacked|someone is attacking|has a weapon)\b/i,
  ],
  [
    "caregiver_unsafe",
    /\b(?:i am unsafe here|i'm unsafe here|not safe around them)\b/i,
  ],
  ["not_sure", /\bnot sure (?:if|whether) (?:this is|it is) an emergency\b/i],
] as const satisfies ReadonlyArray<
  readonly [z.infer<typeof observableSignalIdSchema>, RegExp]
>;

/**
 * Detects only explicit emergency phrases in typed input. Model-extracted audio
 * signals still pass through the same deterministic safety router.
 */
export function detectExplicitEmergencySignals(
  text: string,
): z.infer<typeof observableSignalIdSchema>[] {
  const scanText = text
    .replace(/\bnot (?:currently )?in immediate danger\b/gi, "")
    .replace(/\bnot (?:having|experiencing) (?:a )?seizure\b/gi, "")
    .replace(/\b(?:did not|has not|have not) collapse(?:d)?\b/gi, "")
    .replace(/\bnot going to kill myself\b/gi, "")
    .replace(/\bnot being attacked\b/gi, "");
  return SIGNAL_PATTERNS.filter(([, pattern]) => pattern.test(scanText))
    .map(([signalId]) => signalId)
    .slice(0, 4);
}

/** Returns a reviewed response without pretending that failed audio was heard. */
export function createCompanionFallback(
  transcript: string | null,
  remainingTurns: number,
  reason: string,
): CompanionTurnResponse {
  return {
    emergency: false,
    transcript,
    reply: {
      kind: "human_handoff",
      text:
        transcript === null
          ? "I could not transcribe that recording. Try again, type a short message, or open immediate support."
          : "I could not personalize a response just now. Open immediate support or contact someone you trust.",
      actionId: null,
    },
    safetySignalIds: [],
    remainingTurns,
    provider: "deterministic",
    fallbackReason: reason.slice(0, 100) || "provider_error",
  };
}
