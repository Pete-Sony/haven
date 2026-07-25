# Haven Production Hardening Plan

**Status:** implementation complete pending final verification and deployment  
**Date:** 2026-07-25  
**Product name:** Haven  
**Release target:** public browser application for at least 100 initial users

## Priorities

Problem-statement alignment and code quality are the highest-impact filters.
Safety, security, efficiency, testing, and accessibility are non-negotiable
release gates.

## Work plan and acceptance evidence

| Workstream            | Implementation                                                                                                                                         | Acceptance evidence                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Voice danger          | One Gemini artifact extracts bounded facts; any danger signal requires a null intervention; server merges signals and reruns the pure safety router    | Voice danger and contradictory low-risk input tests route to emergency; no coping artifact can survive   |
| One-call AI           | Context interpretation and normal intervention use one structured Gemini call                                                                          | Prompt contract test and provider code show one provider request                                         |
| Exact grounding       | Each role supplies exactly one educational source; service IDs never enter the prompt; response must return that exact ID                              | Invented, real-but-irrelevant, duplicate, and cross-role source-laundering tests fail closed             |
| Abuse and cost        | 1 MB audio ceiling, one call, seven-second deadline, no retry, audio cost 3, text cost 1, shared per-user windows, and a global daily provider ceiling | Pure budget tests plus atomic Supabase migration and live RPC check                                      |
| Prevention            | `/prevent` provides trigger, first action, safer context, read/copy/speak, explicit local save, reset, and optional cross-device path                  | Playwright completes the flow without typing or authentication and verifies reload persistence           |
| Caregiver distinction | Caregiver-specific framing, observable-not-diagnostic copy, source, fallback, and result label                                                         | Playwright and unit coverage prove the distinct route                                                    |
| Provider failure      | Client and server deadlines return a labelled, complete reviewed fallback                                                                              | Timeout/rate-limit fallback reasons remain visible without blocking the journey                          |
| Dependency security   | Oxlint replaces the vulnerable ESLint dependency tree; PostCSS and Sharp are patched                                                                   | Full `npm audit --audit-level=high` reports zero vulnerabilities                                         |
| Production release    | Exact verified SHA is pushed to GitHub and Sites, deployed publicly, then smoke tested                                                                 | GitHub SHA, Sites version SHA, healthy public URL, security headers, and production journey checks match |

## Reproducible release gates

```bash
npm ci
npm run verify
npm run test:e2e
```

`npm run verify` runs formatting, generated route types plus strict TypeScript,
Oxlint with warnings denied, coverage-gated policy tests, secret scanning, the
full high-severity dependency audit, and an optimized production build.

## Demo path

1. Choose **Help for me**.
2. Tap **Stress** or **Social pressure** and optionally add bounded voice.
3. Confirm no observable emergency sign.
4. Show three-or-fewer actions, usable words, the route-selected reviewed
   claim, model/fallback state, and human handoff.
5. Open **Plan ahead** and complete the account-free prevention journey.
6. Restart, select **Not responding** or **Not breathing normally**, and show
   the fixed **Call 112 now** action before optional personalized wording.
7. Briefly show that caregiver entry uses different framing and content.

## Stop-ship conditions

- Voice danger can reach normal coping output.
- Gemini sees or returns a source outside the exact selected educational claim.
- Emergency action waits for Gemini, authentication, Supabase, or a database.
- Any high-severity dependency finding, type error, lint warning, test failure,
  secret-scan finding, build error, accessibility failure, or production smoke
  failure remains.
- GitHub and production do not point to the same verified commit.
- The product is called anything other than Haven or described as a mobile app.
