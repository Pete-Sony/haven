import type {
  InterventionResult,
  SafetyDecision,
  SafetyInput,
} from "@/lib/domain/contracts";
import { CONTENT_VERSION } from "@/lib/domain/resources";

const individualActions: Record<
  SafetyInput["situationIds"][number],
  { actionId: string; label: string; script: string }
> = {
  social_pressure: {
    actionId: "move_to_exit",
    label: "Move toward the exit or a trusted person now.",
    script: "No. Please do not ask me again. I am leaving now.",
  },
  stress: {
    actionId: "move_to_quiet_place",
    label: "Move to a quieter place and contact one trusted person.",
    script: "I am overloaded and need a short pause. Please stay reachable.",
  },
  loneliness: {
    actionId: "contact_trusted_person",
    label: "Contact one trusted person and ask for five minutes of company.",
    script: "I am having a hard moment. Can you stay with me for five minutes?",
  },
  pain: {
    actionId: "use_existing_plan",
    label: "Move away from substances and use your existing care plan.",
    script:
      "My pain is difficult right now. Please help me use the plan I already have.",
  },
  recent_use: {
    actionId: "contact_human_support",
    label: "Bring a trusted person or human support service into this moment.",
    script:
      "I used recently and need you to stay available while I decide the next safe step.",
  },
  withdrawal_concern: {
    actionId: "contact_professional",
    label:
      "Contact qualified human support rather than changing medication or use on your own.",
    script: "I am worried about withdrawal and need professional guidance now.",
  },
  emotional_distress: {
    actionId: "contact_human_support",
    label: "Contact a trusted person or mental-health support service now.",
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
          label:
            "Keep a clear exit and ask what would help for the next five minutes.",
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
  const action = individualActions[situationId];
  const urgent = decision.tier === "urgent_support";
  return {
    schemaVersion: "1.0",
    headline: urgent
      ? "Bring another person into this moment now."
      : "Make the next minute smaller.",
    steps: [{ actionId: action.actionId, label: action.label }],
    spokenSummary: `${action.label} ${action.script}`,
    verbatimScript: action.script,
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
