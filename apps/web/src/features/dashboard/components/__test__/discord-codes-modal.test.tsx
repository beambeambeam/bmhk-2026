// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DiscordCodesModal from "../discord-codes-modal";

const mockParticipantsData = [
  {
    code: "ABCD1234",
    name: "John Doe",
    participantIndex: 1,
    status: "NOT_REDEEMED",
  },
  {
    code: "XYZ98765",
    name: "Jane Smith",
    participantIndex: 2,
    status: "REDEEMED",
  },
];

interface QueryOptionsResult {
  queryFn: () => Promise<typeof mockParticipantsData>;
  queryKey: string[];
}

const mockGetOrCreateQueryOptions = vi.fn<() => QueryOptionsResult>().mockReturnValue({
  queryFn: async () => await Promise.resolve(mockParticipantsData),
  queryKey: ["discordCodes", "getOrCreate"],
});

// oxlint-disable-next-line vitest/prefer-import-in-mock -- Boundary fake supplies procedures.
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
  });

  afterEach(cleanup);

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
    expect(screen.getByText("/verify")).toBeDefined();

    const inviteLink = screen.getByRole("link", { name: "Discord Server ของการแข่งขัน" });
    expect(inviteLink.getAttribute("href")).toBe("https://discord.gg/bangmodhackathon");

    const verifyChannelLink = screen.getByRole("link", { name: "#verify" });
    expect(verifyChannelLink.getAttribute("href")).toBe(
      "https://discord.com/channels/1549696123826864249/1549696124611203093",
    );
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
      expect(screen.getByText("John Doe")).toBeDefined();
    });

    expect(screen.getByText("ABCD1234")).toBeDefined();
    expect(screen.getByText("ยังไม่ยืนยัน")).toBeDefined();
    expect(screen.getByText("Jane Smith")).toBeDefined();
    expect(screen.getByText("ยืนยันตัวตนแล้ว")).toBeDefined();
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
      expect(screen.getByText("ABCD1234")).toBeDefined();
    });

    const copyButtons = screen.getAllByRole("button", { name: /คัดลอก/u });
    expect(copyButtons.length).toBeGreaterThan(1);

    fireEvent.click(copyButtons[1]);

    expect(writeTextMock).toHaveBeenCalledWith("ABCD1234");
    await waitFor(() => {
      expect(screen.getByText("คัดลอกแล้ว")).toBeDefined();
    });
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

    const batchCopyButton = screen.getByRole("button", { name: /คัดลอกรหัสทั้งหมด/u });
    fireEvent.click(batchCopyButton);

    const expectedText = [
      "รหัสเข้าร่วม Discord สำหรับทีม Awesome Team:",
      "Discord Server: https://discord.gg/bangmodhackathon",
      "1. John Doe: ABCD1234",
      "2. Jane Smith: XYZ98765",
    ].join("\n");

    expect(writeTextMock).toHaveBeenCalledWith(expectedText);
    await waitFor(() => {
      expect(screen.getByText("คัดลอกครบทุกคนแล้ว")).toBeDefined();
    });
  });

  it("calls onClose when close button is clicked", () => {
    const onCloseMock = vi.fn<() => void>();
    renderWithClient(<DiscordCodesModal open={true} onClose={onCloseMock} />);

    const closeButton = screen.getByRole("button", { name: "ปิด" });
    fireEvent.click(closeButton);

    expect(onCloseMock).toHaveBeenCalledOnce();
  });
});
