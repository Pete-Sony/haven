import { NextResponse } from "next/server";
import {
  companionRequestContextSchema,
  createCompanionFallback,
  detectExplicitEmergencySignals,
  MAX_COMPANION_AUDIO_BYTES,
  MAX_COMPANION_TURNS,
  type CompanionTurnResponse,
} from "@/lib/domain/companion";
import type { ObservableSignalId, SafetyInput } from "@/lib/domain/contracts";
import {
  buildEmergencyScript,
  mergeVoiceSafetySignals,
  routeSafety,
} from "@/lib/domain/safety";
import {
  generateCompanionTurn,
  type CompanionAudio,
} from "@/lib/server/ai/companion";
import { isExpectedOrigin } from "@/lib/server/auth";
import { consumeInterventionBudget } from "@/lib/server/rate-limit";
import { createSupabaseServerClient } from "@/lib/server/supabase";

export const runtime = "nodejs";

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/aac",
  "audio/flac",
]);

function privateJson(body: unknown, status = 200): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function emergencyResponse(
  transcript: string,
  signalIds: readonly ObservableSignalId[],
  remainingTurns: number,
): CompanionTurnResponse {
  const baseInput: SafetyInput = {
    schemaVersion: "1.0",
    role: "individual",
    situationIds: ["emotional_distress"],
    observableSignalIds: [],
    intensityBand: "strong",
    goalId: "get_through_minute",
    tone: "warm",
    language: "en-IN",
    jurisdiction: { country: "IN" },
    isAlone: false,
  };
  const checkedInput = mergeVoiceSafetySignals(baseInput, signalIds);
  const decision = routeSafety(checkedInput);
  if (decision.tier !== "emergency") {
    throw new Error("invalid_emergency_signal");
  }
  return {
    emergency: true,
    transcript,
    reply: null,
    safetySignalIds: [...signalIds],
    emergencyScript: buildEmergencyScript(checkedInput.observableSignalIds),
    remainingTurns,
    provider: "deterministic",
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isExpectedOrigin(request)) {
    return privateJson({ error: "invalid_origin" }, 403);
  }

  const supabase = await createSupabaseServerClient();
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!data.user) {
    return privateJson({ error: "unauthorized" }, 401);
  }

  try {
    const form = await request.formData();
    const rawContext = form.get("context");
    if (typeof rawContext !== "string" || rawContext.length > 6_000) {
      return privateJson({ error: "invalid_request" }, 400);
    }
    const context = companionRequestContextSchema.parse(JSON.parse(rawContext));
    const usedTurns = context.history.length + 1;
    if (usedTurns > MAX_COMPANION_TURNS) {
      return privateJson({ error: "session_complete" }, 409);
    }
    const remainingTurns = MAX_COMPANION_TURNS - usedTurns;

    const audioPart = form.get("audio");
    let audio: CompanionAudio | undefined;
    if (audioPart instanceof File && audioPart.size > 0) {
      const mimeType = audioPart.type.split(";", 1)[0]?.trim().toLowerCase();
      if (
        !mimeType ||
        !ALLOWED_AUDIO_TYPES.has(mimeType) ||
        audioPart.size > MAX_COMPANION_AUDIO_BYTES
      ) {
        return privateJson({ error: "invalid_audio" }, 400);
      }
      audio = {
        bytes: new Uint8Array(await audioPart.arrayBuffer()),
        mimeType,
      };
    }
    if (Boolean(context.text) === Boolean(audio)) {
      return privateJson({ error: "provide_exactly_one_input" }, 400);
    }

    if (context.text) {
      const explicitSignals = detectExplicitEmergencySignals(context.text);
      if (explicitSignals.length > 0) {
        return privateJson(
          emergencyResponse(context.text, explicitSignals, remainingTurns),
        );
      }
    }

    const budget = await consumeInterventionBudget(request, Boolean(audio));
    if (!budget.allowed) {
      const response = privateJson({ error: "rate_limited" }, 429);
      response.headers.set("Retry-After", String(budget.retryAfterSeconds));
      return response;
    }

    try {
      const artifact = await generateCompanionTurn(context, audio);
      if (artifact.safetyConfirmationSignalIds.length > 0) {
        if (!artifact.transcript) throw new Error("missing_danger_transcript");
        return privateJson(
          emergencyResponse(
            artifact.transcript,
            artifact.safetyConfirmationSignalIds,
            remainingTurns,
          ),
        );
      }
      if (!artifact.reply) throw new Error("missing_reply");
      const response: CompanionTurnResponse = {
        emergency: false,
        transcript: artifact.transcript ?? context.text ?? null,
        reply: artifact.reply,
        safetySignalIds: [],
        remainingTurns,
        provider: "gemini-3.6-flash",
      };
      return privateJson(response);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "provider_error";
      return privateJson(
        createCompanionFallback(context.text ?? null, remainingTurns, reason),
      );
    }
  } catch {
    return privateJson({ error: "invalid_request" }, 400);
  }
}
