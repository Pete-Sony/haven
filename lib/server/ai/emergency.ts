import { GoogleGenAI } from "@google/genai";
import type { SafetyInput } from "@/lib/domain/contracts";
import { buildEmergencyScript } from "@/lib/domain/safety";

const MODEL = "gemini-3.6-flash";
const PROHIBITED =
  /\b(diagnos|dos(?:e|age)|taper|detox|you are safe|guarantee|medication)\b/i;

function validPersonalizedScript(candidate: unknown): candidate is string {
  return (
    typeof candidate === "string" &&
    candidate.length >= 30 &&
    candidate.length <= 360 &&
    /location/i.test(candidate) &&
    /emergency assistance/i.test(candidate) &&
    !PROHIBITED.test(candidate)
  );
}

/**
 * Personalizes wording only after application code has rendered the fixed 112
 * action. It cannot alter the route or introduce medical instructions.
 */
export async function personalizeEmergencyScript(
  input: SafetyInput,
): Promise<{ readonly script: string; readonly provider: typeof MODEL }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("provider_not_configured");
  const base = buildEmergencyScript(input.observableSignalIds);
  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model: MODEL,
    contents: [
      "Personalize this emergency-dispatcher script using only the confirmed observations already in it.",
      `Role: ${input.role}. Requested tone: ${input.tone}.`,
      `Fixed base script: ${base}`,
      "Keep the request for emergency assistance and the explicit unknown location.",
      "Do not add a diagnosis, substance, treatment, medication, first-aid instruction, or claim that help is coming.",
    ].join("\n"),
    config: {
      abortSignal: AbortSignal.timeout(4_000),
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          script: { type: "string", minLength: 30, maxLength: 360 },
        },
        required: ["script"],
      },
    },
  });
  if (!response.text) throw new Error("empty_provider_response");
  const parsed = JSON.parse(response.text) as { script?: unknown };
  if (!validPersonalizedScript(parsed.script)) {
    throw new Error("provider_output_rejected");
  }
  return { script: parsed.script, provider: MODEL };
}
