import type {
  ActionId,
  InterventionResult,
  SafetyDecision,
  SafetyInput,
} from "@/domain/contracts";
import { getActionLabel } from "@/domain/actions";
import { CONTENT_VERSION } from "@/domain/resources";

const individualActions: Record<
  SafetyInput["situationIds"][number],
  { actionId: ActionId; script: string }
> = {
  social_pressure: {
    actionId: "move_to_safer_context",
    script: "No. Please do not ask me again. I am leaving now.",
  },
  stress: {
    actionId: "move_to_safer_context",
    script: "I am overloaded and need a short pause. Please stay reachable.",
  },
  loneliness: {
    actionId: "contact_trusted_person",
    script: "I am having a hard moment. Can you stay with me for five minutes?",
  },
  pain: {
    actionId: "use_existing_plan",
    script:
      "My pain is difficult right now. Please help me use the plan I already have.",
  },
  recent_use: {
    actionId: "open_human_support",
    script:
      "I used recently and need you to stay available while I decide the next safe step.",
  },
  withdrawal_concern: {
    actionId: "contact_professional",
    script: "I am worried about withdrawal and need professional guidance now.",
  },
  emotional_distress: {
    actionId: "open_human_support",
    script:
      "I am in severe distress and need a calm person with me while I seek support.",
  },
};

/** Returns the reviewed scenario-specific result used for every AI failure. */
export function createFallback(
  input: SafetyInput,
  decision: SafetyDecision,
  reason = "provider_unavailable",
): InterventionResult {
  if (input.role === "caregiver") {
    return {
      schemaVersion: "1.0",
      headline: "Stay present and offer one small choice.",
      steps: [
        {
          actionId: "keep_safe_distance",
          label: getActionLabel("keep_safe_distance", input.role),
        },
      ],
      spokenSummary:
        "Stay present, keep a clear exit, and offer one small choice.",
      verbatimScript:
        "I am here with you. Would you prefer quiet company or help calling someone?",
      supportMessageDraft:
        "I am supporting someone through a difficult moment. Could you stay available by phone while we choose the next safe step?",
      mindsetReframe:
        "Your role is grounded presence and safety, not diagnosing or controlling the outcome.",
      sourceIds: ["haven.caregiver-talk.v1"],
      unknownFacts: [],
      provider: "deterministic",
      promptVersion: "haven-fallback-1",
      contentVersion: CONTENT_VERSION,
      fallbackReason: reason,
    };
  }

  const situationId = input.situationIds[0] ?? "stress";
  const preferredAction = individualActions[situationId];
  const actionId = decision.actionIds.includes(preferredAction.actionId)
    ? preferredAction.actionId
    : (decision.actionIds[0] ?? preferredAction.actionId);
  const actionLabel = getActionLabel(actionId, input.role);
  const urgent = decision.tier === "urgent_support";
  return {
    schemaVersion: "1.0",
    headline: urgent
      ? "Bring another person into this moment now."
      : "Make the next minute smaller.",
    steps: [{ actionId, label: actionLabel }],
    spokenSummary: `${actionLabel} ${preferredAction.script}`,
    verbatimScript: preferredAction.script,
    supportMessageDraft: urgent
      ? "I am having a difficult moment and need a calm voice while I move somewhere safer. Can you call me now?"
      : "I am using my support plan. Could you check in with me for five minutes?",
    mindsetReframe:
      "This moment deserves support, not shame. Only the next safe action is required.",
    sourceIds: ["haven.craving-support.v1"],
    unknownFacts: [],
    provider: "deterministic",
    promptVersion: "haven-fallback-1",
    contentVersion: CONTENT_VERSION,
    fallbackReason: reason,
  };
}
