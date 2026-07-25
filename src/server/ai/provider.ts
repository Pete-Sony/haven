import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import {
  interventionArtifactSchema,
  normalizedFactsSchema,
  type InterventionResult,
  type NormalizedFacts,
  type SafetyDecision,
  type SafetyInput,
} from "@/domain/contracts";
import { ACTION_IDS } from "@/domain/actions";
import type { RagContext } from "@/domain/rag";
import { CONTENT_VERSION } from "@/domain/resources";
import {
  buildInterventionPayload,
  buildInterventionSystemInstruction,
  INTERVENTION_PROMPT_VERSION,
} from "@/server/ai/prompts";
import { validateIntervention } from "@/server/ai/validation";
import { rejectGeneratedTexts } from "@/server/ai/guardrails";

const MODEL = "gemini-3.6-flash";
const TIMEOUT_MS = 7_000;

export function selectInterventionSourceIds(
  ragContext: RagContext,
): readonly string[] {
  return [ragContext.educational.sourceId];
}

const factsJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    explicitFacts: {
      type: "array",
      maxItems: 6,
      items: { type: "string", maxLength: 160 },
    },
    unknownFacts: {
      type: "array",
      maxItems: 6,
      items: { type: "string", maxLength: 100 },
    },
    safetyConfirmationSignalIds: {
      type: "array",
      maxItems: 4,
      items: {
        type: "string",
        enum: [
          "not_responding",
          "abnormal_breathing",
          "seizure",
          "collapsed",
          "immediate_self_harm",
          "immediate_danger",
          "caregiver_unsafe",
          "not_sure",
          "self_harm_thoughts",
        ],
      },
    },
  },
  required: ["explicitFacts", "unknownFacts", "safetyConfirmationSignalIds"],
} as const;

const interventionJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    schemaVersion: { type: "string", enum: ["1.0"] },
    headline: { type: "string", minLength: 3, maxLength: 100 },
    steps: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          actionId: { type: "string", enum: ACTION_IDS },
        },
        required: ["actionId"],
      },
    },
    spokenSummary: { type: "string", minLength: 3, maxLength: 240 },
    verbatimScript: { type: "string", minLength: 3, maxLength: 280 },
    supportMessageDraft: { type: "string", minLength: 3, maxLength: 360 },
    sourceIds: {
      type: "array",
      minItems: 1,
      maxItems: 2,
      items: { type: "string", maxLength: 100 },
    },
    unknownFacts: {
      type: "array",
      maxItems: 6,
      items: { type: "string", maxLength: 100 },
    },
  },
  required: [
    "schemaVersion",
    "headline",
    "steps",
    "spokenSummary",
    "verbatimScript",
    "supportMessageDraft",
    "sourceIds",
    "unknownFacts",
  ],
} as const;

const generatedArtifactSchema = z
  .object({
    facts: normalizedFactsSchema,
    intervention: interventionArtifactSchema.nullable(),
  })
  .strict();

export interface GeneratedArtifact {
  readonly facts: NormalizedFacts;
  readonly intervention: InterventionResult | null;
}

/**
 * Makes one bounded model call. With audio, the same response extracts
 * explicit facts and composes the intervention; without audio, facts are empty.
 */
export async function generateIntervention(
  input: SafetyInput,
  decision: SafetyDecision,
  audio?: { readonly bytes: Uint8Array; readonly mimeType: string },
  suppliedRagContext?: RagContext,
): Promise<GeneratedArtifact> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("provider_not_configured");
  if (!suppliedRagContext) throw new Error("rag_context_required");
  const ragContext = suppliedRagContext;
  const client = new GoogleGenAI({ apiKey });
  const payload = buildInterventionPayload(input, decision, ragContext);
  const contents = audio
    ? [
        {
          role: "user",
          parts: [
            { text: payload },
            {
              inlineData: {
                data: Buffer.from(audio.bytes).toString("base64"),
                mimeType: audio.mimeType,
              },
            },
          ],
        },
      ]
    : payload;
  const generated = await client.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction: buildInterventionSystemInstruction(Boolean(audio)),
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          facts: factsJsonSchema,
          intervention: {
            anyOf: [interventionJsonSchema, { type: "null" }],
          },
        },
        required: ["facts", "intervention"],
      },
    },
  });
  if (!generated.text) throw new Error("empty_provider_response");
  const candidate = generatedArtifactSchema.parse(JSON.parse(generated.text));
  if (
    !audio &&
    (candidate.facts.explicitFacts.length > 0 ||
      candidate.facts.unknownFacts.length > 0 ||
      candidate.facts.safetyConfirmationSignalIds.length > 0)
  ) {
    throw new Error("facts_without_audio");
  }
  if (candidate.facts.safetyConfirmationSignalIds.length > 0) {
    if (candidate.intervention !== null) {
      throw new Error("danger_signal_with_coping_artifact");
    }
    return { facts: candidate.facts, intervention: null };
  }
  if (!candidate.intervention) {
    throw new Error("missing_intervention");
  }
  const generatedTextRejection = rejectGeneratedTexts([
    ...candidate.facts.explicitFacts,
    ...candidate.facts.unknownFacts,
    ...candidate.intervention.unknownFacts,
  ]);
  if (generatedTextRejection) throw new Error(generatedTextRejection);
  const validation = validateIntervention(
    candidate.intervention,
    decision,
    selectInterventionSourceIds(ragContext),
    {
      input,
      educationalClaim: ragContext.educational.allowedClaim,
      provider: MODEL,
      promptVersion: INTERVENTION_PROMPT_VERSION,
      contentVersion: CONTENT_VERSION,
    },
  );
  if (!validation.success || !validation.result) {
    throw new Error(validation.reason ?? "provider_output_rejected");
  }
  return { facts: candidate.facts, intervention: validation.result };
}
