// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DataTablePagination } from "../pagination";

describe("data table pagination", () => {
  afterEach(cleanup);

  it("opens a numbered page and marks the current page", () => {
    const pages: number[] = [];
    render(
      <DataTablePagination
        pageIndex={4}
        pageCount={10}
        onPageChange={(page) => {
          pages.push(page);
        }}
      />,
    );
    expect(screen.getByRole("button", { name: "Page 5" }).getAttribute("aria-current")).toBe(
      "page",
    );
    fireEvent.click(screen.getByRole("button", { name: "Page 10" }));
    expect(pages).toStrictEqual([9]);
  });

  it("disables previous on the first page and next on the last page", () => {
    const pages: number[] = [];
    const { rerender } = render(
      <DataTablePagination
        pageIndex={0}
        pageCount={3}
        onPageChange={(page) => {
          pages.push(page);
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Go to previous page" }));
    fireEvent.click(screen.getByRole("button", { name: "Go to next page" }));
    expect(pages).toStrictEqual([1]);
    rerender(
      <DataTablePagination
        pageIndex={2}
        pageCount={3}
        onPageChange={(page) => {
          pages.push(page);
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Go to next page" }));
    fireEvent.click(screen.getByRole("button", { name: "Go to previous page" }));
    expect(pages).toStrictEqual([1, 1]);
  });

  it("blocks all navigation while a page is loading", () => {
    const pages: number[] = [];
    render(
      <DataTablePagination
        disabled
        pageIndex={1}
        pageCount={3}
        onPageChange={(page) => {
          pages.push(page);
        }}
      />,
    );
    for (const button of screen.getAllByRole("button")) {
      fireEvent.click(button);
    }
    expect(pages).toStrictEqual([]);
  });

  it("keeps one disabled page for an empty result", () => {
    render(<DataTablePagination pageIndex={0} pageCount={0} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Page 1" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Go to previous page" }).disabled,
    ).toBeTruthy();
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Go to next page" }).disabled,
    ).toBeTruthy();
  });
});
