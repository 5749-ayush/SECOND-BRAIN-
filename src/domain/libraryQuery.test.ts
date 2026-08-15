import { describe, expect, it } from "vitest";
import type { Idea } from "./idea";
import { queryIdeas } from "./libraryQuery";

const ideas: Idea[] = [
  {
    id: "matching-idea",
    kind: "link",
    sourceType: "youtube",
    url: "https://youtube.com/watch?v=launch",
    canonicalUrl: null,
    title: "Launch story breakdown",
    note: "A strong opening for the product launch",
    creatorName: "Studio Notes",
    sourceName: "YouTube",
    previewImageUrl: null,
    customImagePath: null,
    categoryIds: ["strategy"],
    categoryNames: ["Strategy"],
    filmDate: "2026-08-20",
    metadataStatus: "ready",
    metadataErrorCode: null,
    metadataFetchedAt: "2026-08-15T08:00:00.000Z",
    createdAt: "2026-08-15T08:00:00.000Z",
    createdBy: "owner",
    updatedAt: "2026-08-15T08:00:00.000Z",
    updatedBy: "owner"
  },
  {
    id: "older-note",
    kind: "note",
    sourceType: "hook",
    url: null,
    canonicalUrl: null,
    title: "Contrarian hook",
    note: "A different angle",
    creatorName: null,
    sourceName: null,
    previewImageUrl: null,
    customImagePath: null,
    categoryIds: ["hooks"],
    categoryNames: ["Hooks"],
    filmDate: null,
    metadataStatus: "not_required",
    metadataErrorCode: null,
    metadataFetchedAt: null,
    createdAt: "2026-08-10T08:00:00.000Z",
    createdBy: "owner",
    updatedAt: "2026-08-10T08:00:00.000Z",
    updatedBy: "owner"
  },
  {
    id: "overdue-article",
    kind: "link",
    sourceType: "article",
    url: "https://example.com/economics",
    canonicalUrl: null,
    title: "Economics of attention",
    note: "Reference for a long-form video",
    creatorName: "Example Journal",
    sourceName: "Example",
    previewImageUrl: null,
    customImagePath: null,
    categoryIds: ["research"],
    categoryNames: ["Research"],
    filmDate: "2026-08-14",
    metadataStatus: "ready",
    metadataErrorCode: null,
    metadataFetchedAt: "2026-08-12T08:00:00.000Z",
    createdAt: "2026-08-12T08:00:00.000Z",
    createdBy: "member",
    updatedAt: "2026-08-12T08:00:00.000Z",
    updatedBy: "member"
  }
];

describe("queryIdeas", () => {
  it("searches text and combines category, source, and planned-date filters", () => {
    const result = queryIdeas(ideas, {
      text: "launch",
      categoryIds: ["strategy"],
      sourceTypes: ["youtube"],
      filmDateState: "planned",
      sort: "upcoming",
      today: "2026-08-15"
    });

    expect(result.map((idea) => idea.id)).toEqual(["matching-idea"]);
  });

  it("finds text in attribution and category names without case sensitivity", () => {
    const result = queryIdeas(ideas, {
      text: "EXAMPLE JOURNAL",
      categoryIds: [],
      sourceTypes: [],
      filmDateState: "any",
      sort: "newest",
      today: "2026-08-15"
    });

    expect(result.map((idea) => idea.id)).toEqual(["overdue-article"]);
  });

  it("identifies overdue and unplanned ideas", () => {
    const overdue = queryIdeas(ideas, {
      text: "",
      categoryIds: [],
      sourceTypes: [],
      filmDateState: "overdue",
      sort: "oldest",
      today: "2026-08-15"
    });
    const unplanned = queryIdeas(ideas, {
      text: "",
      categoryIds: [],
      sourceTypes: [],
      filmDateState: "unplanned",
      sort: "oldest",
      today: "2026-08-15"
    });

    expect(overdue.map((idea) => idea.id)).toEqual(["overdue-article"]);
    expect(unplanned.map((idea) => idea.id)).toEqual(["older-note"]);
  });

  it("sorts upcoming dates before undated ideas without mutating input", () => {
    const originalOrder = ideas.map((idea) => idea.id);
    const result = queryIdeas(ideas, {
      text: "",
      categoryIds: [],
      sourceTypes: [],
      filmDateState: "any",
      sort: "upcoming",
      today: "2026-08-15"
    });

    expect(result.map((idea) => idea.id)).toEqual([
      "overdue-article",
      "matching-idea",
      "older-note"
    ]);
    expect(ideas.map((idea) => idea.id)).toEqual(originalOrder);
  });
});
