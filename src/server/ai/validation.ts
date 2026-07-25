import {
  interventionArtifactSchema,
  interventionResultSchema,
  type InterventionArtifact,
  type InterventionResult,
  type SafetyDecision,
  type SafetyInput,
} from "@/domain/contracts";
import { getActionLabel } from "@/domain/actions";
import { rejectGeneratedTexts } from "@/server/ai/guardrails";

export interface InterventionValidationContext {
  readonly input: Pick<SafetyInput, "role">;
  readonly educationalClaim: string;
  readonly provider: InterventionResult["provider"];
  readonly promptVersion: string;
  readonly contentVersion: string;
}

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
  context: InterventionValidationContext,
): ValidationResult {
  const parsed = interventionArtifactSchema.safeParse(value);
  if (!parsed.success) {
    return { success: false, reason: "schema_invalid" };
  }

  const artifact: InterventionArtifact = parsed.data;
  const prose = [
    artifact.headline,
    artifact.spokenSummary,
    artifact.verbatimScript,
    artifact.supportMessageDraft,
    ...artifact.unknownFacts,
  ];
  const textRejection = rejectGeneratedTexts(prose);
  if (textRejection) {
    return { success: false, reason: textRejection };
  }

  if (
    !artifact.steps.every((step) => decision.actionIds.includes(step.actionId))
  ) {
    return { success: false, reason: "action_not_allowed" };
  }

  const selectedSources = new Set(allowedSourceIds);
  if (
    selectedSources.size !== allowedSourceIds.length ||
    artifact.sourceIds.length !== selectedSources.size ||
    new Set(artifact.sourceIds).size !== artifact.sourceIds.length ||
    !artifact.sourceIds.every((sourceId) => selectedSources.has(sourceId))
  ) {
    return { success: false, reason: "source_not_allowed" };
  }

  const result: InterventionResult = {
    ...artifact,
    steps: artifact.steps.map(({ actionId }) => ({
      actionId,
      label: getActionLabel(actionId, context.input.role),
    })),
    mindsetReframe: context.educationalClaim,
    provider: context.provider,
    promptVersion: context.promptVersion,
    contentVersion: context.contentVersion,
  };
  const validatedResult = interventionResultSchema.safeParse(result);
  return validatedResult.success
    ? { success: true, result: validatedResult.data }
    : { success: false, reason: "result_schema_invalid" };
}
