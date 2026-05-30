import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get("text");
    const voiceId = searchParams.get("voiceId");
    const userId = searchParams.get("userId");
    const preference = searchParams.get("preference") || "ai";

    if (!text || !voiceId || !userId) {
      return new NextResponse("Missing text, voiceId, or userId", { status: 400 });
    }

    // 1. Check characters used limit in Supabase
    const { data: profile, error: fetchErr } = await supabase
      .from("user_profiles")
      .select("elevenlabs_chars_used")
      .eq("user_id", userId)
      .single();

    if (fetchErr) {
      console.error("Error fetching user profile characters:", fetchErr);
    }

    const currentUsed = profile?.elevenlabs_chars_used || 0;
    if (currentUsed >= 9000) {
      return new NextResponse("Voice limit reached for this month. Upgrade for unlimited voice.", { status: 403 });
    }

    const elevenLabsKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_KEY;
    if (!elevenLabsKey) {
      return new NextResponse("No API key configured", { status: 500 });
    }

    // Determine voice settings based on user preference
    const stability = preference === "own" ? 0.45 : 0.6;
    const similarity_boost = preference === "own" ? 0.85 : 0.7;
    const style = preference === "own" ? 0.2 : 0.1;
    const use_speaker_boost = preference === "own" ? true : false;

    // 2. Call ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",
        voice_settings: {
          stability,
          similarity_boost,
          style,
          use_speaker_boost,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new NextResponse(`TTS failed: ${errorText}`, { status: response.status });
    }

    // 3. Increment characters used in Supabase
    const { error: updateErr } = await supabase
      .from("user_profiles")
      .update({ elevenlabs_chars_used: currentUsed + text.length })
      .eq("user_id", userId);

    if (updateErr) {
      console.error("Error updating user profile characters:", updateErr);
    }

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
