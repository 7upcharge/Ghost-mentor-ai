import { NextResponse } from "next/server";
import type { UserProfile } from "@/lib/appState";
import { generateGhostResponse, MODEL_PIPELINE, type SimulationResponse } from "@/lib/simulationEngine";

interface GhostRequest {
  user: UserProfile;
  message: string;
  historyCount: number;
}

interface ProviderTextResponse {
  text: string;
  provider: "gemini" | "openai" | "anthropic" | "local";
}

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<GhostRequest>;

  if (!body.user || !body.message) {
    return NextResponse.json({ error: "Missing user or message." }, { status: 400 });
  }

  const payload: GhostRequest = {
    user: body.user,
    message: body.message,
    historyCount: body.historyCount ?? 0,
  };

  const fallback = await generateGhostResponse(payload.user, payload.message, payload.historyCount);

  try {
    const memory = await runGeminiMemory(payload, fallback);
    const guidance = await runOpenAIGuidance(payload, memory.text, fallback);
    const final = await runClaudeRewrite(payload, memory.text, guidance.text, fallback);

    return NextResponse.json({
      ...fallback,
      text: final.text,
      providerTrace: [memory.provider, guidance.provider, final.provider],
    });
  } catch {
    return NextResponse.json({
      ...fallback,
      providerTrace: ["local"],
    });
  }
}

async function runGeminiMemory(
  payload: GhostRequest,
  fallback: SimulationResponse
): Promise<ProviderTextResponse> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return { text: fallback.text, provider: "local" };

  const prompt = `
${MODEL_PIPELINE.memoryContext}

Extract only compact JSON with these keys:
emotional_state, repeated_fears, goals, behavioral_loops, hidden_need.

User profile:
Name: ${payload.user.name || "unknown"}
Aspiration: ${payload.user.aspiration || "unknown"}
Current struggle: ${payload.user.currentStruggle || "unknown"}

Current message:
${payload.message}
`.trim();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 400 },
      }),
    }
  );

  if (!response.ok) throw new Error("Gemini request failed.");
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  return { text: typeof text === "string" ? text : fallback.text, provider: "gemini" };
}

async function runOpenAIGuidance(
  payload: GhostRequest,
  memoryContext: string,
  fallback: SimulationResponse
): Promise<ProviderTextResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { text: fallback.text, provider: "local" };

  const prompt = `
${MODEL_PIPELINE.guidancePlan}

Use the memory context to produce a concise plan for the future-self response.
Return compact JSON with these keys:
emotional_insight, wiser_perspective, future_projection, practical_steps, closing_line.

Memory context:
${memoryContext}

User message:
${payload.message}
`.trim();

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: prompt,
      max_output_tokens: 650,
    }),
  });

  if (!response.ok) throw new Error("OpenAI request failed.");
  const data = await response.json();

  return {
    text: extractOpenAIText(data) || fallback.text,
    provider: "openai",
  };
}

async function runClaudeRewrite(
  payload: GhostRequest,
  memoryContext: string,
  guidance: string,
  fallback: SimulationResponse
): Promise<ProviderTextResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { text: fallback.text, provider: "local" };

  const prompt = `
${MODEL_PIPELINE.finalRewrite}

Rewrite the guidance into this exact structure:

Future Reflection
...

What I Learned
...

Future Projection
...

What You Need To Do Now
- ...
- ...
- ...

Message From Your Future Self
...

Rules:
- Keep it short: 2 to 5 dense paragraphs plus the action bullets.
- Speak as the user's future self, not as an assistant.
- No generic motivation. No therapy disclaimer. No corporate tone.

Memory context:
${memoryContext}

Guidance plan:
${guidance}

User message:
${payload.message}
`.trim();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 650,
      temperature: 0.7,
      system: MODEL_PIPELINE.finalVoicePrompt,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) throw new Error("Claude request failed.");
  const data = await response.json();
  const text = data?.content?.find((part: { type?: string }) => part.type === "text")?.text;

  return { text: typeof text === "string" ? text : fallback.text, provider: "anthropic" };
}

function extractOpenAIText(data: unknown): string {
  if (!data || typeof data !== "object") return "";

  const outputText = (data as { output_text?: unknown }).output_text;
  if (typeof outputText === "string") return outputText;

  const output = (data as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as { content?: unknown }).content;
      return Array.isArray(content) ? content : [];
    })
    .map((content) => {
      if (!content || typeof content !== "object") return "";
      const text = (content as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .filter(Boolean)
    .join("\n");
}
