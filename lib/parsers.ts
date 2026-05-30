// ═══════════════════════════════════════════
// Multi-Platform Conversation Parsers
// ChatGPT · Claude · Gemini · Grok · Perplexity
// ═══════════════════════════════════════════

export type ParsedDocument = {
  fileName: string;
  type: "text" | "json" | "pdf";
  content: string;
};

export interface ParsedConversation {
  text: string;
  messageCount: number;
  platform: "chatgpt" | "claude" | "gemini" | "grok" | "perplexity" | "manual";
}

// ── ChatGPT ──────────────────────────────
// Structure: Array of { title, mapping: { [id]: { message: { author: { role }, content: { parts } } } } }
export function parseChatGPTJson(jsonStr: string): ParsedConversation {
  try {
    const data = JSON.parse(jsonStr);
    if (!Array.isArray(data)) return { text: jsonStr.substring(0, 50000), messageCount: 0, platform: "chatgpt" };

    let extractedText = "";
    let messageCount = 0;

    for (const convo of data) {
      if (!convo.mapping) continue;
      extractedText += `\n--- ${convo.title || "Untitled"} ---\n`;

      for (const key in convo.mapping) {
        const node = convo.mapping[key];
        if (
          node?.message?.author?.role === "user" &&
          node?.message?.content?.parts?.length > 0
        ) {
          const parts = node.message.content.parts;
          const text = typeof parts[0] === "string" ? parts[0] : JSON.stringify(parts);
          extractedText += `User: ${text}\n`;
          messageCount++;
        }
      }
    }

    return { text: extractedText.trim(), messageCount, platform: "chatgpt" };
  } catch {
    return { text: jsonStr.substring(0, 50000), messageCount: 0, platform: "chatgpt" };
  }
}

// ── Claude ────────────────────────────────
// Structure: Array of { uuid, name, chat_messages: [{ sender: "human"|"assistant", text }] }
// Also handles: { conversations: [...] } wrapper
export function parseClaudeJson(jsonStr: string): ParsedConversation {
  try {
    let data = JSON.parse(jsonStr);
    if (data.conversations && Array.isArray(data.conversations)) {
      data = data.conversations;
    }
    if (!Array.isArray(data)) return { text: jsonStr.substring(0, 50000), messageCount: 0, platform: "claude" };

    let extractedText = "";
    let messageCount = 0;

    for (const convo of data) {
      const messages = convo.chat_messages || convo.messages || [];
      if (messages.length === 0) continue;

      extractedText += `\n--- ${convo.name || convo.title || "Untitled"} ---\n`;

      for (const msg of messages) {
        const role = msg.sender || msg.role;
        if (role === "human" || role === "user") {
          const text = msg.text || msg.content || "";
          if (typeof text === "string" && text.trim()) {
            extractedText += `User: ${text}\n`;
            messageCount++;
          }
        }
      }
    }

    return { text: extractedText.trim(), messageCount, platform: "claude" };
  } catch {
    return { text: jsonStr.substring(0, 50000), messageCount: 0, platform: "claude" };
  }
}

// ── Gemini ────────────────────────────────
// Google Takeout: Array of { products: ["Gemini Apps"], activityControls, activity: [{ header, title, time, subtitles }] }
// Also handles simpler: [{ title, messages: [{ role, content }] }]
export function parseGeminiJson(jsonStr: string): ParsedConversation {
  try {
    const data = JSON.parse(jsonStr);

    // Google Takeout format — nested activity
    if (Array.isArray(data) && data[0]?.products) {
      let extractedText = "";
      let messageCount = 0;

      for (const item of data) {
        if (!item.activity) continue;
        for (const act of item.activity) {
          if (act.title) {
            extractedText += `User: ${act.title}\n`;
            messageCount++;
          }
          if (act.subtitles) {
            for (const sub of act.subtitles) {
              if (sub.name) extractedText += `User: ${sub.name}\n`;
            }
          }
        }
      }
      return { text: extractedText.trim(), messageCount, platform: "gemini" };
    }

    // Simple conversation format
    if (Array.isArray(data)) {
      let extractedText = "";
      let messageCount = 0;

      for (const convo of data) {
        const messages = convo.messages || convo.turns || [];
        extractedText += `\n--- ${convo.title || "Untitled"} ---\n`;

        for (const msg of messages) {
          if (msg.role === "user" || msg.author === "user") {
            const text = msg.content || msg.text || msg.parts?.[0]?.text || "";
            if (typeof text === "string" && text.trim()) {
              extractedText += `User: ${text}\n`;
              messageCount++;
            }
          }
        }
      }
      return { text: extractedText.trim(), messageCount, platform: "gemini" };
    }

    return { text: JSON.stringify(data).substring(0, 50000), messageCount: 0, platform: "gemini" };
  } catch {
    return { text: jsonStr.substring(0, 50000), messageCount: 0, platform: "gemini" };
  }
}

// ── Grok ──────────────────────────────────
// Structure: { conversations: [{ id, messages: [{ role, content, timestamp }] }] }
export function parseGrokJson(jsonStr: string): ParsedConversation {
  try {
    const data = JSON.parse(jsonStr);
    const convos = data.conversations || data.chats || (Array.isArray(data) ? data : []);

    let extractedText = "";
    let messageCount = 0;

    for (const convo of convos) {
      const messages = convo.messages || convo.turns || [];
      extractedText += `\n--- ${convo.title || convo.id || "Untitled"} ---\n`;

      for (const msg of messages) {
        if (msg.role === "user" || msg.sender === "user") {
          const text = msg.content || msg.text || "";
          if (typeof text === "string" && text.trim()) {
            extractedText += `User: ${text}\n`;
            messageCount++;
          }
        }
      }
    }

    return { text: extractedText.trim(), messageCount, platform: "grok" };
  } catch {
    return { text: jsonStr.substring(0, 50000), messageCount: 0, platform: "grok" };
  }
}

// ── Perplexity ───────────────────────────
// Structure: { threads: [{ title, messages: [{ role, content }] }] }
export function parsePerplexityJson(jsonStr: string): ParsedConversation {
  try {
    const data = JSON.parse(jsonStr);
    const threads = data.threads || data.conversations || (Array.isArray(data) ? data : []);

    let extractedText = "";
    let messageCount = 0;

    for (const thread of threads) {
      const messages = thread.messages || thread.queries || [];
      extractedText += `\n--- ${thread.title || "Untitled"} ---\n`;

      for (const msg of messages) {
        if (msg.role === "user" || msg.author === "user") {
          const text = msg.content || msg.query || msg.text || "";
          if (typeof text === "string" && text.trim()) {
            extractedText += `User: ${text}\n`;
            messageCount++;
          }
        }
      }
    }

    return { text: extractedText.trim(), messageCount, platform: "perplexity" };
  } catch {
    return { text: jsonStr.substring(0, 50000), messageCount: 0, platform: "perplexity" };
  }
}

// ── Auto-detect platform ─────────────────
export function detectPlatform(jsonStr: string): ParsedConversation["platform"] {
  try {
    const data = JSON.parse(jsonStr);

    // ChatGPT — array with mapping field
    if (Array.isArray(data) && data[0]?.mapping) return "chatgpt";

    // Claude — chat_messages field or conversations wrapper
    if (Array.isArray(data) && data[0]?.chat_messages) return "claude";
    if (data?.conversations?.[0]?.chat_messages) return "claude";

    // Gemini Takeout — products field
    if (Array.isArray(data) && data[0]?.products) return "gemini";

    // Grok — conversations with messages
    if (data?.conversations?.[0]?.messages) return "grok";

    // Perplexity — threads
    if (data?.threads) return "perplexity";

    // Fallback: try to detect by message structure
    const arr = Array.isArray(data) ? data : data?.conversations || [];
    if (arr[0]?.messages?.[0]?.sender) return "claude";
    if (arr[0]?.turns) return "gemini";

    return "manual";
  } catch {
    return "manual";
  }
}

// ── Parse any JSON automatically ─────────
export function parseAnyConversationJson(jsonStr: string): ParsedConversation {
  const platform = detectPlatform(jsonStr);

  switch (platform) {
    case "chatgpt": return parseChatGPTJson(jsonStr);
    case "claude": return parseClaudeJson(jsonStr);
    case "gemini": return parseGeminiJson(jsonStr);
    case "grok": return parseGrokJson(jsonStr);
    case "perplexity": return parsePerplexityJson(jsonStr);
    default: return { text: jsonStr.substring(0, 50000), messageCount: 0, platform: "manual" };
  }
}

// ── Confidence score ─────────────────────
export function calculateConfidence(totalMessages: number, sourceCount: number): number {
  let base = 0;
  if (totalMessages <= 50) base = 20;
  else if (totalMessages <= 200) base = 45;
  else if (totalMessages <= 500) base = 65;
  else if (totalMessages <= 1000) base = 80;
  else base = 95;

  const sourceBonus = Math.min((sourceCount - 1) * 5, 15);
  return Math.min(base + sourceBonus, 99);
}

// ── Client-side file parser ──────────────
export async function parseFileClientSide(file: File): Promise<ParsedDocument> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "pdf") {
    return { fileName: file.name, type: "pdf", content: "" };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (extension === "json") {
        const parsed = parseAnyConversationJson(text);
        resolve({ fileName: file.name, type: "json", content: parsed.text });
      } else {
        resolve({ fileName: file.name, type: "text", content: text });
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

// ── Truncate text ────────────────────────
export function chunkAndTruncateText(text: string, maxChars: number = 30000): string {
  if (text.length <= maxChars) return text;

  const keepLength = Math.floor(maxChars / 2);
  const start = text.substring(0, keepLength);
  const end = text.substring(text.length - keepLength);

  return `${start}\n\n...[TRUNCATED ${text.length - maxChars} characters]...\n\n${end}`;
}

export interface PromptPackProfile {
  name: string;
  core_fears: string[];
  biggest_ambitions: string[];
  avoidance_patterns: string[];
  communication_style: string[];
  recurring_struggles: string[];
  self_talk_patterns: string[];
  highest_values: string[];
  language_mirror: {
    primary_language: string;
    slang_terms: string[];
    frustration_style: string;
    excitement_style: string;
    sentence_style: string;
  };
  smart_questions: string[];
  raw_confidence: number;
}

export function parsePastedSummary(text: string): PromptPackProfile {
  const getSection = (label: string) => {
    const regex = new RegExp(`${label}[:\\s]+([^\\n]+(?:\\n(?![A-Z_]+:)[^\\n]+)*)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  };

  const getList = (label: string) => {
    const section = getSection(label);
    return section.split(/,|\n/).map(s => s.trim()).filter(s => s.length > 0 && !s.match(/^[\d\-•]/));
  };

  const getLanguageSection = (label: string) => {
    const regex = new RegExp(`[-•]\\s*${label}[:\\s]+([^\\n]+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  };

  return {
    name: getSection('NAME').replace(/unknown/i, '').trim() || 'unknown',
    core_fears: getList('CORE_FEARS'),
    biggest_ambitions: getList('BIGGEST_AMBITIONS'),
    avoidance_patterns: getList('AVOIDANCE_PATTERNS'),
    communication_style: getList('COMMUNICATION_STYLE'),
    recurring_struggles: getList('RECURRING_STRUGGLES'),
    self_talk_patterns: getList('SELF_TALK_PATTERNS'),
    highest_values: getList('HIGHEST_VALUES'),
    language_mirror: {
      primary_language: getLanguageSection('Primary language') || 'english',
      slang_terms: getLanguageSection('Slang/terms I use').split(/,|\s+/).filter(Boolean),
      frustration_style: getLanguageSection('How I express frustration'),
      excitement_style: getLanguageSection('How I express excitement'),
      sentence_style: getLanguageSection('Sentence style') || 'medium',
    },
    smart_questions: (text.match(/SMART_QUESTIONS[\s\S]*?(?:\d+\.\s*([^\n]+))+/) || [])
      .join('\n')
      .split('\n')
      .filter(line => line.match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean),
    raw_confidence: 85
  };
}

export function mapPromptPackProfileToMemoryProfile(p: PromptPackProfile) {
  return {
    identity: {
      ambition: p.biggest_ambitions.length > 0 ? ("high" as const) : ("unknown" as const),
      coreFear: p.core_fears[0] || "unknown",
      decisionPattern: p.avoidance_patterns[0] || "unknown",
      emotionalStyle: p.communication_style[0] || "unknown",
    },
    communicationStyle: {
      tone: p.language_mirror.primary_language + " - " + p.language_mirror.sentence_style,
      sentenceRhythm: p.language_mirror.sentence_style,
      vocabulary: p.language_mirror.slang_terms.join(", "),
    },
    futureSelfEvolution: {
      confidence: "improving" as const,
      discipline: "developing" as const,
      emotionalClarity: "emerging" as const,
    },
    psychologicalContinuity: {
      recurringThemes: p.highest_values,
      recurringFears: p.core_fears,
      behavioralLoops: p.avoidance_patterns,
      growthPatterns: p.recurring_struggles,
      messageCount: 1,
      lastUpdatedAt: Date.now(),
    },
  };
}
