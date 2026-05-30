"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useSession, signIn } from "next-auth/react";
import { AppProvider, useApp, createEmptyFutureSelfMemoryProfile } from "@/lib/appState";
import { supabase } from "@/lib/supabaseClient";
import LandingPage from "@/components/LandingPage";
import MemoryTransferScreen from "@/components/MemoryTransferScreen";
import SmartOnboardingScreen from "@/components/SmartOnboardingScreen";
import VoiceCloneScreen from "@/components/VoiceCloneScreen";
import ChatScreen from "@/components/ChatScreen";
import FutureProjectionScreen from "@/components/FutureProjectionScreen";
import PatternAnalyzer from "@/components/PatternAnalyzer";
import GhostOrb from "@/components/GhostOrb";

function AppScreens() {
  const { state, dispatch, goToScreen } = useApp();
  const { data: session, status } = useSession();
  const [profileChecked, setProfileChecked] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);

  // Sync user info from session to local AppState
  useEffect(() => {
    if (session?.user) {
      const sessionUser = session.user as any;
      if (sessionUser.id && state.user.id !== sessionUser.id) {
        dispatch({ type: "SET_USER_ID", id: sessionUser.id });
      }
      if (session.user.name && state.user.name !== session.user.name) {
        dispatch({ type: "SET_USER_NAME", name: session.user.name });
      }
    }
  }, [session, state.user.id, state.user.name, dispatch]);

  useEffect(() => {
    if (!session?.user || profileChecked || checkingProfile) return;

    const sessionUser = session.user as any;
    if (!sessionUser.id) return;

    const checkUser = async () => {
      setCheckingProfile(true);
      try {
        const { data } = await supabase
          .from("user_profiles")
          .select("personality_profile, chat_summary, name, voice_id, language_profile")
          .eq("user_id", sessionUser.id)
          .single();

        if (data?.personality_profile) {
          // Returning user - load profile
          dispatch({ type: "SET_MEMORY_PROFILE", memoryProfile: data.personality_profile as any });
          if (data.language_profile) {
            dispatch({ type: "SET_LANGUAGE_PROFILE", languageProfile: data.language_profile as any });
          }
          if (data.name) {
            dispatch({ type: "SET_USER_NAME", name: data.name });
          }
          if (data.voice_id) {
            dispatch({ type: "SET_VOICE_ID", voiceId: data.voice_id });
          }
          if (data.chat_summary) {
            dispatch({ type: "SET_CHAT_SUMMARY", chatSummary: data.chat_summary });
          }

          // Fetch chat history
          const { data: sessions } = await supabase
            .from("chat_sessions")
            .select("messages, created_at")
            .eq("user_id", sessionUser.id)
            .order("created_at", { ascending: true })
            .limit(50);

          const formattedMessages = (sessions || []).flatMap((sessionRow: any) => {
            return (sessionRow.messages || []).map((m: any, idx: number) => ({
              id: `${sessionRow.created_at}-${idx}-${Math.random()}`,
              role: (m.role === "assistant" || m.role === "ghost") ? "ghost" : "user",
              text: m.content || m.text || "",
              timestamp: new Date(sessionRow.created_at).getTime(),
              isHistorical: true
            }));
          });

          dispatch({ type: "SET_MESSAGES", messages: formattedMessages });
          goToScreen("chat");
        } else {
          // New user - automatically register default profile details
          const defaultProfile = createEmptyFutureSelfMemoryProfile();
          const defaultLangProfile = {
            dominantLanguage: "english" as const,
            sentenceLength: "medium" as const,
            formality: "casual" as const,
            commonSlang: [],
            frustrationStyle: "still being learned",
            excitementStyle: "still being learned",
          };

          await supabase.from("user_profiles").upsert(
            {
              user_id: sessionUser.id,
              name: session.user?.name || "Ghost User",
              personality_profile: defaultProfile,
              language_profile: defaultLangProfile,
              confidence_score: 0,
              transfer_sources: [],
              last_active: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

          dispatch({ type: "SET_MEMORY_PROFILE", memoryProfile: defaultProfile });
          dispatch({ type: "SET_LANGUAGE_PROFILE", languageProfile: defaultLangProfile });
          dispatch({ type: "SET_USER_NAME", name: session.user?.name || "Ghost User" });
          dispatch({ type: "SET_MESSAGES", messages: [] });
          goToScreen("chat");
        }
      } catch (err) {
        console.error("Failed to query user profile:", err);
        // Fallback: load default profile and go directly to chat so user is never stuck
        const defaultProfile = createEmptyFutureSelfMemoryProfile();
        dispatch({ type: "SET_MEMORY_PROFILE", memoryProfile: defaultProfile });
        dispatch({ type: "SET_USER_NAME", name: session.user?.name || "Ghost User" });
        dispatch({ type: "SET_MESSAGES", messages: [] });
        goToScreen("chat");
      } finally {
        setProfileChecked(true);
        setCheckingProfile(false);
      }
    };

    checkUser();
  }, [session, profileChecked, checkingProfile, dispatch, goToScreen]);

  const handleStart = useCallback(() => goToScreen("memory-transfer"), [goToScreen]);
  const handleTransferComplete = useCallback(() => goToScreen("voice-clone"), [goToScreen]);
  const handleNoHistory = useCallback(() => goToScreen("smart-onboarding"), [goToScreen]);
  const handleSmartOnboardingComplete = useCallback(() => goToScreen("voice-clone"), [goToScreen]);
  const handleVoiceCloneComplete = useCallback(() => goToScreen("chat"), [goToScreen]);
  const handleFutureProjectionComplete = useCallback(() => {
    goToScreen("landing");
    window.location.reload();
  }, [goToScreen]);

  if (status === "loading" || (session && !profileChecked)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-ghost-bg min-h-screen gap-6">
        <GhostOrb size="md" state="thinking" />
        <span className="text-[11px] tracking-[0.25em] uppercase text-ghost-accent/75 font-semibold font-heading animate-pulse">
          Remembering you...
        </span>
      </div>
    );
  }

  // If not authenticated, we only render the LandingPage with a login trigger
  if (!session) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5 }}
          className="flex-1"
        >
          <LandingPage onStart={() => signIn("google")} />
        </motion.div>
      </AnimatePresence>
    );
  }

  // Once authenticated, we manage standard screen states
  return (
    <AnimatePresence mode="wait">
      {state.screen === "landing" && (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5 }}
          className="flex-1"
        >
          <LandingPage onStart={handleStart} />
        </motion.div>
      )}

      {state.screen === "memory-transfer" && (
        <motion.div
          key="memory-transfer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5 }}
          className="flex-1"
        >
          <MemoryTransferScreen
            onComplete={handleTransferComplete}
            onNoHistory={handleNoHistory}
          />
        </motion.div>
      )}

      {state.screen === "smart-onboarding" && (
        <motion.div
          key="smart-onboarding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5 }}
          className="flex-1"
        >
          <SmartOnboardingScreen onComplete={handleSmartOnboardingComplete} />
        </motion.div>
      )}

      {state.screen === "voice-clone" && (
        <motion.div
          key="voice-clone"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5 }}
          className="flex-1"
        >
          <VoiceCloneScreen onComplete={handleVoiceCloneComplete} />
        </motion.div>
      )}

      {state.screen === "chat" && (
        <motion.div
          key="chat"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="flex-1 flex flex-col min-h-screen"
        >
          <ChatScreen />
        </motion.div>
      )}

      {state.screen === "future-projection" && (
        <motion.div
          key="future-projection"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5 }}
          className="flex-1"
        >
          <FutureProjectionScreen onComplete={handleFutureProjectionComplete} />
        </motion.div>
      )}

      {state.screen === "analyzer" && (
        <motion.div
          key="analyzer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5 }}
          className="flex-1"
        >
          <PatternAnalyzer />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <AppScreens />
    </AppProvider>
  );
}
