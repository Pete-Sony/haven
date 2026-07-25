const DEVELOPMENT_SCRIPT_POLICY =
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

export function createContentSecurityPolicy(
  nonce: string,
  production = process.env.NODE_ENV === "production",
): string {
  const scriptPolicy = production
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    : DEVELOPMENT_SCRIPT_POLICY;
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    scriptPolicy,
    "connect-src 'self' https://*.supabase.co",
    "media-src 'self' blob:",
    production ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function createRequestNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}
