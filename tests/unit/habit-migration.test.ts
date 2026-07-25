import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/202607250005_haven_onboarding_habits.sql",
  ),
  "utf8",
);

describe("habit and onboarding database boundaries", () => {
  it("saves both onboarding records inside one authenticated transaction", () => {
    expect(migration).toContain(
      "create or replace function public.save_haven_onboarding",
    );
    expect(migration).toContain("current_user_id uuid := (select auth.uid())");
    expect(migration).toContain("insert into public.support_profiles");
    expect(migration).toContain("insert into public.trusted_contacts");
    expect(migration).toContain("to authenticated");
  });

  it("enforces owner-only RLS for encrypted trackers and check-ins", () => {
    expect(migration).toContain(
      "alter table public.habit_trackers enable row level security",
    );
    expect(migration).toContain(
      "alter table public.habit_checkins enable row level security",
    );
    expect(migration.match(/\(select auth\.uid\(\)\) = user_id/g)).toHaveLength(
      4,
    );
    expect(migration).toContain(
      "revoke all on table public.habit_trackers from anon",
    );
    expect(migration).toContain(
      "revoke all on table public.habit_checkins from anon",
    );
  });

  it("allows one encrypted record per India day and purges after expiry", () => {
    expect(migration).toContain("primary key (user_id, local_date)");
    expect(migration).toContain("ciphertext text not null");
    expect(migration).toContain("now() + interval '90 days'");
    expect(migration).toContain(
      "delete from public.habit_checkins where expires_at <= now()",
    );
  });
});
