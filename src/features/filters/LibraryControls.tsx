import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Category } from "../../domain/category";
import type { SourceType } from "../../domain/idea";
import type { LibraryQuery } from "../../domain/libraryQuery";

interface LibraryControlsProps {
  query: LibraryQuery;
  categories: Category[];
  onChange: (query: LibraryQuery) => void;
}

const sourceOptions: { value: SourceType | ""; label: string }[] = [
  { value: "", label: "All sources" },
  { value: "youtube", label: "YouTube" },
  { value: "x", label: "X / Twitter" },
  { value: "instagram", label: "Instagram" },
  { value: "article", label: "Articles" },
  { value: "image", label: "Images" },
  { value: "note", label: "Loose ideas" }
];

export function LibraryControls({ query, categories, onChange }: LibraryControlsProps) {
  const [text, setText] = useState(query.text);
  useEffect(() => setText(query.text), [query.text]);
  const hasFilters =
    Boolean(query.text) ||
    query.categoryIds.length > 0 ||
    query.sourceTypes.length > 0 ||
    query.filmDateState !== "any" ||
    query.sort !== "newest";

  return (
    <section className="library-controls" aria-label="Find ideas">
      <label className="search-field">
        <Search size={17} />
        <span className="sr-only">Search ideas</span>
        <input
          type="search"
          value={text}
          aria-label="Search ideas"
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            onChange({ ...query, text: next });
          }}
          placeholder="Search the library…"
        />
      </label>
      <div className="filter-row">
        <SlidersHorizontal size={16} aria-hidden="true" />
        <label>
          <span className="sr-only">Source type</span>
          <select
            aria-label="Source type"
            value={query.sourceTypes[0] ?? ""}
            onChange={(event) =>
              onChange({
                ...query,
                sourceTypes: event.target.value ? [event.target.value as SourceType] : []
              })
            }
          >
            {sourceOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Film date</span>
          <select
            aria-label="Film date"
            value={query.filmDateState}
            onChange={(event) =>
              onChange({ ...query, filmDateState: event.target.value as LibraryQuery["filmDateState"] })
            }
          >
            <option value="any">Any film date</option>
            <option value="planned">Planned</option>
            <option value="unplanned">Unplanned</option>
            <option value="overdue">Overdue</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Sort ideas</span>
          <select
            aria-label="Sort ideas"
            value={query.sort}
            onChange={(event) => onChange({ ...query, sort: event.target.value as LibraryQuery["sort"] })}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="upcoming">Upcoming film date</option>
          </select>
        </label>
        {hasFilters && (
          <button
            className="clear-filters"
            type="button"
            onClick={() =>
              onChange({
                text: "",
                categoryIds: [],
                sourceTypes: [],
                filmDateState: "any",
                sort: "newest",
                today: query.today
              })
            }
          >
            <X size={14} /> Reset
          </button>
        )}
      </div>
      {categories.length > 0 && (
        <div className="category-filter-row" aria-label="Filter by category">
          {categories.map((category) => {
            const active = query.categoryIds.includes(category.id);
            return (
              <button
                type="button"
                className={active ? "category-filter active" : "category-filter"}
                aria-pressed={active}
                key={category.id}
                onClick={() =>
                  onChange({
                    ...query,
                    categoryIds: active
                      ? query.categoryIds.filter((id) => id !== category.id)
                      : [...query.categoryIds, category.id]
                  })
                }
              >
                <span style={{ background: category.color }} /> {category.name}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
