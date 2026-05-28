"use client";

import { motion } from "motion/react";

interface GlowButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  size?: "default" | "lg" | "xl";
  disabled?: boolean;
  variant?: "primary" | "ghost";
}

const sizeStyles = {
  default: "px-5 py-2.5 text-sm gap-1.5",
  lg:      "px-6 py-3   text-sm gap-2",
  xl:      "px-8 py-3.5 text-[15px] gap-2.5",
};

export default function GlowButton({
  children,
  onClick,
  className = "",
  size = "default",
  disabled = false,
  variant = "primary",
}: GlowButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.025, y: disabled ? 0 : -1 }}
      whileTap={{ scale: disabled ? 1 : 0.975, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={`
        relative inline-flex items-center justify-center font-medium
        rounded-xl tracking-[-0.012em]
        cursor-pointer select-none overflow-hidden
        transition-all duration-200
        disabled:opacity-35 disabled:cursor-not-allowed disabled:pointer-events-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ghost-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-ghost-bg
        ${sizeStyles[size]}
        ${isPrimary
          ? "bg-ghost-accent text-white hover:bg-ghost-accent-light shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_6px_20px_rgba(139,108,246,0.3)] hover:shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_8px_28px_rgba(139,108,246,0.45)]"
          : "bg-transparent text-ghost-text-secondary border border-ghost-border hover:text-ghost-text hover:border-ghost-border-hover hover:bg-ghost-surface/50"
        }
        ${className}
      `}
    >
      {/* Inner shimmer on hover */}
      {isPrimary && !disabled && (
        <span
          className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)",
          }}
        />
      )}
      {children}
    </motion.button>
  );
}
