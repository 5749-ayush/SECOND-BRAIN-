import { describe, expect, it } from "vitest";
import { buildFailedMetadataUpdate, mergePreviewWithIdea } from "./enrichIdea.js";

const preview = {
  title: "Fetched title",
  description: "Fetched description",
  imageUrl: "https://example.com/image.jpg",
  authorName: "Fetched author",
  providerName: "Example",
  canonicalUrl: "https://example.com/canonical"
};

describe("mergePreviewWithIdea", () => {
  it("fills blank fields from metadata and ensures title <= 7 words", () => {
    expect(
      mergePreviewWithIdea(
        { title: "", note: "", creatorName: null, customImagePath: null, previewImageUrl: null },
        preview
      )
    ).toEqual(
      expect.objectContaining({
        title: "Fetched title",
        description: "Fetched description",
        note: "",
        creatorName: "Fetched author",
        previewImageUrl: "https://example.com/image.jpg",
        metadataStatus: "ready"
      })
    );
  });

  it("preserves human text while enforcing word limits", () => {
    expect(
      mergePreviewWithIdea(
        {
          title: "My angle",
          note: "Why it matters to us",
          creatorName: "My attribution",
          customImagePath: "workspaces/main/ideas/1/custom.jpg",
          previewImageUrl: "https://storage.example/custom.jpg"
        },
        preview
      )
    ).toEqual(
      expect.objectContaining({
        title: "My angle",
        note: "Why it matters to us.",
        creatorName: "My attribution",
        previewImageUrl: "https://storage.example/custom.jpg"
      })
    );
  });

  it("sanitizes long messy titles from social media down to max 14 words", () => {
    const socialPreview = {
      title: `Ajay Yadav on Instagram: "Every AI Builder Needs These 8 Tools The internet is the fuel behind every AI product."`,
      description: `2,258 likes, 2,185 comments thevibefounder on July 15, 2026: "Every AI Builder Needs These 8 Tools"`,
      imageUrl: "https://example.com/insta.jpg",
      authorName: "@thevibefounder",
      providerName: "Instagram",
      canonicalUrl: "https://instagram.com/p/123"
    };

    const merged = mergePreviewWithIdea(
      { title: "", note: "", creatorName: null, customImagePath: null, previewImageUrl: null },
      socialPreview
    );

    expect(merged.title.split(/\s+/).length).toBeLessThanOrEqual(14);
    expect(merged.title).toBe("Every AI Builder Needs These 8 Tools The internet is the fuel behind every");
    expect(merged.description).not.toContain("2,258 likes");
  });
});

describe("buildFailedMetadataUpdate", () => {
  it("exposes only an approved safe error code", () => {
    expect(buildFailedMetadataUpdate(new Error("internal stack and secret"))).toEqual({
      metadataStatus: "failed",
      metadataErrorCode: "invalid_response"
    });
  });
});
