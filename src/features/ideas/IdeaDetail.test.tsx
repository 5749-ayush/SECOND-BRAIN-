import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { richIdea } from "../../test/ideaFixtures";
import { IdeaDetail } from "./IdeaDetail";

describe("IdeaDetail", () => {
  it("saves edited text and can clear the film date", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <IdeaDetail
        idea={richIdea}
        categories={[]}
        onClose={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn()}
        onCreateCategory={vi.fn()}
      />
    );

    const title = screen.getByLabelText(/^title$/i);
    await userEvent.clear(title);
    await userEvent.type(title, "A sharper opening");
    await userEvent.clear(screen.getByLabelText(/planned film date/i));
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: "A sharper opening", filmDate: null })
    );
  });

  it("requires explicit confirmation before deletion", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <IdeaDetail
        idea={richIdea}
        categories={[]}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDelete={onDelete}
        onCreateCategory={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /delete idea/i }));
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /yes, delete/i }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("offers metadata retry after a preview failure", async () => {
    const onRetryMetadata = vi.fn().mockResolvedValue(undefined);
    render(
      <IdeaDetail
        idea={{ ...richIdea, metadataStatus: "failed", metadataErrorCode: "blocked" }}
        categories={[]}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onCreateCategory={vi.fn()}
        onRetryMetadata={onRetryMetadata}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /retry preview/i }));
    expect(onRetryMetadata).toHaveBeenCalledOnce();
  });

  it("loads existing note and persists edited notes correctly", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <IdeaDetail
        idea={{
          ...richIdea,
          note: "Existing note on video structure."
        }}
        categories={[]}
        onClose={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn()}
        onCreateCategory={vi.fn()}
      />
    );

    const notesInput = screen.getByLabelText(/^notes$/i);
    expect(notesInput).toHaveValue("Existing note on video structure.");

    await userEvent.clear(notesInput);
    await userEvent.type(notesInput, "Updated takeaway notes for filming.");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        note: "Updated takeaway notes for filming."
      })
    );
  });
});
