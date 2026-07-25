import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  auth: 0,
  budget: 0,
  personalRag: 0,
  provider: 0,
  providerResult: null as unknown,
}));

vi.mock("@/server/supabase", () => ({
  createSupabaseServerClient: async () => {
    calls.auth += 1;
    return null;
  },
}));
vi.mock("@/server/rate-limit", () => ({
  consumeInterventionBudget: async () => {
    calls.budget += 1;
    return { allowed: true, retryAfterSeconds: 0, remaining: 10 };
  },
}));
vi.mock("@/server/rag", () => ({
  loadPersonalSupportMemories: async () => {
    calls.personalRag += 1;
    return [];
  },
}));
vi.mock("@/server/ai/provider", () => ({
  generateIntervention: async () => {
    calls.provider += 1;
    if (calls.providerResult !== null) return calls.providerResult;
    throw new Error("provider_must_not_run");
  },
}));
vi.mock("@/server/auth", () => ({
  isExpectedOrigin: () => true,
}));

import { POST as companionPost } from "@/app/api/companion/turn/route";
import { POST as interventionPost } from "@/app/api/interventions/route";

beforeEach(() => {
  calls.auth = 0;
  calls.budget = 0;
  calls.personalRag = 0;
  calls.provider = 0;
  calls.providerResult = null;
});

describe("emergency routing order", () => {
  it("routes an explicit companion emergency before authentication or budget", async () => {
    const form = new FormData();
    form.set(
      "context",
      JSON.stringify({ history: [], text: "They are not breathing." }),
    );
    const response = await companionPost(
      new Request("https://haven.test/api/companion/turn", {
        method: "POST",
        body: form,
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      emergency: true,
      provider: "deterministic",
      promptVersion: "haven-companion-2",
    });
    expect(calls.auth).toBe(0);
    expect(calls.budget).toBe(0);
  });

  it("routes structured emergency input before budget, RAG, or provider", async () => {
    const form = new FormData();
    form.set(
      "input",
      JSON.stringify({
        schemaVersion: "1.0",
        role: "individual",
        situationIds: ["emotional_distress"],
        observableSignalIds: ["not_responding"],
        intensityBand: "overwhelming",
        goalId: "get_through_minute",
        tone: "minimal",
        language: "en-IN",
        jurisdiction: { country: "IN" },
        isAlone: false,
      }),
    );
    const response = await interventionPost(
      new Request("https://haven.test/api/interventions", {
        method: "POST",
        body: form,
        headers: { origin: "https://haven.test" },
      }),
    );
    expect(response.status).toBe(409);
    expect(calls.budget).toBe(0);
    expect(calls.personalRag).toBe(0);
    expect(calls.provider).toBe(0);
  });

  it("uses the rechecked urgent decision when voice detects non-immediate self-harm", async () => {
    calls.providerResult = {
      facts: {
        explicitFacts: [],
        unknownFacts: [],
        safetyConfirmationSignalIds: ["self_harm_thoughts"],
      },
      intervention: null,
    };
    const form = new FormData();
    form.set(
      "input",
      JSON.stringify({
        schemaVersion: "1.0",
        role: "individual",
        situationIds: ["stress"],
        observableSignalIds: [],
        intensityBand: "manageable",
        goalId: "get_through_minute",
        tone: "warm",
        language: "en-IN",
        jurisdiction: { country: "IN" },
        isAlone: false,
      }),
    );
    const response = await interventionPost(
      new Request("https://haven.test/api/interventions", {
        method: "POST",
        body: form,
        headers: { origin: "https://haven.test" },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      decision: {
        tier: "urgent_support",
        reasonCode: "non_immediate_self_harm_thoughts",
      },
      result: {
        provider: "deterministic",
        fallbackReason: "voice_safety_recheck",
      },
      voiceSafetySignalIds: ["self_harm_thoughts"],
      personalMemoryUsed: false,
    });
    expect(calls.provider).toBe(1);
  });
});
