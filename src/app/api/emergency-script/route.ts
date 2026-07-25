import { NextResponse } from "next/server";
import { safetyInputSchema } from "@/domain/contracts";
import { buildEmergencyScript, routeSafety } from "@/domain/safety";
import { personalizeEmergencyScript } from "@/server/ai/emergency";
import { EMERGENCY_PROMPT_VERSION } from "@/server/ai/emergency";
import { privateJson, readBoundedJson, requireSameOrigin } from "@/server/http";
import { consumeInterventionBudget } from "@/server/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  if (!requireSameOrigin(request)) {
    return privateJson({ error: "invalid_origin" }, 403);
  }

  try {
    const input = safetyInputSchema.parse(
      await readBoundedJson(request, 4_096),
    );
    const decision = routeSafety(input);
    if (decision.tier !== "emergency") {
      return privateJson({ error: "emergency_route_required" }, 409);
    }
    const fallback = {
      script: buildEmergencyScript(input.observableSignalIds),
      provider: "deterministic" as const,
      promptVersion: EMERGENCY_PROMPT_VERSION,
    };
    const budget = await consumeInterventionBudget(request, false);
    if (!budget.allowed) return privateJson(fallback);

    try {
      return privateJson(await personalizeEmergencyScript(input));
    } catch {
      return privateJson(fallback);
    }
  } catch {
    return privateJson({ error: "invalid_request" }, 400);
  }
}
