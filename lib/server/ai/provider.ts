import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import {
  interventionResultSchema,
  normalizedFactsSchema,
  type InterventionResult,
  type NormalizedFacts,
  type SafetyDecision,
  type SafetyInput,
} from "@/lib/domain/contracts";
import { CONTENT_VERSION } from "@/lib/domain/resources";
import {
  buildInterventionPrompt,
  INTERVENTION_PROMPT_VERSION,
} from "@/lib/server/ai/prompts";
import { validateIntervention } from "@/lib/server/ai/validation";

const MODEL = "gemini-3.6-flash";
const TIMEOUT_MS = 7_000;

export function selectInterventionSourceIds(
  input: SafetyInput,
): readonly string[] {
  return [
    input.role === "caregiver"
      ? "haven.caregiver-talk.v1"
      : "haven.craving-support.v1",
  ];
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
          actionId: { type: "string", maxLength: 80 },
          label: { type: "string", minLength: 3, maxLength: 140 },
        },
        required: ["actionId", "label"],
      },
    },
    spokenSummary: { type: "string", minLength: 3, maxLength: 240 },
    verbatimScript: { type: "string", minLength: 3, maxLength: 280 },
    supportMessageDraft: { type: "string", minLength: 3, maxLength: 360 },
    mindsetReframe: { type: "string", minLength: 3, maxLength: 240 },
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
    provider: { type: "string", enum: [MODEL] },
    promptVersion: { type: "string", enum: [INTERVENTION_PROMPT_VERSION] },
    contentVersion: { type: "string", enum: [CONTENT_VERSION] },
  },
  required: [
    "schemaVersion",
    "headline",
    "steps",
    "spokenSummary",
    "verbatimScript",
    "supportMessageDraft",
    "mindsetReframe",
    "sourceIds",
    "unknownFacts",
    "provider",
    "promptVersion",
    "contentVersion",
  ],
} as const;

const generatedArtifactSchema = z
  .object({
    facts: normalizedFactsSchema,
    intervention: interventionResultSchema.nullable(),
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
): Promise<GeneratedArtifact> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("provider_not_configured");
  const client = new GoogleGenAI({ apiKey });
  const prompt = buildInterventionPrompt(input, decision, Boolean(audio));
  const contents = audio
    ? [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: Buffer.from(audio.bytes).toString("base64"),
                mimeType: audio.mimeType,
              },
            },
          ],
        },
      ]
    : prompt;
  const generated = await client.models.generateContent({
    model: MODEL,
    contents,
    config: {
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
  if (candidate.facts.safetyConfirmationSignalIds.length > 0) {
    if (candidate.intervention !== null) {
      throw new Error("danger_signal_with_coping_artifact");
    }
    return { facts: candidate.facts, intervention: null };
  }
  if (!candidate.intervention) {
    throw new Error("missing_intervention");
  }
  const validation = validateIntervention(
    candidate.intervention,
    decision,
    selectInterventionSourceIds(input),
  );
  if (!validation.success || !validation.result) {
    throw new Error(validation.reason ?? "provider_output_rejected");
  }
  return { facts: candidate.facts, intervention: validation.result };
}
