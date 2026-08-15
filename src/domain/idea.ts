import { z } from "zod";

export const sourceTypeSchema = z.enum([
  "youtube",
  "x",
  "instagram",
  "article",
  "image",
  "reference",
  "reaction",
  "hook",
  "note",
  "other"
]);

export type SourceType = z.infer<typeof sourceTypeSchema>;

export const ideaKindSchema = z.enum(["link", "image", "note"]);
export const metadataStatusSchema = z.enum([
  "not_required",
  "pending",
  "ready",
  "failed"
]);

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date format YYYY-MM-DD.");

export function cleanSocialMetadata(raw: string | null | undefined): string {
  if (!raw) return "";
  let text = raw;

  text = text.replace(
    /^[0-9,.]+[KkMmBb]?\s+likes[,\s]+[0-9,.]+[KkMmBb]?\s+comments\s*[-–—:]*\s*(?:[A-Za-z0-9_.]+\s+on\s+[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}:?\s*)?["“]?/i,
    ""
  );

  text = text.replace(
    /\b[0-9,.]+[KkMmBb]?\s+(?:likes?|comments?|views?|reposts?|retweets?|quotes?)\b[,\s]*/gi,
    ""
  );

  text = text.replace(
    /^.+?\s+on\s+(?:Instagram|Twitter|X|TikTok|YouTube|Threads|Facebook):\s*["“]?/i,
    ""
  );

  text = text.replace(
    /^[A-Za-z0-9_.]+\s+on\s+[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}:\s*["“]?/i,
    ""
  );

  text = text.replace(
    /\b(?:on\s+)?(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}:?\b/gi,
    ""
  );

  text = text.replace(/^(?:YouTube video by|Instagram post by|Tweet from|Post from)\s+[^:]+:\s*/i, "");
  text = text.replace(/\s+[|\-–—]\s+(?:YouTube|Instagram|Twitter|X|TikTok|The Verge|Medium|Substack|Reddit)[^|\-–—]*$/i, "");
  text = text.replace(/•\s*Instagram photos and videos/gi, "");

  text = text.replace(
    /(?:comment|dm|reply|message)\s+["']?[A-Za-z0-9_]+["']?\s+(?:and|to|for)\s+[^.!?\n]+[.!?\n]?/gi,
    ""
  );
  text = text.replace(/\b(?:link in bio|follow for more|save for later|share with a friend)\b[.!?]?/gi, "");

  text = text.replace(/#[a-zA-Z0-9_]+/g, "");
  text = text.replace(/https?:\/\/\S+/g, "");

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

export function enforceIdeaTitle(rawText: string | null | undefined, maxWords: number = 14): string {
  const cleaned = cleanSocialMetadata(rawText);
  if (!cleaned) return "";

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
    return cleanTrailingDangling(words.join(" "));
  }

  return cleanTrailingDangling(words.slice(0, maxWords).join(" "));
}

export function enforceIdeaNote(rawText: string | null | undefined, maxWords: number = 70): string {
  const cleaned = cleanSocialMetadata(rawText);
  if (!cleaned) return "";

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    const text = cleanTrailingDangling(words.join(" "));
    if (!text) return "";
    return /[.!?]$/.test(text) ? text : `${text}.`;
  }

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

export const ideaInputSchema = z
  .object({
    kind: ideaKindSchema,
    sourceType: sourceTypeSchema,
    url: z.url().nullable(),
    title: z.string().trim().max(240).transform((val) => (val ? enforceIdeaTitle(val, 14) : "")),
    note: z.string().trim().max(10_000).transform((val) => (val ? enforceIdeaNote(val, 70) : "")),
    creatorName: z.string().trim().max(160).nullable(),
    categoryIds: z.array(z.string().min(1)).max(20),
    filmDate: dateOnlySchema.nullable()
  })
  .superRefine((idea, context) => {
    if (idea.kind === "link" && !idea.url) {
      context.addIssue({
        code: "custom",
        path: ["url"],
        message: "A link idea needs a valid URL."
      });
    }

    if (!idea.title && !idea.note && !idea.url) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "Add a title, note, or URL."
      });
    }
  });

export type IdeaInput = z.infer<typeof ideaInputSchema>;

export interface Idea extends IdeaInput {
  id: string;
  canonicalUrl: string | null;
  sourceName: string | null;
  description?: string | null;
  previewImageUrl: string | null;
  customImagePath: string | null;
  categoryNames: string[];
  metadataStatus: z.infer<typeof metadataStatusSchema>;
  metadataErrorCode: string | null;
  metadataFetchedAt: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export const emptyIdeaInput: IdeaInput = {
  kind: "note",
  sourceType: "note",
  url: null,
  title: "",
  note: "",
  creatorName: null,
  categoryIds: [],
  filmDate: null
};
