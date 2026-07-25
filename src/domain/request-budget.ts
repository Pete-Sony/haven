interface BudgetRecord {
  used: number;
  windowStartedAt: number;
}

export interface BudgetResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
}

/** Pure token budget used by the server-side abuse-control adapter. */
export class RequestBudget {
  private readonly records = new Map<string, BudgetRecord>();

  constructor(
    private readonly maximumCost: number,
    private readonly windowMs: number,
    private readonly maximumRecords = 10_000,
  ) {}

  consume(key: string, cost: number, now = Date.now()): BudgetResult {
    const existing = this.records.get(key);
    const record =
      !existing || now - existing.windowStartedAt >= this.windowMs
        ? { used: 0, windowStartedAt: now }
        : existing;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((record.windowStartedAt + this.windowMs - now) / 1_000),
    );

    if (cost <= 0 || cost > this.maximumCost) {
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }
    if (record.used + cost > this.maximumCost) {
      return {
        allowed: false,
        remaining: Math.max(0, this.maximumCost - record.used),
        retryAfterSeconds,
      };
    }

    record.used += cost;
    this.records.set(key, record);
    this.prune(now);
    return {
      allowed: true,
      remaining: this.maximumCost - record.used,
      retryAfterSeconds: 0,
    };
  }

  private prune(now: number): void {
    if (this.records.size <= this.maximumRecords) return;
    for (const [key, record] of this.records) {
      if (now - record.windowStartedAt >= this.windowMs) {
        this.records.delete(key);
      }
      if (this.records.size <= this.maximumRecords) return;
    }
    const oldestKey = this.records.keys().next().value as string | undefined;
    if (oldestKey) this.records.delete(oldestKey);
  }
}
