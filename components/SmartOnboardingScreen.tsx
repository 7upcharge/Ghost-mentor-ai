"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import GhostOrb from "./GhostOrb";
import GlowButton from "./GlowButton";
import { useApp } from "@/lib/appState";
import { detectLanguageProfile } from "@/lib/languageDetector";
import { chunkAndTruncateText } from "@/lib/parsers";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

/* ═══════════════════════════════════════════
   Processing overlay
   ═══════════════════════════════════════════ */

function ProcessingOverlay() {
  const steps = [
    "Reading your answers...",
    "Finding what you avoided...",
    "Building your future-self memory...",
    "Ghost Mentor is waking up...",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen px-6 gap-8"
    >
      <GhostOrb size="lg" state="thinking" />

      <div className="relative flex flex-col items-center gap-2 min-h-[72px]">
        {steps.map((msg, i) => (
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
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   Main Smart Onboarding Screen
   (Prompt 6 — conversational 5-question flow)
   ═══════════════════════════════════════════ */

interface SmartOnboardingScreenProps {
  onComplete: () => void;
}

export default function SmartOnboardingScreen({
  onComplete,
}: SmartOnboardingScreenProps) {
  const { state, dispatch } = useApp();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isWaitingForAI, setIsWaitingForAI] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [nameInput, setNameInput] = useState(state.user.name || "");
  const [nameSet, setNameSet] = useState(!!state.user.name);
  const [turnCount, setTurnCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const runExtraction = useCallback(
    async (history: ChatMsg[]) => {
      setIsProcessing(true);

      // Combine all user answers for language detection + extraction
      const userAnswers = history
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join("\n\n");

      const combinedText = history
        .map((m) => `${m.role === "user" ? "Q:" : "A:"} ${m.content}`)
        .join("\n");

      // Detect language
      const langProfile = detectLanguageProfile(userAnswers);
      dispatch({ type: "SET_LANGUAGE_PROFILE", languageProfile: langProfile });
      dispatch({ type: "SET_CONFIDENCE_SCORE", score: 45 });

      // Extract full personality profile
      try {
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: chunkAndTruncateText(combinedText),
            user: state.user,
            platform: "onboarding",
          }),
        });

        if (res.ok) {
          const profileData = await res.json();
          if (profileData?.identity) {
            dispatch({ type: "SET_MEMORY_PROFILE", memoryProfile: profileData });
            if (profileData.userName && profileData.userName !== "unknown") {
              dispatch({ type: "SET_USER_NAME", name: profileData.userName });
            }
            if (profileData.userAspiration) {
              dispatch({ type: "SET_USER_ASPIRATION", aspiration: profileData.userAspiration });
            }
            if (profileData.userStruggle) {
              dispatch({ type: "SET_USER_STRUGGLE", struggle: profileData.userStruggle });
            }
          }
        }
      } catch (e) {
        console.error("Onboarding extraction failed:", e);
      }

      setTimeout(() => onComplete(), 5000);
    },
    [state.user, dispatch, onComplete]
  );

  const fetchNextMessage = useCallback(
    async (history: ChatMsg[]) => {
      setIsWaitingForAI(true);
      try {
        const res = await fetch("/api/onboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });
        const data = await res.json();

        if (data.text) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.text },
          ]);
        }

        if (data.isComplete) {
          // All 5 answers received — extract profile then transition
          await runExtraction(history);
        }

        setTurnCount(data.turnCount ?? 0);
      } catch (e) {
        console.error("Onboard fetch failed:", e);
      } finally {
        setIsWaitingForAI(false);
      }
    },
    [runExtraction]
  );

  // Fetch first question on mount (after name is set)
  useEffect(() => {
    if (!nameSet) return;
    const timer = setTimeout(() => {
      fetchNextMessage([]);
    }, 0);
    return () => clearTimeout(timer);
  }, [nameSet, fetchNextMessage]);

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isWaitingForAI) return;

    const userMsg: ChatMsg = { role: "user", content: trimmed };
    const nextHistory = [...messages, userMsg];

    setMessages(nextHistory);
    setInputValue("");

    // Auto-resize textarea
    if (inputRef.current) inputRef.current.style.height = "auto";

    await fetchNextMessage(nextHistory);
  }, [inputValue, messages, isWaitingForAI, fetchNextMessage]);

  if (isProcessing) {
    return <ProcessingOverlay />;
  }

  // ── Name entry screen ─────────────────────────────────────────────────────
  if (!nameSet) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 overflow-hidden select-none">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="mb-8"
        >
          <GhostOrb size="md" state="idle" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-headline text-ghost-text text-center mb-2"
        >
          What should your future self{" "}
          <span className="text-gradient-accent">call you?</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-[13px] text-ghost-text-secondary mb-8 font-light"
        >
          The name they&apos;ll use when they speak to you.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="w-full max-w-[360px] mb-6"
        >
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your first name"
            autoFocus
            className="w-full bg-transparent border-b border-ghost-border focus:border-ghost-accent/45 text-2xl sm:text-3xl font-light text-ghost-text placeholder:text-ghost-muted/30 py-2.5 outline-none transition-all duration-300 tracking-tight text-center"
            onKeyDown={(e) => {
              if (e.key === "Enter" && nameInput.trim()) {
                dispatch({ type: "SET_USER_NAME", name: nameInput.trim() });
                setNameSet(true);
              }
            }}
          />
        </motion.div>

        <GlowButton
          onClick={() => {
            dispatch({ type: "SET_USER_NAME", name: nameInput.trim() });
            setNameSet(true);
          }}
          disabled={!nameInput.trim()}
          size="lg"
        >
          Continue
        </GlowButton>
      </div>
    );
  }

  // ── Conversational chat UI ────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col min-h-screen bg-ghost-bg select-none overflow-hidden">
      {/* Header orb + progress */}
      <div className="flex flex-col items-center pt-10 pb-4 gap-3 z-10 relative">
        <GhostOrb
          size="sm"
          state={isWaitingForAI ? "thinking" : "idle"}
        />
        {/* Progress bar: 5 dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="w-5 h-0.5 rounded-full transition-all duration-500"
              style={{
                background:
                  i < turnCount
                    ? "rgba(139,108,246,0.9)"
                    : "rgba(255,255,255,0.08)",
              }}
            />
          ))}
        </div>
        <p className="text-[9px] tracking-[0.2em] uppercase text-ghost-muted/50 font-heading">
          {turnCount < 5
            ? `Question ${Math.min(turnCount + 1, 5)} of 5`
            : "Profile complete"}
        </p>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 z-10 relative"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 88%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 88%, transparent 100%)",
        }}
      >
        <div className="w-full max-w-[580px] mx-auto flex flex-col gap-6">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => {
              const isAI = msg.role === "assistant";
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10, filter: "blur(2px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex flex-col ${isAI ? "items-start" : "items-end"}`}
                >
                  <span className="text-[8px] tracking-[0.24em] uppercase text-ghost-muted/40 mb-1.5 px-1 font-heading">
                    {isAI ? "Future Self" : "You"}
                  </span>
                  <div
                    className={`max-w-[88%] sm:max-w-[78%] px-4 py-3 rounded-2xl text-[14px] font-light leading-relaxed whitespace-pre-wrap ${
                      isAI
                        ? "rounded-tl-sm text-ghost-text"
                        : "rounded-tr-sm text-right"
                    }`}
                    style={{
                      background: isAI
                        ? "rgba(15,15,22,0.72)"
                        : "rgba(139,108,246,0.08)",
                      border: isAI
                        ? "1px solid rgba(255,255,255,0.06)"
                        : "1px solid rgba(139,108,246,0.15)",
                      backdropFilter: "blur(16px)",
                      color: isAI
                        ? "rgba(240,240,244,0.9)"
                        : "rgba(200,190,230,0.85)",
                    }}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Thinking dots */}
          <AnimatePresence>
            {isWaitingForAI && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2"
              >
                <span className="text-[8px] tracking-[0.24em] uppercase text-ghost-muted/40 mt-1 font-heading">
                  Future Self
                </span>
                <div className="flex gap-[4px] items-center px-4 py-3 rounded-2xl rounded-tl-sm"
                  style={{ background: "rgba(15,15,22,0.72)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Input area */}
      <div
        className="z-20 px-4 pb-8 pt-3"
        style={{
          background: "linear-gradient(to top, rgba(7,7,10,0.98) 0%, rgba(7,7,10,0.88) 70%, transparent 100%)",
        }}
      >
        <div className="w-full max-w-[580px] mx-auto flex flex-col gap-2">
          <div className="glass-input relative flex items-end w-full rounded-2xl">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Be honest. I need the real version."
              disabled={isWaitingForAI || turnCount >= 5}
              className="flex-1 bg-transparent py-4 pl-5 pr-14 font-light text-[14px] outline-none resize-none max-h-32 leading-relaxed"
              style={{
                color: "rgba(240,240,244,0.9)",
                caretColor: "rgba(139,108,246,0.9)",
              }}
            />
            <div className="absolute right-3 bottom-2.5">
              <GlowButton
                onClick={handleSend}
                disabled={!inputValue.trim() || isWaitingForAI || turnCount >= 5}
                className="w-9 h-9 !p-0 rounded-xl"
                size="default"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </GlowButton>
            </div>
          </div>
          <span className="text-[9px] text-center font-light tracking-wide" style={{ color: "rgba(255,255,255,0.16)" }}>
            Press Enter to send · Shift+Enter for new line
          </span>
        </div>
      </div>
    </div>
  );
}
