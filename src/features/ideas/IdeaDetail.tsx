import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import type { Category } from "../../domain/category";
import type { Idea, IdeaInput } from "../../domain/idea";
import { generateXEditorialThumbnail, getXThumbnail } from "../../domain/source";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import { CategoryPicker } from "../categories/CategoryPicker";
import { ImageDropzone } from "../../components/ImageDropzone";
import { requestTitleAndNoteSuggestion, requestTitleSuggestion } from "./ideaRepository";

interface IdeaDetailProps {
  idea: Idea;
  categories: Category[];
  onClose: () => void;
  onSave: (updates: Partial<IdeaInput>) => Promise<void>;
  onDelete: () => Promise<void>;
  onCreateCategory: (name: string) => Promise<Category>;
  onReplaceImage?: (file: File) => Promise<void>;
  onRetryMetadata?: () => Promise<void>;
}

export function IdeaDetail({
  idea,
  categories,
  onClose,
  onSave,
  onDelete,
  onCreateCategory,
  onReplaceImage,
  onRetryMetadata
}: IdeaDetailProps) {
  const [title, setTitle] = useState(idea.title);
  const [note, setNote] = useState(idea.note);
  const [creatorName, setCreatorName] = useState(idea.creatorName ?? "");
  const [filmDate, setFilmDate] = useState(idea.filmDate ?? "");
  const [categoryIds, setCategoryIds] = useState(idea.categoryIds);
  const [saving, setSaving] = useState(false);
  const [suggestingTitle, setSuggestingTitle] = useState(false);
  const [suggestingNote, setSuggestingNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    setTitle(idea.title);
    setNote(idea.note);
    setCreatorName(idea.creatorName ?? "");
    setFilmDate(idea.filmDate ?? "");
    setCategoryIds(idea.categoryIds);
  }, [idea.id, idea.title, idea.note, idea.creatorName, idea.filmDate, idea.categoryIds]);

  const handleSuggestTitle = async () => {
    setSuggestingTitle(true);
    try {
      const suggested = await requestTitleSuggestion({
        rawTitle: title.trim() || null,
        description: idea.description,
        note: note.trim() || null,
        creatorName: creatorName.trim() || null,
        sourceType: idea.sourceType,
        url: idea.url,
        imageUrl: idea.previewImageUrl
      });
      if (suggested) {
        setTitle(suggested);
      }
    } catch {
      // ignore
    } finally {
      setSuggestingTitle(false);
    }
  };

  const handleSuggestNote = async () => {
    setSuggestingNote(true);
    try {
      const result = await requestTitleAndNoteSuggestion({
        rawTitle: title.trim() || null,
        description: idea.description,
        note: note.trim() || null,
        creatorName: creatorName.trim() || null,
        sourceType: idea.sourceType,
        url: idea.url,
        imageUrl: idea.previewImageUrl
      });
      if (result?.note) {
        setNote(result.note);
      }
    } catch {
      // ignore
    } finally {
      setSuggestingNote(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        note: note.trim(),
        creatorName: creatorName.trim() || null,
        filmDate: filmDate || null,
        categoryIds
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const previewImage =
    idea.previewImageUrl ||
    (idea.sourceType === "x"
      ? (idea.url ? getXThumbnail(idea.url, idea.title, idea.creatorName) : generateXEditorialThumbnail(idea.title, idea.creatorName))
      : null);

  return (
    <Modal open title="Shape this idea" description="Keep the source, add your point of view." onClose={onClose} size="large">
      <form className="idea-form" onSubmit={submit}>
        {previewImage && (
          <img className="detail-preview" src={previewImage} alt="" />
        )}
        {onReplaceImage && (
          <ImageDropzone compact onFile={(file) => void onReplaceImage(file)} />
        )}
        {idea.url && (
          <a className="source-link" href={idea.url} target="_blank" rel="noreferrer">
            Open original source <ArrowUpRight size={15} />
          </a>
        )}
        {idea.metadataStatus === "failed" && onRetryMetadata && (
          <div className="metadata-fallback">
            <div>
              <strong>Preview unavailable</strong>
              <span>The source may be restricting access. You can edit the fields manually or try again.</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={14} />}
              loading={retrying}
              onClick={async () => {
                setRetrying(true);
                try {
                  await onRetryMetadata();
                } finally {
                  setRetrying(false);
                }
              }}
            >
              Retry preview
            </Button>
          </div>
        )}
        <div className="form-grid">
          <div className="form-field form-field-wide">
            <div className="field-label-row">
              <label htmlFor="detail-title" className="field-label">
                Title
              </label>
              <button
                type="button"
                className="text-button"
                onClick={(event) => {
                  event.preventDefault();
                  void handleSuggestTitle();
                }}
                disabled={suggestingTitle}
                title="Generate a 6-7 word title using AI"
              >
                <Sparkles size={12} />
                <span>{suggestingTitle ? "Analyzing…" : "Suggest title"}</span>
              </button>
            </div>
            <input
              id="detail-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={240}
            />
          </div>
          <div className="form-field form-field-wide">
            <div className="field-label-row">
              <label htmlFor="detail-notes" className="field-label">
                Notes
              </label>
              <button
                type="button"
                className="text-button"
                onClick={(event) => {
                  event.preventDefault();
                  void handleSuggestNote();
                }}
                disabled={suggestingNote}
                title="Generate a 20-25 word explanatory note using AI"
              >
                <Sparkles size={12} />
                <span>{suggestingNote ? "Analyzing…" : "Suggest note"}</span>
              </button>
            </div>
            <textarea
              id="detail-notes"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={5}
              maxLength={10_000}
            />
          </div>
          <label className="form-field">
            <span>Creator or attribution</span>
            <input value={creatorName} onChange={(event) => setCreatorName(event.target.value)} maxLength={160} />
          </label>
          <label className="form-field">
            <span>Planned film date</span>
            <input type="date" value={filmDate} onChange={(event) => setFilmDate(event.target.value)} />
          </label>
        </div>
        <CategoryPicker
          categories={categories}
          selectedIds={categoryIds}
          onChange={setCategoryIds}
          onCreate={onCreateCategory}
        />
        <footer className="form-actions form-actions-split">
          <div>
            {!confirmDelete ? (
              <Button type="button" variant="danger" icon={<Trash2 size={16} />} onClick={() => setConfirmDelete(true)}>
                Delete idea
              </Button>
            ) : (
              <div className="delete-confirm">
                <span>Delete permanently?</span>
                <Button type="button" variant="danger" size="sm" onClick={() => void onDelete()}>
                  Yes, delete
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  Keep it
                </Button>
              </div>
            )}
          </div>
          <div className="form-actions-group">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>Save changes</Button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}
