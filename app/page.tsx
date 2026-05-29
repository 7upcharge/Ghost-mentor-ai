"use client";

import { useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AppProvider, useApp } from "@/lib/appState";
import LandingPage from "@/components/LandingPage";
import MemoryTransferScreen from "@/components/MemoryTransferScreen";
import SmartOnboardingScreen from "@/components/SmartOnboardingScreen";
import VoiceCloneScreen from "@/components/VoiceCloneScreen";
import ChatScreen from "@/components/ChatScreen";
import FutureProjectionScreen from "@/components/FutureProjectionScreen";

function AppScreens() {
  const { state, goToScreen } = useApp();

  const handleStart = useCallback(() => goToScreen("memory-transfer"), [goToScreen]);
  const handleTransferComplete = useCallback(() => goToScreen("voice-clone"), [goToScreen]);
  const handleNoHistory = useCallback(() => goToScreen("smart-onboarding"), [goToScreen]);
  const handleSmartOnboardingComplete = useCallback(() => goToScreen("voice-clone"), [goToScreen]);
  const handleVoiceCloneComplete = useCallback(() => goToScreen("chat"), [goToScreen]);
  const handleFutureProjectionComplete = useCallback(() => {
    goToScreen("landing");
    window.location.reload();
  }, [goToScreen]);

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
