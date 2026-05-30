"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import GhostOrb from "./GhostOrb";
import { useApp } from "@/lib/appState";
import { supabase } from "@/lib/supabaseClient";

interface VoicePreferenceScreenProps {
  onComplete: (preference: "own" | "ai" | "text") => void;
}

export default function VoicePreferenceScreen({ onComplete }: VoicePreferenceScreenProps) {
  const { state, dispatch } = useApp();
  const [isSaving, setIsSaving] = useState(false);

  const handleSelect = async (preference: "own" | "ai" | "text") => {
    setIsSaving(true);
    try {
      const userId = state.user.id;
      if (userId) {
        // Save preference to Supabase
        await supabase
          .from("user_profiles")
          .update({ voice_preference: preference })
          .eq("user_id", userId);
      }

      // Dispatch to local app state
      dispatch({ type: "SET_VOICE_PREFERENCE", preference });
      
      setIsSaving(false);
      onComplete(preference);
    } catch (error) {
      console.error("Failed to save voice preference:", error);
      // Fallback: move forward anyway to prevent user blockage
      dispatch({ type: "SET_VOICE_PREFERENCE", preference });
      setIsSaving(false);
      onComplete(preference);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 bg-ghost-bg overflow-hidden text-center select-none">
      {/* Orb Pulsing Behind the Modal */}
      <div className="absolute inset-0 flex items-center justify-center -z-10 opacity-30 pointer-events-none">
        <GhostOrb size="hero" animate state="idle" />
      </div>

      {/* Main Glass Card Modal */}
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] p-6 sm:p-8 rounded-3xl glass-card flex flex-col gap-6 text-left"
      >
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-light tracking-tight text-white mb-2 leading-tight">
            How do you want Ghost Mentor
          </h2>
          <h2 className="text-xl sm:text-2xl font-light tracking-tight text-white mb-5 leading-tight">
            to speak to you?
          </h2>
        </div>

        <div className="flex flex-col gap-3.5">
          {/* My Voice Choice */}
          <button
            onClick={() => !isSaving && handleSelect("own")}
            disabled={isSaving}
            className="group flex items-start gap-4 p-4 rounded-2xl border border-white/5 hover:border-ghost-accent/40 bg-white/[0.03] hover:bg-ghost-accent/[0.04] transition-all text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-2xl select-none" role="img" aria-label="microphone">🎙️</span>
            <div>
              <h3 className="text-sm font-medium text-white group-hover:text-ghost-accent transition-colors">
                My Voice
              </h3>
              <p className="text-[12px] text-ghost-muted mt-1 leading-relaxed">
                Record 30 seconds — Ghost Mentor speaks in your future voice
              </p>
            </div>
          </button>

          {/* AI Voice Choice */}
          <button
            onClick={() => !isSaving && handleSelect("ai")}
            disabled={isSaving}
            className="group flex items-start gap-4 p-4 rounded-2xl border border-white/5 hover:border-ghost-accent/40 bg-white/[0.03] hover:bg-ghost-accent/[0.04] transition-all text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-2xl select-none" role="img" aria-label="robot">🤖</span>
            <div>
              <h3 className="text-sm font-medium text-white group-hover:text-ghost-accent transition-colors">
                AI Voice
              </h3>
              <p className="text-[12px] text-ghost-muted mt-1 leading-relaxed">
                Skip recording — Ghost Mentor uses a calm AI voice
              </p>
            </div>
          </button>

          {/* Text Only Choice */}
          <button
            onClick={() => !isSaving && handleSelect("text")}
            disabled={isSaving}
            className="group flex items-start gap-4 p-4 rounded-2xl border border-white/5 hover:border-ghost-accent/40 bg-white/[0.03] hover:bg-ghost-accent/[0.04] transition-all text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-2xl select-none" role="img" aria-label="speech balloon">💬</span>
            <div>
              <h3 className="text-sm font-medium text-white group-hover:text-ghost-accent transition-colors">
                Text Only
              </h3>
              <p className="text-[12px] text-ghost-muted mt-1 leading-relaxed">
                No voice — just chat
              </p>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
