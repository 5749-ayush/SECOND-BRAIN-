export interface TitlingContext {
  rawTitle?: string | null;
  description?: string | null;
  note?: string | null;
  creatorName?: string | null;
  sourceType?: string | null;
  url?: string | null;
  imageUrl?: string | null;
}

export function getOpenAIApiKey(): string {
  return process.env.OPENAI_API_KEY?.trim() || "";
}

export function cleanRawSocialMetadata(raw: string | null | undefined): string {
  if (!raw) return "";
  let text = raw;

  // 1. Remove likes and comments count preambles with optional usernames and dates
  // Examples:
  // "2,258 likes, 2,185 comments thevibefounder on July 15, 2026: \"Every AI Builder...\""
  // "799 likes, 1,074 comments - user on August 8, 2026: \"...\""
  // "1.2M likes, 45K comments:"
  text = text.replace(
    /^[0-9,.]+[KkMmBb]?\s+likes[,\s]+[0-9,.]+[KkMmBb]?\s+comments\s*[-–—:]*\s*(?:[A-Za-z0-9_.]+\s+on\s+[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}:?\s*)?["“]?/i,
    ""
  );

  // 2. Remove standalone engagement metric lines
  text = text.replace(
    /\b[0-9,.]+[KkMmBb]?\s+(?:likes?|comments?|views?|reposts?|retweets?|quotes?)\b[,\s]*/gi,
    ""
  );

  // 3. Remove "Author on Platform: [quote]" or "Author (@handle) on X: [quote]"
  text = text.replace(
    /^.+?\s+on\s+(?:Instagram|Twitter|X|TikTok|YouTube|Threads|Facebook):\s*["“]?/i,
    ""
  );

  // 4. Remove standalone "username on Month Day, Year:"
  text = text.replace(
    /^[A-Za-z0-9_.]+\s+on\s+[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}:\s*["“]?/i,
    ""
  );

  // 5. Remove date preambles like "August 15, 2026:" or "on July 15, 2026"
  text = text.replace(
    /\b(?:on\s+)?(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}:?\b/gi,
    ""
  );

  // 6. Remove platform boilerplate prefixes/suffixes
  text = text.replace(/^(?:YouTube video by|Instagram post by|Tweet from|Post from)\s+[^:]+:\s*/i, "");
  text = text.replace(/\s+[|\-–—]\s+(?:YouTube|Instagram|Twitter|X|TikTok|The Verge|Medium|Substack|Reddit)[^|\-–—]*$/i, "");
  text = text.replace(/•\s*Instagram photos and videos/gi, "");

  // 7. Remove CTA / engagement triggers
  text = text.replace(
    /(?:comment|dm|reply|message)\s+["']?[A-Za-z0-9_]+["']?\s+(?:and|to|for)\s+[^.!?\n]+[.!?\n]?/gi,
    ""
  );
  text = text.replace(/\b(?:link in bio|follow for more|save for later|share with a friend)\b[.!?]?/gi, "");

  // 8. Remove hashtags and URLs
  text = text.replace(/#[a-zA-Z0-9_]+/g, "");
  text = text.replace(/https?:\/\/\S+/g, "");

  // 9. Remove leading/trailing quotes, colons, dashes, and extra spaces
  text = text
    .replace(/\\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[:\-–—\s"'“‘`]+|[:\-–—\s"'”’`]+$/g, "")
    .trim();

  return text;
}

function cleanTrailingDangling(text: string): string {
  let result = text.trim();
  result = result.replace(/[:\-–—|=+_\/\\~*#&^%$@;]+$/, "").trim();
  result = result.replace(/\s+(?:and|or|the|a|an|to|in|on|with|for|at|by|of|from|that|this|is|are)$/i, "").trim();
  result = result.replace(/[:\-–—|=+_\/\\~*#&^%$@;.,]+$/, "").trim();
  return result;
}

export function enforceTitleLimit(rawText: string | null | undefined, maxWords: number = 14): string {
  const cleaned = cleanRawSocialMetadata(rawText);
  if (!cleaned) return "Saved idea";

  // Check if there is a natural clause or sentence before a delimiter within maxWords
  const firstBreak = cleaned.match(/^([^:—\-|?\n.!]+(?:[?|!])?)/);
  const firstSegment = firstBreak?.[1]?.trim();
  if (
    firstSegment &&
    firstSegment.split(/\s+/).filter(Boolean).length >= 6 &&
    firstSegment.split(/\s+/).filter(Boolean).length <= maxWords
  ) {
    const candidate = cleanTrailingDangling(firstSegment);
    if (candidate) return candidate;
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return cleanTrailingDangling(words.join(" ")) || "Saved idea";
  }

  const truncated = cleanTrailingDangling(words.slice(0, maxWords).join(" "));
  return truncated || "Saved idea";
}

export function enforceNoteLimit(rawText: string | null | undefined, maxWords: number = 70): string {
  const cleaned = cleanRawSocialMetadata(rawText);
  if (!cleaned) return "";

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    const text = cleanTrailingDangling(words.join(" "));
    if (!text) return "";
    return /[.!?]$/.test(text) ? text : `${text}.`;
  }

  // Try breaking cleanly at the last full sentence within maxWords
  const candidateSlice = words.slice(0, maxWords).join(" ");
  const lastSentenceMatch = candidateSlice.match(/^(.*[.!?])\s+[A-Z0-9]/);
  if (lastSentenceMatch && lastSentenceMatch[1]) {
    const sentenceSegment = lastSentenceMatch[1].trim();
    if (sentenceSegment.split(/\s+/).filter(Boolean).length >= 15) {
      return sentenceSegment;
    }
  }

  const truncated = cleanTrailingDangling(candidateSlice);
  return truncated ? `${truncated}.` : "";
}

export function fallbackConservativeTitle(context: TitlingContext): string {
  if (context.rawTitle && context.rawTitle.trim().length > 0) {
    const raw = context.rawTitle.trim();
    if (!["Untitled idea", "Saved item", "Saved post", "Saved web page", "YouTube Video"].includes(raw)) {
      const candidate = enforceTitleLimit(raw, 14);
      if (candidate && candidate !== "Saved idea") return candidate;
    }
  }

  if (context.description && context.description.trim().length > 0) {
    const candidate = enforceTitleLimit(context.description, 14);
    if (candidate && candidate !== "Saved idea") return candidate;
  }

  if (context.note && context.note.trim().length > 0) {
    const candidate = enforceTitleLimit(context.note, 14);
    if (candidate && candidate !== "Saved idea") return candidate;
  }

  if (context.url) {
    try {
      const hostname = new URL(context.url).hostname.replace(/^www\./, "");
      return enforceTitleLimit(`${hostname} reference`, 14);
    } catch {
      // ignore
    }
  }

  return "Saved idea";
}

export function fallbackContentNote(context: TitlingContext): string {
  // If user provided a note or description that contains real content
  if (context.note && context.note.trim().length > 0) {
    const cleaned = cleanRawSocialMetadata(context.note);
    if (cleaned.length > 10 && !cleaned.toLowerCase().includes("it had to be operated")) {
      return enforceNoteLimit(cleaned, 70);
    }
  }

  if (context.description && context.description.trim().length > 0) {
    const cleaned = cleanRawSocialMetadata(context.description);
    if (cleaned.length > 10 && !cleaned.toLowerCase().startsWith("youtube video by")) {
      return enforceNoteLimit(cleaned, 70);
    }
  }

  const subjectTitle = enforceTitleLimit(
    context.rawTitle || context.description || context.note || "this creative subject",
    14
  );

  return enforceNoteLimit(
    `Explores core concepts, creative techniques, and actionable takeaways for ${subjectTitle.toLowerCase()} in video production planning.`,
    70
  );
}

export async function suggestAiTitleAndNote(
  context: TitlingContext
): Promise<{ title: string; note: string }> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    return {
      title: fallbackConservativeTitle(context),
      note: fallbackContentNote(context)
    };
  }

  const promptText = [
    "You are an expert video ideation assistant. Analyze the given content and output a JSON object with two fields:",
    '1. "title": A concise, natural title of 10 to 14 words (NEVER exceed 14 words). Capture the complete meaning and main subject of the content naturally without cutting off mid-sentence or leaving incomplete thoughts. Remove all metadata, usernames, hashtags, dates, platform names, and source filler.',
    '2. "note": A comprehensive, natural explanation of what the saved content is about in 2 to 3 complete, well-formed sentences (around 40 to 60 words, never exceed 70 words). Fully explain the core meaning and useful context without cutting off mid-sentence. Do NOT include likes, comments, dates, usernames, platform names, or hashtags, and do NOT repeat the title.',
    "",
    "Rules:",
    "- title: 10 to 14 words maximum (never > 14 words). Must be a complete, meaningful title.",
    "- note: 40 to 60 words (never > 70 words). Must be complete, grammatical sentences ending with proper punctuation.",
    "- Output ONLY valid JSON: {\"title\": \"...\", \"note\": \"...\"}.",
    "",
    `Title: ${context.rawTitle || "Untitled"}`,
    context.sourceType ? `Source Type: ${context.sourceType}` : null,
    context.creatorName ? `Creator: ${context.creatorName}` : null,
    context.description ? `Content/Description: ${context.description}` : null,
    context.url ? `URL: ${context.url}` : null,
    context.note ? `Existing Note: ${context.note}` : null
  ]
    .filter(Boolean)
    .join("\n");

  const contentPayload: unknown = context.imageUrl
    ? [
        { type: "text", text: promptText },
        { type: "image_url", image_url: { url: context.imageUrl } }
      ]
    : promptText;

  const modelsToTry = ["gpt-4o-mini"];

  for (const model of modelsToTry) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        signal: AbortSignal.timeout(12_000),
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You generate clean, complete, and strictly length-limited video idea metadata. Return JSON with 'title' (complete title, 10-14 words max) and 'note' (complete explanation in finished sentences, 40-60 words, max 70 words)."
            },
            {
              role: "user",
              content: contentPayload
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 350
        })
      });

      if (!response.ok) continue;

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const rawJson = data.choices?.[0]?.message?.content?.trim();
      if (rawJson) {
        const parsed = JSON.parse(rawJson) as { title?: string; note?: string };
        const title = parsed.title
          ? enforceTitleLimit(parsed.title, 14)
          : fallbackConservativeTitle(context);
        const note = parsed.note
          ? enforceNoteLimit(parsed.note, 70)
          : fallbackContentNote(context);

        return { title, note };
      }
    } catch {
      // fallback to next attempt / default
    }
  }

  return {
    title: fallbackConservativeTitle(context),
    note: fallbackContentNote(context)
  };
}

export async function suggestAiTitle(context: TitlingContext): Promise<string> {
  const result = await suggestAiTitleAndNote(context);
  return result.title;
}

export async function suggestAiNote(context: TitlingContext): Promise<string> {
  const result = await suggestAiTitleAndNote(context);
  return result.note;
}
