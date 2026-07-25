import type {
  ObservableSignalId,
  SafetyDecision,
  SafetyInput,
} from "@/lib/domain/contracts";

export const EMERGENCY_SIGNALS = new Set<ObservableSignalId>([
  "not_responding",
  "abnormal_breathing",
  "seizure",
  "collapsed",
  "immediate_self_harm",
  "immediate_danger",
  "caregiver_unsafe",
  "not_sure",
]);

const URGENT_SITUATIONS = new Set<SafetyInput["situationIds"][number]>([
  "recent_use",
  "withdrawal_concern",
  "emotional_distress",
]);

/** Assigns the safety tier without consulting a model or network. */
export function routeSafety(input: SafetyInput): SafetyDecision {
  const emergencySignal = input.observableSignalIds.find((signalId) =>
    EMERGENCY_SIGNALS.has(signalId),
  );

  if (emergencySignal) {
    return {
      tier: "emergency",
      reasonCode: `observable_${emergencySignal}`,
      actionIds: ["call_112", "dispatcher_script"],
      resourceIds: ["in.erss.112"],
      modelMayPersonalize: false,
    };
  }

  const urgentSituation = input.situationIds.find((situationId) =>
    URGENT_SITUATIONS.has(situationId),
  );
  if (
    urgentSituation ||
    (input.intensityBand === "overwhelming" && input.isAlone)
  ) {
    return {
      tier: "urgent_support",
      reasonCode: urgentSituation
        ? `urgent_${urgentSituation}`
        : "overwhelming_while_alone",
      actionIds: ["contact_trusted_person", "open_human_support"],
      resourceIds: ["in.nmba.14446", "in.telemanas.14416"],
      modelMayPersonalize: true,
    };
  }

  return {
    tier: "coping",
    reasonCode: "no_explicit_danger",
    actionIds: ["move_to_safer_context", "contact_trusted_person"],
    resourceIds: ["in.nmba.14446"],
    modelMayPersonalize: true,
  };
}

const SIGNAL_LABELS: Record<ObservableSignalId, string> = {
  not_responding: "not responding or cannot be awakened",
  abnormal_breathing: "not breathing normally",
  seizure: "having a seizure",
  collapsed: "collapsed",
  immediate_self_harm: "at immediate risk of serious self-harm",
  immediate_danger: "in immediate physical danger",
  caregiver_unsafe: "in a situation where the supporter is not safe",
  not_sure: "showing signs that may be an emergency",
};

/** Builds a dispatcher script from confirmed observable facts only. */
export function buildEmergencyScript(
  signalIds: readonly ObservableSignalId[],
): string {
  const facts = [...new Set(signalIds)]
    .map((signalId) => SIGNAL_LABELS[signalId])
    .filter((label): label is string => Boolean(label));
  const observation =
    facts.length > 0
      ? facts.join(" and ")
      : "showing signs that may be an emergency";

  return `A person is ${observation}. Our location is unknown until I state it. Please send emergency assistance. I will follow the dispatcher's instructions.`;
}

/** Returns true when a normal-support request must be rejected server-side. */
export function containsEmergencySignal(
  signalIds: readonly ObservableSignalId[],
): boolean {
  return signalIds.some((signalId) => EMERGENCY_SIGNALS.has(signalId));
}
