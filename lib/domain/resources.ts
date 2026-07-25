import type { RiskTier } from "@/lib/domain/contracts";

export interface ResourceRecord {
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly jurisdiction: "IN" | "IN-KL";
  readonly tiers: readonly RiskTier[];
  readonly phone: string | null;
  readonly alternatePhone?: string;
  readonly ctaKind: "call" | "open_directory";
  readonly sourceUrl: string;
  readonly serviceScope: string;
  readonly lastVerified: string;
  readonly recheckAt: string;
  readonly enabled: boolean;
}

export const CONTENT_VERSION = "2026-07-25";

export const RESOURCE_REGISTRY: Readonly<Record<string, ResourceRecord>> = {
  "in.erss.112": {
    id: "in.erss.112",
    name: "Emergency Response Support System",
    shortName: "Emergency help",
    jurisdiction: "IN",
    tiers: ["emergency"],
    phone: "112",
    ctaKind: "call",
    sourceUrl: "https://112.gov.in/about",
    serviceScope:
      "India's unified emergency response number for police, fire and rescue, health, and other emergencies.",
    lastVerified: "2026-07-25",
    recheckAt: "2026-08-25",
    enabled: true,
  },
  "in.nmba.14446": {
    id: "in.nmba.14446",
    name: "Nasha Mukt Bharat Abhiyaan",
    shortName: "Drug de-addiction helpline",
    jurisdiction: "IN",
    tiers: ["urgent_support", "coping"],
    phone: "14446",
    ctaKind: "call",
    sourceUrl: "https://nmba.dosje.gov.in/index.php/toll-free",
    serviceScope:
      "National toll-free counselling, information, and referral support for substance use.",
    lastVerified: "2026-07-25",
    recheckAt: "2026-08-25",
    enabled: true,
  },
  "in.telemanas.14416": {
    id: "in.telemanas.14416",
    name: "Tele-MANAS",
    shortName: "Mental health support",
    jurisdiction: "IN",
    tiers: ["urgent_support", "coping"],
    phone: "14416",
    alternatePhone: "1800-89-14416",
    ctaKind: "call",
    sourceUrl: "https://dghs.mohfw.gov.in/national-mental-health-programme.php",
    serviceScope:
      "National 24x7 tele-mental-health access across Indian states and union territories.",
    lastVerified: "2026-07-25",
    recheckAt: "2026-08-25",
    enabled: true,
  },
  "in.kl.disha.1056": {
    id: "in.kl.disha.1056",
    name: "DISHA Kerala",
    shortName: "Kerala health helpline",
    jurisdiction: "IN-KL",
    tiers: ["urgent_support", "coping"],
    phone: "1056",
    alternatePhone: "0471-2552056",
    ctaKind: "call",
    sourceUrl: "https://health.kerala.gov.in/Disha",
    serviceScope:
      "Kerala's statewide health helpline, including de-addiction and mental-stress counselling.",
    lastVerified: "2026-07-25",
    recheckAt: "2026-08-25",
    enabled: true,
  },
  "in.kl.vimukthi.directory": {
    id: "in.kl.vimukthi.directory",
    name: "Vimukthi centre directory",
    shortName: "Kerala centre directory",
    jurisdiction: "IN-KL",
    tiers: ["urgent_support", "coping"],
    phone: null,
    ctaKind: "open_directory",
    sourceUrl: "https://keralaexcise.gov.in/en/vimukthi-3/",
    serviceScope:
      "Official directory of Kerala de-addiction and counselling centres.",
    lastVerified: "2026-07-25",
    recheckAt: "2026-08-25",
    enabled: true,
  },
};

export function resolveResources(
  resourceIds: readonly string[],
): ResourceRecord[] {
  return resourceIds.flatMap((resourceId) => {
    const resource = RESOURCE_REGISTRY[resourceId];
    return resource?.enabled ? [resource] : [];
  });
}

export function areResourceIdsAllowed(
  resourceIds: readonly string[],
  tier: RiskTier,
): boolean {
  return (
    resourceIds.length > 0 &&
    resourceIds.every((resourceId) => {
      const resource = RESOURCE_REGISTRY[resourceId];
      return Boolean(resource?.enabled && resource.tiers.includes(tier));
    })
  );
}

export const APPROVED_CLAIMS = {
  "haven.craving-support.v1": {
    sourceId: "haven.craving-support.v1",
    allowedClaim:
      "Moving away from a trigger and contacting a trusted person can create space for the next decision.",
    title: "Treatment and Recovery",
    organization: "National Institute on Drug Abuse",
    url: "https://nida.nih.gov/publications/drugs-brains-behavior-science-addiction/treatment-recovery",
  },
  "haven.caregiver-talk.v1": {
    sourceId: "haven.caregiver-talk.v1",
    allowedClaim:
      "Listening without judgment and offering a small choice can support a calmer conversation.",
    title: "How to Talk to Someone About Help",
    organization: "SAMHSA",
    url: "https://www.samhsa.gov/find-support/helping-someone/how-to-talk-to-someone-about-help",
  },
} as const;

export type ApprovedClaimId = keyof typeof APPROVED_CLAIMS;
