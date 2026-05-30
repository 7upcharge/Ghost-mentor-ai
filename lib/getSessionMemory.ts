import { createClient } from "@supabase/supabase-js"

export async function getSessionMemory(
  userId: string
): Promise<string | null> {
  if (!userId) return null
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from("user_profiles")
      .select("chat_summary")
      .eq("user_id", userId)
      .single()
    
    return data?.chat_summary || null
  } catch {
    return null
  }
}
