import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import Navbar from "@/components/navbar/navbar";
import ScrollEdgeEffect from "@/components/scroll-edge-effect";
import PersonDetails from "./components/person-details";
import ResultModal from "./components/result-modal";
import StatusPanel, { DiscordGlyph } from "./components/status-panel";
import TeamDecor from "./components/team-decor";
import { MEMBERS, QUALIFIED_MODAL, REJECTED_MODAL, STATUS_VARIANTS, TEAM } from "./team-data";
import type { TeamStatus } from "./team-data";

const COPY = "/assets/figma/85282b0baf589ceb0eb17e9e2d027684e76a4e8b.svg";
const DISCORD_32 = "/assets/figma/8353328712043444b22094d1885d9862cc9e8a45.svg";

function isStatus(value: string | null): value is TeamStatus {
  return value !== null && (STATUS_VARIANTS as readonly (string | null)[]).includes(value);
}

/** The indicator is drawn at this width and scaled to each tab, so only transform animates. */
const BAR_W = 100;

/** How long the copy button holds its tick before returning to the copy glyph. */
const COPIED_MS = 1600;

/**
 * The copy affordance's box, on both anchors: `1297:1140` is 16 on the 402 dashboard,
 * `708:2326` 20 at 1440. `size-[20px]` was the 1440 figure held flat — a 20px control between a
 * 14px "รหัสทีม" label and its value on a phone. Lands on 20.000 at `--fl` = 1.
 *
 * One constant for the button, the glyph and the tick, so the swap's two layers can never
 * disagree about the box they share.
 */
const COPY_BOX = "size-[calc(15.896px_+_4.104*var(--fl))]";

/**
 * The team lockup's own ranks, both anchors measured, and all three were the 1440 value held
 * flat — the same class of defect PersonDetails' header block already records.
 *
 *   รหัสทีม / สถานศึกษา type   14/400 @402 (`1297:1138`, `1297:1143`, lh 19.6)
 *                              18/400 @1440 (`708:2324`, `708:2329`, lh 25.2)   was `fl-18` (16@402)
 *   those rows' inline gap      8 @402 (`1297:1137`, `1297:1142`)
 *                              12 @1440 (`708:2323`, `708:2328`)                was flat 12
 *   title → code → school gap   8 @402 (`1297:1135`)
 *                              16 @1440 (`708:2321`)                            was flat 16
 *
 * The title itself is NOT in this list: `1297:1136` is 20/500 and `708:2322` 24/500, which is
 * exactly `fl-24`'s own 20 → 24 ramp, so it already lands on both anchors.
 *
 * Weight is 400 at both anchors on every line here, i.e. the inherited body weight, so nothing
 * below carries a weight class and nothing becomes a breakpoint.
 */
const LOCKUP_14_18 = "text-[calc(13.896px_+_4.104*var(--fl))]";
const LOCKUP_ROW_GAP_8_12 = "gap-[calc(7.896px_+_4.104*var(--fl))]";
const LOCKUP_STACK_GAP_8_16 = "gap-[calc(7.792px_+_8.208*var(--fl))]";

/** No Figma asset for the copied state — the tick is drawn in the tone the labels use. */
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

/** Modal call to action — Figma sets these labels in Sukhumvit Set Semi Bold, not Noto. */
function ModalButton({
  href,
  className,
  icon,
  children,
}: {
  href: string;
  className: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`mm-press flex w-full items-center justify-center gap-4 rounded-[16px] px-4 py-3 font-display fl-20 leading-normal font-semibold transition-opacity hover:opacity-90 ${className}`}
    >
      {icon}
      {children}
    </a>
  );
}

const SWITCH_PILL =
  "mm-press relative flex h-10 flex-1 items-center justify-center px-3 py-1 text-[16px] leading-[1.511] transition-colors";

const SWITCH_PILL_ON = "rounded-[12px] font-medium text-ink";

const SWITCH_PILL_OFF = "rounded-[24px] font-normal text-gray-2 hover:bg-black/[0.03]";

/** The two panes the phone switcher chooses between, in the order Figma lays them out. */
const PANES = [
  { key: "team", label: "ข้อมูลทีม" },
  { key: "status", label: "สถานะ" },
] as const;

type Pane = (typeof PANES)[number]["key"];

export default function MyTeam() {
  const search = useSearch({ from: "/_auth/dashboard" }) as Record<string, unknown>;
  const statusParam = typeof search.status === "string" ? search.status : null;
  const status: TeamStatus = isStatus(statusParam) ? statusParam : "reviewing";

  const [pane, setPane] = useState<Pane>("team");
  const paneTabs = useRef<HTMLDivElement>(null);

  const [active, setActive] = useState(status === "issue" ? MEMBERS.length - 1 : 0);
  const initialModal = typeof search.modal === "string" ? search.modal : null;
  const [modal, setModal] = useState<string | null>(initialModal);

  const modalOpen = modal === "qualified" || modal === "rejected";
  const [copiedAt, setCopiedAt] = useState(0);
  const copied = copiedAt !== 0;

  const person = MEMBERS[active];

  const tabsRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState<{ x: number; y: number; w: number } | null>(null);

  useLayoutEffect(() => {
    let cleanup: (() => void) | undefined;
    const list = tabsRef.current;

    function measure() {
      if (!list) {
        return;
      }
      const tab = list.children[active];
      if (tab instanceof HTMLElement) {
        setBar({
          w: tab.offsetWidth,
          x: tab.offsetLeft,
          y: tab.offsetTop + tab.offsetHeight - 2,
        });
      }
    }

    if (list) {
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(list);
      cleanup = () => {
        observer.disconnect();
      };
    }
    return cleanup;
  }, [active]);

  // the tick is a confirmation, not a mode — it hands the copy glyph back on its own
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (copiedAt) {
      const timer = window.setTimeout(() => {
        setCopiedAt(0);
      }, COPIED_MS);
      cleanup = () => {
        window.clearTimeout(timer);
      };
    }
    return cleanup;
  }, [copiedAt]);

  return (
    <div className="relative min-h-dvh overflow-clip bg-[#fefdfc]" data-auth-entrance>
      <TeamDecor />
      <ScrollEdgeEffect className="absolute inset-x-0 top-0 z-10 h-[calc(106px_+_54*var(--fl))]" />
      <div
        data-recede={modalOpen}
        className="auth-recede shell-dash relative z-20 mx-auto flex w-full max-w-[1440px] flex-col items-center gap-[calc(24px_+_16*var(--fl))] pt-[calc(24px_+_36*var(--fl))] pb-16"
      >
        <Navbar />

        <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
          <div className="flex w-full min-w-0 flex-1 flex-col items-start gap-8 rounded-[20px] bg-white p-4 shadow-soft">
            <div
              ref={paneTabs}
              role="tablist"
              aria-label="มุมมองข้อมูลทีม"
              data-rise="1"
              className="auth-rise relative flex w-full gap-1.5 rounded-[16px] bg-white p-1 shadow-[inset_0_0_0_0.5px_#dcdcdc] lg:hidden"
            >
              <span
                aria-hidden
                className="mm-indicator pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%_-_7px)] rounded-[12px] bg-[#f3f3f3]"
                style={{
                  transform:
                    pane === PANES[0].key ? "translateX(0)" : "translateX(calc(100% + 6px))",
                }}
              />

              {PANES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`pane-tab-${key}`}
                  aria-selected={pane === key}
                  aria-controls={`pane-${key}`}
                  tabIndex={pane === key ? 0 : -1}
                  onClick={() => {
                    setPane(key);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
                      return;
                    }
                    event.preventDefault();
                    const next = PANES[(PANES.findIndex((p) => p.key === key) + 1) % PANES.length];
                    setPane(next.key);
                    paneTabs.current
                      ?.querySelector<HTMLButtonElement>(`#pane-tab-${next.key}`)
                      ?.focus();
                  }}
                  className={`${SWITCH_PILL} ${pane === key ? SWITCH_PILL_ON : SWITCH_PILL_OFF}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              id="pane-team"
              aria-labelledby="pane-tab-team"
              className={`w-full min-w-0 flex-col items-start gap-8 ${
                pane === "team" ? "flex" : "hidden lg:flex"
              }`}
            >
              <div
                className="auth-rise auth-rise-sm flex w-full flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-start"
                data-rise="1"
              >
                <div className="size-[116px] shrink-0 rounded-2xl bg-[#ebebeb] sm:size-auto sm:aspect-square sm:self-stretch" />
                <div
                  className={`flex min-w-0 flex-1 flex-col items-center ${LOCKUP_STACK_GAP_8_16} sm:items-start`}
                >
                  <h1 className="fl-24 leading-[1.4] font-medium">{TEAM.name}</h1>
                  <p
                    className={`flex items-center ${LOCKUP_ROW_GAP_8_12} ${LOCKUP_14_18} leading-[1.4]`}
                  >
                    <span className="text-gray-2">รหัสทีม</span>
                    <span>{TEAM.code}</span>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(TEAM.code);
                        setCopiedAt(Date.now());
                      }}
                      aria-label={copied ? "คัดลอกรหัสทีมแล้ว" : "คัดลอกรหัสทีม"}
                      data-on={copied}
                      className={`mm-swap mm-press-icon transition-opacity hover:opacity-60 ${COPY_BOX}`}
                    >
                      <img src={COPY} alt="" aria-hidden className={`mm-swap-off ${COPY_BOX}`} />
                      <Tick className={`mm-swap-on text-brand-green ${COPY_BOX}`} />
                    </button>
                  </p>
                  <p
                    className={`flex flex-wrap items-start ${LOCKUP_ROW_GAP_8_12} ${LOCKUP_14_18} leading-[1.4]`}
                  >
                    <span className="text-gray-2">สถานศึกษา</span>
                    <span>{TEAM.school}</span>
                  </p>
                </div>
              </div>
              <div
                ref={tabsRef}
                role="tablist"
                aria-label="สมาชิกในทีม"
                className="auth-rise relative flex w-full flex-nowrap items-center gap-2 overflow-x-auto overflow-y-clip [overscroll-behavior-x:contain]"
                data-rise="2"
              >
                {MEMBERS.map((member, i) => {
                  const on = i === active;
                  return (
                    <button
                      key={member.tab}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => {
                        setActive(i);
                      }}
                      className={`mm-press flex shrink-0 items-start gap-2 px-[calc(7.896px_+_4.104*var(--fl))] py-2 ${LOCKUP_14_18} leading-normal transition-colors ${
                        on ? "font-semibold" : "rounded-2xl bg-white text-gray-2"
                      }`}
                    >
                      <img
                        src={on ? member.icon.on : member.icon.off}
                        alt=""
                        aria-hidden
                        className="size-[24px] shrink-0"
                      />
                      {member.tab}
                    </button>
                  );
                })}
                {bar && (
                  <span
                    aria-hidden
                    className="mm-indicator pointer-events-none absolute top-0 left-0 h-0.5 origin-left bg-brand-red"
                    style={{
                      transform: `translate(${bar.x}px, ${bar.y}px) scaleX(${bar.w / BAR_W})`,
                      width: BAR_W,
                    }}
                  />
                )}
              </div>
              <div className="auth-rise auth-rise-sm w-full" data-rise="3">
                <div key={active} className="mm-panel w-full">
                  <PersonDetails person={person} />
                </div>
              </div>
            </div>
            <div
              role="tabpanel"
              id="pane-status"
              aria-labelledby="pane-tab-status"
              className={`w-full min-w-0 ${pane === "status" ? "block lg:hidden" : "hidden"}`}
            >
              {pane === "status" && (
                <StatusPanel
                  status={status}
                  showDiscord={status === "qualified"}
                  heading={false}
                  card={false}
                />
              )}
            </div>
          </div>
          <div
            className="auth-rise hidden shrink-0 lg:block lg:w-[calc(241.5px_+_158.5*var(--fl))]"
            data-rise="4"
          >
            <StatusPanel status={status} showDiscord={status === "qualified"} />
          </div>
        </div>
      </div>

      <ResultModal
        open={modal === "qualified"}
        {...QUALIFIED_MODAL}
        onClose={() => {
          setModal(null);
        }}
        actions={
          <ModalButton
            href="#"
            className="bg-[#5865f2] text-white"
            icon={<DiscordGlyph size={32} src={DISCORD_32} />}
          >
            รับรหัสเข้าร่วม Discord{" "}
          </ModalButton>
        }
      />

      <ResultModal
        open={modal === "rejected"}
        {...REJECTED_MODAL}
        titleClassName="text-brand-red"
        onClose={() => {
          setModal(null);
        }}
      />
    </div>
  );
}
