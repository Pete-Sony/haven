import { z } from "zod";
import {
  situationIdSchema,
  type RiskTier,
  type SafetyDecision,
  type SafetyInput,
  type SituationId,
} from "@/lib/domain/contracts";
import { APPROVED_CLAIMS, type ApprovedClaimId } from "@/lib/domain/resources";

export const SUPPORT_MEMORY_LIMIT = 20;
export const SUPPORT_MEMORY_RETENTION_DAYS = 90;
export const MAX_RETRIEVED_SUPPORT_MEMORIES = 2;

export const supportMemoryActionIdSchema = z.enum([
  "move_to_safer_context",
  "contact_trusted_person",
  "open_human_support",
]);

export const supportMemoryInputSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    situationIds: z.array(situationIdSchema).min(1).max(3),
    actionId: supportMemoryActionIdSchema,
    helpfulness: z.enum(["helpful", "not_helpful"]),
  })
  .strict();
export type SupportMemoryInput = z.infer<typeof supportMemoryInputSchema>;

export const storedSupportMemorySchema = supportMemoryInputSchema
  .extend({
    consentVersion: z.literal("1.0"),
    savedAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
  })
  .strict();
export type StoredSupportMemory = z.infer<typeof storedSupportMemorySchema>;

export interface EducationalEvidence {
  readonly sourceId: ApprovedClaimId;
  readonly allowedClaim: string;
  readonly title: string;
  readonly organization: string;
  readonly url: string;
}

export interface PersonalSupportContext {
  readonly situationIds: readonly SituationId[];
  readonly actionId: z.infer<typeof supportMemoryActionIdSchema>;
  readonly helpfulness: SupportMemoryInput["helpfulness"];
}

export interface RagContext {
  readonly educational: EducationalEvidence;
  readonly personal: readonly PersonalSupportContext[];
}

function retrieveEducation(
  input: SafetyInput,
  decision: SafetyDecision,
  now: Date,
): EducationalEvidence {
  const evidence = Object.values(APPROVED_CLAIMS).find(
    (candidate) =>
      candidate.enabled &&
      (candidate.roles as readonly SafetyInput["role"][]).includes(
        input.role,
      ) &&
      (candidate.tiers as readonly Exclude<RiskTier, "emergency">[]).includes(
        decision.tier as Exclude<RiskTier, "emergency">,
      ) &&
      Date.parse(candidate.recheckAt) >= now.getTime(),
  );
  if (!evidence) throw new Error("educational_evidence_not_found");
  return evidence;
}

function memoryRelevance(
  memory: StoredSupportMemory,
  input: SafetyInput,
  decision: SafetyDecision,
): number {
  const situationMatches = memory.situationIds.filter((situationId) =>
    input.situationIds.includes(situationId),
  ).length;
  const actionAllowed = decision.actionIds.includes(memory.actionId);
  return situationMatches * 10 + (actionAllowed ? 3 : 0);
}

interface RankedMemory {
  readonly memory: StoredSupportMemory;
  readonly index: number;
  readonly relevance: number;
}

function isBetterMemory(
  candidate: RankedMemory,
  current: RankedMemory,
): boolean {
  return (
    candidate.relevance > current.relevance ||
    (candidate.relevance === current.relevance &&
      (Date.parse(candidate.memory.savedAt) >
        Date.parse(current.memory.savedAt) ||
        (candidate.memory.savedAt === current.memory.savedAt &&
          candidate.index < current.index)))
  );
}

function selectTopMemories(
  candidates: readonly RankedMemory[],
  limit: number,
  selected: readonly RankedMemory[] = [],
): readonly RankedMemory[] {
  if (selected.length >= limit || candidates.length === 0) return selected;
  const best = candidates.reduce((current, candidate) =>
    isBetterMemory(candidate, current) ? candidate : current,
  );
  return selectTopMemories(
    candidates.filter((candidate) => candidate.index !== best.index),
    limit,
    [...selected, best],
  );
}

/**
 * Builds the two-lane context after deterministic safety routing.
 * Personal memories can shape wording and ordering only; they never add an
 * action, source, fact, or safety decision.
 */
export function retrieveRagContext(
  input: SafetyInput,
  decision: SafetyDecision,
  memories: readonly StoredSupportMemory[],
  now = new Date(),
): RagContext | null {
  if (decision.tier === "emergency") return null;

  const educational = retrieveEducation(input, decision, now);
  const candidates =
    input.role === "individual"
      ? memories
          .filter(
            (memory) =>
              Date.parse(memory.expiresAt) > now.getTime() &&
              memory.situationIds.some((situationId) =>
                input.situationIds.includes(situationId),
              ) &&
              decision.actionIds.includes(memory.actionId),
          )
          .map((memory, index) => ({
            memory,
            index,
            relevance: memoryRelevance(memory, input, decision),
          }))
      : [];
  const personal = selectTopMemories(
    candidates,
    MAX_RETRIEVED_SUPPORT_MEMORIES,
  ).map(({ memory }) => ({
    situationIds: memory.situationIds,
    actionId: memory.actionId,
    helpfulness: memory.helpfulness,
  }));

  return { educational, personal };
}

export function createStoredSupportMemory(
  input: SupportMemoryInput,
  now = new Date(),
): StoredSupportMemory {
  const savedAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + SUPPORT_MEMORY_RETENTION_DAYS * 24 * 60 * 60 * 1_000,
  ).toISOString();
  return storedSupportMemorySchema.parse({
    ...input,
    consentVersion: "1.0",
    savedAt,
    expiresAt,
  });
}
