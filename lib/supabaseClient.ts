import { createClient } from "@supabase/supabase-js";

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
if (!supabaseUrl.startsWith("http://") && !supabaseUrl.startsWith("https://")) {
  supabaseUrl = "https://placeholder-url.supabase.co";
}

let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
if (!supabaseAnonKey || supabaseAnonKey.includes("your_supabase")) {
  supabaseAnonKey = "placeholder-key";
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
