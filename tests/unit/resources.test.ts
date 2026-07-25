import { describe, expect, it } from "vitest";
import {
  APPROVED_CLAIMS,
  RESOURCE_REGISTRY,
  areResourceIdsAllowed,
  resolveResources,
} from "@/domain/resources";

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

  it("exposes support resources only as real call targets", () => {
    for (const resource of Object.values(RESOURCE_REGISTRY)) {
      expect(resource.ctaKind).toBe("call");
      expect(resource.phone).toMatch(/^\d[\d-]*\d$|^\d{3}$/);
      expect(resource.sourceUrl).toMatch(/^https:\/\//);
    }
    expect(RESOURCE_REGISTRY).not.toHaveProperty("in.kl.vimukthi.directory");
  });

  it("keeps every educational claim versioned, scoped, and review-bounded", () => {
    for (const claim of Object.values(APPROVED_CLAIMS)) {
      expect(claim.enabled).toBe(true);
      expect(claim.roles.length).toBeGreaterThan(0);
      expect(claim.tiers.length).toBeGreaterThan(0);
      expect(Date.parse(claim.lastReviewed)).not.toBeNaN();
      expect(Date.parse(claim.recheckAt)).toBeGreaterThan(
        Date.parse(claim.lastReviewed),
      );
      expect(claim.url).toMatch(/^https:\/\//);
    }
  });
});
