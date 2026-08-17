import { useEffect, useRef, useState } from "react";
import useDialogFocus, { useScrollLock } from "./use-dialog-focus";

const CLOSE = "/assets/figma/4bd7505c0eec086659f8bce6f796799c7aa38350.svg";

/**
 * Matches the closing `.auth-modal-sheet` transition in styles/auth-motion.css — shorter
 * than the entrance, because leaving should get out of the way.
 */
const EXIT_MS = 200;

/**
 * Outcome dialog shown over the dashboard once selection results are out.
 *
 * Figma 708:3166 — an 800x823 sheet at y=100, 40 of padding, 32 between the mascot, the
 * message block and the button stack, over a light grey scrim that blurs the page behind it.
 */
export default function ResultModal({
  open,
  image,
  title,
  titleClassName = "",
  lines,
  actions,
  onClose,
}: {
  open: boolean;
  image: string;
  title: string;
  titleClassName?: string;
  lines: string[];
  actions?: React.ReactNode;
  onClose: () => void;
}) {
  /*
   * Kept mounted for one exit animation after `open` goes false, so dismissing the sheet
   * animates too. `state` flips a frame after mount — the transition needs a painted
   * start value to move away from.
   */
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<"open" | "closed">("closed");
  const sheetRef = useRef<HTMLDivElement>(null);

  /*
   * `open && mounted`, not `open` — and this is a fix, not a refinement.
   *
   * The hook focuses `sheetRef.current` in an effect keyed on its first argument, and on the
   * render where `open` first becomes true this component has not mounted the sheet yet: it
   * returns `null` until the frame after, so the ref is still empty when the effect fires and
   * `node?.focus()` is a no-op. Nothing changes the argument afterwards, so the effect never
   * re-runs and the caret NEVER entered this dialogue — measured on
   * /my-team?modal=qualified, where `document.activeElement` stayed on the page behind the
   * scrim. That is precisely the state `aria-modal="true"` promises is impossible, and this
   * modal is only ever opened at mount (the flag comes off the URL), so it was the whole time.
   *
   * Gating on `mounted` as well means the effect runs on the render where the sheet exists.
   * Closing still passes `false` exactly once, so the cleanup hands focus back to the opener.
   */
  useDialogFocus(open && mounted, sheetRef);

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

  /* the page behind the scrim is held still — see `useScrollLock`, which is a FIX: the
     `document.body.style.overflow = 'hidden'` this replaces was inert under the site's own
     `html { overflow-x: clip }`, and the dashboard scrolled behind this sheet at every width */
  useScrollLock(open);

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

  if (!mounted) {
    return null;
  }

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
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-6 lg:block lg:p-0">
        <div
          ref={sheetRef}
          // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          data-state={state}
          /* every `x lg:y` pair below is a ramp instead: the sheet's own geometry stays Figma's
             800x823 from `lg` up, but the padding, the gaps and the type it contains used to step
             a whole size at 1024 while the sheet around them did not move at all.
             Verified against `708:3166` (qualified) and `708:3560` (not qualified), which are the
             same 800x823 sheet: radius 32, 40 of padding, 32 between the mascot group and the
             button stack. Neither has a 402 counterpart anywhere in Figma's Mobile section, so
             every low end here is borrowed from the result CARD's phone frame rather than
             measured, and that is recorded where it happens. */
          className="auth-modal-sheet relative flex w-full max-w-[800px] flex-col items-center justify-center gap-[calc(23.792px_+_8.208*var(--fl))] rounded-[32px] border border-[#dcdcdc] bg-white p-[calc(23.584px_+_16.416*var(--fl))] outline-none lg:mx-auto lg:mt-[100px] lg:mb-[101px] lg:h-[823px] lg:w-[800px]"
        >
          {/* CORRECTION, not a ramp adjustment: `708:3171` / `708:3565` place the 32-square
              close mark at (736, 32) in the 800-wide sheet, i.e. 32 from the top and 32 from the
              right. The old pair resolved to 15.61 + 15.39 = 31.000 at `--fl` = 1, so the cross
              has been sitting one pixel in from Figma at 1440. The low end stays 16. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="mm-press-icon absolute top-[calc(15.584px_+_16.416*var(--fl))] right-[calc(15.584px_+_16.416*var(--fl))] size-[32px] overflow-clip transition-opacity hover:opacity-70"
          >
            <img src={CLOSE} alt="" aria-hidden className="absolute inset-0 block size-full" />
          </button>

          {/*
           * The mascot, the message and the buttons settle one after another behind the
           * sheet rather than with it: this dialogue is a result, and a stack that arrives
           * in sequence reads as an announcement where a single plate reads as a panel
           * being swapped in. See `.auth-modal-part` in styles/auth-motion.css.
           *
           * The close button is deliberately not a part — it must be pressable the instant
           * the sheet is there.
           */}
          {/* 302 square on `761:84` (qualified) and `785:62` (not qualified) — exact at
              `--fl` = 1. `size-` sets both axes explicitly, so this is not the replaced-element
              trap: the box and the drawing move together. */}
          <img
            src={image}
            alt=""
            aria-hidden
            className="auth-modal-part size-[calc(197.35px_+_104.65*var(--fl))] shrink-0 object-cover"
          />

          {/* 24 between the title and the copy on `708:3168` / `708:3562`; the ramp's 16 low end
              is borrowed from the result card's `1297:502`. Exact at `--fl` = 1. */}
          <div className="auth-modal-part flex w-full flex-col items-center gap-[calc(15.792px_+_8.208*var(--fl))]">
            {/* `708:3169` / `708:3563`: 40 at 140%, SemiBold (600) — `fl-display` tops out on
                Figma's 40 and `font-semibold` is the measured weight, both verified. */}
            <h2 className={`text-center fl-display leading-[1.4] font-semibold ${titleClassName}`}>
              {title}
            </h2>
            {/* `708:3170` / `708:3564`: 24 at 160% in #8c8c8c (= `gray-2`), Regular (400). `fl-24`
                lands on 24 at 1440 and 400 is the inherited body weight, so no weight class — this
                is NOT the result card's copy, which Figma sets Light on the phone frame. */}
            <p className="w-full text-center fl-24 leading-[1.6] text-gray-2">
              {lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
          </div>

          {/* `708:3175` stacks its two 56-tall buttons 24 apart (they sit at y 0 and y 80); the
              16 low end is borrowed, as above. `items-stretch` rather than `items-start` — the
              buttons are 720 of the sheet's 720 content width on `708:3176` / `708:3181`, and
              `items-start` only happened to look right because they carry `w-full` themselves. */}
          {Boolean(actions) && (
            <div className="auth-modal-part flex w-full flex-col items-stretch justify-center gap-[calc(15.792px_+_8.208*var(--fl))]">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
