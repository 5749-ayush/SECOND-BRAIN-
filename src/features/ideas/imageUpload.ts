import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable
} from "firebase/storage";
import type { IdeaInput } from "../../domain/idea";
import { storage, WORKSPACE_ID } from "../../lib/firebase";
import { createIdea, deleteIdea, updateIdeaMedia } from "./ideaRepository";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function validateImageFile(file: File) {
  if (file.size === 0) throw new Error("Choose an image that is not empty.");
  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPEG, PNG, WebP, or GIF image.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Choose an image smaller than 10 MB.");
  }
}

function safeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "image";
}

export async function uploadIdeaImage({
  ideaId,
  file,
  onProgress
}: {
  ideaId: string;
  file: File;
  onProgress?: (progress: number) => void;
}): Promise<{ path: string; downloadUrl: string }> {
  validateImageFile(file);
  const path = `workspaces/${WORKSPACE_ID}/ideas/${ideaId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const uploadRef = ref(storage, path);
  const task = uploadBytesResumable(uploadRef, file, {
    contentType: file.type,
    cacheControl: "public,max-age=31536000,immutable"
  });

  await new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => onProgress?.(snapshot.bytesTransferred / snapshot.totalBytes),
      reject,
      resolve
    );
  });
  return { path, downloadUrl: await getDownloadURL(uploadRef) };
}

export async function removeIdeaImage(path: string | null) {
  if (!path?.startsWith(`workspaces/${WORKSPACE_ID}/ideas/`)) return;
  await deleteObject(ref(storage, path));
}

export async function createImageIdea(
  input: IdeaInput,
  file: File,
  actorId: string,
  categoryNames: string[]
) {
  const ideaId = await createIdea(input, actorId, categoryNames);
  try {
    const uploaded = await uploadIdeaImage({ ideaId, file });
    await updateIdeaMedia(ideaId, uploaded, actorId);
    return ideaId;
  } catch (error) {
    await deleteIdea(ideaId);
    throw error;
  }
}
