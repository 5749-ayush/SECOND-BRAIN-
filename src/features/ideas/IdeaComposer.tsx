import { useEffect, useState, type FormEvent } from "react";
import { FileImage, Lightbulb, Link2 } from "lucide-react";
import type { Category } from "../../domain/category";
import { ideaInputSchema, type IdeaInput } from "../../domain/idea";
import { detectSourceType } from "../../domain/source";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import { CategoryPicker } from "../categories/CategoryPicker";

type ComposerMode = "link" | "image" | "note";

interface IdeaComposerProps {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onCreateIdea: (input: IdeaInput) => Promise<void>;
  onCreateCategory: (name: string) => Promise<Category>;
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
  onCreateCategory
}: IdeaComposerProps) {
  const [mode, setMode] = useState<ComposerMode>("link");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [filmDate, setFilmDate] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode("link");
    setUrl("");
    setTitle("");
    setNote("");
    setFilmDate("");
    setCategoryIds([]);
    setError(null);
  }, [open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (mode === "image") {
      setError("Choose an image below to save this visual reference.");
      return;
    }

    try {
      const trimmedUrl = url.trim();
      const input = ideaInputSchema.parse({
        kind: mode,
        sourceType: mode === "link" ? detectSourceType(trimmedUrl) : "note",
        url: mode === "link" ? trimmedUrl : null,
        title,
        note,
        creatorName: null,
        categoryIds,
        filmDate: filmDate || null
      });
      setSaving(true);
      await onCreateIdea(input);
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
          <div className="image-placeholder">
            <FileImage size={26} />
            <p>Image upload is prepared in the next secure storage step.</p>
          </div>
        )}

        <div className="form-grid">
          <label className="form-field form-field-wide">
            <span>Title <em>optional</em></span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={240}
              placeholder={mode === "note" ? "Give the thought a name" : "Override the fetched title"}
            />
          </label>
          <label className="form-field form-field-wide">
            <span>Notes <em>optional</em></span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={10_000}
              rows={4}
              placeholder="What caught your attention? How might you use it?"
            />
          </label>
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
