import { z } from "zod";

export const sourceTypeSchema = z.enum([
  "youtube",
  "x",
  "instagram",
  "article",
  "image",
  "reference",
  "reaction",
  "hook",
  "note",
  "other"
]);

export type SourceType = z.infer<typeof sourceTypeSchema>;

export const ideaKindSchema = z.enum(["link", "image", "note"]);
export const metadataStatusSchema = z.enum([
  "not_required",
  "pending",
  "ready",
  "failed"
]);

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date format YYYY-MM-DD.");

export const ideaInputSchema = z
  .object({
    kind: ideaKindSchema,
    sourceType: sourceTypeSchema,
    url: z.url().nullable(),
    title: z.string().trim().max(240),
    note: z.string().trim().max(10_000),
    creatorName: z.string().trim().max(160).nullable(),
    categoryIds: z.array(z.string().min(1)).max(20),
    filmDate: dateOnlySchema.nullable()
  })
  .superRefine((idea, context) => {
    if (idea.kind === "link" && !idea.url) {
      context.addIssue({
        code: "custom",
        path: ["url"],
        message: "A link idea needs a valid URL."
      });
    }

    if (!idea.title && !idea.note && !idea.url) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "Add a title, note, or URL."
      });
    }
  });

export type IdeaInput = z.infer<typeof ideaInputSchema>;

export interface Idea extends IdeaInput {
  id: string;
  canonicalUrl: string | null;
  sourceName: string | null;
  previewImageUrl: string | null;
  customImagePath: string | null;
  categoryNames: string[];
  metadataStatus: z.infer<typeof metadataStatusSchema>;
  metadataErrorCode: string | null;
  metadataFetchedAt: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export const emptyIdeaInput: IdeaInput = {
  kind: "note",
  sourceType: "note",
  url: null,
  title: "",
  note: "",
  creatorName: null,
  categoryIds: [],
  filmDate: null
};
