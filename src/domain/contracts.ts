import { z } from "zod";
import { ACTION_IDS } from "@/domain/actions";

export const roleSchema = z.enum(["individual", "caregiver"]);
export type Role = z.infer<typeof roleSchema>;

export const riskTierSchema = z.enum(["emergency", "urgent_support", "coping"]);
export type RiskTier = z.infer<typeof riskTierSchema>;

export const situationIdSchema = z.enum([
  "social_pressure",
  "stress",
  "loneliness",
  "pain",
  "recent_use",
  "withdrawal_concern",
  "emotional_distress",
]);
export type SituationId = z.infer<typeof situationIdSchema>;

export const observableSignalIdSchema = z.enum([
  "not_responding",
  "abnormal_breathing",
  "seizure",
  "collapsed",
  "immediate_self_harm",
  "immediate_danger",
  "caregiver_unsafe",
  "not_sure",
  "self_harm_thoughts",
]);
export type ObservableSignalId = z.infer<typeof observableSignalIdSchema>;

export const toneSchema = z.enum(["direct", "warm", "minimal"]);
export type Tone = z.infer<typeof toneSchema>;

export const languageSchema = z.literal("en-IN");
export type Language = z.infer<typeof languageSchema>;

export const intensityBandSchema = z.enum([
  "manageable",
  "strong",
  "overwhelming",
]);
export type IntensityBand = z.infer<typeof intensityBandSchema>;

export const safetyInputSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    role: roleSchema,
    situationIds: z.array(situationIdSchema).min(1).max(3),
    observableSignalIds: z.array(observableSignalIdSchema).max(8).default([]),
    intensityBand: intensityBandSchema,
    goalId: z
      .enum(["leave_safely", "call_someone", "get_through_minute", "listen"])
      .default("get_through_minute"),
    tone: toneSchema,
    language: languageSchema,
    jurisdiction: z
      .object({
        country: z.literal("IN"),
        state: z.literal("KL").optional(),
      })
      .strict(),
    isAlone: z.boolean(),
    supportRelationship: z.string().trim().min(1).max(40).optional(),
  })
  .strict();
export type SafetyInput = z.infer<typeof safetyInputSchema>;

export const actionIdSchema = z.enum(ACTION_IDS);
export type ActionId = z.infer<typeof actionIdSchema>;

export const safetyDecisionSchema = z
  .object({
    tier: riskTierSchema,
    reasonCode: z.string().min(1).max(80),
    actionIds: z.array(actionIdSchema).min(1).max(4),
    resourceIds: z.array(z.string().min(1).max(100)).min(1).max(4),
    modelMayPersonalize: z.boolean(),
  })
  .strict();
export type SafetyDecision = z.infer<typeof safetyDecisionSchema>;

export const normalizedFactsSchema = z
  .object({
    explicitFacts: z.array(z.string().min(1).max(160)).max(6),
    unknownFacts: z.array(z.string().min(1).max(100)).max(6),
    safetyConfirmationSignalIds: z.array(observableSignalIdSchema).max(4),
  })
  .strict();
export type NormalizedFacts = z.infer<typeof normalizedFactsSchema>;

export const interventionArtifactSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    headline: z.string().min(3).max(100),
    steps: z
      .array(
        z
          .object({
            actionId: actionIdSchema,
          })
          .strict(),
      )
      .min(1)
      .max(3),
    spokenSummary: z.string().min(3).max(240),
    verbatimScript: z.string().min(3).max(280),
    supportMessageDraft: z.string().min(3).max(360),
    sourceIds: z.array(z.string().min(1).max(100)).min(1).max(2),
    unknownFacts: z.array(z.string().min(1).max(100)).max(6),
  })
  .strict();
export type InterventionArtifact = z.infer<typeof interventionArtifactSchema>;

export const interventionResultSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    headline: z.string().min(3).max(100),
    steps: z
      .array(
        z
          .object({
            actionId: actionIdSchema,
            label: z.string().min(3).max(140),
          })
          .strict(),
      )
      .min(1)
      .max(3),
    spokenSummary: z.string().min(3).max(240),
    verbatimScript: z.string().min(3).max(280),
    supportMessageDraft: z.string().min(3).max(360),
    mindsetReframe: z.string().min(3).max(240),
    sourceIds: z.array(z.string().min(1).max(100)).min(1).max(2),
    unknownFacts: z.array(z.string().min(1).max(100)).max(6),
    provider: z.enum(["gemini-3.6-flash", "deterministic"]),
    promptVersion: z.string().min(1).max(80),
    contentVersion: z.string().min(1).max(40),
    fallbackReason: z.string().min(1).max(100).optional(),
  })
  .strict();
export type InterventionResult = z.infer<typeof interventionResultSchema>;

export const externalActionStateSchema = z.enum([
  "draft",
  "reviewed",
  "handoff_opened",
  "cancelled",
  "failed",
]);
export type ExternalActionState = z.infer<typeof externalActionStateSchema>;

export const savedPlanInputSchema = z
  .object({
    triggerIds: z.array(situationIdSchema).min(1).max(3),
    supportActionId: z.enum(["call_someone", "leave_safely", "quiet_company"]),
    tone: toneSchema,
    language: languageSchema,
    trustedContactId: z.string().uuid().nullable(),
    safePlaceLabel: z.string().trim().max(80),
  })
  .strict();
export type SavedPlanInput = z.infer<typeof savedPlanInputSchema>;

export const trustedContactInputSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80),
    phone: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{7,14}$/, "Use an E.164 phone number"),
    relationship: z.enum([
      "friend",
      "family",
      "partner",
      "peer",
      "sponsor",
      "other",
    ]),
    preferredChannel: z.enum(["call", "share_draft"]),
  })
  .strict();
export type TrustedContactInput = z.infer<typeof trustedContactInputSchema>;
