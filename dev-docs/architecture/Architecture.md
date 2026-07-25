# Haven Architecture

**Status:** governing implementation architecture  
**Product:** public, browser-based PromptWars application  
**Jurisdiction:** India first; Kerala is an optional additive resource pack  
**Audience:** adults navigating a high-load substance-use situation and trusted supporters  
**Last reviewed:** 2026-07-25

## 1. Purpose and source hierarchy

This document is the engineering source of truth for Haven. It defines
the product boundary, runtime topology, public contracts, deterministic safety
authority, Gemini pipeline, cloud-account boundary, data model, privacy and
security controls, verification gates, and release process.

Implementation decisions must follow these sources in order:

1. this architecture;
2. [`README.md`](README.md), the Haven product decision brief;
3. the workspace [`INDEX.md`](../INDEX.md);
4. the indexed Haven research pack in
   [`../resources/files/`](../resources/files/);
5. the India-specific safety and evaluation documents in
   [`../resources/haven-recovery/docs/`](../resources/haven-recovery/docs/);
6. the older Vite prototype only as visual and interaction reference.

If sources disagree, India-specific safety policy, user privacy, and this
architecture take precedence. The older U.S.-specific prototype must never
leak U.S. phone numbers or claims into the release.

## 2. Locked product decisions

- Haven is a responsive web application, not a native mobile app.
- It has no app-store package, native wrapper, install prompt, web-app
  manifest, or service worker.
- The urgent and emergency journeys work without login.
- The core prevention journey is account-free and stores data only after an
  explicit device-local save.
- Email authentication, optional Google OAuth, and encrypted cross-device
  saving stay outside the primary pitch and core journey.
- Supabase owns authentication and encrypted account data.
- Gemini 3.6 Flash performs bounded context interpretation and wording.
- Application code alone assigns risk tiers, actions, and resource IDs.
- The public site and GitHub repository are public.
- The first release is English (`en-IN`) only. Additional languages remain
  disabled until native safety and lived-experience review.
- The product stores no automatic crisis or intervention history, raw audio,
  transcript, generated script, diagnosis, medication data, or precise GPS
  location.
- A signed-in adult may explicitly save a bounded support-memory snapshot:
  situation tags, one allowlisted action, and `helpful` or `not_helpful`.
  Memories are encrypted, expire after 90 days, and are never shared across
  individual and caregiver contexts.
- A signed-in adult may save one encrypted, non-diagnostic Support Card with
  general calm-time preferences. It contains no substance history and never
  participates in acute safety routing.
- A signed-in adult may start a four-turn Voice Companion. Its bounded audio,
  visible transcript, and in-memory turns are used only for the current session
  and are never persisted.
- There is no analytics, advertising, automated messaging, monitoring, contact
  scraping, background microphone, camera, or location permission.

## 3. Goals and non-goals

### 3.1 Goals

1. Put the correct safety route ahead of generation.
2. Complete the acute journey without typing or login.
3. Turn taps and optional short audio into a concise, faithful next action.
4. Give a person or supporter usable words for a human handoff.
5. Make Gemini's contribution visible without giving it safety authority.
6. Resolve facts, phone numbers, and URLs only from reviewed application data.
7. Preserve a complete, honestly labelled deterministic fallback.
8. Let users review every external handoff.
9. Let signed-in users save, export, clear, and delete a calm-time plan and
   trusted-contact details.
10. Optimize first for Problem Statement Alignment and Code Quality, the two
    highest-impact evaluation areas.
11. Personalize from at most two matching user-confirmed support memories
    without turning Haven into a longitudinal health record.

### 3.2 Non-goals

- Diagnosis, triage by AI, intoxication detection, clinical scoring, treatment
  selection, medication, dosage, taper, or detox advice.
- Autonomous calling, dispatch, message delivery, provider booking, location
  sharing, or caregiver monitoring.
- An open-ended chatbot, autonomous AI memory, social feed, treatment
  inventory, live map, or longitudinal recovery record.
- Minors, clinical-effectiveness claims, regulatory-compliance claims, or a
  real-world clinical release.
- Machine-translated emergency guidance without qualified review.

## 4. Evaluation architecture

Problem Statement Alignment and Code Quality are the primary design filters.
Security and Efficiency follow. Testing and Accessibility remain release
gates even when the evaluator assigns them lower score impact.

| Evaluation area             | Required evidence                                                                                                                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Problem Statement Alignment | One complete individual-to-human handoff plus caregiver emergency contrast visibly covers multimodality, GenAI, recovery, prevention, both roles, zero typing, emergency scripting, education, and contextual safety |
| Code Quality                | Strict TypeScript, small responsibility-focused modules, shared runtime schemas, pure policy functions, documented contracts, clean dependency graph, zero type/lint/build warnings                                  |
| Security                    | Server-only secrets, strict input/output validation, emergency defence in depth, RLS, encrypted contact fields, rate limiting, CSP, CSRF/origin checks, redacted logs                                                |
| Efficiency                  | Static source retrieval, bounded audio, no live search or AI tools, no automatic retry loop, server rendering by default, provider deadlines, small response and bundle budgets                                      |
| Testing                     | Safety truth table, validator/red-team fixtures, RLS isolation, account lifecycle, AI failure paths, end-to-end journeys, production smoke tests                                                                     |
| Accessibility               | WCAG 2.2 AA target, complete keyboard/tap path, semantic controls, visible focus, status announcements, reflow, reduced motion, audio alternatives                                                                   |
| Google Services             | Real Gemini 3.6 Flash structured output materially supports the core experience; optional Google OAuth is not required for the demonstration                                                                         |

The judge-facing technical proof may show the policy tier, model ID, prompt
version, source IDs, validator status, and fallback status. It must not show
chain-of-thought, secrets, raw audio, contact data, or sensitive user text.

## 5. System context

```text
Adult seeking support ─┐
                       ├── HTTPS ──> Haven public web app
Trusted supporter ─────┘                   │
                                          ├── deterministic safety policy
                                          ├── two-lane bounded retrieval
                                          │     ├── reviewed education
                                          │     └── consented support memory
                                          ├── optional bounded audio capture
                                          ├── read/copy/call/share adapters
                                          └── optional account workspace
                                                   │
                              ┌────────────────────┴────────────────────┐
                              ▼                                         ▼
                       Next.js server                            Supabase Auth
                    validation + policy                         Google OAuth PKCE
                              │                                         │
                   ┌──────────┴──────────┐                              ▼
                   ▼                     ▼                     Supabase Postgres
            Gemini 3.6 Flash       deterministic fallback       encrypted plan/contact/memory
```

External calls are limited to Gemini generation, Supabase authentication/data,
official source links, and explicit user-triggered phone/share actions.

## 6. Runtime and deployment topology

### 6.1 Web application

Use the current stable Next.js App Router release supported by Sites, React,
strict TypeScript, and npm with a committed lockfile.

- Server components render public content and account reads by default.
- Client components are limited to the interactive relay state machine, audio,
  speech synthesis, clipboard/share, and account forms.
- CSS Modules and shared design tokens preserve the current calm visual
  direction without shipping a large component framework.
- Fonts use a local/system stack; no runtime font request is required.
- The application remains usable at desktop and narrow browser widths, but is
  never packaged or described as a mobile app.

### 6.2 Production hosting

Sites owns the production deployment:

1. create the Sites project once;
2. persist the opaque project ID in `.openai/hosting.json`;
3. configure runtime secrets through Sites environment variables;
4. push the exact source commit to GitHub and the Sites source repository;
5. build a supported OpenNext archive from that commit;
6. save a Sites version with the exact Git SHA;
7. publish the site publicly;
8. inspect deployment status and production worker logs.

The exact deployed source must match the public GitHub `main` commit.

### 6.3 External services

| Service           | Responsibility                                                  | Data boundary                                                                                                                                                                                                      |
| ----------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gemini API        | Context interpretation and bounded wording                      | Structured selections, optional short audio, relationship label, one reviewed claim, and at most two sanitized support preferences; never phone number, contact name, precise location, raw history, or timestamps |
| Supabase Auth     | Google OAuth and session identity                               | Google basic identity scopes only                                                                                                                                                                                  |
| Supabase Postgres | User-owned calm plan, contacts, and support memories            | Encrypted contact data and structured support-memory payloads; cleartext ownership, consent version, creation, and expiry metadata only                                                                            |
| Sites             | Next.js runtime, environment secrets, production versions, logs | Technical runtime metadata; application must not log user content                                                                                                                                                  |
| GitHub            | Public source history                                           | No credentials, environment values, generated builds, or user data                                                                                                                                                 |

## 7. Information architecture and journeys

### 7.1 Public routes

| Route        | Purpose                                                               |
| ------------ | --------------------------------------------------------------------- |
| `/`          | Product explanation plus individual and caregiver zero-typing journey |
| `/emergency` | Fixed India emergency renderer and base dispatcher script             |
| `/prevent`   | Account-free, zero-typing prevention-plan journey                     |
| `/plan`      | Optional encrypted cross-device plan editor                           |
| `/resources` | Reviewed India national and optional Kerala sources                   |
| `/privacy`   | Data inventory, processor disclosure, retention, user controls        |
| `/terms`     | Intended-use and product limitation terms                             |
| `/report`    | Minimal-data problem report that never interrupts emergency action    |

### 7.2 Account routes

| Route            | Purpose                                                        |
| ---------------- | -------------------------------------------------------------- |
| `/auth`          | Email/password and optional Google account access              |
| `/onboarding`    | Create, review, update, or erase the Support Card              |
| `/companion`     | Run a bounded, non-persistent Voice Companion session          |
| `/account`       | Saved plan, trusted contacts, export, sign-out, delete account |
| `/auth/callback` | Supabase PKCE code exchange and safe redirect                  |

### 7.3 Acute relay state machine

```text
landing
  └── role_selected
        └── context_capture
              └── explicit_safety_check
                    ├── emergency
                    ├── urgent_support
                    │     └── generating ──> result | fallback
                    └── coping
                          └── generating ──> result | fallback

result | fallback
  ├── speaking
  ├── copied
  ├── share_preview
  ├── external_handoff_opened
  ├── external_handoff_cancelled
  └── restart
```

The state model never treats `external_handoff_opened` as sent, connected, or
acknowledged.

### 7.4 Primary individual journey

1. Choose **I need help now**.
2. Select situation, goal, feeling, intensity band, and whether alone.
3. Optionally record up to ten seconds of audio.
4. Answer observable danger questions.
5. If no emergency route applies, receive at most three actions, a short
   speakable script, a support-message draft, and one reviewed source card.
6. Read, hear, copy, or review the draft before opening an external app.
7. Keep **Something changed / Call 112** visible.
8. Optionally tap **This helped** or **Not for me** to save one encrypted,
   90-day support memory. No result content is saved automatically.

### 7.5 Caregiver journey

1. Choose **I am supporting someone**.
2. Select observable facts rather than a diagnosis.
3. Check both medical danger and the caregiver's physical safety.
4. Emergency signals render the fixed route.
5. Otherwise generate one validating sentence, one small choice or question,
   and an optional boundary.
6. Never advise restraint, coercion, deception, threat, or secret monitoring.

### 7.6 Emergency journey

1. Any explicit emergency signal causes synchronous navigation to the fixed
   emergency renderer.
2. **Call 112 now** and the deterministic base dispatcher script render before
   any provider request.
3. Missing location, callback number, substance, and timing remain explicitly
   unknown.
4. A phone call begins only after a user tap.
5. The user is told to follow the dispatcher's instructions.
6. An optional, non-blocking Gemini call may simplify the confirmed script
   after the base script is visible. Invalid output is ignored atomically.

### 7.7 Prevention-plan journey

1. Select a likely trigger using a large tap target.
2. Select one first action.
3. Select one safer context.
4. Read, hear, or copy the resulting implementation-intention sentence.
5. Optionally save only to the current browser with an explicit tap.
6. Clear or replace the device-local plan at any time.
7. Cross-device account saving is a separate optional route.

## 8. Deterministic safety authority

Routing precedence is `emergency` → `urgent_support` → `coping`. The first
matching rule wins.

### 8.1 Emergency signals

- person not responding, unconscious, or cannot be awakened;
- absent, gasping, or seriously abnormal breathing;
- collapse or seizure;
- immediate suicide/self-harm attempt or inability to stay safe;
- serious injury, uncontrolled bleeding, or immediate physical danger;
- caregiver reports that they are currently unsafe.

`Not sure` follows the conservative emergency route. The interface asks about
observable signs and never requires a diagnosis.

### 8.2 Urgent-support signals

- strong craving while alone;
- responsive recent use or unknown amount/substance without an emergency sign;
- severe distress or concern that the situation may worsen;
- withdrawal concern without a selected emergency sign;
- self-harm thoughts without a stated immediate attempt or plan.

Urgent support always keeps the 112 escape action visible and exposes verified
human support before generated wording.

### 8.3 Coping route

Use only when the person is responsive and reports no emergency or urgent
signal. Return at most three non-medical actions and a support-person draft.

### 8.4 Defence in depth

- The client policy routes synchronously.
- The server independently re-runs the safety policy.
- The normal intervention endpoint rejects emergency-bearing input.
- Emergency routes bypass both retrieval lanes.
- The model receives only the tier, allowed action IDs, and one selected
  educational source plus at most two sanitized personal preferences; service
  IDs remain outside the prompt.
- Any output that changes action/resource authority is rejected.
- Voice-derived danger makes the model return a null intervention, then the
  server reruns deterministic routing before any normal content is returned.

## 9. Public contracts

All compile-time interfaces have matching Zod runtime schemas.

```ts
type Role = "individual" | "caregiver";
type RiskTier = "emergency" | "urgent_support" | "coping";
type Language = "en-IN";

interface Jurisdiction {
  country: "IN";
  state?: "KL";
}

interface SafetyInput {
  schemaVersion: "1.0";
  role: Role;
  situationIds: string[];
  observableSignalIds: string[];
  intensityBand: "manageable" | "strong" | "overwhelming";
  goalId: string;
  tone: "direct" | "warm" | "minimal";
  language: Language;
  jurisdiction: Jurisdiction;
  isAlone: boolean;
  supportRelationship?: string;
}

interface SafetyDecision {
  tier: RiskTier;
  reasonCode: string;
  actionIds: string[];
  resourceIds: string[];
  modelMayPersonalize: boolean;
}

interface NormalizedFacts {
  explicitFacts: string[];
  unknownFacts: string[];
  safetyConfirmationSignalIds: string[];
}

interface InterventionResult {
  schemaVersion: "1.0";
  headline: string;
  steps: Array<{ actionId: string; label: string }>;
  spokenSummary: string;
  verbatimScript: string;
  supportMessageDraft: string;
  mindsetReframe: string;
  sourceIds: string[];
  unknownFacts: string[];
  provider: "gemini-3.6-flash" | "deterministic";
  promptVersion: string;
  contentVersion: string;
  fallbackReason?: string;
}

interface ExternalActionState {
  state: "draft" | "reviewed" | "handoff_opened" | "cancelled" | "failed";
}
```

### 9.1 Server endpoints

| Endpoint                               | Contract                                                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/interventions`              | Bounded multipart request with serialized `SafetyInput` and optional audio; returns validated `InterventionResult`, `safety_recheck`, or typed fallback |
| `POST /api/emergency-script`           | Optional post-render wording assistance using confirmed facts and a fixed emergency decision                                                            |
| `GET /api/account/plan`                | Return the authenticated user's decrypted plan                                                                                                          |
| `PUT /api/account/plan`                | Validate, encrypt, and upsert one active plan                                                                                                           |
| `DELETE /api/account/plan`             | Delete the active plan                                                                                                                                  |
| `GET /api/account/contacts`            | Return decrypted user-owned contacts                                                                                                                    |
| `POST /api/account/contacts`           | Validate, encrypt, and create a contact                                                                                                                 |
| `PATCH /api/account/contacts/:id`      | Update an authenticated user-owned contact                                                                                                              |
| `DELETE /api/account/contacts/:id`     | Delete an authenticated user-owned contact                                                                                                              |
| `GET /api/account/support-memories`    | List the authenticated user’s unexpired, decrypted support-memory snapshots                                                                             |
| `POST /api/account/support-memories`   | Explicitly save one bounded encrypted memory with a 90-day expiry; same-origin and maximum-20 checks apply                                              |
| `DELETE /api/account/support-memories` | Delete one authenticated user-owned support memory                                                                                                      |
| `DELETE /api/account`                  | Cascade-delete saved data and Supabase identity                                                                                                         |
| `GET /api/health`                      | Release SHA and dependency readiness without secret values                                                                                              |

All writes require expected origin, authenticated ownership where applicable,
bounded bodies, runtime schemas, and typed errors. Stack traces and provider
payloads never reach the browser.

## 10. Gemini architecture

### 10.1 Provider

Use the official `@google/genai` SDK and exact stable model ID
`gemini-3.6-flash`. `GEMINI_MODEL` remains environment-configurable for
controlled migration, but production and test evidence record the exact model.

Use structured outputs. Do not send deprecated sampling parameters, request
chain-of-thought, enable tools, search the web, or expose action functions.

### 10.2 Single-pass multimodal artifact

Each non-emergency request makes at most one bounded Gemini call. When optional
audio exists, the same structured response extracts explicit facts and composes
the intervention. Tap-only requests send the normalized selections and require
empty audio-fact arrays. This avoids avoidable latency, cost, and failure modes
from sequential provider calls.

Inputs:

- validated `SafetyInput`;
- optional bounded audio treated as untrusted user data;
- the application-owned tier and action allowlist, excluding resource IDs;
- permitted action labels;
- exactly one route-selected approved source claim;
- zero to two relevant, unexpired, user-confirmed support memories containing
  only situation IDs, an allowlisted action ID, and helpfulness;
- relationship label, language, and tone.

Outputs:

- explicit and unknown audio facts;
- allowlisted observable safety-signal IDs;
- a maximum of three steps;
- a short speakable script;
- a support-message draft;
- one source-backed reframe;
- source IDs and explicit unknowns.

The model cannot assign the final tier. When it extracts any voice-derived
danger signal, its intervention field must be null; returning coping content
with danger is rejected. Application code merges the signal with tapped
signals, reruns deterministic routing, and renders the fixed 112 route. The
model cannot return phone numbers, URLs, diagnoses, external action status, or
free-form action identifiers.

Educational evidence is the only factual grounding lane. Personal memory is
preference data: it may affect wording or the order of already allowed actions,
but cannot add or remove actions, suppress human support, change safety
routing, or support a health claim. Caregiver requests never retrieve the
individual account’s personal memories.

### 10.3 Semantic validator

Structured JSON is necessary but insufficient. Server validation rejects:

- extra or missing keys;
- wrong tier/action/resource authority;
- more than three steps or more than two short script sentences;
- any source ID other than the exact selected route source, including a real
  but irrelevant source, duplicate source, or service ID;
- names, phone numbers, locations, substances, quantities, timing, or
  relationships not present in input;
- diagnosis, medication, dosage, taper, detox, first-aid, or treatment advice;
- false reassurance, confidence scores, efficacy claims, stigma, coercion, or
  action-delivery claims;
- URLs or phone-number-like strings in generated fields.

Invalid output is discarded as a whole and replaced with the deterministic
fallback. Partial output is never rendered.

### 10.4 Deadlines and budgets

- Audio: ten seconds and 1 MB maximum.
- Structured fields: fixed enums and short bounded strings.
- Client total deadline: seven seconds.
- One provider call with a seven-second server deadline.
- Automatic provider retries: none.
- Audio requests cost three budget units; tap-only requests cost one.
- Shared per-user ceilings: 10 units per ten minutes and 30 units per day.
- Response body target: under 15 KB.

Emergency rendering has no model or network dependency after the page is
loaded. The product does not claim offline operation.

## 11. Resource registry

Phone numbers, service names, URLs, jurisdiction, allowed tiers, and review
dates are application records, never model output.

Required record fields:

```ts
interface ResourceRecord {
  id: string;
  name: string;
  jurisdiction: "IN" | "IN-KL";
  tiers: RiskTier[];
  phone: string | null;
  alternatePhone?: string;
  ctaKind: "call" | "open_directory";
  sourceUrl: string;
  serviceScope: string;
  lastVerified: string;
  recheckAt: string;
  enabled: boolean;
}
```

### 11.1 India national pack

| ID                   | Action                           | Permitted tiers        |
| -------------------- | -------------------------------- | ---------------------- |
| `in.erss.112`        | Call 112                         | emergency              |
| `in.nmba.14446`      | Call 14446                       | urgent support, coping |
| `in.telemanas.14416` | Call 14416 or official alternate | urgent support, coping |

### 11.2 Optional Kerala pack

Kerala activates only after explicit state selection and supplements rather
than replaces the national pack:

- `in.kl.disha.1056`;
- `in.kl.vimukthi.directory`.

Expired, disabled, unreviewed, or unknown records cannot render or enter model
context. Release verification rechecks the official government pages.

### 11.3 Retrieval policy

Version 1 uses deterministic metadata filtering rather than open-web search or
vector similarity. The educational lane returns exactly one approved claim for
the role and non-emergency tier. This keeps relevance inspectable and prevents
embedding similarity from laundering an irrelevant but real health source into
the prompt. The corpus can grow, but every added chunk still requires an exact
source ID, approved claim, permitted roles and tiers, review date, and expiry.

## 12. Authentication and account lifecycle

### 12.1 Email and Google authentication

Supabase manages email/password sessions and optional Google OAuth using PKCE
and cookie-based SSR sessions.

- Request only `openid`, `email`, and `profile`.
- Do not request Google Contacts.
- Validate redirects against an allowlist.
- Exchange the authorization code only in `/auth/callback`.
- Validate server identity with `auth.getUser()`, not untrusted client claims.
- Keep urgent routes public if auth is unavailable.
- Launch in Google testing mode; test-user restrictions are disclosed.

### 12.2 Session security

- Secure, HTTP-only, SameSite cookies in production.
- Short, bounded post-auth redirect paths; no open redirect.
- Origin and CSRF checks for state-changing endpoints.
- No authorization decision uses user-editable Google metadata.
- Sign-out clears the Supabase session and decrypted client state.

### 12.3 Account deletion

Deletion requires an authenticated confirmation screen. The server:

1. verifies the current user;
2. deletes user-owned rows through cascade constraints;
3. deletes the Supabase Auth user with the server-only service credential;
4. clears the session;
5. returns no deleted content.

The user can delete the plan or individual contacts without deleting the
account.

## 13. Data model and authorization

### 13.1 `saved_plans`

| Column                     | Purpose                                       |
| -------------------------- | --------------------------------------------- |
| `user_id uuid primary key` | References `auth.users(id) on delete cascade` |
| `ciphertext text`          | Encrypted validated plan payload              |
| `iv text`                  | Random AES-GCM IV                             |
| `auth_tag text`            | AES-GCM authentication tag                    |
| `key_version smallint`     | Encryption-key version                        |
| `created_at`, `updated_at` | Server timestamps                             |

### 13.2 `trusted_contacts`

| Column                     | Purpose                                       |
| -------------------------- | --------------------------------------------- |
| `id uuid primary key`      | Random identifier                             |
| `user_id uuid unique`      | References `auth.users(id) on delete cascade` |
| `ciphertext text`          | Encrypted validated contact payload           |
| `iv text`                  | Random AES-GCM IV                             |
| `auth_tag text`            | AES-GCM authentication tag                    |
| `key_version smallint`     | Encryption-key version                        |
| `created_at`, `updated_at` | Server timestamps                             |

### 13.3 `support_memories`

| Column                         | Purpose                                                 |
| ------------------------------ | ------------------------------------------------------- |
| `id uuid primary key`          | Random identifier                                       |
| `user_id uuid`                 | References `auth.users(id) on delete cascade`           |
| `ciphertext`, `iv`, `auth_tag` | Encrypted validated memory payload                      |
| `key_version smallint`         | Encryption-key version                                  |
| `consent_version text`         | Exact explicit-save contract; currently `1.0`           |
| `expires_at`                   | Automatic 90-day retrieval and retention boundary       |
| `created_at`                   | Server timestamp used only for bounded recency ordering |

The encrypted payload contains only situation IDs, one allowlisted action ID,
`helpful` or `not_helpful`, and its consent, save, and expiry metadata. There is
no free text, audio, transcript, generated intervention, diagnosis, medication,
substance, precise location, caregiver observation, or external action result.
Each account may retain at most 20 unexpired memories.
Supabase Cron permanently deletes expired rows daily; account data access also
purges the current user’s expired rows before listing or saving.

### 13.4 Shared request-budget state

The RLS-enabled `public.request_budgets` table has no direct anonymous or
authenticated table grants. An atomic, narrowly validated security-definer RPC
stores:

- HMAC-SHA256 subject identifier derived from network context plus a
  browser-generated anonymous UUID and a server secret;
- ten-minute or daily budget kind, window start, and used cost;
- no raw IP, request content, email, or phone.

The API HMACs the subject before the RPC. Serverless instances therefore share
one atomic budget suitable for the initial 100-user release. A separate global
daily provider budget prevents rotating client identifiers from creating
unbounded cost. An in-process budget is retained only for local development
without Supabase. If configured shared storage fails, live personalization
fails closed to the complete deterministic fallback.

### 13.5 Row-level security

Every exposed table has RLS enabled and explicit `authenticated` policies:

- `select`: `(select auth.uid()) = user_id`;
- `insert`: `with check ((select auth.uid()) = user_id)`;
- `update`: matching `using` and `with check`;
- `delete`: matching `using`.

Indexes cover `user_id` and foreign-key fields. Anonymous users have no table
privileges. The service role exists only in Sites server secrets.

## 14. Sensitive-field encryption

Contact names, phone numbers, safe-place labels, and structured support-memory
payloads use server-side AES-256-GCM.

- `CONTACT_DATA_KEY_V1` is a 32-byte secret in Sites.
- Every encrypted field gets a new random 96-bit IV.
- Associated data binds ciphertext to `user_id`, record ID, field name, and key
  version.
- Ciphertext, IV, and key version are stored; the key is never stored in
  Supabase or returned to the browser.
- Decryption occurs only after authentication and ownership checks.
- Key rotation reads old versions and rewrites with the newest version during
  a verified update.

Contact names and phone numbers never enter Gemini prompts. Generation receives
only a relationship label; the browser inserts the decrypted display name into
a validated placeholder after generation.

## 15. Privacy and logging

### 15.1 Stored

- Supabase identity required for OAuth.
- User-confirmed calm-plan selections.
- Explicitly saved support-memory snapshots for at most 90 days.
- Encrypted contact name and phone.
- Encrypted non-precise safe-place label.
- Technical creation/update timestamps.

### 15.2 Not stored

- Automatically captured crisis selections, interventions, generated scripts,
  audio, transcript, location, diagnosis, medication, substance history,
  caregiver observations, share contents, or call/message outcome.

### 15.3 Provider disclosure

Before audio upload, explain that the audio leaves the browser for Gemini
processing. Haven discards it after the request. Do not promise that the
provider has zero retention; link to the applicable provider terms.

### 15.4 Operational telemetry

Allowed fields:

- random request ID;
- broad route ID and tier;
- release SHA;
- model and prompt version;
- source IDs and content version;
- latency, response status, schema-valid flag, fallback reason.

Forbidden fields:

- raw request/response body, transcript, audio, generated text, email, contact
  name/phone, safe-place label, location, or OAuth token.

## 16. Security architecture

### 16.1 Threats and controls

| Threat                               | Control                                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Modified client bypasses safety      | Server independently validates and routes; emergency input rejected from normal generation         |
| Prompt injection in audio            | Audio is untrusted data, no tools, fixed schemas, allowlisted IDs, semantic validation             |
| Model hallucinates medical advice    | Prohibited-content and faithfulness validator; atomic fallback                                     |
| IDOR/account data exposure           | Server user verification, RLS, ownership checks, encrypted sensitive fields                        |
| Contact data enters AI/logs          | Separate account and AI DTOs; redaction tests; no contact fields in prompt builder                 |
| Memory becomes covert tracking       | Explicit post-result tap, strict no-free-text schema, 90-day expiry, maximum 20, per-item deletion |
| Cross-person memory disclosure       | Auth ownership plus RLS; caregiver mode receives an empty personal lane                            |
| Personal preference overrides safety | Safety routing precedes retrieval; prompt and validator retain fixed action/source authority       |
| Secret leaks to client/repo          | Server-only environment names, bundle scan, secret scan, `.env` ignore                             |
| CSRF/open redirect                   | SameSite cookies, origin checks, redirect allowlist                                                |
| XSS                                  | React text rendering, CSP, no unsafe HTML                                                          |
| Abuse/cost exhaustion                | Body bounds, HMAC rate limiting, provider deadlines, no retries                                    |
| Stale resource                       | Verification dates, build-time expiry test, release recheck                                        |

### 16.2 HTTP headers

Production responses set:

- Content Security Policy with `default-src 'self'`, no objects, no framing,
  and explicit Supabase connection origins;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy: camera=(), geolocation=(), microphone=(self)`;
- `Strict-Transport-Security` in production;
- `frame-ancestors 'none'` and `base-uri 'self'`.

Next.js nonce handling must support its own scripts without weakening the
policy to unrestricted inline execution.

## 17. Accessibility and interaction standards

The target is WCAG 2.2 AA plus stress-oriented usability.

- One primary action per state and no more than three intervention steps.
- Primary controls at least 48 × 48 CSS px.
- Semantic landmarks, headings, fieldsets, legends, labels, lists, and links.
- Complete keyboard and tap path; voice is optional.
- Visible focus, logical focus order, modal focus trap/return, and Escape.
- Status changes announced through appropriate live regions.
- Text remains visible for all spoken output.
- No color-only state; icons and explicit labels accompany color.
- Body text at least 16 CSS px and correct 200% zoom/reflow.
- `prefers-reduced-motion` removes nonessential motion.
- Speech synthesis has explicit start/stop controls.
- Microphone denial preserves all selections and never fabricates transcript.
- Copy/share errors are visible and do not claim delivery.
- Account authentication avoids memory tests, puzzles, or transcription
  requirements.

Narrow browser testing is an accessibility/reflow check, not a mobile-app
deliverable.

## 18. Code quality standards

The code follows the Google TypeScript Style Guide where compatible with
Next.js:

- UTF-8, consistent imports, `import type`, lower camel case, and explicit
  structural interfaces;
- strict compiler settings including `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`;
- no `@ts-ignore`, `@ts-nocheck`, `eval`, dynamic function construction,
  prototype mutation, or unsafe globals;
- no unbounded `any`; unknown external input is parsed through runtime schemas;
- public/non-obvious exports have concise JSDoc;
- complex policy is pure and free of React/server dependencies;
- errors use typed codes and do not depend on parsing message strings;
- formatting, typecheck, lint, tests, and build are deterministic.

Subsystem boundaries:

- `domain/safety`: pure routing, action and emergency-script policy;
- `domain/contracts`: TypeScript types and Zod schemas;
- `domain/resources`: reviewed data and expiry rules;
- `server/ai`: prompt builders, provider adapter, semantic validator;
- `server/auth`: Supabase SSR and authenticated-user guard;
- `server/crypto`: AES-GCM field encryption;
- `server/data`: plan/contact repositories;
- `ui/relay`: state machine and accessible presentation;
- `platform/actions`: audio, speech, clipboard, share, and call adapters.

## 19. Efficiency and performance budgets

- Fixed emergency rendering: under 100 ms after explicit selection on a
  supported loaded browser.
- Tap-only model path: P95 under four seconds in the configured test account.
- Optional-audio path: fallback by seven seconds.
- Core Web Vitals targets at the 75th percentile: LCP ≤ 2.5 s, INP ≤ 200 ms,
  CLS ≤ 0.1.
- Initial route first-load JavaScript target: ≤ 200 KB gzip.
- No client Supabase data query on public acute routes.
- Educational retrieval is a small deterministic static lookup; personal
  retrieval decrypts at most 20 owned rows and supplies at most two matches.
- No vector database, open-web retrieval, cross-user search, or embedding of
  personal data.
- No live web search, AI tool call, long history, provider retry loop, or
  duplicate model request.
- Dynamic imports isolate account and audio code from the landing route.

## 20. Verification strategy

### 20.1 Unit tests

- Full deterministic safety truth table including `Not sure`.
- Emergency precedence over intensity or requested goal.
- Urgent-support cases and caregiver-safety cases.
- Deterministic emergency script uses only confirmed facts.
- Resource allowlist, jurisdiction, expiry, and disabled status.
- Emergency RAG bypass; exact educational retrieval; personal matching,
  expiry, maximum-two context, and caregiver isolation.
- Support-memory schema rejects free text and sensitive health/history fields.
- Runtime schema bounds and exact keys.
- Semantic validator: medical advice, false reassurance, confidence, invented
  source, prompt injection, PII, URL/phone, and action hallucination.
- Stable deterministic fallback.
- AES-GCM round-trip, wrong-user associated-data failure, and key version.
- External-action state transitions.

### 20.2 Integration tests

- Gemini valid structured output.
- Timeout, quota/5xx, malformed JSON, extra keys, unsafe semantic content,
  unknown source/action ID, and prompt injection.
- Audio unsupported/oversized and deterministic voice-signal safety recheck.
- Auth callback and redirect allowlist.
- Two-user RLS isolation.
- Plan/contact ownership, encryption, export, clear, and cascade deletion.
- Client bundle contains no server secret or service-role key.
- Logs contain no request content or account data.

### 20.3 End-to-end tests

- Individual coping and urgent-support flows.
- Caregiver support and caregiver-danger flows.
- Emergency route renders 112 before any AI result.
- Live AI and deterministic fallback.
- Microphone denied, speech unavailable, copy failure, share cancelled.
- Google OAuth test-user sign-in.
- Save, reload, export, clear, and delete plan/contact data.
- Delete account and verify data/session removal.
- Keyboard-only, focus management, 200% zoom, reduced motion, desktop and
  narrow-browser reflow.

### 20.4 Release gate

The release command runs:

1. format check;
2. TypeScript compiler;
3. Oxlint with warnings denied;
4. unit/integration tests with focused coverage;
5. production build;
6. dependency audit;
7. secret scan;
8. Playwright journeys and axe checks;
9. production smoke test;
10. Sites worker-log inspection.

No release may claim live AI, account persistence, offline behavior, external
delivery, or clinical suitability without direct production evidence.

## 21. Environment contract

Public configuration:

```text
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Server-only secrets:

```text
GEMINI_API_KEY
GEMINI_MODEL=gemini-3.6-flash
SUPABASE_SERVICE_ROLE_KEY
CONTACT_DATA_KEY_V1
CONTACT_DATA_KEY_VERSION=1
RATE_LIMIT_HMAC_KEY
```

Non-secret release configuration:

```text
CONTENT_VERSION=2026-07-25
PROMPT_INTERVENTION_VERSION=haven-intervention-2
DEFAULT_JURISDICTION=IN
DEMO_MODE=false
```

`.env.example` contains names and safe placeholders only. Real values exist in
local untracked environment files and Sites production environment variables.

## 22. Delivery sequence

1. Commit this architecture by itself.
2. Migrate the current visual spike into the Next.js/TypeScript boundaries.
3. Implement deterministic safety and resource tests first.
4. Implement Gemini schemas, prompts, validators, and fallback.
5. Implement Supabase migrations, Google OAuth, encryption, and account APIs.
6. Complete the public and account journeys.
7. Run local quality, security, efficiency, testing, and accessibility gates.
8. Authenticate and push the verified commit to the public GitHub repository.
9. Create/configure Sites once and push the identical source commit.
10. Save and publicly deploy the verified Sites version.
11. Inspect production logs and exercise the full live/fallback/account paths.
12. Update README and workspace index only with confirmed URLs and behavior.

## 23. Stop-ship conditions

- Any emergency route waits for Gemini, auth, Supabase, or network.
- Any authored emergency fixture misses the 112 route.
- Gemini can return medication, detox, first-aid, diagnosis, false reassurance,
  or an invented resource/action.
- A phone number or source is stale, mixed-jurisdiction, or unverified.
- Raw crisis content, audio, contact data, or secrets appear in logs/bundles.
- One authenticated user can access another user's row.
- Contact details are stored unencrypted or enter a Gemini request.
- Draft/share handoff is labelled sent, delivered, connected, or acknowledged.
- The core journey requires voice, typing, account, or precise location.
- Keyboard, screen-reader, focus, zoom/reflow, or reduced-motion gates fail.
- The repository and deployed Sites version do not identify the same commit.
- The release is described as a mobile app, medical device, clinically
  validated service, treatment provider, or emergency dispatcher.

## 24. Decision record

| Decision       | Choice                                          | Reason                                                                      |
| -------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| Form factor    | Responsive browser app only                     | Meets the user's explicit no-mobile-app boundary                            |
| Framework      | Sites-supported Next.js App Router + TypeScript | Full-stack server boundary, SSR auth, production packaging, maintainability |
| AI             | Gemini 3.6 Flash structured output              | Current stable Google model with multimodal and schema support              |
| Safety         | Deterministic application policy                | Model latency or error cannot own emergency action                          |
| Retrieval      | Static reviewed source registry                 | Faster, auditable, and safer than crisis-time web/vector search             |
| Persistence    | Supabase Auth/Postgres                          | Google OAuth, RLS, clear user ownership and deletion                        |
| Sensitive data | AES-256-GCM field encryption                    | Limits database disclosure impact for contacts and labels                   |
| OAuth launch   | Google testing mode                             | Allows verified first release before production brand approval              |
| Emergency data | Fixed India national pack                       | Complete national route without silent state/location inference             |
| Mobile/PWA     | No manifest or service worker                   | Avoids packaging or representing the site as a mobile app                   |
| Analytics      | None                                            | Not required for primary value; avoids crisis-data collection risk          |
| Deployment     | Sites, exact source SHA                         | Versioned public production with source provenance                          |
