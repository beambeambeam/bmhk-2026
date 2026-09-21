import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@bmhk-2026/client/orpc";
import { env } from "@bmhk-2026/env/web";
import { ExternalLink, RefreshCw } from "lucide-react";

import useDialogFocus, { useScrollLock } from "./use-dialog-focus";
import { DiscordGlyph } from "./status-panel";

const CLOSE = "/assets/figma/36f13a184206ab27dedb4992d9d5b63a3a3f8cb6.svg";
const COPY = "/assets/figma/85282b0baf589ceb0eb17e9e2d027684e76a4e8b.svg";
const DISCORD_ICON = "/assets/figma/9769d281893b12798e8f55f41d05010cbd556d76.svg";
const DISCORD_32 = "/assets/figma/8353328712043444b22094d1885d9862cc9e8a45.svg";

/** How long the exit transition runs in styles/auth-motion.css. */
const EXIT_MS = 220;

/** How long the copy feedback icon stays active before reverting. */
const COPIED_MS = 1600;

function Tick({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className={className}>
      <path
        d="M4 10.5 8 14.5 16 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Discord mention pill replicated from skyra-project/discord-components
 * (hsla(235, 85.6%, 64.7%, 0.15) background, 3px border-radius, blurple hover).
 */
function DiscordMention({
  type = "channel",
  children,
  href,
}: {
  type?: "channel" | "slash";
  children: string;
  href?: string;
}) {
  const prefix = type === "channel" ? "#" : "/";
  const badge = (
    <span className="inline-flex items-center rounded-[3px] bg-[#5865f2]/15 px-1 py-0.5 font-sans text-xs font-medium text-[#5865f2] transition-colors duration-75 select-none hover:bg-[#5865f2] hover:text-white">
      {prefix}
      {children}
    </span>
  );

  if (typeof href === "string" && href.trim() !== "") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
      >
        {badge}
      </a>
    );
  }

  return badge;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "ไม่สามารถสร้างหรือดึงรหัส Discord ได้";
}

interface DiscordCodesModalProps {
  open: boolean;
  onClose: () => void;
  teamName?: string;
}

export default function DiscordCodesModal({
  open,
  onClose,
  teamName,
}: DiscordCodesModalProps) {
  const [mounted, setMounted] = useState(open);
  const [state, setState] = useState<"open" | "closed">(open ? "open" : "closed");
  const sheetRef = useRef<HTMLDivElement>(null);

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const inviteUrl = env.VITE_DISCORD_INVITE_URL;
  const verifyChannelUrl = env.VITE_DISCORD_VERIFY_CHANNEL_URL;

  // oRPC call: automatically get or create codes for the team when modal is open.
  // Cache indefinitely so reopening the dialog reuses previously generated codes.
  const {
    data: participants,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    ...orpc.discordCodes.getOrCreate.queryOptions(),
    enabled: open,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useDialogFocus(open && mounted, sheetRef);
  useScrollLock(open);

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setMounted(true);
      });
      const frame = requestAnimationFrame(() => {
        setState("open");
      });
      return () => {
        cancelAnimationFrame(frame);
      };
    }
    queueMicrotask(() => {
      setState("closed");
    });
    const timer = window.setTimeout(() => {
      setMounted(false);
    }, EXIT_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    if (open) {
      document.addEventListener("keydown", onKey);
      cleanup = () => {
        document.removeEventListener("keydown", onKey);
      };
    }

    return cleanup;
  }, [open, onClose]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (copiedIndex !== null) {
      const timer = window.setTimeout(() => {
        setCopiedIndex(null);
      }, COPIED_MS);
      cleanup = () => {
        window.clearTimeout(timer);
      };
    }
    return cleanup;
  }, [copiedIndex]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (copiedAll) {
      const timer = window.setTimeout(() => {
        setCopiedAll(false);
      }, COPIED_MS);
      cleanup = () => {
        window.clearTimeout(timer);
      };
    }
    return cleanup;
  }, [copiedAll]);

  async function copySingle(code: string, index: number) {
    if (code.trim() === "" || code === "-") {
      return;
    }
    if (typeof navigator.clipboard?.writeText !== "function") {
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
    } catch {
      // Clipboard write failed or permission denied
    }
  }

  async function copyAll() {
    if (participants === undefined || participants.length === 0) {
      return;
    }
    if (typeof navigator.clipboard?.writeText !== "function") {
      return;
    }
    const hasTeamName = typeof teamName === "string" && teamName.trim() !== "";
    const header = hasTeamName
      ? `รหัสเข้าร่วม Discord สำหรับทีม ${teamName}:`
      : "รหัสเข้าร่วม Discord:";
    const serverLine = `Discord Server: ${inviteUrl}`;
    const lines = participants.map((p) => `${p.participantIndex}. ${p.name}: ${p.code ?? "-"}`);
    const text = [header, serverLine, ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
    } catch {
      // Clipboard write failed or permission denied
    }
  }

  if (!mounted) {
    return null;
  }

  const errorMessage = getErrorMessage(error);

  return (
    <div
      // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="button"
      tabIndex={0}
      data-state={state}
      className="auth-modal-scrim fixed inset-0 z-50 overflow-y-auto bg-[rgba(194,194,194,0.3)] backdrop-blur-[5px]"
      onClick={(e) => {
        if (sheetRef.current && e.target instanceof Node && sheetRef.current.contains(e.target)) {
          return;
        }
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          if (sheetRef.current && e.target instanceof Node && sheetRef.current.contains(e.target)) {
            return;
          }
          onClose();
        }
      }}
    >
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-8">
        <div
          ref={sheetRef}
          // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
          role="dialog"
          aria-modal="true"
          aria-label="รหัสเข้าร่วม Discord"
          tabIndex={-1}
          data-state={state}
          className="auth-modal-sheet relative flex w-full max-w-[620px] flex-col items-stretch gap-6 rounded-[28px] border border-[#dcdcdc] bg-white p-6 shadow-xl outline-none sm:p-8"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="mm-press-icon absolute top-5 right-5 size-[32px] overflow-clip transition-opacity hover:opacity-70"
          >
            <img src={CLOSE} alt="" aria-hidden className="block size-full" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-4">
            <span className="flex size-[48px] shrink-0 items-center justify-center rounded-[16px] bg-[rgba(88,101,242,0.1)] p-[10px] shadow-[inset_0_0_0_1px_rgba(88,101,242,0.2)]">
              <DiscordGlyph size={28} src={DISCORD_ICON} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1 pr-8">
              <h2 className="fl-20 font-display leading-[1.3] font-semibold text-ink">
                รหัสเข้าร่วม Discord
              </h2>
              <p className="fl-14 leading-normal text-gray-2">
                นำรหัสของสมาชิกแต่ละคนไปยืนยันตัวตนใน Discord เพื่อรับสิทธิ์เข้าแข่งขัน
              </p>
            </div>
          </div>

          {/* Verification Command Instruction Box */}
          <div className="flex flex-col gap-2 rounded-[16px] border border-[#e0e4fc] bg-[#f8f9ff] p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-[#4752c4]">
              <span className="flex size-5 items-center justify-center rounded-full bg-[#5865f2]/15 text-xs font-bold">
                i
              </span>
              <span>วิธียืนยันตัวตนด้วยคำสั่ง /verify</span>
            </div>
            <ol className="flex flex-col gap-1.5 ps-6 text-gray-2 list-decimal">
              <li>
                เข้าร่วม{" "}
                <a
                  href={inviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#5865f2] underline decoration-[#5865f2]/40 underline-offset-2 transition-colors hover:decoration-[#5865f2]"
                >
                  Discord Server ของการแข่งขัน
                </a>
              </li>
              <li>
                ไปที่ห้องยืนยันตัวตน (
                <DiscordMention type="channel" href={verifyChannelUrl}>
                  verify
                </DiscordMention>
                )
              </li>
              <li>
                พิมพ์คำสั่ง{" "}
                <DiscordMention type="slash">verify</DiscordMention>{" "}
                แล้วกรอกรหัส 8 หลักของตนเองเพื่อรับสิทธิ์และยศผู้เข้าแข่งขัน
              </li>
            </ol>
          </div>

          {/* Main Content: Loading / Error / List */}
          {isPending && (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <RefreshCw className="size-7 animate-spin text-[#5865f2]" />
              <p className="fl-14 text-gray-2">กำลังโหลดรหัส Discord ของทีม...</p>
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center gap-3 rounded-[16px] border border-brand-red/20 bg-brand-red/5 p-6 text-center">
              <p className="fl-14 font-medium text-brand-red">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={() => {
                  void refetch();
                }}
                className="mm-press inline-flex items-center gap-2 rounded-[10px] bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-gray-50"
              >
                <RefreshCw className="size-4" />
                ลองใหม่อีกครั้ง
              </button>
            </div>
          )}

          {!isPending && !isError && participants !== undefined && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="fl-14 font-medium text-ink">รายชื่อสมาชิกและรหัสประจำตัว</span>
                <button
                  type="button"
                  onClick={() => {
                    void copyAll();
                  }}
                  className="mm-press inline-flex items-center gap-1.5 text-xs font-medium text-gray-2 transition-colors hover:text-ink"
                >
                  {copiedAll ? (
                    <>
                      <Tick className="size-3.5 text-brand-green" />
                      <span className="text-brand-green">คัดลอกครบทุกคนแล้ว</span>
                    </>
                  ) : (
                    <>
                      <img src={COPY} alt="" aria-hidden className="size-3.5 opacity-60" />
                      <span>คัดลอกรหัสทั้งหมด</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1">
                {participants.map((p) => {
                  const isRedeemed = p.status === "REDEEMED_ONCE" || p.status === "REDEEMED_TWICE";
                  const code = p.code ?? "-";
                  const isCopied = copiedIndex === p.participantIndex;

                  return (
                    <div
                      key={p.participantIndex}
                      className="flex flex-col gap-2.5 rounded-[16px] border border-[#e8e8e8] bg-[#fafafa] p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-gray-2">
                            คนที่ {p.participantIndex}
                          </span>
                          <span className="truncate text-sm font-medium text-ink">
                            {p.name}
                          </span>
                        </div>
                        {isRedeemed ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-green/10 px-2 py-0.5 text-xs font-medium text-brand-green">
                            <Tick className="size-3 text-brand-green" />
                            ยืนยันตัวตนแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700">
                            ยังไม่ยืนยัน
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3 rounded-[10px] bg-white px-3 py-2 shadow-[inset_0_0_0_1px_#ebebeb]">
                        <span className="font-mono text-base font-bold tracking-widest text-ink select-all sm:text-lg">
                          {code}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            void copySingle(code, p.participantIndex);
                          }}
                          className="mm-press flex items-center gap-1.5 rounded-[8px] bg-[#f5f5f5] px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-[#ececec]"
                        >
                          {isCopied ? (
                            <>
                              <Tick className="size-3.5 text-brand-green" />
                              <span className="text-brand-green">คัดลอกแล้ว</span>
                            </>
                          ) : (
                            <>
                              <img src={COPY} alt="" aria-hidden className="size-3.5 opacity-60" />
                              <span>คัดลอก</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="flex flex-col gap-3 pt-2">
            <a
              href={inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mm-press flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#5865f2] px-4 py-3 font-display fl-16 leading-normal font-semibold text-white transition-opacity hover:opacity-90"
            >
              <DiscordGlyph size={24} src={DISCORD_32} />
              <span>ไปยัง Discord Server</span>
              <ExternalLink className="size-4 opacity-75 ml-1" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
