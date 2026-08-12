import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";

import ScrollEdgeEffect from "@/components/scroll-edge-effect";
import Loader from "@/components/loader";
import { orpc } from "@bmhk-2026/client/orpc";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import PersonDetails from "./components/person-details";
import ResultModal from "./components/result-modal";
import StatusPanel, { DiscordGlyph } from "./components/status-panel";
import TeamDecor from "./components/team-decor";
import { getBaseMembers, QUALIFIED_MODAL, REJECTED_MODAL, STATUS_VARIANTS } from "./team-data";
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
const COPY_BOX = "size-[calc(15.896px_+_4.104*var(--fl))]";
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

interface StatusData {
  submissionState: string;
}
interface ReviewFeedback {
  status: string;
}

function getMappedStatus(
  statusParam: string | null,
  statusData: StatusData | null | undefined,
  reviewFeedback: ReviewFeedback | null | undefined,
): TeamStatus {
  if (isStatus(statusParam)) {
    return statusParam;
  }
  if (statusData === undefined || statusData === null) {
    return "reviewing";
  }
  if (statusData.submissionState === "DRAFT") {
    return "reviewing";
  }
  if (
    statusData.submissionState === "SUBMITTED" &&
    reviewFeedback !== undefined &&
    reviewFeedback !== null
  ) {
    if (reviewFeedback.status === "PENDING_REVIEW") {
      return "reviewing";
    }
    if (reviewFeedback.status === "CHANGES_REQUESTED") {
      return "issue";
    }
    if (reviewFeedback.status === "APPROVED") {
      return "qualified";
    }
  }
  return "reviewing";
}

function getDisplayTeam(
  team: { id: string; name: string; school: string; image?: string | null } | undefined | null,
) {
  if (team === undefined || team === null) {
    return { code: "", image: undefined, name: "", school: "" };
  }
  return {
    code: team.id.slice(0, 8).toUpperCase(),
    image: team.image,
    name: team.name,
    school: team.school,
  };
}

function formatName(first: string, middle: string | null | undefined, last: string) {
  return [first, middle, last].filter(Boolean).join(" ");
}

function formatSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || bytes === 0) {
    return "0 MB";
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function useTabsIndicator(active: number) {
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

  return { bar, tabsRef };
}

function MyTeamModals({
  modal,
  setModal,
}: {
  modal: string | null;
  setModal: (val: string | null) => void;
}) {
  return (
    <>
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
    </>
  );
}

function useMyTeamData() {
  const search = useSearch({ from: "/_auth/my-team" }) as Record<string, unknown>;

  const { data: teamsData, isPending: isTeamsPending } = useQuery(
    orpc.teams.list.queryOptions({ input: { limit: 1 } }),
  );
  const team = teamsData?.data?.[0];
  const teamId = team?.id;

  const { data: statusData, isPending: isStatusPending } = useQuery({
    ...orpc.teamRegistrationStatus.get.queryOptions({ input: { teamId: teamId ?? "" } }),
    enabled: Boolean(teamId),
  });

  const { data: reviewFeedback, isPending: isReviewPending } = useQuery({
    ...orpc.teamRegistrationReviews.feedback.queryOptions({ input: { teamId: teamId ?? "" } }),
    enabled: Boolean(teamId),
  });

  const { data: participants, isPending: isParticipantsPending } = useQuery({
    ...orpc.teamParticipants.list.queryOptions({ input: { teamId: teamId ?? "" } }),
    enabled: Boolean(teamId),
  });

  const { data: advisor, isPending: isAdvisorPending } = useQuery({
    ...orpc.teamAdvisors.get.queryOptions({ input: { teamId: teamId ?? "" } }),
    enabled: Boolean(teamId),
  });

  const { data: featureFlags, isPending: isFeatureFlagsPending } = useQuery({
    ...orpc.featureFlags.getAll.queryOptions(),
  });

  const isLoading =
    isTeamsPending ||
    isFeatureFlagsPending ||
    (teamId !== undefined && isStatusPending) ||
    (teamId !== undefined && isReviewPending) ||
    (teamId !== undefined && isParticipantsPending) ||
    (teamId !== undefined && isAdvisorPending);

  return {
    advisor,
    featureFlags,
    isLoading,
    participants,
    reviewFeedback,
    search,
    statusData,
    team,
  };
}

type ParticipantType = NonNullable<ReturnType<typeof useMyTeamData>["participants"]>[number];
type AdvisorType = NonNullable<ReturnType<typeof useMyTeamData>["advisor"]>;
type MockMemberType = ReturnType<typeof getBaseMembers>[number];

function mapParticipant(p: ParticipantType | undefined, mockMember: MockMemberType) {
  if (!p) {
    return mockMember;
  }
  return {
    ...mockMember,
    birthDate: p.dateOfBirth,
    documents: [
      {
        file: p.portraitPhoto?.originalName ?? "ไม่มีไฟล์",
        label: "รูปถ่ายนักเรียนหน้าตรง ขนาด 1.5 นิ้ว",
        size: formatSize(p.portraitPhoto?.sizeBytes),
        url: p.portraitPhoto?.url,
      },
      {
        file: p.identityDocument?.originalName ?? "ไม่มีไฟล์",
        label:
          "สำเนาบัตรประจำตัวประชาชน หรือบัตรประจำตัวสำหรับ บุคคลที่ไม่ใช่สัญชาติไทย พร้อมเซ็นสำเนาถูกต้อง (เฉพาะด้านหน้า)",
        size: formatSize(p.identityDocument?.sizeBytes),
        url: p.identityDocument?.url,
      },
      {
        file: p.academicRecordDocument?.originalName ?? "ไม่มีไฟล์",
        label: "สำเนา ปพ.7 (ระเบียนแสดงผลการเรียน) ของผู้เข้าแข่งขัน พร้อมเซ็นสำเนาถูกต้อง",
        size: formatSize(p.academicRecordDocument?.sizeBytes),
        url: p.academicRecordDocument?.url,
      },
    ],
    email: p.email,
    enName: formatName(p.firstNameEn, p.middleNameEn, p.lastNameEn),
    enPrefix: p.titleEn,
    lineId: p.lineId ?? "-",
    phone: p.phone,
    thaiName: formatName(p.firstNameTh, p.middleNameTh, p.lastNameTh),
    thaiPrefix: p.titleTh,
  };
}

function mapAdvisor(advisor: AdvisorType | undefined | null, mockMember: MockMemberType) {
  if (!advisor) {
    return mockMember;
  }
  return {
    ...mockMember,
    documents: [
      {
        file: advisor.identityDocument?.originalName ?? "ไม่มีไฟล์",
        label:
          "สำเนาบัตรประจำตัวประชาชน หรือบัตรประจำตัวสำหรับ บุคคลที่ไม่ใช่สัญชาติไทย พร้อมเซ็นสำเนาถูกต้อง (เฉพาะด้านหน้า)",
        size: formatSize(advisor.identityDocument?.sizeBytes),
        url: advisor.identityDocument?.url,
      },
      {
        file: advisor.teacherStatusDocument?.originalName ?? "ไม่มีไฟล์",
        label: "หนังสือรับรองความเป็นครู",
        size: formatSize(advisor.teacherStatusDocument?.sizeBytes),
        url: advisor.teacherStatusDocument?.url,
      },
    ],
    email: advisor.email,
    enName: formatName(advisor.firstNameEn, advisor.middleNameEn, advisor.lastNameEn),
    enPrefix: advisor.titleEn,
    lineId: advisor.lineId ?? "-",
    phone: advisor.phone,
    thaiName: formatName(advisor.firstNameTh, advisor.middleNameTh, advisor.lastNameTh),
    thaiPrefix: advisor.titleTh,
  };
}

function useMappedMembers(
  participants: ReturnType<typeof useMyTeamData>["participants"],
  advisor: ReturnType<typeof useMyTeamData>["advisor"],
) {
  const rawMembers = getBaseMembers();
  return rawMembers.map((mockMember, i) => {
    if (i < 3) {
      return mapParticipant(participants?.[i], mockMember);
    }
    return mapAdvisor(advisor, mockMember);
  });
}

export default function MyTeam() {
  const {
    advisor,
    featureFlags,
    isLoading,
    participants,
    reviewFeedback,
    search,
    statusData,
    team,
  } = useMyTeamData();

  const MEMBERS = useMappedMembers(participants, advisor);

  // --- Status Mapping ---
  const statusParam = typeof search.status === "string" ? search.status : null;
  const status = getMappedStatus(statusParam, statusData, reviewFeedback);

  const [pane, setPane] = useState<Pane>("team");
  const paneTabs = useRef<HTMLDivElement>(null);

  const [active, setActive] = useState(status === "issue" ? MEMBERS.length - 1 : 0);
  const initialModal = typeof search.modal === "string" ? search.modal : null;
  const [modal, setModal] = useState<string | null>(initialModal);

  const showModal = featureFlags?.eligibleTeamsAnnouncement === true ? modal : null;

  const [copiedAt, setCopiedAt] = useState(0);
  const copied = copiedAt !== 0;

  const person = MEMBERS[active];

  const { bar, tabsRef } = useTabsIndicator(active);

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

  if (isLoading) {
    return <Loader />;
  }

  const displayTeam = getDisplayTeam(team);

  return (
    <div className="relative min-h-dvh overflow-clip bg-[#fefdfc]" data-auth-entrance>
      <TeamDecor />
      <ScrollEdgeEffect className="absolute inset-x-0 top-0 z-10 h-[calc(106px_+_54*var(--fl))]" />
      <div
        data-recede={showModal === "qualified" || showModal === "rejected"}
        className="auth-recede shell-dash relative z-20 mx-auto flex w-full max-w-[1440px] flex-col items-center gap-[calc(24px_+_16*var(--fl))] pt-[calc(24px_+_36*var(--fl))] pb-16"
      >
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
                {displayTeam.image !== null &&
                displayTeam.image !== undefined &&
                displayTeam.image !== "" ? (
                  <img
                    src={displayTeam.image}
                    alt={displayTeam.name}
                    className="size-[116px] shrink-0 rounded-2xl bg-[#ebebeb] object-cover"
                  />
                ) : (
                  <svg aria-hidden className="size-[116px] shrink-0 rounded-2xl bg-[#ebebeb]" />
                )}
                <div
                  className={`flex min-w-0 flex-1 flex-col items-center ${LOCKUP_STACK_GAP_8_16} sm:items-start`}
                >
                  <h1 className="fl-24 leading-[1.4] font-medium">{displayTeam.name}</h1>
                  <p
                    className={`flex items-center ${LOCKUP_ROW_GAP_8_12} ${LOCKUP_14_18} leading-[1.4]`}
                  >
                    <span className="text-gray-2">รหัสทีม</span>
                    <span>{displayTeam.code}</span>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(displayTeam.code);
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
                    <span>{displayTeam.school}</span>
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
                {/* Member tab */}
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
              {/* ข้อมูลแต่ละคน */}
              <div className="auth-rise auth-rise-sm w-full" data-rise="3">
                <div key={active} className="mm-panel w-full">
                  <PersonDetails person={person} />
                </div>
              </div>
            </div>

            {/* Status */}
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
                  members={MEMBERS}
                />
              )}
            </div>
          </div>
          <div
            className="auth-rise hidden shrink-0 lg:block lg:w-[calc(241.5px_+_158.5*var(--fl))]"
            data-rise="4"
          >
            <StatusPanel status={status} showDiscord={status === "qualified"} members={MEMBERS} />
          </div>
        </div>
      </div>

      <MyTeamModals modal={showModal} setModal={setModal} />
    </div>
  );
}
