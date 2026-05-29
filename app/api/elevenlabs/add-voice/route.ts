import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get("audio") as Blob;
    const userId = formData.get("userId") as string;
    const name = formData.get("name") as string;

    if (!audioBlob || !userId) {
      return NextResponse.json({ error: "Missing audio or userId" }, { status: 400 });
    }

    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsKey) {
      return NextResponse.json({ error: "No API key configured" }, { status: 500 });
    }

    const elevenFormData = new FormData();
    elevenFormData.append("name", `ronak_future_${userId}`);
    elevenFormData.append("files", audioBlob, "sample.webm");
    
    const response = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsKey,
      },
      body: elevenFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: "ElevenLabs API failed", details: errorText }, { status: response.status });
    }

    const data = await response.json();
    const voiceId = data.voice_id;

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      await supabase.from("user_profiles").upsert({
        user_id: userId,
        voice_id: voiceId,
        name: name,
        created_at: new Date().toISOString()
      }, { onConflict: "user_id" });
    }

    return NextResponse.json({ voiceId });
  } catch (error) {
    console.error("Voice add error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
