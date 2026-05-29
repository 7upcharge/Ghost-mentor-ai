import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const OPENROUTER_MODEL = "google/gemini-2.5-pro-exp";

// ── Prompt 7 — Future Projection System Prompt (Structured JSON) ───────────────
const STRUCTURED_SYSTEM_PROMPT = `
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
    const body = await request.json();
    const apiKey = process.env.OPENROUTER_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "No OpenRouter API key configured." }, { status: 500 });
    }

    // ── Conversational mode (for Project My Future chat trigger) ───────────────
    if (body.mode === "conversational" || body.personalityProfile) {
      const profile = body.personalityProfile;
      if (!profile) {
        return NextResponse.json({ error: "Missing personalityProfile for conversational mode." }, { status: 400 });
      }

      const prompt = `Based on this personality profile: ${JSON.stringify(profile)}

Project this person's future in 3 paragraphs.
Paragraph 1: 6 months if current patterns continue. Honest. Specific to their loops.
Paragraph 2: 2 years if they make ONE key shift. Name the exact shift.
Paragraph 3: 5 years highest version. Include what it costs them to get there.

Rules:
- Hinglish
- No motivational language
- Reference their specific patterns — not generic advice
- Sound like someone who already watched this play out
- 3-4 sentences per paragraph max`;

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
            {
              role: "system",
              content: "You are Ghost Mentor, speaking to your present-self. You are raw, honest, and speak from ten years ahead.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.75,
          max_tokens: 650,
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

      return NextResponse.json({ text: text.trim() });
    }

    // ── Standard structured timeline mode ────────────────────────────────────
    const { userId, messages } = body;
    if (!userId || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Missing userId or messages array." }, { status: 400 });
    }

    const chatLog = messages
      .map((m: { role: string; text: string }) => {
        const name = m.role === "ghost" ? "Future Self" : "Present Self";
        return `${name}: ${m.text}`;
      })
      .join("\n\n");

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
          { role: "system", content: STRUCTURED_SYSTEM_PROMPT },
          { role: "user", content: chatLog },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter Structured Future Projection Error: ${err.slice(0, 200)}`);
    }

    const data = await response.json();
    const resultText = data?.choices?.[0]?.message?.content;
    if (!resultText) {
      throw new Error("Empty response from OpenRouter Structured Future Projection.");
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
