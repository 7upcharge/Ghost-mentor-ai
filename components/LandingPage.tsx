"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import GhostOrb from "./GhostOrb";
import TypewriterText from "./TypewriterText";
import GlowButton from "./GlowButton";

interface LandingPageProps {
  onStart: () => void;
}

// Film grain — photographic texture at 3.5% opacity
function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        opacity: 0.035,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "160px 160px",
      }}
    />
  );
}

// Cinematic vignette — darkens edges, pulls focus to center
function Vignette() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background:
          "radial-gradient(ellipse 75% 65% at 50% 50%, transparent 35%, rgba(0,0,0,0.65) 100%)",
      }}
    />
  );
}

// Animated ambient gradient blobs
function AmbientBlobs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
      {/* Primary blob — top */}
      <motion.div
        className="absolute"
        style={{
          width: "70vw",
          height: "45vw",
          top: "-15vw",
          left: "15vw",
          background:
            "radial-gradient(ellipse, rgba(139,108,246,0.10) 0%, rgba(100,74,210,0.04) 45%, transparent 70%)",
          filter: "blur(40px)",
        }}
        animate={{
          x: [-20, 20, -10, 15, -20],
          y: [0, -15, -8, -20, 0],
          scale: [1, 1.08, 0.97, 1.05, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Secondary blob — bottom right */}
      <motion.div
        className="absolute"
        style={{
          width: "50vw",
          height: "40vw",
          bottom: "-10vw",
          right: "-5vw",
          background:
            "radial-gradient(ellipse, rgba(100,74,210,0.06) 0%, transparent 65%)",
          filter: "blur(60px)",
        }}
        animate={{
          x: [0, -25, 10, -15, 0],
          y: [0, 10, -5, 15, 0],
          scale: [1, 0.95, 1.06, 0.98, 1],
        }}
        transition={{ duration: 27, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />
    </div>
  );
}

// Sparse ambient dust — very subtle
function DustLayer() {
  const [particles, setParticles] = useState<
    { x: number; y: number; dur: number; delay: number; size: number }[]
  >([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParticles(
        Array.from({ length: 8 }, () => ({
          x: 10 + Math.random() * 80,
          y: 15 + Math.random() * 70,
          dur: 18 + Math.random() * 16,
          delay: Math.random() * 12,
          size: 0.8 + Math.random() * 0.8,
        }))
      );
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: "rgba(139,108,246,0.6)",
          }}
          animate={{ opacity: [0, 0.3, 0], y: [0, -50, -100] }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

// Wordmark
function Wordmark() {
  return (
    <motion.div
      className="flex items-center gap-2.5"
      whileHover={{ opacity: 0.85 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className="w-[22px] h-[22px] rounded-lg flex items-center justify-center"
        style={{
          background: "rgba(139, 108, 246, 0.12)",
          border: "1px solid rgba(139,108,246,0.28)",
          boxShadow: "0 0 12px rgba(139,108,246,0.15)",
        }}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="3" fill="rgba(139,108,246,0.9)" />
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
  );
}

export default function LandingPage({ onStart }: LandingPageProps) {
  const [headlineDone, setHeadlineDone] = useState(false);
  const [subtitleDone, setSubtitleDone] = useState(false);

  const onHeadlineComplete = useCallback(() => setHeadlineDone(true), []);
  const onSubtitleComplete = useCallback(() => setSubtitleDone(true), []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden">
      <GrainOverlay />
      <Vignette />
      <AmbientBlobs />
      <DustLayer />

      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 sm:px-12 py-6 z-20"
      >
        <Wordmark />
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#4ade80" }}
            animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.25, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <span
            className="text-[11px] tracking-wide hidden sm:inline"
            style={{ color: "rgba(255,255,255,0.22)" }}
          >
            Online
          </span>
        </div>
      </motion.nav>

      {/* Hero */}
      <div className="relative z-10 w-full max-w-[680px] mx-auto px-8 sm:px-12 pt-4">

        {/* Orb zone */}
        <div className="flex flex-col items-start mb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.82, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 2.0, ease: [0.16, 1, 0.3, 1] }}
          >
            <GhostOrb size="hero" />
          </motion.div>
        </div>

        {/* Text block */}
        <div className="max-w-[560px]">

          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.9, ease: "easeOut" }}
            className="text-[10px] tracking-[0.22em] uppercase mb-5"
            style={{ color: "rgba(139,108,246,0.55)", fontFamily: "var(--font-heading)" }}
          >
            A conversation with your future self
          </motion.p>

          {/* Headline */}
          <div className="min-h-[3.2rem] sm:min-h-[5.5rem] mb-6">
            <TypewriterText
              text="Talk to the version of you who made it through."
              speed={36}
              delay={900}
              onComplete={onHeadlineComplete}
              tag="h1"
              className="text-display text-ghost-text"
              cursor
            />
          </div>

          {/* Subtext */}
          <AnimatePresence>
            {headlineDone && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.15 }}
                className="mb-9 flex flex-col gap-1"
              >
                <TypewriterText
                  text="You're not talking to an assistant."
                  speed={26}
                  delay={80}
                  onComplete={undefined}
                  tag="p"
                  className="text-[17px] sm:text-lg font-light leading-relaxed"
                  style={{ color: "rgba(240,240,244,0.58)" } as React.CSSProperties}
                  cursor={false}
                />
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.7, duration: 1.2 }}
                  className="text-[17px] sm:text-lg font-light leading-relaxed"
                  style={{ color: "rgba(240,240,244,0.36)" }}
                  onAnimationComplete={onSubtitleComplete}
                >
                  You&apos;re talking to the version of yourself that already knows what happens next.
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA */}
          <AnimatePresence>
            {subtitleDone && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-start gap-4"
              >
                <GlowButton onClick={onStart} size="xl">
                  Begin
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ opacity: 0.75 }}
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </GlowButton>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.16)" }}
                >
                  No account needed · Takes 30 seconds
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <AnimatePresence>
        {subtitleDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2, duration: 1.5 }}
            className="absolute bottom-6 left-0 right-0 flex justify-center"
          >
            <p
              className="text-[9px] tracking-[0.25em] uppercase"
              style={{ color: "rgba(255,255,255,0.1)" }}
            >
              Built with soul — not just code
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
