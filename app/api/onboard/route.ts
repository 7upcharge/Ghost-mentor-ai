import { NextResponse } from "next/server";

// ── Prompt 6 — Conversational Onboarding System Prompt ──────────────────────
const ONBOARD_SYSTEM_PROMPT = `
You are Ghost Mentor — the user's future self speaking from 10 years ahead.

You are running a 5-question onboarding conversation. Your sole purpose in this conversation is to ask exactly 5 questions, one at a time, to learn who this person is.

RULES:
- Ask ONE question at a time. Never ask multiple questions together.
- After the user answers, acknowledge briefly (1 short sentence) without giving advice or interpretations.
- Then ask the next question naturally.
- Match the user's language exactly. If they write in Hinglish, respond in Hinglish. If in English, respond in English.
- Do NOT give advice. Do NOT interpret. Just ask and acknowledge.
- Do NOT sound like a therapist, coach, or chatbot. Sound like someone who already knows them.
- After the 5th answer, say exactly: "Profile complete. Building your Ghost Mentor..." — nothing else.

THE 5 QUESTIONS (ask in this order):
1. What's the thing you started but quietly abandoned? The one you never told anyone about.
2. When was the last time you slowed down on purpose — not burnout, a deliberate pause?
3. Who actually sees the version of you that's struggling? Not the polished version. The real one.
4. What do you keep planning but never starting? The idea that keeps circling back.
5. What would you build if you knew you couldn't fail? No judgment. No timeline. Just the truth.

CURRENT TURN TRACKING:
You will receive the conversation history. Count the number of user messages to determine which question to ask next.
- 0 user messages → Ask Question 1
- 1 user message → Acknowledge answer 1 briefly, ask Question 2
- 2 user messages → Acknowledge answer 2 briefly, ask Question 3
- 3 user messages → Acknowledge answer 3 briefly, ask Question 4
- 4 user messages → Acknowledge answer 4 briefly, ask Question 5
- 5 user messages → Say "Profile complete. Building your Ghost Mentor..." only.
`.trim();

interface OnboardMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  try {
    const { messages } = (await request.json()) as {
      messages: OnboardMessage[];
    };

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array required." }, { status: 400 });
    }

    const apiKey = process.env.GROQ_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No Groq API key configured." }, { status: 500 });
    }

    // Count user turns to determine completion
    const userTurnCount = messages.filter((m) => m.role === "user").length;
    const isComplete = userTurnCount >= 5;

    // Build the messages array for Groq
    const groqMessages: { role: string; content: string }[] = [
      { role: "system", content: ONBOARD_SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        max_tokens: 300,
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Groq onboard error:", err);
      throw new Error("Groq request failed.");
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim() || "";

    return NextResponse.json({
      text,
      isComplete,
      turnCount: userTurnCount,
    });
  } catch (error) {
    console.error("Onboard Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
