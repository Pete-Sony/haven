"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clipboard,
  Headphones,
  HeartHandshake,
  LockKeyhole,
  Mic,
  Phone,
  RotateCcw,
  Share2,
  ShieldCheck,
  Sparkles,
  Square,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { isSupportMemoryActionId } from "@/domain/actions";
import type {
  InterventionResult,
  ObservableSignalId,
  Role,
  SafetyDecision,
  SafetyInput,
  SituationId,
} from "@/domain/contracts";
import { createFallback } from "@/domain/fallback";
import { APPROVED_CLAIMS, resolveResources } from "@/domain/resources";
import {
  buildEmergencyScript,
  mergeVoiceSafetySignals,
  routeSafety,
} from "@/domain/safety";

type View = "landing" | "context" | "safety" | "loading" | "result";

const situations: ReadonlyArray<{
  id: SituationId;
  label: string;
  description: string;
}> = [
  {
    id: "social_pressure",
    label: "Social pressure",
    description: "Someone is offering or pushing.",
  },
  {
    id: "stress",
    label: "Stress",
    description: "The pressure feels hard to hold.",
  },
  {
    id: "loneliness",
    label: "Loneliness",
    description: "You need another person nearby.",
  },
  {
    id: "pain",
    label: "Pain",
    description: "Pain is making the moment harder.",
  },
  {
    id: "recent_use",
    label: "Recent use",
    description: "You want timely human support.",
  },
  {
    id: "withdrawal_concern",
    label: "Withdrawal concern",
    description: "You are worried about symptoms.",
  },
  {
    id: "emotional_distress",
    label: "Severe distress",
    description: "You need a calm person now.",
  },
];

const signals: ReadonlyArray<{
  id: ObservableSignalId;
  label: string;
}> = [
  { id: "not_responding", label: "Not responding or cannot be awakened" },
  { id: "abnormal_breathing", label: "Not breathing normally" },
  { id: "seizure", label: "Having a seizure" },
  { id: "collapsed", label: "Collapsed" },
  { id: "immediate_self_harm", label: "Immediate risk of serious self-harm" },
  { id: "immediate_danger", label: "Immediate physical danger" },
  { id: "caregiver_unsafe", label: "I cannot stay safely nearby" },
  { id: "not_sure", label: "I am not sure if this is an emergency" },
];

const defaultInput: SafetyInput = {
  schemaVersion: "1.0",
  role: "individual",
  situationIds: ["stress"],
  observableSignalIds: [],
  intensityBand: "strong",
  goalId: "get_through_minute",
  tone: "warm",
  language: "en-IN",
  jurisdiction: { country: "IN" },
  isAlone: false,
};

function toggle<T>(items: readonly T[], value: T, max = 3): T[] {
  return items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value].slice(-max);
}

function Landing({ onStart }: { readonly onStart: (role: Role) => void }) {
  return (
    <>
      <main id="main" tabIndex={-1}>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              Zero-typing recovery and prevention support
            </span>
            <h1>
              When cognitive load is highest, take the <em>next safe step.</em>
            </h1>
            <p>
              Haven turns a few taps or a short voice message into a
              personalized action, an emergency-ready script, and verified human
              support—for you or someone you care for.
            </p>
            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() => onStart("individual")}
              >
                <UserRound aria-hidden="true" /> Help me now
              </button>
              <button
                className="secondary-button"
                onClick={() => onStart("caregiver")}
              >
                <UsersRound aria-hidden="true" /> Help someone now
              </button>
              <Link className="secondary-button" href="/auth?next=/companion">
                <Mic aria-hidden="true" /> Talk to Haven
              </Link>
            </div>
            <p className="quiet-note">
              <LockKeyhole aria-hidden="true" /> Your immediate choices stay in
              this browser session.
            </p>
            <Link className="prevention-link" href="/prevent">
              Build a prevention plan for a difficult moment <ArrowRight />
            </Link>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <article className="floating-card floating-card-back">
              <span>01 · Notice</span>
              <strong>One choice at a time.</strong>
            </article>
            <article className="floating-card floating-card-front">
              <span>02 · Relay</span>
              <p>“Can you stay with me for five minutes?”</p>
              <small>Ready to read, copy, or share</small>
            </article>
          </div>
        </section>

        <section className="journey-section" aria-labelledby="journey-heading">
          <span className="eyebrow">Built for high-load moments</span>
          <h2 id="journey-heading">
            Recovery support without finding the perfect words.
          </h2>
          <div className="journey-grid">
            <article>
              <span>01</span>
              <h3>Share what is happening</h3>
              <p>
                Use large, plain-language choices or an optional short voice
                note.
              </p>
            </article>
            <article>
              <span>02</span>
              <h3>Check immediate safety</h3>
              <p>
                Observable danger signs route to 112 without waiting for AI.
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>Take one supported action</h3>
              <p>
                Read, hear, copy, or share a personalized script grounded in
                verified learning.
              </p>
            </article>
          </div>
        </section>

        <section className="trust-strip" aria-label="Product safeguards">
          <div>
            <ShieldCheck />
            <span>
              <strong>Safety before AI</strong>
              <small>Fixed routing owns emergencies</small>
            </span>
          </div>
          <div>
            <Sparkles />
            <span>
              <strong>GenAI with guardrails</strong>
              <small>Personalizes words, never safety rules</small>
            </span>
          </div>
          <div>
            <HeartHandshake />
            <span>
              <strong>Real human connection</strong>
              <small>Verified call options in India</small>
            </span>
          </div>
        </section>

        <section className="resource-preview" aria-labelledby="support-heading">
          <div>
            <span className="eyebrow">Verified India call support</span>
            <h2 id="support-heading">A real person stays one tap away.</h2>
            <p>
              Every support action opens your phone dialer with a reviewed
              number. Haven never generates contact details.
            </p>
          </div>
          <div className="quick-resources">
            <a className="resource-danger" href="tel:112">
              <AlertTriangle />{" "}
              <span>
                <small>Immediate danger</small>
                <strong>Call 112</strong>
              </span>
              <ArrowRight />
            </a>
            <a href="tel:14446">
              <Phone />{" "}
              <span>
                <small>Substance-use counselling and referral</small>
                <strong>14446</strong>
              </span>
              <ArrowRight />
            </a>
            <a href="tel:14416">
              <Headphones />{" "}
              <span>
                <small>24/7 mental-health support</small>
                <strong>14416</strong>
              </span>
              <ArrowRight />
            </a>
          </div>
        </section>
      </main>
    </>
  );
}

function ContextStep({
  input,
  setInput,
  next,
  back,
  audio,
  setAudio,
}: {
  readonly input: SafetyInput;
  readonly setInput: (input: SafetyInput) => void;
  readonly next: () => void;
  readonly back: () => void;
  readonly audio: Blob | null;
  readonly setAudio: (audio: Blob | null) => void;
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [audioStatus, setAudioStatus] = useState("");

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setAudio(blob.size <= 1_000_000 ? blob : null);
        setAudioStatus(
          blob.size <= 1_000_000
            ? "Voice note ready. It is sent only when you continue."
            : "Voice note was too large. The tap-only flow still works.",
        );
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setAudioStatus("Recording. Tap stop when finished.");
    } catch {
      setAudioStatus("Microphone unavailable. Continue with taps only.");
    }
  }

  return (
    <FlowShell step={1}>
      <button className="back-button" onClick={back}>
        <ArrowLeft /> Back
      </button>
      <div className="flow-heading">
        <span className="eyebrow">
          {input.role === "caregiver"
            ? "Caregiver support"
            : "Start with what you know"}
        </span>
        <h1>
          {input.role === "caregiver"
            ? "What are you noticing around them?"
            : "What is making this moment hard?"}
        </h1>
        <p>
          {input.role === "caregiver"
            ? "Choose up to three. Focus on what you observe, not a diagnosis."
            : "Choose up to three. You do not need to explain everything."}
        </p>
      </div>
      <fieldset>
        <legend>Choose the closest fit</legend>
        <div className="choice-grid">
          {situations.map((situation) => {
            const selected = input.situationIds.includes(situation.id);
            return (
              <button
                aria-pressed={selected}
                className={`choice-card ${selected ? "selected" : ""}`}
                key={situation.id}
                onClick={() => {
                  const selectedIds = toggle(input.situationIds, situation.id);
                  if (selectedIds.length > 0)
                    setInput({ ...input, situationIds: selectedIds });
                }}
              >
                <span className="choice-check">{selected && <Check />}</span>
                <strong>{situation.label}</strong>
                <small>{situation.description}</small>
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="compact-fields">
        <fieldset>
          <legend>How strong is it?</legend>
          <div className="segmented">
            {(["manageable", "strong", "overwhelming"] as const).map(
              (value) => (
                <button
                  key={value}
                  aria-pressed={input.intensityBand === value}
                  onClick={() => setInput({ ...input, intensityBand: value })}
                >
                  {value}
                </button>
              ),
            )}
          </div>
        </fieldset>
        <fieldset>
          <legend>How should the words sound?</legend>
          <div className="segmented">
            {(["direct", "warm", "minimal"] as const).map((value) => (
              <button
                key={value}
                aria-pressed={input.tone === value}
                onClick={() => setInput({ ...input, tone: value })}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="voice-panel">
        <button
          className={`voice-button ${recording ? "recording" : ""}`}
          onClick={toggleRecording}
          aria-label={recording ? "Stop recording" : "Add optional voice note"}
        >
          {recording ? <Square /> : <Mic />}
        </button>
        <div>
          <strong>
            {recording
              ? "Recording…"
              : audio
                ? "Voice note added"
                : "Optional: add a short voice note"}
          </strong>
          <p>
            {audioStatus ||
              "GenAI can use it for this response. Tap-only support remains fully available."}
          </p>
        </div>
        {audio && !recording && (
          <button
            className="text-button"
            onClick={() => {
              setAudio(null);
              setAudioStatus("Voice note removed.");
            }}
          >
            Remove
          </button>
        )}
      </div>
      <div className="flow-footer">
        <span>
          <LockKeyhole /> No transcript is stored
        </span>
        <button className="primary-button" onClick={next}>
          Check safety <ArrowRight />
        </button>
      </div>
    </FlowShell>
  );
}

function SafetyStep({
  input,
  setInput,
  run,
  back,
}: {
  readonly input: SafetyInput;
  readonly setInput: (input: SafetyInput) => void;
  readonly run: () => void;
  readonly back: () => void;
}) {
  return (
    <FlowShell step={2}>
      <button className="back-button" onClick={back}>
        <ArrowLeft /> Back
      </button>
      <div className="flow-heading narrow">
        <span className="eyebrow">Safety check</span>
        <h1>Is any of this happening now?</h1>
        <p>
          Choose every sign you can observe. If you are unsure, choose that.
        </p>
      </div>
      <div className="danger-list">
        {signals.map((signal) => {
          const selected = input.observableSignalIds.includes(signal.id);
          return (
            <button
              className={`danger-choice ${selected ? "selected" : ""}`}
              aria-pressed={selected}
              key={signal.id}
              onClick={() =>
                setInput({
                  ...input,
                  observableSignalIds: toggle(
                    input.observableSignalIds,
                    signal.id,
                    8,
                  ),
                })
              }
            >
              <span className="choice-check">{selected && <Check />}</span>
              <strong>{signal.label}</strong>
            </button>
          );
        })}
      </div>
      <label className="alone-check">
        <input
          type="checkbox"
          checked={input.isAlone}
          onChange={(event) =>
            setInput({ ...input, isAlone: event.target.checked })
          }
        />
        {input.role === "individual"
          ? "I am alone right now"
          : "I am the only supporter here"}
      </label>
      <p className="safety-note">
        <ShieldCheck /> This check uses fixed application rules. AI cannot lower
        or override the result.
      </p>
      <div className="flow-footer">
        <span>Emergency help never waits for GenAI</span>
        <button className="primary-button" onClick={run}>
          Show the next step <ArrowRight />
        </button>
      </div>
    </FlowShell>
  );
}

function EmergencyResult({
  input,
  reset,
}: {
  readonly input: SafetyInput;
  readonly reset: () => void;
}) {
  const baseScript = buildEmergencyScript(input.observableSignalIds);
  const [script, setScript] = useState(baseScript);
  const [provider, setProvider] = useState<
    "deterministic" | "gemini-3.6-flash"
  >("deterministic");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4_000);
    void fetch("/api/emergency-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("request_failed");
        return response.json() as Promise<{
          script: string;
          provider: "deterministic" | "gemini-3.6-flash";
        }>;
      })
      .then((payload) => {
        setScript(payload.script);
        setProvider(payload.provider);
      })
      .catch(() => undefined);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [input]);
  return (
    <main id="main" tabIndex={-1} className="emergency-page">
      <div className="emergency-icon">
        <AlertTriangle />
      </div>
      <span className="eyebrow">Emergency route</span>
      <h1>Call 112 now.</h1>
      <p>
        Do not wait for this app. If it is safe, stay nearby and follow the
        dispatcher’s instructions.
      </p>
      <a className="call-button" href="tel:112">
        <Phone /> Call 112
      </a>
      <small>
        The call starts only after you tap and confirm on your device.
      </small>
      <section className="emergency-script">
        <span>
          Say only what you know ·{" "}
          {provider === "gemini-3.6-flash"
            ? "GenAI-personalized wording"
            : "reviewed safe script"}
        </span>
        <blockquote>“{script}”</blockquote>
        <button onClick={() => void navigator.clipboard?.writeText(script)}>
          <Clipboard /> Copy script
        </button>
      </section>
      <button className="back-button emergency-back" onClick={reset}>
        <ArrowLeft /> Return home
      </button>
    </main>
  );
}

function Loading() {
  return (
    <main id="main" tabIndex={-1} className="loading-page" aria-live="polite">
      <div className="loading-mark">
        <Sparkles />
        <i />
      </div>
      <h1>Building one small next step…</h1>
      <p>
        Safety is already checked. Haven waits up to seven seconds, then shows
        the complete reviewed fallback automatically.
      </p>
    </main>
  );
}

function ResultStep({
  result,
  decision,
  role,
  input,
  personalMemoryUsed,
  reset,
  edit,
}: {
  readonly result: InterventionResult;
  readonly decision: SafetyDecision;
  readonly role: Role;
  readonly input: SafetyInput;
  readonly personalMemoryUsed: boolean;
  readonly reset: () => void;
  readonly edit: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [memoryState, setMemoryState] = useState<
    "idle" | "saving" | "saved" | "sign_in" | "failed"
  >("idle");
  const resources = resolveResources(decision.resourceIds);
  const claim = result.sourceIds
    .map(
      (sourceId) => APPROVED_CLAIMS[sourceId as keyof typeof APPROVED_CLAIMS],
    )
    .find(Boolean);
  const readAloud = () => {
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(result.spokenSummary));
  };
  const share = async () => {
    const text = `${result.supportMessageDraft}\n\nDrafted with Haven`;
    if (navigator.share) {
      await navigator
        .share({ title: "Support request draft", text })
        .catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(text);
      setCopied(true);
    }
  };
  const saveSupportMemory = async (helpfulness: "helpful" | "not_helpful") => {
    const actionId = result.steps
      .map((step) => step.actionId)
      .find(isSupportMemoryActionId);
    if (!actionId || memoryState === "saving") return;
    setMemoryState("saving");
    try {
      const response = await fetch("/api/account/support-memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: "1.0",
          situationIds: input.situationIds,
          actionId,
          helpfulness,
        }),
      });
      if (response.status === 401) {
        setMemoryState("sign_in");
        return;
      }
      setMemoryState(response.ok ? "saved" : "failed");
    } catch {
      setMemoryState("failed");
    }
  };
  return (
    <main id="main" tabIndex={-1} className="result-page">
      <div className="result-topline">
        <span className={`route-pill route-${decision.tier}`}>
          {decision.tier.replace("_", " ")}
        </span>
        <span className="provider-pill">
          {result.provider === "deterministic"
            ? "Reviewed fallback"
            : "Personalized with GenAI"}
        </span>
        {personalMemoryUsed && (
          <span className="provider-pill">Used saved preferences</span>
        )}
      </div>
      <header className="result-heading">
        <span className="eyebrow">
          {role === "caregiver" ? "Caregiver support" : "Your next step"}
        </span>
        <h1>{result.headline}</h1>
      </header>
      <div className="result-grid">
        <article className="steps-card">
          <span className="card-label">Do this now</span>
          <ol>
            {result.steps.map((step) => (
              <li key={step.actionId}>{step.label}</li>
            ))}
          </ol>
        </article>
        <article className="script-card">
          <span className="card-label">Words you can use</span>
          <blockquote>“{result.verbatimScript}”</blockquote>
          <div>
            <button onClick={readAloud}>
              <Headphones /> Read aloud
            </button>
            <button
              onClick={async () => {
                await navigator.clipboard?.writeText(result.verbatimScript);
                setCopied(true);
              }}
            >
              <Clipboard /> {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </article>
        <article className="share-card">
          <span className="card-label">Support request draft</span>
          <p>{result.supportMessageDraft}</p>
          <button className="secondary-button" onClick={share}>
            <Share2 /> Review and share
          </button>
          <small>
            Haven opens your share sheet. It never claims the message was sent.
          </small>
        </article>
        <article className="reframe-card">
          <span className="card-label">Hold onto this</span>
          <p>{result.mindsetReframe}</p>
        </article>
      </div>
      {decision.tier === "urgent_support" && (
        <section className="urgent-panel">
          <AlertTriangle />
          <div>
            <strong>Bring a person into this moment.</strong>
            <p>These services provide human support in India.</p>
          </div>
          {resources.map(
            (resource) =>
              resource.phone && (
                <a key={resource.id} href={`tel:${resource.phone}`}>
                  <Phone /> {resource.phone}
                </a>
              ),
          )}
        </section>
      )}
      {claim && (
        <article className="evidence-card">
          <ShieldCheck />
          <div>
            <span className="card-label">Verified learning</span>
            <h2>{claim.allowedClaim}</h2>
            <p>
              {claim.organization} · {claim.title}
            </p>
            <a href={claim.url} target="_blank" rel="noreferrer">
              Open source
            </a>
          </div>
        </article>
      )}
      {role === "individual" && (
        <section className="support-memory-card" aria-live="polite">
          <div>
            <span className="card-label">Optional support memory</span>
            <h2>Should Haven remember this first step?</h2>
            <p>
              Save only your tap choices and whether the step fit. Haven does
              not save this conversation, audio, script, or crisis details.
            </p>
          </div>
          {memoryState === "saved" ? (
            <strong>
              Saved for 90 days.{" "}
              <Link href="/account/memories">Manage or delete it.</Link>
            </strong>
          ) : memoryState === "sign_in" ? (
            <p>
              <Link href="/auth?next=/">Sign in</Link> to save this preference.
              Immediate support remains account-free.
            </p>
          ) : (
            <div className="support-memory-actions">
              <button
                disabled={memoryState === "saving"}
                onClick={() => void saveSupportMemory("helpful")}
              >
                This helped
              </button>
              <button
                disabled={memoryState === "saving"}
                onClick={() => void saveSupportMemory("not_helpful")}
              >
                Not for me
              </button>
            </div>
          )}
          {memoryState === "failed" && (
            <small>
              That preference was not saved. Your current result is unchanged.
            </small>
          )}
        </section>
      )}
      <div className="result-actions">
        <button className="text-button" onClick={edit}>
          <ArrowLeft /> Change answers
        </button>
        <button className="secondary-button" onClick={reset}>
          <RotateCcw /> Start again
        </button>
        <Link className="secondary-button" href="/prevent">
          Build a prevention plan <ArrowRight />
        </Link>
      </div>
      {result.fallbackReason && (
        <p className="fallback-note">
          {result.fallbackReason === "client_timeout"
            ? "Live personalization took longer than seven seconds."
            : result.fallbackReason === "rate_limited"
              ? "Live personalization is temporarily paused for this device."
              : "Live personalization was unavailable."}{" "}
          This reviewed scenario-specific fallback remains complete.
        </p>
      )}
    </main>
  );
}

function FlowShell({
  step,
  children,
}: {
  readonly step: 1 | 2;
  readonly children: React.ReactNode;
}) {
  return (
    <main id="main" tabIndex={-1} className="flow-page">
      <div className="flow-card">
        <div className="flow-progress">
          <span>Immediate support</span>
          <div>
            <i className={step >= 1 ? "active" : ""}>1</i>
            <span />
            <i className={step >= 2 ? "active" : ""}>2</i>
          </div>
          <span>Step {step} of 2</span>
        </div>
        {children}
      </div>
    </main>
  );
}

export function HavenApp() {
  const [view, setView] = useState<View>("landing");
  const [input, setInput] = useState<SafetyInput>(defaultInput);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [decision, setDecision] = useState<SafetyDecision | null>(null);
  const [result, setResult] = useState<InterventionResult | null>(null);
  const [personalMemoryUsed, setPersonalMemoryUsed] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  const reset = () => {
    speechSynthesis.cancel();
    setInput(defaultInput);
    setAudio(null);
    setDecision(null);
    setResult(null);
    setPersonalMemoryUsed(false);
    setView("landing");
  };

  const start = (role: Role) => {
    setInput({ ...defaultInput, role });
    setView("context");
  };

  const run = async () => {
    const nextDecision = routeSafety(input);
    setDecision(nextDecision);
    if (nextDecision.tier === "emergency") {
      setView("result");
      return;
    }
    setView("loading");
    const form = new FormData();
    form.set("input", JSON.stringify(input));
    if (audio) form.set("audio", audio, "context.webm");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 7_500);
    try {
      let clientId = window.localStorage.getItem("haven.client-id");
      if (!clientId) {
        clientId = window.crypto.randomUUID();
        window.localStorage.setItem("haven.client-id", clientId);
      }
      const response = await fetch("/api/interventions", {
        method: "POST",
        body: form,
        signal: controller.signal,
        headers: { "X-Haven-Client-Id": clientId },
      });
      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(errorPayload?.error ?? "request_failed");
      }
      const payload = (await response.json()) as {
        decision: SafetyDecision;
        result: InterventionResult | null;
        voiceSafetySignalIds?: ObservableSignalId[];
        personalMemoryUsed?: boolean;
      };
      if (payload.decision.tier === "emergency") {
        setInput(
          mergeVoiceSafetySignals(input, payload.voiceSafetySignalIds ?? []),
        );
        setDecision(payload.decision);
        setResult(null);
        setPersonalMemoryUsed(false);
        setView("result");
        return;
      }
      if (!payload.result) throw new Error("missing_result");
      setDecision(payload.decision);
      setResult(payload.result);
      setPersonalMemoryUsed(payload.personalMemoryUsed === true);
      setView("result");
    } catch (error) {
      const reason =
        error instanceof DOMException && error.name === "AbortError"
          ? "client_timeout"
          : error instanceof Error && error.message === "rate_limited"
            ? "rate_limited"
            : "network_unavailable";
      setResult(createFallback(input, nextDecision, reason));
      setPersonalMemoryUsed(false);
      setView("result");
    } finally {
      window.clearTimeout(timeout);
    }
  };

  if (view === "landing") return <Landing onStart={start} />;
  if (view === "context")
    return (
      <ContextStep
        input={input}
        setInput={setInput}
        next={() => setView("safety")}
        back={reset}
        audio={audio}
        setAudio={setAudio}
      />
    );
  if (view === "safety")
    return (
      <SafetyStep
        input={input}
        setInput={setInput}
        run={() => void run()}
        back={() => setView("context")}
      />
    );
  if (decision?.tier === "emergency")
    return <EmergencyResult input={input} reset={reset} />;
  if (view === "loading") return <Loading />;
  if (decision && result)
    return (
      <ResultStep
        result={result}
        decision={decision}
        role={input.role}
        input={input}
        personalMemoryUsed={personalMemoryUsed}
        reset={reset}
        edit={() => setView("context")}
      />
    );
  return <Loading />;
}
