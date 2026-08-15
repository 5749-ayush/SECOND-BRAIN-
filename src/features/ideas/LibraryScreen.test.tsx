import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { richIdea } from "../../test/ideaFixtures";
import { LibraryScreen } from "./LibraryScreen";

describe("LibraryScreen", () => {
  it("welcomes a new workspace without inventing categories", async () => {
    const onSave = vi.fn();
    render(
      <LibraryScreen
        ideas={[]}
        onOpenIdea={vi.fn()}
        onSaveIdea={onSave}
        onOpenProfile={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: /a quiet place for ideas/i })).toBeVisible();
    expect(screen.queryByText(/category/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /save your first idea/i }));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("shows saved ideas in the visual library", () => {
    render(
      <LibraryScreen
        ideas={[richIdea]}
        onOpenIdea={vi.fn()}
        onSaveIdea={vi.fn()}
        onOpenProfile={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: /your creative field/i })).toBeVisible();
    expect(screen.getByText(richIdea.title)).toBeVisible();
    expect(screen.getByRole("button", { name: /save an idea/i })).toBeVisible();
  });
});
