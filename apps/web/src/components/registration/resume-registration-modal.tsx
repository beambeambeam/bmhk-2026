import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouterState, useNavigate, useLoaderData } from "@tanstack/react-router";
import { client } from "@bmhk-2026/client/orpc";
import { useOwnArrival } from "@/components/form/wizard-nav";
import "@/styles/resume-motion.css";

const BODY =
  "เราบันทึกคำตอบที่คุณกรอกค้างไว้ในเบราว์เซอร์ของอุปกรณ์นี้ ยกเว้นไฟล์เอกสารที่แนบ ซึ่งจะต้องแนบใหม่อีกครั้ง " +
  "เลือก “กรอกฟอร์มต่อ” เพื่อกรอกต่อจากขั้นตอนล่าสุดที่ค้างไว้ หรือ “เริ่มกรอกฟอร์มใหม่” เพื่อลบข้อมูลที่บันทึกไว้ทั้งหมดแล้วเริ่มต้นใหม่";

const SUBTITLE =
  "โครงการแข่งขันแก้ไขปัญหาด้วยการเขียนโปรแกรมคอมพิวเตอร์ ประจำปี 2569 (BangMod Hackathon 2026)";

const EXIT_MS = 190;

function ramp(lo: number, hi: number): string {
  return `calc(${lo}px + ${hi - lo} * var(--fl))`;
}

function ResumeGlyph() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden className="h-full w-full">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M9.45495 6.77198C9.22058 6.85453 9.00921 6.99163 8.83828 7.17198C8.29995 7.71032 8.32661 7.32698 8.34828 14.542L8.36828 20.9003L8.53661 21.4353C8.7854 22.2248 9.22083 22.9427 9.80601 23.5282C10.3912 24.1137 11.1089 24.5495 11.8983 24.7986L12.4333 24.967L20.0299 24.9853L27.6249 25.0037L25.1883 27.452C22.4699 30.1837 22.4933 30.152 22.5449 30.957C22.5999 31.8203 23.1983 32.407 24.0766 32.457C24.8916 32.502 24.7633 32.6103 29.1766 28.187C32.9816 24.3737 33.1249 24.2203 33.2266 23.872C33.3599 23.4186 33.3599 23.2486 33.2266 22.7953C33.1249 22.447 32.9816 22.2937 29.1766 18.4803C24.7633 14.057 24.8916 14.1653 24.0766 14.2103C23.1983 14.2603 22.5999 14.847 22.5449 15.7103C22.4933 16.5153 22.4699 16.4837 25.1899 19.217L27.6299 21.667L20.3316 21.6637C14.4083 21.662 12.9866 21.6437 12.7833 21.572C12.4048 21.4322 12.087 21.1646 11.8849 20.8153L11.6999 20.5003L11.6666 14.2003C11.6299 7.14032 11.6683 7.66032 11.1316 7.13865C10.6849 6.70698 10.0899 6.57698 9.45495 6.77198Z"
      />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-6 w-6">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Sheet({
  onContinue,
  onRestart,
  onDismiss,
  sheetRef,
  busy,
  state,
}: {
  onContinue: () => void;
  onRestart: () => void;
  onDismiss: () => void;
  sheetRef: React.RefObject<HTMLDialogElement | null>;
  busy: boolean;
  state: "open" | "closed";
}) {
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
    <dialog
      ref={sheetRef}
      aria-modal="true"
      aria-labelledby="resume-title"
      tabIndex={-1}
      data-state={state}
      className="resume-sheet focus:outline-none relative mx-auto flex w-full max-w-[1040px] flex-col overflow-y-auto bg-[#fdfcfa]"
      style={{
        borderRadius: ramp(20, 32),
        boxShadow: "0 0 0 1px #dcdcdc",
        gap: ramp(20, 32),
        maxHeight: "100%",
        padding: ramp(16, 24),
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <div className="resume-part resume-part-1 flex items-start" style={{ gap: ramp(12, 16) }}>
        <span
          className="shrink-0 text-[#10161f]"
          style={{ height: ramp(32, 40), width: ramp(32, 40) }}
        >
          <ResumeGlyph />
        </span>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <h2
            id="resume-title"
            className="font-medium text-[#282828]"
            style={{ fontSize: ramp(20, 28), lineHeight: 1.4 }}
          >
            คุณต้องการกรอกฟอร์มต่อจากที่ค้างไว้หรือไม่
          </h2>
          <p className="text-[#808080]" style={{ fontSize: ramp(14, 18), lineHeight: 1.511 }}>
            {SUBTITLE}
          </p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={onDismiss}
          aria-label="ปิด"
          className="-m-2.5 shrink-0 cursor-pointer p-2.5 text-[#8c8c8c] transition-colors duration-150 hover:text-[#282828]"
        >
          <CloseGlyph />
        </button>
      </div>

      <p
        className="resume-part resume-part-2 text-[#808080]"
        style={{ fontSize: ramp(14, 18), lineHeight: 1.511 }}
      >
        {BODY}
      </p>

      <div
        className="resume-part resume-part-2 flex flex-col sm:flex-row"
        style={{ gap: ramp(12, 16) }}
      >
        <button
          type="button"
          disabled={busy}
          onClick={onRestart}
          className="flex-1 cursor-pointer bg-[#efefef] text-[#282828] transition-[filter] duration-150 hover:brightness-95 disabled:opacity-50"
          style={{
            borderRadius: ramp(10, 12),
            fontSize: ramp(16, 20),
            lineHeight: 1.4,
            padding: `${ramp(10, 12)} ${ramp(16, 24)}`,
          }}
        >
          เริ่มกรอกฟอร์มใหม่
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={onContinue}
          className="flex-1 cursor-pointer bg-[#c0563e] text-white transition-[filter] duration-150 hover:brightness-105 active:brightness-95 disabled:opacity-50"
          style={{
            borderRadius: ramp(10, 12),
            fontSize: ramp(16, 20),
            lineHeight: 1.4,
            padding: `${ramp(10, 12)} ${ramp(16, 24)}`,
          }}
        >
          กรอกฟอร์มต่อ
        </button>
      </div>
    </dialog>
  );
}

let askedThisVisit = false;
const IN_FLOW = /^\/register(?<path>\/(?!success|error).*)?$/u;

interface LoaderData {
  statusData?: { isComplete?: boolean; teamId?: string; participant3?: string } | null;
  teamData?: { memberCount?: number } | null;
  advisorData?: unknown;
  entrant1Data?: unknown;
  entrant2Data?: unknown;
}

export default function ResumeRegistrationModal() {
  const { pathname, state } = useRouterState({ select: (s) => s.location });
  const navigate = useNavigate();
  const sheetRef = useRef<HTMLDialogElement>(null);
  const ownArrival = useOwnArrival();

  // oxlint-disable-next-line no-unsafe-type-assertion
  const { statusData, teamData, advisorData, entrant1Data, entrant2Data } = useLoaderData({
    from: "/register",
  }) as unknown as LoaderData;

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [modalState, setModalState] = useState<"open" | "closed">("closed");
  const [busy, setBusy] = useState(false);

  const wasInFlow = useRef(false);

  useEffect(() => {
    const inFlow = IN_FLOW.test(pathname);
    const entering = inFlow && !wasInFlow.current;
    wasInFlow.current = inFlow;

    const hasDraft =
      statusData !== null &&
      typeof statusData === "object" &&
      "isComplete" in statusData &&
      statusData.isComplete === false &&
      "teamId" in statusData &&
      statusData.teamId !== null &&
      statusData.teamId !== undefined &&
      statusData.teamId !== "";
    const stateObj = state as { authNav?: string };
    const isFromSignIn = !ownArrival && stateObj?.authNav === "gate";

    if (!entering || askedThisVisit || !hasDraft || isFromSignIn) {
      return;
    }

    setOpen(true);
    setMounted(true);
  }, [pathname, statusData, state, ownArrival]);

  useEffect(() => {
    if (!open || !mounted) {
      return () => {
        // empty cleanup
      };
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        setModalState("open");
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [open, mounted]);

  function close() {
    askedThisVisit = true;
    setOpen(false);
    setModalState("closed");
    window.setTimeout(() => {
      setMounted(false);
    }, EXIT_MS);
  }

  function getResumeRoute() {
    if (
      statusData === null ||
      statusData === undefined ||
      statusData.teamId === null ||
      statusData.teamId === undefined ||
      statusData.teamId === ""
    ) {
      return "/register/terms";
    }

    // Fallbacks because statusData schema lacks some items
    if (teamData === null || teamData === undefined) {
      return "/register/team";
    }
    if (advisorData === null || advisorData === undefined) {
      return "/register/advisor";
    }
    if (entrant1Data === null || entrant1Data === undefined) {
      return "/register/entrant/1";
    }
    if (entrant2Data === null || entrant2Data === undefined) {
      return "/register/entrant/2";
    }
    if (teamData.memberCount === 3 && statusData.participant3 === "NOT_STARTED") {
      return "/register/entrant/3";
    }

    // Default fallback if uncertain
    return "/register/entrant/1";
  }

  function onContinue() {
    const to = getResumeRoute();
    close();
    if (to !== pathname) {
      // oxlint-disable-next-line no-unsafe-type-assertion
      void navigate({ to: to as never });
    }
  }

  async function onRestart() {
    if (
      statusData === null ||
      statusData === undefined ||
      statusData.teamId === null ||
      statusData.teamId === undefined ||
      statusData.teamId === ""
    ) {
      close();
      return;
    }

    setBusy(true);
    try {
      await client.teams.delete({ id: statusData.teamId });
      close();
      window.location.href = "/register/terms";
    } catch (error) {
      console.error("Failed to delete team", error);
      setBusy(false);
    }
  }

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      if (sheetRef.current) {
        sheetRef.current.focus();
      }
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return () => {
        // empty cleanup
      };
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) {
        close();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [open, busy]);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      data-state={modalState}
      onClick={() => {
        if (!busy) {
          close();
        }
      }}
      className="resume-scrim fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(194,194,194,0.3)] backdrop-blur-[10px]"
      style={{ padding: ramp(16, 24) }}
    >
      <Sheet
        sheetRef={sheetRef}
        onContinue={onContinue}
        onRestart={() => {
          void onRestart();
        }}
        onDismiss={close}
        busy={busy}
        state={modalState}
      />
    </div>,
    document.body,
  );
}
