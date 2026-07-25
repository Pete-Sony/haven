# Haven Relay

**Status:** PromptWars implementation-ready decision brief; no application has
been built in this repository.

**Approach:** acute crisis-to-care relay.

## Challenge

> Design and build a multi-modal, GenAI-powered recovery and prevention
> platform that supports individuals navigating substance use disorders and
> their caregivers. The solution must utilize generative AI as a core engine to
> provide zero-typing interventions, personalized emergency scripts, backed by
> educational resources, and contextual safety tools that empower users,
> families when cognitive load is highest.

## Product thesis

Haven Relay turns a few large taps and an optional short voice statement into
the next usable action, the words needed to ask a trusted person for help, and
one verified explanation. It is not a chatbot, diagnostic system, therapist,
or emergency dispatcher.

The design begins with the moment when attention, speech, and decision-making
are most constrained. A deterministic safety gate owns emergency routing.
Gemini is the core engine for interpreting non-emergency context and composing
concise, person-first language.

## Users, pain, and outcome

### Primary user

An adult navigating substance use who is experiencing a strong craving, recent
use concern, social pressure, or another high-load moment.

### Caregiver

A trusted adult who needs observable, nonjudgmental guidance and the right
words to offer support or contact human help.

### Costly pain

The current alternative is to unlock a phone, type an explanation, search
multiple resources, decide which service is appropriate, and compose a message
while concentration is lowest. A blank chatbot reproduces that burden.

### Required outcome

Within one short interaction, the person sees:

1. the correct safety route;
2. no more than three immediate actions;
3. a speakable or shareable script;
4. one verified educational source; and
5. a prevention step for the next similar moment.

## Why GenAI is core

For non-emergency routes, Gemini converts structured taps and a user-approved
voice transcript into:

- a maximum-three-step intervention;
- a self-advocacy or caregiver request in the selected tone;
- a short explanation grounded in supplied source records;
- an implementation intention for the next similar situation; and
- source identifiers from an application-owned allowlist.

Static templates remain the honest fallback, but they cannot naturally combine
setting, trigger, role, support preference, relationship, language, tone, and
short unstructured context. Gemini does not assign risk, invent facts, select
phone numbers, or perform external actions.

## Complete journey

### Immediate recovery journey

1. The user chooses **Help for me** or **Help for someone**.
2. Large cards capture the current situation without a keyboard.
3. The user may hold to add a short voice statement; voice is never required.
4. Observable danger questions run before generation.
5. On a non-emergency route, Gemini produces three short actions, a script,
   read-aloud output, and one source-backed card.
6. The user reviews and then copies, shares, reads, or calls. Opening another
   app is never represented as message delivery.
7. The person can ask a caregiver to stay connected for a specific action and
   duration.

### Emergency journey

1. A selected observable sign such as not responding, seriously abnormal
   breathing, collapse, seizure, or immediate physical danger triggers the
   fixed emergency route.
2. **Call 112 now** renders synchronously from application data.
3. A safe base dispatcher script includes only confirmed facts and labels
   location, substance, timing, or callback details as unknown when missing.
4. Gemini may simplify or translate the confirmed script, but it cannot delay
   the call action, add medical instructions, or alter the route.
5. If the model or network is unavailable, the fixed route and base script
   remain complete.

### Prevention journey

After the immediate action, the user may spend two minutes preparing:

- one likely trigger;
- one safer destination;
- one preferred support action;
- one trusted-person request; and
- an “If this happens, I will…” plan stored only on the device after explicit
  confirmation.

The next high-load session can activate that plan in one tap.

## Problem-statement traceability

| Requirement | Judge-visible proof |
| --- | --- |
| Multi-modal | Tap and optional voice input; visual, read-aloud, copy, call, and share-preview output |
| GenAI-powered | Gemini transforms combined structured and spoken context into a bounded intervention artifact |
| Recovery and prevention | Immediate intervention followed by an optional prepared plan |
| Individuals and caregivers | Self-support path, caregiver request, and caregiver emergency path |
| Zero typing | Main journey completes with large choices; voice is optional |
| Personalized emergency scripts | Confirmed facts populate a fixed safe script; Gemini may personalize language without controlling the action |
| Educational resources | Every factual explanation resolves through an allowlisted source ID |
| Contextual safety tools | Deterministic danger router, fixed 112 route, explicit unknowns, and worsening escape action |
| Highest cognitive load | One decision per screen, three actions maximum, large controls, plain language, and spoken output |

## Minimum interfaces and data flow

Proposed stack: Next.js and TypeScript, a server-owned Gemini Flash adapter, a
static reviewed resource registry, browser speech input/output, and the native
share sheet with copy fallback. No account or database is required for the
competition MVP.

```text
tap choices + optional bounded transcript
    -> deterministic safety decision
        -> emergency: fixed 112 action + safe base script
        -> non-emergency: POST /api/intervention
            -> approved source retrieval
            -> Gemini structured output
            -> schema, source, length, and safety validation
            -> intervention card or deterministic fallback
```

Minimum request:

- role, situation, observable signs, whether alone, support preference,
  language, tone, and optional bounded transcript.

Minimum response:

- safety tier, maximum-three-step plan, spoken summary, caregiver/self script,
  source IDs, unknown facts, provider status, and fallback status.

## Safety and resilience

- Application code owns emergency, urgent-support, and coping tiers.
- Emergency content never waits for AI, network, speech, location, or login.
- The model cannot diagnose, provide medication/dosage/detox instructions,
  invent services, claim safety, or claim that an external action occurred.
- Source titles, numbers, URLs, jurisdiction, and verification dates come from
  the application registry, never free-form model output.
- No raw transcript, location, phone number, or generated crisis text enters
  standard telemetry.
- `DEMO_MODE=true` returns a clearly labelled reviewed fixture for the same
  input and output contract.

## Three-hour build blocks

| Time | Deliverable |
| --- | --- |
| 0:00–0:30 | Contracts, safety router, source registry, golden fixture, and deployed shell |
| 0:30–1:05 | Zero-typing start, safety questions, and synchronous emergency route |
| 1:05–1:40 | Server-owned Gemini intervention, structured validation, and fallback |
| 1:40–2:10 | Result, read-aloud, caregiver preview, source card, and prevention action |
| 2:10–2:30 | Focused router/provider/fallback tests and mobile accessibility fixes |
| 2:30–3:00 | Production verification, fallback rehearsal, evidence, and pitch |

## Concept score

| User value | Visible AI | 3-hour feasibility | Demo reliability | Originality | Alignment | Total |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | 5 | 4 | 5 | 4 | 5 | **28/30** |

## Top risks and mitigations

| Risk | Mitigation |
| --- | --- |
| AI delays emergency action | Render the deterministic route before any provider call |
| Generated medical overreach | Narrow schema, semantic validator, source allowlist, and fallback |
| Voice fails in a noisy venue | Complete tap-only journey and prepared transcript fixture |
| Sharing creates false reassurance | Explicit draft, handoff-opened, cancelled, and confirmed states |
| Scope expands into care management | One journey, one provider call, no auth/database/maps |

## Non-goals

- diagnosis, treatment selection, medication, dosage, taper, or detox advice;
- camera or voice-tone inference;
- autonomous dispatch, messaging, monitoring, or location sharing;
- long-term records, social networking, live treatment availability, or
  clinical-effectiveness claims.

## Safety notice

Haven Relay is a research and competition concept, not a medical device,
clinical service, or substitute for emergency services or qualified care. The
India reference configuration uses the official 112 emergency route; all
health and service content requires qualified review before real-world use.
