import { describe, expect, it } from "vitest";
import { RequestBudget } from "@/domain/request-budget";

describe("RequestBudget", () => {
  it("allows requests only while a user's budget remains", () => {
    const budget = new RequestBudget(3, 60_000);
    expect(budget.consume("user-a", 1, 1_000)).toMatchObject({
      allowed: true,
      remaining: 2,
    });
    expect(budget.consume("user-a", 2, 1_001)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(budget.consume("user-a", 1, 1_002)).toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });

  it("charges audio at a higher caller-selected cost", () => {
    const budget = new RequestBudget(4, 60_000);
    expect(budget.consume("audio-user", 3, 1_000).allowed).toBe(true);
    expect(budget.consume("audio-user", 3, 1_001).allowed).toBe(false);
  });

  it("keeps user budgets isolated and resets expired windows", () => {
    const budget = new RequestBudget(1, 1_000);
    expect(budget.consume("user-a", 1, 1_000).allowed).toBe(true);
    expect(budget.consume("user-b", 1, 1_001).allowed).toBe(true);
    expect(budget.consume("user-a", 1, 2_000).allowed).toBe(true);
  });

  it("rejects a single request whose cost exceeds the whole budget", () => {
    const budget = new RequestBudget(2, 60_000);
    expect(budget.consume("user-a", 3, 1_000).allowed).toBe(false);
  });
});
