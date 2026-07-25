import { describe, expect, it } from "vitest";
import {
  areResourceIdsAllowed,
  resolveResources,
} from "@/lib/domain/resources";

describe("resource registry", () => {
  it("resolves enabled allowlisted resources only", () => {
    expect(resolveResources(["in.erss.112", "invented"])).toHaveLength(1);
  });

  it("allows a resource only for its configured tier", () => {
    expect(areResourceIdsAllowed(["in.erss.112"], "emergency")).toBe(true);
    expect(areResourceIdsAllowed(["in.erss.112"], "coping")).toBe(false);
    expect(areResourceIdsAllowed([], "coping")).toBe(false);
  });

  it("rejects unknown resources", () => {
    expect(areResourceIdsAllowed(["invented"], "urgent_support")).toBe(false);
  });
});
