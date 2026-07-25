import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function aad(context?: string): Buffer {
  return Buffer.from(context ? `haven:v1:${context}` : "haven:v1", "utf8");
}

function boundAad(context: string): Buffer {
  return Buffer.from(`haven:v2:${context}`, "utf8");
}

function encryptionKey(): Buffer {
  const encoded = process.env.HAVEN_DATA_ENCRYPTION_KEY;
  if (!encoded) throw new Error("encryption_not_configured");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("encryption_key_invalid");
  return key;
}

export interface EncryptedValue {
  readonly ciphertext: string;
  readonly iv: string;
  readonly authTag: string;
  readonly keyVersion: 1;
}

export interface BoundEncryptedValue extends EncryptedValue {
  readonly contextVersion: 2;
}

export interface StoredEncryptedValue extends EncryptedValue {
  readonly contextVersion?: 1 | 2;
}

export function encryptJson(
  value: unknown,
  aadContext?: string,
): EncryptedValue {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  cipher.setAAD(aad(aadContext));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion: 1,
  };
}

export function decryptJson<T>(value: EncryptedValue, aadContext?: string): T {
  if (value.keyVersion !== 1) throw new Error("key_version_unsupported");
  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey(),
    Buffer.from(value.iv, "base64"),
  );
  decipher.setAAD(aad(aadContext));
  decipher.setAuthTag(Buffer.from(value.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}

/**
 * New account data must use a v2, user/record-bound context. Existing v1 rows
 * remain readable only when the caller explicitly supplies their legacy
 * context (or undefined for the original unbound account rows).
 */
export function encryptBoundJson(
  value: unknown,
  context: string,
): BoundEncryptedValue {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  cipher.setAAD(boundAad(context));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion: 1,
    contextVersion: 2,
  };
}

export function decryptBoundJson<T>(
  value: StoredEncryptedValue,
  context: string,
  legacyContext?: string,
): T {
  if (value.contextVersion === undefined || value.contextVersion === 1) {
    return decryptJson<T>(value, legacyContext);
  }
  if (value.contextVersion !== 2) {
    throw new Error("context_version_unsupported");
  }
  if (value.keyVersion !== 1) throw new Error("key_version_unsupported");
  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey(),
    Buffer.from(value.iv, "base64"),
  );
  decipher.setAAD(boundAad(context));
  decipher.setAuthTag(Buffer.from(value.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}
