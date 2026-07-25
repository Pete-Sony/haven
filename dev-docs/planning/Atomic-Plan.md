# Haven Atomic Delivery Plan

**Release:** production browser app for the first 100 users
**Rule:** finish and verify each phase before beginning the next phase.

## Phase 1 — Safe production foundation

- [ ] Keep urgent and emergency help public and independent of accounts, storage,
      retrieval, and model availability.
- [ ] Enforce deterministic safety routing before RAG or generation.
- [ ] Complete bounded two-lane RAG with one reviewed educational item and at
      most two consented, role-matched support memories.
- [ ] Add prompt construction boundaries and shared output guardrails.
- [ ] Add authentication, authorization, onboarding completion, same-origin
      checks, no-store account responses, and owner-only RLS.
- [ ] Require an encrypted Support Card and a valid E.164 trusted contact before
      protected recovery tools unlock.
- [ ] Add an encrypted daily positive-habit check-in with India-calendar-day
      uniqueness, 90-day retention, and 7/30-day persistence summaries.
- [ ] Make the Voice Companion reachable from primary desktop and narrow-screen
      navigation without weakening the public emergency path.
- [ ] Make every support contact action a real `tel:` call; keep educational
      citations separate from support actions.
- [ ] Replace prototype copy across public pages with production recovery and
      prevention language for individuals and caregivers.
- [ ] Provide real favicon assets that match the Haven brand.
- [ ] Remove local-only setup instructions and scripts.
- [ ] Move implementation, architecture, and atomic planning documents beneath
      ignored `dev-docs/`.
- [ ] Pass formatting, types, lint, unit/regression, security, dependency,
      production-build, browser-flow, accessibility, and visual audit gates.

## Phase 2 — Production operations

- [ ] Run qualified safety, clinical-language, and lived-experience review.
- [ ] Apply production Supabase migrations and verify RLS with isolated users.
- [ ] Configure the complete production environment and rotate launch secrets.
- [ ] Add privacy-safe operational metrics, alerting, budgets, and incident
      runbooks without recording crisis content.
- [ ] Complete load, concurrency, retention, backup, restore, and deletion tests
      for at least 100 initial users.
- [ ] Complete accessibility review with keyboard, screen-reader, reflow, and
      reduced-motion evidence.

## Phase 3 — Public launch

- [ ] Deploy the exact reviewed Git commit as a saved Sites version.
- [ ] Verify health, headers, auth callbacks, emergency bypass, RAG fallback,
      call links, account lifecycle, and daily check-ins in production.
- [ ] Confirm production and GitHub reference the same commit.
- [ ] Publish only after the release owner approves the Phase 2 evidence.
- [ ] Monitor the launch window and document any rollback or follow-up action.
