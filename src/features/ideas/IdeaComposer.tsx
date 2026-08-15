import { useEffect, useState, type FormEvent } from "react";
import { FileImage, Lightbulb, Link2, Sparkles } from "lucide-react";
import type { Category } from "../../domain/category";
import { ideaInputSchema, type IdeaInput } from "../../domain/idea";
import { detectSourceType } from "../../domain/source";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import { CategoryPicker } from "../categories/CategoryPicker";
import { ImageDropzone } from "../../components/ImageDropzone";
import { requestTitleAndNoteSuggestion, requestTitleSuggestion } from "./ideaRepository";

type ComposerMode = "link" | "image" | "note";

interface IdeaComposerProps {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onCreateIdea: (input: IdeaInput) => Promise<void>;
  onCreateCategory: (name: string) => Promise<Category>;
  onCreateImageIdea?: (input: IdeaInput, file: File) => Promise<void>;
}

const modeDetails = [
  { value: "link" as const, label: "Save a link", icon: Link2 },
  { value: "image" as const, label: "Upload image", icon: FileImage },
  { value: "note" as const, label: "Loose idea", icon: Lightbulb }
];

export function IdeaComposer({
  open,
  categories,
  onClose,
  onCreateIdea,
  onCreateCategory,
  onCreateImageIdea
}: IdeaComposerProps) {
  const [mode, setMode] = useState<ComposerMode>("link");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [filmDate, setFilmDate] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [suggestingTitle, setSuggestingTitle] = useState(false);
  const [suggestingNote, setSuggestingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode("link");
    setUrl("");
    setTitle("");
    setNote("");
    setFilmDate("");
    setCategoryIds([]);
    setError(null);
    setImageFile(null);
    setSuggestingTitle(false);
    setSuggestingNote(false);
  }, [open]);

  const handleSuggestTitle = async () => {
    setSuggestingTitle(true);
    try {
      const suggested = await requestTitleSuggestion({
        rawTitle: title.trim() || null,
        note: note.trim() || null,
        url: url.trim() || null,
        sourceType: mode === "link" && url.trim() ? detectSourceType(url.trim()) : mode
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
        note: note.trim() || null,
        url: url.trim() || null,
        sourceType: mode === "link" && url.trim() ? detectSourceType(url.trim()) : mode
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
    setError(null);
    if (mode === "image" && !imageFile) {
      setError("Choose an image to save this visual reference.");
      return;
    }

    try {
      const trimmedUrl = url.trim();
      const input = ideaInputSchema.parse({
        kind: mode,
        sourceType: mode === "link" ? detectSourceType(trimmedUrl) : mode === "image" ? "image" : "note",
        url: mode === "link" ? trimmedUrl : null,
        title,
        note,
        creatorName: null,
        categoryIds,
        filmDate: filmDate || null
      });
      setSaving(true);
      if (mode === "image" && imageFile && onCreateImageIdea) {
        await onCreateImageIdea(input, imageFile);
      } else {
        await onCreateIdea(input);
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This idea could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Save something worth returning to"
      description="A link, a visual, or a thought before it disappears."
      onClose={onClose}
      size="large"
    >
      <form className="idea-form" onSubmit={submit}>
        <div className="composer-modes" aria-label="Idea type">
          {modeDetails.map(({ value, label, icon: Icon }) => (
            <button
              className={mode === value ? "composer-mode active" : "composer-mode"}
              type="button"
              aria-pressed={mode === value}
              key={value}
              onClick={() => setMode(value)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {mode === "link" && (
          <label className="form-field form-field-wide">
            <span>Paste a link</span>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://…"
              autoFocus
              required
            />
            <small>We’ll build the richest preview the source allows.</small>
          </label>
        )}

        {mode === "image" && (
          <ImageDropzone onFile={setImageFile} disabled={saving} />
        )}

        <div className="form-grid">
          <div className="form-field form-field-wide">
            <div className="field-label-row">
              <label htmlFor="composer-title" className="field-label">
                Title <em>optional</em>
              </label>
              {(url.trim() || note.trim() || title.trim()) && (
                <button
                  type="button"
                  className="text-button"
                  onClick={(event) => {
                    event.preventDefault();
                    void handleSuggestTitle();
                  }}
                  disabled={suggestingTitle}
                  title="Generate a clean, literal title under 6 words"
                >
                  <Sparkles size={12} />
                  <span>{suggestingTitle ? "Generating…" : "Suggest title"}</span>
                </button>
              )}
            </div>
            <input
              id="composer-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={240}
              placeholder={mode === "note" ? "Give the thought a name" : "Override the fetched title"}
            />
          </div>
          <div className="form-field form-field-wide">
            <div className="field-label-row">
              <label htmlFor="composer-notes" className="field-label">
                Notes <em>optional</em>
              </label>
              {(url.trim() || title.trim()) && (
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
                  <span>{suggestingNote ? "Generating…" : "Suggest note"}</span>
                </button>
              )}
            </div>
            <textarea
              id="composer-notes"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={10_000}
              rows={4}
              placeholder="What caught your attention? How might you use it?"
            />
          </div>
          <label className="form-field">
            <span>Planned film date <em>optional</em></span>
            <input type="date" value={filmDate} onChange={(event) => setFilmDate(event.target.value)} />
          </label>
        </div>

        <CategoryPicker
          categories={categories}
          selectedIds={categoryIds}
          onChange={setCategoryIds}
          onCreate={onCreateCategory}
        />

        {error && <p className="form-error" role="alert">{error}</p>}
        <footer className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save idea</Button>
        </footer>
      </form>
    </Modal>
  );
}
