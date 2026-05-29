"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useApp } from "@/lib/appState";
import GhostOrb from "./GhostOrb";
import GlowButton from "./GlowButton";

// ── Prompt 7 new schema ──────────────────────────────────────────────────────
interface Prompt7Timeline {
  ifPatternsHold: string;
  warning: string;
  ifOneShiftMade: string;
  whatThatShiftIs: string;
  highestVersion: string;
  whatItCosts: string;
}

interface Prompt7Projections {
  sixMonths: Prompt7Timeline;
  twoYears: Prompt7Timeline;
  fiveYears: Prompt7Timeline;
}

// ── Legacy schema (array) ────────────────────────────────────────────────────
interface LegacyProjection {
  year: number;
  ifNothingChanges: string[];
  ifYouActNow: string[];
}

function isPrompt7(data: unknown): data is Prompt7Projections {
  return (
    typeof data === "object" &&
    data !== null &&
    "sixMonths" in data &&
    "twoYears" in data &&
    "fiveYears" in data
  );
}


// Cinematic Grain
function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "160px 160px",
      }}
    />
  );
}

// Cinematic Vignette
function Vignette() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background:
          "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 35%, rgba(0,0,0,0.85) 100%)",
      }}
    />
  );
}

// Ambient animated blobs
function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute"
        style={{
          width: "80vw",
          height: "60vw",
          top: "-25vw",
          left: "10vw",
          background:
            "radial-gradient(ellipse, rgba(139,108,246,0.06) 0%, rgba(100,74,210,0.015) 50%, transparent 70%)",
          filter: "blur(70px)",
        }}
        animate={{ x: [-15, 15, -8, 12, -15], y: [0, -12, -6, -20, 0], scale: [1, 1.05, 0.98, 1.04, 1] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

interface FutureProjectionScreenProps {
  onComplete: () => void;
}

export default function FutureProjectionScreen({ onComplete }: FutureProjectionScreenProps) {
  const { state } = useApp();
  const shouldReduceMotion = useReducedMotion();
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);

  const rawProjections = state.futureProjections;

  // ── Prompt 7 schema handling ────────────────────────────────────────────
  const isP7 = isPrompt7(rawProjections);

  const p7Columns: { label: string; key: keyof Prompt7Projections }[] = [
    { label: "6 Months Out", key: "sixMonths" },
    { label: "2 Years Out", key: "twoYears" },
    { label: "5 Years Out", key: "fiveYears" },
  ];

  // Legacy fallback
  const fallbackProjections: LegacyProjection[] = [
    {
      year: 2026,
      ifNothingChanges: [
        "You stay in the analysis loop, accumulating tools instead of outputs.",
        "The current fear continues to outline your daily boundaries.",
        "You quiet the tension by planning rather than shipping."
      ],
      ifYouActNow: [
        "The immediate ritual creates your first visible proof point.",
        "Action starts replacing intellectual defense mechanisms.",
        "The anxiety of starting transitions into the momentum of refining."
      ]
    },
    {
      year: 2028,
      ifNothingChanges: [
        "Peers move ahead with imperfect systems while you refine the blueprint.",
        "Burnout cycles intensify due to high-stress, low-outcome sprints.",
        "The belief that you aren't ready becomes your permanent comfort zone."
      ],
      ifYouActNow: [
        "You own a body of work that is visible, functional, and respected.",
        "Your confidence is grounded in actions completed, not potential.",
        "The founder-level execution speed becomes your default setting."
      ]
    },
    {
      year: 2031,
      ifNothingChanges: [
        "You look back at years of optimized frameworks that built nothing real.",
        "The feeling of wasted potential hardens into structural regret.",
        "You remain in a job or role that is safe but deeply uninspiring."
      ],
      ifYouActNow: [
        "You have built a high-impact system that operates autonomously.",
        "The version of you that made it through is now teaching others.",
        "You are operating with complete self-trust and creative freedom."
      ]
    }
  ];

  const legacyProjections: LegacyProjection[] = Array.isArray(rawProjections)
    ? (rawProjections as LegacyProjection[])
    : fallbackProjections;

  const timeLabels = ["6 Months Out", "2 Years Out", "5 Years Out"];

  const springTransition = shouldReduceMotion
    ? { duration: 0.35 }
    : { type: "spring" as const, stiffness: 120, damping: 20 };

  return (
    <div className="relative flex flex-col min-h-screen overflow-x-hidden bg-ghost-bg text-ghost-text">
      <GrainOverlay />
      <Vignette />
      <AmbientBackground />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-6 sm:px-12 py-6 shrink-0">
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
            Ghost Mentor
          </span>
        </div>
        <span className="text-[10px] tracking-[0.25em] uppercase text-ghost-muted/60 font-semibold font-heading">
          Timeline Synthesis
        </span>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-12 max-w-[1200px] mx-auto w-full pb-16 pt-4">
        {/* Title Block */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-10 max-w-[650px] flex flex-col items-center gap-3"
        >
          <GhostOrb size="sm" animate={!shouldReduceMotion} />
          <h1
            className="text-2xl sm:text-3xl font-light tracking-tight mt-2"
            style={{ color: "rgba(240,240,244,0.9)", fontFamily: "var(--font-heading)" }}
          >
            The Shape of What Comes Next
          </h1>
          <p
            className="text-xs sm:text-sm font-light leading-relaxed"
            style={{ color: "rgba(240,240,244,0.45)" }}
          >
            We mapped your language, fears, and behaviors across this session. Below are the two timelines competing for your next season.
          </p>
        </motion.div>

        {/* ── Prompt 7 schema — rich 6-key cards ─────────────────────────── */}
        {isP7 && rawProjections ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
            {p7Columns.map(({ label, key }, idx) => {
              const timeline = (rawProjections as Prompt7Projections)[key];
              const isHovered = hoveredColumn === idx;
              const isAnyHovered = hoveredColumn !== null;

              return (
                <motion.div
                  key={key}
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
                  animate={{
                    opacity: isAnyHovered && !isHovered ? 0.35 : 1,
                    scale: !shouldReduceMotion && isHovered ? 1.015 : 1,
                    y: 0,
                  }}
                  transition={springTransition}
                  onMouseEnter={() => setHoveredColumn(idx)}
                  onMouseLeave={() => setHoveredColumn(null)}
                  className="rounded-2xl relative overflow-hidden flex flex-col"
                  style={{
                    background: "linear-gradient(145deg, rgba(12,12,18,0.88) 0%, rgba(8,8,12,0.94) 100%)",
                    border: isHovered
                      ? "1px solid rgba(139,108,246,0.28)"
                      : "1px solid rgba(255,255,255,0.055)",
                    boxShadow: isHovered
                      ? "0 20px 48px rgba(139,108,246,0.06), 0 8px 24px rgba(0,0,0,0.4)"
                      : "0 8px 24px rgba(0,0,0,0.3)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  {/* Header accent */}
                  <div
                    className="h-1 w-full"
                    style={{
                      background: isHovered
                        ? "linear-gradient(90deg, rgba(239,68,68,0.6) 0%, rgba(139,108,246,0.8) 100%)"
                        : "linear-gradient(90deg, rgba(239,68,68,0.2) 0%, rgba(139,108,246,0.3) 100%)",
                    }}
                  />
                  <div className="p-5 flex flex-col gap-4 flex-1">
                    <div>
                      <span className="text-[9px] tracking-[0.25em] uppercase text-ghost-muted font-bold font-heading">
                        {label}
                      </span>
                    </div>

                    {/* If patterns hold */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] tracking-[0.18em] uppercase text-red-400/70 font-semibold font-heading">If patterns hold</span>
                      <p className="text-[12px] font-light text-ghost-text-secondary/75 leading-relaxed">{timeline.ifPatternsHold}</p>
                    </div>

                    {/* Warning */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] tracking-[0.18em] uppercase text-amber-400/60 font-semibold font-heading">Warning</span>
                      <p className="text-[12px] font-light text-ghost-text-secondary/65 leading-relaxed italic">{timeline.warning}</p>
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* If one shift is made */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] tracking-[0.18em] uppercase text-ghost-accent-light/75 font-semibold font-heading">If one shift is made</span>
                      <p className="text-[12px] font-light text-ghost-text/85 leading-relaxed">{timeline.ifOneShiftMade}</p>
                    </div>

                    {/* What that shift is */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] tracking-[0.18em] uppercase text-ghost-accent/60 font-semibold font-heading">The shift</span>
                      <p className="text-[11px] font-medium text-ghost-accent-light/90 leading-relaxed">{timeline.whatThatShiftIs}</p>
                    </div>

                    {/* Highest version */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] tracking-[0.18em] uppercase text-ghost-accent/55 font-semibold font-heading">Highest version</span>
                      <p className="text-[12px] font-light text-ghost-text/80 leading-relaxed">{timeline.highestVersion}</p>
                    </div>

                    {/* What it costs */}
                    <div className="flex flex-col gap-1.5 mt-auto">
                      <span className="text-[9px] tracking-[0.18em] uppercase text-ghost-muted/60 font-semibold font-heading">What it costs</span>
                      <p className="text-[11px] font-light text-ghost-text-secondary/55 leading-relaxed italic">{timeline.whatItCosts}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* ── Legacy array schema ────────────────────────────────────────── */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12 relative">
            {legacyProjections.map((proj, idx) => {
              const isHovered = hoveredColumn === idx;
              const isAnyHovered = hoveredColumn !== null;

              return (
                <motion.div
                  key={idx}
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
                  animate={{
                    opacity: isAnyHovered && !isHovered ? 0.35 : 1,
                    scale: !shouldReduceMotion && isHovered ? 1.015 : 1,
                    y: 0,
                  }}
                  transition={springTransition}
                  onMouseEnter={() => setHoveredColumn(idx)}
                  onMouseLeave={() => setHoveredColumn(null)}
                  className="rounded-2xl relative overflow-hidden flex flex-col h-full"
                  style={{
                    background: "linear-gradient(145deg, rgba(12,12,18,0.88) 0%, rgba(8,8,12,0.94) 100%)",
                    border: isHovered ? "1px solid rgba(139,108,246,0.28)" : "1px solid rgba(255,255,255,0.055)",
                    boxShadow: isHovered ? "0 20px 48px rgba(139,108,246,0.06), 0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(0,0,0,0.3)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  <div className="h-1 w-full" style={{ background: isHovered ? "linear-gradient(90deg, rgba(239,68,68,0.6) 0%, rgba(139,108,246,0.8) 100%)" : "linear-gradient(90deg, rgba(239,68,68,0.2) 0%, rgba(139,108,246,0.3) 100%)" }} />
                  <div className="p-6 flex flex-col gap-6 flex-1">
                    <div>
                      <span className="text-[9px] tracking-[0.25em] uppercase text-ghost-muted font-bold font-heading">{timeLabels[idx]}</span>
                      <h2 className="text-xl font-light text-ghost-text mt-0.5 font-heading">Year <span className="font-semibold text-ghost-accent-light">{proj.year}</span></h2>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
                        <span className="text-[9px] tracking-[0.2em] uppercase text-red-400/70 font-semibold font-heading">If nothing changes</span>
                      </div>
                      <ul className="flex flex-col gap-2.5 pl-1.5">
                        {proj.ifNothingChanges.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12.5px] font-light text-ghost-text-secondary/70 leading-relaxed">
                            <span className="text-red-500/40 select-none text-[10px] mt-0.5">→</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="h-px bg-white/5 my-1" />
                    <div className="flex flex-col gap-3 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-ghost-accent" />
                        <span className="text-[9px] tracking-[0.2em] uppercase text-ghost-accent-light/80 font-semibold font-heading">If you act now</span>
                      </div>
                      <ul className="flex flex-col gap-2.5 pl-1.5">
                        {proj.ifYouActNow.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12.5px] font-light text-ghost-text/85 leading-relaxed">
                            <span className="text-ghost-accent-light/65 select-none text-[10px] mt-0.5">→</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* CTA Area */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col items-center gap-4"
        >
          <GlowButton onClick={onComplete} size="xl">
            Commit &amp; Finish
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </GlowButton>
          {/* Prompt 7 final line */}
          <p
            className="text-[13px] font-light tracking-wide text-center max-w-[400px]"
            style={{ color: "rgba(240,240,244,0.4)" }}
          >
            You already know what needs to happen.
          </p>
          <p
            className="text-[10px] tracking-wide"
            style={{ color: "rgba(255,255,255,0.16)" }}
          >
            That&apos;s not AI. That&apos;s me. Ten years from now.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
