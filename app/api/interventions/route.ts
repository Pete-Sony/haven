import { NextResponse } from "next/server";
import { safetyInputSchema } from "@/lib/domain/contracts";
import { createFallback } from "@/lib/domain/fallback";
import {
  buildEmergencyScript,
  mergeVoiceSafetySignals,
  routeSafety,
} from "@/lib/domain/safety";
import { generateIntervention } from "@/lib/server/ai/provider";
import { consumeInterventionBudget } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 1_000_000;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
]);

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const form = await request.formData();
    const rawInput = form.get("input");
    if (typeof rawInput !== "string" || rawInput.length > 8_000) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const input = safetyInputSchema.parse(JSON.parse(rawInput));
    const decision = routeSafety(input);
    if (decision.tier === "emergency") {
      return NextResponse.json(
        { error: "emergency_route_required" },
        { status: 409 },
      );
    }

    const audioPart = form.get("audio");
    let audio:
      { readonly bytes: Uint8Array; readonly mimeType: string } | undefined;
    if (audioPart instanceof File && audioPart.size > 0) {
      if (
        audioPart.size > MAX_AUDIO_BYTES ||
        !ALLOWED_AUDIO_TYPES.has(audioPart.type)
      ) {
        return NextResponse.json({ error: "invalid_audio" }, { status: 400 });
      }
      audio = {
        bytes: new Uint8Array(await audioPart.arrayBuffer()),
        mimeType: audioPart.type,
      };
    }

    const budget = await consumeInterventionBudget(request, Boolean(audio));
    if (!budget.allowed) {
      return NextResponse.json(
        {
          error: "rate_limited",
          message:
            "Haven has paused live personalization for this device. The reviewed tap-only support path remains available.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(budget.retryAfterSeconds),
            "X-RateLimit-Remaining": String(budget.remaining),
          },
        },
      );
    }

    try {
      const generated = await generateIntervention(input, decision, audio);
      const safetyCheckedInput = mergeVoiceSafetySignals(
        input,
        generated.facts.safetyConfirmationSignalIds,
      );
      const voiceCheckedDecision = routeSafety(safetyCheckedInput);
      if (voiceCheckedDecision.tier === "emergency") {
        return NextResponse.json({
          decision: voiceCheckedDecision,
          result: null,
          voiceSafetySignalIds: generated.facts.safetyConfirmationSignalIds,
          emergencyScript: buildEmergencyScript(
            safetyCheckedInput.observableSignalIds,
          ),
        });
      }
      if (!generated.intervention) {
        throw new Error("missing_intervention");
      }
      return NextResponse.json({
        decision: voiceCheckedDecision,
        result: generated.intervention,
        voiceSafetySignalIds: generated.facts.safetyConfirmationSignalIds,
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message.slice(0, 100) : "provider_error";
      return NextResponse.json({
        decision,
        result: createFallback(input, decision, reason),
      });
    }
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
