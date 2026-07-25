import { NextResponse } from "next/server";
import { safetyInputSchema } from "@/lib/domain/contracts";
import { buildEmergencyScript, routeSafety } from "@/lib/domain/safety";
import { personalizeEmergencyScript } from "@/lib/server/ai/emergency";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const input = safetyInputSchema.parse(await request.json());
    const decision = routeSafety(input);
    if (decision.tier !== "emergency") {
      return NextResponse.json(
        { error: "emergency_route_required" },
        { status: 409 },
      );
    }
    const fallback = {
      script: buildEmergencyScript(input.observableSignalIds),
      provider: "deterministic" as const,
    };
    try {
      return NextResponse.json(await personalizeEmergencyScript(input));
    } catch {
      return NextResponse.json(fallback);
    }
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
