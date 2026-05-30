"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { signOut, useSession } from "next-auth/react";
import { useApp, InsightCard, FutureProjection } from "@/lib/appState";
import {
  generateInitialGreeting,
  generateGhostResponse,
  isConfusionMessage,
  SimulationResponse,
} from "@/lib/simulationEngine";
import GhostOrb, { OrbState } from "./GhostOrb";
import GlowButton from "./GlowButton";

// Film grain
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

// Cinematic vignette
function Vignette() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background:
          "radial-gradient(ellipse 75% 65% at 50% 50%, transparent 35%, rgba(0,0,0,0.72) 100%)",
      }}
    />
  );
}

// Ambient background motion
function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute"
        style={{
          width: "80vw",
          height: "50vw",
          top: "-20vw",
          left: "10vw",
          background:
            "radial-gradient(ellipse, rgba(139,108,246,0.07) 0%, rgba(100,74,210,0.025) 50%, transparent 70%)",
          filter: "blur(60px)",
        }}
        animate={{ x: [-15, 15, -8, 12, -15], y: [0, -12, -5, -18, 0], scale: [1, 1.06, 0.97, 1.04, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ── Insight Card
function InsightCardView({ card }: { card: InsightCard }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="mt-5 rounded-2xl overflow-hidden relative w-full"
      style={{
        background: "rgba(12, 12, 18, 0.85)",
        border: "1px solid rgba(139, 108, 246, 0.15)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow:
          "0 0 48px rgba(139, 108, 246, 0.06), 0 20px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Accent header bar */}
      <div
        className="h-px w-full"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(139,108,246,0.5), transparent)",
        }}
      />

      <div className="p-5 sm:p-6 flex flex-col gap-5">
        {/* Prediction */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-1 h-1 rounded-full"
              style={{ background: "rgba(139,108,246,0.8)", boxShadow: "0 0 4px rgba(139,108,246,0.6)" }}
            />
            <span className="text-[9px] tracking-[0.22em] uppercase text-ghost-accent/65 font-semibold font-heading">
              Future Prediction
            </span>
          </div>
          <p className="text-[14px] sm:text-[15px] font-light text-ghost-text leading-relaxed">
            {card.prediction}
          </p>
        </div>

        <div className="h-px" style={{ background: "rgba(255,255,255,0.04)" }} />

        {/* Actionable Step */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-1 h-1 rounded-full"
              style={{ background: "rgba(139,108,246,0.6)" }}
            />
            <span className="text-[9px] tracking-[0.22em] uppercase text-ghost-accent/65 font-semibold font-heading">
              Immediate Ritual
            </span>
          </div>
          <p className="text-[13.5px] font-light text-ghost-text-secondary leading-relaxed">
            {card.actionableStep}
          </p>
        </div>

        <div className="h-px" style={{ background: "rgba(255,255,255,0.04)" }} />

        {/* Emotional Truth */}
        <div className="relative pl-3.5 border-l border-ghost-accent/20">
          <p className="text-[12.5px] font-light italic text-ghost-text-secondary/70 leading-relaxed">
            &ldquo;{card.emotionalTruth}&rdquo;
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Future Projection Card — cinematic, screenshot-worthy
function FutureProjectionView({ projection }: { projection: FutureProjection }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      className="mt-5 rounded-2xl overflow-hidden w-full relative"
      style={{
        background: "linear-gradient(145deg, rgba(13,13,20,0.92) 0%, rgba(9,9,15,0.96) 100%)",
        border: "1px solid rgba(255,255,255,0.055)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        boxShadow: "0 32px 72px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Soft color washes */}
      <div
        className="absolute top-0 left-0 w-1/2 h-full pointer-events-none"
        style={{ background: "radial-gradient(circle at 15% 25%, rgba(220,60,60,0.04), transparent 55%)" }}
      />
      <div
        className="absolute top-0 right-0 w-1/2 h-full pointer-events-none"
        style={{ background: "radial-gradient(circle at 85% 75%, rgba(139,108,246,0.07), transparent 55%)" }}
      />

      {/* Top accent line */}
      <div
        className="h-px w-full"
        style={{
          background: "linear-gradient(90deg, rgba(200,80,80,0.3), transparent 45%, transparent 55%, rgba(139,108,246,0.4))",
        }}
      />

      <div className="p-5 sm:p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] tracking-[0.28em] uppercase text-ghost-muted/70 font-bold font-heading">
            Timeline Diagnostic
          </span>
          <h3 className="text-base sm:text-lg font-light text-ghost-text tracking-tight font-heading">
            Future Projection{" "}
            <span className="text-gradient-accent font-medium">— {projection.year}</span>
          </h3>
        </div>

        {/* Pathways */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 relative">

          {/* Divider — desktop only */}
          <div
            className="absolute top-0 bottom-0 left-1/2 w-px hidden sm:block"
            style={{
              background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.04), transparent)",
            }}
          />

          {/* Pathway A: If nothing changes */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "rgba(239,68,68,0.5)" }}
              />
              <span className="text-[9px] tracking-[0.22em] uppercase text-red-400/60 font-semibold font-heading">
                If nothing changes
              </span>
            </div>
            <ul className="flex flex-col gap-3">
              {projection.ifNothingChanges.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-[13px] font-light text-ghost-text-secondary/65 leading-relaxed"
                >
                  <span className="text-red-400/40 mt-0.5 select-none text-[10px] font-heading shrink-0">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pathway B: If you act now */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: "rgba(139,108,246,0.7)",
                  boxShadow: "0 0 8px rgba(139,108,246,0.55)",
                }}
              />
              <span className="text-[9px] tracking-[0.22em] uppercase text-ghost-accent-light/75 font-semibold font-heading">
                If you act now
              </span>
            </div>
            <ul className="flex flex-col gap-3">
              {projection.ifYouActNow.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-[13px] font-light text-ghost-text/88 leading-relaxed"
                >
                  <span className="text-ghost-accent-light/65 mt-0.5 select-none text-[10px] font-heading shrink-0">→</span>
                  <span className="text-ghost-text/85 font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div
          className="text-[9.5px] text-right font-light tracking-wide"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          Hold this truth close · Your present creates your destiny
        </div>
      </div>
    </motion.div>
  );
}

export default function ChatScreen() {
  const { state, dispatch, goToScreen } = useApp();
  const { data: session } = useSession();
  const [inputText, setInputText] = useState("");
  const [isTypingGhost, setIsTypingGhost] = useState(false);
  const [thinkingStepIndex, setThinkingStepIndex] = useState(-1);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [endingStatusText, setEndingStatusText] = useState("");
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [confusionCount, setConfusionCount] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeGhostTextRef = useRef("");
  const greetingTriggeredRef = useRef(false);
  const greetingSequenceActiveRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const promptSeeds = [
    "Will I make it to where I want to be?",
    "How do I deal with the anxiety of failure?",
    "What step should I take tomorrow morning?",
    "I'm feeling stuck in my current path.",
  ];

  const playGhostResponse = useCallback((text: string, onComplete: () => void) => {
    if (state.user.voiceId) {
      const audioUrl = `/api/elevenlabs/tts?text=${encodeURIComponent(text)}&voiceId=${state.user.voiceId}`;
      const audio = new window.Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        onComplete();
      };
      
      audio.play().catch((err) => {
        console.error("Audio playback failed", err);
        onComplete();
      });
      
      return (text.length / 15) * 1000; // ~15 chars/sec
    } else {
      setTimeout(onComplete, (text.length / 30) * 1000);
      return (text.length / 30) * 1000;
    }
  }, [state.user.voiceId]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior,
      });
    }
  }, []);

  useEffect(() => {
    if (state.messages.length === 0 && !greetingTriggeredRef.current) {
      greetingTriggeredRef.current = true;
      greetingSequenceActiveRef.current = true;
      dispatch({ type: "SET_THINKING", isThinking: true });
      const initGreeting = generateInitialGreeting(state.user);
      setThinkingSteps(initGreeting.thinkingSteps);
      setThinkingStepIndex(0);
    }
  }, [state.messages.length, state.user, dispatch]);

  useEffect(() => {
    if (!greetingSequenceActiveRef.current) return;

    if (thinkingStepIndex >= 0 && thinkingStepIndex < thinkingSteps.length) {
      const timer = setTimeout(() => {
        setThinkingStepIndex((prev) => prev + 1);
      }, 1200);
      return () => clearTimeout(timer);
    } else if (thinkingStepIndex >= 0 && thinkingStepIndex === thinkingSteps.length) {
      const timer = setTimeout(() => {
        greetingSequenceActiveRef.current = false;
        setThinkingStepIndex(-1);
        dispatch({ type: "SET_THINKING", isThinking: false });

        const initGreeting = generateInitialGreeting(state.user);
        const id = "greeting-id";
        dispatch({
          type: "ADD_MESSAGE",
          message: { id, role: "ghost", text: "", timestamp: Date.now() },
        });

        const durationMs = playGhostResponse(initGreeting.text, () => {
          setIsTypingGhost(false);
        });

        setIsTypingGhost(true);
        let idx = 0;
        activeGhostTextRef.current = "";
        const intervalTime = Math.max(15, durationMs / initGreeting.text.length);

        const interval = setInterval(() => {
          if (idx <= initGreeting.text.length) {
            activeGhostTextRef.current = initGreeting.text.slice(0, idx);
            dispatch({
              type: "UPDATE_LAST_GHOST_MESSAGE",
              text: activeGhostTextRef.current,
            });
            idx += 1;
          } else {
            clearInterval(interval);
            scrollToBottom();
          }
        }, intervalTime);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [thinkingStepIndex, thinkingSteps, state.user, dispatch, scrollToBottom, playGhostResponse]);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [state.messages.length, isTypingGhost, state.isThinking, scrollToBottom]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isTypingGhost) scrollToBottom("auto");
    }, 150);
    return () => clearInterval(timer);
  }, [isTypingGhost, scrollToBottom]);

  const handleSend = useCallback(
    async (textToSend: string) => {
      if (!textToSend.trim() || state.isThinking || isTypingGhost) return;

      const cleanedText = textToSend.trim();
      setInputText("");

      const userMsgId = Math.random().toString();
      dispatch({
        type: "ADD_MESSAGE",
        message: { id: userMsgId, role: "user", text: cleanedText, timestamp: Date.now() },
      });

      if (inputRef.current) inputRef.current.style.height = "auto";

      dispatch({ type: "SET_THINKING", isThinking: true });
      setOrbState("thinking");
      const steps = [
        "Reading the emotional pattern...",
        "Tracing the possible timeline...",
        "Choosing the honest next step...",
        "Speaking from ten years ahead...",
      ];
      setThinkingSteps(steps);
      setThinkingStepIndex(0);

      let response: SimulationResponse;

      try {
        const apiResponse = await fetch("/api/ghost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: (session?.user as any)?.id || state.user.id,
            user: state.user,
            message: cleanedText,
            historyCount: state.messages.length,
            memoryProfile: state.memoryProfile,
            languageProfile: state.languageProfile,
            confusionCount,
            messages: state.messages,
          }),
        });

        if (!apiResponse.ok) throw new Error("Ghost pipeline request failed.");
        response = (await apiResponse.json()) as SimulationResponse;
      } catch {
        response = await generateGhostResponse(
          state.user,
          cleanedText,
          state.messages.length,
          state.memoryProfile
        );
      }

      if (response.updatedMemoryProfile) {
        dispatch({
          type: "SET_MEMORY_PROFILE",
          memoryProfile: response.updatedMemoryProfile,
        });
      }

      if (response.languageProfile) {
        dispatch({
          type: "SET_LANGUAGE_PROFILE",
          languageProfile: response.languageProfile,
        });
      }

      // Track confusion count
      const isConfused = isConfusionMessage(cleanedText);
      const nextConfusionCount = isConfused ? confusionCount + 1 : 0;
      setConfusionCount(nextConfusionCount);

      // Set orb to confused state for 2s if confusion detected
      if (isConfused) {
        setOrbState("confused");
        setTimeout(() => setOrbState("thinking"), 2000);
      }

      for (let i = 0; i < steps.length; i++) {
        setThinkingStepIndex(i);
        await new Promise((resolve) => setTimeout(resolve, 1300));
      }

      setThinkingStepIndex(-1);
      dispatch({ type: "SET_THINKING", isThinking: false });
      setOrbState("speaking");

      const ghostMsgId = Math.random().toString();
      dispatch({
        type: "ADD_MESSAGE",
        message: { id: ghostMsgId, role: "ghost", text: "", timestamp: Date.now() },
      });

      // Word-by-word streaming: 0.05s stagger per word (Prompt spec)
      const words = response.text.split(" ");
      let wordIdx = 0;
      const wordInterval = setInterval(() => {
        if (wordIdx < words.length) {
          const partial = words.slice(0, wordIdx + 1).join(" ");
          dispatch({ type: "UPDATE_LAST_GHOST_MESSAGE", text: partial });
          wordIdx++;
        } else {
          clearInterval(wordInterval);
          dispatch({
            type: "UPDATE_LAST_GHOST_MESSAGE",
            text: response.text,
            insightCard: response.insightCard,
            futureProjection: response.futureProjection,
          });
          setIsTypingGhost(false);
          setOrbState("idle");
          scrollToBottom();
        }
      }, 50); // 50ms per word ≈ 0.05s stagger

    },
    [state.user, state.memoryProfile, state.messages, state.languageProfile, state.isThinking, isTypingGhost, confusionCount, dispatch, scrollToBottom]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputText);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleEndSession = useCallback(async () => {
    if (state.messages.length <= 1) {
      goToScreen("landing");
      return;
    }

    setIsEndingSession(true);
    setEndingStatusText("Synthesizing session memory...");

    try {
      const activeUserId = (session?.user as any)?.id || state.user.id;

      // 1. Call Session Memory Summary API
      await fetch("/api/session-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeUserId,
          messages: state.messages,
        }),
      });

      setEndingStatusText("Tracing timeline projections...");

      // 2. Call Future Projections API
      const projectionResponse = await fetch("/api/future-projection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeUserId,
          userName: state.user.name,
          messages: state.messages,
        }),
      });

      if (projectionResponse.ok) {
        const projections = await projectionResponse.json();
        dispatch({ type: "SET_FUTURE_PROJECTIONS", projections });
      }

      await new Promise((resolve) => setTimeout(resolve, 800));
      goToScreen("future-projection");
    } catch (error) {
      console.error("Failed to end session cleanly:", error);
      goToScreen("landing");
    } finally {
      setIsEndingSession(false);
    }
  }, [state.messages, state.user.id, state.user.name, goToScreen, dispatch, session]);

  const activeThinkingStep = thinkingStepIndex >= 0 ? thinkingSteps[thinkingStepIndex] : null;

  return (
    <div className="relative flex flex-col h-screen overflow-hidden bg-ghost-bg select-none">
      <GrainOverlay />
      <Vignette />
      <AmbientBackground />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-35 flex items-center justify-between px-6 sm:px-10 py-5">
        {/* Wordmark */}
        <motion.div
          className="flex items-center gap-2.5"
          whileHover={{ opacity: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="w-[20px] h-[20px] rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(139, 108, 246, 0.12)",
              border: "1px solid rgba(139,108,246,0.28)",
              boxShadow: "0 0 10px rgba(139,108,246,0.14)",
            }}
          >
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="3" fill="rgba(139,108,246,0.88)" />
              <circle cx="6" cy="6" r="1.4" fill="white" fillOpacity="0.55" />
            </svg>
          </div>
          <span
            className="text-[13px] font-medium tracking-tight"
            style={{ color: "rgba(240,240,244,0.82)", fontFamily: "var(--font-heading)" }}
          >
            Ghost Mentor
          </span>
        </motion.div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* End Session */}
          <motion.button
            onClick={handleEndSession}
            whileHover={{ opacity: 0.95, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="hidden md:flex text-[10px] font-medium tracking-wider uppercase px-3 py-1.5 rounded-lg border border-ghost-accent-dim/30 bg-ghost-accent/10 hover:bg-ghost-accent/15 transition-all duration-200 cursor-pointer animate-fade-in"
            style={{ color: "rgba(167,139,250,0.95)" }}
          >
            End Session
          </motion.button>
          <motion.button
            onClick={handleEndSession}
            whileHover={{ opacity: 0.95, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex md:hidden items-center justify-center w-11 h-11 rounded-full border border-ghost-accent-dim/30 bg-ghost-accent/10 hover:bg-ghost-accent/15 text-ghost-accent-light/95 transition-all duration-200 cursor-pointer"
            title="End Session"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </motion.button>

          {/* Sign Out */}
          <motion.button
            onClick={() => signOut({ callbackUrl: "/" })}
            whileHover={{ opacity: 0.95, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="hidden md:flex text-[10px] font-medium tracking-wider uppercase px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/15 transition-all duration-200 cursor-pointer animate-fade-in"
            style={{ color: "rgba(239, 68, 68, 0.95)" }}
          >
            Sign Out
          </motion.button>
          <motion.button
            onClick={() => signOut({ callbackUrl: "/" })}
            whileHover={{ opacity: 0.95, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex md:hidden items-center justify-center w-11 h-11 rounded-full border border-red-500/20 bg-red-500/10 hover:bg-red-500/15 text-red-400 transition-all duration-200 cursor-pointer"
            title="Sign Out"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </motion.button>

          {/* Analyze */}
          <motion.button
            onClick={() => goToScreen("analyzer")}
            whileHover={{ opacity: 0.95, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="hidden md:flex items-center gap-1.5 text-[14px] font-medium tracking-wide px-4 py-2 rounded-full border text-ghost-text transition-all duration-200 cursor-pointer"
            style={{ background: "rgba(255, 255, 255, 0.1)", borderColor: "rgba(255, 255, 255, 0.3)" }}
          >
            🔍 Analyze
          </motion.button>
          <motion.button
            onClick={() => goToScreen("analyzer")}
            whileHover={{ opacity: 0.95, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex md:hidden items-center justify-center w-11 h-11 rounded-full border text-ghost-text transition-all duration-200 cursor-pointer"
            style={{ background: "rgba(255, 255, 255, 0.1)", borderColor: "rgba(255, 255, 255, 0.3)" }}
            title="Analyze"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </motion.button>
          
          {/* New Reflection */}
          <motion.button
            onClick={() => !(state.isThinking || isTypingGhost) && handleSend("Project my future based on everything you know about me.")}
            disabled={state.isThinking || isTypingGhost}
            whileHover={{ opacity: (state.isThinking || isTypingGhost) ? 0.35 : 0.95, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="hidden md:flex text-[10px] font-medium tracking-wider uppercase px-3 py-1.5 rounded-lg border border-ghost-border bg-ghost-surface/40 text-ghost-muted hover:text-ghost-text-secondary transition-all duration-200 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
          >
            New Reflection
          </motion.button>
          <motion.button
            onClick={() => !(state.isThinking || isTypingGhost) && handleSend("Project my future based on everything you know about me.")}
            disabled={state.isThinking || isTypingGhost}
            whileHover={{ opacity: (state.isThinking || isTypingGhost) ? 0.35 : 0.95, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex md:hidden items-center justify-center w-11 h-11 rounded-full border border-ghost-border bg-ghost-surface/40 text-ghost-muted hover:text-ghost-text-secondary transition-all duration-200 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            title="New Reflection"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </motion.button>
        </div>
      </header>

      {/* Floating Orb Zone */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-2.5">
        <GhostOrb
          size="md"
          className="w-[60px] h-[60px] md:w-[80px] md:h-[80px]"
          animate
          state={orbState !== "idle" ? orbState : (state.isThinking || isTypingGhost ? "thinking" : "idle")}
        />

        {/* Thinking label */}
        <AnimatePresence mode="wait">
          {state.isThinking && (
            <motion.div
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.35 }}
              className="flex items-center gap-2"
            >
              <span className="text-[9px] tracking-[0.22em] uppercase text-ghost-accent/65 font-semibold font-heading">
                {activeThinkingStep || "Accessing timeline..."}
              </span>
              <div className="flex gap-[3px] items-center">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 pt-44 md:pt-56 pb-40 md:pb-48 z-10 scroll-smooth relative"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 14%, black 84%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 14%, black 84%, transparent 100%)",
        }}
      >
        <div className="w-full max-w-[640px] mx-auto flex flex-col gap-12">
          <AnimatePresence initial={false}>
            {state.messages.map((message, i) => {
              const isGhost = message.role === "ghost";
              const isLastMessage = i === state.messages.length - 1;
              const showDivider = !message.isHistorical && state.messages[i - 1]?.isHistorical;

              return (
                <React.Fragment key={message.id}>
                  {showDivider && (
                    <div className="w-full flex items-center justify-center my-6 opacity-35 animate-fade-in">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-ghost-text-secondary/25 to-transparent" />
                      <span className="text-[9px] tracking-[0.25em] uppercase text-ghost-text-secondary px-4 font-light">
                        Previous conversation
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-ghost-text-secondary/25 to-transparent" />
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 14, filter: "blur(3px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex flex-col ${isGhost ? "items-start" : "items-end"} w-full`}
                  >
                    {/* Sender label */}
                    <span className="text-[8.5px] tracking-[0.25em] uppercase text-ghost-muted/55 mb-2.5 font-semibold font-heading px-1">
                      {isGhost ? "Future Self" : "Present Self"}
                    </span>

                    {/* Message bubble */}
                    {isGhost ? (
                      <div
                        className="rounded-2xl rounded-tl-sm text-ghost-text leading-relaxed font-light text-[16px] md:text-[18px] max-w-[90%] md:max-w-[70%] whitespace-pre-wrap select-text font-sans"
                        style={{
                          background: "rgba(15, 15, 22, 0.72)",
                          backdropFilter: "blur(16px)",
                          WebkitBackdropFilter: "blur(16px)",
                          border: "1px solid rgba(255,255,255,0.065)",
                          padding: "16px 20px",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
                        }}
                      >
                        {message.text}
                        {isGhost && isLastMessage && isTypingGhost && (
                          <span
                            className="inline-block w-[1.5px] h-[1em] align-middle ml-[3px] bg-ghost-accent translate-y-[-0.05em]"
                            style={{ animation: "cursor-blink 1s step-end infinite" }}
                          />
                        )}
                      </div>
                    ) : (
                      <p
                        className="text-[16px] md:text-[18px] font-light leading-relaxed text-right max-w-[90%] md:max-w-[70%] whitespace-pre-wrap select-text font-sans"
                        style={{ color: "rgba(157,157,170,0.85)" }}
                      >
                        {message.text}
                      </p>
                    )}

                    {/* Insight card */}
                    {isGhost && !isTypingGhost && message.insightCard && (
                      <div className="w-full max-w-[90%] md:max-w-[70%]">
                        <InsightCardView card={message.insightCard} />
                      </div>
                    )}

                    {/* Future projection */}
                    {isGhost && !isTypingGhost && message.futureProjection && (
                      <div className="w-full max-w-[90%] md:max-w-[70%]">
                        <FutureProjectionView projection={message.futureProjection} />
                      </div>
                    )}
                  </motion.div>
                </React.Fragment>
              );
            })}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Panel */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center px-4 pt-6 pb-[calc(16px+env(safe-area-inset-bottom))] md:pb-6 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(7,7,10,0.98) 0%, rgba(7,7,10,0.92) 60%, transparent 100%)",
        }}
      >
        <div className="w-full max-w-[640px] flex flex-col gap-3.5 pointer-events-auto">
          {/* Prompt seeds */}
          <AnimatePresence>
            {state.messages.length <= 1 && !state.isThinking && !isTypingGhost && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.55, delay: 1.0 }}
                className="flex flex-wrap gap-1.5 justify-center"
              >
                {promptSeeds.map((seed) => (
                  <motion.button
                    key={seed}
                    whileHover={{ y: -1, borderColor: "rgba(255,255,255,0.12)" }}
                    transition={{ duration: 0.18 }}
                    onClick={() => {
                      setInputText(seed);
                      if (inputRef.current) {
                        inputRef.current.focus();
                        setTimeout(() => handleSend(seed), 100);
                      }
                    }}
                    className="px-3 py-1.5 rounded-full text-[11.5px] font-light cursor-pointer text-center transition-colors duration-200"
                    style={{
                      color: "rgba(157,157,170,0.65)",
                      border: "1px solid rgba(255,255,255,0.055)",
                      background: "rgba(15,15,20,0.4)",
                    }}
                  >
                    {seed}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Text input */}
          <div
            className="glass-input relative flex items-center w-full rounded-2xl"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Share what is in your heart..."
              className="flex-1 bg-transparent py-4 pl-5 pr-16 font-light text-[16px] outline-none resize-none max-h-32 leading-relaxed"
              style={{
                color: "rgba(240,240,244,0.9)",
                caretColor: "rgba(139,108,246,0.9)",
              }}
              disabled={state.isThinking || isTypingGhost}
            />
            <div className="absolute right-2 bottom-2">
              <GlowButton
                onClick={() => handleSend(inputText)}
                disabled={!inputText.trim() || state.isThinking || isTypingGhost}
                className="w-11 h-11 !p-0 rounded-xl flex items-center justify-center"
                size="default"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </GlowButton>
            </div>
          </div>

          {/* Privacy note */}
          <span className="text-[9.5px] text-center font-light tracking-wide" style={{ color: "rgba(255,255,255,0.18)" }}>
            Memory stays in this browser to preserve continuity
          </span>
        </div>
      </div>

      {/* Cinematic End Session Overlay */}
      <AnimatePresence>
        {isEndingSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md"
          >
            <GhostOrb size="md" isThinking={true} />
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[12px] tracking-[0.2em] uppercase font-semibold font-heading mt-6"
              style={{ color: "rgba(139,108,246,0.85)" }}
            >
              {endingStatusText}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
