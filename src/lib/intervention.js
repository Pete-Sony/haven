import { createFallback, routeSafety } from "./safety.js";

export async function requestIntervention(input) {
  const decision = routeSafety(input);
  if (decision.tier === "emergency") {
    return { decision, result: null };
  }

  const fallback = createFallback(input, decision);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 6500);

  try {
    const response = await fetch("/api/intervention", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, decision }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const payload = await response.json();
    return { decision, result: payload.result || fallback };
  } catch {
    return { decision, result: fallback };
  } finally {
    window.clearTimeout(timeout);
  }
}
