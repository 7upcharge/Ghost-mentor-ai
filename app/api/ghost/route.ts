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
// Primary: Gemini 2.5 Pro via Google AI Studio key (Prompt Pack spec)
const GEMINI_PRIMARY_MODEL = "gemini-2.5-pro";

// Fallback: DeepSeek-R1 via OpenRouter (Prompt Pack spec)
const OPENROUTER_MODEL = "deepseek/deepseek-r1";

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

  console.log("USER MESSAGE:", payload.message);
  console.log("CALLING MODEL...");

  // ── Primary: Gemini 2.5 Pro via Google AI Studio ──────────────────────────
  try {
    const geminiResult = await callGeminiPrimary(payload, systemPrompt);
    console.log("MODEL RESPONSE (Gemini):", geminiResult.text);
    return NextResponse.json({
      ...fallback,
      text: geminiResult.text,
      insightCard: null,
      futureProjection: null,
      confusionDetected: currentIsConfusion,
      providerTrace: [geminiResult.provider],
    });
  } catch (primaryError) {
    console.warn("Gemini primary failed, trying OpenRouter DeepSeek fallback…", primaryError);
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
    return [{ role: "user", parts: [{ text: currentMessage }] }];
  }

  // 1. Map roles to user/model, drop empty text
  const mapped = messages
    .map((m: any) => ({
      role: m.role === "ghost" ? "model" : "user",
      text: m.text ? m.text.trim() : ""
    }))
    .filter((m: any) => m.text !== "");

  // 2. Filter out leading model messages (Gemini requires first message to be user)
  let firstUserIdx = mapped.findIndex((m: any) => m.role === "user");
  if (firstUserIdx === -1) {
    return [{ role: "user", parts: [{ text: currentMessage }] }];
  }
  const sliced = mapped.slice(firstUserIdx);

  // 3. Merge consecutive messages with the same role
  const alternating: any[] = [];
  for (const m of sliced) {
    if (alternating.length === 0) {
      alternating.push({ role: m.role, parts: [{ text: m.text }] });
    } else {
      const last = alternating[alternating.length - 1];
      if (last.role === m.role) {
        last.parts[0].text += "\n" + m.text;
      } else {
        alternating.push({ role: m.role, parts: [{ text: m.text }] });
      }
    }
  }

  return alternating;
}

// ── Gemini 2.5 Pro via Google AI Studio ─────────────────────────────────────
async function callGeminiPrimary(
  payload: GhostRequest,
  systemPrompt: string
): Promise<ProviderTextResponse> {
  // Support both key names from .env.local
  const apiKey =
    process.env.GOOGLE_AI_STUDIO_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) throw new Error("No Google AI Studio key configured.");

  const runWithModel = async (model: string) => {
    const contents = cleanMessageHistory(payload.messages ?? [], payload.message);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          system_instruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.75,
            maxOutputTokens: 650,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini ${model} error: ${err.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string" || !text.trim()) {
      throw new Error(`Empty response from Gemini ${model}.`);
    }
    return text.trim();
  };

  try {
    const text = await runWithModel(GEMINI_PRIMARY_MODEL);
    return { text, provider: "gemini-primary" };
  } catch (err) {
    console.warn(`Failed to call ${GEMINI_PRIMARY_MODEL}, trying gemini-2.5-flash fallback...`, err);
    try {
      const text = await runWithModel("gemini-2.5-flash");
      return { text, provider: "gemini-primary" };
    } catch (fallbackErr) {
      throw new Error(`Gemini primary failed. Pro error: ${(err as Error).message}. Flash error: ${(fallbackErr as Error).message}`);
    }
  }
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
