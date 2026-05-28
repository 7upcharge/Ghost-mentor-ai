import { NextResponse } from "next/server";
import { FutureSelfMemoryProfile } from "@/lib/appState";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

const SYSTEM_PROMPT = `
You are an expert psychological profiler for an AI future-self mentor system.
Your task is to analyze the provided chat history or user context and extract a deep psychological profile.
You must output ONLY raw JSON that strictly matches the following TypeScript interface structure.
No markdown wrappers, no explanations.

interface FutureSelfMemoryProfile {
  identity: {
    ambition: "unknown" | "emerging" | "high";
    coreFear: string; // The user's deepest underlying fear based on their messages
    decisionPattern: string; // How they typically make decisions or get stuck
    emotionalStyle: string; // E.g., "reflective and analytical" or "intense and scattered"
  };
  communicationStyle: {
    tone: string; // E.g., "direct, action-oriented", "vulnerable and searching"
    sentenceRhythm: string; // E.g., "short, fast, iterative" or "layered, explanatory"
    vocabulary: string; // E.g., "startup-minded", "emotionally expressive"
  };
  futureSelfEvolution: {
    confidence: "unknown" | "fragile" | "improving" | "grounded";
    discipline: "unknown" | "developing" | "consistent";
    emotionalClarity: "unknown" | "emerging" | "high";
  };
  psychologicalContinuity: {
    recurringThemes: string[]; // 3-4 recurring topics or themes in their life
    recurringFears: string[]; // 2-3 specific repeated fears
    behavioralLoops: string[]; // 2-3 specific behavioral loops (e.g., "intense bursts of momentum followed by burnout")
    growthPatterns: string[]; // 2-3 ways they learn or improve (e.g., "learns best by doing instead of reading")
    messageCount: number; // Always set this to 1 initially
    lastUpdatedAt: number; // Leave this as 0 (the client will set the real timestamp)
  };
}
`.trim();

export async function POST(request: Request) {
  try {
    const { text, user } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided for extraction." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No Gemini API key configured." }, { status: 500 });
    }

    const userContext = user
      ? `User Name: ${user.name}\nAspiration: ${user.aspiration}\nCurrent Struggle: ${user.currentStruggle}\n\n`
      : "";

    const userPrompt = `${userContext}Extract a FutureSelfMemoryProfile from the following text:\n\n${text}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini Extraction Error:", errorText);
      throw new Error("Failed to extract memory profile from LLM.");
    }

    const data = await response.json();
    const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      throw new Error("Empty response from LLM.");
    }

    const profile: FutureSelfMemoryProfile = JSON.parse(resultText);
    
    // Safety fallback for messageCount
    profile.psychologicalContinuity.messageCount = 1;
    profile.psychologicalContinuity.lastUpdatedAt = Date.now();

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Extraction Error:", error);
    return NextResponse.json({ error: "Failed to extract memory profile." }, { status: 500 });
  }
}
