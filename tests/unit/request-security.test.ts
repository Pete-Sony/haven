import { describe, expect, it } from "vitest";
import {
  isSameOriginMutation,
  readBoundedFormData,
  readBoundedJson,
  RequestBodyError,
} from "@/server/request-security";
import { createContentSecurityPolicy } from "@/server/security-headers";

describe("request security helpers", () => {
  it("requires an explicit same origin", () => {
    expect(
      isSameOriginMutation(new Request("https://haven.example/api/action")),
    ).toBe(false);
    expect(
      isSameOriginMutation(
        new Request("https://internal/api/action", {
          headers: {
            host: "internal",
            origin: "https://haven.example",
            "x-forwarded-host": "haven.example",
            "x-forwarded-proto": "https",
          },
        }),
      ),
    ).toBe(true);
    expect(
      isSameOriginMutation(
        new Request("https://haven.example/api/action", {
          headers: { origin: "https://attacker.example" },
        }),
      ),
    ).toBe(false);
  });

  it("uses the configured canonical origin and fails closed on bad config", () => {
    const previous = process.env.HAVEN_CANONICAL_ORIGIN;
    try {
      process.env.HAVEN_CANONICAL_ORIGIN = "https://haven.example";
      expect(
        isSameOriginMutation(
          new Request("https://internal/api/action", {
            headers: { origin: "https://haven.example" },
          }),
        ),
      ).toBe(true);
      expect(
        isSameOriginMutation(
          new Request("https://internal/api/action", {
            headers: { origin: "https://attacker.example" },
          }),
        ),
      ).toBe(false);

      process.env.HAVEN_CANONICAL_ORIGIN = "http://haven.example";
      expect(
        isSameOriginMutation(
          new Request("https://internal/api/action", {
            headers: { origin: "https://haven.example" },
          }),
        ),
      ).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.HAVEN_CANONICAL_ORIGIN;
      else process.env.HAVEN_CANONICAL_ORIGIN = previous;
    }
  });

  it("parses bounded JSON and rejects oversized chunked bodies", async () => {
    await expect(
      readBoundedJson(
        new Request("https://haven.example/api/action", {
          body: JSON.stringify({ safe: true }),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
        64,
      ),
    ).resolves.toEqual({ safe: true });

    await expect(
      readBoundedJson(
        new Request("https://haven.example/api/action", {
          body: JSON.stringify({ value: "too long" }),
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
        8,
      ),
    ).rejects.toMatchObject({
      code: "request_too_large",
    } satisfies Partial<RequestBodyError>);
  });

  it("bounds form parsing before producing FormData", async () => {
    const request = new Request("https://haven.example/api/action", {
      body: "action=help",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
    const form = await readBoundedFormData(request, 64);
    expect(form.get("action")).toBe("help");
  });
});

describe("content security policy", () => {
  it("uses a nonce without unsafe inline scripts in production", () => {
    const policy = createContentSecurityPolicy("known-nonce", true);
    expect(policy).toContain(
      "script-src 'self' 'nonce-known-nonce' 'strict-dynamic'",
    );
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
  });
});
