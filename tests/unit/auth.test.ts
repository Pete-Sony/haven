import { describe, expect, it } from "vitest";
import { isExpectedOrigin, safeNextPath } from "@/server/auth";

describe("account boundaries", () => {
  it("keeps valid internal destinations", () => {
    expect(safeNextPath("/companion?mode=voice#start")).toBe(
      "/companion?mode=voice#start",
    );
    expect(safeNextPath("/check-in")).toBe("/check-in");
  });

  it("rejects external, API, callback, slash and control destinations", () => {
    for (const value of [
      "https://attacker.example",
      "//attacker.example",
      "/api/account/habits",
      "/auth/callback",
      "/\\attacker.example",
      "/safe\u0000bad",
    ]) {
      expect(safeNextPath(value, "/onboarding")).toBe("/onboarding");
    }
  });

  it("accepts same-origin mutations and rejects a foreign origin", () => {
    expect(
      isExpectedOrigin(
        new Request("https://haven.example/api/account/habits", {
          headers: { origin: "https://haven.example" },
        }),
      ),
    ).toBe(true);
    expect(
      isExpectedOrigin(
        new Request("https://haven.example/api/account/habits", {
          headers: { origin: "https://attacker.example" },
        }),
      ),
    ).toBe(false);
    expect(
      isExpectedOrigin(new Request("https://haven.example/api/account/habits")),
    ).toBe(false);
  });
});
