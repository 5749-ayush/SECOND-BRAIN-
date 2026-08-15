import { useState, type FormEvent } from "react";
import { ArrowUpRight, Trash2 } from "lucide-react";
import type { Category } from "../../domain/category";
import type { Idea, IdeaInput } from "../../domain/idea";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import { CategoryPicker } from "../categories/CategoryPicker";
import { ImageDropzone } from "../../components/ImageDropzone";

interface IdeaDetailProps {
  idea: Idea;
  categories: Category[];
  onClose: () => void;
  onSave: (updates: Partial<IdeaInput>) => Promise<void>;
  onDelete: () => Promise<void>;
  onCreateCategory: (name: string) => Promise<Category>;
  onReplaceImage?: (file: File) => Promise<void>;
}

export function IdeaDetail({
  idea,
  categories,
  onClose,
  onSave,
  onDelete,
  onCreateCategory,
  onReplaceImage
}: IdeaDetailProps) {
  const [title, setTitle] = useState(idea.title);
  const [note, setNote] = useState(idea.note);
  const [creatorName, setCreatorName] = useState(idea.creatorName ?? "");
  const [filmDate, setFilmDate] = useState(idea.filmDate ?? "");
  const [categoryIds, setCategoryIds] = useState(idea.categoryIds);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  return (
    <Modal open title="Shape this idea" description="Keep the source, add your point of view." onClose={onClose} size="large">
      <form className="idea-form" onSubmit={submit}>
        {idea.previewImageUrl && (
          <img className="detail-preview" src={idea.previewImageUrl} alt="" />
        )}
        {onReplaceImage && (
          <ImageDropzone compact onFile={(file) => void onReplaceImage(file)} />
        )}
        {idea.url && (
          <a className="source-link" href={idea.url} target="_blank" rel="noreferrer">
            Open original source <ArrowUpRight size={15} />
          </a>
        )}
        <div className="form-grid">
          <label className="form-field form-field-wide">
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} />
          </label>
          <label className="form-field form-field-wide">
            <span>Notes</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={5} maxLength={10_000} />
          </label>
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
