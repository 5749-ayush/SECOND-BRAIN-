import { describe, expect, it } from "vitest";
import {
  detectSourceType,
  extractYouTubeVideoId,
  extractXTweetId,
  getYouTubeThumbnail,
  getXThumbnail,
  isDirectImageUrl,
  normalizePublicUrl
} from "./source";
import { ideaInputSchema } from "./idea";

describe("detectSourceType", () => {
  it.each([
    ["https://youtu.be/abc", "youtube"],
    ["https://www.youtube.com/watch?v=abc", "youtube"],
    ["https://www.youtube.com/shorts/abc", "youtube"],
    ["https://x.com/user/status/1", "x"],
    ["https://twitter.com/user/status/1", "x"],
    ["https://fxtwitter.com/user/status/1", "x"],
    ["https://www.instagram.com/p/abc/", "instagram"],
    ["https://example.com/photo.jpg", "image"],
    ["https://images.unsplash.com/photo-123.png?auto=format", "image"],
    ["https://example.com/story", "article"]
  ] as const)("detects %s as %s", (url, expected) => {
    expect(detectSourceType(url)).toBe(expected);
  });

  it("extracts YouTube video ID and thumbnail URL correctly", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(getYouTubeThumbnail("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
    );
  });

  it("extracts X/Twitter tweet ID and thumbnail URL correctly", () => {
    expect(extractXTweetId("https://x.com/Dan_Kornas/status/18247000213123")).toBe("18247000213123");
    expect(extractXTweetId("https://twitter.com/user/status/9876543210")).toBe("9876543210");
    expect(extractXTweetId("https://fxtwitter.com/user/status/11223344")).toBe("11223344");
    expect(getXThumbnail("https://x.com/Dan_Kornas/status/18247000213123")).toBe(
      "https://d.fxtwitter.com/i/status/18247000213123.jpg"
    );
  });

  it("generates editorial thumbnail for text-only X posts", () => {
    const dataUri = getXThumbnail(
      "https://x.com/user",
      "Budget dashboards show where your money went",
      "Dan Kornas"
    );
    expect(dataUri).toContain("data:image/svg+xml");
    expect(decodeURIComponent(dataUri ?? "")).toContain("Budget dashboards show");
    expect(decodeURIComponent(dataUri ?? "")).toContain("DAN KORNAS");
  });

  it("checks direct image URLs correctly", () => {
    expect(isDirectImageUrl("https://example.com/banner.jpg")).toBe(true);
    expect(isDirectImageUrl("https://example.com/article")).toBe(false);
  });

  it("rejects non-public web protocols", () => {
    expect(() => detectSourceType("file:///private.txt")).toThrow("http");
  });
});

describe("normalizePublicUrl", () => {
  it("normalizes host casing and removes a fragment", () => {
    expect(normalizePublicUrl("HTTPS://Example.COM/story#comments")).toBe(
      "https://example.com/story"
    );
  });
});

describe("ideaInputSchema", () => {
  it("accepts a loose idea without a URL or categories", () => {
    const parsed = ideaInputSchema.parse({
      kind: "note",
      sourceType: "note",
      url: null,
      title: "A quiet opening hook",
      note: "Begin with the consequence before explaining the cause.",
      creatorName: null,
      categoryIds: [],
      filmDate: null
    });

    expect(parsed.categoryIds).toEqual([]);
  });

  it("rejects an invalid film date", () => {
    expect(() =>
      ideaInputSchema.parse({
        kind: "note",
        sourceType: "note",
        url: null,
        title: "Idea",
        note: "",
        creatorName: null,
        categoryIds: [],
        filmDate: "15-08-2026"
      })
    ).toThrow();
  });

  it("enforces title maximum 14 words and note maximum 70 words with metadata stripped", () => {
    const parsed = ideaInputSchema.parse({
      kind: "link",
      sourceType: "instagram",
      url: "https://www.instagram.com/p/DA123/",
      title: 'Ajay Yadav on Instagram: "Every AI Builder Needs These 8 Tools The internet is the fuel behind every AI product."',
      note: '2,258 likes, 2,185 comments thevibefounder on July 15, 2026: "Every AI Builder Needs These 8 Tools The internet is the fuel behind every AI product. And these 8 open-source tools help you collect, structure, and automate web data like a pro."',
      creatorName: "@thevibefounder",
      categoryIds: [],
      filmDate: null
    });

    expect(parsed.title.split(/\s+/).length).toBeLessThanOrEqual(14);
    expect(parsed.title).toBe("Every AI Builder Needs These 8 Tools The internet is the fuel behind every");
    expect(parsed.note.split(/\s+/).length).toBeLessThanOrEqual(70);
    expect(parsed.note).not.toContain("2,258 likes");
    expect(parsed.note).not.toContain("thevibefounder");
    expect(parsed.note).not.toContain("July 15, 2026");
  });
});

