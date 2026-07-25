import { describe, expect, it } from "vitest";
import { INDIA_CALL_NUMBERS, telephoneHref } from "@/features/calls/call-links";

describe("call links", () => {
  it("creates direct dialer targets for allowlisted support numbers", () => {
    expect(telephoneHref(INDIA_CALL_NUMBERS.emergency)).toBe("tel:112");
    expect(telephoneHref(INDIA_CALL_NUMBERS.substanceUseSupport)).toBe(
      "tel:14446",
    );
    expect(telephoneHref("+9114416")).toBe("tel:+9114416");
  });

  it("rejects websites, directories, and malformed targets", () => {
    expect(() => telephoneHref("https://example.com")).toThrow(
      "invalid_call_number",
    );
    expect(() => telephoneHref("14416?source=directory")).toThrow(
      "invalid_call_number",
    );
  });
});
