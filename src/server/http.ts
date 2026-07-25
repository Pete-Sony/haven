import { NextResponse } from "next/server";
import {
  isSameOriginMutation,
  readBoundedJson,
} from "@/server/request-security";

export function privateJson(body: unknown, status = 200): NextResponse {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export const requireSameOrigin = isSameOriginMutation;
export { readBoundedJson };
