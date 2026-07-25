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
import type {
  InterventionResult,
  ObservableSignalId,
  Role,
  SafetyDecision,
  SafetyInput,
  SituationId,
} from "@/lib/domain/contracts";
import { createFallback } from "@/lib/domain/fallback";
import { APPROVED_CLAIMS, resolveResources } from "@/lib/domain/resources";
import { buildEmergencyScript, routeSafety } from "@/lib/domain/safety";

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
      <main id="main">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Support without a blank text box</span>
            <h1>
              When words are hard, find the <em>next safe step.</em>
            </h1>
            <p>
              A few large choices become a short action, the words to ask for
              help, and a verified resource. No account is required.
            </p>
            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() => onStart("individual")}
              >
                <UserRound aria-hidden="true" /> Help for me
              </button>
              <button
                className="secondary-button"
                onClick={() => onStart("caregiver")}
              >
                <UsersRound aria-hidden="true" /> Help for someone
              </button>
            </div>
            <p className="quiet-note">
              <LockKeyhole aria-hidden="true" /> Your immediate choices stay in
              this browser session.
            </p>
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
          <span className="eyebrow">Designed for high-load moments</span>
          <h2 id="journey-heading">Three parts. No typing required.</h2>
          <div className="journey-grid">
            <article>
              <span>01</span>
              <h3>Choose what is happening</h3>
              <p>Large, plain-language choices replace a blank chat window.</p>
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
              <h3>Use one small action</h3>
              <p>Read, copy, or share a bounded support script.</p>
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
              <strong>Gemini, bounded</strong>
              <small>Personalizes words, never risk</small>
            </span>
          </div>
          <div>
            <HeartHandshake />
            <span>
              <strong>Human handoff</strong>
              <small>Verified India resources</small>
            </span>
          </div>
        </section>

        <section className="resource-preview" aria-labelledby="support-heading">
          <div>
            <span className="eyebrow">India support pack</span>
            <h2 id="support-heading">Human help stays one tap away.</h2>
            <p>
              Service details come from a reviewed registry, never generated
              text.
            </p>
          </div>
          <div className="quick-resources">
            <Link className="resource-danger" href="/emergency">
              <AlertTriangle />{" "}
              <span>
                <small>Immediate danger</small>
                <strong>Call 112</strong>
              </span>
              <ArrowRight />
            </Link>
            <a href="tel:14446">
              <Phone />{" "}
              <span>
                <small>Substance-use support</small>
                <strong>14446</strong>
              </span>
              <ArrowRight />
            </a>
            <a href="tel:14416">
              <Headphones />{" "}
              <span>
                <small>Mental-health support</small>
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
        setAudio(blob.size <= 2_500_000 ? blob : null);
        setAudioStatus(
          blob.size <= 2_500_000
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
        <span className="eyebrow">Start with what you know</span>
        <h1>What is making this moment hard?</h1>
        <p>Choose up to three. You do not need to explain everything.</p>
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
              "Gemini can use it to personalize wording. Tap-only works fully."}
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
        <span>Emergency help never waits for Gemini</span>
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
    return () => controller.abort();
  }, [input]);
  return (
    <main id="main" className="emergency-page">
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
            ? "wording personalized with Gemini"
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
    <main id="main" className="loading-page" aria-live="polite">
      <div className="loading-mark">
        <Sparkles />
        <i />
      </div>
      <h1>Building one small next step…</h1>
      <p>
        Safety is already checked. If Gemini is unavailable, the reviewed
        fallback appears automatically.
      </p>
    </main>
  );
}

function ResultStep({
  result,
  decision,
  reset,
  edit,
}: {
  readonly result: InterventionResult;
  readonly decision: SafetyDecision;
  readonly reset: () => void;
  readonly edit: () => void;
}) {
  const [copied, setCopied] = useState(false);
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
  return (
    <main id="main" className="result-page">
      <div className="result-topline">
        <span className={`route-pill route-${decision.tier}`}>
          {decision.tier.replace("_", " ")}
        </span>
        <span className="provider-pill">
          {result.provider === "deterministic"
            ? "Reviewed fallback"
            : "Personalized with Gemini"}
        </span>
      </div>
      <header className="result-heading">
        <span className="eyebrow">Your next step</span>
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
            <span className="card-label">Reviewed learning</span>
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
      <div className="result-actions">
        <button className="text-button" onClick={edit}>
          <ArrowLeft /> Change answers
        </button>
        <button className="secondary-button" onClick={reset}>
          <RotateCcw /> Start again
        </button>
        <Link className="primary-button" href="/plan">
          Prepare a future plan <ArrowRight />
        </Link>
      </div>
      {result.fallbackReason && (
        <p className="fallback-note">
          Live personalization was unavailable. This reviewed scenario-specific
          fallback remains complete.
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
    <main id="main" className="flow-page">
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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  const reset = () => {
    speechSynthesis.cancel();
    setInput(defaultInput);
    setAudio(null);
    setDecision(null);
    setResult(null);
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
    try {
      const response = await fetch("/api/interventions", {
        method: "POST",
        body: form,
      });
      if (!response.ok) throw new Error("request_failed");
      const payload = (await response.json()) as {
        decision: SafetyDecision;
        result: InterventionResult;
      };
      setDecision(payload.decision);
      setResult(payload.result);
      setView("result");
    } catch {
      setResult(createFallback(input, nextDecision, "network_unavailable"));
      setView("result");
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
        reset={reset}
        edit={() => setView("context")}
      />
    );
  return <Loading />;
}
