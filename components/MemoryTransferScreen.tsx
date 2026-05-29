"use client";

import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import GhostOrb from "./GhostOrb";
import GlowButton from "./GlowButton";
import { useApp } from "@/lib/appState";
import {
  parseAnyConversationJson,
  calculateConfidence,
  chunkAndTruncateText,
  parsePastedSummary,
  mapPromptPackProfileToMemoryProfile,
  type ParsedConversation,
} from "@/lib/parsers";
import { detectLanguageProfile } from "@/lib/languageDetector";
import { supabase } from "@/lib/supabaseClient";

/* ═══════════════════════════════════════════
   Platform data
   ═══════════════════════════════════════════ */

const platforms = [
  {
    id: "chatgpt" as const,
    name: "ChatGPT",
    icon: "◆",
    exportSteps: [
      "Go to chatgpt.com → profile icon",
      "Settings → Data Controls",
      "Export Data → Confirm",
      "Check email → download ZIP",
      "Upload conversations.json here",
    ],
  },
  {
    id: "claude" as const,
    name: "Claude",
    icon: "◇",
    exportSteps: [
      "Go to claude.ai → profile icon",
      "Settings → Privacy",
      "Export conversations",
      "Upload the JSON file here",
    ],
  },
  {
    id: "gemini" as const,
    name: "Gemini",
    icon: "◈",
    exportSteps: [
      "Go to takeout.google.com",
      "Select Gemini Apps Activity",
      "Download the export",
      "Upload the JSON file here",
    ],
  },
  {
    id: "grok" as const,
    name: "Grok",
    icon: "◉",
    exportSteps: [
      "Go to x.com → Grok",
      "Settings → Data export",
      "Download and upload here",
    ],
  },
  {
    id: "perplexity" as const,
    name: "Perplexity",
    icon: "◎",
    exportSteps: [
      "Go to perplexity.ai → settings",
      "Export data",
      "Upload JSON here",
    ],
  },
  {
    id: "manual" as const,
    name: "Paste Text",
    icon: "◫",
    exportSteps: [],
  },
];

/* ═══════════════════════════════════════════
   Export Instructions Modal
   ═══════════════════════════════════════════ */

function ExportModal({
  platform,
  onClose,
}: {
  platform: (typeof platforms)[number];
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25 }}
        className="glass-card rounded-2xl p-6 sm:p-8 w-full max-w-sm relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-medium text-ghost-text tracking-tight font-heading">
            Export from {platform.name}
          </h3>
          <button
            onClick={onClose}
            className="text-ghost-muted hover:text-ghost-text transition-colors text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {platform.exportSteps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span
                className="text-[11px] font-medium text-ghost-accent/70 mt-0.5 shrink-0"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {i + 1}.
              </span>
              <span className="text-[13px] text-ghost-text-secondary font-light leading-relaxed">
                {step}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   Processing Screen
   ═══════════════════════════════════════════ */

function ProcessingScreen({ confidence }: { confidence: number }) {
  const messages = [
    "Reading your conversations...",
    "Mapping emotional patterns...",
    "Detecting your language...",
    "Building your future-self memory...",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
      className="flex flex-col items-center justify-center min-h-screen px-6 gap-8"
    >
      <GhostOrb size="lg" isThinking />

      <div className="relative flex flex-col items-center gap-2 min-h-[72px]">
        {messages.map((msg, i) => (
          <motion.p
            key={msg}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: [0, 1, 1, 0], y: [5, 0, 0, -4] }}
            transition={{
              delay: i * 1.3,
              duration: 1.3,
              times: [0, 0.12, 0.88, 1],
            }}
            className="text-sm text-ghost-text-secondary tracking-wide text-center absolute"
          >
            {msg}
          </motion.p>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 5.5, duration: 1 }}
        className="text-[13px] text-ghost-accent font-medium tracking-wide"
      >
        Ghost Mentor knows you at {confidence}% confidence
      </motion.p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   Magic Prompt (Prompt 9 spec)
   ═══════════════════════════════════════════ */

const MAGIC_PROMPT = `You are a psychological profiler. Based on our conversation history, create a deep profile of me in this EXACT format:

NAME: [my name]

CORE_FEARS:
[list my 3-4 deepest fears, one per line]

BIGGEST_AMBITIONS:
[list my 3-4 biggest dreams/ambitions, one per line]

AVOIDANCE_PATTERNS:
[list 3-4 things I consistently avoid or delay, one per line]

COMMUNICATION_STYLE:
[list 3-4 things about how I communicate, one per line]

RECURRING_STRUGGLES:
[list 3-4 things I repeatedly struggle with, one per line]

SELF_TALK_PATTERNS:
[list 3-4 phrases or patterns in how I talk to myself, one per line]

HIGHEST_VALUES:
[list 3-4 things I value most deeply, one per line]

LANGUAGE_MIRROR:
- Primary language: [english / hindi / hinglish]
- Slang/terms I use: [comma-separated slang]
- How I express frustration: [description]
- How I express excitement: [description]
- Sentence style: [short/medium/long]

SMART_QUESTIONS_I_NEVER_ASKED_MYSELF:
1. [question about what I avoid]
2. [question about an abandoned project]
3. [question about an unresolved relationship or commitment]

Be honest. Be specific. Use my actual words and patterns from our conversations.`;

/* ═══════════════════════════════════════════
   Copy Button for Magic Prompt
   ═══════════════════════════════════════════ */

function PastePromptCopyButton({ prompt }: { prompt: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [prompt]);

  return (
    <button
      onClick={handleCopy}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[12px] font-medium transition-all duration-200 cursor-pointer"
      style={{
        background: copied ? "rgba(139,108,246,0.2)" : "rgba(139,108,246,0.1)",
        border: "1px solid rgba(139,108,246,0.25)",
        color: copied ? "rgba(200,180,255,1)" : "rgba(167,139,250,0.9)",
      }}
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Copied to clipboard!
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          Copy Magic Prompt
        </>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════
   Main Memory Transfer Screen
   ═══════════════════════════════════════════ */

interface MemoryTransferScreenProps {
  onComplete: () => void;
  onNoHistory: () => void;
}

export default function MemoryTransferScreen({
  onComplete,
  onNoHistory,
}: MemoryTransferScreenProps) {
  const { state, dispatch } = useApp();
  const [uploadedPlatforms, setUploadedPlatforms] = useState<
    Map<string, ParsedConversation>
  >(new Map());
  const [exportModal, setExportModal] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileUpload = useCallback(
    (platformId: string, file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const parsed = parseAnyConversationJson(text);
        // Override platform if auto-detection doesn't match
        parsed.platform = platformId as ParsedConversation["platform"];
        setUploadedPlatforms((prev) => {
          const next = new Map(prev);
          next.set(platformId, parsed);
          return next;
        });
      };
      reader.readAsText(file);
    },
    []
  );

  const handlePasteSubmit = useCallback(
    async (pastedText: string) => {
      if (!pastedText.trim()) return;

      // ── Step 1: Try client-side parse (no API call) ──────────────────────
      try {
        const parsed = parsePastedSummary(pastedText);
        const hasValidData =
          parsed.core_fears.length > 0 ||
          parsed.biggest_ambitions.length > 0 ||
          parsed.avoidance_patterns.length > 0;

        if (hasValidData) {
          // Map to memory profile and save directly to state
          const memoryProfile = mapPromptPackProfileToMemoryProfile(parsed);
          dispatch({ type: "SET_MEMORY_PROFILE", memoryProfile });
          dispatch({ type: "SET_CONFIDENCE_SCORE", score: 85 });

          if (parsed.name && parsed.name !== "unknown") {
            dispatch({ type: "SET_USER_NAME", name: parsed.name });
          }

          // Detect language from the pasted text
          const langProfile = detectLanguageProfile(pastedText);
          dispatch({ type: "SET_LANGUAGE_PROFILE", languageProfile: langProfile });

          // Save directly to Supabase (skip /api/extract)
          if (
            state.user.id &&
            process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ) {
            try {
              await supabase.from("user_profiles").upsert(
                {
                  user_id: state.user.id,
                  personality_profile: parsed,
                  language_profile: langProfile,
                  confidence_score: 85,
                  transfer_sources: [{ platform: "manual", messageCount: 0, uploaded: true }],
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id" }
              );
            } catch {
              // Non-critical Supabase error
            }
          }

          setConfidence(85);
          setIsProcessing(true);
          // Show 85% confidence then transition after 2s
          setTimeout(() => onComplete(), 2000);
          return;
        }
      } catch (parseErr) {
        console.warn("parsePastedSummary failed, falling back to /api/extract", parseErr);
      }

      // ── Step 2: Fallback — send raw text to /api/extract ────────────────
      const parsed: ParsedConversation = {
        text: pastedText,
        messageCount: pastedText.split("\n").filter((l) => l.trim()).length,
        platform: "manual",
      };
      setUploadedPlatforms((prev) => {
        const next = new Map(prev);
        next.set("manual", parsed);
        return next;
      });
    },
    [state.user, dispatch, onComplete]
  );

  const handleProcess = useCallback(async () => {
    setIsProcessing(true);

    // Merge all texts
    let mergedText = "";
    let totalMessages = 0;
    const sources = [];

    for (const [platformId, parsed] of uploadedPlatforms) {
      mergedText += `\n\n=== ${platformId.toUpperCase()} ===\n${parsed.text}`;
      totalMessages += parsed.messageCount;
      sources.push({
        platform: parsed.platform,
        messageCount: parsed.messageCount,
        uploaded: true,
      });
    }

    // Calculate confidence
    const calculatedConfidence = calculateConfidence(totalMessages, sources.length);
    setConfidence(calculatedConfidence);

    // Detect language client-side
    const langProfile = detectLanguageProfile(mergedText);
    dispatch({ type: "SET_LANGUAGE_PROFILE", languageProfile: langProfile });
    dispatch({
      type: "SET_TRANSFER_SOURCES",
      transferSources: sources as typeof state.transferSources,
    });
    dispatch({ type: "SET_CONFIDENCE_SCORE", score: calculatedConfidence });

    // Call extraction API
    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: chunkAndTruncateText(mergedText),
          user: state.user,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.identity) {
          dispatch({ type: "SET_MEMORY_PROFILE", memoryProfile: data });
          if (data.userName) {
            dispatch({ type: "SET_USER_NAME", name: data.userName });
          }
          if (data.userAspiration) {
            dispatch({ type: "SET_USER_ASPIRATION", aspiration: data.userAspiration });
          }
          if (data.userStruggle) {
            dispatch({ type: "SET_USER_STRUGGLE", struggle: data.userStruggle });
          }
        }
      }
    } catch (e) {
      console.error("Extraction failed:", e);
    }

    // Wait for processing animation
    setTimeout(() => onComplete(), 6500);
  }, [uploadedPlatforms, state.user, dispatch, onComplete]);

  const hasUploads = uploadedPlatforms.size > 0;
  const activePlatform = exportModal
    ? platforms.find((p) => p.id === exportModal)
    : null;

  if (isProcessing) {
    return <ProcessingScreen confidence={confidence} />;
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 overflow-hidden select-none">
      {/* Orb */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="mb-6"
      >
        <GhostOrb size="md" />
      </motion.div>

      {/* Headline */}
      <motion.h2
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-headline text-ghost-text text-center mb-2"
      >
        Bring your AI memory{" "}
        <span className="text-gradient-accent">here.</span>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="text-[14px] text-ghost-text-secondary font-light text-center max-w-md mb-8 leading-relaxed"
      >
        Ghost Mentor learns who you are from the conversations you&apos;ve
        already had.
      </motion.p>

      {/* Platform cards grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full max-w-[520px] mb-6"
      >
        {platforms.map((platform, i) => {
          const isUploaded = uploadedPlatforms.has(platform.id);
          const parsed = uploadedPlatforms.get(platform.id);

          return (
            <motion.div
              key={platform.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.06 }}
              className="relative flex flex-col items-center p-4 rounded-xl border cursor-pointer transition-all duration-200"
              style={{
                borderColor: isUploaded
                  ? "rgba(139,108,246,0.4)"
                  : "rgba(255,255,255,0.065)",
                background: isUploaded
                  ? "rgba(139,108,246,0.08)"
                  : "rgba(15,15,20,0.5)",
                boxShadow: isUploaded
                  ? "0 0 20px rgba(139,108,246,0.12)"
                  : "none",
              }}
            >
              {/* Checkmark */}
              {isUploaded && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-ghost-accent flex items-center justify-center"
                  style={{
                    boxShadow: "0 0 8px rgba(139,108,246,0.5)",
                  }}
                >
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </motion.div>
              )}

              <span className="text-lg mb-1.5 opacity-50">{platform.icon}</span>
              <span className="text-[12px] font-medium text-ghost-text mb-1">
                {platform.name}
              </span>

              {isUploaded && parsed ? (
                <span className="text-[10px] text-ghost-accent/80">
                  {parsed.messageCount} messages
                </span>
              ) : platform.id === "manual" ? (
                <button
                  onClick={() => setExportModal("manual")}
                  className="text-[10px] text-ghost-accent/60 hover:text-ghost-accent transition-colors cursor-pointer"
                >
                  Paste text
                </button>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => fileInputRefs.current[platform.id]?.click()}
                    className="text-[10px] text-ghost-text-secondary/60 hover:text-ghost-text transition-colors cursor-pointer"
                  >
                    Upload JSON
                  </button>
                  <button
                    onClick={() => setExportModal(platform.id)}
                    className="text-[9px] text-ghost-accent/50 hover:text-ghost-accent transition-colors cursor-pointer"
                  >
                    How to export
                  </button>
                  <input
                    ref={(el) => {
                      fileInputRefs.current[platform.id] = el;
                    }}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(platform.id, file);
                    }}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Source summary */}
      <AnimatePresence>
        {hasUploads && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-2 mb-4"
          >
            <div className="flex flex-wrap gap-2 justify-center">
              {Array.from(uploadedPlatforms).map(([id, parsed]) => (
                <span
                  key={id}
                  className="text-[10px] px-2.5 py-1 rounded-full"
                  style={{
                    color: "rgba(139,108,246,0.9)",
                    background: "rgba(139,108,246,0.1)",
                    border: "1px solid rgba(139,108,246,0.2)",
                  }}
                >
                  ✓ {id} — {parsed.messageCount} messages
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col items-center gap-3"
      >
        {hasUploads && (
          <GlowButton onClick={handleProcess} size="lg">
            Build My Ghost Mentor
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </GlowButton>
        )}

        <button
          onClick={onNoHistory}
          className="text-[11px] uppercase tracking-[0.1em] text-ghost-muted hover:text-ghost-text-secondary transition-colors cursor-pointer mt-2"
        >
          I don&apos;t have any AI history
        </button>
      </motion.div>

      {/* Export instruction modals */}
      <AnimatePresence>
        {exportModal && exportModal !== "manual" && activePlatform && (
          <ExportModal
            platform={activePlatform}
            onClose={() => setExportModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Paste text modal — Prompt 9 spec: Step 1 Copy, Step 2 Paste */}
      <AnimatePresence>
        {exportModal === "manual" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            onClick={() => setExportModal(null)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-card rounded-2xl p-6 sm:p-8 w-full max-w-lg relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-medium text-ghost-text tracking-tight font-heading">
                  Train with Magic Prompt
                </h3>
                <button
                  onClick={() => setExportModal(null)}
                  className="text-ghost-muted hover:text-ghost-text transition-colors text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Step 1 */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[10px] font-semibold text-ghost-accent/70 tracking-[0.15em] uppercase"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Step 1
                  </span>
                  <div className="h-px flex-1 bg-ghost-border" />
                </div>
                <p className="text-[12px] text-ghost-text-secondary mb-3 font-light leading-relaxed">
                  Copy the prompt below and paste it into ChatGPT or Claude. They will generate your psychological profile.
                </p>
                <PastePromptCopyButton prompt={MAGIC_PROMPT} />
              </div>

              {/* Step 2 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[10px] font-semibold text-ghost-accent/70 tracking-[0.15em] uppercase"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Step 2
                  </span>
                  <div className="h-px flex-1 bg-ghost-border" />
                </div>
                <p className="text-[12px] text-ghost-text-secondary mb-3 font-light leading-relaxed">
                  Paste the AI&apos;s response here and click Train.
                </p>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste the profile response here..."
                  rows={7}
                  autoFocus
                  className="w-full bg-ghost-surface/50 border border-ghost-border focus:border-ghost-accent/35 rounded-xl text-[13px] font-light text-ghost-text placeholder:text-ghost-muted/30 p-4 outline-none transition-all duration-300 resize-none leading-relaxed"
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setExportModal(null)}
                    className="px-4 py-2 text-[12px] text-ghost-muted hover:text-ghost-text transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <GlowButton
                    onClick={async () => {
                      setExportModal(null);
                      await handlePasteSubmit(pasteText);
                    }}
                    disabled={!pasteText.trim()}
                  >
                    Train Ghost Mentor
                  </GlowButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
