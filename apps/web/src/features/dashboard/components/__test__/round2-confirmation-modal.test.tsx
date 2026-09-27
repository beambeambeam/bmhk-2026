// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Round2ConfirmationModal from "../round2-confirmation-modal";

interface MockStatus {
  confirmedAt: Date | null;
  isComplete: boolean;
  isEligible: boolean;
  isOpen: boolean;
  memberCount: number;
  participants: {
    id: string;
    identityDocumentFileId: string | null;
    index: number;
    studentIdDocumentFileId: string | null;
  }[];
  state: "DRAFT" | "CONFIRMED";
  teamId: string;
}

const mockStatusDraftIncomplete: MockStatus = {
  confirmedAt: null,
  isComplete: false,
  isEligible: true,
  isOpen: true,
  memberCount: 2,
  participants: [
    {
      id: "p-1",
      identityDocumentFileId: null,
      index: 1,
      studentIdDocumentFileId: null,
    },
    {
      id: "p-2",
      identityDocumentFileId: null,
      index: 2,
      studentIdDocumentFileId: null,
    },
  ],
  state: "DRAFT",
  teamId: "team-123",
};

const mockStatusDraftComplete = {
  confirmedAt: null,
  isComplete: true,
  isEligible: true,
  isOpen: true,
  memberCount: 2,
  participants: [
    {
      id: "p-1",
      identityDocumentFileId: "file-id-1",
      index: 1,
      studentIdDocumentFileId: "file-id-2",
    },
    {
      id: "p-2",
      identityDocumentFileId: "file-id-3",
      index: 2,
      studentIdDocumentFileId: "file-id-4",
    },
  ],
  state: "DRAFT" as const,
  teamId: "team-123",
};

const mockStatusConfirmed = {
  confirmedAt: new Date("2026-10-05T10:30:00Z"),
  isComplete: true,
  isEligible: true,
  isOpen: true,
  memberCount: 2,
  participants: [
    {
      id: "p-1",
      identityDocumentFileId: "file-id-1",
      index: 1,
      studentIdDocumentFileId: "file-id-2",
    },
    {
      id: "p-2",
      identityDocumentFileId: "file-id-3",
      index: 2,
      studentIdDocumentFileId: "file-id-4",
    },
  ],
  state: "CONFIRMED" as const,
  teamId: "team-123",
};

let currentStatus: MockStatus = mockStatusDraftIncomplete;
let currentStatusError: Error | null = null;

const mockDocumentResult = {
  contentType: "application/pdf",
  id: "file-1",
  originalName: "test-id-card.pdf",
  sizeBytes: 2 * 1024 * 1024,
  uploadedAt: new Date("2026-10-01T00:00:00Z"),
  url: "https://example.com/test-id-card.pdf",
};

const mockSubmitMutation = vi.fn<(vars: { teamId: string }) => void>();

// oxlint-disable-next-line vitest/prefer-import-in-mock -- Boundary fake supplies procedures.
vi.mock("@bmhk-2026/client/orpc", () => ({
  orpc: {
    round2Confirmation: {
      document: {
        key: (opts: { input: { documentType: string; participantId: string; teamId: string } }) => [
          "round2Confirmation",
          "document",
          opts.input,
        ],
        queryOptions: () => ({
          queryFn: async () => await Promise.resolve(mockDocumentResult),
          queryKey: ["round2Confirmation", "document"],
        }),
      },
      get: {
        key: () => ["round2Confirmation", "get"],
        queryOptions: () => ({
          queryFn: async () => {
            if (currentStatusError !== null) {
              throw new Error(currentStatusError.message);
            }
            return await Promise.resolve(currentStatus);
          },
          queryKey: ["round2Confirmation", "get"],
        }),
      },
      submit: {
        mutationOptions: () => ({
          mutationFn: async (vars: { teamId: string }) => {
            mockSubmitMutation(vars);
            return await Promise.resolve({
              ...currentStatus,
              confirmedAt: new Date(),
              state: "CONFIRMED",
            });
          },
        }),
      },
      uploadDocument: {
        mutationOptions: () => ({
          mutationFn: async () =>
            await Promise.resolve({
              fileId: "new-file-id",
              previousFileId: null,
              status: currentStatus,
            }),
        }),
      },
    },
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe(Round2ConfirmationModal, () => {
  const participants = [
    {
      firstNameTh: "สมชาย",
      id: "p-1",
      index: 1,
      lastNameTh: "ใจดี",
      titleTh: "นาย",
    },
    {
      firstNameTh: "สมหญิง",
      id: "p-2",
      index: 2,
      lastNameTh: "รักเรียน",
      titleTh: "นางสาว",
    },
  ];

  beforeEach(() => {
    currentStatus = mockStatusDraftIncomplete;
    currentStatusError = null;
    mockSubmitMutation.mockClear();
  });

  afterEach(cleanup);

  it("renders modal header with title and advisor exclusion note", async () => {
    renderWithClient(
      <Round2ConfirmationModal
        open={true}
        onClose={() => {}}
        teamId="team-123"
        participants={participants}
      />,
    );

    await expect(screen.findByText("ยืนยันสิทธิ์การเข้าแข่งขันรอบรองชนะเลิศ")).resolves.toBeDefined();
    expect(screen.getByText("*อาจารย์ที่ปรึกษาไม่ต้องอัปโหลดเอกสารยืนยันสิทธิ์ใหม่")).toBeDefined();
  });

  it("renders student tabs with participant names", async () => {
    renderWithClient(
      <Round2ConfirmationModal
        open={true}
        onClose={() => {}}
        teamId="team-123"
        participants={participants}
      />,
    );

    const participant1Nodes = await screen.findAllByText(/ผู้เข้าแข่งขันคนที่ 1/u);
    expect(participant1Nodes.length).toBeGreaterThanOrEqual(1);

    const participant2Nodes = screen.getAllByText(/ผู้เข้าแข่งขันคนที่ 2/u);
    expect(participant2Nodes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders National ID and Student ID upload requirements", async () => {
    renderWithClient(
      <Round2ConfirmationModal
        open={true}
        onClose={() => {}}
        teamId="team-123"
        participants={participants}
      />,
    );

    await expect(
      screen.findByText(/สำเนาบัตรประจำตัวประชาชน หรือบัตรประจำตัวสำหรับบุคคลที่ไม่ใช่สัญชาติไทย/u),
    ).resolves.toBeDefined();
    expect(screen.getByText(/สำเนาบัตรประจำตัวนักเรียน หรือหนังสือรับรองสถานภาพนักเรียน/u)).toBeDefined();
  });

  it("disables submit button when incomplete or declaration is unchecked", async () => {
    renderWithClient(
      <Round2ConfirmationModal
        open={true}
        onClose={() => {}}
        teamId="team-123"
        participants={participants}
      />,
    );

    const submitBtn = await screen.findByRole("button", { name: "ยืนยันสิทธิ์" });
    expect(submitBtn.hasAttribute("disabled")).toBeTruthy();

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    // Still disabled because documents are incomplete
    expect(submitBtn.hasAttribute("disabled")).toBeTruthy();
  });

  it("enables submit button and opens confirmation alert when complete and checked", async () => {
    currentStatus = mockStatusDraftComplete;

    renderWithClient(
      <Round2ConfirmationModal
        open={true}
        onClose={() => {}}
        teamId="team-123"
        participants={participants}
      />,
    );

    const submitBtn = await screen.findByRole("button", { name: "ยืนยันสิทธิ์" });
    expect(submitBtn.hasAttribute("disabled")).toBeTruthy();

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(submitBtn.hasAttribute("disabled")).toBeFalsy();

    fireEvent.click(submitBtn);

    // Confirmation alert should pop up
    await expect(
      screen.findByText(
        "เมื่อยืนยันแล้วจะไม่สามารถแก้ไขหรืออัปโหลดเอกสารใหม่ได้อีก คุณแน่ใจหรือไม่ว่าต้องการยืนยันสิทธิ์สำหรับทีมของคุณ?",
      ),
    ).resolves.toBeDefined();

    // Clicking confirm in alert calls submit
    const confirmAlertBtns = screen.getAllByRole("button", { name: "ยืนยันสิทธิ์" });
    const finalConfirmBtn = confirmAlertBtns.at(-1);
    expect(finalConfirmBtn).toBeDefined();
    if (finalConfirmBtn !== undefined) {
      fireEvent.click(finalConfirmBtn);
    }

    await waitFor(() => {
      expect(mockSubmitMutation).toHaveBeenCalledWith({ teamId: "team-123" });
    });
  });

  it("renders read-only view when confirmation has been submitted", async () => {
    currentStatus = mockStatusConfirmed;

    renderWithClient(
      <Round2ConfirmationModal
        open={true}
        onClose={() => {}}
        teamId="team-123"
        participants={participants}
      />,
    );

    await expect(
      screen.findByText(/ยืนยันสิทธิ์การเข้าแข่งขันรอบรองชนะเลิศเรียบร้อยแล้วเมื่อ/u),
    ).resolves.toBeDefined();
    const closeButtons = screen.getAllByRole("button", { name: "ปิด" });
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
    // No checkbox or submit button in read-only mode
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("does not show forfeiture when confirmation status fails to load", async () => {
    currentStatusError = new Error("Temporary network failure");

    renderWithClient(
      <Round2ConfirmationModal
        open={true}
        onClose={() => {}}
        teamId="team-123"
        participants={participants}
      />,
    );

    await expect(screen.findByText("ไม่สามารถโหลดข้อมูลการยืนยันสิทธิ์ได้")).resolves.toBeDefined();
    expect(screen.getByRole("button", { name: "ลองใหม่อีกครั้ง" })).toBeDefined();
    expect(screen.queryByText("หมดเวลาการยืนยันสิทธิ์การเข้าแข่งขันรอบรองชนะเลิศแล้ว")).toBeNull();
  });

  it("calls onClose when close button is clicked", async () => {
    const handleClose = vi.fn<() => void>();

    renderWithClient(
      <Round2ConfirmationModal
        open={true}
        onClose={() => {
          handleClose();
        }}
        teamId="team-123"
        participants={participants}
      />,
    );

    const closeButtons = await screen.findAllByRole("button", { name: "ปิด" });
    const [closeBtn] = closeButtons;
    expect(closeBtn).toBeDefined();
    if (closeBtn !== undefined) {
      fireEvent.click(closeBtn);
    }
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the modal backdrop is clicked", async () => {
    const handleClose = vi.fn<() => void>();

    renderWithClient(
      <Round2ConfirmationModal
        open={true}
        onClose={() => {
          handleClose();
        }}
        teamId="team-123"
        participants={participants}
      />,
    );

    const backdropButton = await screen.findByRole("button", {
      name: "ปิดหน้าต่างยืนยันสิทธิ์",
    });
    fireEvent.click(backdropButton);

    expect(handleClose).toHaveBeenCalledOnce();
  });
});
