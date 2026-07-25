export const ACTION_IDS = [
  "call_112",
  "dispatcher_script",
  "move_to_safer_context",
  "contact_trusted_person",
  "open_human_support",
  "use_existing_plan",
  "contact_professional",
  "keep_safe_distance",
] as const;

export type ActionId = (typeof ACTION_IDS)[number];

export const SUPPORT_MEMORY_ACTION_IDS = [
  "move_to_safer_context",
  "contact_trusted_person",
  "open_human_support",
] as const satisfies readonly ActionId[];
export type SupportMemoryActionId = (typeof SUPPORT_MEMORY_ACTION_IDS)[number];

interface ActionDefinition {
  readonly label: string;
  readonly caregiverLabel?: string;
  readonly supportMemoryEligible?: boolean;
}

/** Application-owned actions. Models may select an ID but cannot author labels. */
export const ACTION_REGISTRY = {
  call_112: {
    label: "Call 112 now.",
  },
  dispatcher_script: {
    label: "Read the dispatcher script.",
  },
  move_to_safer_context: {
    label: "Move away from the trigger and toward a safer, quieter place.",
    caregiverLabel: "Keep a clear exit and move to a safer position.",
    supportMemoryEligible: true,
  },
  contact_trusted_person: {
    label: "Contact one trusted person and ask for five minutes of company.",
    caregiverLabel: "Ask another trusted person to stay available by phone.",
    supportMemoryEligible: true,
  },
  open_human_support: {
    label: "Open immediate human support.",
    caregiverLabel:
      "Open human support for yourself or the person you support.",
    supportMemoryEligible: true,
  },
  use_existing_plan: {
    label: "Move away from substances and use your existing care plan.",
  },
  contact_professional: {
    label: "Contact qualified human support for guidance now.",
  },
  keep_safe_distance: {
    label: "Keep a clear exit and offer one small choice.",
    caregiverLabel: "Keep a clear exit and offer one small choice.",
  },
} as const satisfies Record<ActionId, ActionDefinition>;

export function getActionLabel(
  actionId: ActionId,
  role: "individual" | "caregiver" = "individual",
): string {
  const action: ActionDefinition = ACTION_REGISTRY[actionId];
  return role === "caregiver" && action.caregiverLabel
    ? action.caregiverLabel
    : action.label;
}

export function isSupportMemoryActionId(
  actionId: ActionId,
): actionId is SupportMemoryActionId {
  return SUPPORT_MEMORY_ACTION_IDS.includes(actionId as SupportMemoryActionId);
}
