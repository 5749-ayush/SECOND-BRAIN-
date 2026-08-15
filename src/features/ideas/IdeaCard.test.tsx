import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { noteIdea, richIdea } from "../../test/ideaFixtures";
import { IdeaCard } from "./IdeaCard";

describe("IdeaCard", () => {
  it("presents rich preview information and opens the idea", async () => {
    const onOpen = vi.fn();
    render(<IdeaCard idea={richIdea} onOpen={onOpen} />);

    expect(screen.getByRole("img", { name: richIdea.title })).toBeVisible();
    expect(screen.getByText("The Creative Practice")).toBeVisible();
    expect(screen.getByText("Storytelling")).toBeVisible();
    expect(screen.getByText("24 Aug")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: /open why the best/i }));
    expect(onOpen).toHaveBeenCalledWith(richIdea);
  });

  it("renders a note as intentional typography without an empty image", () => {
    render(<IdeaCard idea={noteIdea} onOpen={vi.fn()} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText(noteIdea.note)).toBeVisible();
    expect(screen.getByText("Loose thought")).toBeVisible();
  });

  it("shows progress while metadata is being prepared", () => {
    render(
      <IdeaCard
        idea={{ ...richIdea, metadataStatus: "pending", previewImageUrl: null }}
        onOpen={vi.fn()}
      />
    );

    expect(screen.getByText(/building preview/i)).toBeVisible();
  });
});
