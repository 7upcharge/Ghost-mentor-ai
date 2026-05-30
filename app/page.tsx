"use client";

import { useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useSession, signIn } from "next-auth/react";
import { AppProvider, useApp } from "@/lib/appState";
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

  const handleStart = useCallback(() => goToScreen("memory-transfer"), [goToScreen]);
  const handleTransferComplete = useCallback(() => goToScreen("voice-clone"), [goToScreen]);
  const handleNoHistory = useCallback(() => goToScreen("smart-onboarding"), [goToScreen]);
  const handleSmartOnboardingComplete = useCallback(() => goToScreen("voice-clone"), [goToScreen]);
  const handleVoiceCloneComplete = useCallback(() => goToScreen("chat"), [goToScreen]);
  const handleFutureProjectionComplete = useCallback(() => {
    goToScreen("landing");
    window.location.reload();
  }, [goToScreen]);

  if (status === "loading") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-ghost-bg min-h-screen">
        <GhostOrb size="md" isThinking />
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
