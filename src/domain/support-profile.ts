import { z } from "zod";

/**
 * A calm-time support preference card. It intentionally excludes clinical
 * history and every field used to make an acute safety decision.
 */
export const supportProfileInputSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    preferredName: z.string().trim().min(1).max(40).optional(),
    language: z.literal("en-IN"),
    readAloudByDefault: z.boolean(),
    tone: z.enum(["direct", "warm", "minimal"]),
    commonPressurePatternId: z.enum([
      "social_pressure",
      "stress",
      "loneliness",
      "pain",
    ]),
    firstHelpfulActionId: z.enum([
      "call_someone",
      "leave_safely",
      "quiet_company",
    ]),
    saferContextId: z.enum([
      "shared_room",
      "public_place",
      "trusted_home",
      "other_non_precise",
    ]),
    safePlaceLabel: z.string().trim().min(1).max(80).optional(),
    preferredHumanSupportType: z.enum([
      "trusted_person",
      "peer_support",
      "professional_support",
      "helpline",
      "not_sure",
    ]),
    groundingPreferenceId: z.enum([
      "sensory",
      "gentle_breathing",
      "quiet_company",
      "movement",
      "none",
    ]),
    supportSentence: z.string().trim().min(1).max(160).optional(),
  })
  .strict();

export type SupportProfileInput = z.infer<typeof supportProfileInputSchema>;
