import {
  interventionResultSchema,
  type InterventionResult,
  type SafetyDecision,
} from "@/lib/domain/contracts";
const PROHIBITED_LANGUAGE =
  /\b(diagnos(?:e|is|ed|tic)|dos(?:e|age)|taper|detox at home|you are safe|guarantee(?:d)?|clinically proven|message (?:was|has been) sent)\b/i;

const ALLOWED_ACTION_IDS = new Set([
  "move_to_safer_context",
  "move_to_exit",
  "move_to_quiet_place",
  "contact_trusted_person",
  "use_existing_plan",
  "contact_human_support",
  "open_human_support",
  "contact_professional",
  "keep_safe_distance",
]);

export interface ValidationResult {
  readonly success: boolean;
  readonly result?: InterventionResult;
  readonly reason?: string;
}

/** Enforces application policy after structural model-output validation. */
export function validateIntervention(
  value: unknown,
  decision: SafetyDecision,
  allowedSourceIds: readonly string[],
): ValidationResult {
  const parsed = interventionResultSchema.safeParse(value);
  if (!parsed.success) {
    return { success: false, reason: "schema_invalid" };
  }

  const result = parsed.data;
  const prose = [
    result.headline,
    result.spokenSummary,
    result.verbatimScript,
    result.supportMessageDraft,
    result.mindsetReframe,
    ...result.steps.map((step) => step.label),
  ];
  if (prose.some((item) => PROHIBITED_LANGUAGE.test(item))) {
    return { success: false, reason: "prohibited_language" };
  }

  if (
    result.steps.some((step) => !ALLOWED_ACTION_IDS.has(step.actionId)) ||
    !result.steps.every((step) => decision.actionIds.includes(step.actionId))
  ) {
    return { success: false, reason: "action_not_allowed" };
  }

  const selectedSources = new Set(allowedSourceIds);
  if (
    selectedSources.size !== allowedSourceIds.length ||
    result.sourceIds.length !== selectedSources.size ||
    new Set(result.sourceIds).size !== result.sourceIds.length ||
    !result.sourceIds.every((sourceId) => selectedSources.has(sourceId))
  ) {
    return { success: false, reason: "source_not_allowed" };
  }

  return { success: true, result };
}
