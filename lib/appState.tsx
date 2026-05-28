"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface FutureProjection {
  year: number;
  ifNothingChanges: string[];
  ifYouActNow: string[];
}

export interface Message {
  id: string;
  role: "user" | "ghost";
  text: string;
  emotion?: string;
  emotionIcon?: string;
  insightCard?: InsightCard | null;
  futureProjection?: FutureProjection | null;
  timestamp: number;
}

export interface InsightCard {
  prediction: string;
  actionableStep: string;
  emotionalTruth: string;
}

export interface UserProfile {
  name: string;
  aspiration: string;
  currentStruggle: string;
}

export interface FutureSelfMemoryProfile {
  identity: {
    ambition: "unknown" | "emerging" | "high";
    coreFear: string;
    decisionPattern: string;
    emotionalStyle: string;
  };
  communicationStyle: {
    tone: string;
    sentenceRhythm: string;
    vocabulary: string;
  };
  futureSelfEvolution: {
    confidence: "unknown" | "fragile" | "improving" | "grounded";
    discipline: "unknown" | "developing" | "consistent";
    emotionalClarity: "unknown" | "emerging" | "high";
  };
  psychologicalContinuity: {
    recurringThemes: string[];
    recurringFears: string[];
    behavioralLoops: string[];
    growthPatterns: string[];
    messageCount: number;
    lastUpdatedAt: number | null;
  };
}

export type Screen = "landing" | "onboarding" | "chat";

export interface AppState {
  screen: Screen;
  user: UserProfile;
  messages: Message[];
  memoryProfile: FutureSelfMemoryProfile;
  isThinking: boolean;
  onboardingStep: number;
}

// ═══════════════════════════════════════════
// Actions
// ═══════════════════════════════════════════

type Action =
  | { type: "SET_SCREEN"; screen: Screen }
  | { type: "SET_ONBOARDING_STEP"; step: number }
  | { type: "SET_USER_NAME"; name: string }
  | { type: "SET_USER_ASPIRATION"; aspiration: string }
  | { type: "SET_USER_STRUGGLE"; struggle: string }
  | { type: "ADD_MESSAGE"; message: Message }
  | { type: "SET_MEMORY_PROFILE"; memoryProfile: FutureSelfMemoryProfile }
  | { type: "RESET_MEMORY_PROFILE" }
  | { type: "SET_THINKING"; isThinking: boolean }
  | { type: "UPDATE_LAST_GHOST_MESSAGE"; text: string; insightCard?: InsightCard | null; futureProjection?: FutureProjection | null };

// ═══════════════════════════════════════════
// Initial State
// ═══════════════════════════════════════════

const MEMORY_STORAGE_KEY = "ghost-mentor.future-self-memory";

export function createEmptyFutureSelfMemoryProfile(): FutureSelfMemoryProfile {
  return {
    identity: {
      ambition: "unknown",
      coreFear: "not enough emotional history yet",
      decisionPattern: "still being learned",
      emotionalStyle: "still being learned",
    },
    communicationStyle: {
      tone: "still being learned",
      sentenceRhythm: "still being learned",
      vocabulary: "still being learned",
    },
    futureSelfEvolution: {
      confidence: "unknown",
      discipline: "unknown",
      emotionalClarity: "unknown",
    },
    psychologicalContinuity: {
      recurringThemes: [],
      recurringFears: [],
      behavioralLoops: [],
      growthPatterns: [],
      messageCount: 0,
      lastUpdatedAt: null,
    },
  };
}

const initialState: AppState = {
  screen: "landing",
  user: {
    name: "",
    aspiration: "",
    currentStruggle: "",
  },
  messages: [],
  memoryProfile: createEmptyFutureSelfMemoryProfile(),
  isThinking: false,
  onboardingStep: 0,
};

// ═══════════════════════════════════════════
// Reducer
// ═══════════════════════════════════════════

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_SCREEN":
      return { ...state, screen: action.screen };
    case "SET_ONBOARDING_STEP":
      return { ...state, onboardingStep: action.step };
    case "SET_USER_NAME":
      return { ...state, user: { ...state.user, name: action.name } };
    case "SET_USER_ASPIRATION":
      return { ...state, user: { ...state.user, aspiration: action.aspiration } };
    case "SET_USER_STRUGGLE":
      return {
        ...state,
        user: { ...state.user, currentStruggle: action.struggle },
      };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.message] };
    case "SET_MEMORY_PROFILE":
      return { ...state, memoryProfile: action.memoryProfile };
    case "RESET_MEMORY_PROFILE":
      return { ...state, memoryProfile: createEmptyFutureSelfMemoryProfile() };
    case "SET_THINKING":
      return { ...state, isThinking: action.isThinking };
    case "UPDATE_LAST_GHOST_MESSAGE": {
      const msgs = [...state.messages];
      const lastGhostIdx = msgs.findLastIndex((m) => m.role === "ghost");
      if (lastGhostIdx !== -1) {
        msgs[lastGhostIdx] = {
          ...msgs[lastGhostIdx],
          text: action.text,
          insightCard: action.insightCard !== undefined ? action.insightCard : msgs[lastGhostIdx].insightCard,
          futureProjection: action.futureProjection !== undefined ? action.futureProjection : msgs[lastGhostIdx].futureProjection,
        };
      }
      return { ...state, messages: msgs };
    }
    default:
      return state;
  }
}

// ═══════════════════════════════════════════
// Context
// ═══════════════════════════════════════════

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  goToScreen: (screen: Screen) => void;
  addMessage: (message: Message) => void;
  setThinking: (isThinking: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const storedMemory = window.localStorage.getItem(MEMORY_STORAGE_KEY);
        if (!storedMemory) return;

        dispatch({
          type: "SET_MEMORY_PROFILE",
          memoryProfile: {
            ...createEmptyFutureSelfMemoryProfile(),
            ...JSON.parse(storedMemory),
          },
        });
      } catch {
        window.localStorage.removeItem(MEMORY_STORAGE_KEY);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(state.memoryProfile));
  }, [state.memoryProfile]);

  const goToScreen = useCallback(
    (screen: Screen) => dispatch({ type: "SET_SCREEN", screen }),
    []
  );

  const addMessage = useCallback(
    (message: Message) => dispatch({ type: "ADD_MESSAGE", message }),
    []
  );

  const setThinking = useCallback(
    (isThinking: boolean) => dispatch({ type: "SET_THINKING", isThinking }),
    []
  );

  return (
    <AppContext.Provider
      value={{ state, dispatch, goToScreen, addMessage, setThinking }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
