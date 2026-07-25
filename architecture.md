# Haven Relay Architecture

## 1. Document purpose

This document defines the implemented architecture of Haven Relay, a
browser-only PromptWars application for adults navigating a substance-use
related high-load moment and the people supporting them. It is the engineering
source of truth for system boundaries, safety authority, Gemini integration,
resource provenance, privacy, accessibility, verification, and deployment.

The architecture is intentionally narrow. Haven Relay is not a native mobile
application, a chatbot, a medical device, a diagnostic system, a treatment
provider, a monitoring service, or an emergency dispatcher.

## 2. Architectural goals

The system must:

1. make the first useful action reachable without typing or login;
2. route explicit observable danger before any provider or network call;
3. use Gemini for bounded language personalization, not clinical decisions;
4. preserve a complete and honestly labelled deterministic fallback;
5. resolve every phone number, service, and source link from application data;
6. let the user review every external handoff;
7. expose no provider secret or unrestricted prompt to the browser;
8. remain understandable, testable, resource-light, and deployable in minutes;
9. keep the emergency shell usable when the network or model is unavailable;
10. make implemented, fallback, and external-action states visually distinct.

## 3. Evaluation architecture

The supplied PromptWars evaluation material identifies Problem Statement
Alignment as a high-impact anchor and five implementation benchmarks:

| Benchmark | Architectural evidence |
| --- | --- |
| Code Quality | Pure safety and fallback functions; separate data, policy, client adapter, server adapter, UI, and tests; explicit contracts; no global mutable domain state |
| Security | Server-only key; allowlisted enums and source IDs; bounded input/output; semantic rejection; no request-body logging; CSP and browser permission restrictions |
| Efficiency | One bounded provider call; 5-second server timeout; 6.5-second client deadline; no database/auth/maps/analytics SDK; small static source registry |
| Testing | Deterministic tests for emergency precedence, urgent routing, stable fallback, observable-fact scripts, and action honesty; build gate |
| Accessibility | Complete tap path; semantic headings and fieldsets; visible focus; 48 px primary controls; reduced-motion mode; text alternative to speech; responsive reflow |

Conditional Google-services evidence is the server-owned Gemini structured-output
adapter. Gemini is materially useful: it adapts the sentence and support draft
to structured context and optional speech. It never controls emergency routing,
resource selection, message delivery, or hidden external actions.

## 4. System context

```text
Adult seeking support ─┐
                       ├── HTTPS ──> Haven Relay web application
Caregiver/supporter ───┘                   │
                                          ├── local safety policy
                                          ├── local resource registry
                                          ├── browser speech APIs (optional)
                                          ├── browser share/clipboard (user action)
                                          └── /api/intervention
                                                   │
                                                   └── Gemini API (optional)

Emergency Response Support System <── tel:112 user action
NMBA / Tele-MANAS                 <── tel: links user action
Official government sources      <── source links user action
```

No Haven-controlled database, account provider, analytics pipeline, mapping
service, camera, or background location service exists.

## 5. Container view

```text
┌──────────────────────────────── Browser ────────────────────────────────┐
│ React UI                                                               │
│  ├── landing and role selection                                        │
│  ├── zero-typing context capture                                       │
│  ├── explicit observable-danger checks                                 │
│  ├── emergency renderer                                                │
│  ├── intervention renderer                                             │
│  ├── reviewed share handoff                                            │
│  └── calm-plan local storage                                           │
│                                                                        │
│ Domain modules                                                         │
│  ├── routeSafety()              pure deterministic policy              │
│  ├── buildEmergencyScript()     pure confirmed-facts composer          │
│  ├── createFallback()           pure reviewed fixture                  │
│  └── resources                  fixed source/number registry           │
│                                                                        │
│ Platform adapters                                                      │
│  ├── requestIntervention()      one API request + timeout + fallback    │
│  ├── SpeechRecognition          optional input                         │
│  ├── speechSynthesis            optional output                        │
│  ├── navigator.share/clipboard  explicit external handoff              │
│  └── service worker             static emergency-shell cache           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ same-origin HTTPS
┌──────────────────────── Vercel serverless function ────────────────────┐
│ POST /api/intervention                                                │
│  1. method and body-size gate                                         │
│  2. enum, length, range, and signal validation                        │
│  3. reject any emergency signal                                       │
│  4. construct bounded system task and untrusted-context section       │
│  5. call configured Gemini model once with JSON schema                │
│  6. parse, length-check, source-check, and semantic-check output       │
│  7. return safe artifact or typed failure                             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ x-goog-api-key; 5-second deadline
                           ┌────────▼────────┐
                           │ Gemini API      │
                           │ structured JSON │
                           └─────────────────┘
```

## 6. Repository structure

```text
haven-relay/
├── api/
│   └── intervention.js       server-owned Gemini boundary and validators
├── public/
│   ├── manifest.webmanifest  web metadata; no native app packaging
│   └── sw.js                 minimal application-shell cache
├── src/
│   ├── data/
│   │   └── resources.js      official services and reviewed lesson metadata
│   ├── lib/
│   │   ├── intervention.js   browser API adapter and fallback selection
│   │   └── safety.js         deterministic tiers, scripts, and fixtures
│   ├── App.jsx               accessible state flow and platform handoffs
│   ├── main.jsx              React entry and production SW registration
│   └── styles.css            tokens, layouts, focus, reflow, reduced motion
├── tests/
│   └── safety.test.js        policy and fallback unit tests
├── .env.example              server-only configuration contract
├── architecture.md           this document
├── index.html                browser entry document
├── package.json              scripts and pinned dependency ranges
└── vercel.json               build, SPA routing, and security headers
```

Generated folders (`node_modules`, `dist`, `.vercel`) and local secrets are
excluded from Git.

## 7. Primary runtime flows

### 7.1 Non-emergency individual relay

1. The user chooses **I need help now**.
2. Taps capture situation, emotion, goal, intensity, and whether the user is
   alone. Voice context is optional and capped at 240 characters.
3. The user explicitly confirms whether observable danger signs are present.
4. `routeSafety()` returns `coping` or `urgent_support`.
5. The UI renders the safety decision before invoking the model adapter.
6. `requestIntervention()` makes one same-origin POST request.
7. The server validates input and calls Gemini once.
8. The server accepts only schema-conforming, allowlisted, semantically safe
   output.
9. A safe model result or reviewed fallback renders in the same card shape.
10. The user may hear or copy the sentence, review a support draft, or open an
    official source.

### 7.2 Caregiver relay

The caregiver uses the same safety gate but receives language framed around
observable facts, calm presence, one small choice, and supporter boundaries.
The caregiver interface never exposes another person's activity history,
location, sobriety status, or private data because none is collected.

### 7.3 Emergency route

1. Any selected emergency signal causes `routeSafety()` to return `emergency`.
2. No call to `/api/intervention` occurs.
3. The emergency renderer displays **Call 112 now** and the official registry
   record synchronously from the JavaScript bundle.
4. `buildEmergencyScript()` includes only the facts selected by the user.
   Missing location is explicitly shown as `[say your location]`.
5. A phone call begins only after the user taps the `tel:112` link and confirms
   through their device.
6. The user is told to follow the dispatcher's instructions. The application
   does not generate first-aid, medication, dosing, detox, or monitoring advice.

### 7.4 Provider failure

Timeout, offline state, missing key, non-2xx provider response, invalid JSON,
unknown source ID, prohibited language, or a schema/length failure produces the
same result: discard the output and render `createFallback()`.

The fallback badge reads **Reviewed fallback · provider unavailable**. It never
uses an AI confidence score and never implies that Gemini generated the card.

### 7.5 Share handoff

1. The intervention contains a draft, not a send command.
2. The exact draft is shown in a modal before any OS handoff.
3. **Open share options** invokes `navigator.share()` only on a user gesture.
4. Unsupported sharing falls back to clipboard copy.
5. Haven does not show *sent*, *delivered*, or *acknowledged*, because it cannot
   observe those states.

### 7.6 Calm plan

Support name, safe place, and preferred tone are optional. They are stored only
in browser `localStorage` after explicit confirmation. The modal warns that
another person using the same browser profile may see the plan. Calm-plan data
is not sent to `/api/intervention` in the implemented release.

## 8. Deterministic safety authority

Safety is policy-owned, not prompt-owned.

```text
any explicit emergency signal?
    yes ──> emergency; modelMayPersonalize=false; resource=in.erss.112
    no
    │
urgent signal OR intensity >= 8 while alone?
    yes ──> urgent_support; verified human-support resources visible
    no  ──> coping; bounded personalized communication allowed
```

Emergency signal IDs:

- `not_responding`
- `abnormal_breathing`
- `seizure`
- `collapsed`
- `immediate_danger`

The API separately rejects a request containing any emergency signal. This is
defence in depth against a modified client trying to reach the model on an
emergency path.

## 9. Public contracts

### 9.1 Client request

```ts
interface InterventionInput {
  role: "individual" | "caregiver";
  situation: "social_pressure" | "stress" | "loneliness" | "pain";
  intensity: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  emotion: "overwhelmed" | "anxious" | "ashamed" | "angry" | "numb";
  goal: "leave_safely" | "call_someone" | "get_through_minute";
  tone: "direct" | "calm" | "gentle";
  alone: boolean;
  signalIds: EmergencySignalId[];
  voiceContext: string; // 0..240 characters
}
```

### 9.2 Policy decision

```ts
interface SafetyDecision {
  tier: "emergency" | "urgent_support" | "coping";
  reasonCode: string;
  modelMayPersonalize: boolean;
  resourceIds: string[];
}
```

### 9.3 Intervention artifact

```ts
interface InterventionResult {
  headline: string;
  immediateAction: string;
  verbatimScript: string;
  supportMessageDraft: string;
  mindsetReframe: string;
  lessonId: "cravingWave" | "caregiverPresence";
  sourceIds: ["haven.craving-wave.v1" | "haven.caregiver-presence.v1"];
  provider: string;
  demoMode: boolean;
}
```

No response field grants permission to call, message, dispatch, store, monitor,
or share anything.

## 10. Gemini architecture

### 10.1 Provider choice

`GEMINI_MODEL` is configurable server-side and defaults to
`gemini-2.5-flash`, a stable structured-output capable model. The exact
available model must be verified in the deployment account before a demo.
Changing the model does not change public contracts or safety authority.

### 10.2 Prompt boundary

The server prompt contains:

- the single system role: personalize bounded support language;
- the policy-owned tier;
- normalized structured fields;
- optional voice context clearly delimited as untrusted data;
- prohibited output categories;
- the one allowed source ID;
- a JSON schema supplied through the provider configuration.

The prompt does not ask for hidden reasoning, autonomous actions, web search,
resource selection, diagnosis, or risk classification.

### 10.3 Structured output

Gemini receives `responseMimeType: application/json` and a JSON schema. Schema
conformance is necessary but not sufficient. Server code additionally checks:

- all required string fields exist;
- string length is between 3 and 360 characters;
- exactly one source ID is returned;
- the source ID is allowlisted;
- prohibited medical, confidence, or safety language is absent.

Invalid output is discarded atomically. Partial model output is never rendered.

### 10.4 Call budget

- maximum provider calls per user action: one;
- client deadline: 6.5 seconds;
- server/provider deadline: 5 seconds;
- transcript budget: 240 characters;
- request-body budget: 12 KB;
- source records in prompt: one allowlisted ID;
- retry loop: none.

This keeps latency, cost, failure surface, and prompt-injection exposure small.

## 11. Resource governance

Phone numbers, service names, links, and verification dates live in
`src/data/resources.js`, never in model output. The current India national pack
contains:

| ID | Purpose | Number |
| --- | --- | --- |
| `in.erss.112` | immediate emergency action | 112 |
| `in.nmba.14446` | substance-use counselling/information/referral | 14446 |
| `in.telemanas.14416` | national mental-health support | 14416 |

The registry records official source URLs and a review date. “Reviewed” means
the published government source was checked; it is not a claim that a test call
was placed, that availability is guaranteed, or that the service is suitable
for every person.

Before any real-world release:

- recheck each official page and phone number;
- record a named content owner and next-review date;
- suspend stale or unverifiable records;
- obtain qualified Indian clinical, crisis, harm-reduction, accessibility, and
  lived-experience review.

## 12. Security and privacy

### 12.1 Trust boundaries

Untrusted data includes all browser request fields, speech transcripts, model
output, and service-worker cache entries. Trusted policy and resource records
are application source under version control.

### 12.2 Secret handling

- `GEMINI_API_KEY` exists only in the server deployment environment.
- No `VITE_` prefix is used for the provider key.
- The client bundle contains no key and no provider authorization logic.
- `.env`, `.env.local`, and `.vercel` are ignored.

### 12.3 Input and output controls

- POST is the only accepted API method.
- Body size, enums, integer ranges, booleans, arrays, signals, and transcript
  length are checked.
- An emergency-bearing request is rejected by the server even if the browser
  decision was modified.
- Output uses React text rendering; no `dangerouslySetInnerHTML` exists.
- Model source IDs and lengths are allowlisted.
- Request and response bodies are not logged by application code.

### 12.4 Browser headers

Vercel applies:

- Content Security Policy limited to the same origin;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `frame-ancestors 'none'`;
- strict-origin referrer policy;
- camera and geolocation permissions disabled.

Microphone access is not granted globally. Browser speech recognition is
created only after a direct user action.

### 12.5 Data minimization

There is no account, server persistence, database, analytics, passive
monitoring, background microphone, camera, or location collection. Browser
speech implementations may use a platform speech service; the UI describes
voice as optional and never fabricates a transcript when unavailable.

## 13. Accessibility

The accessibility target is WCAG 2.2 AA plus crisis-oriented stress usability.

Implemented provisions:

- the complete primary journey is tap/keyboard operable without speech;
- headings, landmarks, `fieldset`, `legend`, labels, and dialog roles organize
  the interface;
- primary buttons meet or exceed 48 CSS px;
- selected choices include shape/check state rather than color alone;
- `:focus-visible` provides a high-contrast focus ring;
- text remains present when read-aloud is used;
- speech unsupported/error states are explicit and non-blocking;
- the layout reflows to one column without horizontal scrolling;
- reduced-motion preference removes nonessential movement;
- emergency red is paired with icons, headings, and explicit language;
- call, copy, share, and source actions have visible text labels.

Required human verification before release:

- keyboard-only traversal and dialog focus containment;
- VoiceOver/NVDA/TalkBack announcement order;
- 200% and 400% zoom;
- contrast measurement;
- one-handed use at narrow browser widths;
- cognitive walkthrough with lived-experience reviewers.

Responsive browser support does not turn the product into a native mobile app.

## 14. Efficiency and resilience

The production design deliberately excludes database, auth, maps, chat
history, camera/media SDKs, analytics, and multiple model calls. Static assets
are bundled by Vite and can be cached. The service worker uses network-first
fetch with a cached application-shell fallback.

Emergency data is part of the client bundle and does not depend on:

- Gemini;
- the serverless function;
- a database;
- microphone availability;
- location permission;
- an authenticated session.

The CSS uses system fonts, eliminating a render-blocking external font request
and improving cold-start/offline behavior.

## 15. Verification strategy

### 15.1 Automated unit tests

`npm test` currently proves:

- emergency precedence over lower-risk context;
- high intensity while alone routes to urgent human support;
- ordinary context remains on the coping route;
- emergency scripts include only selected observable facts and explicit
  unknown location;
- fallback output is deterministic;
- fallback output never claims a message was sent or delivered.

### 15.2 Build gate

`npm run verify` runs tests followed by a production Vite build. The build
validates module resolution and produces the deployable `dist` artifact.

### 15.3 Required browser checks

Before submission:

1. run the individual non-emergency path;
2. run the caregiver non-emergency path;
3. select each danger signal and confirm no `/api/intervention` call occurs;
4. block the API and confirm the labelled fallback;
5. deny microphone and complete the tap path;
6. open/cancel the share sheet and confirm no delivery claim;
7. verify keyboard focus and Escape/close behavior;
8. inspect narrow and desktop screenshots;
9. load the built application with the network disabled and open emergency
   content;
10. inspect the client bundle for `GEMINI_API_KEY` and secret values.

### 15.4 Safety red-team cases

The next automated layer should cover modified-client requests, prompt
injection in `voiceContext`, provider invalid JSON, unknown source IDs,
prohibited medical wording, timeout, and excessive field lengths. Any failure
uses the reviewed fallback; it never attempts a repair loop with the model.

## 16. Deployment

Vercel is the deployment target:

```text
GitHub repository
    └── Vercel build: npm run build
            ├── static dist/ web app
            └── api/intervention.js serverless function
```

Required environment variables:

| Variable | Required | Scope |
| --- | --- | --- |
| `GEMINI_API_KEY` | optional for fallback-only; required for live AI | server only |
| `GEMINI_MODEL` | optional | server only |

The application must deploy and operate in fallback mode before model
configuration. Production verification must distinguish:

- application deployment health;
- Gemini environment/configuration health;
- external government-service availability.

One cannot be inferred from another.

## 17. Failure-mode table

| Failure | User-visible behavior | Safety invariant |
| --- | --- | --- |
| Gemini key missing | reviewed fallback badge and complete card | emergency still local |
| Provider timeout/quota/network error | reviewed fallback | no blank or endless spinner |
| Invalid/unsafe model JSON | output discarded; fallback | unsafe partial text never renders |
| Microphone unavailable/denied | explicit message; tap path continues | no fake transcript |
| Speech synthesis unavailable | visible script remains | no claim that audio played |
| Web Share unavailable | copy fallback | no delivery claim |
| Clipboard unavailable | visible text remains | no false “copied” state |
| Offline after shell cached | cached shell and local emergency data | call action still user-controlled |
| Unknown or stale source | source excluded in a release update | model cannot invent replacement |
| Modified client sends danger to API | server rejects request | provider cannot become safety authority |

## 18. Observability

The implemented app has no analytics or custom logging. If operational
telemetry is added, permitted fields are limited to:

- route name without user text;
- provider success/failure category;
- coarse latency bucket;
- prompt/schema/application version;
- fallback boolean;
- client build version.

Prohibited telemetry includes transcript, generated crisis text, selected
health signals, phone numbers, local plan data, clipboard contents, precise
location, IP-derived profiles, and user identifiers.

## 19. Google engineering principles applied

The implementation follows the relevant general principles used across Google
web and cloud guidance:

- least privilege and server-owned credentials;
- defence in depth rather than prompt-only safety;
- explicit, validated contracts at trust boundaries;
- small pure domain functions with deterministic tests;
- graceful degradation and honest capability states;
- bounded work, deadlines, no unbounded retry, and no hidden side effects;
- accessible semantic HTML and input alternatives;
- data minimization and privacy by design;
- source-controlled configuration and reproducible build commands;
- observability without sensitive payload collection.

This does not claim Google certification, endorsement, clinical validation, or
compliance with an unspecified Google internal standard.

## 20. Architecture decisions

### ADR-001 — Browser-only web application

**Decision:** ship React/Vite as a responsive website, not a native mobile app.

**Reason:** the challenge requires rapid, low-friction access and multimodal
browser capability, not app-store packaging. A browser build is faster to
deploy, audit, and demo.

### ADR-002 — Deterministic safety before Gemini

**Decision:** code owns emergency routing.

**Reason:** provider latency, hallucination, or downtime must never delay or
downgrade explicit observable danger.

### ADR-003 — One structured provider call

**Decision:** use one server-owned Gemini call for the non-emergency artifact.

**Reason:** it makes AI value visible while bounding latency, cost, injection
surface, and failure handling.

### ADR-004 — Static reviewed registry

**Decision:** sources and phone numbers are application data.

**Reason:** a model must never generate or alter crisis resources.

### ADR-005 — No account or database

**Decision:** urgent use is anonymous and session-local; the optional calm plan
is device-local.

**Reason:** identity and persistence add friction, privacy risk, and no required
judge-visible value.

### ADR-006 — Honest external actions

**Decision:** use native call/share/copy intents only after review and a user
gesture.

**Reason:** Haven cannot observe delivery, acknowledgement, or service response
and must not imply otherwise.

### ADR-007 — System fonts and small dependency surface

**Decision:** no remote font, UI framework, state library, or analytics SDK.

**Reason:** reduce bundle/network cost, supply-chain surface, and offline
failure points.

## 21. Implemented, simulated, and future

### Implemented

- browser-only responsive application;
- self and caregiver entry paths;
- complete tap-only input;
- optional browser speech recognition and read-aloud;
- deterministic emergency/urgent/coping policy;
- fixed 112 route and confirmed-facts dispatcher script;
- server-owned Gemini structured-output adapter;
- schema/source/semantic validators;
- labelled deterministic fallback;
- review-before-share and clipboard fallback;
- India national resource registry with verification dates;
- local calm-plan storage;
- reduced-motion and responsive styles;
- service-worker shell cache;
- unit tests, production build, and Vercel configuration.

### External user-controlled handoffs

- phone calls;
- OS share sheet;
- clipboard;
- official-source navigation.

Haven does not know whether any of these actions completed.

### Required before real-world use

- qualified clinical, crisis, harm-reduction, privacy, accessibility, and
  lived-experience review;
- live resource re-verification and content ownership;
- broader automated integration and end-to-end coverage;
- provider-account configuration and quota verification;
- accessibility assistive-technology testing;
- security review and rate limiting appropriate to public traffic;
- multilingual content review before claiming language support.

## 22. Non-goals

- diagnosis, treatment, prescribing, dosing, tapering, or detox planning;
- camera analysis, emotion inference, intoxication detection, or passive audio;
- automatic calls, messages, dispatch, monitoring, or location sharing;
- clinical outcome claims;
- treatment availability or appointment guarantees;
- caregiver surveillance;
- minors;
- long-term records, a social graph, or an autonomous agent.

