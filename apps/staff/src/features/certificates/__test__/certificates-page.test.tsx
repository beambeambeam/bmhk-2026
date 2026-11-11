// @vitest-environment jsdom

import { BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { CertificatesPage } from "../certificates-page";

vi.mock(import("@tanstack/react-start/server"), () => ({ getRequestHeaders: () => new Headers() }));
const fetchMock = vi.hoisted(() => {
  const mock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", mock);
  return mock;
});

const TEAM_ID = "11111111-1111-4111-8111-111111111111";
const CERTIFICATE_ID = "44444444-4444-4444-8444-000000000001";

function row(overrides: Record<string, unknown>) {
  return {
    award: "ADVANCED_TO_ROUND_2",
    certificate: null,
    fullName: "อัลฟา หนึ่ง",
    fullNameEn: "Alpha One",
    id: "PARTICIPANT:1",
    memberIndex: 1,
    mismatchReasons: [],
    personId: "22222222-2222-4222-8222-222222222221",
    role: "PARTICIPANT",
    status: "MISSING",
    teamCode: "BH001/26",
    teamId: TEAM_ID,
    teamName: "Team Example",
    template: "semi-final",
    ...overrides,
  };
}

const overview = {
  json: {
    rows: [
      row({
        certificate: {
          award: "ADVANCED_TO_ROUND_2",
          id: CERTIFICATE_ID,
          sizeBytes: 460_000,
          template: "semi-final",
        },
        status: "AVAILABLE",
      }),
      row({
        fullName: "เบตา สอง",
        fullNameEn: "Beta Two",
        id: "PARTICIPANT:2",
        memberIndex: 2,
        personId: "22222222-2222-4222-8222-222222222222",
      }),
      row({
        certificate: {
          award: "ADVANCED_TO_ROUND_2",
          id: "44444444-4444-4444-8444-000000000003",
          sizeBytes: 460_000,
          template: "appreciation",
        },
        fullName: "แกมมา ที่ปรึกษา",
        fullNameEn: "Gamma Advisor",
        id: "ADVISOR:1",
        memberIndex: null,
        mismatchReasons: ["NAME_CHANGED"],
        personId: "33333333-3333-4333-8333-333333333331",
        role: "ADVISOR",
        status: "MISMATCHED",
        template: "appreciation",
      }),
    ],
    set: {
      certificateCount: 2,
      id: "55555555-5555-4555-8555-555555555555",
      mode: "REPLACE",
      sourceName: "certificates.zip",
      sourceSizeBytes: 300_000_000,
      uploadedAt: "2026-11-01T03:00:00.000Z",
      uploadedBy: { id: "staff-1", name: "Staff Example" },
      uploadedCount: 2,
    },
    summary: { available: 1, expected: 3, extra: 0, mismatched: 1, missing: 1 },
  },
  meta: [[1, "set", "uploadedAt"]],
};

function requestPath(input: Parameters<typeof fetch>[0]): string {
  const url = input instanceof Request ? input.url : String(input);
  return new URL(url).pathname;
}

const downloadRequests: unknown[] = [];
const startRequests: unknown[] = [];
const PARTICIPANT_PDF = "cert/semi-final/BH001-26_1_Alpha-One.pdf";

async function createZip(): Promise<File> {
  const writer = new ZipWriter(new BlobWriter("application/zip"), { useWebWorkers: false });
  await writer.add("info.csv", new TextReader("role,certificate\r\n"));
  await writer.add(PARTICIPANT_PDF, new TextReader("%PDF-alpha"));
  return new File([await writer.close()], "fix-alpha.zip", { type: "application/zip" });
}

async function requestJson(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1],
): Promise<unknown> {
  if (input instanceof Request) {
    return await input.clone().json();
  }
  return typeof init?.body === "string" ? JSON.parse(init.body) : null;
}

function renderPage(set: Record<string, unknown> = {}) {
  fetchMock.mockImplementation(async (input, init) => {
    const path = requestPath(input);
    if (path.endsWith("/certificates/startUpload")) {
      startRequests.push(await requestJson(input, init));
      return Response.json({ json: { paths: [PARTICIPANT_PDF], setId: overview.json.set.id } });
    }
    if (path.endsWith("/certificates/uploadFiles")) {
      return Response.json({ json: { remaining: 0, stored: 1 } });
    }
    if (path.endsWith("/certificates/completeUpload")) {
      return Response.json({ json: overview.json.set, meta: [[1, "uploadedAt"]] });
    }
    if (path.endsWith("/certificates/downloadUrl")) {
      downloadRequests.push(await requestJson(input, init));
      return await Promise.resolve(
        Response.json({ json: { url: "https://files.example/certificate.pdf" } }),
      );
    }
    return await Promise.resolve(
      Response.json({
        ...overview,
        json: { ...overview.json, set: { ...overview.json.set, ...set } },
      }),
    );
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <CertificatesPage />
    </QueryClientProvider>,
  );
}

describe("staff certificates page", () => {
  afterEach(() => {
    cleanup();
    fetchMock.mockReset();
    downloadRequests.length = 0;
    startRequests.length = 0;
  });

  afterAll(() => vi.unstubAllGlobals());

  it("shows the uploaded set, status counts, and each recipient's status", async () => {
    renderPage();

    await screen.findByRole("row", { name: /อัลฟา หนึ่ง/u });

    expect(
      [/อัลฟา หนึ่ง/u, /เบตา สอง/u, /แกมมา ที่ปรึกษา/u].map((name) => {
        const tableRow = within(screen.getByRole("row", { name }));
        return {
          downloadButtons: tableRow.queryAllByRole("button", { name: /ดาวน์โหลด/u }).length,
          mismatch: tableRow.queryByText("ชื่อเปลี่ยน") !== null,
          status: ["พร้อมใช้งาน", "ยังไม่มีไฟล์", "ข้อมูลไม่ตรง"].find(
            (label) => tableRow.queryByText(label) !== null,
          ),
        };
      }),
    ).toStrictEqual([
      { downloadButtons: 1, mismatch: false, status: "พร้อมใช้งาน" },
      { downloadButtons: 0, mismatch: false, status: "ยังไม่มีไฟล์" },
      { downloadButtons: 1, mismatch: true, status: "ข้อมูลไม่ตรง" },
    ]);
    expect([
      screen.queryByText("certificates.zip") !== null,
      screen.queryByText("Staff Example") !== null,
    ]).toStrictEqual([true, true]);
  });

  it("narrows the list by search", async () => {
    renderPage();
    await screen.findByRole("row", { name: /อัลฟา หนึ่ง/u });

    fireEvent.change(screen.getByLabelText("ค้นหาผู้ได้รับเกียรติบัตร"), {
      target: { value: "beta" },
    });

    expect(screen.queryByRole("row", { name: /อัลฟา หนึ่ง/u })).toBeNull();
    expect(screen.getByRole("row", { name: /เบตา สอง/u })).toBeDefined();
  });

  it("asks for a download URL when staff download a certificate", async () => {
    const assign = vi.fn<(url: string) => void>();
    vi.stubGlobal("location", { assign });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "ดาวน์โหลดเกียรติบัตรของ อัลฟา หนึ่ง" }));

    await vi.waitFor(() => {
      expect(assign).toHaveBeenCalledWith("https://files.example/certificate.pdf");
    });
    expect(downloadRequests).toStrictEqual([
      { json: { disposition: "attachment", id: CERTIFICATE_ID } },
    ]);
  });

  it("shows how many files the last partial update changed", async () => {
    renderPage({ mode: "MERGE", sourceName: "fix-alpha.zip", uploadedCount: 1 });

    await screen.findByText("ไฟล์ที่อัปเดตล่าสุด");
    expect(screen.getByText("fix-alpha.zip")).toBeDefined();
    expect(screen.getByText(/2 ไฟล์ \(อัปเดต 1 ไฟล์\)/u)).toBeDefined();
  });

  it("updates only some certificates unless staff choose to replace the whole set", async () => {
    renderPage();
    const partial = await screen.findByRole("radio", {
      description: /ชุดเดิมยังอยู่ครบ/u,
      name: "อัปเดตบางรายการ",
    });
    expect(partial.getAttribute("aria-checked")).toBe("true");

    fireEvent.change(screen.getByLabelText("เลือกไฟล์ zip เกียรติบัตร"), {
      target: { files: [await createZip()] },
    });
    fireEvent.click(screen.getByRole("button", { name: /อัปเดตบางรายการ/u }));
    await vi.waitFor(() => {
      expect(startRequests).toHaveLength(1);
    });
    fireEvent.click(screen.getByRole("radio", { name: "แทนที่ทั้งชุด" }));
    fireEvent.change(screen.getByLabelText("เลือกไฟล์ zip เกียรติบัตร"), {
      target: { files: [await createZip()] },
    });
    fireEvent.click(await screen.findByRole("button", { name: /อัปโหลดชุดใหม่/u }));
    await vi.waitFor(() => {
      expect(startRequests).toHaveLength(2);
    });

    expect(startRequests).toMatchObject([
      { json: { mode: "MERGE", sourceName: "fix-alpha.zip" } },
      { json: { mode: "REPLACE", sourceName: "fix-alpha.zip" } },
    ]);
  });
});
