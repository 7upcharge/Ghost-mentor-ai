"use client";

import { useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AppProvider, useApp } from "@/lib/appState";
import LandingPage from "@/components/LandingPage";
import OnboardingFlow from "@/components/OnboardingFlow";
import ChatScreen from "@/components/ChatScreen";

function AppScreens() {
  const { state, goToScreen } = useApp();

  const handleStart = useCallback(() => goToScreen("onboarding"), [goToScreen]);
  const handleOnboardingComplete = useCallback(
    () => goToScreen("chat"),
    [goToScreen]
  );

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

      {state.screen === "onboarding" && (
        <motion.div
          key="onboarding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5 }}
          className="flex-1"
        >
          <OnboardingFlow onComplete={handleOnboardingComplete} />
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
