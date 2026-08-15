import { z } from "zod";

export const sourceTypeSchema = z.enum([
  "youtube", "x", "instagram", "article", "image", "reference",
  "reaction", "hook", "note", "other"
]);

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const agentIdeaBaseSchema = z.object({
    kind: z.enum(["link", "image", "note"]),
    sourceType: sourceTypeSchema,
    url: z.url().nullable(),
    title: z.string().trim().max(240),
    note: z.string().trim().max(10_000),
    creatorName: z.string().trim().max(160).nullable(),
    categoryIds: z.array(z.string().min(1)).max(20),
    filmDate: dateOnly.nullable()
  });

export const agentIdeaInputSchema = agentIdeaBaseSchema
  .superRefine((value, context) => {
    if (value.kind === "link" && !value.url) {
      context.addIssue({ code: "custom", path: ["url"], message: "A link idea needs a URL." });
    }
    if (!value.title && !value.note && !value.url) {
      context.addIssue({ code: "custom", path: ["note"], message: "Add a title, note, or URL." });
    }
  });

export const agentIdeaPatchSchema = agentIdeaBaseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one field to update."
);

export const agentCategoryInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional()
});

export const agentCategoryPatchSchema = agentCategoryInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one category field to update."
);
