import {
  ArrowUpRight,
  CalendarDays,
  Camera,
  FileText,
  Image as ImageIcon,
  Lightbulb,
  Link2,
  Play,
  Quote,
  Sparkles,
  Video
} from "lucide-react";
import { useState, type ComponentType } from "react";
import type { Idea, SourceType } from "../../domain/idea";
import { enforceIdeaNote, enforceIdeaTitle } from "../../domain/idea";
import { generateXEditorialThumbnail, getXThumbnail } from "../../domain/source";

interface IdeaCardProps {
  idea: Idea;
  onOpen: (idea: Idea) => void;
}

const sourceDetails: Record<
  SourceType,
  { label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }> }
> = {
  youtube: { label: "YouTube", icon: Video },
  x: { label: "X", icon: Link2 },
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

export function formatCardTitle(rawTitle: string | null | undefined, description?: string | null): string {
  if (!rawTitle || rawTitle.trim() === "") {
    if (description && description.trim().length > 0) {
      return formatCardTitle(description);
    }
    return "Untitled idea";
  }

  const formatted = enforceIdeaTitle(rawTitle, 14);
  return formatted || "Untitled idea";
}

export function formatCardNote(
  rawNote: string | null | undefined,
  rawDescription?: string | null | undefined
): string | null {
  if (rawNote && rawNote.trim().length > 0) {
    const formatted = enforceIdeaNote(rawNote, 70);
    if (
      formatted.length > 0 &&
      !formatted.toLowerCase().includes("it had to be operated") &&
      !/^[0-9,.]+[KkMmBb]?\s+likes/i.test(formatted)
    ) {
      return formatted;
    }
  }

  if (rawDescription && rawDescription.trim().length > 0) {
    const formatted = enforceIdeaNote(rawDescription, 70);
    if (
      formatted.length > 0 &&
      !formatted.toLowerCase().startsWith("youtube video by") &&
      !/^[0-9,.]+[KkMmBb]?\s+likes/i.test(formatted)
    ) {
      return formatted;
    }
  }

  return null;
}

export function IdeaCard({ idea, onOpen }: IdeaCardProps) {
  const [imageError, setImageError] = useState(false);
  const source = sourceDetails[idea.sourceType] ?? sourceDetails.other;
  const SourceIcon = source.icon;
  const displayTitle = formatCardTitle(idea.title, idea.description);
  const displayNote = formatCardNote(idea.note, idea.description);
  const displaySourceLabel = idea.sourceName || source.label;

  let effectivePreviewImageUrl: string | null = null;
  if (!imageError && idea.previewImageUrl) {
    effectivePreviewImageUrl = idea.previewImageUrl;
  } else if (idea.sourceType === "x") {
    if (!imageError && idea.url) {
      effectivePreviewImageUrl = getXThumbnail(idea.url, displayTitle, idea.creatorName);
    } else {
      effectivePreviewImageUrl = generateXEditorialThumbnail(displayTitle, idea.creatorName);
    }
  }

  const hasImage = Boolean(effectivePreviewImageUrl);
  const isNote = idea.kind === "note" && !hasImage;
  const isYouTube = idea.sourceType === "youtube";

  return (
    <article className={`idea-card ${isNote ? "idea-card-note" : ""}`}>
      <button
        className="idea-card-action"
        type="button"
        onClick={() => onOpen(idea)}
        aria-label={`Open ${displayTitle}`}
      >
        {!isNote && (
          <div className={`idea-card-media ${!hasImage ? "media-canvas" : ""}`}>
            {hasImage ? (
              <img
                src={effectivePreviewImageUrl ?? ""}
                alt={displayTitle}
                loading="lazy"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="media-canvas-icon" aria-hidden="true">
                <SourceIcon size={22} strokeWidth={1.8} />
              </div>
            )}
            <span className="media-wash" aria-hidden="true" />
            {isYouTube && hasImage && (
              <span className="video-badge" aria-hidden="true">
                <Play size={14} fill="currentColor" />
              </span>
            )}
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
          <div className="idea-card-body">
            <div className="idea-card-meta">
              <span className="source-label">
                <SourceIcon size={13} strokeWidth={2} />
                {displaySourceLabel}
              </span>
              <ArrowUpRight className="card-arrow" size={15} aria-hidden="true" />
            </div>

            <h3>{displayTitle}</h3>
            {idea.creatorName && <p className="idea-creator">{idea.creatorName}</p>}

            {displayNote && (
              <p className={isNote ? "note-copy" : "idea-note"}>
                {!isNote && <span className="note-tag">Note: </span>}
                {displayNote}
              </p>
            )}
          </div>

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
                  <CalendarDays size={13} />
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

