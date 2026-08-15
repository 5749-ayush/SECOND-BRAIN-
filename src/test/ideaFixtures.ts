import type { Idea } from "../domain/idea";

export const richIdea: Idea = {
  id: "youtube-idea",
  kind: "link",
  sourceType: "youtube",
  url: "https://youtube.com/watch?v=creative",
  canonicalUrl: "https://youtube.com/watch?v=creative",
  title: "Why the best video ideas begin with tension",
  note: "Study the first thirty seconds and adapt the pacing.",
  creatorName: "The Creative Practice",
  sourceName: "YouTube",
  previewImageUrl: "https://i.ytimg.com/vi/creative/hqdefault.jpg",
  customImagePath: null,
  categoryIds: ["storytelling", "hooks"],
  categoryNames: ["Storytelling", "Hooks"],
  filmDate: "2026-08-24",
  metadataStatus: "ready",
  metadataErrorCode: null,
  metadataFetchedAt: "2026-08-15T10:00:00.000Z",
  createdAt: "2026-08-15T10:00:00.000Z",
  createdBy: "owner",
  updatedAt: "2026-08-15T10:00:00.000Z",
  updatedBy: "owner"
};

export const noteIdea: Idea = {
  ...richIdea,
  id: "note-idea",
  kind: "note",
  sourceType: "hook",
  url: null,
  canonicalUrl: null,
  title: "Open with the uncomfortable truth",
  note: "The viewer should recognize the problem before we name the solution.",
  creatorName: null,
  sourceName: null,
  previewImageUrl: null,
  categoryIds: [],
  categoryNames: [],
  filmDate: null,
  metadataStatus: "not_required",
  metadataFetchedAt: null
};
