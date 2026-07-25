import test from "node:test";
import assert from "node:assert/strict";
import { buildEmergencyScript, createFallback, routeSafety } from "../src/lib/safety.js";

test("explicit observable danger always routes to emergency", () => {
  const decision = routeSafety({
    signalIds: ["not_responding"],
    intensity: 2,
    alone: false,
  });
  assert.equal(decision.tier, "emergency");
  assert.equal(decision.modelMayPersonalize, false);
  assert.deepEqual(decision.resourceIds, ["in.erss.112"]);
});

test("strong craving while alone routes to timely human support", () => {
  const decision = routeSafety({ signalIds: [], intensity: 9, alone: true });
  assert.equal(decision.tier, "urgent_support");
  assert.equal(decision.modelMayPersonalize, true);
});

test("normal support remains on the coping route", () => {
  const decision = routeSafety({ signalIds: [], intensity: 6, alone: false });
  assert.equal(decision.tier, "coping");
});

test("emergency script uses only selected observable facts", () => {
  const script = buildEmergencyScript(["not_responding", "abnormal_breathing"]);
  assert.match(script, /not responding/);
  assert.match(script, /not breathing normally/);
  assert.match(script, /\[say your location\]/);
  assert.doesNotMatch(script, /overdose|substance|diagnosis/i);
});

test("fallback is stable and never claims external delivery", () => {
  const input = {
    role: "individual",
    situation: "social_pressure",
    intensity: 9,
    tone: "direct",
  };
  const decision = routeSafety(input);
  const first = createFallback(input, decision);
  const second = createFallback(input, decision);
  assert.deepEqual(first, second);
  assert.equal(first.demoMode, true);
  assert.doesNotMatch(JSON.stringify(first), /\bsent\b|\bdelivered\b/i);
});
