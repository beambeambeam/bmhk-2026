// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";

import { ToastProvider } from "../../toast/toast-provider";
import { UploadBox } from "../field";

function mockMatchMedia() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn<(query: string) => { matches: boolean }>(() => ({ matches: false })),
  );
}

function ControlledUploadBox() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFile(null);
        }}
      >
        Reset
      </button>
      <button
        type="button"
        onClick={() => {
          setFile(new File(["replacement"], "replacement.pdf", { type: "application/pdf" }));
        }}
      >
        Replace
      </button>
      <UploadBox kind="pdf" maxMB={10} file={file} onChange={setFile} />
    </>
  );
}

describe("UploadBox rendered component", () => {
  afterEach(cleanup);

  it("keeps a selected file pending until the next step uploads it", () => {
    const onChange = vi.fn<(file: File | null) => void>();
    mockMatchMedia();

    render(
      <ToastProvider>
        <UploadBox kind="pdf" maxMB={10} onChange={onChange} />
      </ToastProvider>,
    );

    const file = new File(["document"], "proof.pdf", { type: "application/pdf" });
    const input = screen.getByLabelText<HTMLInputElement>("อัปโหลดไฟล์");

    fireEvent.change(input, { target: { files: [file] } });

    expect(onChange).toHaveBeenCalledWith(file);
    expect(screen.getByText("proof.pdf", { selector: "span" })).toBeDefined();
    expect(screen.getByText("ไฟล์จะถูกอัปโหลดเมื่อดำเนินการต่อ")).toBeDefined();
    expect(screen.queryByText("กำลังอัปโหลด")).toBeNull();
    expect(screen.queryByText("อัปโหลดสำเร็จ")).toBeNull();
  });

  it("rejects image formats that the server cannot store", () => {
    const onChange = vi.fn<(file: File | null) => void>();
    mockMatchMedia();

    render(
      <ToastProvider>
        <UploadBox kind="image" maxMB={5} onChange={onChange} />
      </ToastProvider>,
    );

    const file = new File(["image"], "team.gif", { type: "image/gif" });
    const input = screen.getByLabelText<HTMLInputElement>("อัปโหลดไฟล์");

    fireEvent.change(input, { target: { files: [file] } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP", { selector: "p" })).toBeDefined();
  });

  it("rejects zero-byte files before they reach the route", () => {
    const onChange = vi.fn<(file: File | null) => void>();
    mockMatchMedia();

    render(
      <ToastProvider>
        <UploadBox kind="image" maxMB={5} onChange={onChange} />
      </ToastProvider>,
    );

    const file = new File([], "empty.png", { type: "image/png" });
    const input = screen.getByLabelText<HTMLInputElement>("อัปโหลดไฟล์");

    fireEvent.change(input, { target: { files: [file] } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("ไฟล์นี้ว่างเปล่า", { selector: "p" })).toBeDefined();
  });

  it("clears a selected file when its controlled value is reset", () => {
    mockMatchMedia();

    render(
      <ToastProvider>
        <ControlledUploadBox />
      </ToastProvider>,
    );

    const file = new File(["document"], "proof.pdf", { type: "application/pdf" });
    const input = screen.getByLabelText<HTMLInputElement>("อัปโหลดไฟล์");

    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText("proof.pdf", { selector: "span" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Replace" }));

    expect(screen.getByText("replacement.pdf", { selector: "span" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.queryByText("proof.pdf", { selector: "span" })).toBeNull();
    expect(screen.getByText("จำกัดขนาดเอกสารไม่เกิน 10 MB (PDF เท่านั้น)")).toBeDefined();
  });
});
