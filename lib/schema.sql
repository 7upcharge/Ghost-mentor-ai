-- =============================================
-- Ghost Mentor AI — Supabase Schema (Prompt 15)
-- =============================================

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id            TEXT PRIMARY KEY,
  name               TEXT,
  voice_id           TEXT,

  -- Prompt 15: Session continuity
  chat_summary       TEXT,                  -- 3-sentence session summary (Prompt 8)
  last_session_summary TEXT,               -- legacy alias, kept for backward compat

  -- Prompt 15: Personality & language profiles
  personality_profile JSONB,               -- full PromptPackProfile / FutureSelfMemoryProfile JSON
  language_profile    JSONB,               -- LanguageProfile JSON

  -- Prompt 15: Transfer metadata
  transfer_sources    JSONB,               -- array of { platform, messageCount, uploaded }
  confidence_score    INTEGER DEFAULT 0,   -- 0–99

  -- Projection data
  future_projections  JSONB,

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read and write access" ON user_profiles;

-- Create policy to allow all public operations (select, insert, update, delete)
CREATE POLICY "Allow public read and write access"
  ON user_profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);
