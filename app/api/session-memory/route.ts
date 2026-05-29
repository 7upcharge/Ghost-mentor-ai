import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const OPENROUTER_MODEL = "google/gemini-2.5-pro-exp";

export async function POST(request: Request) {
  try {
    const { userId, messages } = await request.json();

    if (!userId || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Missing userId or messages array." }, { status: 400 });
    }

    if (messages.length === 0) {
      return NextResponse.json({ summary: "" });
    }

    const apiKey = process.env.OPENROUTER_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No OpenRouter API key configured." }, { status: 500 });
    }

    // Format chat log
    const chatLog = messages
      .map((m: { role: string; text: string }) => {
        const name = m.role === "ghost" ? "Future Self" : "Present Self";
        return `${name}: ${m.text}`;
      })
      .join("\n\n");

    const prompt = `Summarize this conversation in 3 sentences.
What emotional topic came up.
What shifted for the user if anything.
Any new pattern noticed.
Tone: memory-like, not clinical.
Conversation: ${chatLog}`;

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
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter Session Memory Error:", errorText);
      throw new Error("Failed to summarize session with OpenRouter.");
    }

    const data = await response.json();
    const summary = data?.choices?.[0]?.message?.content?.trim() || "";

    // Save to Supabase — write to both chat_summary and legacy last_session_summary
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      const { error } = await supabase
        .from("user_profiles")
        .upsert(
          {
            user_id: userId,
            chat_summary: summary,
            last_session_summary: summary,
            last_active: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("Failed to save session memory to Supabase:", error);
      }
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Session Memory Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
