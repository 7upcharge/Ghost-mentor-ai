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
  isHistorical?: boolean;
}

export interface InsightCard {
  prediction: string;
  actionableStep: string;
  emotionalTruth: string;
}

export interface UserProfile {
  id: string;
  name: string;
  aspiration: string;
  currentStruggle: string;
  voiceId?: string | null;
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

export type Screen = "landing" | "memory-transfer" | "smart-onboarding" | "onboarding" | "voice-clone" | "chat" | "analyzer" | "future-projection";

export interface TransferSource {
  platform: "chatgpt" | "claude" | "gemini" | "grok" | "perplexity" | "manual";
  messageCount: number;
  uploaded: boolean;
}

export interface LanguageProfileState {
  dominantLanguage: "hindi" | "english" | "hinglish";
  sentenceLength: "short" | "medium" | "long";
  formality: "casual" | "formal";
  commonSlang: string[];
  frustrationStyle: string;
  excitementStyle: string;
}

export interface PersonalityProfile {
  coreFears: string[];
  biggestAmbitions: string[];
  avoidancePatterns: string[];
  communicationStyle: {
    confusionExpression: string;
    excitementExpression: string;
    doubtExpression: string;
    overallTone: string;
  };
  recurringStruggles: string[];
  selfTalkPatterns: string[];
  unstatedValues: string[];
  analysisNote: string;
}

export interface AppState {
  screen: Screen;
  user: UserProfile;
  messages: Message[];
  memoryProfile: FutureSelfMemoryProfile;
  languageProfile: LanguageProfileState | null;
  transferSources: TransferSource[];
  confidenceScore: number;
  isThinking: boolean;
  onboardingStep: number;
  futureProjections: FutureProjection[] | null;
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
  | { type: "SET_USER_ID"; id: string }
  | { type: "SET_VOICE_ID"; voiceId: string }
  | { type: "SET_LANGUAGE_PROFILE"; languageProfile: LanguageProfileState }
  | { type: "SET_TRANSFER_SOURCES"; transferSources: TransferSource[] }
  | { type: "SET_CONFIDENCE_SCORE"; score: number }
  | { type: "SET_FUTURE_PROJECTIONS"; projections: FutureProjection[] | null }
  | { type: "SET_MESSAGES"; messages: Message[] }
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
    id: "",
    name: "",
    aspiration: "",
    currentStruggle: "",
    voiceId: null,
  },
  messages: [],
  memoryProfile: createEmptyFutureSelfMemoryProfile(),
  languageProfile: null,
  transferSources: [],
  confidenceScore: 0,
  isThinking: false,
  onboardingStep: 0,
  futureProjections: null,
};

function mergeStoredFutureSelfMemoryProfile(storedMemory: unknown): FutureSelfMemoryProfile {
  const empty = createEmptyFutureSelfMemoryProfile();

  if (!storedMemory || typeof storedMemory !== "object") return empty;

  const stored = storedMemory as Partial<FutureSelfMemoryProfile>;
  const storedContinuity = stored.psychologicalContinuity;

  return {
    identity: {
      ...empty.identity,
      ...stored.identity,
    },
    communicationStyle: {
      ...empty.communicationStyle,
      ...stored.communicationStyle,
    },
    futureSelfEvolution: {
      ...empty.futureSelfEvolution,
      ...stored.futureSelfEvolution,
    },
    psychologicalContinuity: {
      ...empty.psychologicalContinuity,
      ...storedContinuity,
      recurringThemes: storedContinuity?.recurringThemes ?? [],
      recurringFears: storedContinuity?.recurringFears ?? [],
      behavioralLoops: storedContinuity?.behavioralLoops ?? [],
      growthPatterns: storedContinuity?.growthPatterns ?? [],
    },
  };
}

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
    case "SET_USER_ID":
      return { ...state, user: { ...state.user, id: action.id } };
    case "SET_VOICE_ID":
      return { ...state, user: { ...state.user, voiceId: action.voiceId } };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.message] };
    case "SET_MEMORY_PROFILE":
      return { ...state, memoryProfile: action.memoryProfile };
    case "RESET_MEMORY_PROFILE":
      return { ...state, memoryProfile: createEmptyFutureSelfMemoryProfile() };
    case "SET_THINKING":
      return { ...state, isThinking: action.isThinking };
    case "SET_LANGUAGE_PROFILE":
      return { ...state, languageProfile: action.languageProfile };
    case "SET_TRANSFER_SOURCES":
      return { ...state, transferSources: action.transferSources };
    case "SET_CONFIDENCE_SCORE":
      return { ...state, confidenceScore: action.score };
    case "SET_FUTURE_PROJECTIONS":
      return { ...state, futureProjections: action.projections };
    case "SET_MESSAGES":
      return { ...state, messages: action.messages };
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
        if (storedMemory) {
          dispatch({
            type: "SET_MEMORY_PROFILE",
            memoryProfile: mergeStoredFutureSelfMemoryProfile(JSON.parse(storedMemory)),
          });
        }
        
        const storedUser = window.localStorage.getItem("ghost-mentor.user-profile");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed.id) dispatch({ type: "SET_USER_ID", id: parsed.id });
          if (parsed.name) dispatch({ type: "SET_USER_NAME", name: parsed.name });
          if (parsed.aspiration) dispatch({ type: "SET_USER_ASPIRATION", aspiration: parsed.aspiration });
          if (parsed.currentStruggle) dispatch({ type: "SET_USER_STRUGGLE", struggle: parsed.currentStruggle });
          if (parsed.voiceId) dispatch({ type: "SET_VOICE_ID", voiceId: parsed.voiceId });
        }
      } catch {
        window.localStorage.removeItem(MEMORY_STORAGE_KEY);
        window.localStorage.removeItem("ghost-mentor.user-profile");
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(state.memoryProfile));
  }, [state.memoryProfile]);

  useEffect(() => {
    window.localStorage.setItem("ghost-mentor.user-profile", JSON.stringify(state.user));
  }, [state.user]);

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
