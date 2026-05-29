import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const GEMINI_MODEL = "gemini-2.5-pro";

// ── Prompt 7 — Future Projection System Prompt ───────────────────────────────
const SYSTEM_PROMPT = `
You are a psychological timeline predictor for a future-self AI mentor.
Analyze the chat log and generate a 3-stage future projection.
Output ONLY raw JSON. No markdown. No explanations.

{
  "sixMonths": {
    "ifPatternsHold": "string — one specific consequence of continuing the current avoidance loop or fear, in 6 months",
    "warning": "string — the subtle thing the user won't notice until it's too late, in 6 months",
    "ifOneShiftMade": "string — what concretely changes if the user interrupts their main loop, in 6 months",
    "whatThatShiftIs": "string — the ONE specific shift they need to make, described plainly",
    "highestVersion": "string — who this person becomes at their highest potential in 6 months if they act now",
    "whatItCosts": "string — what acting now will cost them (honesty about the price)"
  },
  "twoYears": {
    "ifPatternsHold": "string — mid-term consequence of inaction",
    "warning": "string — what silently calcifies if nothing changes in 2 years",
    "ifOneShiftMade": "string — mid-term growth milestone if the shift is made",
    "whatThatShiftIs": "string — the evolving form of that same core shift at 2 years",
    "highestVersion": "string — who they become at highest potential in 2 years",
    "whatItCosts": "string — what maintaining that shift requires at 2 years"
  },
  "fiveYears": {
    "ifPatternsHold": "string — long-term regret or static outcome in 5 years",
    "warning": "string — the moment they will look back at and realize was the turning point",
    "ifOneShiftMade": "string — long-term actualization of their core aspirations in 5 years",
    "whatThatShiftIs": "string — what the shift has become by 5 years",
    "highestVersion": "string — full articulation of their highest-potential self in 5 years",
    "whatItCosts": "string — what the 5-year journey costs"
  }
}

CRITICAL RULES:
- All strings must be personalized to THIS user's specific fears, behaviors, and aspirations mentioned in the chat.
- No generic statements. No corporate language. No buzzwords.
- Emotionally resonant, punchy, and honest.
- The final "highestVersion" in fiveYears should feel like a destination worth fighting for.
`.trim();

export async function POST(request: Request) {
  try {
    const { userId, messages } = await request.json();

    if (!userId || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Missing userId or messages array." }, { status: 400 });
    }

    const apiKey =
      process.env.GOOGLE_AI_STUDIO_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "No Gemini API key configured." }, { status: 500 });
    }

    const chatLog = messages
      .map((m: { role: string; text: string }) => {
        const name = m.role === "ghost" ? "Future Self" : "Present Self";
        return `${name}: ${m.text}`;
      })
      .join("\n\n");

    const runWithModel = async (model: string) => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: chatLog }] }],
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            generationConfig: {
              temperature: 0.3,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini Future Projection Error for ${model}: ${errorText.slice(0, 200)}`);
      }

      const data = await response.json();
      const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!resultText) {
        throw new Error(`Empty response from Gemini for ${model}.`);
      }
      return resultText;
    };

    let resultText = "";
    try {
      resultText = await runWithModel(GEMINI_MODEL);
    } catch (err) {
      console.warn(`Future projection failed with ${GEMINI_MODEL}, trying gemini-2.5-flash fallback...`, err);
      try {
        resultText = await runWithModel("gemini-2.5-flash");
      } catch (fallbackErr) {
        throw new Error(`Future projection failed. Pro error: ${(err as Error).message}. Flash error: ${(fallbackErr as Error).message}`);
      }
    }

    const projections = JSON.parse(resultText);

    // Save to Supabase
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      const { error } = await supabase
        .from("user_profiles")
        .upsert(
          {
            user_id: userId,
            future_projections: projections,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("Failed to save future projections to Supabase:", error);
      }
    }

    return NextResponse.json(projections);
  } catch (error) {
    console.error("Future Projection Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
