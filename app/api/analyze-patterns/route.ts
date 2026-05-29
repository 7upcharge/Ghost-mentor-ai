import { NextResponse } from "next/server";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SYSTEM_PROMPT = `
You are a ruthlessly specific psychological pattern analyzer.
You analyze raw conversation text and extract a detailed personality profile.
Do NOT give compliments. Do NOT be generic. Do NOT be encouraging.
Be precise. Be clinical. Be specific to exactly what appears in the text.
Output ONLY raw JSON — no markdown, no explanations, no wrappers.

You must output exactly this structure:

{
  "coreFears": [
    // 2-4 strings. Specific, named fears (not generic "fear of failure"). 
    // Examples: "being forgotten before achieving something that proves they mattered",
    //           "committing to a path and discovering they chose wrong"
  ],
  "biggestAmbitions": [
    // 2-4 strings. Repeated desires extracted from the text.
    // What they keep circling back to wanting — name it precisely.
  ],
  "avoidancePatterns": [
    // 2-4 strings. Things they circle around but never commit to.
    // Name the avoidance, not the thing avoided.
    // Example: "plans exhaustively to avoid starting", "asks for perspectives to delay deciding"
  ],
  "communicationStyle": {
    "confusionExpression": "How they express confusion — specific phrases, structures, or patterns visible in the text",
    "excitementExpression": "How they express excitement — pace, punctuation, word choice",
    "doubtExpression": "How they express doubt — hedging language, self-interruptions, etc.",
    "overallTone": "A sharp 1-sentence characterization of their general communication register"
  },
  "recurringStruggles": [
    // 2-4 strings. Same problem appearing in different forms across the conversation.
    // Describe the pattern, not just the surface-level complaint.
  ],
  "selfTalkPatterns": [
    // 2-4 strings. How they speak about themselves. 
    // Direct quotes or paraphrased self-descriptions. What lens they apply to themselves.
  ],
  "unstatedValues": [
    // 2-4 strings. What they value most, even if never said directly.
    // Inferred from what makes them angry, excited, or avoidant.
  ],
  "analysisNote": "A single sentence noting the quality, limitations, or key caveats of this analysis given the provided text. Be honest about what you cannot determine."
}
`.trim();

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Not enough text to analyze. Paste at least a few messages." },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GOOGLE_AI_STUDIO_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "No Gemini API key configured." },
        { status: 500 }
      );
    }

    const userPrompt = `Analyze the following conversation and extract a psychological pattern profile:\n\n${text.slice(0, 24000)}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini Pattern Analysis Error:", errorText);
      throw new Error("Failed to analyze patterns from LLM.");
    }

    const data = await response.json();
    const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      throw new Error("Empty response from LLM.");
    }

    const profile = JSON.parse(resultText);
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Pattern Analysis Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze patterns." },
      { status: 500 }
    );
  }
}
