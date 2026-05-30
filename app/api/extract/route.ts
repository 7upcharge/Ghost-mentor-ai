import { NextResponse } from "next/server";

const OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct";

// ── Prompt 3 — exact JSON profile structure ──────────────────────────────────
const SYSTEM_PROMPT = `
You are an expert psychological profiler for an AI future-self mentor system.
Your task is to analyze the provided chat history or user context and extract a deep psychological profile.
Output ONLY raw JSON matching this exact structure. No markdown. No explanations.

{
  "userName": "string — user's name if found, else fallback to user param or 'you'",
  "userAspiration": "string — their main ambition",
  "userStruggle": "string — their main current struggle",
  "identity": {
    "ambition": "unknown" | "emerging" | "high",
    "coreFear": "string — deepest underlying fear",
    "decisionPattern": "string — how they make or avoid decisions",
    "emotionalStyle": "string — e.g. reflective and analytical, intense and scattered"
  },
  "communicationStyle": {
    "tone": "string — e.g. direct action-oriented, vulnerable and searching",
    "sentenceRhythm": "string — e.g. short fast iterative, layered explanatory",
    "vocabulary": "string — e.g. startup-minded, emotionally expressive"
  },
  "futureSelfEvolution": {
    "confidence": "unknown" | "fragile" | "improving" | "grounded",
    "discipline": "unknown" | "developing" | "consistent",
    "emotionalClarity": "unknown" | "emerging" | "high"
  },
  "psychologicalContinuity": {
    "recurringThemes": ["string — 3-4 recurring topics or themes"],
    "recurringFears": ["string — 2-3 specific repeated fears"],
    "behavioralLoops": ["string — 2-3 specific behavioral loops"],
    "growthPatterns": ["string — 2-3 ways they learn or improve"],
    "messageCount": 1,
    "lastUpdatedAt": 0
  },
  "smartQuestions": [
    "string — 2-3 questions about topics user AVOIDED. Focus on emotional gaps, abandoned projects, unresolved relationships, avoided commitments."
  ],
  "languageMirror": {
    "primaryLanguage": "hindi" | "english" | "hinglish",
    "slangTerms": ["string — specific slang or filler words they use frequently"],
    "sentenceStyle": "string — short and clipped, or long and explanatory, or mixed",
    "emotionalExpressionPattern": "string — how they show frustration, excitement, doubt"
  }
}

CRITICAL RULES:
- smartQuestions must ask what the user AVOIDED, not what they discussed.
- If text shows lots of productivity talk but no personal life → ask about relationships.
- If text shows ambition but no failure → ask about things they abandoned.
- If text shows fast execution always → ask when they last slowed down.
- languageMirror must detect ACTUAL language patterns. If they mix Hindi and English, set primaryLanguage to "hinglish".
- If the input is a structured JSON profile (containing keys like core_fears, coreFears, biggest_ambitions, avoidance_patterns), translate its contents directly into this schema preserving exact wording.
`.trim();

export async function POST(request: Request) {
  try {
    const { text, user, platform } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided for extraction." }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No OpenRouter API key configured." }, { status: 500 });
    }

    const userContext = user
      ? `User Name: ${user.name || "unknown"}\nAspiration: ${user.aspiration || "unknown"}\nCurrent Struggle: ${user.currentStruggle || "unknown"}\n\n`
      : "";

    // Platform hint for specialized extraction behavior
    const platformHint = platform
      ? `\nSource platform: ${platform}. Adapt extraction accordingly.\n`
      : "";

    const userPrompt = `${userContext}${platformHint}Extract a complete psychological profile with smart questions and language analysis from the following conversations:\n\n${text}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://ghost-mentor-ai.vercel.app",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter Extraction Error: ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    const resultText = data?.choices?.[0]?.message?.content;
    if (!resultText) {
      throw new Error("Empty response from OpenRouter Extraction.");
    }

    const profile = JSON.parse(resultText);

    // Safety fallbacks
    if (profile.psychologicalContinuity) {
      profile.psychologicalContinuity.messageCount = 1;
      profile.psychologicalContinuity.lastUpdatedAt = Date.now();
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Extraction Error:", error);
    return NextResponse.json({ error: "Failed to extract memory profile." }, { status: 500 });
  }
}
