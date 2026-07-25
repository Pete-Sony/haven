import { NextResponse } from "next/server";
import { safetyInputSchema } from "@/domain/contracts";
import { createFallback } from "@/domain/fallback";
import { retrieveRagContext } from "@/domain/rag";
import {
  buildEmergencyScript,
  mergeVoiceSafetySignals,
  routeSafety,
} from "@/domain/safety";
import { generateIntervention } from "@/server/ai/provider";
import { privateJson, requireSameOrigin } from "@/server/http";
import { consumeInterventionBudget } from "@/server/rate-limit";
import { loadPersonalSupportMemories } from "@/server/rag";
import { readBoundedFormData } from "@/server/request-security";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 1_000_000;
const MAX_FORM_BYTES = MAX_AUDIO_BYTES + 16_384;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
]);

export async function POST(request: Request): Promise<NextResponse> {
  if (!requireSameOrigin(request)) {
    return privateJson({ error: "invalid_origin" }, 403);
  }

  try {
    const form = await readBoundedFormData(request, MAX_FORM_BYTES);
    const rawInput = form.get("input");
    if (typeof rawInput !== "string" || rawInput.length > 8_000) {
      return privateJson({ error: "invalid_request" }, 400);
    }
    const input = safetyInputSchema.parse(JSON.parse(rawInput));
    const decision = routeSafety(input);
    if (decision.tier === "emergency") {
      return privateJson({ error: "emergency_route_required" }, 409);
    }

    const audioPart = form.get("audio");
    let audio:
      { readonly bytes: Uint8Array; readonly mimeType: string } | undefined;
    if (audioPart instanceof File && audioPart.size > 0) {
      if (
        audioPart.size > MAX_AUDIO_BYTES ||
        !ALLOWED_AUDIO_TYPES.has(audioPart.type)
      ) {
        return privateJson({ error: "invalid_audio" }, 400);
      }
      audio = {
        bytes: new Uint8Array(await audioPart.arrayBuffer()),
        mimeType: audioPart.type,
      };
    }

    const budget = await consumeInterventionBudget(request, Boolean(audio));
    if (!budget.allowed) {
      const response = privateJson(
        {
          error: "rate_limited",
          message:
            "Haven has paused live personalization for this device. The reviewed tap-only support path remains available.",
        },
        429,
      );
      response.headers.set("Retry-After", String(budget.retryAfterSeconds));
      response.headers.set("X-RateLimit-Remaining", String(budget.remaining));
      return response;
    }

    try {
      const personalMemories = await loadPersonalSupportMemories();
      const rag = retrieveRagContext(input, decision, personalMemories);
      if (rag.status === "emergency_bypass") {
        return privateJson({ error: "emergency_route_required" }, 409);
      }
      if (rag.status === "grounding_unavailable") {
        return privateJson({
          decision,
          result: createFallback(input, decision, rag.reason),
          ragStatus: rag.status,
        });
      }
      const generated = await generateIntervention(
        input,
        decision,
        audio,
        rag.context,
      );
      const safetyCheckedInput = mergeVoiceSafetySignals(
        input,
        generated.facts.safetyConfirmationSignalIds,
      );
      const voiceCheckedDecision = routeSafety(safetyCheckedInput);
      if (voiceCheckedDecision.tier === "emergency") {
        return privateJson({
          decision: voiceCheckedDecision,
          result: null,
          voiceSafetySignalIds: generated.facts.safetyConfirmationSignalIds,
          emergencyScript: buildEmergencyScript(
            safetyCheckedInput.observableSignalIds,
          ),
        });
      }
      if (generated.facts.safetyConfirmationSignalIds.length > 0) {
        return privateJson({
          decision: voiceCheckedDecision,
          result: createFallback(
            safetyCheckedInput,
            voiceCheckedDecision,
            "voice_safety_recheck",
          ),
          voiceSafetySignalIds: generated.facts.safetyConfirmationSignalIds,
          personalMemoryUsed: false,
          ragStatus: rag.status,
        });
      }
      if (!generated.intervention) {
        throw new Error("missing_intervention");
      }
      return privateJson({
        decision: voiceCheckedDecision,
        result: generated.intervention,
        voiceSafetySignalIds: generated.facts.safetyConfirmationSignalIds,
        personalMemoryUsed: rag.context.personal.length > 0,
        ragStatus: rag.status,
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message.slice(0, 100) : "provider_error";
      return privateJson({
        decision,
        result: createFallback(input, decision, reason),
      });
    }
  } catch {
    return privateJson({ error: "invalid_request" }, 400);
  }
}
