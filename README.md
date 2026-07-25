# Haven

Haven is a browser-only, multi-modal recovery and prevention platform for
adults navigating substance use disorders and the people who support them. It
turns large tap choices and an optional short voice note into a bounded
intervention, a personalized support script, verified educational context, and
the next human handoff.

It is not an open-ended chatbot, diagnostic system, medical device, monitoring
tool, or emergency dispatcher. Signed-in adults may use a bounded four-turn
Voice Companion; its audio, transcript, and conversation are not persisted.

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
  and support memories outside the core demo
- Vitest, Playwright, axe-core, Oxlint, Prettier, and a repository secret scan
- OpenAI Sites production hosting

This is a conventional responsive web application. It intentionally contains
no native-mobile package, install manifest, service worker, or PWA behavior.

## Run locally

Use Node.js 24:

```bash
npm install
npm run verify
npm run test:e2e
npm run dev
```

Without environment variables, the urgent journey remains complete and uses
the reviewed fallback. Copy `.env.example` to `.env.local` to enable optional
cloud features.

## Environment

| Variable                        | Required      | Purpose                              |
| ------------------------------- | ------------- | ------------------------------------ |
| `GEMINI_API_KEY`                | Optional      | Live bounded personalization         |
| `NEXT_PUBLIC_SUPABASE_URL`      | Optional      | Saved-plan account endpoint          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional      | Supabase PKCE/OAuth client           |
| `GOOGLE_OAUTH_ENABLED`          | With OAuth    | Enables sign-in after provider setup |
| `HAVEN_DATA_ENCRYPTION_KEY`     | With Supabase | 32-byte base64 AES key               |
| `RATE_LIMIT_HMAC_KEY`           | Production    | Hashes budget identities             |

The Gemini key and encryption key are server-only. Do not expose either with a
`NEXT_PUBLIC_` prefix.

## Project map

- [`architecture.md`](architecture.md): governing technical design and decision
  record
- [`app/`](app/): Next.js pages and server route handlers
- [`components/`](components/): zero-typing journey, account onboarding, saved
  plan, and bounded Voice Companion UI
- [`lib/domain/`](lib/domain/): pure schemas, safety policy, fallback, and
  allowlisted resources plus two-lane retrieval policy
- [`lib/server/`](lib/server/): Gemini, Supabase, and encryption boundaries
- [`supabase/migrations/`](supabase/migrations/): RLS-protected database schema
- [`tests/`](tests/): policy, security, contract, accessibility, and flow tests

## Verified commands

`npm run verify` checks formatting, strict types, lint rules, unit/policy tests
with coverage thresholds, secret patterns, a zero-high dependency audit, and
the optimized production build.
`npm run test:e2e` verifies the individual path, caregiver path, emergency
route, narrow browser layout, and critical automated accessibility findings.

## Notice

Haven is a research and competition prototype for adults using an India
reference configuration. Health and service content requires qualified review
before real-world clinical use. In immediate danger in India, call 112.
