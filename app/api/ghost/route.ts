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

interface GhostRequest {
  user: UserProfile;
  message: string;
  historyCount: number;
  memoryProfile?: FutureSelfMemoryProfile;
  languageProfile?: LanguageProfileState;
  /** Number of consecutive confusion messages the user has sent */
  confusionCount?: number;
  messages?: any[];
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

  // ── Build system prompt ───────────────────────────────────────────────────
  const systemPrompt = MODEL_PIPELINE.buildSystemPrompt(
    payload.user,
    payload.memoryProfile ?? fallback.updatedMemoryProfile,
    payload.languageProfile,
    chatSummary,
    confusionLevel
  );

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
    });
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
  });
}

function cleanMessageHistory(messages: any[], currentMessage: string) {
  if (!messages || messages.length === 0) {
    return [{ role: "user", content: currentMessage }];
  }

  // 1. Map roles to user/assistant, drop empty text
  const mapped = messages
    .map((m: any) => ({
      role: m.role === "ghost" ? "assistant" as const : "user" as const,
      content: m.text ? m.text.trim() : "",
    }))
    .filter((m: any) => m.content !== "");

  // 2. Filter out leading assistant messages (some APIs prefer starting with user)
  let firstUserIdx = mapped.findIndex((m: any) => m.role === "user");
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
