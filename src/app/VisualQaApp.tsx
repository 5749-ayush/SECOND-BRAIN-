import { useMemo, useState } from "react";
import type { Category } from "../domain/category";
import type { Idea, IdeaInput } from "../domain/idea";
import { queryIdeas, type LibraryQuery } from "../domain/libraryQuery";
import { IdeaComposer } from "../features/ideas/IdeaComposer";
import { LibraryScreen } from "../features/ideas/LibraryScreen";

function thumbnail(title: string, from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="1200" height="900" fill="url(#g)"/><circle cx="920" cy="180" r="240" fill="none" stroke="#f2d49a" stroke-opacity=".35" stroke-width="2"/><circle cx="920" cy="180" r="135" fill="none" stroke="#f2d49a" stroke-opacity=".2" stroke-width="2"/><text x="72" y="735" fill="#f8f2e8" font-family="Georgia, serif" font-size="74">${title}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const categories: Category[] = [
  { id: "storytelling", name: "Storytelling", normalizedName: "storytelling", color: "#d5a65a", createdAt: "2026-08-15T09:00:00.000Z", createdBy: "owner", updatedAt: "2026-08-15T09:00:00.000Z" },
  { id: "hooks", name: "Hooks", normalizedName: "hooks", color: "#6e9ba1", createdAt: "2026-08-15T09:00:00.000Z", createdBy: "owner", updatedAt: "2026-08-15T09:00:00.000Z" },
  { id: "visuals", name: "Visual language", normalizedName: "visual language", color: "#9b7855", createdAt: "2026-08-15T09:00:00.000Z", createdBy: "owner", updatedAt: "2026-08-15T09:00:00.000Z" }
];

const base: Omit<Idea, "id" | "kind" | "sourceType" | "url" | "canonicalUrl" | "title" | "note" | "creatorName" | "sourceName" | "previewImageUrl" | "categoryIds" | "categoryNames" | "filmDate"> = {
  customImagePath: null,
  metadataStatus: "ready",
  metadataErrorCode: null,
  metadataFetchedAt: "2026-08-15T10:00:00.000Z",
  createdAt: "2026-08-15T10:00:00.000Z",
  createdBy: "owner",
  updatedAt: "2026-08-15T10:00:00.000Z",
  updatedBy: "owner"
};

const ideas: Idea[] = [
  {
    ...base,
    id: "youtube-tension",
    kind: "link",
    sourceType: "youtube",
    url: "https://youtube.com/watch?v=creative",
    canonicalUrl: "https://youtube.com/watch?v=creative",
    title: "Why the best video ideas begin with tension",
    note: "Study the opening rhythm and how quickly the central conflict becomes clear.",
    creatorName: "The Creative Practice",
    sourceName: "YouTube",
    previewImageUrl: thumbnail("Tension creates attention", "#183f48", "#8b5b35"),
    categoryIds: ["storytelling", "hooks"],
    categoryNames: ["Storytelling", "Hooks"],
    filmDate: "2026-08-24"
  },
  {
    ...base,
    id: "truth-hook",
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
  },
  {
    ...base,
    id: "instagram-light",
    kind: "link",
    sourceType: "instagram",
    url: "https://instagram.com/p/light",
    canonicalUrl: "https://instagram.com/p/light",
    title: "Natural light as a narrative device",
    note: "Reference the warm edge light and restrained camera movement.",
    creatorName: "Studio Journal",
    sourceName: "Instagram",
    previewImageUrl: thumbnail("Light / shadow", "#684838", "#152e34"),
    categoryIds: ["visuals"],
    categoryNames: ["Visual language"],
    filmDate: "2026-09-02"
  },
  {
    ...base,
    id: "article-story",
    kind: "link",
    sourceType: "article",
    url: "https://example.com/story-structure",
    canonicalUrl: "https://example.com/story-structure",
    title: "A practical anatomy of memorable short stories",
    note: "Turn the five-part structure into a repeatable short-form template.",
    creatorName: "Field Notes",
    sourceName: "Article",
    previewImageUrl: thumbnail("Structure, then surprise", "#264c4a", "#1a2128"),
    categoryIds: ["storytelling"],
    categoryNames: ["Storytelling"],
    filmDate: null
  },
  {
    ...base,
    id: "x-observation",
    kind: "link",
    sourceType: "x",
    url: "https://x.com/creator/status/1",
    canonicalUrl: "https://x.com/creator/status/1",
    title: "People remember the observation, not the advice",
    note: "Build the script around one sharply noticed detail instead of a list of tips.",
    creatorName: "@framebyframe",
    sourceName: "X",
    previewImageUrl: null,
    categoryIds: ["hooks"],
    categoryNames: ["Hooks"],
    filmDate: "2026-08-29"
  },
  {
    ...base,
    id: "reference-contrast",
    kind: "image",
    sourceType: "image",
    url: null,
    canonicalUrl: null,
    title: "Quiet frame, loud idea",
    note: "Use negative space so a single sentence carries the visual weight.",
    creatorName: "Moodboard reference",
    sourceName: "Image",
    previewImageUrl: thumbnail("Quiet frame / loud idea", "#0c242c", "#85643e"),
    categoryIds: ["visuals", "hooks"],
    categoryNames: ["Visual language", "Hooks"],
    filmDate: null,
    metadataStatus: "not_required",
    metadataFetchedAt: null
  }
];

export function App() {
  const [composerOpen, setComposerOpen] = useState(false);
  const [query, setQuery] = useState<LibraryQuery>({
    text: "",
    categoryIds: [],
    sourceTypes: [],
    filmDateState: "any",
    sort: "newest",
    today: "2026-08-15"
  });
  const visibleIdeas = useMemo(() => queryIdeas(ideas, query), [query]);

  return (
    <>
      <LibraryScreen
        ideas={visibleIdeas}
        hasAnyIdeas
        categories={categories}
        query={query}
        onQueryChange={setQuery}
        onOpenIdea={() => undefined}
        onSaveIdea={() => setComposerOpen(true)}
        onOpenProfile={() => undefined}
      />
      <IdeaComposer
        open={composerOpen}
        categories={categories}
        onClose={() => setComposerOpen(false)}
        onCreateIdea={async (_input: IdeaInput) => undefined}
        onCreateImageIdea={async (_input: IdeaInput, _file: File) => undefined}
        onCreateCategory={async (name) => ({ ...categories[0], id: name, name })}
      />
    </>
  );
}
