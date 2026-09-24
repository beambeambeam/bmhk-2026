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
        pageSize={10}
        onPageChange={(page) => {
          pages.push(page);
        }}
        onPageSizeChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "หน้า 5" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(screen.getByRole("button", { name: "หน้า 6" }));
    expect(pages).toStrictEqual([5]);
  });

  it("disables previous on the first page and next on the last page", () => {
    const pages: number[] = [];
    const { rerender } = render(
      <DataTablePagination
        pageIndex={0}
        pageCount={3}
        pageSize={10}
        onPageChange={(page) => {
          pages.push(page);
        }}
        onPageSizeChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "ไปหน้าก่อนหน้า" }));
    fireEvent.click(screen.getByRole("button", { name: "ไปหน้าถัดไป" }));
    expect(pages).toStrictEqual([1]);
    rerender(
      <DataTablePagination
        pageIndex={2}
        pageCount={3}
        pageSize={10}
        onPageChange={(page) => {
          pages.push(page);
        }}
        onPageSizeChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "ไปหน้าถัดไป" }));
    fireEvent.click(screen.getByRole("button", { name: "ไปหน้าก่อนหน้า" }));
    expect(pages).toStrictEqual([1, 1]);
  });

  it("blocks all navigation while a page is loading", () => {
    const pages: number[] = [];
    render(
      <DataTablePagination
        disabled
        pageIndex={1}
        pageCount={3}
        pageSize={10}
        onPageChange={(page) => {
          pages.push(page);
        }}
        onPageSizeChange={() => {}}
      />,
    );
    for (const button of screen.getAllByRole("button")) {
      fireEvent.click(button);
    }
    expect(pages).toStrictEqual([]);
  });

  it("keeps one disabled page for an empty result", () => {
    render(
      <DataTablePagination
        pageIndex={0}
        pageCount={0}
        pageSize={10}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "หน้า 1" }).getAttribute("aria-current")).toBe("page");
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "ไปหน้าก่อนหน้า" }).disabled,
    ).toBeTruthy();
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "ไปหน้าถัดไป" }).disabled,
    ).toBeTruthy();
  });
});
