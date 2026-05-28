export type ParsedDocument = {
  fileName: string;
  type: "text" | "json" | "pdf";
  content: string; // The extracted text content
};

/**
 * Extracts conversation history from ChatGPT JSON export structure.
 */
function parseChatGPTJson(jsonStr: string): string {
  try {
    const data = JSON.parse(jsonStr);
    
    // ChatGPT conversations.json is usually an array of conversations.
    if (Array.isArray(data)) {
      let extractedText = "";
      // Only take the first few conversations to avoid massive payloads
      const recentConvos = data.slice(0, 10);
      
      for (const convo of recentConvos) {
        if (!convo.mapping) continue;
        
        extractedText += `\n--- Conversation: ${convo.title || "Untitled"} ---\n`;
        
        // Mapping contains the messages
        for (const key in convo.mapping) {
          const node = convo.mapping[key];
          if (
            node?.message?.author?.role === "user" &&
            node?.message?.content?.parts?.length > 0
          ) {
            const parts = node.message.content.parts;
            const text = typeof parts[0] === "string" ? parts[0] : JSON.stringify(parts);
            extractedText += `User: ${text}\n`;
          }
        }
      }
      return extractedText.trim();
    }
    
    // If it's a generic JSON, just stringify it but truncated.
    return JSON.stringify(data).substring(0, 50000);
  } catch {
    // If it fails to parse as JSON, just return it as raw text (maybe it's malformed)
    return jsonStr;
  }
}

/**
 * Client-side file parser for text-based formats.
 */
export async function parseFileClientSide(file: File): Promise<ParsedDocument> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  
  if (extension === "pdf") {
    // PDFs must be handled by the server (we'll send the raw file in FormData)
    return {
      fileName: file.name,
      type: "pdf",
      content: "", // Content will be filled by backend
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (extension === "json") {
        resolve({
          fileName: file.name,
          type: "json",
          content: parseChatGPTJson(text),
        });
      } else {
        // .txt, .md, etc.
        resolve({
          fileName: file.name,
          type: "text",
          content: text,
        });
      }
    };
    
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * Truncates text intelligently to roughly fit into an LLM context window.
 * Keeps the start (context) and end (recent history) if it's too long.
 */
export function chunkAndTruncateText(text: string, maxChars: number = 30000): string {
  if (text.length <= maxChars) return text;
  
  const keepLength = Math.floor(maxChars / 2);
  const start = text.substring(0, keepLength);
  const end = text.substring(text.length - keepLength);
  
  return `${start}\n\n...[TRUNCATED ${text.length - maxChars} characters]...\n\n${end}`;
}
