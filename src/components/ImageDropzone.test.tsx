import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ImageDropzone } from "./ImageDropzone";

describe("ImageDropzone", () => {
  it("accepts a supported image", async () => {
    const onFile = vi.fn();
    render(<ImageDropzone onFile={onFile} />);
    const file = new File([new Uint8Array([1, 2, 3])], "reference.webp", {
      type: "image/webp"
    });

    await userEvent.upload(screen.getByLabelText(/choose an image/i), file);

    expect(onFile).toHaveBeenCalledWith(file);
    expect(screen.getByText("reference.webp")).toBeVisible();
  });

  it("rejects unsupported and oversized files with a useful message", async () => {
    const onFile = vi.fn();
    render(<ImageDropzone onFile={onFile} />);
    const document = new File(["not an image"], "notes.pdf", {
      type: "application/pdf"
    });

    await userEvent.upload(screen.getByLabelText(/choose an image/i), document, {
      applyAccept: false
    });

    expect(onFile).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/jpeg, png, webp, or gif/i);
  });
});
