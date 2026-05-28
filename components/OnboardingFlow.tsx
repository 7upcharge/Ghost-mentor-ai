"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useDropzone } from "react-dropzone";
import GhostOrb from "./GhostOrb";
import GlowButton from "./GlowButton";
import ProgressDots from "./ProgressDots";
import { useApp } from "@/lib/appState";
import { createFutureSelfMemoryProfileFromUserContext } from "@/lib/simulationEngine";
import { parseFileClientSide, chunkAndTruncateText } from "@/lib/parsers";

/* ═══════════════════════════════════════════
   Aspiration data
   ═══════════════════════════════════════════ */
const aspirations = [
  {
    id: "leader",
    label: "Leading a company",
    sub: "Building something that changes the world",
    icon: "◈",
  },
  {
    id: "peace",
    label: "At peace with myself",
    sub: "Inner calm, clarity, and self-acceptance",
    icon: "◇",
  },
  {
    id: "explorer",
    label: "Exploring the world",
    sub: "Freedom, adventure, new perspectives",
    icon: "◉",
  },
  {
    id: "builder",
    label: "Building something meaningful",
    sub: "Creating impact through craft and innovation",
    icon: "◫",
  },
  {
    id: "artist",
    label: "Creating art that moves people",
    sub: "Expressing what words can't capture",
    icon: "◎",
  },
  {
    id: "connected",
    label: "Deeply connected with loved ones",
    sub: "Rich relationships and genuine belonging",
    icon: "◐",
  },
];

/* ═══════════════════════════════════════════
   Slide variants — clean cinematic transitions
   ═══════════════════════════════════════════ */
const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 36 : -36,
    opacity: 0,
    filter: "blur(2px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -36 : 36,
    opacity: 0,
    filter: "blur(2px)",
  }),
};

/* ═══════════════════════════════════════════
   Calibrating screen
   ═══════════════════════════════════════════ */
function CalibratingScreen() {
  const messages = [
    "Reading your timeline…",
    "Mapping emotional patterns…",
    "Building your future-self memory…",
    "Calibrating your Ghost Mentor…",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
      className="flex flex-col items-center justify-center min-h-screen px-6 gap-8"
    >
      <GhostOrb size="md" isThinking />

      {/* Message sequence */}
      <div className="relative flex flex-col items-center gap-2 min-h-[72px]">
        {messages.map((msg, i) => (
          <motion.p
            key={msg}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: [0, 1, 1, 0], y: [5, 0, 0, -4] }}
            transition={{
              delay: i * 1.2,
              duration: 1.2,
              times: [0, 0.12, 0.88, 1],
            }}
            className="text-sm text-ghost-text-secondary tracking-wide text-center absolute"
          >
            {msg}
          </motion.p>
        ))}
      </div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="w-28 h-px rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(139,108,246,0.8), transparent)",
          }}
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   Input styles
   ═══════════════════════════════════════════ */
const inputClass =
  "w-full bg-transparent border-b border-ghost-border focus:border-ghost-accent/45 text-2xl sm:text-3xl font-light text-ghost-text placeholder:text-ghost-muted/30 py-2.5 outline-none transition-all duration-300 tracking-tight";

const textareaClass =
  "w-full bg-ghost-surface/50 border border-ghost-border focus:border-ghost-accent/35 rounded-2xl text-[15px] font-light text-ghost-text placeholder:text-ghost-muted/30 p-4 outline-none transition-all duration-300 resize-none leading-relaxed focus:shadow-[0_0_0_3px_rgba(139,108,246,0.07)]";

/* ═══════════════════════════════════════════
   Step card wrapper
   ═══════════════════════════════════════════ */
function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="glass-card rounded-2xl p-7 sm:p-9"
      style={{ minHeight: 280 }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Step label
   ═══════════════════════════════════════════ */
function StepLabel({ current, total }: { current: number; total: number }) {
  return (
    <p className="text-[10px] text-ghost-accent/60 tracking-[0.18em] uppercase mb-3.5 font-medium font-heading">
      Step {current} of {total}
    </p>
  );
}

/* ═══════════════════════════════════════════
   Main Onboarding — 4 steps
   0: Name
   1: Aspiration
   2: Struggle
   3: Context calibration (optional — can skip)
   ═══════════════════════════════════════════ */
interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { state, dispatch } = useApp();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [calibrating, setCalibrating] = useState(false);
  const [selectedAspiration, setSelectedAspiration] = useState<string | null>(null);
  const [userContext, setUserContext] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setIsParsing(true);
    try {
      const file = acceptedFiles[0];
      const parsed = await parseFileClientSide(file);
      
      if (parsed.type === "pdf") {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/parse-pdf", { method: "POST", body: formData });
        const data = await res.json();
        if (data.text) {
          setUserContext(prev => prev + (prev ? "\n\n" : "") + data.text);
        }
      } else {
        setUserContext(prev => prev + (prev ? "\n\n" : "") + parsed.content);
      }
    } catch (e) {
      console.error("Failed to parse file", e);
    } finally {
      setIsParsing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    accept: {
      "text/plain": [".txt", ".md"],
      "application/json": [".json"],
      "application/pdf": [".pdf"]
    },
    maxFiles: 1
  });

  const TOTAL_STEPS = 4;
  const name = state.user.name;
  const struggle = state.user.currentStruggle;

  const canAdvance =
    (step === 0 && name.trim().length >= 1) ||
    (step === 1 && selectedAspiration !== null) ||
    (step === 2 && struggle.trim().length >= 5) ||
    step === 3; // context step is always skippable

  const finishOnboarding = useCallback(async () => {
    setCalibrating(true);
    const textToAnalyze = userContext.trim();

    // Fallback to basic extraction if API fails or text is too short
    const fallbackExtract = () => {
      const extractedProfile = createFutureSelfMemoryProfileFromUserContext(
        textToAnalyze,
        state.user
      );
      dispatch({ type: "SET_MEMORY_PROFILE", memoryProfile: extractedProfile });
    };

    if (textToAnalyze.length > 30) {
      try {
        const response = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: chunkAndTruncateText(textToAnalyze),
            user: state.user
          }),
        });
        
        if (!response.ok) throw new Error("API failed");
        
        const data = await response.json();
        if (data && data.identity) {
          dispatch({ type: "SET_MEMORY_PROFILE", memoryProfile: data });
        } else {
          fallbackExtract();
        }
      } catch (e) {
        console.error("Extraction error:", e);
        fallbackExtract();
      }
    }
    
    setTimeout(() => onComplete(), 1000);
  }, [userContext, state.user, dispatch, onComplete]);

  const nextStep = useCallback(() => {
    if (step === 1 && selectedAspiration) {
      const asp = aspirations.find((a) => a.id === selectedAspiration);
      if (asp) dispatch({ type: "SET_USER_ASPIRATION", aspiration: asp.label });
    }
    if (step < TOTAL_STEPS - 1) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      finishOnboarding();
    }
  }, [step, selectedAspiration, dispatch, finishOnboarding]);

  const prevStep = useCallback(() => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }, [step]);

  if (calibrating) {
    return (
      <AnimatePresence mode="wait">
        <CalibratingScreen />
      </AnimatePresence>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 overflow-hidden">

      {/* Orb — compact, breathing */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <GhostOrb size="sm" />
      </motion.div>

      {/* Progress dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mb-8"
      >
        <ProgressDots total={TOTAL_STEPS} current={step} />
      </motion.div>

      {/* Step cards */}
      <div className="relative w-full max-w-[440px]" style={{ minHeight: 360 }}>
        <AnimatePresence mode="wait" custom={direction}>

          {/* Step 0 — Name */}
          {step === 0 && (
            <motion.div
              key="step-name"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.32, 0, 0.67, 0] }}
              className="absolute inset-0"
            >
              <StepCard>
                <StepLabel current={1} total={TOTAL_STEPS} />
                <motion.h2
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.5 }}
                  className="text-headline mb-1.5"
                >
                  What should your future self
                  <br />
                  <span className="text-gradient-accent">call you?</span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.18 }}
                  className="text-[13px] text-ghost-text-secondary mb-7 font-light"
                >
                  The name they&apos;ll use when they speak to you.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.26 }}
                >
                  <input
                    type="text"
                    value={name}
                    onChange={(e) =>
                      dispatch({ type: "SET_USER_NAME", name: e.target.value })
                    }
                    placeholder="Your first name"
                    autoFocus
                    className={inputClass}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canAdvance) nextStep();
                    }}
                  />
                </motion.div>
              </StepCard>
            </motion.div>
          )}

          {/* Step 1 — Aspiration */}
          {step === 1 && (
            <motion.div
              key="step-aspiration"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.32, 0, 0.67, 0] }}
              className="absolute inset-0"
            >
              <StepCard>
                <StepLabel current={2} total={TOTAL_STEPS} />
                <motion.h2
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                  className="text-headline mb-1.5"
                >
                  Where do you see yourself
                  <br />
                  <span className="text-gradient-accent">in 10 years?</span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.18 }}
                  className="text-[13px] text-ghost-text-secondary mb-5 font-light"
                >
                  Pick what resonates most, {name || "friend"}.
                </motion.p>

                <div className="grid grid-cols-2 gap-2">
                  {aspirations.map((asp, i) => {
                    const isSelected = selectedAspiration === asp.id;
                    return (
                      <motion.button
                        key={asp.id}
                        initial={{ opacity: 0, y: 7 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.22 + i * 0.04 }}
                        whileHover={{ y: -1, transition: { duration: 0.18 } }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedAspiration(asp.id)}
                        className="relative flex flex-col items-start p-3 rounded-xl text-left cursor-pointer border text-sm transition-all duration-200"
                        style={{
                          borderColor: isSelected
                            ? "rgba(139,108,246,0.38)"
                            : "rgba(255,255,255,0.065)",
                          background: isSelected
                            ? "rgba(139,108,246,0.07)"
                            : "rgba(15,15,20,0.5)",
                          boxShadow: isSelected
                            ? "0 0 16px rgba(139,108,246,0.1), inset 0 1px 0 rgba(139,108,246,0.08)"
                            : "none",
                        }}
                      >
                        <span
                          className="text-[10px] mb-1 opacity-50"
                          style={{ color: isSelected ? "rgba(139,108,246,0.9)" : "rgba(255,255,255,0.35)" }}
                        >
                          {asp.icon}
                        </span>
                        <span className="font-medium text-ghost-text text-[12.5px] leading-snug mb-0.5">
                          {asp.label}
                        </span>
                        <span className="text-[10.5px] text-ghost-muted leading-snug">
                          {asp.sub}
                        </span>
                        {isSelected && (
                          <motion.div
                            layoutId="aspiration-check"
                            className="absolute top-2.5 right-2.5 w-[18px] h-[18px] rounded-full bg-ghost-accent flex items-center justify-center"
                            transition={{ type: "spring", stiffness: 500, damping: 28 }}
                            style={{ boxShadow: "0 0 8px rgba(139,108,246,0.5)" }}
                          >
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </StepCard>
            </motion.div>
          )}

          {/* Step 2 — Struggle */}
          {step === 2 && (
            <motion.div
              key="step-struggle"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.32, 0, 0.67, 0] }}
              className="absolute inset-0"
            >
              <StepCard>
                <StepLabel current={3} total={TOTAL_STEPS} />
                <motion.h2
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                  className="text-headline mb-1.5"
                >
                  What&apos;s weighing on your
                  <br />
                  <span className="text-gradient-accent">mind right now?</span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.18 }}
                  className="text-[13px] text-ghost-text-secondary mb-5 font-light leading-relaxed"
                >
                  A decision, a fear, a goal — whatever&apos;s keeping you up at night.
                  <br />
                  Your future self is listening, {name || "friend"}.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.26 }}
                >
                  <textarea
                    value={struggle}
                    onChange={(e) =>
                      dispatch({ type: "SET_USER_STRUGGLE", struggle: e.target.value })
                    }
                    placeholder="I've been struggling with…"
                    rows={4}
                    autoFocus
                    className={textareaClass}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && canAdvance) {
                        e.preventDefault();
                        nextStep();
                      }
                    }}
                  />
                  <p className="text-[10px] text-ghost-muted/35 mt-2">
                    Shift + Enter for new line
                  </p>
                </motion.div>
              </StepCard>
            </motion.div>
          )}

          {/* Step 3 — Context calibration (optional) */}
          {step === 3 && (
            <motion.div
              key="step-context"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.32, 0, 0.67, 0] }}
              className="absolute inset-0"
            >
              <StepCard>
                <StepLabel current={4} total={TOTAL_STEPS} />
                <motion.h2
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                  className="text-headline mb-1.5"
                >
                  Help your future self
                  <br />
                  <span className="text-gradient-accent">know you deeper.</span>
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.18 }}
                  className="text-[13px] text-ghost-text-secondary mb-4 font-light leading-relaxed"
                >
                  Paste a short self-description, your goals, fears, or even a summary of your
                  chat history. The more context, the more accurate your future self becomes.
                </motion.p>

                {/* What to paste — hints */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.22 }}
                  className="flex flex-wrap gap-1.5 mb-4"
                >
                  {["My goals", "My fears", "My personality", "Chat history summary"].map((hint) => (
                    <span
                      key={hint}
                      className="px-2 py-0.5 rounded-full text-[10px] font-light"
                      style={{
                        color: "rgba(139,108,246,0.7)",
                        border: "1px solid rgba(139,108,246,0.18)",
                        background: "rgba(139,108,246,0.05)",
                      }}
                    >
                      {hint}
                    </span>
                  ))}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 }}
                >
                  <div
                    {...getRootProps()}
                    className={`relative w-full rounded-2xl border-2 border-dashed transition-all duration-300 ${isDragActive ? "border-ghost-accent bg-ghost-accent/5" : "border-transparent"}`}
                  >
                    <input {...getInputProps()} />
                    <textarea
                      value={userContext}
                      onChange={(e) => setUserContext(e.target.value)}
                      placeholder={isParsing ? "Parsing file..." : `Paste text or drag & drop a file here (TXT, JSON, MD, PDF)…`}
                      rows={5}
                      autoFocus
                      className={textareaClass}
                      style={{ fontSize: "13.5px", position: "relative", zIndex: 10 }}
                      onClick={e => e.stopPropagation()} // Prevent click to upload when clicking text area
                    />
                    
                    {isDragActive && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl">
                        <p className="text-ghost-accent font-medium">Drop to import history</p>
                      </div>
                    )}
                  </div>
                </motion.div>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-[10px] text-ghost-muted/35">
                    Optional — skip to begin with a blank memory profile
                  </p>
                  <button onClick={(e) => {
                    e.preventDefault();
                    open();
                  }} className="text-[10px] text-ghost-accent/70 hover:text-ghost-accent transition-colors flex items-center gap-1 cursor-pointer">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Upload File
                  </button>
                </div>
              </StepCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="mt-6 flex items-center gap-3"
      >
        <AnimatePresence>
          {step > 0 && (
            <motion.button
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.22 }}
              whileHover={{ x: -2 }}
              onClick={prevStep}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm text-ghost-muted hover:text-ghost-text-secondary transition-colors cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Back
            </motion.button>
          )}
        </AnimatePresence>

        <GlowButton onClick={nextStep} size="lg" disabled={!canAdvance}>
          {step === TOTAL_STEPS - 1
            ? userContext.trim().length > 30
              ? "Calibrate My Future Self"
              : "Begin Session"
            : "Continue"}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </GlowButton>
      </motion.div>
    </div>
  );
}
