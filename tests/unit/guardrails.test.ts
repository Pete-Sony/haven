import { describe, expect, it } from "vitest";
import {
  redactSensitiveText,
  rejectGeneratedText,
} from "@/server/ai/guardrails";

describe("shared generated-text guardrails", () => {
  it.each([
    ["A diagnosis is certain.", "prohibited_language"],
    ["Help is on the way.", "prohibited_language"],
    ["You must do as I say.", "coercive_language"],
    ["Open https://example.com.", "url_not_allowed"],
    ["Email helper@example.com.", "email_not_allowed"],
    ["Call +91 98765 43210.", "phone_not_allowed"],
    ["Wait for 5 minutes.", "numeric_detail_not_allowed"],
  ] as const)("rejects %s", (text, reason) => {
    expect(rejectGeneratedText(text)).toBe(reason);
  });

  it("does not reject bounded non-medical support language", () => {
    expect(
      rejectGeneratedText(
        "Move to a quieter place and contact someone you trust.",
      ),
    ).toBeNull();
  });

  it("redacts sensitive shapes while retaining useful surrounding text", () => {
    expect(
      redactSensitiveText(
        "Please email me@example.com after 2026-07-25T12:30:00Z.",
      ),
    ).toBe("Please email [redacted-email] after [redacted-time].");
  });
});
