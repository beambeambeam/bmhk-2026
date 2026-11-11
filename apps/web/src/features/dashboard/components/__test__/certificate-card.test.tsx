// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CertificateCard from "../certificate-card";

interface MockRecipient {
  certificate: { fileName: string; id: string; sizeBytes: number } | null;
  fullName: string;
  memberIndex: number | null;
  personId: string;
  role: "ADVISOR" | "PARTICIPANT";
  template: string;
}

const READY_ID = "44444444-4444-4444-8444-000000000001";
let recipients: MockRecipient[] = [];
let failDownload = false;
let downloadOpen = true;
const listCertificates = vi.fn<() => void>();
const requestDownload = vi.fn<(input: { disposition: string; id: string }) => void>();

// oxlint-disable-next-line vitest/prefer-import-in-mock -- Boundary fake supplies procedures.
vi.mock("@bmhk-2026/client/orpc", () => ({
  orpc: {
    certificates: {
      mine: {
        queryOptions: () => ({
          queryFn: async () => {
            listCertificates();
            return await Promise.resolve({ recipients });
          },
          queryKey: ["certificates", "mine"],
        }),
      },
      mineDownloadUrl: {
        mutationOptions: () => ({
          mutationFn: async (input: { disposition: string; id: string }) => {
            requestDownload(input);
            if (failDownload) {
              throw new Error("storage offline");
            }
            return await Promise.resolve({ url: "https://files.example/certificate.pdf" });
          },
        }),
      },
    },
    featureFlags: {
      getAll: {
        queryOptions: () => ({
          queryFn: async () => await Promise.resolve({ certificateDownload: downloadOpen }),
          queryKey: ["featureFlags", "getAll"],
        }),
      },
    },
  },
}));

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CertificateCard />
    </QueryClientProvider>,
  );
}

describe(CertificateCard, () => {
  const assign = vi.fn<(url: string) => void>();

  beforeEach(() => {
    failDownload = false;
    downloadOpen = true;
    listCertificates.mockClear();
    requestDownload.mockClear();
    assign.mockClear();
    vi.stubGlobal("location", { assign, href: "http://localhost/" });
    recipients = [
      {
        certificate: { fileName: "BH001-26_1_Alpha-One.pdf", id: READY_ID, sizeBytes: 460_000 },
        fullName: "อัลฟา หนึ่ง",
        memberIndex: 1,
        personId: "22222222-2222-4222-8222-222222222221",
        role: "PARTICIPANT",
        template: "semi-final",
      },
      {
        certificate: null,
        fullName: "แกมมา ที่ปรึกษา",
        memberIndex: null,
        personId: "33333333-3333-4333-8333-333333333331",
        role: "ADVISOR",
        template: "appreciation",
      },
    ];
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lists each recipient with a download for ready certificates only", async () => {
    renderCard();

    await expect(screen.findByRole("heading", { name: "ดาวน์โหลดเกียรติบัตร" })).resolves.toBeDefined();
    expect(screen.getByText("เกียรติบัตรรอบรองชนะเลิศ · 0.4 MB")).toBeDefined();
    expect(screen.getByRole("button", { name: "ดาวน์โหลดเกียรติบัตรของ อัลฟา หนึ่ง" })).toBeDefined();
    expect(screen.queryByRole("button", { name: /แกมมา/u })).toBeNull();
    expect(screen.getByText("ยังไม่พร้อม")).toBeDefined();
  });

  it("downloads the certificate from a freshly signed URL", async () => {
    renderCard();

    fireEvent.click(await screen.findByRole("button", { name: "ดาวน์โหลดเกียรติบัตรของ อัลฟา หนึ่ง" }));

    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith("https://files.example/certificate.pdf");
    });
    expect(requestDownload).toHaveBeenCalledWith({ disposition: "attachment", id: READY_ID });
  });

  it("explains when a download fails", async () => {
    failDownload = true;
    renderCard();

    fireEvent.click(await screen.findByRole("button", { name: "ดาวน์โหลดเกียรติบัตรของ อัลฟา หนึ่ง" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("ดาวน์โหลดเกียรติบัตรไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  });

  it("stays hidden and does not load certificates before downloads open", async () => {
    downloadOpen = false;
    const { container } = renderCard();

    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
    expect(listCertificates).not.toHaveBeenCalled();
  });

  it("stays hidden when the team has no certificate recipients", async () => {
    recipients = [];
    const { container } = renderCard();

    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });
});
