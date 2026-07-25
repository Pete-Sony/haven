export type RequestBodyErrorCode =
  "invalid_body" | "invalid_content_type" | "request_too_large";

export class RequestBodyError extends Error {
  readonly code: RequestBodyErrorCode;

  constructor(code: RequestBodyErrorCode) {
    super(code);
    this.name = "RequestBodyError";
    this.code = code;
  }
}

function declaredLength(request: Request): number | null {
  const raw = request.headers.get("content-length");
  if (raw === null) return null;
  if (!/^\d+$/.test(raw)) throw new RequestBodyError("invalid_body");
  const length = Number(raw);
  if (!Number.isSafeInteger(length)) {
    throw new RequestBodyError("invalid_body");
  }
  return length;
}

async function readBoundedBytes(
  request: Request,
  maxBytes: number,
): Promise<ArrayBuffer> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new TypeError("maxBytes must be a positive safe integer");
  }
  const length = declaredLength(request);
  if (length !== null && length > maxBytes) {
    throw new RequestBodyError("request_too_large");
  }
  if (!request.body) throw new RequestBodyError("invalid_body");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new RequestBodyError("request_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (total === 0) throw new RequestBodyError("invalid_body");

  const body = new ArrayBuffer(total);
  const view = new Uint8Array(body);
  let offset = 0;
  for (const chunk of chunks) {
    view.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function mediaType(request: Request): string {
  return (
    request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase() ?? ""
  );
}

export async function readBoundedJson(
  request: Request,
  maxBytes = 8_192,
): Promise<unknown> {
  if (mediaType(request) !== "application/json") {
    throw new RequestBodyError("invalid_content_type");
  }
  const body = await readBoundedBytes(request, maxBytes);
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch {
    throw new RequestBodyError("invalid_body");
  }
}

export async function readBoundedFormData(
  request: Request,
  maxBytes: number,
): Promise<FormData> {
  const type = mediaType(request);
  if (
    type !== "multipart/form-data" &&
    type !== "application/x-www-form-urlencoded"
  ) {
    throw new RequestBodyError("invalid_content_type");
  }
  const body = await readBoundedBytes(request, maxBytes);
  try {
    return await new Request(request.url, {
      body,
      headers: { "content-type": request.headers.get("content-type") ?? "" },
      method: "POST",
    }).formData();
  } catch {
    throw new RequestBodyError("invalid_body");
  }
}

export function isSameOriginMutation(request: Request): boolean {
  const rawOrigin = request.headers.get("origin");
  if (!rawOrigin) return false;

  try {
    const url = new URL(request.url);
    const origin = new URL(rawOrigin).origin;
    if (origin !== rawOrigin) return false;

    const canonicalOrigin = process.env.HAVEN_CANONICAL_ORIGIN;
    if (canonicalOrigin) {
      const canonical = new URL(canonicalOrigin);
      if (
        canonical.origin !== canonicalOrigin ||
        canonical.protocol !== "https:"
      ) {
        return false;
      }
      return origin === canonical.origin;
    }

    const forwardedHost =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const forwardedProtocol =
      request.headers.get("x-forwarded-proto") ?? url.protocol.slice(0, -1);
    const allowed = new Set([url.origin]);
    if (
      forwardedHost &&
      /^(?:[a-z0-9.-]+|\[[0-9a-f:]+\])(?::\d+)?$/i.test(forwardedHost) &&
      (forwardedProtocol === "http" || forwardedProtocol === "https")
    ) {
      allowed.add(`${forwardedProtocol}://${forwardedHost}`);
    }
    return allowed.has(origin);
  } catch {
    return false;
  }
}
