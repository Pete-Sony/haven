# Haven Multi-Session Completion and Release Plan

**Status:** implementation in progress
**Date:** 2026-07-25
**Integration owner:** primary Codex session
**Audited baseline:** `5e9600c`
**Candidate release SHA:** pending
**Rule:** only the integration owner updates checkboxes; `[x]` requires evidence
from the exact recorded SHA.

## Problem statement

Design and build a multi-modal, GenAI-powered recovery and prevention platform
that supports individuals navigating substance use disorders and their
caregivers. The solution must utilize generative AI as a core engine to provide
zero-typing interventions, personalized emergency scripts, backed by
educational resources, and contextual safety tools that empower users, families
when cognitive load is highest.

## Audit snapshot

- [x] Baseline `5e9600c` passed formatting, typecheck, lint, 106 unit tests,
      secret scan, dependency audit, and the standard Next production build.
- [x] Baseline `5e9600c` passed all 20 desktop and narrow-screen Playwright
      tests.
- [x] A read-only Supabase status check found migrations `0001` through `0004`
      already applied. No migration was applied by the planning/audit session.
- [ ] Freeze and integrate the current multi-session working tree.
- [ ] Review and apply onboarding/habits migration `0005`.
- [ ] Pass the OpenNext/Sites production bundle.
- [ ] Prove a bounded live Gemini request with synthetic data.
- [ ] Save, deploy, and smoke-test the exact release SHA in Sites.

## Multi-session coordination

- [ ] Record every active session, owner, files, intent, and handoff below.
- [ ] Keep one integration owner and one candidate release SHA.
- [ ] Preserve existing edits; never reset or discard another session's work.
- [ ] Run a secret scan before every checkpoint commit.
- [ ] Re-run all final gates after the final code or documentation change.
- [ ] Push only the exact verified SHA.

| Workstream                 | Owner             | Status | Evidence / blocker |
| -------------------------- | ----------------- | ------ | ------------------ |
| Safety and AI contracts    | `safety_ai`       | active | pending handoff    |
| Account and data lifecycle | `account_data`    | active | pending handoff    |
| Deployment and security    | `deploy_security` | active | pending handoff    |
| Docs, integration, release | primary           | active | this checklist     |

## Design patterns

- [ ] **Functional Core / Imperative Shell:** keep routing, retrieval, budgets,
      habit metrics, and validation pure; routes and UI orchestrate effects.
- [ ] **Policy/Specification + Chain of Responsibility:** evaluate emergency,
      urgent support, then coping in a fixed first-match order.
- [ ] **Registry:** centralize canonical actions, reviewed labels/scripts,
      educational resources, hotline metadata, and memory eligibility.
- [ ] **Schema-first Anti-Corruption Layer:** validate requests, provider
      artifacts, decrypted records, and database results with strict schemas.
- [ ] **Strategy + deterministic fallback:** Gemini and reviewed fallback share
      a contract; fallback remains complete when AI is absent or rejected.
- [ ] **Ports and Adapters:** isolate Gemini, Supabase, audio/speech, clipboard,
      sharing, and phone-call integrations.
- [ ] **Repository:** centralize authenticated storage and ownership checks.
- [ ] **Finite State Machine:** constrain acute-support and four-turn companion
      transitions, including terminal emergency states.
- [ ] **Two-lane RAG:** one reviewed educational item plus at most two
      consented preference memories; neither lane controls safety.
- [ ] **Defense in Depth / Fail Closed:** repeat routing server-side and enforce
      schemas, origin checks, budgets, timeouts, and deterministic fallbacks.

## Implementation checklist

### Safety, GenAI, RAG, and companion

- [ ] Add a typed canonical Action Registry and make `SafetyDecision.actionIds`
      authoritative for provider, fallback, UI, and support memories.
- [ ] Route immediate danger to emergency and strong/overwhelming while alone,
      non-immediate self-harm thoughts, and urgent scenarios to human support.
- [ ] Render emergency help before authentication, storage, retrieval, or AI.
- [ ] Separate provider artifacts from application-owned labels and scripts.
- [ ] Reject invented facts, numbers, URLs, diagnoses, medical instructions,
      delivery claims, unknown sources, and unauthorized actions.
- [ ] Make emergency personalization select bounded phrase IDs while application
      code renders the final fact-preserving dispatcher script.
- [ ] Keep educational retrieval exact, reviewed, role-scoped, and versioned.
- [ ] Keep support memories explicit, structured, encrypted, role-isolated,
      limited to 20, and retained for at most 90 days.
- [ ] Keep the signed-in Voice Companion to four turns, exactly one text/audio
      input, no transcript persistence, and immediate danger bypass.

### Accounts, onboarding, and habits

- [ ] Keep emergency and account-free prevention available without onboarding.
- [ ] Save the Support Card and one trusted contact atomically.
- [ ] Use profile data only for transparent UI defaults; never silently send
      names or free text to Gemini.
- [ ] Complete encrypted daily habits with one Asia/Kolkata check-in per day,
      up to five practices, 90-day retention, and non-shaming metrics.
- [ ] Add password reset request/update with anti-enumeration responses and
      rate limits.
- [ ] Add plan/contact deletion, private account export, confirmed complete
      account deletion, session revocation, and database cascades.
- [ ] Bind encrypted records to entity, user, and record/date context with a
      migration-safe context version.

### Request and browser security

- [ ] Require strict same-origin requests for every mutation.
- [ ] Bound JSON and multipart bodies before parsing and rate-limit public
      provider/auth endpoints.
- [ ] Return private, no-store responses for sensitive account data.
- [ ] Replace production `script-src 'unsafe-inline'` with a tested nonce CSP.
- [ ] Verify two-user RLS isolation, ciphertext-swap rejection, expiry, atomic
      onboarding rollback, and account deletion.

### Production release

- [ ] Fix the pinned OpenNext/node-minify compatibility problem without hiding
      dependency-audit findings.
- [ ] Run `npm ci`, `npm run verify`, `npm run test:e2e`, and
      `npm run build:sites` on the final SHA.
- [ ] Configure Sites with server-only Gemini, Supabase service-role,
      encryption, rate-limit, canonical-origin, OAuth, and release-SHA values.
- [ ] Apply reviewed pending migrations and verify live RLS with isolated test
      users.
- [ ] Push the verified SHA, build from it, save the matching Sites version,
      deploy privately, and inspect logs/smoke tests.
- [ ] Promote Sites to public only after the release-owner production check.
- [ ] Confirm GitHub, Sites version, health response, and production UI expose
      the same release SHA.

## Final acceptance

- [ ] Unit tests cover the safety truth table, registries, guardrails, RAG,
      companion state machine, encryption contexts, and habit date behavior.
- [ ] Browser tests cover individual, caregiver, emergency, prevention,
      onboarding, memories, companion, habits, password reset, export, and
      deletion on desktop and narrow screens.
- [ ] Accessibility evidence covers keyboard use, screen-reader names, focus,
      200% reflow, reduced motion, and automated critical violations.
- [ ] Production smoke covers health, headers, auth callbacks, emergency
      bypass, deterministic fallback, live Gemini, call links, retention,
      account lifecycle, and habits.
- [ ] No provider output can alter routing, invent evidence, or delay emergency
      action.
- [ ] No secret, unresolved high-severity audit, failing gate, cross-user data
      exposure, or release-SHA mismatch remains.

## Activity log

| UTC time   | Owner   | Update                                                                          | Evidence            |
| ---------- | ------- | ------------------------------------------------------------------------------- | ------------------- |
| 2026-07-25 | primary | Created requested ignored coordination plan and started parallel implementation | pending integration |
