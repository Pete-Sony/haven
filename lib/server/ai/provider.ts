import { GoogleGenAI } from "@google/genai";
import type { ZodType } from "zod";
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
  buildComposerPrompt,
  buildInterpreterPrompt,
  COMPOSER_PROMPT_VERSION,
} from "@/lib/server/ai/prompts";
import { validateIntervention } from "@/lib/server/ai/validation";

const MODEL = "gemini-3.6-flash";
const TIMEOUT_MS = 7_000;

const interpreterJsonSchema = {
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
    promptVersion: { type: "string", enum: [COMPOSER_PROMPT_VERSION] },
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

async function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>) {
  return operation(AbortSignal.timeout(TIMEOUT_MS));
}

function parseJson<T>(text: string | undefined, schema: ZodType<T>): T {
  if (!text) throw new Error("empty_provider_response");
  return schema.parse(JSON.parse(text));
}

export async function generateIntervention(
  input: SafetyInput,
  decision: SafetyDecision,
  audio?: { readonly bytes: Uint8Array; readonly mimeType: string },
): Promise<InterventionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("provider_not_configured");
  const client = new GoogleGenAI({ apiKey });

  let facts: NormalizedFacts = {
    explicitFacts: [],
    unknownFacts: [],
    safetyConfirmationSignalIds: [],
  };
  if (audio) {
    const interpreted = await withTimeout((signal) =>
      client.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { text: buildInterpreterPrompt(input) },
              {
                inlineData: {
                  data: Buffer.from(audio.bytes).toString("base64"),
                  mimeType: audio.mimeType,
                },
              },
            ],
          },
        ],
        config: {
          abortSignal: signal,
          responseMimeType: "application/json",
          responseJsonSchema: interpreterJsonSchema,
        },
      }),
    );
    facts = parseJson(interpreted.text, normalizedFactsSchema);
  }

  const generated = await withTimeout((signal) =>
    client.models.generateContent({
      model: MODEL,
      contents: buildComposerPrompt(input, decision, facts),
      config: {
        abortSignal: signal,
        responseMimeType: "application/json",
        responseJsonSchema: interventionJsonSchema,
      },
    }),
  );
  const candidate = parseJson(generated.text, interventionResultSchema);
  const validation = validateIntervention(candidate, decision);
  if (!validation.success || !validation.result) {
    throw new Error(validation.reason ?? "provider_output_rejected");
  }
  return validation.result;
}
