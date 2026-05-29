import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Prompt 8: 3-sentence summary using gemini-2.0-flash
const GEMINI_FLASH_MODEL = "gemini-2.0-flash";

// ── Prompt 8 system prompt ───────────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are an expert psychological patterns compiler for a future-self AI mentor.
Analyze the chat log between Present Self (User) and Future Self (Ghost Mentor) and write exactly 3 sentences.

Sentence 1: The core emotional truth or recurring fear surfaced in this session.
Sentence 2: The realization or perspective shift that happened (or didn't happen).
Sentence 3: One specific behavioral pattern or action the person committed to (or avoided committing to).

Rules:
- Write in first-person plural: "We discussed...", "We realized...", "Our pattern was..."
- Max 3 sentences. Dense and authentic. No filler.
- Do NOT sound like an AI assistant. Sound like a future-self remembering.
- No generic summaries. Only what actually happened in this specific conversation.
`.trim();

export async function POST(request: Request) {
  try {
    const { userId, messages } = await request.json();

    if (!userId || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Missing userId or messages array." }, { status: 400 });
    }

    if (messages.length === 0) {
      return NextResponse.json({ summary: "" });
    }

    const apiKey =
      process.env.GOOGLE_AI_STUDIO_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "No Gemini API key configured." }, { status: 500 });
    }

    // Format chat log
    const chatLog = messages
      .map((m: { role: string; text: string }) => {
        const name = m.role === "ghost" ? "Future Self" : "Present Self";
        return `${name}: ${m.text}`;
      })
      .join("\n\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FLASH_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: chatLog }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 200,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini Session Memory Error:", errorText);
      throw new Error("Failed to summarize session with Gemini Flash.");
    }

    const data = await response.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    // Save to Supabase — write to both chat_summary (new) and last_session_summary (compat)
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
