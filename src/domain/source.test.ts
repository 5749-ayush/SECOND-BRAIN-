import { describe, expect, it } from "vitest";
import { detectSourceType, normalizePublicUrl } from "./source";
import { ideaInputSchema } from "./idea";

describe("detectSourceType", () => {
  it.each([
    ["https://youtu.be/abc", "youtube"],
    ["https://www.youtube.com/watch?v=abc", "youtube"],
    ["https://x.com/user/status/1", "x"],
    ["https://twitter.com/user/status/1", "x"],
    ["https://www.instagram.com/p/abc/", "instagram"],
    ["https://example.com/story", "article"]
  ] as const)("detects %s as %s", (url, expected) => {
    expect(detectSourceType(url)).toBe(expected);
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
});
