import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  const { messages, userId } = await req.json()

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "No messages" }, 
    { status: 400 })
  }

  const conversation = messages
    .map((m: any) => {
      const roleName = m.role === "ghost" ? "ghost" : "user";
      const content = m.text || m.content || "";
      return `${roleName}: ${content}`;
    })
    .join("\n")

  const summaryPrompt = `Summarize this Ghost Mentor 
conversation in exactly 3 sentences.
What emotional topic came up.
What shifted for the user if anything.
Any new pattern noticed.
Tone: memory-like, not clinical.
Example: "He circled back to fear of being average. 
This time he named it instead of avoiding it. 
Still hasn't committed to one project though."

Conversation:
${conversation}`

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_KEY}`,
          "HTTP-Referer": "https://ghost-mentor-ai.vercel.app",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct",
          messages: [
            { role: "user", content: summaryPrompt }
          ],
          max_tokens: 150,
        })
      }
    )

    const data = await response.json()
    const summary = data.choices?.[0]?.message?.content || ""

    if (userId && summary) {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!
      )
      await supabase
        .from("user_profiles")
        .update({ 
          chat_summary: summary,
          last_session_summary: summary,
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId)
    }

    return NextResponse.json({ summary })
  } catch (error) {
    console.error("Session memory error:", error)
    return NextResponse.json({ error: "Failed" }, 
    { status: 500 })
  }
}
