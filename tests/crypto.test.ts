import { afterEach, describe, expect, it } from "vitest";
import { decryptJson, encryptJson } from "@/lib/server/crypto";

afterEach(() => {
  delete process.env.HAVEN_DATA_ENCRYPTION_KEY;
});

describe("encrypted saved-plan values", () => {
  it("round-trips JSON without storing plaintext", () => {
    process.env.HAVEN_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
      "base64",
    );
    const value = { safePlaceLabel: "trusted lobby" };
    const encrypted = encryptJson(value);
    expect(encrypted.ciphertext).not.toContain("trusted lobby");
    expect(decryptJson(encrypted)).toEqual(value);
  });

  it("rejects a missing key", () => {
    expect(() => encryptJson({ value: true })).toThrow(
      "encryption_not_configured",
    );
  });

  it("rejects an incorrectly sized key", () => {
    process.env.HAVEN_DATA_ENCRYPTION_KEY = Buffer.alloc(8).toString("base64");
    expect(() => encryptJson({ value: true })).toThrow(
      "encryption_key_invalid",
    );
  });

  it("detects ciphertext tampering", () => {
    process.env.HAVEN_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 8).toString(
      "base64",
    );
    const encrypted = encryptJson({ value: true });
    expect(() =>
      decryptJson({
        ...encrypted,
        ciphertext: Buffer.from("tampered").toString("base64"),
      }),
    ).toThrow();
  });

  it("binds ciphertext to its supplied account and record context", () => {
    process.env.HAVEN_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 8).toString(
      "base64",
    );
    const encrypted = encryptJson(
      { actionId: "contact_trusted_person" },
      "support-memory:user-a:memory-a",
    );
    expect(decryptJson(encrypted, "support-memory:user-a:memory-a")).toEqual({
      actionId: "contact_trusted_person",
    });
    expect(() =>
      decryptJson(encrypted, "support-memory:user-b:memory-a"),
    ).toThrow();
    expect(() =>
      decryptJson(encrypted, "support-memory:user-a:memory-b"),
    ).toThrow();
  });

  it("rejects unsupported key versions", () => {
    process.env.HAVEN_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 8).toString(
      "base64",
    );
    const encrypted = encryptJson({ value: true });
    expect(() => decryptJson({ ...encrypted, keyVersion: 2 as never })).toThrow(
      "key_version_unsupported",
    );
  });
});
