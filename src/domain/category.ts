import { z } from "zod";

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Category name is required.").max(60),
  color: z.string().regex(/^#[0-9a-f]{6}$/i)
});

export interface Category extends z.infer<typeof categoryInputSchema> {
  id: string;
  normalizedName: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
