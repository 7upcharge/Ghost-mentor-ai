// ═══════════════════════════════════════════
// Language Detection — Client-side (Prompt 16 Spec)
// Hindi · English · Hinglish detection
// No API call. Pure heuristics.
// ═══════════════════════════════════════════

export interface LanguageProfile {
  dominantLanguage: "hindi" | "english" | "hinglish";
  sentenceLength: "short" | "medium" | "long";
  formality: "casual" | "formal";
  commonSlang: string[];
  frustrationStyle: string;
  excitementStyle: string;
}

// ── Prompt 16: Hindi Unicode check ──────────
const HINDI_REGEX = /[\u0900-\u097F]/;

// Hinglish markers for ratio calculation (Prompt 16)
const HINGLISH_MARKERS = [
  "kya", "bhai", "nahi", "karna", "hai", "haan", "acha",
  "yaar", "matlab", "kaise", "kyun", "mujhe", "toh",
  "abhi", "bahut", "theek", "sahi", "bro", "kar",
  "bol", "chal", "dekh", "samajh", "pata", "wala",
  "mein", "ka", "ki", "ke", "se", "par", "pe",
  "kuch", "aur", "lekin", "phir", "jab", "tab",
  "agar", "isliye", "woh", "yeh", "mere", "tera",
  "uska", "apna", "sab", "log", "banda", "scene",
  "jugaad", "chalta", "funda", "fundoo", "bakwas",
  "bilkul", "accha", "raha", "rahi", "hota", "hoti",
  "karo", "karta", "karti", "lena", "dena", "jana",
  "aana", "rehna", "lagta", "lagti", "bata", "bolo",
];

// Casual English markers
const CASUAL_MARKERS = [
  "lol", "lmao", "bruh", "dude", "gonna", "wanna",
  "gotta", "idk", "tbh", "ngl", "fr", "lowkey",
  "highkey", "vibe", "chill", "sick", "dope", "lit",
  "bet", "no cap", "imo", "btw", "rn", "nvm",
];

// Frustration patterns
const FRUSTRATION_PATTERNS: [RegExp, string][] = [
  [/\b(kya|what the|wtf|bc|mc)\b/i, "explosive, uses strong language"],
  [/\b(ugh|argh|smh|ffs)\b/i, "expressive frustration markers"],
  [/[!]{2,}/g, "heavy exclamation usage"],
  [/\b(confused|lost|stuck|frustrated)\b/i, "directly states the feeling"],
  [/\b(samajh nahi|nahi samjha|kuch nahi|pata nahi)\b/i, "admits confusion directly in Hinglish"],
];

// Excitement patterns
const EXCITEMENT_PATTERNS: [RegExp, string][] = [
  [/[!]{2,}/g, "multiple exclamation marks"],
  [/\b(lesgooo|yess+|hell yeah|lfg|fire)\b/i, "internet hype language"],
  [/\b(amazing|insane|crazy|wild|sick)\b/i, "intensity adjectives"],
  [/\b(bhai.*mast|ekdum|zabardast|kamaal|dope)\b/i, "Hinglish excitement markers"],
  [/[A-Z]{3,}/g, "ALL CAPS excitement"],
];

export function detectLanguageProfile(text: string): LanguageProfile {
  if (!text || text.length < 20) {
    return {
      dominantLanguage: "english",
      sentenceLength: "medium",
      formality: "casual",
      commonSlang: [],
      frustrationStyle: "still being learned",
      excitementStyle: "still being learned",
    };
  }

  const textLower = text.toLowerCase();
  const words = textLower.split(/\s+/);
  const totalWords = words.length;

  // ── Prompt 16: Hindi Unicode check ────────
  const hindiCharCount = (text.match(HINDI_REGEX) || []).length;
  const hindiRatio = hindiCharCount / text.length;

  // ── Prompt 16: Hinglish marker ratio calculation ──
  let hinglishMarkerCount = 0;
  const detectedSlang: string[] = [];

  for (const marker of HINGLISH_MARKERS) {
    const regex = new RegExp(`\\b${marker}\\b`, "gi");
    const matches = textLower.match(regex);
    if (matches) {
      hinglishMarkerCount += matches.length;
      if (!detectedSlang.includes(marker) && detectedSlang.length < 10) {
        detectedSlang.push(marker);
      }
    }
  }

  // Also collect casual English slang
  for (const marker of CASUAL_MARKERS) {
    const regex = new RegExp(`\\b${marker}\\b`, "gi");
    const matches = textLower.match(regex);
    if (matches && !detectedSlang.includes(marker) && detectedSlang.length < 10) {
      detectedSlang.push(marker);
    }
  }

  // Prompt 16: ratio > 0.15 triggers Hinglish
  const hinglishRatio = totalWords > 0 ? hinglishMarkerCount / totalWords : 0;

  let dominantLanguage: LanguageProfile["dominantLanguage"];
  if (hindiRatio > 0.3) {
    // Majority Devanagari script → pure Hindi
    dominantLanguage = "hindi";
  } else if (hinglishRatio > 0.15 || (hindiRatio > 0.02 && hinglishMarkerCount > 3)) {
    // Prompt 16: Hinglish marker ratio > 0.15 triggers Hinglish
    dominantLanguage = "hinglish";
  } else {
    dominantLanguage = "english";
  }

  // ── Prompt 16: Sentence length detection ──────────
  // < 8 words = "short", > 20 words = "long", else "medium"
  const sentences = text.split(/[.!?\n]+/).filter((s) => s.trim().length > 3);
  const avgWordsPerSentence =
    sentences.length > 0
      ? sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length
      : 10;

  let sentenceLength: LanguageProfile["sentenceLength"];
  if (avgWordsPerSentence < 8) sentenceLength = "short";
  else if (avgWordsPerSentence > 20) sentenceLength = "long";
  else sentenceLength = "medium";

  // ── Formality ────────────────────────────
  let casualCount = 0;
  for (const marker of CASUAL_MARKERS) {
    if (textLower.includes(marker)) casualCount++;
  }
  const formality: LanguageProfile["formality"] =
    dominantLanguage === "hinglish" || casualCount > 2 || hinglishMarkerCount > 6
      ? "casual"
      : "formal";

  // ── Frustration style ─────────────────────
  let frustrationStyle = "quiet frustration, restates the problem";
  for (const [pattern, description] of FRUSTRATION_PATTERNS) {
    if (pattern.test(text)) {
      frustrationStyle = description;
      break;
    }
  }

  // ── Excitement style ─────────────────────
  let excitementStyle = "measured, steady enthusiasm";
  for (const [pattern, description] of EXCITEMENT_PATTERNS) {
    if (pattern.test(text)) {
      excitementStyle = description;
      break;
    }
  }

  return {
    dominantLanguage,
    sentenceLength,
    formality,
    commonSlang: detectedSlang,
    frustrationStyle,
    excitementStyle,
  };
}
