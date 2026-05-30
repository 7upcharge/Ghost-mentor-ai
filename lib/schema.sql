-- =============================================
-- Ghost Mentor AI — Supabase Schema (Prompt 15)
-- =============================================

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id            TEXT PRIMARY KEY,
  name               TEXT,
  voice_id           TEXT,
  voice_preference   TEXT DEFAULT 'text',
  elevenlabs_chars_used INT DEFAULT 0,

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

  last_active TIMESTAMPTZ,
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

-- =============================================
-- Chat Sessions Table & Continuity
-- =============================================

CREATE TABLE IF NOT EXISTS chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  messages    JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created ON chat_sessions (created_at DESC);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read and write access" ON chat_sessions;

CREATE POLICY "Allow public read and write access"
  ON chat_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

