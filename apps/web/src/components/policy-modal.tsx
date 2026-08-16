/* oxlint-disable no-unsafe-type-assertion */
/* oxlint-disable strict-boolean-expressions */
/* oxlint-disable consistent-return */
/* oxlint-disable func-style */
/* oxlint-disable jsx-a11y/click-events-have-key-events */
/* oxlint-disable jsx-a11y/no-static-element-interactions */
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
/* eslint-disable react-compiler/react-compiler */
import { useCallback, useEffect, useRef, useState } from "react";
import type { PolicyBlock, PolicyDocument } from "@/features/register/data/privacy-policy";
import { REQUIRED_DOCUMENTS } from "@/features/register/data/registration-data";
import useDialogFocus, { useScrollLock } from "./use-dialog-focus";

const ARROW_DOWN = "/assets/figma/b5fa6d1d1c4352d0d01420816b8777fe81ff5920.svg";
const EMPTY_ACCEPTED_TITLES: readonly string[] = [];

/**
 * Matches the closing `.auth-modal-sheet` transition in styles/auth-motion.css.
 */
const EXIT_MS = 200;

/**
 * Body copy typography.
 */
const BODY = "text-[calc(13.948px_+_2.052*var(--fl))] leading-[1.6] font-light";

function Block({ block }: { block: PolicyBlock }) {
  if (typeof block === "string") {
    return <p className={`w-full ${BODY}`}>{block}</p>;
  }

  // list of bullets that each carry their own sub-bullets
  if (typeof block[0] === "object") {
    return (
      <ul className={`w-full list-disc ps-[24px] ${BODY}`}>
        {(block as { bullet: string; sub: string[] }[]).map((item) => (
          <li key={item.bullet}>
            {item.bullet}
            <ul className="list-disc ps-[24px]">
              {item.sub.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={`w-full list-disc ps-[24px] ${BODY}`}>
      {(block as string[]).map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

const ANSWER =
  "mm-press inline-flex items-center justify-center rounded-[calc(9.948px_+_2.052*var(--fl))] px-[calc(19.896px_+_4.104*var(--fl))] py-[calc(7.896px_+_4.104*var(--fl))] text-[calc(15.896px_+_4.104*var(--fl))] leading-[1.4] select-none cursor-pointer";

export interface PolicyModalDocItem {
  icon: string;
  title: string;
  description: string;
  rounded?: boolean;
  document: PolicyDocument;
}

function getDotClass(isCurrent: boolean, isItemAccepted: boolean): string {
  if (isCurrent) {
    return "w-7 bg-brand-red shadow-[0_1px_4px_rgba(235,51,35,0.35)]";
  }
  if (isItemAccepted) {
    return "w-2.5 bg-brand-red/40 group-hover:bg-brand-red/70";
  }
  return "w-2.5 bg-[#dcdcdc] group-hover:bg-[#b0b0b0]";
}

function getAcceptButtonLabel(isLast: boolean, isAccepted: boolean): string {
  if (isLast) {
    return isAccepted ? "ยอมรับแล้ว" : "ยอมรับ";
  }
  return isAccepted ? "ยอมรับแล้ว (ถัดไป)" : "ยอมรับ";
}

function SheetHeader({
  item,
  doc,
  currentIndex,
  totalCount,
  docList,
  acceptedTitles,
  canGoPrev,
  canGoNext,
  onSelectIndex,
  onPrev,
  onNext,
}: {
  item: PolicyModalDocItem;
  doc: PolicyDocument;
  currentIndex: number;
  totalCount: number;
  docList: readonly PolicyModalDocItem[];
  acceptedTitles: readonly string[];
  canGoPrev: boolean;
  canGoNext: boolean;
  onSelectIndex: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const isAccepted = acceptedTitles.includes(item.title);

  return (
    <header className="auth-modal-part flex w-full shrink-0 flex-col items-start gap-3 border-b border-[#f0f0f0] pb-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pb-4">
      <div className="flex min-w-0 flex-1 items-center gap-3.5 sm:gap-4">
        <img
          src={item.icon}
          alt=""
          aria-hidden
          className={`size-[calc(23.584px_+_16.416*var(--fl))] shrink-0 ${
            item.rounded === true
              ? "rounded-[calc(3.896px_+_4.104*var(--fl))] shadow-[0_0_12px_rgba(0,0,0,0.06)]"
              : ""
          }`}
        />
        <div className="flex min-w-0 flex-1 flex-col items-start justify-center">
          <div className="flex items-center gap-2">
            <p className="text-[calc(18.792px_+_8.208*var(--fl))] leading-[1.4] font-medium text-black">
              {item.title}
            </p>
            {isAccepted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-red/10 px-2 py-0.5 text-[12px] font-medium text-brand-red">
                <svg viewBox="0 0 16 16" fill="currentColor" className="size-3">
                  <path
                    fillRule="evenodd"
                    d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"
                    clipRule="evenodd"
                  />
                </svg>
                ยอมรับแล้ว
              </span>
            )}
          </div>
          <p className="fl-18 leading-normal text-gray-1">{doc.subtitle}</p>
        </div>
      </div>

      {/* Slide queue indicators — placed below the title on mobile, on the right on desktop */}
      <div className="flex w-full shrink-0 items-center justify-between gap-3 sm:w-auto sm:justify-end">
        <span className="rounded-full bg-[#f2f2f2] px-3 py-1 text-[calc(11.844px_+_2.156*var(--fl))] font-medium text-gray-1">
          เอกสาร {currentIndex + 1} / {totalCount}
        </span>

        <div className="flex items-center gap-1.5" role="tablist" aria-label="เอกสาร">
          {docList.map((docItem, idx) => {
            const isDotCurrent = idx === currentIndex;
            const isDotAccepted = acceptedTitles.includes(docItem.title);
            return (
              <button
                key={docItem.title}
                type="button"
                role="tab"
                aria-selected={isDotCurrent}
                aria-label={`${docItem.title} (เอกสาร ${idx + 1} จาก ${totalCount})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectIndex(idx);
                }}
                className="group relative flex h-6 cursor-pointer items-center justify-center p-0"
              >
                <span
                  className={`block h-2 rounded-full transition-all duration-300 ${getDotClass(
                    isDotCurrent,
                    isDotAccepted,
                  )}`}
                />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          {/* Go Back button uses the same icon as Go Next rotated 180 degrees */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            disabled={!canGoPrev}
            aria-label="เอกสารก่อนหน้า"
            className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-[#f2f2f2] text-gray-1 transition-all hover:bg-[#e4e4e4] hover:text-black disabled:pointer-events-none disabled:opacity-30"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 rotate-180">
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 0 1 0-1.414L10.586 10 7.293 6.707a1 1 0 0 1 1.414-1.414l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {/* Go Next button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            disabled={!canGoNext}
            aria-label="เอกสารถัดไป"
            className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-[#f2f2f2] text-gray-1 transition-all hover:bg-[#e4e4e4] hover:text-black disabled:pointer-events-none disabled:opacity-30"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 0 1 0-1.414L10.586 10 7.293 6.707a1 1 0 0 1 1.414-1.414l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

function SheetFooter({
  downloadable,
  isLast,
  isAccepted,
  onAccept,
}: {
  downloadable?: boolean;
  isLast: boolean;
  isAccepted: boolean;
  onAccept: () => void;
}) {
  return (
    <footer className="auth-modal-part flex w-full shrink-0 items-center justify-between gap-3 border-t border-[#f0f0f0] pt-3.5 sm:gap-4 sm:pt-4">
      {downloadable === true ? (
        <button
          type="button"
          className="mm-press flex shrink-0 items-center justify-center gap-[12px] rounded-[12px] bg-[#efefef] py-2.5 pr-5 pl-3.5 text-[calc(14.896px_+_4.104*var(--fl))] leading-[1.4] transition-colors hover:bg-[#e2e2e2] sm:py-3 sm:pr-6 sm:pl-4"
        >
          <span className="mm-icon-pop relative block size-[24px] shrink-0 overflow-clip sm:size-[28px]">
            <span className="absolute inset-[12.54%_22.35%_14.08%_22.33%] block">
              <img src={ARROW_DOWN} alt="" aria-hidden className="block size-full" />
            </span>
          </span>
          ดาวน์โหลด
        </button>
      ) : (
        <div />
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAccept();
        }}
        className={`${ANSWER} bg-brand-red text-white transition-opacity hover:opacity-90 flex items-center gap-2`}
      >
        {isAccepted && (
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0Z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {getAcceptButtonLabel(isLast, isAccepted)}
      </button>
    </footer>
  );
}

function ModalSheetItem({
  item,
  isCurrent,
  isAccepted,
  currentIndex,
  totalCount,
  docList,
  acceptedTitles,
  canGoPrev,
  canGoNext,
  state,
  bodyRef,
  sheetRef,
  onSelectIndex,
  onPrev,
  onNext,
  onAccept,
}: {
  item: PolicyModalDocItem;
  isCurrent: boolean;
  isAccepted: boolean;
  currentIndex: number;
  totalCount: number;
  docList: readonly PolicyModalDocItem[];
  acceptedTitles: readonly string[];
  canGoPrev: boolean;
  canGoNext: boolean;
  state: "open" | "closed";
  bodyRef?: React.RefObject<HTMLDivElement | null>;
  sheetRef?: React.RefObject<HTMLDivElement | null>;
  onSelectIndex: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onAccept: () => void;
}) {
  const doc = item.document;

  return (
    <div
      ref={isCurrent ? sheetRef : undefined}
      role="dialog"
      aria-modal={isCurrent}
      aria-label={doc.title}
      tabIndex={isCurrent ? -1 : undefined}
      data-state={state}
      onClick={
        isCurrent
          ? (e) => {
              e.stopPropagation();
            }
          : undefined
      }
      style={{
        width: "var(--sheet-w)",
      }}
      className={`auth-modal-sheet flex shrink-0 flex-col gap-3 rounded-[calc(20px_+_8.208*var(--fl))] border bg-white p-4 outline-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] h-[88dvh] sm:h-[88vh] max-h-[823px] sm:gap-4 sm:p-6 ${
        isCurrent
          ? "!opacity-100 !scale-100 border-[#dcdcdc] shadow-[0_20px_60px_rgba(0,0,0,0.14)] z-10 pointer-events-auto"
          : "!opacity-45 !scale-[0.88] sm:!scale-[0.92] cursor-pointer border-[#e0e0e0] shadow-md hover:!scale-[0.90] sm:hover:!scale-[0.94] hover:!opacity-75 z-0 pointer-events-auto"
      }`}
    >
      <SheetHeader
        item={item}
        doc={doc}
        currentIndex={currentIndex}
        totalCount={totalCount}
        docList={docList}
        acceptedTitles={acceptedTitles}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onSelectIndex={onSelectIndex}
        onPrev={onPrev}
        onNext={onNext}
      />

      {/* Document Sections Body — scrollable inside the box on both mobile and PC */}
      <div
        ref={isCurrent ? bodyRef : undefined}
        className={`auth-modal-part flex min-h-0 w-full flex-1 flex-col items-start gap-[calc(18px_+_4*var(--fl))] pr-1 sm:pr-2 overflow-y-auto overscroll-contain touch-pan-y ${
          isCurrent ? "[-webkit-overflow-scrolling:touch]" : "pointer-events-none overflow-hidden"
        }`}
      >
        {doc.effective && (
          <p className="w-full text-[calc(13.844px_+_6.156*var(--fl))] leading-[1.4] text-gray-1">
            {doc.effective}
          </p>
        )}
        {doc.sections.map((section) => (
          <section
            key={section.title}
            className="flex w-full flex-col items-start gap-[calc(7.792px_+_8.208*var(--fl))]"
          >
            <h3 className="w-full text-[calc(15.792px_+_8.208*var(--fl))] leading-[1.4] font-medium text-black">
              {section.title}
            </h3>
            {section.body.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </section>
        ))}
      </div>

      <SheetFooter
        downloadable={doc.downloadable}
        isLast={currentIndex === totalCount - 1}
        isAccepted={isAccepted}
        onAccept={onAccept}
      />
    </div>
  );
}

export default function PolicyModal({
  open,
  document: doc,
  documents,
  initialIndex = 0,
  acceptedTitles = EMPTY_ACCEPTED_TITLES,
  origin,
  onAccept,
  onDecline,
}: {
  /** Explicit open flag or `null` / `false` closes modal. */
  open?: boolean;
  /** `null` closes the modal (backwards compatibility). */
  document?: PolicyDocument | null;
  /** Full list of carousel documents. Defaults to REQUIRED_DOCUMENTS. */
  documents?: PolicyModalDocItem[];
  /** Starting slide index. Defaults to 0. */
  initialIndex?: number;
  /** Document titles that have already been accepted. */
  acceptedTitles?: readonly string[];
  /**
   * Viewport point of the control that opened the sheet.
   */
  origin?: { x: number; y: number } | null;
  onAccept: (title: string, isLast: boolean) => void;
  onDecline?: () => void;
}) {
  const activeBodyRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const docList = documents && documents.length > 0 ? documents : REQUIRED_DOCUMENTS;
  const isVisible = open ?? doc !== null;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const activeItem = docList[currentIndex] ?? docList[0];
  const activeDoc = activeItem?.document ?? doc ?? docList[0]?.document;

  const shownRef = useRef<PolicyDocument | null>(null);
  if (activeDoc) {
    shownRef.current = activeDoc;
  }
  const shown = shownRef.current;

  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<"open" | "closed">("closed");

  useEffect(() => {
    if (isVisible) {
      setCurrentIndex(initialIndex);
      setMounted(true);
      return;
    }
    setState("closed");
    const timer = window.setTimeout(() => {
      setMounted(false);
    }, EXIT_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isVisible, initialIndex]);

  useEffect(() => {
    if (!isVisible || !mounted) {
      return;
    }

    activeBodyRef.current?.scrollTo({ top: 0 });

    const sheet = sheetRef.current;
    if (sheet && origin) {
      const box = sheet.getBoundingClientRect();
      sheet.style.setProperty("--auth-origin-x", `${origin.x - box.left}px`);
      sheet.style.setProperty("--auth-origin-y", `${origin.y - box.top}px`);
    }

    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        setState("open");
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [isVisible, mounted, origin]);

  useEffect(() => {
    activeBodyRef.current?.scrollTo({ top: 0 });
  }, [currentIndex]);

  useDialogFocus(isVisible && mounted, sheetRef);
  useScrollLock(isVisible);

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < docList.length - 1;

  const handlePrev = useCallback(() => {
    if (canGoPrev) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [canGoPrev]);

  const handleNext = useCallback(() => {
    if (canGoNext) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [canGoNext]);

  const handleAcceptCurrent = useCallback(() => {
    const item = docList[currentIndex];
    const isLast = currentIndex === docList.length - 1;
    if (item) {
      onAccept(item.title, isLast);
    }
    if (!isLast) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, docList, onAccept]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onDecline) {
        onDecline();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };
    window.document.addEventListener("keydown", onKey);
    return () => {
      window.document.removeEventListener("keydown", onKey);
    };
  }, [isVisible, onDecline, handlePrev, handleNext]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || e.changedTouches.length === 0) {
      return;
    }
    const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    const diffX = touchStart.x - touchEnd.x;
    const diffY = touchStart.y - touchEnd.y;

    // Only swipe horizontally if the swipe was predominantly horizontal
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 45) {
      if (diffX > 0 && canGoNext) {
        handleNext();
      } else if (diffX < 0 && canGoPrev) {
        handlePrev();
      }
    }
    setTouchStart(null);
  };

  if (!mounted || !shown || !activeItem) {
    return null;
  }

  return (
    <div
      data-state={state}
      className="auth-modal-scrim fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[rgba(194,194,194,0.3)] backdrop-blur-[5px]"
    >
      {/* Screen-wide horizontal queue of modal boxes */}
      <div
        className="relative flex h-full w-full items-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={
          {
            "--sheet-gap": "clamp(16px, 3vw, 40px)",
            "--sheet-w": "min(calc(100vw - 32px), 1000px)",
          } as React.CSSProperties
        }
      >
        <div
          className="flex h-full w-full items-center transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
          style={{
            gap: "var(--sheet-gap)",
            paddingLeft: "calc((100vw - var(--sheet-w)) / 2)",
            paddingRight: "calc((100vw - var(--sheet-w)) / 2)",
            transform: `translateX(calc(-${currentIndex} * (var(--sheet-w) + var(--sheet-gap))))`,
          }}
        >
          {docList.map((item, idx) => {
            const isCurrent = idx === currentIndex;
            const isAccepted = acceptedTitles.includes(item.title);
            return (
              <div
                key={item.title}
                onClick={
                  isCurrent
                    ? undefined
                    : (e) => {
                        e.stopPropagation();
                        setCurrentIndex(idx);
                      }
                }
                className="shrink-0"
              >
                <ModalSheetItem
                  item={item}
                  isCurrent={isCurrent}
                  isAccepted={isAccepted}
                  currentIndex={currentIndex}
                  totalCount={docList.length}
                  docList={docList}
                  acceptedTitles={acceptedTitles}
                  canGoPrev={canGoPrev}
                  canGoNext={canGoNext}
                  state={state}
                  bodyRef={isCurrent ? activeBodyRef : undefined}
                  sheetRef={isCurrent ? sheetRef : undefined}
                  onSelectIndex={setCurrentIndex}
                  onPrev={handlePrev}
                  onNext={handleNext}
                  onAccept={handleAcceptCurrent}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
