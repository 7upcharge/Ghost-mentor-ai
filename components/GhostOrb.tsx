"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";

interface GhostOrbProps {
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
  animate?: boolean;
  isThinking?: boolean;
}

const sizeMap = {
  sm: 44,
  md: 76,
  lg: 112,
  hero: 180,
};

export default function GhostOrb({
  size = "hero",
  className = "",
  animate = true,
  isThinking = false,
}: GhostOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const px = sizeMap[size];
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

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
      const t = frame * 0.0055;
      const cx = px / 2;
      const cy = px / 2;
      const r = px * 0.385;

      // ── Outer atmospheric halo (2 layers)
      const halo1 = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2.0);
      halo1.addColorStop(0, `rgba(139, 108, 246, ${0.04 + Math.sin(t * 0.8) * 0.015})`);
      halo1.addColorStop(0.6, `rgba(100, 74, 210, 0.02)`);
      halo1.addColorStop(1, "rgba(139, 108, 246, 0)");
      ctx.fillStyle = halo1;
      ctx.fillRect(0, 0, px, px);

      // ── Secondary color halo (warm undertone)
      const halo2 = ctx.createRadialGradient(
        cx + Math.sin(t * 0.5) * r * 0.3,
        cy + Math.cos(t * 0.4) * r * 0.3,
        0, cx, cy, r * 1.6
      );
      halo2.addColorStop(0, `rgba(180, 140, 255, ${0.03 + Math.sin(t * 1.2) * 0.01})`);
      halo2.addColorStop(1, "rgba(139, 108, 246, 0)");
      ctx.fillStyle = halo2;
      ctx.fillRect(0, 0, px, px);

      // ── Animated light source position
      const lx = cx + Math.sin(t * 0.7) * r * 0.22;
      const ly = cy + Math.cos(t * 0.55) * r * 0.18;

      // ── Main sphere — rich layered gradient
      const sphereGrad = ctx.createRadialGradient(lx, ly, 0, cx, cy, r);
      const breathe = 0.05 + Math.sin(t * 1.2) * 0.04;
      sphereGrad.addColorStop(0, `rgba(200, 175, 255, ${0.92 + breathe})`);
      sphereGrad.addColorStop(0.25, `rgba(160, 130, 252, ${0.88})`);
      sphereGrad.addColorStop(0.5, `rgba(139, 108, 246, ${0.82})`);
      sphereGrad.addColorStop(0.72, `rgba(105, 76, 218, 0.70)`);
      sphereGrad.addColorStop(0.88, `rgba(72, 52, 170, 0.45)`);
      sphereGrad.addColorStop(1, "rgba(8, 8, 14, 0)");

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.fill();

      // ── Specular highlight (top-left, drifting)
      const hx = cx - r * 0.26 + Math.sin(t * 1.0) * r * 0.06;
      const hy = cy - r * 0.26 + Math.cos(t * 0.8) * r * 0.05;
      const specular = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 0.52);
      specular.addColorStop(0, `rgba(255, 255, 255, ${0.24 + Math.sin(t * 1.5) * 0.04})`);
      specular.addColorStop(0.35, "rgba(230, 220, 255, 0.08)");
      specular.addColorStop(1, "rgba(220, 210, 255, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = specular;
      ctx.fill();

      // ── Secondary specular (bottom-right, very faint)
      const sx2 = cx + r * 0.3 + Math.sin(t * 0.6) * r * 0.04;
      const sy2 = cy + r * 0.3 + Math.cos(t * 0.7) * r * 0.03;
      const spec2 = ctx.createRadialGradient(sx2, sy2, 0, sx2, sy2, r * 0.3);
      spec2.addColorStop(0, "rgba(180, 160, 255, 0.07)");
      spec2.addColorStop(1, "rgba(180, 160, 255, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = spec2;
      ctx.fill();

      // ── Edge ring — breathing opacity
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(210, 190, 255, ${0.09 + Math.sin(t * 1.8) * 0.03})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // ── Inner rim light
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.03 + Math.sin(t * 2.2) * 0.01})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      frame++;
      raf = requestAnimationFrame(draw);
    }

    if (animate) {
      draw();
    } else {
      frame = 0;
      draw();
      cancelAnimationFrame(raf!);
    }

    return () => cancelAnimationFrame(raf!);
  }, [px, dpr, animate]);

  return (
    <motion.div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: px, height: px }}
      animate={
        animate
          ? {
              y: [0, -8, -3, -10, 0],
              rotate: [0, 0.4, -0.2, 0.3, 0],
            }
          : undefined
      }
      transition={
        animate
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
          background: "radial-gradient(ellipse, rgba(139,108,246,0.12) 0%, transparent 65%)",
        }}
        animate={isThinking
          ? { opacity: [0.5, 1, 0.5], scale: [1, 1.15, 1] }
          : { opacity: [0.3, 0.6, 0.3], scale: [1, 1.06, 1] }
        }
        transition={{ duration: isThinking ? 1.8 : 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Ground shadow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full blur-2xl"
        style={{
          width: px * 0.65,
          height: px * 0.16,
          background: "radial-gradient(ellipse, rgba(139,108,246,0.45) 0%, transparent 70%)",
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
