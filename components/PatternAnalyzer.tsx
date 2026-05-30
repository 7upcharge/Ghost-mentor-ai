"use client";

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useApp, PersonalityProfile } from "@/lib/appState";
import GhostOrb from "./GhostOrb";

// ── Film grain
function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        opacity: 0.032,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "160px 160px",
      }}
    />
  );
}

function Vignette() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background:
          "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, rgba(0,0,0,0.75) 100%)",
      }}
    />
  );
}

function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute"
        style={{
          width: "70vw",
          height: "50vw",
          top: "-20vw",
          left: "15vw",
          background:
            "radial-gradient(ellipse, rgba(139,108,246,0.065) 0%, rgba(100,74,210,0.02) 50%, transparent 70%)",
          filter: "blur(60px)",
        }}
        animate={{ x: [-12, 12, -8, 10, -12], y: [0, -10, -4, -16, 0], scale: [1, 1.05, 0.97, 1.03, 1] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ── Category color config
const CATEGORY_CONFIG = {
  coreFears: {
    label: "Core Fears",
    description: "Specific underlying fears driving behavior",
    accent: "rgba(239,68,68,0.7)",
    accentDim: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.18)",
    glow: "rgba(239,68,68,0.08)",
    icon: "◈",
  },
  biggestAmbitions: {
    label: "Biggest Ambitions",
    description: "Repeatedly mentioned desires — what they actually want",
    accent: "rgba(139,108,246,0.85)",
    accentDim: "rgba(139,108,246,0.1)",
    border: "rgba(139,108,246,0.22)",
    glow: "rgba(139,108,246,0.07)",
    icon: "◎",
  },
  avoidancePatterns: {
    label: "Avoidance Patterns",
    description: "What they circle around but never commit to",
    accent: "rgba(245,158,11,0.7)",
    accentDim: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.18)",
    glow: "rgba(245,158,11,0.06)",
    icon: "◷",
  },
  recurringStruggles: {
    label: "Recurring Struggles",
    description: "Same problem appearing in different forms",
    accent: "rgba(251,146,60,0.75)",
    accentDim: "rgba(251,146,60,0.08)",
    border: "rgba(251,146,60,0.18)",
    glow: "rgba(251,146,60,0.06)",
    icon: "◌",
  },
  selfTalkPatterns: {
    label: "Self-Talk Patterns",
    description: "How they speak about themselves",
    accent: "rgba(156,163,175,0.7)",
    accentDim: "rgba(156,163,175,0.06)",
    border: "rgba(156,163,175,0.15)",
    glow: "rgba(156,163,175,0.04)",
    icon: "◐",
  },
  unstatedValues: {
    label: "Unstated Values",
    description: "What they care most about — never said directly",
    accent: "rgba(52,211,153,0.7)",
    accentDim: "rgba(52,211,153,0.08)",
    border: "rgba(52,211,153,0.18)",
    glow: "rgba(52,211,153,0.06)",
    icon: "◇",
  },
};

// ── List category panel
function CategoryPanel({
  categoryKey,
  items,
  delay = 0,
}: {
  categoryKey: keyof typeof CATEGORY_CONFIG;
  items: string[];
  delay?: number;
}) {
  const cfg = CATEGORY_CONFIG[categoryKey];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(145deg, rgba(12,12,18,0.9) 0%, rgba(9,9,15,0.95) 100%)`,
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 0 32px ${cfg.glow}, 0 16px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.035)`,
      }}
    >
      {/* Top accent line */}
      <div
        className="h-px w-full"
        style={{ background: `linear-gradient(90deg, transparent, ${cfg.accent}, transparent)` }}
      />
      <div className="p-3 md:p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <span
            className="text-[11px] mt-0.5 select-none shrink-0"
            style={{ color: cfg.accent }}
          >
            {cfg.icon}
          </span>
          <div>
            <h3
              className="text-[11px] tracking-[0.2em] uppercase font-semibold font-heading mb-0.5"
              style={{ color: cfg.accent }}
            >
              {cfg.label}
            </h3>
            <p className="text-[11px] font-light" style={{ color: "rgba(255,255,255,0.28)" }}>
              {cfg.description}
            </p>
          </div>
        </div>

        {/* Items */}
        <ul className="flex flex-col gap-2.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className="shrink-0 mt-[5px] w-1 h-1 rounded-full"
                style={{ background: cfg.accent, boxShadow: `0 0 4px ${cfg.accent}` }}
              />
              <p
                className="text-[13.5px] font-light leading-relaxed"
                style={{ color: "rgba(240,240,244,0.82)" }}
              >
                {item}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

// ── Communication style panel
function CommunicationPanel({
  data,
  delay = 0,
}: {
  data: PersonalityProfile["communicationStyle"];
  delay?: number;
}) {
  const rows = [
    { label: "Confusion", value: data.confusionExpression },
    { label: "Excitement", value: data.excitementExpression },
    { label: "Doubt", value: data.doubtExpression },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(145deg, rgba(12,12,18,0.9) 0%, rgba(9,9,15,0.95) 100%)",
        border: "1px solid rgba(96,165,250,0.2)",
        boxShadow:
          "0 0 32px rgba(96,165,250,0.06), 0 16px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.035)",
      }}
    >
      <div
        className="h-px w-full"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(96,165,250,0.6), transparent)",
        }}
      />
      <div className="p-3 md:p-6">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-[11px] mt-0.5 select-none shrink-0" style={{ color: "rgba(96,165,250,0.8)" }}>
            ◫
          </span>
          <div>
            <h3
              className="text-[11px] tracking-[0.2em] uppercase font-semibold font-heading mb-0.5"
              style={{ color: "rgba(96,165,250,0.8)" }}
            >
              Communication Style
            </h3>
            <p className="text-[11px] font-light" style={{ color: "rgba(255,255,255,0.28)" }}>
              How they express confusion, excitement, and doubt
            </p>
          </div>
        </div>

        {/* Overall tone */}
        <div
          className="mb-4 p-3.5 rounded-xl"
          style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.12)" }}
        >
          <p
            className="text-[12px] tracking-[0.15em] uppercase font-semibold font-heading mb-1"
            style={{ color: "rgba(96,165,250,0.6)" }}
          >
            Overall Tone
          </p>
          <p className="text-[13.5px] font-light leading-relaxed" style={{ color: "rgba(240,240,244,0.85)" }}>
            {data.overallTone}
          </p>
        </div>

        {/* Row breakdown */}
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-1">
              <span
                className="text-[9.5px] tracking-[0.18em] uppercase font-semibold font-heading"
                style={{ color: "rgba(96,165,250,0.45)" }}
              >
                {row.label}
              </span>
              <p
                className="text-[13px] font-light leading-relaxed"
                style={{ color: "rgba(240,240,244,0.72)" }}
              >
                {row.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Results view
function ResultsView({
  profile,
  onReset,
}: {
  profile: PersonalityProfile;
  onReset: () => void;
}) {
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(profile, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [profile]);

  return (
    <div className="w-full max-w-[700px] mx-auto px-4 sm:px-6 pb-16 pt-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8 flex flex-col gap-2"
      >
        <span
          className="text-[9px] tracking-[0.28em] uppercase font-semibold font-heading"
          style={{ color: "rgba(139,108,246,0.55)" }}
        >
          Pattern Analysis Complete
        </span>
        <h2
          className="text-[22px] sm:text-[26px] font-light tracking-tight"
          style={{ color: "rgba(240,240,244,0.9)", fontFamily: "var(--font-heading)" }}
        >
          Psychological Profile
        </h2>
        {profile.analysisNote && (
          <p className="text-[12px] font-light leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
            ⚠ {profile.analysisNote}
          </p>
        )}
      </motion.div>

      {/* Grid of panels */}
      <div className="flex flex-col gap-4">
        {/* Top 2-col: fears + ambitions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CategoryPanel categoryKey="coreFears" items={profile.coreFears} delay={0.05} />
          <CategoryPanel categoryKey="biggestAmbitions" items={profile.biggestAmbitions} delay={0.12} />
        </div>

        {/* Avoidance + recurring struggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CategoryPanel categoryKey="avoidancePatterns" items={profile.avoidancePatterns} delay={0.18} />
          <CategoryPanel categoryKey="recurringStruggles" items={profile.recurringStruggles} delay={0.24} />
        </div>

        {/* Communication full-width */}
        <CommunicationPanel data={profile.communicationStyle} delay={0.3} />

        {/* Self-talk + values */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CategoryPanel categoryKey="selfTalkPatterns" items={profile.selfTalkPatterns} delay={0.36} />
          <CategoryPanel categoryKey="unstatedValues" items={profile.unstatedValues} delay={0.42} />
        </div>

        {/* JSON toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="mt-2"
        >
          <button
            id="toggle-json-btn"
            onClick={() => setShowJson((v) => !v)}
            className="flex items-center gap-1.5 text-[10.5px] font-light cursor-pointer transition-colors duration-200"
            style={{ color: showJson ? "rgba(139,108,246,0.7)" : "rgba(255,255,255,0.25)" }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: showJson ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
            {showJson ? "Hide" : "View"} raw JSON
          </button>

          <AnimatePresence>
            {showJson && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden mt-3"
              >
                <div
                  className="rounded-2xl relative"
                  style={{
                    background: "rgba(8,8,12,0.9)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <span className="text-[9px] tracking-[0.2em] uppercase font-heading" style={{ color: "rgba(255,255,255,0.25)" }}>
                      JSON Output
                    </span>
                    <button
                      id="copy-json-btn"
                      onClick={handleCopy}
                      className="text-[10px] flex items-center gap-1.5 cursor-pointer transition-colors duration-200"
                      style={{ color: copied ? "rgba(52,211,153,0.8)" : "rgba(255,255,255,0.3)" }}
                    >
                      {copied ? (
                        <>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                          Copied
                        </>
                      ) : (
                        <>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <pre
                    className="p-4 text-[11px] leading-relaxed font-mono overflow-x-auto"
                    style={{ color: "rgba(240,240,244,0.6)" }}
                  >
                    {JSON.stringify(profile, null, 2)}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Footer actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65 }}
        className="mt-10 flex items-center justify-between"
      >
        <button
          id="analyze-new-btn"
          onClick={onReset}
          className="flex items-center gap-1.5 text-[11px] font-light cursor-pointer transition-colors duration-200 px-4 py-2 rounded-xl"
          style={{
            color: "rgba(255,255,255,0.4)",
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "rgba(255,255,255,0.65)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(255,255,255,0.4)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Analyze new conversation
        </button>

        <span className="text-[9.5px] font-light" style={{ color: "rgba(255,255,255,0.12)" }}>
          Patterns from: this session only
        </span>
      </motion.div>
    </div>
  );
}

// ── Thinking state
const THINKING_STEPS = [
  "Tracing the emotional signature…",
  "Mapping avoidance loops…",
  "Identifying recurring fears…",
  "Reading between the lines…",
  "Finalizing pattern profile…",
];

function AnalyzingState() {
  const [stepIndex, setStepIndex] = useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1) % THINKING_STEPS.length);
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center gap-6 py-20"
    >
      <GhostOrb size="md" isThinking />
      <div className="flex items-center gap-2 h-6">
        <AnimatePresence mode="wait">
          <motion.span
            key={stepIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="text-[11px] tracking-[0.2em] uppercase font-semibold font-heading"
            style={{ color: "rgba(139,108,246,0.65)" }}
          >
            {THINKING_STEPS[stepIndex]}
          </motion.span>
        </AnimatePresence>
        <div className="flex gap-[3px] items-center ml-1">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </motion.div>
  );
}

// ── Main PatternAnalyzer component
export default function PatternAnalyzer() {
  const { goToScreen } = useApp();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"input" | "analyzing" | "results">("input");
  const [profile, setProfile] = useState<PersonalityProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAnalyze = useCallback(async () => {
    if (text.trim().length < 50 || phase === "analyzing") return;
    setError(null);
    setPhase("analyzing");

    try {
      const response = await fetch("/api/analyze-patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Analysis failed.");
      }

      // Brief delay so the thinking animation doesn't feel abrupt
      await new Promise((r) => setTimeout(r, 1200));
      setProfile(data as PersonalityProfile);
      setPhase("results");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed.";
      setError(msg);
      setPhase("input");
    }
  }, [text, phase]);

  const handleReset = useCallback(() => {
    setText("");
    setProfile(null);
    setError(null);
    setPhase("input");
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  const handleBack = useCallback(() => {
    goToScreen("chat");
  }, [goToScreen]);

  const charCount = text.trim().length;
  const isReady = charCount >= 50;

  return (
    <div className="relative flex flex-col min-h-screen overflow-x-hidden bg-ghost-bg">
      <GrainOverlay />
      <Vignette />
      <AmbientBackground />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-5 shrink-0">
        <motion.button
          id="back-from-analyzer-btn"
          onClick={handleBack}
          whileHover={{ x: -2 }}
          transition={{ duration: 0.18 }}
          className="flex items-center gap-1.5 cursor-pointer"
          style={{ color: "rgba(255,255,255,0.3)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span className="text-[11px] font-light tracking-wide">Back</span>
        </motion.button>

        {/* Wordmark */}
        <div className="flex items-center gap-2">
          <div
            className="w-[18px] h-[18px] rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(139, 108, 246, 0.12)",
              border: "1px solid rgba(139,108,246,0.28)",
            }}
          >
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="3" fill="rgba(139,108,246,0.88)" />
              <circle cx="6" cy="6" r="1.4" fill="white" fillOpacity="0.55" />
            </svg>
          </div>
          <span
            className="text-[12px] font-medium tracking-tight"
            style={{ color: "rgba(240,240,244,0.65)", fontFamily: "var(--font-heading)" }}
          >
            Pattern Analyzer
          </span>
        </div>

        <div style={{ width: 60 }} /> {/* spacer */}
      </header>

      {/* Main content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {phase === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[660px] mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8"
            >
              {/* Orb + title */}
              <div className="flex flex-col items-center gap-4 text-center">
                <GhostOrb size="sm" animate />
                <div className="flex flex-col gap-2">
                  <h1
                    className="text-[22px] sm:text-[28px] font-light tracking-tight"
                    style={{ color: "rgba(240,240,244,0.9)", fontFamily: "var(--font-heading)" }}
                  >
                    Psychological Pattern Scan
                  </h1>
                  <p
                    className="text-[13.5px] font-light leading-relaxed max-w-[420px]"
                    style={{ color: "rgba(240,240,244,0.42)" }}
                  >
                    Paste any conversation — journal entries, chat history, voice notes. 
                    Get back a specific, honest profile. No compliments. No fluff.
                  </p>
                </div>
              </div>

              {/* What you get */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-2 justify-center"
              >
                {[
                  "Core fears",
                  "Ambitions",
                  "Avoidance loops",
                  "Communication patterns",
                  "Recurring struggles",
                  "Self-talk",
                  "Unstated values",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full text-[10.5px] font-light"
                    style={{
                      color: "rgba(139,108,246,0.65)",
                      border: "1px solid rgba(139,108,246,0.18)",
                      background: "rgba(139,108,246,0.05)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </motion.div>

              {/* Textarea */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="flex flex-col gap-2"
              >
                <div
                  className="relative rounded-2xl overflow-hidden"
                  style={{
                    background: "rgba(12,12,18,0.85)",
                    border: `1px solid ${isReady ? "rgba(139,108,246,0.28)" : "rgba(255,255,255,0.07)"}`,
                    boxShadow: isReady
                      ? "0 0 24px rgba(139,108,246,0.07), 0 8px 32px rgba(0,0,0,0.35)"
                      : "0 8px 32px rgba(0,0,0,0.3)",
                    transition: "border-color 0.3s ease, box-shadow 0.3s ease",
                  }}
                >
                  <textarea
                    id="pattern-input-textarea"
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste your conversations here…&#10;&#10;Chat logs, journal entries, voice transcripts — anything where you expressed yourself. The analyzer extracts patterns from how you think and communicate, not what you say you want."
                    rows={12}
                    className="w-full bg-transparent p-5 text-[13.5px] sm:text-[14px] font-light leading-relaxed outline-none resize-none"
                    style={{
                      color: "rgba(240,240,244,0.85)",
                      caretColor: "rgba(139,108,246,0.9)",
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.metaKey && isReady) {
                        e.preventDefault();
                        handleAnalyze();
                      }
                    }}
                  />
                  {/* char count */}
                  <div
                    className="absolute bottom-3 right-4 text-[10px] font-light"
                    style={{ color: charCount > 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)" }}
                  >
                    {charCount < 50 && charCount > 0 ? `${50 - charCount} more chars needed` : charCount > 0 ? `${charCount.toLocaleString()} chars` : ""}
                  </div>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[12px] font-light px-1"
                    style={{ color: "rgba(239,68,68,0.75)" }}
                  >
                    {error}
                  </motion.p>
                )}
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center gap-3"
              >
                <motion.button
                  id="run-analysis-btn"
                  onClick={handleAnalyze}
                  disabled={!isReady}
                  whileHover={isReady ? { scale: 1.02, y: -1 } : {}}
                  whileTap={isReady ? { scale: 0.98 } : {}}
                  transition={{ duration: 0.18 }}
                  className="relative overflow-hidden px-7 py-3.5 rounded-xl text-[13px] font-medium cursor-pointer disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2"
                  style={{
                    background: isReady
                      ? "linear-gradient(135deg, rgba(139,108,246,0.9), rgba(109,79,224,0.9))"
                      : "rgba(255,255,255,0.05)",
                    color: isReady ? "#ffffff" : "rgba(255,255,255,0.2)",
                    border: `1px solid ${isReady ? "rgba(139,108,246,0.5)" : "rgba(255,255,255,0.06)"}`,
                    boxShadow: isReady
                      ? "0 0 32px rgba(139,108,246,0.2), 0 8px 24px rgba(0,0,0,0.3)"
                      : "none",
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ opacity: isReady ? 1 : 0.4 }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  Analyze Patterns
                </motion.button>

                <span className="text-[10px] font-light" style={{ color: "rgba(255,255,255,0.15)" }}>
                  ⌘ + Enter to analyze · Analyzed locally via Gemini
                </span>
              </motion.div>
            </motion.div>
          )}

          {phase === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center justify-center min-h-[60vh]"
            >
              <AnalyzingState />
            </motion.div>
          )}

          {phase === "results" && profile && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <ResultsView profile={profile} onReset={handleReset} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
