// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DiscordCodesModal from "../discord-codes-modal";

const mockParticipantsData = [
  {
    code: "DISC1234",
    name: "สมชาย เข็มกลัด",
    participantIndex: 1,
    status: "NOT_REDEEMED",
  },
  {
    code: "DISC5678",
    name: "สมหญิง จริงใจ",
    participantIndex: 2,
    status: "REDEEMED_ONCE",
  },
];

interface QueryOptionsResult {
  queryFn: () => Promise<typeof mockParticipantsData>;
  queryKey: string[];
}

const mockGetOrCreateQueryOptions = vi.fn<() => QueryOptionsResult>();

// oxlint-disable-next-line vitest/prefer-import-in-mock
vi.mock("@bmhk-2026/client/orpc", () => ({
  orpc: {
    discordCodes: {
      getOrCreate: {
        queryOptions: (): QueryOptionsResult => mockGetOrCreateQueryOptions(),
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

describe(DiscordCodesModal, () => {
  let writeTextMock: ReturnType<typeof vi.fn<() => Promise<void>>>;

  beforeEach(() => {
    writeTextMock = vi.fn<() => Promise<void>>().mockResolvedValue();
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    mockGetOrCreateQueryOptions.mockReturnValue({
      queryFn: async () => await Promise.resolve(mockParticipantsData),
      queryKey: ["discordCodes", "getOrCreate"],
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders modal header and verification instructions", () => {
    renderWithClient(
      <DiscordCodesModal
        open={true}
        onClose={() => {
          /* noop */
        }}
        teamName="Awesome Team"
      />,
    );

    expect(screen.getByText("รหัสเข้าร่วม Discord")).toBeDefined();
    expect(screen.getByText("วิธียืนยันตัวตนด้วยคำสั่ง /verify")).toBeDefined();
    expect(screen.getByText("/verify")).toBeDefined();
  });

  it("displays participant codes and redemption badges", async () => {
    renderWithClient(
      <DiscordCodesModal
        open={true}
        onClose={() => {
          /* noop */
        }}
        teamName="Awesome Team"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("สมชาย เข็มกลัด")).toBeDefined();
      expect(screen.getByText("DISC1234")).toBeDefined();
      expect(screen.getByText("ยังไม่ยืนยัน")).toBeDefined();
      expect(screen.getByText("ยืนยันตัวตนแล้ว")).toBeDefined();
    });

    const inviteLink = screen.getByRole("link", { name: /ไปยัง Discord Server/iu });
    expect(inviteLink.getAttribute("href")).toBe("https://discord.gg/bangmodhackathon");
  });

  it("copies single code when copy button is clicked", async () => {
    renderWithClient(
      <DiscordCodesModal
        open={true}
        onClose={() => {
          /* noop */
        }}
        teamName="Awesome Team"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("DISC1234")).toBeDefined();
    });

    const copyButtons = screen.getAllByRole("button", { name: /คัดลอก/iu });
    fireEvent.click(copyButtons[1]);

    expect(writeTextMock).toHaveBeenCalledWith("DISC1234");
  });

  it("copies all codes when batch copy button is clicked", async () => {
    renderWithClient(
      <DiscordCodesModal
        open={true}
        onClose={() => {
          /* noop */
        }}
        teamName="Awesome Team"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("คัดลอกรหัสทั้งหมด")).toBeDefined();
    });

    const copyAllButton = screen.getByRole("button", { name: /คัดลอกรหัสทั้งหมด/iu });
    fireEvent.click(copyAllButton);

    expect(writeTextMock).toHaveBeenCalledWith(
      "รหัสเข้าร่วม Discord สำหรับทีม Awesome Team:\n1. สมชาย เข็มกลัด: DISC1234\n2. สมหญิง จริงใจ: DISC5678",
    );
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn<() => void>();
    renderWithClient(
      <DiscordCodesModal
        open={true}
        onClose={() => {
          handleClose();
        }}
        teamName="Awesome Team"
      />,
    );

    const closeButton = screen.getByRole("button", { name: "ปิด" });
    fireEvent.click(closeButton);

    expect(handleClose).toHaveBeenCalledOnce();
  });
});
