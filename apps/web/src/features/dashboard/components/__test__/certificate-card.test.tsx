// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
let feedbackSubmitted = true;
let failFeedback = false;
let failDownload = false;
let downloadOpen = true;
const listCertificates = vi.fn<() => void>();
const requestDownload = vi.fn<(input: { disposition: string; id: string }) => void>();
const submitFeedback = vi.fn<(input: unknown) => void>();

// oxlint-disable-next-line vitest/prefer-import-in-mock -- Boundary fake supplies procedures.
vi.mock("@bmhk-2026/client/orpc", () => ({
  orpc: {
    certificates: {
      mine: {
        queryOptions: () => ({
          queryFn: async () => {
            listCertificates();
            return await Promise.resolve({ feedbackSubmitted, recipients });
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
      mineFeedback: {
        mutationOptions: () => ({
          mutationFn: async (input: unknown) => {
            submitFeedback(input);
            if (failFeedback) {
              throw new Error("database offline");
            }
            return await Promise.resolve({ feedbackSubmitted: true });
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

const TCAS_URL = "https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/universities.json";
const tcasFetch = vi.fn<typeof fetch>();

const START = "ทำแบบสอบถามเพื่อดาวน์โหลดเกียรติบัตร";
const DOWNLOAD_ALPHA = "ดาวน์โหลดเกียรติบัตรของ อัลฟา หนึ่ง";
const SUBMIT = "ส่งแบบสอบถามและปลดล็อกการดาวน์โหลด";

/** Answers every required question: undecided faculty, a university, 4 on all ratings, website. */
async function answerQuestionnaire() {
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText(/คณะที่สนใจศึกษาต่อ/u), {
    target: { value: "ยังไม่ตัดสินใจ" },
  });
  const university = within(dialog).getByRole("combobox", { name: /มหาวิทยาลัยที่สนใจศึกษาต่อ/u });
  fireEvent.click(within(dialog).getByRole("button", { name: "แสดงรายชื่อมหาวิทยาลัย" }));
  fireEvent.change(university, { target: { value: "พระจอมเกล้าธนบุรี" } });
  fireEvent.click(await screen.findByRole("option", { name: "มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี" }));
  const fours = within(dialog).getAllByRole("radio", { name: "4" });
  expect(fours).toHaveLength(19);
  for (const radio of fours) {
    fireEvent.click(radio);
  }
  fireEvent.click(within(dialog).getByRole("checkbox", { name: "เว็บไซต์" }));
  fireEvent.change(within(dialog).getByLabelText("ข้อเสนอแนะเพิ่มเติม"), {
    target: { value: "  สนุกมาก  " },
  });
  return dialog;
}

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
    feedbackSubmitted = true;
    failFeedback = false;
    submitFeedback.mockClear();
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

  describe("questionnaire gate", () => {
    beforeEach(() => {
      feedbackSubmitted = false;
      vi.stubGlobal("fetch", tcasFetch);
      tcasFetch.mockRejectedValue(new TypeError("Failed to fetch"));
    });

    it("offers universities from the live TCAS list", async () => {
      tcasFetch.mockResolvedValue(
        Response.json([
          { university_id: "998", university_name: " มหาวิทยาลัยเปิดใหม่ " },
          { university_id: "001", university_name: "จุฬาลงกรณ์มหาวิทยาลัย" },
        ]),
      );
      renderCard();

      fireEvent.click(await screen.findByRole("button", { name: START }));
      const dialog = await screen.findByRole("dialog");
      await waitFor(() => {
        expect(tcasFetch).toHaveBeenCalledWith(TCAS_URL, expect.anything());
      });
      fireEvent.click(within(dialog).getByRole("button", { name: "แสดงรายชื่อมหาวิทยาลัย" }));

      await expect(screen.findByRole("option", { name: "มหาวิทยาลัยเปิดใหม่" })).resolves.toBeDefined();
      expect(screen.getAllByRole("option", { name: "จุฬาลงกรณ์มหาวิทยาลัย" })).toHaveLength(1);
    });

    it("keeps the built-in universities when the TCAS list cannot load", async () => {
      tcasFetch.mockResolvedValue(Response.json({ message: "maintenance" }, { status: 503 }));
      renderCard();

      fireEvent.click(await screen.findByRole("button", { name: START }));
      const dialog = await screen.findByRole("dialog");
      fireEvent.click(within(dialog).getByRole("button", { name: "แสดงรายชื่อมหาวิทยาลัย" }));

      await expect(
        screen.findByRole("option", { name: "มหาวิทยาลัยราชภัฏสุราษฎร์ธานี" }),
      ).resolves.toBeDefined();
      expect(screen.getByRole("option", { name: "วิทยาลัยดุสิตธานี" })).toBeDefined();
    });

    it("shows only the questionnaire button until the team answers", async () => {
      renderCard();

      await expect(screen.findByRole("button", { name: START })).resolves.toBeDefined();
      expect(screen.queryByRole("button", { name: DOWNLOAD_ALPHA })).toBeNull();
      expect(screen.queryByText("อัลฟา หนึ่ง")).toBeNull();
    });

    it("keeps the questionnaire open and points at missing answers", async () => {
      renderCard();

      fireEvent.click(await screen.findByRole("button", { name: START }));
      const dialog = await screen.findByRole("dialog");
      fireEvent.click(within(dialog).getByRole("button", { name: SUBMIT }));

      await expect(
        within(dialog).findByText("ยังตอบไม่ครบ กรุณาตรวจคำถามที่มีข้อความสีแดง"),
      ).resolves.toBeDefined();
      const faculty = within(dialog).getByLabelText(/คณะที่สนใจศึกษาต่อ/u);
      expect(faculty.getAttribute("aria-invalid")).toBe("true");
      expect(document.activeElement).toBe(faculty);
      expect(submitFeedback).not.toHaveBeenCalled();
    });

    it("unlocks downloads after the questionnaire is sent", async () => {
      renderCard();

      fireEvent.click(await screen.findByRole("button", { name: START }));
      const dialog = await answerQuestionnaire();
      fireEvent.click(within(dialog).getByRole("button", { name: SUBMIT }));

      await expect(screen.findByText("ขอบคุณที่ตอบแบบสอบถาม")).resolves.toBeDefined();
      expect(submitFeedback).toHaveBeenCalledWith({
        channelOther: null,
        channels: ["WEBSITE"],
        comment: "สนุกมาก",
        decisionFactors: {
          admissionQuota: 4,
          camp: 4,
          campusEnvironment: 4,
          educationGuidance: 4,
          familyAdvice: 4,
          internationalOpportunity: 4,
          jobMarket: 4,
          modernEquipment: 4,
          openHouse: 4,
          reputation: 4,
          scholarship: 4,
          seniorAdvice: 4,
          teacherAdvice: 4,
        },
        event: {
          overallSatisfaction: 4,
          publicity: 4,
          schedule: 4,
          usefulness: 4,
          websiteDesign: 4,
          websiteUsability: 4,
        },
        intendedFaculty: null,
        intendedUniversity: "มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี",
      });
      expect(screen.queryByRole("dialog")).toBeNull();
      const download = screen.getByRole("button", { name: DOWNLOAD_ALPHA });
      expect(download).toHaveProperty("disabled", false);
      expect(screen.queryByRole("button", { name: START })).toBeNull();
    });

    it("keeps the answers when sending fails", async () => {
      failFeedback = true;
      renderCard();

      fireEvent.click(await screen.findByRole("button", { name: START }));
      const dialog = await answerQuestionnaire();
      fireEvent.click(within(dialog).getByRole("button", { name: SUBMIT }));

      await expect(
        within(dialog).findByText("ส่งแบบสอบถามไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
      ).resolves.toBeDefined();
      expect(within(dialog).getByRole("checkbox", { name: "เว็บไซต์" })).toHaveProperty(
        "checked",
        true,
      );
      expect(screen.queryByRole("button", { hidden: true, name: DOWNLOAD_ALPHA })).toBeNull();
    });
  });
});
