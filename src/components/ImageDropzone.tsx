import { useId, useState } from "react";
import { FileImage, Upload } from "lucide-react";
import { validateImageFile } from "../features/ideas/imageUpload";

interface ImageDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function ImageDropzone({ onFile, disabled = false, compact = false }: ImageDropzoneProps) {
  const inputId = useId();
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const acceptFile = (file: File | undefined) => {
    if (!file) return;
    try {
      validateImageFile(file);
      setFileName(file.name);
      setError(null);
      onFile(file);
    } catch (caught) {
      setFileName(null);
      setError(caught instanceof Error ? caught.message : "This image cannot be used.");
    }
  };

  return (
    <div className={compact ? "image-dropzone compact" : "image-dropzone"}>
      <input
        id={inputId}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={disabled}
        aria-label="Choose an image"
        onChange={(event) => acceptFile(event.target.files?.[0])}
      />
      <label
        htmlFor={inputId}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          acceptFile(event.dataTransfer.files[0]);
        }}
      >
        {fileName ? <FileImage size={22} /> : <Upload size={22} />}
        <span>
          <strong>{fileName ?? (compact ? "Replace preview image" : "Drop an image here or choose a file")}</strong>
          {!compact && <small>JPEG, PNG, WebP, or GIF · up to 10 MB</small>}
        </span>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
