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
    expect(screen.getByText(/Study the first thirty seconds/)).toBeVisible();
    expect(screen.getByText("Storytelling")).toBeVisible();
    expect(screen.getByText("24 Aug")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: /open why great/i }));
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

  it("renders a preview thumbnail for X/Twitter posts without leaving an empty area", () => {
    const xIdea = {
      ...richIdea,
      id: "x-post-1",
      sourceType: "x" as const,
      url: "https://x.com/Dan_Kornas/status/18247000213123",
      title: "Budget dashboards show where your money went",
      creatorName: "Dan Kornas",
      previewImageUrl: null
    };

    render(<IdeaCard idea={xIdea} onOpen={vi.fn()} />);
    const img = screen.getByRole("img", { name: "Budget dashboards show where your money went" });
    expect(img).toBeVisible();
    expect(img).toHaveAttribute("src", "https://d.fxtwitter.com/i/status/18247000213123.jpg");
  });

  it("renders editorial SVG fallback thumbnail for text-only X posts", () => {
    const xTextIdea = {
      ...richIdea,
      id: "x-post-2",
      sourceType: "x" as const,
      url: null,
      title: "I replaced my $200/mo chatgpt subscription",
      creatorName: "Avid",
      previewImageUrl: null
    };

    render(<IdeaCard idea={xTextIdea} onOpen={vi.fn()} />);
    const img = screen.getByRole("img", { name: "I replaced my $200/mo chatgpt subscription" });
    expect(img).toBeVisible();
    expect(img.getAttribute("src")).toContain("data:image/svg+xml");
  });
});
