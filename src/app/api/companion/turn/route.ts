import { NextResponse } from "next/server";
import { getActionLabel } from "@/domain/actions";
import {
  companionRequestContextSchema,
  createCompanionFallback,
  detectExplicitEmergencySignals,
  MAX_COMPANION_AUDIO_BYTES,
  MAX_COMPANION_TURNS,
  type CompanionTurnResponse,
} from "@/domain/companion";
import type { ObservableSignalId, SafetyInput } from "@/domain/contracts";
import {
  buildEmergencyScript,
  mergeVoiceSafetySignals,
  routeSafety,
} from "@/domain/safety";
import {
  COMPANION_PROMPT_VERSION,
  generateCompanionTurn,
  type CompanionAudio,
} from "@/server/ai/companion";
import { isExpectedOrigin, requireCompletedAccount } from "@/server/auth";
import { consumeInterventionBudget } from "@/server/rate-limit";
import { readBoundedFormData } from "@/server/request-security";

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
const MAX_FORM_BYTES = MAX_COMPANION_AUDIO_BYTES + 16_384;

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
    promptVersion: COMPANION_PROMPT_VERSION,
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isExpectedOrigin(request)) {
    return privateJson({ error: "invalid_origin" }, 403);
  }

  try {
    const form = await readBoundedFormData(request, MAX_FORM_BYTES);
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

    const access = await requireCompletedAccount();
    if (access.status !== "ready") {
      return privateJson(
        {
          error:
            access.status === "unauthenticated"
              ? "unauthorized"
              : "onboarding_required",
        },
        access.status === "unauthenticated" ? 401 : 403,
      );
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
      const reply = artifact.reply.actionId
        ? {
            ...artifact.reply,
            text: getActionLabel(artifact.reply.actionId),
          }
        : artifact.reply;
      const response: CompanionTurnResponse = {
        emergency: false,
        transcript: artifact.transcript ?? context.text ?? null,
        reply,
        safetySignalIds: [],
        remainingTurns,
        provider: "gemini-3.6-flash",
        promptVersion: COMPANION_PROMPT_VERSION,
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
