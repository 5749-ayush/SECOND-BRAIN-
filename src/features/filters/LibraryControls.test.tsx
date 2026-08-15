import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { LibraryQuery } from "../../domain/libraryQuery";
import { LibraryControls } from "./LibraryControls";

const query: LibraryQuery = {
  text: "",
  categoryIds: [],
  sourceTypes: [],
  filmDateState: "any",
  sort: "newest",
  today: "2026-08-15"
};

describe("LibraryControls", () => {
  it("updates text search and planned-date filtering", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <LibraryControls query={query} categories={[]} onChange={onChange} />
    );

    await userEvent.type(screen.getByRole("searchbox", { name: /search ideas/i }), "launch");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ text: "launch" }));

    rerender(
      <LibraryControls query={{ ...query, text: "launch" }} categories={[]} onChange={onChange} />
    );
    await userEvent.selectOptions(screen.getByLabelText(/film date/i), "planned");
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ text: "launch", filmDateState: "planned" })
    );
  });
});
