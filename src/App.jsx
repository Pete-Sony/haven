import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CircleHelp,
  Clipboard,
  ExternalLink,
  HeartHandshake,
  Home,
  Info,
  Leaf,
  LockKeyhole,
  Menu,
  MessageCircle,
  Mic,
  MicOff,
  Phone,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Volume2,
  X,
} from "lucide-react";
import { resources, sourceLessons, VERIFIED_ON } from "./data/resources.js";
import { requestIntervention } from "./lib/intervention.js";
import { buildEmergencyScript, routeSafety } from "./lib/safety.js";

const defaultInput = {
  role: "individual",
  situation: "social_pressure",
  intensity: 7,
  emotion: "overwhelmed",
  goal: "leave_safely",
  tone: "direct",
  alone: false,
  signalIds: [],
  voiceContext: "",
};

const scenarios = [
  { id: "social_pressure", icon: "↗", label: "Social pressure", hint: "Someone is offering or pushing" },
  { id: "stress", icon: "≈", label: "High stress", hint: "Everything feels too much" },
  { id: "loneliness", icon: "○", label: "Feeling alone", hint: "I need a familiar person" },
  { id: "pain", icon: "+", label: "Physical pain", hint: "I need my existing care plan" },
];

const emotions = [
  ["overwhelmed", "Overwhelmed"],
  ["anxious", "Anxious"],
  ["ashamed", "Ashamed"],
  ["angry", "Angry"],
  ["numb", "Numb"],
];

const goals = [
  ["leave_safely", "Leave safely"],
  ["call_someone", "Call someone"],
  ["get_through_minute", "Get through this minute"],
];

const dangerChecks = [
  ["not_responding", "Not responding or cannot be awakened"],
  ["abnormal_breathing", "Breathing is absent, slow, or looks seriously unusual"],
  ["seizure", "Having a seizure"],
  ["collapsed", "Collapsed or suddenly unable to stand"],
  ["immediate_danger", "Someone is in immediate physical danger"],
];

function Brand() {
  return (
    <div className="brand" aria-label="Haven Relay home">
      <span className="brand-mark"><Leaf size={18} /></span>
      <span>haven <b>relay</b></span>
    </div>
  );
}

function StatusPill({ children, tone = "green" }) {
  return <span className={`status-pill status-${tone}`}>{children}</span>;
}

function AppHeader({ onHome, onEmergency, onPlan, planReady }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <button className="brand-button" onClick={onHome}><Brand /></button>
      <nav className={open ? "nav open" : "nav"} aria-label="Primary">
        <button onClick={onHome}>How it works</button>
        <button onClick={onPlan}>{planReady ? "My calm plan" : "Create a calm plan"}</button>
        <a href="#resources">Verified resources</a>
      </nav>
      <div className="header-actions">
        <StatusPill><span className="status-dot" /> Emergency tools work offline</StatusPill>
        <button className="emergency-link" onClick={onEmergency}>
          <AlertTriangle size={16} /> Emergency
        </button>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}

function Landing({ onStart, onEmergency, onPlan, planReady }) {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <StatusPill tone="cream"><ShieldCheck size={14} /> Private by default · no account needed</StatusPill>
          <h1>When words are hard,<br /><em>start with one tap.</em></h1>
          <p className="hero-lede">
            Haven Relay turns a few choices into one safe next action and one sentence
            you can say, hear, copy, or share.
          </p>
          <div className="hero-actions">
            <button className="primary-cta" onClick={() => onStart("individual")}>
              I need help now <ArrowRight size={18} />
            </button>
            <button className="secondary-cta" onClick={() => onStart("caregiver")}>
              <HeartHandshake size={18} /> I’m supporting someone
            </button>
          </div>
          <p className="quiet-note"><LockKeyhole size={14} /> Your choices stay on this device. Nothing is shared without your action.</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="orb orb-three" />
          <div className="hero-card card-back">
            <small>ONE NEXT ACTION</small>
            <strong>Move toward a trusted person.</strong>
          </div>
          <div className="hero-card card-front">
            <span className="tiny-label"><Sparkles size={12} /> YOUR WORDS</span>
            <p>“I’m having a hard moment. Can you stay on the phone while I leave?”</p>
            <div><span>Hear it</span><span>Copy</span><span>Share</span></div>
          </div>
          <div className="line-drawing" />
        </div>
      </section>

      <section className="path-section" aria-labelledby="choose-path">
        <div className="section-intro">
          <span className="eyebrow">START WHERE YOU ARE</span>
          <h2 id="choose-path">Choose your path</h2>
          <p>No blank chat. No long form. Just the next useful step.</p>
        </div>
        <div className="path-grid">
          <button className="path-card path-dark" onClick={() => onStart("individual")}>
            <span className="path-icon"><UserRound /></span>
            <span className="path-kicker">FOR ME</span>
            <strong>I need help in this moment</strong>
            <p>Turn what you are feeling into a clear next step and a sentence you can use.</p>
            <span className="path-link">Start with a few taps <ArrowRight size={16} /></span>
          </button>
          <button className="path-card path-green" onClick={() => onStart("caregiver")}>
            <span className="path-icon"><HeartHandshake /></span>
            <span className="path-kicker">FOR SOMEONE I CARE ABOUT</span>
            <strong>I’m supporting someone</strong>
            <p>Respond with calm language, observable facts, and a safety-first next action.</p>
            <span className="path-link">Choose what you observe <ArrowRight size={16} /></span>
          </button>
          <button className="path-card path-light" onClick={onPlan}>
            <span className="path-icon"><Home /></span>
            <span className="path-kicker">FOR LATER</span>
            <strong>{planReady ? "Review my calm plan" : "Prepare a calm-time plan"}</strong>
            <p>Save a preferred tone, support person, and safe place on this device.</p>
            <span className="path-link">{planReady ? "Open my plan" : "Create my plan"} <ArrowRight size={16} /></span>
          </button>
        </div>
      </section>

      <section className="trust-strip">
        <div><ShieldCheck /><span><b>Safety before AI</b><small>Explicit danger signs bypass generation.</small></span></div>
        <div><MessageCircle /><span><b>You control sharing</b><small>Every message is a draft until you act.</small></span></div>
        <div><BookOpen /><span><b>Sources, not guesses</b><small>Resource details come from official registries.</small></span></div>
      </section>

      <ResourceSection onEmergency={onEmergency} />
    </main>
  );
}

function Progress({ step, role }) {
  return (
    <div className="flow-progress" aria-label={`Step ${step} of 3`}>
      <span>{role === "individual" ? "FOR ME" : "SUPPORTING SOMEONE"}</span>
      <div>
        {[1, 2, 3].map((number) => (
          <i key={number} className={number <= step ? "active" : ""}>{number < step ? <Check size={12} /> : number}</i>
        ))}
      </div>
      <span>STEP {step} OF 3</span>
    </div>
  );
}

function ContextStep({ input, setInput, next, back, voice, setVoice }) {
  const isCaregiver = input.role === "caregiver";
  return (
    <section className="flow-card">
      <Progress step={1} role={input.role} />
      <button className="back-link" onClick={back}><ArrowLeft size={16} /> Back</button>
      <div className="flow-heading">
        <span className="eyebrow">{isCaregiver ? "WHAT DO YOU NOTICE?" : "WHAT IS HAPPENING?"}</span>
        <h1>{isCaregiver ? "Start with what you can observe." : "Let’s make this moment smaller."}</h1>
        <p>{isCaregiver ? "Choose facts, not a diagnosis. We’ll check immediate safety next." : "Choose the closest fit. There are no wrong answers."}</p>
      </div>

      <fieldset>
        <legend>{isCaregiver ? "The closest situation" : "What is making this harder?"}</legend>
        <div className="scenario-grid">
          {scenarios.map((item) => (
            <button
              type="button"
              className={input.situation === item.id ? "choice-card selected" : "choice-card"}
              key={item.id}
              onClick={() => setInput({ ...input, situation: item.id })}
            >
              <span>{item.icon}</span><b>{item.label}</b><small>{item.hint}</small>
              {input.situation === item.id && <Check className="choice-check" size={15} />}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="two-column-fields">
        <fieldset>
          <legend>{isCaregiver ? "How do they seem?" : "What feeling is closest?"}</legend>
          <div className="chip-row">
            {emotions.map(([id, label]) => (
              <button key={id} type="button" className={input.emotion === id ? "chip active" : "chip"} onClick={() => setInput({ ...input, emotion: id })}>{label}</button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{isCaregiver ? "What would help next?" : "What do you need most?"}</legend>
          <div className="chip-row">
            {goals.map(([id, label]) => (
              <button key={id} type="button" className={input.goal === id ? "chip active" : "chip"} onClick={() => setInput({ ...input, goal: id })}>{label}</button>
            ))}
          </div>
        </fieldset>
      </div>

      <fieldset>
        <legend>How intense is this right now? <b>{input.intensity}/10</b></legend>
        <input
          className="intensity-range"
          type="range"
          min="1"
          max="10"
          value={input.intensity}
          onChange={(event) => setInput({ ...input, intensity: Number(event.target.value) })}
          aria-label="Intensity from 1 to 10"
        />
        <div className="range-labels"><span>Manageable</span><span>Very strong</span></div>
      </fieldset>

      <VoiceInput value={voice} onChange={(value) => { setVoice(value); setInput({ ...input, voiceContext: value }); }} />

      <label className="check-row">
        <input type="checkbox" checked={input.alone} onChange={(event) => setInput({ ...input, alone: event.target.checked })} />
        <span>{isCaregiver ? "I am the only supporter here" : "I am alone right now"}</span>
      </label>

      <div className="flow-footer">
        <span><LockKeyhole size={14} /> Nothing is sent or stored online.</span>
        <button className="primary-cta" onClick={next}>Check immediate safety <ArrowRight size={18} /></button>
      </div>
    </section>
  );
}

function VoiceInput({ value, onChange }) {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const recognitionRef = useRef(null);

  const toggle = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessage("Voice input is not supported in this browser. Tap choices still work.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => onChange(event.results[0][0].transcript.slice(0, 240));
    recognition.onerror = () => setMessage("I couldn’t capture that. Nothing was saved—try again or continue with taps.");
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setMessage("Listening… speak one short sentence.");
  };

  return (
    <div className="voice-box">
      <button type="button" onClick={toggle} className={listening ? "voice-button listening" : "voice-button"}>
        {listening ? <MicOff /> : <Mic />}
      </button>
      <div>
        <b>Optional: add one spoken sentence</b>
        <p>{value || message || "Voice adds context, but the complete flow works with taps."}</p>
      </div>
      {value && <button className="text-button" onClick={() => onChange("")}>Clear</button>}
    </div>
  );
}

function SafetyStep({ input, setInput, next, back, onEmergency }) {
  const toggle = (id) => {
    const signalIds = input.signalIds.includes(id)
      ? input.signalIds.filter((signal) => signal !== id)
      : [...input.signalIds, id];
    setInput({ ...input, signalIds });
  };
  const hasDanger = input.signalIds.length > 0;

  return (
    <section className="flow-card safety-step">
      <Progress step={2} role={input.role} />
      <button className="back-link" onClick={back}><ArrowLeft size={16} /> Back</button>
      <div className="flow-heading narrow">
        <span className="eyebrow">SAFETY COMES FIRST</span>
        <h1>Is any of this happening now?</h1>
        <p>Select every observable sign that applies. If you are unsure and danger may be present, use emergency help.</p>
      </div>
      <div className="danger-list">
        {dangerChecks.map(([id, label]) => (
          <button key={id} className={input.signalIds.includes(id) ? "danger-choice selected" : "danger-choice"} onClick={() => toggle(id)}>
            <span className="fake-check">{input.signalIds.includes(id) && <Check size={16} />}</span>
            <b>{label}</b>
          </button>
        ))}
      </div>
      <div className="safety-note"><Info size={18} /><span>Haven Relay does not diagnose. These choices route only from facts you select.</span></div>
      <div className="flow-footer">
        <button className="secondary-cta" onClick={onEmergency}><Phone size={17} /> Call 112 now</button>
        <button className={hasDanger ? "danger-cta" : "primary-cta"} onClick={next}>
          {hasDanger ? "Show emergency steps" : "None of these — continue"} <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}

function LoadingCard() {
  return (
    <section className="loading-card" aria-live="polite">
      <div className="loading-orbit"><Leaf /><i /><i /><i /></div>
      <span className="eyebrow">COMPOSING YOUR RELAY</span>
      <h2>Turning your choices into one next action…</h2>
      <p>Safety is already checked. If the AI provider is unavailable, a reviewed offline card will appear.</p>
      <div className="loading-line"><i /></div>
    </section>
  );
}

function ResultStep({ input, decision, result, restart, back, onEmergency }) {
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState("");
  const lesson = sourceLessons[result.lessonId] || sourceLessons.cravingWave;
  const urgent = decision.tier === "urgent_support";

  const copy = async (text, kind) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  };

  const speak = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(`${result.immediateAction}. ${result.verbatimScript}`);
    speech.rate = 0.92;
    speech.lang = "en-IN";
    window.speechSynthesis.speak(speech);
  };

  return (
    <section className="result-page">
      <Progress step={3} role={input.role} />
      <div className="result-topline">
        <button className="back-link" onClick={back}><ArrowLeft size={16} /> Adjust choices</button>
        <StatusPill tone={result.demoMode ? "amber" : "green"}>
          {result.demoMode ? "Reviewed fallback · provider unavailable" : `Personalized with ${result.provider}`}
        </StatusPill>
      </div>
      <div className="result-hero">
        <span className="eyebrow">{urgent ? "BRING SOMEONE INTO THIS MOMENT" : "ONE NEXT ACTION"}</span>
        <h1>{result.headline}</h1>
        <p>{result.immediateAction}</p>
      </div>
      <div className="result-grid">
        <article className="script-card">
          <span className="card-number">01</span>
          <div>
            <span className="tiny-label">SAY THIS</span>
            <blockquote>“{result.verbatimScript}”</blockquote>
            <div className="card-actions">
              <button onClick={speak}><Volume2 size={17} /> Hear it</button>
              <button onClick={() => copy(result.verbatimScript, "script")}><Clipboard size={17} /> {copied === "script" ? "Copied" : "Copy"}</button>
            </div>
          </div>
        </article>
        <article className="support-card">
          <span className="card-number">02</span>
          <div>
            <span className="tiny-label">ASK FOR SUPPORT</span>
            <p>Prepare a message for someone you trust. You review it before any handoff.</p>
            <button className="secondary-cta" onClick={() => setShareOpen(true)}><Send size={17} /> Review support draft</button>
          </div>
        </article>
        <article className="reframe-card">
          <span className="card-number">03</span>
          <div><span className="tiny-label">HOLD ONTO THIS</span><p>{result.mindsetReframe}</p></div>
        </article>
        <article className="source-card">
          <span className="tiny-label"><BookOpen size={13} /> {lesson.eyebrow}</span>
          <h3>{lesson.title}</h3>
          <p>{lesson.body}</p>
          <a href={lesson.sourceUrl} target="_blank" rel="noreferrer">{lesson.source} <ExternalLink size={14} /></a>
        </article>
      </div>
      {urgent && (
        <div className="urgent-bar">
          <div><CircleHelp /><span><b>Human support is available now</b><small>This does not replace emergency care.</small></span></div>
          <a href={`tel:${resources.substanceSupport.phone}`}><Phone size={17} /> Call {resources.substanceSupport.phone}</a>
          <a href={`tel:${resources.mentalHealth.phone}`}><Phone size={17} /> Tele-MANAS {resources.mentalHealth.phone}</a>
        </div>
      )}
      <div className="result-footer">
        <button className="text-button" onClick={restart}><RotateCcw size={16} /> Start a new relay</button>
        <button className="emergency-link" onClick={onEmergency}><AlertTriangle size={15} /> Something changed / Call 112</button>
      </div>
      {shareOpen && (
        <ShareModal
          text={result.supportMessageDraft}
          close={() => setShareOpen(false)}
          copy={copy}
          copied={copied}
        />
      )}
    </section>
  );
}

function ShareModal({ text, close, copy, copied }) {
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "A Haven Relay support request", text }); } catch { /* user cancelled */ }
    } else {
      await copy(text, "message");
    }
  };
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="share-title">
      <div className="modal">
        <button className="modal-close" onClick={close} aria-label="Close"><X /></button>
        <span className="eyebrow">REVIEW BEFORE SHARING</span>
        <h2 id="share-title">Your support draft</h2>
        <p className="draft">{text}</p>
        <div className="safety-note"><LockKeyhole size={17} /><span>Haven opens your device’s share sheet. It cannot see whether a message was sent or received.</span></div>
        <div className="modal-actions">
          <button className="secondary-cta" onClick={() => copy(text, "message")}><Clipboard size={17} /> {copied === "message" ? "Copied" : "Copy draft"}</button>
          <button className="primary-cta" onClick={share}><Send size={17} /> Open share options</button>
        </div>
      </div>
    </div>
  );
}

function EmergencyView({ signals = [], close }) {
  const script = buildEmergencyScript(signals);
  const [copied, setCopied] = useState(false);
  return (
    <main className="emergency-page">
      <div className="emergency-header"><Brand /><StatusPill tone="cream">Fixed safety route · no AI used</StatusPill></div>
      <section className="emergency-panel">
        <span className="emergency-icon"><AlertTriangle /></span>
        <span className="eyebrow">IMMEDIATE ACTION</span>
        <h1>Call 112 now.</h1>
        <p>If the person is not responding, not breathing normally, having a seizure, collapsed, or in immediate danger, contact emergency services.</p>
        <a className="call-button" href="tel:112"><Phone /> Call 112</a>
        <small>The call starts only when you tap and confirm on your device.</small>
      </section>
      <div className="emergency-grid">
        <article>
          <span className="card-number">1</span>
          <div><h2>Stay with the person if it is safe</h2><p>Put the phone on speaker and follow the emergency dispatcher’s instructions. Do not delay the call to use this app.</p></div>
        </article>
        <article>
          <span className="card-number">2</span>
          <div><h2>Say only what you know</h2><blockquote>“{script}”</blockquote><button onClick={async () => { await navigator.clipboard?.writeText(script); setCopied(true); }}><Clipboard size={16} /> {copied ? "Copied" : "Copy script"}</button></div>
        </article>
      </div>
      <div className="emergency-source">
        <ShieldCheck />
        <span><b>{resources.emergency.name}</b><small>{resources.emergency.description} Resource reviewed {resources.emergency.verified}.</small></span>
        <a href={resources.emergency.sourceUrl} target="_blank" rel="noreferrer">Official source <ExternalLink size={14} /></a>
      </div>
      <button className="back-home" onClick={close}><ArrowLeft size={17} /> Return to Haven Relay</button>
      <p className="prototype-warning">Prototype only. Haven Relay is not a medical device or emergency service and has not been clinically validated.</p>
    </main>
  );
}

function CalmPlan({ close, initial, save }) {
  const [plan, setPlan] = useState(initial || { supportName: "", safePlace: "", tone: "calm" });
  return (
    <div className="modal-backdrop plan-backdrop" role="dialog" aria-modal="true">
      <div className="modal plan-modal">
        <button className="modal-close" onClick={close}><X /></button>
        <span className="eyebrow">FOR A CALMER MOMENT</span>
        <h2>Prepare your calm plan</h2>
        <p>These optional details stay in this browser’s local storage. They are never sent to Haven’s server.</p>
        <label>Who could you contact?<input value={plan.supportName} maxLength={40} placeholder="Name or relationship" onChange={(e) => setPlan({ ...plan, supportName: e.target.value })} /></label>
        <label>Where could you move to?<input value={plan.safePlace} maxLength={60} placeholder="A shared room, lobby, or trusted place" onChange={(e) => setPlan({ ...plan, safePlace: e.target.value })} /></label>
        <fieldset><legend>How should your words sound?</legend><div className="chip-row">
          {["direct", "calm", "gentle"].map((tone) => <button key={tone} className={plan.tone === tone ? "chip active" : "chip"} onClick={() => setPlan({ ...plan, tone })}>{tone}</button>)}
        </div></fieldset>
        <div className="safety-note"><LockKeyhole size={17} /><span>Anyone using this browser profile could see this plan. Leave fields blank on a shared device.</span></div>
        <div className="modal-actions"><button className="secondary-cta" onClick={close}>Cancel</button><button className="primary-cta" onClick={() => save(plan)}><Check size={17} /> Save on this device</button></div>
      </div>
    </div>
  );
}

function ResourceSection({ onEmergency }) {
  return (
    <section className="resources-section" id="resources">
      <div className="section-intro">
        <span className="eyebrow">VERIFIED INDIA NATIONAL PACK</span>
        <h2>Human help, one tap away</h2>
        <p>Numbers and links are resolved from a fixed registry—not generated by AI. Reviewed {VERIFIED_ON}.</p>
      </div>
      <div className="resource-grid">
        <button className="resource-card emergency-resource" onClick={onEmergency}>
          <AlertTriangle /><span><small>IMMEDIATE DANGER</small><b>Call 112</b><p>{resources.emergency.shortName}</p></span><ArrowRight />
        </button>
        <a className="resource-card" href={`tel:${resources.substanceSupport.phone}`}>
          <Phone /><span><small>COUNSELLING & REFERRAL</small><b>{resources.substanceSupport.phone}</b><p>{resources.substanceSupport.shortName}</p></span><ArrowRight />
        </a>
        <a className="resource-card" href={`tel:${resources.mentalHealth.phone}`}>
          <HeartHandshake /><span><small>MENTAL HEALTH SUPPORT</small><b>{resources.mentalHealth.phone}</b><p>Tele-MANAS · 24×7</p></span><ArrowRight />
        </a>
      </div>
      <p className="resource-disclaimer">India reference configuration · Service availability and suitability should be rechecked before real-world use.</p>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <Brand />
      <p>A safety-routed communication prototype for moments when words are hard.</p>
      <span>18+ prototype · not medical care, diagnosis, monitoring, or an emergency service</span>
    </footer>
  );
}

export default function App() {
  const [view, setView] = useState("landing");
  const [step, setStep] = useState(1);
  const [input, setInput] = useState(defaultInput);
  const [decision, setDecision] = useState(null);
  const [result, setResult] = useState(null);
  const [voice, setVoice] = useState("");
  const [planOpen, setPlanOpen] = useState(false);
  const [plan, setPlan] = useState(() => {
    try { return JSON.parse(localStorage.getItem("haven-relay-plan") || "null"); } catch { return null; }
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view, step]);

  const start = (role) => {
    setInput({ ...defaultInput, role, tone: plan?.tone || "direct" });
    setVoice("");
    setDecision(null);
    setResult(null);
    setStep(1);
    setView("flow");
  };

  const run = async () => {
    const safety = routeSafety(input);
    setDecision(safety);
    if (safety.tier === "emergency") {
      setView("emergency");
      return;
    }
    setStep(3);
    setResult(null);
    const payload = await requestIntervention(input);
    setDecision(payload.decision);
    setResult(payload.result);
  };

  const savePlan = (value) => {
    localStorage.setItem("haven-relay-plan", JSON.stringify(value));
    setPlan(value);
    setPlanOpen(false);
  };

  if (view === "emergency") {
    return <EmergencyView signals={input.signalIds} close={() => setView("landing")} />;
  }

  return (
    <div className="app-shell">
      <AppHeader
        onHome={() => setView("landing")}
        onEmergency={() => { setInput({ ...input, signalIds: [] }); setView("emergency"); }}
        onPlan={() => setPlanOpen(true)}
        planReady={Boolean(plan)}
      />
      {view === "landing" && <Landing onStart={start} onEmergency={() => setView("emergency")} onPlan={() => setPlanOpen(true)} planReady={Boolean(plan)} />}
      {view === "flow" && (
        <main className="flow-shell">
          {step === 1 && <ContextStep input={input} setInput={setInput} voice={voice} setVoice={setVoice} next={() => setStep(2)} back={() => setView("landing")} />}
          {step === 2 && <SafetyStep input={input} setInput={setInput} next={run} back={() => setStep(1)} onEmergency={() => setView("emergency")} />}
          {step === 3 && !result && <LoadingCard />}
          {step === 3 && result && <ResultStep input={input} decision={decision} result={result} restart={() => start(input.role)} back={() => setStep(1)} onEmergency={() => setView("emergency")} />}
        </main>
      )}
      {view === "landing" && <Footer />}
      {planOpen && <CalmPlan close={() => setPlanOpen(false)} initial={plan} save={savePlan} />}
    </div>
  );
}
