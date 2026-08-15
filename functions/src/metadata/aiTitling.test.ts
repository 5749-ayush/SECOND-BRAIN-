import { describe, expect, it, vi } from "vitest";
import {
  cleanRawSocialMetadata,
  enforceNoteLimit,
  enforceTitleLimit,
  fallbackConservativeTitle,
  fallbackContentNote,
  suggestAiTitle,
  suggestAiTitleAndNote
} from "./aiTitling.js";

describe("cleanRawSocialMetadata", () => {
  it("strips like counts, comments, and author preamble", () => {
    const raw = `799 likes, 1,074 comments - thevibeunder on August 8, 2026: "100 AI Agents Working on One Task."`;
    expect(cleanRawSocialMetadata(raw)).toBe("100 AI Agents Working on One Task.");
  });

  it("strips Instagram complex preambles with counts, dates, and quotes", () => {
    const raw = `2,258 likes, 2,185 comments thevibefounder on July 15, 2026: "Every AI Builder Needs These 8 Tools The internet is the fuel behind every AI product. And these 8 open-source tools help you collect, structure, and automate web data like a pro. #ai #tech"`;
    const cleaned = cleanRawSocialMetadata(raw);
    expect(cleaned).not.toContain("2,258 likes");
    expect(cleaned).not.toContain("thevibefounder");
    expect(cleaned).not.toContain("July 15, 2026");
    expect(cleaned).not.toContain("#ai");
    expect(cleaned).toContain("Every AI Builder Needs These 8 Tools");
  });

  it("strips Twitter/X attribution prefixes and hashtags", () => {
    const raw = `Ajay Yadav on X: "Building autonomous systems requires clean tool definitions #buildinpublic"`;
    const cleaned = cleanRawSocialMetadata(raw);
    expect(cleaned).not.toContain("on X:");
    expect(cleaned).not.toContain("#buildinpublic");
    expect(cleaned).toBe("Building autonomous systems requires clean tool definitions");
  });
});

describe("enforceTitleLimit", () => {
  it("strictly enforces maximum 14 words without cutting words mid-sentence or leaving trailing dangling symbols", () => {
    const longTitle = "Every AI Builder Needs These Eight Open Source Tools To Automate Workflows In Production Enterprise Environments Worldwide Today";
    const title = enforceTitleLimit(longTitle, 14);
    expect(title.split(/\s+/).length).toBeLessThanOrEqual(14);
    expect(title).toBe("Every AI Builder Needs These Eight Open Source Tools To Automate Workflows In Production");
  });

  it("extracts short punchy clause if delimiter exists", () => {
    const titled = "Every AI Builder Needs These 8 Tools: The internet is the fuel behind every AI product.";
    const title = enforceTitleLimit(titled, 14);
    expect(title.split(/\s+/).length).toBeLessThanOrEqual(14);
    expect(title).toBe("Every AI Builder Needs These 8 Tools");
  });

  it("cleans social metadata before measuring words", () => {
    const raw = `Ajay Yadav on Instagram: "Every AI Builder Needs These 8 Tools"`;
    const title = enforceTitleLimit(raw, 14);
    expect(title).toBe("Every AI Builder Needs These 8 Tools");
    expect(title.split(/\s+/).length).toBeLessThanOrEqual(14);
  });
});

describe("enforceNoteLimit", () => {
  it("strictly enforces maximum 70 words with complete sentences", () => {
    const longNote = "Open source tools help developers collect, structure, and automate web data reliably with minimal setup while powering modern autonomous AI agent architectures and enterprise video workflows across the entire industry ecosystem with high reliability and scalable infrastructure for modern creators and engineering teams everywhere across multiple production deployments with continuous integration testing and automated verification across platforms.";
    const note = enforceNoteLimit(longNote, 70);
    expect(note.split(/\s+/).length).toBeLessThanOrEqual(70);
    expect(note.endsWith(".")).toBe(true);
  });

  it("removes likes, comments, and platform noise from notes", () => {
    const raw = `2,258 likes, 2,185 comments thevibefounder on July 15, 2026: "These 8 open-source tools help you collect, structure, and automate web data like a pro."`;
    const note = enforceNoteLimit(raw, 70);
    expect(note).not.toContain("2,258 likes");
    expect(note).not.toContain("thevibefounder");
    expect(note).not.toContain("July 15, 2026");
    expect(note.split(/\s+/).length).toBeLessThanOrEqual(70);
  });
});

describe("fallbackConservativeTitle", () => {
  it("truncates long titles to 14 words max", () => {
    const title = fallbackConservativeTitle({
      rawTitle: "The Complete Guide to Building Production Systems in 2026 With Autonomous AI Tools and Frameworks"
    });
    expect(title.split(/\s+/).length).toBeLessThanOrEqual(14);
    expect(title).toBe("The Complete Guide to Building Production Systems in 2026 With Autonomous AI Tools");
  });

  it("uses description when title is a generic placeholder", () => {
    const title = fallbackConservativeTitle({
      rawTitle: "Saved post",
      description: "Quick tutorial on video editing shortcuts"
    });
    expect(title).toBe("Quick tutorial on video editing shortcuts");
    expect(title.split(/\s+/).length).toBeLessThanOrEqual(14);
  });
});

describe("fallbackContentNote", () => {
  it("generates a clean note within 70 words", () => {
    const note = fallbackContentNote({
      rawTitle: "Claude Prompt Engineering",
      description: "Learn how prompt caching and system instructions improve tool use speed."
    });
    expect(note).toContain("Learn how prompt caching and system instructions improve tool use speed");
    expect(note.split(/\s+/).length).toBeLessThanOrEqual(70);
  });
});

describe("suggestAiTitleAndNote", () => {
  it("calls OpenAI and enforces title <= 14 words and note <= 70 words", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Prime Agent Framework For Coders Building Autonomous Systems Today",
                note: "Open-source recursive tool calling and multi-agent orchestration designed for building autonomous software engineering developer workflows with extensible tool configurations across production environments."
              })
            }
          }
        ]
      })
    }) as unknown as typeof fetch;

    const result = await suggestAiTitleAndNote({
      rawTitle: "Prime Agent: Recursive Orchestration",
      description: "AI agents moving beyond simply answering questions."
    });

    expect(result.title.split(/\s+/).length).toBeLessThanOrEqual(14);
    expect(result.note.split(/\s+/).length).toBeLessThanOrEqual(70);
  });
});
