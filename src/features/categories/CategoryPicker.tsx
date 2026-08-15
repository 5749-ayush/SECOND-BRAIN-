import { useState } from "react";
import { Plus } from "lucide-react";
import type { Category } from "../../domain/category";
import { Button } from "../../components/Button";

interface CategoryPickerProps {
  categories: Category[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreate: (name: string) => Promise<Category>;
}

export function CategoryPicker({
  categories,
  selectedIds,
  onChange,
  onCreate
}: CategoryPickerProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id]
    );
  };

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const category = await onCreate(trimmed);
      if (category?.id) onChange([...selectedIds, category.id]);
      setName("");
      setCreating(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="category-picker">
      <div className="field-label-row">
        <span className="field-label">Categories</span>
        <button className="text-button" type="button" onClick={() => setCreating((value) => !value)}>
          <Plus size={14} /> Create category
        </button>
      </div>
      {categories.length > 0 ? (
        <div className="category-options">
          {categories.map((category) => (
            <label className="category-option" key={category.id}>
              <input
                type="checkbox"
                checked={selectedIds.includes(category.id)}
                onChange={() => toggle(category.id)}
              />
              <span style={{ "--category-color": category.color } as React.CSSProperties}>
                {category.name}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="field-hint">No categories yet. Create one only when it helps.</p>
      )}
      {creating && (
        <div className="inline-create">
          <input
            aria-label="New category name"
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void create();
              }
            }}
            placeholder="e.g. Storytelling"
          />
          <Button type="button" size="sm" loading={saving} onClick={() => void create()}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
