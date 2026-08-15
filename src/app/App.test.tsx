import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("protects the creative library behind Google sign-in", async () => {
    render(<App />);

    expect(
      await screen.findByRole("button", { name: /continue with google/i })
    ).toBeVisible();
    expect(screen.queryByLabelText("Saved ideas")).not.toBeInTheDocument();
  });
});
