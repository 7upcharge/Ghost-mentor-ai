import { NextResponse } from "next/server";
import type { UserProfile, FutureSelfMemoryProfile, LanguageProfileState } from "@/lib/appState";
import {
  generateGhostResponse,
  MODEL_PIPELINE,
  isConfusionMessage,
  getConfusionLevel,
  type SimulationResponse,
} from "@/lib/simulationEngine";
import { supabase } from "@/lib/supabaseClient";

interface GhostRequestMessage {
  role: string;
  text: string;
}

interface GhostRequest {
  user: UserProfile;
  message: string;
  historyCount: number;
  memoryProfile?: FutureSelfMemoryProfile;
  languageProfile?: LanguageProfileState;
  /** Number of consecutive confusion messages the user has sent */
  confusionCount?: number;
  messages?: GhostRequestMessage[];
}

interface ProviderTextResponse {
  text: string;
  provider: "gemini-primary" | "openrouter-deepseek" | "local";
}

// ── Model constants ──────────────────────────────────────────────────────────
// Primary: Gemini 2.5 Pro Exp via OpenRouter
const OPENROUTER_PRIMARY_MODEL = "google/gemini-2.5-pro-exp";

// Fallback: DeepSeek-R1 via OpenRouter (Prompt Pack spec)
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-r1";

function detectFirstMessageLanguage(text: string): "hindi" | "english" | "hinglish" {
  const textLower = text.toLowerCase();
  
  // Devanagari script check
  const HINDI_REGEX = /[\u0900-\u097F]/;
  const hindiCharCount = (text.match(HINDI_REGEX) || []).length;
  if (hindiCharCount > 0 && hindiCharCount / text.length > 0.15) {
    return "hindi";
  }

  // Hinglish markers
  const HINGLISH_MARKERS = [
    "kya", "bhai", "nahi", "karna", "hai", "haan", "acha",
    "yaar", "matlab", "kaise", "kyun", "mujhe", "toh",
    "abhi", "bahut", "theek", "sahi", "bro", "kar",
    "bol", "chal", "dekh", "samajh", "pata", "wala",
    "mein", "ka", "ki", "ke", "se", "par", "pe",
    "kuch", "aur", "lekin", "phir", "jab", "tab",
    "agar", "isliye", "woh", "yeh", "mere", "tera",
    "uska", "apna", "sab", "log", "banda", "scene",
    "jugaad", "chalta", "funda", "fundoo", "bakwas",
    "bilkul", "accha", "raha", "rahi", "hota", "hoti",
    "karo", "karta", "karti", "lena", "dena", "jana",
    "aana", "rehna", "lagta", "lagti", "bata", "bolo",
  ];

  const words = textLower.split(/\s+/);
  let hinglishMatches = 0;
  for (const w of words) {
    const cleanWord = w.replace(/[^a-z]/g, "");
    if (HINGLISH_MARKERS.includes(cleanWord)) {
      hinglishMatches++;
    }
  }

  if (hinglishMatches > 0 || (words.length > 0 && hinglishMatches / words.length > 0.1)) {
    return "hinglish";
  }

  return "english";
}

function buildAboutMeResponse(profile?: FutureSelfMemoryProfile): string {
  const fallbackMsg = `Tu planning mein rehta hai. 
Implementation se bhaagta hai.
MVP banata hai, deploy nahi karta.
Ye sab pata hai kyunki mai tu tha. Bas 10 saal aage.`;

  if (!profile) return fallbackMsg;

  const identity = profile.identity;
  const continuity = profile.psychologicalContinuity;

  const lines: string[] = [];

  // 1. Core Fear / Decision Loop
  if (identity?.decisionPattern && identity.decisionPattern !== "still being learned") {
    lines.push(`Tu ${identity.decisionPattern.toLowerCase()} mein rehta hai.`);
  } else if (continuity?.behavioralLoops && continuity.behavioralLoops.length > 0) {
    const firstLoop = continuity.behavioralLoops[0].replace(/\.$/, "");
    lines.push(`Tu ${firstLoop.toLowerCase()} mein rehta hai.`);
  } else {
    lines.push("Tu planning mein rehta hai.");
  }

  // 2. Struggle / Core Avoidance
  if (profile.identity?.coreFear && profile.identity.coreFear !== "not enough emotional history yet") {
    lines.push(`Darr lagta hai ki ${profile.identity.coreFear.toLowerCase()}.`);
  } else if (continuity?.recurringFears && continuity.recurringFears.length > 0) {
    const firstFear = continuity.recurringFears[0].replace(/\.$/, "");
    lines.push(`Avoid karta hai kyunki darr hai ki ${firstFear.toLowerCase()}.`);
  } else {
    lines.push("Implementation se bhaagta hai.");
  }

  // 3. Behavioral Loop / Pattern
  if (continuity?.behavioralLoops && continuity.behavioralLoops.length > 1) {
    const secondLoop = continuity.behavioralLoops[1].replace(/\.$/, "");
    lines.push(`${secondLoop}.`);
  } else {
    lines.push("MVP banata hai, deploy nahi karta.");
  }

  // 4. EEvolution/Discipline or fallback
  if (continuity?.growthPatterns && continuity.growthPatterns.length > 0) {
    const growth = continuity.growthPatterns[0].replace(/\.$/, "");
    lines.push(`Kabhi try karta hai ${growth.toLowerCase()}, par consistency nahi.`);
  } else {
    lines.push("Fitness bhi start karta hai, consistency nahi.");
  }

  // 5. Ghost Mentor Signature End
  lines.push("Ye sab pata hai kyunki mai tu tha. Bas 10 saal aage.");

  return lines.slice(0, 5).join("\n");
}

async function callFutureProjectionConversational(profile?: FutureSelfMemoryProfile): Promise<string> {
  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) throw new Error("No OpenRouter key configured.");

  const prompt = `Based on this personality profile: ${JSON.stringify(profile)}

Speak as the user's future self.
Project their future in 3 short paragraphs. Hinglish.

Paragraph 1 — 6 months if nothing changes:
Reference their specific loops. Honest. Not harsh.

Paragraph 2 — 2 years if one shift is made:
Name the exact shift. What changes because of it.

Paragraph 3 — 5 years highest version:
Who they become. What it costs. Be honest not motivational.

Rules:
- Hinglish only
- 3-4 sentences per paragraph max
- No bullet points. No headers.
- Reference specific patterns from profile
- Sound like someone who watched this play out already`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://ghost-mentor-ai.vercel.app",
    },
    body: JSON.stringify({
      model: OPENROUTER_PRIMARY_MODEL,
      messages: [
        {
          role: "system",
          content: "You are Ghost Mentor, speaking to your present-self. You are raw, honest, and speak from ten years ahead.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.75,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter Future Projection Error: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Empty response from OpenRouter Future Projection.");
  }

  return text.trim();
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<GhostRequest>;

  if (!body.user || !body.message) {
    return NextResponse.json({ error: "Missing user or message." }, { status: 400 });
  }

  const payload: GhostRequest = {
    user: body.user,
    message: body.message,
    historyCount: body.historyCount ?? 0,
    memoryProfile: body.memoryProfile,
    languageProfile: body.languageProfile,
    confusionCount: body.confusionCount ?? 0,
    messages: body.messages,
  };

  // ── Detect confusion level ────────────────────────────────────────────────
  const currentIsConfusion = isConfusionMessage(payload.message);
  const confusionLevel = getConfusionLevel(
    payload.confusionCount ?? 0,
    currentIsConfusion
  );

  // ── Generate local fallback (always ready) ────────────────────────────────
  const fallback = await generateGhostResponse(
    payload.user,
    payload.message,
    payload.historyCount,
    payload.memoryProfile
  );

  // ── Fetch last session summary from Supabase ──────────────────────────────
  let chatSummary = "";
  if (
    payload.user.id &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const { data } = await supabase
        .from("user_profiles")
        .select("chat_summary, last_session_summary")
        .eq("user_id", payload.user.id)
        .single();
      if (data?.chat_summary) {
        chatSummary = data.chat_summary;
      } else if (data?.last_session_summary) {
        chatSummary = data.last_session_summary; // backward compat
      }
    } catch {
      // Supabase unavailable — continue without session memory
    }
  }

  // ── Language Auto-Detection ───────────────────────────────────────────────
  let currentLangProfile = payload.languageProfile;
  const detectedLang = detectFirstMessageLanguage(payload.message);

  if (!currentLangProfile || !currentLangProfile.dominantLanguage) {
    currentLangProfile = {
      dominantLanguage: detectedLang,
      sentenceLength: "medium",
      formality: "casual",
      commonSlang: [],
      frustrationStyle: "still being learned",
      excitementStyle: "still being learned",
    };
  } else {
    const currentDominant = currentLangProfile.dominantLanguage;
    if (detectedLang !== currentDominant) {
      currentLangProfile = {
        ...currentLangProfile,
        dominantLanguage: detectedLang,
      };
    }
  }

  payload.languageProfile = currentLangProfile;

  // ── Detect Brutal Honesty Mode Triggers ───────────────────────────────────
  const brutalTriggers = [
    /i'?ll\s+do\s+it\s+later/i,
    /i\s+will\s+do\s+it\s+later/i,
    /kal\s+karunga/i,
    /kal\s+se/i,
    /baad\s+mein/i,
    /\bmaybe\b/i,
    /\bshayad\b/i,
    /sochta\s+hoon/i,
    /i'?m\s+not\s+sure/i,
    /pata\s+nahi/i,
    /confused\s+hoon/i,
    /i'?m\s+tired/i,
    /thak\s+gaya/i,
    /it'?s\s+complicated/i,
    /mushkil\s+hai/i,
    /tomorrow/i,
    /^\s*(but|lekin|par)\b/i,
  ];

  let isRepeatingMsg = false;
  if (payload.messages && payload.messages.length > 0) {
    const userMsgs = payload.messages.filter((m) => m.role === "user");
    const currentTextClean = payload.message.trim().toLowerCase().replace(/[?.!]/g, "");
    if (currentTextClean.length > 3) {
      const matchesCount = userMsgs.filter((m) => {
        const textClean = (m.text || "").trim().toLowerCase().replace(/[?.!]/g, "");
        return textClean === currentTextClean;
      }).length;
      if (matchesCount >= 1) {
        isRepeatingMsg = true;
      }
    }
  }

  const isBrutalMode = brutalTriggers.some((pattern) => pattern.test(payload.message)) || isRepeatingMsg;

  // ── Build system prompt ───────────────────────────────────────────────────
  let systemPrompt = MODEL_PIPELINE.buildSystemPrompt(
    payload.user,
    payload.memoryProfile ?? fallback.updatedMemoryProfile,
    payload.languageProfile,
    chatSummary,
    confusionLevel,
    isBrutalMode
  );

  const isDoubleConfusion = currentIsConfusion && (payload.confusionCount ?? 0) >= 1;
  if (isDoubleConfusion) {
    systemPrompt += `\nDOUBLE CONFUSION — one sentence only.\nAsk: 'Is yeh wala version better samjha?'`;
  }

  // ── Intercept "What do you know about me" patterns ────────────────────────
  const knowMePatterns = [
    /what do you know about me/i,
    /mera kya pata hai/i,
    /tu mujhe jaanta hai/i,
    /tell me what you know/i,
    /abt me/i,
    /about me/i,
  ];

  const isKnowMeTrigger = knowMePatterns.some((pattern) => pattern.test(payload.message));

  if (isKnowMeTrigger) {
    const text = buildAboutMeResponse(payload.memoryProfile || fallback.updatedMemoryProfile);
    console.log("MODEL RESPONSE (Intercepted - Know Me):", text);
    return NextResponse.json({
      ...fallback,
      text,
      insightCard: null,
      futureProjection: null,
      confusionDetected: false,
      providerTrace: ["local"],
      languageProfile: currentLangProfile,
    });
  }

  // ── Intercept future projection trigger ────────────────────────────────────
  const futurePatterns = [
    /project my future/i,
    /mera future/i,
    /future kya hoga/i,
    /future dikhao/i,
    /what.?s my future/i,
    /future projection/i,
    /mujhe future batao/i,
  ];

  const isFutureProjectionTrigger = futurePatterns.some((pattern) => pattern.test(payload.message));

  if (isFutureProjectionTrigger) {
    try {
      const text = await callFutureProjectionConversational(payload.memoryProfile || fallback.updatedMemoryProfile);
      console.log("MODEL RESPONSE (Intercepted - Future Projection):", text);
      return NextResponse.json({
        ...fallback,
        text,
        insightCard: null,
        futureProjection: null,
        confusionDetected: false,
        providerTrace: ["gemini-primary"],
        languageProfile: currentLangProfile,
      });
    } catch (err) {
      console.error("Future projection intercept failed:", err);
    }
  }

  console.log("USER MESSAGE:", payload.message);
  console.log("CALLING MODEL...");

  // ── Primary: Gemini 2.5 Pro Exp via OpenRouter ────────────────────────────
  try {
    const geminiResult = await callOpenRouterPrimary(payload, systemPrompt);
    console.log("MODEL RESPONSE (Gemini Primary via OpenRouter):", geminiResult.text);
    return NextResponse.json({
      ...fallback,
      text: geminiResult.text,
      insightCard: null,
      futureProjection: null,
      confusionDetected: currentIsConfusion,
      providerTrace: [geminiResult.provider],
      languageProfile: currentLangProfile,
    });
  } catch (primaryError) {
    console.warn("OpenRouter Gemini primary failed, trying OpenRouter DeepSeek fallback…", primaryError);
  }

  // ── Fallback: DeepSeek-R1-Free via OpenRouter ─────────────────────────────
  try {
    const deepseekResult = await callOpenRouterDeepSeek(payload, systemPrompt);
    console.log("MODEL RESPONSE (OpenRouter):", deepseekResult.text);
    return NextResponse.json({
      ...fallback,
      text: deepseekResult.text,
      insightCard: null,
      futureProjection: null,
      confusionDetected: currentIsConfusion,
      providerTrace: [deepseekResult.provider],
      languageProfile: currentLangProfile,
    });
  } catch (fallbackError) {
    console.error("OpenRouter fallback also failed, using local static template.", fallbackError);
  }

  // ── Last resort: local static template ───────────────────────────────────
  console.log("MODEL RESPONSE (Local Fallback):", fallback.text);
  return NextResponse.json({
    ...fallback,
    insightCard: null,
    futureProjection: null,
    confusionDetected: currentIsConfusion,
    providerTrace: ["local"],
    languageProfile: currentLangProfile,
  });
}

function cleanMessageHistory(messages: GhostRequestMessage[], currentMessage: string) {
  if (!messages || messages.length === 0) {
    return [{ role: "user", content: currentMessage }];
  }

  // 1. Map roles to user/assistant, drop empty text
  const mapped = messages
    .map((m) => ({
      role: m.role === "ghost" ? "assistant" as const : "user" as const,
      content: m.text ? m.text.trim() : "",
    }))
    .filter((m) => m.content !== "");

  // 2. Filter out leading assistant messages (some APIs prefer starting with user)
  const firstUserIdx = mapped.findIndex((m) => m.role === "user");
  if (firstUserIdx === -1) {
    return [{ role: "user", content: currentMessage }];
  }
  const sliced = mapped.slice(firstUserIdx);

  // 3. Merge consecutive messages with the same role
  const alternating: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of sliced) {
    if (alternating.length === 0) {
      alternating.push({ role: m.role, content: m.content });
    } else {
      const last = alternating[alternating.length - 1];
      if (last.role === m.role) {
        last.content += "\n" + m.content;
      } else {
        alternating.push({ role: m.role, content: m.content });
      }
    }
  }

  // 4. Ensure the last message is from user and contains/ends with currentMessage
  const last = alternating[alternating.length - 1];
  if (!last || last.role !== "user") {
    alternating.push({ role: "user", content: currentMessage });
  } else {
    if (last.content !== currentMessage && !last.content.endsWith(currentMessage)) {
      alternating.push({ role: "user", content: currentMessage });
    }
  }

  return alternating;
}

// ── Primary: Gemini 2.5 Pro Exp via OpenRouter ─────────────────────────────
async function callOpenRouterPrimary(
  payload: GhostRequest,
  systemPrompt: string
): Promise<ProviderTextResponse> {
  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) throw new Error("No OpenRouter key configured.");

  const conversationHistory = cleanMessageHistory(payload.messages ?? [], payload.message);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://ghost-mentor-ai.vercel.app",
    },
    body: JSON.stringify({
      model: OPENROUTER_PRIMARY_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
      ],
      max_tokens: 300,
      temperature: 0.85,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter Gemini Primary error: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Empty response from OpenRouter Gemini Primary.");
  }

  return { text: text.trim(), provider: "gemini-primary" };
}

// ── DeepSeek-R1-Free via OpenRouter ─────────────────────────────────────────
async function callOpenRouterDeepSeek(
  payload: GhostRequest,
  systemPrompt: string
): Promise<ProviderTextResponse> {
  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) throw new Error("No OpenRouter key configured.");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://ghost-mentor.ai",
      "X-Title": "Ghost Mentor AI",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: payload.message },
      ],
      max_tokens: 650,
      temperature: 0.75,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter DeepSeek error: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Empty response from OpenRouter DeepSeek.");
  }

  return { text: text.trim(), provider: "openrouter-deepseek" };
}
