"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";

export type OrbState = "idle" | "thinking" | "speaking" | "confused";

interface GhostOrbProps {
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
  animate?: boolean;
  /** @deprecated use state instead */
  isThinking?: boolean;
  state?: OrbState;
}

const sizeMap = {
  sm: 44,
  md: 76,
  lg: 112,
  hero: 180,
};

// ── Color palettes by state ───────────────────────────────────────────────────
const STATE_COLORS: Record<OrbState, {
  core: [string, string, string, string, string, string]; // 6 gradient stops
  halo: string;
  rim: string;
}> = {
  idle: {
    core: [
      "rgba(200, 175, 255, 0.92)",
      "rgba(160, 130, 252, 0.88)",
      "rgba(139, 108, 246, 0.82)",
      "rgba(105, 76, 218, 0.70)",
      "rgba(72, 52, 170, 0.45)",
      "rgba(8, 8, 14, 0)",
    ],
    halo: "rgba(139,108,246,0.12)",
    rim: "rgba(210, 190, 255, 0.09)",
  },
  thinking: {
    core: [
      "rgba(200, 175, 255, 0.92)",
      "rgba(160, 130, 252, 0.88)",
      "rgba(139, 108, 246, 0.82)",
      "rgba(105, 76, 218, 0.70)",
      "rgba(72, 52, 170, 0.45)",
      "rgba(8, 8, 14, 0)",
    ],
    halo: "rgba(139,108,246,0.18)",
    rim: "rgba(210, 190, 255, 0.12)",
  },
  speaking: {
    core: [
      "rgba(200, 175, 255, 0.94)",
      "rgba(160, 130, 252, 0.90)",
      "rgba(139, 108, 246, 0.86)",
      "rgba(105, 76, 218, 0.72)",
      "rgba(72, 52, 170, 0.48)",
      "rgba(8, 8, 14, 0)",
    ],
    halo: "rgba(139,108,246,0.22)",
    rim: "rgba(220, 200, 255, 0.14)",
  },
  confused: {
    // Warm amber glow for confused state
    core: [
      "rgba(255, 210, 120, 0.92)",
      "rgba(240, 170, 60, 0.88)",
      "rgba(210, 130, 30, 0.82)",
      "rgba(170, 100, 20, 0.70)",
      "rgba(120, 70, 10, 0.40)",
      "rgba(8, 8, 14, 0)",
    ],
    halo: "rgba(240,160,40,0.18)",
    rim: "rgba(255, 200, 80, 0.12)",
  },
};

export default function GhostOrb({
  size = "hero",
  className = "",
  animate = true,
  isThinking = false,
  state,
}: GhostOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const px = sizeMap[size];
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const shouldReduceMotion = useReducedMotion();

  // Resolve effective state from legacy prop or new prop
  const effectiveState: OrbState = state ?? (isThinking ? "thinking" : "idle");
  const colors = STATE_COLORS[effectiveState];
  const isAmber = effectiveState === "confused";
  const isSpeaking = effectiveState === "speaking";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = px * dpr;
    canvas.width = w;
    canvas.height = w;
    ctx.scale(dpr, dpr);

    let frame = 0;
    let raf: number;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, px, px);

      // Reduce animation complexity when prefers-reduced-motion
      const t = shouldReduceMotion ? 0 : frame * 0.0055;
      const cx = px / 2;
      const cy = px / 2;
      const r = px * 0.385;

      // ── Outer atmospheric halo
      const halo1 = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2.0);
      halo1.addColorStop(0, colors.halo.replace("0.12", `${0.04 + Math.sin(t * 0.8) * 0.015}`));
      halo1.addColorStop(0.6, colors.halo.replace("0.12", "0.02"));
      halo1.addColorStop(1, colors.halo.replace("0.12", "0"));
      ctx.fillStyle = halo1;
      ctx.fillRect(0, 0, px, px);

      // ── Secondary halo
      const halo2 = ctx.createRadialGradient(
        cx + Math.sin(t * 0.5) * r * 0.3,
        cy + Math.cos(t * 0.4) * r * 0.3,
        0, cx, cy, r * 1.6
      );
      halo2.addColorStop(0, colors.halo.replace("0.12", `${0.03 + Math.sin(t * 1.2) * 0.01}`));
      halo2.addColorStop(1, colors.halo.replace("0.12", "0"));
      ctx.fillStyle = halo2;
      ctx.fillRect(0, 0, px, px);

      // ── Animated light source
      const lx = cx + (shouldReduceMotion ? 0 : Math.sin(t * 0.7) * r * 0.22);
      const ly = cy + (shouldReduceMotion ? 0 : Math.cos(t * 0.55) * r * 0.18);

      // ── Main sphere gradient
      const sphereGrad = ctx.createRadialGradient(lx, ly, 0, cx, cy, r);
      const breathe = shouldReduceMotion ? 0.05 : 0.05 + Math.sin(t * 1.2) * 0.04;
      sphereGrad.addColorStop(0, colors.core[0].replace("0.92", `${0.92 + breathe}`));
      sphereGrad.addColorStop(0.25, colors.core[1]);
      sphereGrad.addColorStop(0.5, colors.core[2]);
      sphereGrad.addColorStop(0.72, colors.core[3]);
      sphereGrad.addColorStop(0.88, colors.core[4]);
      sphereGrad.addColorStop(1, colors.core[5]);

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.fill();

      // ── Specular highlight
      const hx = cx - r * 0.26 + (shouldReduceMotion ? 0 : Math.sin(t * 1.0) * r * 0.06);
      const hy = cy - r * 0.26 + (shouldReduceMotion ? 0 : Math.cos(t * 0.8) * r * 0.05);
      const specular = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 0.52);
      specular.addColorStop(0, `rgba(255, 255, 255, ${0.24 + (shouldReduceMotion ? 0 : Math.sin(t * 1.5) * 0.04)})`);
      specular.addColorStop(0.35, isAmber ? "rgba(255, 240, 180, 0.08)" : "rgba(230, 220, 255, 0.08)");
      specular.addColorStop(1, "rgba(220, 210, 255, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = specular;
      ctx.fill();

      // ── Edge ring
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = colors.rim.replace("0.09", `${0.09 + (shouldReduceMotion ? 0 : Math.sin(t * 1.8) * 0.03)}`);
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // ── Inner rim
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.03 + (shouldReduceMotion ? 0 : Math.sin(t * 2.2) * 0.01)})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      frame++;
      raf = requestAnimationFrame(draw);
    }

    if (animate && !shouldReduceMotion) {
      draw();
    } else {
      frame = 0;
      draw();
      cancelAnimationFrame(raf!);
    }

    return () => cancelAnimationFrame(raf!);
  }, [px, dpr, animate, effectiveState, isAmber, shouldReduceMotion, colors]);

  // Pulse params per state
  const haloPulse = (() => {
    if (shouldReduceMotion) return { opacity: [0.4, 0.6, 0.4], scale: [1, 1.02, 1] };
    if (effectiveState === "thinking") return { opacity: [0.5, 1, 0.5], scale: [1, 1.15, 1] };
    if (effectiveState === "speaking") return { opacity: [0.6, 1, 0.6], scale: [1, 1.10, 1] };
    if (effectiveState === "confused") return { opacity: [0.4, 0.9, 0.4], scale: [1, 1.08, 1] };
    return { opacity: [0.3, 0.6, 0.3], scale: [1, 1.06, 1] };
  })();

  const haloDuration = effectiveState === "thinking" ? 1.8
    : effectiveState === "speaking" ? 1.2
    : effectiveState === "confused" ? 2.4
    : 4;

  const haloColor = isAmber
    ? "radial-gradient(ellipse, rgba(240,160,40,0.22) 0%, transparent 65%)"
    : effectiveState === "speaking"
    ? "radial-gradient(ellipse, rgba(139,108,246,0.22) 0%, transparent 65%)"
    : "radial-gradient(ellipse, rgba(139,108,246,0.12) 0%, transparent 65%)";

  return (
    <motion.div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: px, height: px }}
      animate={
        animate && !shouldReduceMotion
          ? {
              y: [0, -8, -3, -10, 0],
              rotate: [0, 0.4, -0.2, 0.3, 0],
            }
          : undefined
      }
      transition={
        animate && !shouldReduceMotion
          ? {
              y: {
                duration: 8,
                repeat: Infinity,
                ease: [0.45, 0.05, 0.55, 0.95],
                times: [0, 0.3, 0.5, 0.75, 1],
              },
              rotate: {
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }
          : undefined
      }
    >
      {/* Outer ambient halo — pulsing */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: px * 1.5,
          height: px * 1.5,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          background: haloColor,
        }}
        animate={haloPulse}
        transition={{ duration: haloDuration, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Speaking: ripple rings */}
      {isSpeaking && !shouldReduceMotion && (
        <>
          {[0, 0.4, 0.8].map((delay, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full pointer-events-none border"
              style={{
                width: px * (1.2 + i * 0.25),
                height: px * (1.2 + i * 0.25),
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                borderColor: "rgba(139,108,246,0.18)",
              }}
              animate={{ opacity: [0.6, 0], scale: [1, 1.3] }}
              transition={{
                duration: 1.8,
                delay,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ))}
        </>
      )}

      {/* Confused: amber ripple */}
      {isAmber && !shouldReduceMotion && (
        <motion.div
          className="absolute rounded-full pointer-events-none border"
          style={{
            width: px * 1.35,
            height: px * 1.35,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            borderColor: "rgba(240,160,40,0.25)",
          }}
          animate={{ opacity: [0.7, 0], scale: [1, 1.25] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      {/* Ground shadow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full blur-2xl"
        style={{
          width: px * 0.65,
          height: px * 0.16,
          background: isAmber
            ? "radial-gradient(ellipse, rgba(240,160,40,0.45) 0%, transparent 70%)"
            : "radial-gradient(ellipse, rgba(139,108,246,0.45) 0%, transparent 70%)",
          opacity: 0.35,
        }}
      />

      <canvas
        ref={canvasRef}
        style={{ width: px, height: px }}
        className="relative z-10"
      />
    </motion.div>
  );
}
