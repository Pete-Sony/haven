# Haven

Haven is a production, multi-modal recovery and prevention platform for adults
navigating substance use disorders and the people who care for them. Large tap
choices and an optional short voice note become a bounded intervention,
personalized words for the next human conversation, reviewed educational
context, and a clear safety handoff when cognitive load is highest.

It is not an open-ended chatbot, diagnostic system, medical device, monitoring
tool, or emergency dispatcher. Signed-in adults may use a bounded four-turn
Voice Companion; its audio, transcript, and conversation are not persisted.

## Production

The production app is deployed at <https://haven-relay.vercel.app/>.

## Problem-statement alignment

| Requirement                    | Judge-visible implementation                                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Multi-modal                    | Tap and optional voice input; visual, read-aloud, copy, call, and share-sheet output                                                            |
| GenAI-powered                  | One bounded Gemini 3.6 Flash call converts structured context and optional audio into a validated facts-plus-intervention artifact              |
| Recovery and prevention        | Immediate intervention plus a complete account-free, zero-typing prevention-plan journey                                                        |
| Individuals and caregivers     | Dedicated self-support and caregiver paths                                                                                                      |
| Zero typing                    | The complete immediate journey uses large choices; voice is optional                                                                            |
| Personalized emergency scripts | The fixed 112 action appears immediately; Gemini may then personalize only the dispatcher wording from confirmed observations                   |
| Educational resources          | A deterministic educational lane retrieves exactly one reviewed claim; the validator rejects invented, duplicate, or irrelevant IDs             |
| Consented personalization      | An optional personal lane retrieves at most two encrypted, user-confirmed “helped / not for me” preferences; raw crisis content is never stored |
| Calm-time onboarding           | An optional encrypted Support Card captures general response and human-support preferences without diagnosis or substance history               |
| Voice-to-text companion        | An authenticated four-turn session transcribes short audio, shows the text, validates one bounded reply, and stores no conversation             |
| Contextual safety              | Deterministic danger routing, fixed 112 action, explicit unknowns, and human-support escalation                                                 |
| High cognitive load            | One decision group per screen, three steps maximum, large controls, plain language, and read-aloud                                              |

## Safety boundary

Application code—not Gemini—assigns `emergency`, `urgent_support`, or `coping`.
Observable danger renders the 112 route synchronously. Gemini cannot lower the
risk tier, invent a phone number, diagnose, recommend medication or dosage,
claim that someone is safe, or claim that an external action occurred.

When voice explicitly describes an observable danger sign, the returned
allowlisted signal is merged with tapped signals and application code reruns
the deterministic router. Any emergency result discards generated coping text.

For non-emergency routes, Gemini structured output passes schema, action,
source, length, and prohibited-language validation. Every provider, timeout,
network, or validation failure returns a reviewed scenario-specific fallback.

Haven’s retrieval system has exactly two lanes: reviewed educational evidence
and optional user-confirmed support memories. The deterministic safety router,
consent gate, context firewall, and output validator sit outside retrieval and
outrank both lanes. Emergency routes bypass retrieval entirely.

## Stack

- Next.js App Router, React, strict TypeScript, and Zod
- official Google Gen AI SDK with Gemini 3.6 Flash structured output
- Supabase Postgres provides email authentication, optional Google OAuth,
  atomic shared request budgets, and AES-256-GCM saved plans, Support Cards,
  daily habit check-ins, and support memories
- Vitest, Playwright, axe-core, Oxlint, Prettier, and a repository secret scan
- OpenAI Sites production hosting

This is a conventional responsive web application. It intentionally contains
no native-mobile package, install manifest, service worker, or PWA behavior.

## Production environment

Configure these values in the production hosting environment. Do not create or
commit local environment files.

| Variable                        | Required | Purpose                                                                |
| ------------------------------- | -------- | ---------------------------------------------------------------------- |
| `GEMINI_API_KEY`                | Yes      | Server-only bounded generation and voice transcription                 |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL used by authentication and account data           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase publishable anonymous key; database RLS remains authoritative |
| `HAVEN_DATA_ENCRYPTION_KEY`     | Yes      | Server-only 32-byte base64 AES-256 key for user-owned encrypted data   |
| `RATE_LIMIT_HMAC_KEY`           | Yes      | Server-only high-entropy key for pseudonymous request-budget hashes    |
| `GOOGLE_OAUTH_ENABLED`          | Yes      | Set to `true` only after Google OAuth and callback URLs are configured |

The Gemini key and encryption key are server-only. Do not expose either with a
`NEXT_PUBLIC_` prefix.

## Project map

- `src/app/`: Next.js pages and route handlers
- `src/features/`: acute support, accounts, companion, habits, plans, and
  prevention interfaces
- `src/domain/`: pure schemas, safety policy, fallback, reviewed resources, and
  two-lane retrieval policy
- `src/server/`: Gemini, Supabase, encryption, authentication, and rate-limit
  boundaries
- [`supabase/migrations/`](supabase/migrations/): RLS-protected database schema
- `tests/unit/`: policy, security, prompt, retrieval, and contract regressions
- `tests/e2e/`: production-browser journey and accessibility regressions
- `docs/evidence/`: tracked verification and prompt-boundary evidence
- `developer-docs/`: tracked architecture and atomic planning notes; the
  multi-session `planning/Plan.md` checklist is intentionally local and ignored

## Verified commands

`npm run verify` checks formatting, strict types, lint rules, unit/policy tests
with coverage thresholds, secret patterns, a zero-high dependency audit, and
the optimized production build.
`PLAYWRIGHT_BASE_URL=<production-or-preview-url> npm run test:e2e` verifies the
individual path, caregiver path, emergency route, narrow browser layout, and
critical automated accessibility findings against a deployed build.

## Notice

Haven supports adults using an India-first safety configuration. It does not
diagnose, replace clinical care, or dispatch emergency services. Health and
service content requires ongoing qualified review. In immediate danger in
India, call 112.
