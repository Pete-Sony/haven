import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/202607250006_haven_encryption_context.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("encryption context migration", () => {
  it("versions every encrypted account table without rewriting legacy rows", () => {
    for (const table of [
      "saved_plans",
      "trusted_contacts",
      "support_profiles",
      "support_memories",
      "habit_trackers",
      "habit_checkins",
    ]) {
      expect(migration).toContain(`alter table public.${table}`);
    }
    expect(migration).toContain("context_version smallint not null default 1");
    expect(migration).toContain("check (context_version in (1, 2))");
  });

  it("provides an atomic v2-only onboarding write", () => {
    expect(migration).toContain(
      "create or replace function public.save_haven_onboarding_v2",
    );
    expect(migration).toContain("p_profile_context_version <> 2");
    expect(migration).toContain("p_contact_context_version <> 2");
    expect(migration).toContain("to authenticated");
  });

  it("removes both onboarding records inside one authenticated transaction", () => {
    expect(migration).toContain(
      "create or replace function public.delete_haven_onboarding()",
    );
    expect(migration).toContain(
      "delete from public.trusted_contacts where user_id = current_user_id",
    );
    expect(migration).toContain(
      "delete from public.support_profiles where user_id = current_user_id",
    );
    expect(migration).toContain(
      "grant execute on function public.delete_haven_onboarding()",
    );
  });
});
