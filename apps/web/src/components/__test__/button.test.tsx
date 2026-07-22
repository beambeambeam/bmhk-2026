// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "../button";

describe("button component", () => {
  it("renders label and handles clicks", () => {
    const handleClick = vi.fn<() => void>();

    render(<Button onClick={handleClick}>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.click(button);

    expect(button.dataset.slot).toBe("button");
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
