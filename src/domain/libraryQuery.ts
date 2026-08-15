import type { Idea, SourceType } from "./idea";

export type FilmDateState = "any" | "planned" | "unplanned" | "overdue";
export type LibrarySort = "newest" | "oldest" | "upcoming";

export interface LibraryQuery {
  text: string;
  categoryIds: string[];
  sourceTypes: SourceType[];
  filmDateState: FilmDateState;
  sort: LibrarySort;
  today: string;
}

function searchDocument(idea: Idea): string {
  return [
    idea.title,
    idea.note,
    idea.creatorName,
    idea.sourceName,
    idea.url,
    ...idea.categoryNames
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLocaleLowerCase();
}

function matchesFilmDate(idea: Idea, state: FilmDateState, today: string) {
  if (state === "any") return true;
  if (state === "planned") return idea.filmDate !== null;
  if (state === "unplanned") return idea.filmDate === null;
  return idea.filmDate !== null && idea.filmDate < today;
}

export function queryIdeas(ideas: readonly Idea[], query: LibraryQuery): Idea[] {
  const needle = query.text.trim().toLocaleLowerCase();
  const filtered = ideas.filter((idea) => {
    const matchesText = !needle || searchDocument(idea).includes(needle);
    const matchesCategories = query.categoryIds.every((categoryId) =>
      idea.categoryIds.includes(categoryId)
    );
    const matchesSource =
      query.sourceTypes.length === 0 || query.sourceTypes.includes(idea.sourceType);

    return (
      matchesText &&
      matchesCategories &&
      matchesSource &&
      matchesFilmDate(idea, query.filmDateState, query.today)
    );
  });

  return [...filtered].sort((left, right) => {
    if (query.sort === "newest") {
      return right.createdAt.localeCompare(left.createdAt);
    }
    if (query.sort === "oldest") {
      return left.createdAt.localeCompare(right.createdAt);
    }
    if (left.filmDate === null && right.filmDate === null) {
      return right.createdAt.localeCompare(left.createdAt);
    }
    if (left.filmDate === null) return 1;
    if (right.filmDate === null) return -1;
    return left.filmDate.localeCompare(right.filmDate);
  });
}
