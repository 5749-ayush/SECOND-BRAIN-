import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { IdeaComposer } from "./IdeaComposer";

describe("IdeaComposer", () => {
  it("saves a loose idea with an optional film date and no default categories", async () => {
    const onCreateIdea = vi.fn().mockResolvedValue(undefined);
    render(
      <IdeaComposer
        open
        categories={[]}
        onClose={vi.fn()}
        onCreateIdea={onCreateIdea}
        onCreateCategory={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /loose idea/i }));
    await userEvent.type(screen.getByLabelText(/title/i), "Open with the consequence");
    await userEvent.type(screen.getByLabelText(/notes/i), "Explain the cause after the hook.");
    await userEvent.type(screen.getByLabelText(/planned film date/i), "2026-08-25");

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^save idea$/i }));

    expect(onCreateIdea).toHaveBeenCalledWith({
      kind: "note",
      sourceType: "note",
      url: null,
      title: "Open with the consequence",
      note: "Explain the cause after the hook.",
      creatorName: null,
      categoryIds: [],
      filmDate: "2026-08-25"
    });
  });

  it("detects a YouTube link when saving a URL", async () => {
    const onCreateIdea = vi.fn().mockResolvedValue(undefined);
    render(
      <IdeaComposer
        open
        categories={[]}
        onClose={vi.fn()}
        onCreateIdea={onCreateIdea}
        onCreateCategory={vi.fn()}
      />
    );

    await userEvent.type(screen.getByLabelText(/paste a link/i), "https://youtu.be/abc");
    await userEvent.click(screen.getByRole("button", { name: /^save idea$/i }));

    expect(onCreateIdea).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "link",
        sourceType: "youtube",
        url: "https://youtu.be/abc"
      })
    );
  });
});
