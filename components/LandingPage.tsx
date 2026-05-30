"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useSession, signIn } from "next-auth/react";
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
  const { data: session } = useSession();
  const shouldReduceMotion = useReducedMotion();
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
      <div className="relative z-10 w-full max-w-[800px] mx-auto px-8 sm:px-12 pt-4">

        {/* Orb zone */}
        <div className="flex flex-col items-start mb-10">
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.82, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0.5 } : { duration: 2.0, ease: [0.16, 1, 0.3, 1] }}
          >
            <GhostOrb size="hero" className="w-20 h-20 md:w-[120px] md:h-[120px]" />
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
              text="Meet the version of you that made it."
              speed={36}
              delay={900}
              onComplete={onHeadlineComplete}
              tag="h1"
              className="text-display text-ghost-text text-[32px] md:text-[52px] leading-[1.05]"
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
                  className="text-[16px] md:text-[18px] font-light leading-relaxed"
                  style={{ color: "rgba(240,240,244,0.58)" } as React.CSSProperties}
                  cursor={false}
                />
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.7, duration: 1.2 }}
                  className="text-[16px] md:text-[18px] font-light leading-relaxed"
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
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={shouldReduceMotion ? { duration: 0.35 } : { duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-stretch md:items-start gap-4 animate-fade-in w-full md:w-auto"
              >
                {session ? (
                  <GlowButton onClick={onStart} size="xl" className="w-full md:w-auto">
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
                ) : (
                  <button
                    onClick={() => signIn("google", { callbackUrl: "/" })}
                    className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-medium hover:bg-gray-100 transition-all w-full justify-center md:w-auto cursor-pointer"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.6-4.53-2.6-4.53z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                )}

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="text-xs text-center md:text-left"
                  style={{ color: "rgba(255,255,255,0.16)" }}
                >
                  {session ? "Authenticated · Takes 30 seconds" : "Secure OAuth login · No account needed"}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Marketing Cards */}
        <AnimatePresence>
          {subtitleDone && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={shouldReduceMotion ? { duration: 0.5 } : { duration: 0.8, delay: 0.35, ease: "easeOut" }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 w-full relative z-20"
            >
              {[
                {
                  title: "Memory Transfer",
                  desc: "Consolidate your conversations from ChatGPT, Claude, Gemini, Grok, and Perplexity into a single cohesive profile.",
                  icon: "⚡"
                },
                {
                  title: "Voice Cloning Flow",
                  desc: "Record a 30-second sample to boot Ghost Mentor into your actual cloned voice via ElevenLabs.",
                  icon: "🎙️"
                },
                {
                  title: "Continuous Dialogue",
                  desc: "The system remembers your struggles and realizations across sessions, serving as a true evolving mentor.",
                  icon: "🧠"
                }
              ].map((card, i) => (
                <motion.div
                  key={i}
                  whileHover={shouldReduceMotion ? {} : { y: -2, borderColor: "rgba(139,108,246,0.22)" }}
                  className="p-4 rounded-xl flex flex-col gap-2 transition-all duration-300"
                  style={{
                    background: "rgba(15, 15, 20, 0.45)",
                    border: "1px solid rgba(255,255,255,0.055)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <span className="text-lg">{card.icon}</span>
                  <h3 className="text-[12px] font-semibold tracking-wider uppercase text-ghost-accent-light" style={{ fontFamily: "var(--font-heading)" }}>
                    {card.title}
                  </h3>
                  <p className="text-[11px] font-light text-ghost-text-secondary/70 leading-relaxed">
                    {card.desc}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
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
              className="text-[9px] tracking-[0.25em] uppercase text-center max-w-[90%] px-4"
              style={{ color: "rgba(255,255,255,0.15)" }}
            >
              Meet the version of you that made it. Built with soul — not just code.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
