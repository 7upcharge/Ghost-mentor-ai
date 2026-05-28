"use client";

import { motion } from "motion/react";

interface ProgressDotsProps {
  total: number;
  current: number;
  className?: string;
}

export default function ProgressDots({
  total,
  current,
  className = "",
}: ProgressDotsProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === current;
        const isComplete = i < current;

        return (
          <motion.div
            key={i}
            animate={{
              width: isActive ? 20 : 6,
              backgroundColor: isActive
                ? "rgba(139, 108, 246, 0.9)"
                : isComplete
                  ? "rgba(139, 108, 246, 0.4)"
                  : "rgba(255, 255, 255, 0.1)",
            }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            style={{ height: 4, borderRadius: 999 }}
          />
        );
      })}
    </div>
  );
}
