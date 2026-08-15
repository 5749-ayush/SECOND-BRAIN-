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
  it("fills blank fields from metadata", () => {
    expect(
      mergePreviewWithIdea(
        { title: "", note: "", creatorName: null, customImagePath: null, previewImageUrl: null },
        preview
      )
    ).toEqual(
      expect.objectContaining({
        title: "Fetched title",
        note: "Fetched description",
        creatorName: "Fetched author",
        previewImageUrl: "https://example.com/image.jpg",
        metadataStatus: "ready"
      })
    );
  });

  it("preserves human text and a custom image", () => {
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
        note: "Why it matters to us",
        creatorName: "My attribution",
        previewImageUrl: "https://storage.example/custom.jpg"
      })
    );
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
