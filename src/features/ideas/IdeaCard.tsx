import {
  ArrowUpRight,
  CalendarDays,
  Camera,
  FileText,
  Image as ImageIcon,
  Lightbulb,
  Link2,
  Quote,
  Sparkles,
  Video
} from "lucide-react";
import type { ComponentType } from "react";
import type { Idea, SourceType } from "../../domain/idea";

interface IdeaCardProps {
  idea: Idea;
  onOpen: (idea: Idea) => void;
}

const sourceDetails: Record<
  SourceType,
  { label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }> }
> = {
  youtube: { label: "YouTube", icon: Video },
  x: { label: "X / Twitter", icon: Link2 },
  instagram: { label: "Instagram", icon: Camera },
  article: { label: "Article", icon: FileText },
  image: { label: "Visual reference", icon: ImageIcon },
  reference: { label: "Reference", icon: Link2 },
  reaction: { label: "Reaction", icon: Sparkles },
  hook: { label: "Loose thought", icon: Quote },
  note: { label: "Loose thought", icon: Lightbulb },
  other: { label: "Saved idea", icon: Sparkles }
};

function formatFilmDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year ?? 2000, (month ?? 1) - 1, day ?? 1)));
}

export function IdeaCard({ idea, onOpen }: IdeaCardProps) {
  const source = sourceDetails[idea.sourceType];
  const SourceIcon = source.icon;
  const hasImage = Boolean(idea.previewImageUrl);
  const isNote = idea.kind === "note" && !hasImage;

  return (
    <article className={`idea-card ${isNote ? "idea-card-note" : ""}`}>
      <button
        className="idea-card-action"
        type="button"
        onClick={() => onOpen(idea)}
        aria-label={`Open ${idea.title || "saved idea"}`}
      >
        {hasImage && (
          <div className="idea-card-media">
            <img src={idea.previewImageUrl ?? ""} alt={idea.title} loading="lazy" />
            <span className="media-wash" aria-hidden="true" />
          </div>
        )}

        {idea.metadataStatus === "pending" && !hasImage && (
          <div className="preview-building" aria-live="polite">
            <span className="preview-shimmer" />
            <span>Building preview…</span>
          </div>
        )}

        {isNote && (
          <div className="note-mark" aria-hidden="true">
            <Quote size={32} strokeWidth={1.4} />
          </div>
        )}

        <div className="idea-card-content">
          <div className="idea-card-meta">
            <span className="source-label">
              <SourceIcon size={14} strokeWidth={1.8} />
              {source.label}
            </span>
            <ArrowUpRight className="card-arrow" size={16} aria-hidden="true" />
          </div>

          <h3>{idea.title || "Untitled idea"}</h3>
          {idea.creatorName && <p className="idea-creator">{idea.creatorName}</p>}
          {idea.note && <p className={isNote ? "note-copy" : "idea-note"}>{idea.note}</p>}

          {(idea.categoryNames.length > 0 || idea.filmDate) && (
            <div className="idea-card-footer">
              {idea.categoryNames.length > 0 && (
                <div className="category-list" aria-label="Categories">
                  {idea.categoryNames.slice(0, 3).map((category) => (
                    <span className="category-pill" key={category}>
                      {category}
                    </span>
                  ))}
                </div>
              )}
              {idea.filmDate && (
                <span className="film-date" title={`Film on ${idea.filmDate}`}>
                  <CalendarDays size={14} />
                  {formatFilmDate(idea.filmDate)}
                </span>
              )}
            </div>
          )}
        </div>
      </button>
    </article>
  );
}
