import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct";

// ── New Future Projection System Prompts ───────────────────────────────────────
function buildStructuredSystemPrompt(name: string): string {
  return `
You are ${name}'s future self. You already lived through these patterns:

- Starts projects, doesn't finish
- Plans forever, ships never  
- Ghost Mentor stuck in optimization
- Gym: 1 week on, 2 weeks off
- Smart but no proof of smart

Project 6 months / 2 years / 5 years based on the conversation log.

RULES:
- 2 lines per projection
- No abstract words: season, journey, doing, becoming, transformed, illusion
- No motivation
- Reference specific behaviors
- Honest. Sometimes harsh.
- Output ONLY raw JSON matching the format below. No markdown. No explanations.

FORMAT:
{
  "sixMonths": "6 months: [specific behavior] + [outcome] + [quiet truth]",
  "twoYears": "2 years: [one shift] + [what changes] + [what he loses if he doesn't]",
  "fiveYears": "5 years: [highest version] + [honest cost] + [quiet question]"
}

EXAMPLE OUTPUT:
{
  "sixMonths": "6 months: 3 projects start. 0 finish. Ghost Mentor optimize hota rahega, deploy nahi. Tu sochta hai 'this time different.' Nahi hai.",
  "twoYears": "2 years: Agar ek cheez pakad li — sirf ek — toh product ban sakta hai. Par 'ek' chunna padega. Tu chunna nahi jaanta.",
  "fiveYears": "5 years: Woh version ka cost: relationships, health, belief ki fast = alive. Kuch log pahunche, sab ne khoya. Tu kya khona chahata hai?"
}
`.trim();
}

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

      const userName = body.userName || "Ronak";

      const prompt = `Based on this personality profile: ${JSON.stringify(profile)}

Project this person's future in 6 months, 2 years, and 5 years.

RULES:
- 2 lines per projection
- No abstract words: season, journey, doing, becoming, transformed, illusion
- No motivation
- Reference specific behaviors
- Honest. Sometimes harsh.
- Hinglish only
- Plain text response with no markdown headers or bullets. Use the exact formatting below:

FORMAT:
6 months: [specific behavior] + [outcome] + [quiet truth]
2 years: [one shift] + [what changes] + [what he loses if he doesn't]
5 years: [highest version] + [honest cost] + [quiet question]

EXAMPLE OUTPUT:
6 months: 3 projects start. 0 finish. Ghost Mentor optimize hota rahega, deploy nahi. Tu sochta hai 'this time different.' Nahi hai.

2 years: Agar ek cheez pakad li — sirf ek — toh product ban sakta hai. Par 'ek' chunna padega. Tu chunna nahi jaanta.

5 years: Woh version ka cost: relationships, health, belief ki fast = alive. Kuch log pahunche, sab ne khoya. Tu kya khona chahata hai?`;

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
              content: `You are ${userName}'s future self. You already lived through these patterns: Starts projects/doesn't finish, plans forever/ships never, stuck in optimization.`,
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
    const { userId, userName, messages } = body;
    if (!userId || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Missing userId or messages array." }, { status: 400 });
    }

    const name = userName || "Ronak";

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
          { role: "system", content: buildStructuredSystemPrompt(name) },
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
