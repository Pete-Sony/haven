export const EMERGENCY_SIGNALS = new Set([
  "not_responding",
  "abnormal_breathing",
  "seizure",
  "collapsed",
  "immediate_danger",
]);

export const URGENT_SIGNALS = new Set([
  "strong_craving_alone",
  "recent_use",
  "self_harm_thoughts",
  "severe_confusion",
  "withdrawal_concern",
]);

export function routeSafety({ signalIds = [], intensity = 0, alone = false } = {}) {
  const normalized = [...new Set(signalIds.filter(Boolean))];

  if (normalized.some((signal) => EMERGENCY_SIGNALS.has(signal))) {
    return {
      tier: "emergency",
      reasonCode: "explicit_observable_danger",
      modelMayPersonalize: false,
      resourceIds: ["in.erss.112"],
    };
  }

  if (
    normalized.some((signal) => URGENT_SIGNALS.has(signal)) ||
    (Number(intensity) >= 8 && alone)
  ) {
    return {
      tier: "urgent_support",
      reasonCode: "timely_human_support",
      modelMayPersonalize: true,
      resourceIds: ["in.nmba.14446", "in.telemanas.14416"],
    };
  }

  return {
    tier: "coping",
    reasonCode: "no_explicit_danger_signal",
    modelMayPersonalize: true,
    resourceIds: ["in.nmba.14446"],
  };
}

const individualScripts = {
  social_pressure: {
    direct: "No, I’m leaving now. Please don’t ask me again.",
    gentle: "I’m not comfortable with this, so I’m heading out. Thanks for understanding.",
    calm: "I need some space, and I’m going to leave now. We can talk later.",
    action: "Move toward the exit or a trusted person before doing anything else.",
  },
  stress: {
    direct: "I’m overloaded. I need ten quiet minutes before I continue.",
    gentle: "I’m feeling overwhelmed and need a short pause. I’ll check back in soon.",
    calm: "I need a little space to settle. Please give me ten minutes.",
    action: "Step into a quieter space and put both feet on the floor.",
  },
  loneliness: {
    direct: "I’m having a hard moment. Can you stay on the phone with me for five minutes?",
    gentle: "I could use a familiar voice right now. Do you have five minutes?",
    calm: "I’m feeling alone and would value a brief check-in. Are you free?",
    action: "Move to a shared or well-lit space and contact one trusted person.",
  },
  pain: {
    direct: "I’m struggling with pain and need support using my existing care plan.",
    gentle: "My pain is difficult right now. Could you help me follow the plan I already have?",
    calm: "I need a pause and support with my usual care plan.",
    action: "Move away from access to substances and contact your existing care or support person.",
  },
};

export function createFallback(input, decision) {
  const isCaregiver = input.role === "caregiver";
  const situation = input.situation || "stress";
  const tone = input.tone || "calm";

  if (isCaregiver) {
    return {
      headline: "Stay present. Offer one small choice.",
      immediateAction:
        "Sit or stand at the same level, keep a clear exit, and ask what would help for the next five minutes.",
      verbatimScript:
        "I’m here with you. You do not have to explain everything. Would you like quiet company or help calling someone?",
      supportMessageDraft:
        "I’m supporting someone through a difficult moment. Could you stay available by phone while we decide the next safe step?",
      mindsetReframe:
        "Your job is grounded presence and safety—not diagnosing, controlling, or fixing the whole situation.",
      lessonId: "caregiverPresence",
      sourceIds: ["haven.caregiver-presence.v1"],
      provider: "reviewed_fallback",
      demoMode: true,
    };
  }

  const script = individualScripts[situation] || individualScripts.stress;
  const urgency =
    decision.tier === "urgent_support"
      ? "Bring another person into this moment now."
      : "Make the next minute smaller.";

  return {
    headline: urgency,
    immediateAction: script.action,
    verbatimScript: script[tone] || script.calm,
    supportMessageDraft:
      input.intensity >= 8
        ? "I’m having a strong craving and do not want advice—just a calm voice while I move somewhere safer. Can you call me now?"
        : "I’m having a difficult moment and using my support plan. Could you check in with me for five minutes?",
    mindsetReframe:
      "This moment deserves support, not shame. You only need to choose the next safe action.",
    lessonId: "cravingWave",
    sourceIds: ["haven.craving-wave.v1"],
    provider: "reviewed_fallback",
    demoMode: true,
  };
}

export function buildEmergencyScript(signals = []) {
  const observations = [];
  if (signals.includes("not_responding")) observations.push("not responding");
  if (signals.includes("abnormal_breathing")) observations.push("not breathing normally");
  if (signals.includes("seizure")) observations.push("having a seizure");
  if (signals.includes("collapsed")) observations.push("collapsed");
  if (signals.includes("immediate_danger")) observations.push("in immediate danger");

  const facts = observations.length ? observations.join(" and ") : "showing signs of an emergency";
  return `A person is ${facts}. Our location is [say your location]. Please send emergency assistance. I will follow the dispatcher's instructions.`;
}
