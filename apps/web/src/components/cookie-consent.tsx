import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PolicyModal from "./policy-modal";
import { PRIVACY_POLICY } from "../privacy-policy";
import "../styles/consent-motion.css";

/**
 * ============================================================================================
 * THE COOKIE NOTICE — Figma `2074:3200`
 * ============================================================================================
 *
 * A 368x167 white card, radius 12, 10px padding, 12px gaps: a round red badge and a heading
 * over a body paragraph, then a full-width ยอมรับ button. Every size, weight, colour and radius
 * below is transcribed from that node, and the copy is its `characters` verbatim rather than the
 * brief's paraphrase — the two differ, and Figma wins.
 *
 * ------------------------------------------------------------------ what is NOT built from it
 *
 * `2074:3200` carries three nodes with `visible: false`, which the REST API returns like any
 * other child and which are leftovers from whatever component this card was cloned out of: an
 * `Ellipse 1` (`2074:3209`), a `9.3 MB of 9.3 MB` caption (`2074:3210`) — both from an upload
 * row — and a whole `แชร์ไปยัง Instagram` button (`2074:3228`) that is 720px wide inside a 368px
 * frame. None are rendered here. The frame's own 167px height is the arithmetic proof they are
 * not meant to be: 10 + 101 + 12 + 34 + 10 = 167 accounts for the card exactly, with nothing
 * left for them.
 *
 * ------------------------------------------------------------------------------- the one add
 *
 * Figma gives this card NO shadow and no border. Pinned over the site's own `#fefdfc` pages that
 * is a white card on a white ground with no edge at all, so it takes `--shadow-soft`
 * (index.css: `0 0 40px rgb(0 0 0 / 0.05)`) — which is not an invention but the exact shadow the
 * navbar and every other floating white surface on this site already carries. It is the smallest
 * change that makes the card an object rather than a hole.
 *
 * -------------------------------------------------------------------------------- the sizing
 *
 * Figma has no phone frame for this node, and unlike a page section this card has no phone
 * behaviour to infer: it is a fixed-size widget, and its two type ranks are 14px and 12px, which
 * are already at the floor where Thai stays legible. A two-anchor ramp here would resolve to a
 * 402 anchor equal to its 1440 anchor — a degenerate ramp, i.e. a constant — so the type and the
 * box metrics are held at Figma's values at every width and only the WIDTH adapts:
 * `min(368px, 100vw - 24px)`, which is 368 from 392 upward and never lets the card reach either
 * edge below that. At 320 it is 296 wide, so nothing overflows and the page cannot pan.
 */

/**
 * `2074:3213` / `2074:3214` — the cookie glyph, 20x20, white inside the red badge.
 *
 * Inlined rather than written to `public/assets/figma/` because it is one path and because
 * `currentColor` lets the badge own the colour; the exported asset has `fill:white` baked in and
 * would need a second copy the day this card is ever inverted.
 */
function CookieGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-5 w-5">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M9.30003 1.70381C7.36836 1.85548 5.5017 2.72381 4.11586 4.11464C3.20938 5.01765 2.52418 6.11819 2.11389 7.33013C1.70359 8.54207 1.57934 9.83252 1.75086 11.1005C2.2017 14.5555 4.76753 17.3521 8.20003 18.1296C8.80586 18.2671 9.2592 18.3138 9.98336 18.3146C11.3475 18.3155 12.3725 18.0821 13.6684 17.4746C15.2417 16.7363 16.6525 15.3288 17.4625 13.6896C18.0525 12.4955 18.3125 11.3655 18.3109 10.0005C18.31 9.12964 18.2492 8.63048 18.11 8.34464C17.8675 7.84548 17.2667 7.50298 16.6317 7.50131C16.2321 7.49493 15.849 7.34053 15.5567 7.06798C15.2009 6.74298 15.05 6.42298 14.9992 5.89048C14.9609 5.49131 14.8892 5.32131 14.6784 5.13631C14.42 4.90881 14.1259 4.85214 13.7167 4.95131C13.4414 5.01944 13.153 5.01396 12.8805 4.93541C12.608 4.85687 12.361 4.70802 12.1642 4.50381C11.8634 4.20214 11.6667 3.76214 11.6667 3.39131C11.6667 2.54964 11.1467 1.83464 10.4375 1.70131C10.2334 1.66214 9.81253 1.66381 9.30003 1.70381ZM10.03 3.67881C10.0792 4.11464 10.1617 4.40464 10.345 4.78381C10.8725 5.87464 11.8867 6.55381 13.1442 6.65881L13.4392 6.68381L13.5167 6.90714C13.7985 7.71404 14.3764 8.38369 15.1334 8.78048C15.5175 8.97798 15.7909 9.06381 16.2384 9.12881L16.6167 9.18381L16.6384 9.35048C16.6792 9.65631 16.6675 10.4596 16.6167 10.848C16.4455 12.081 15.9442 13.2448 15.1659 14.2163C14.1834 15.4488 12.5859 16.358 10.9667 16.6071C10.595 16.6638 9.47003 16.6638 9.08336 16.6055C7.85705 16.4305 6.70324 15.9191 5.75003 15.128C4.37753 13.9805 3.5842 12.4921 3.36336 10.6538C3.31003 10.2096 3.34253 9.32048 3.42836 8.86714C3.61608 7.82993 4.03852 6.84937 4.66336 6.00048C4.89003 5.69131 5.46836 5.09214 5.7917 4.83131C6.91003 3.92964 8.42836 3.35464 9.73753 3.33714L9.99086 3.33381L10.03 3.67881ZM7.64503 6.69964C7.29086 6.77464 6.9392 7.06548 6.77836 7.41714C6.6992 7.58881 6.68586 7.65964 6.6867 7.91714C6.6867 8.17381 6.70003 8.24714 6.7792 8.42048C6.8967 8.67881 7.15336 8.93464 7.4167 9.05548C7.58836 9.13464 7.66003 9.14798 7.9167 9.14798C8.17336 9.14798 8.24503 9.13464 8.4167 9.05548C8.68003 8.93464 8.9367 8.67881 9.0542 8.42048C9.13336 8.24631 9.1467 8.17381 9.1467 7.91714C9.1467 7.66048 9.13336 7.58798 9.0542 7.41381C8.92122 7.14225 8.70283 6.92182 8.43253 6.78631C8.1826 6.68713 7.91055 6.65719 7.64503 6.69964ZM12.645 10.033C12.2909 10.108 11.9392 10.3988 11.7784 10.7505C11.6992 10.9221 11.6859 10.993 11.6867 11.2505C11.6867 11.5071 11.7 11.5805 11.7792 11.7538C11.8967 12.0121 12.1534 12.268 12.4167 12.3888C12.5884 12.468 12.66 12.4813 12.9167 12.4813C13.1734 12.4813 13.245 12.468 13.4167 12.3888C13.68 12.268 13.9367 12.0121 14.0542 11.7538C14.1334 11.5796 14.1467 11.5071 14.1467 11.2505C14.1467 10.9938 14.1334 10.9213 14.0542 10.7471C13.9212 10.4756 13.7028 10.2552 13.4325 10.1196C13.1826 10.0205 12.9105 9.99052 12.645 10.033ZM7.64503 11.6996C7.29086 11.7746 6.9392 12.0655 6.77836 12.4171C6.6992 12.5888 6.68586 12.6596 6.6867 12.9171C6.6867 13.1738 6.70003 13.2471 6.7792 13.4205C6.8967 13.6788 7.15336 13.9346 7.4167 14.0555C7.58836 14.1346 7.66003 14.148 7.9167 14.148C8.17336 14.148 8.24503 14.1346 8.4167 14.0555C8.68003 13.9346 8.9367 13.6788 9.0542 13.4205C9.13336 13.2463 9.1467 13.1738 9.1467 12.9171C9.1467 12.6605 9.13336 12.588 9.0542 12.4138C8.92122 12.1423 8.70283 11.9218 8.43253 11.7863C8.1826 11.6871 7.91055 11.6572 7.64503 11.6996Z"
      />
    </svg>
  );
}

/** Where the decision lives. Versioned in the key, so a future change of terms can re-ask. */
const KEY = "bh2026.cookie-consent.v1";

/** matches the `.cookie-card` exit in styles/consent-motion.css */
const EXIT_MS = 180;

/**
 * Has the user already accepted?
 *
 * Read lazily inside `useState` rather than in an effect, so a returning visitor never mounts
 * the card at all and there is no frame in which it exists to be seen. The try/catch is around
 * the `localStorage` GETTER and not merely the read: Safari in Lockdown Mode throws on the
 * property access itself, and an unguarded one takes down every page that renders this.
 */
function alreadyAccepted() {
  try {
    return window.localStorage.getItem(KEY) === "accepted";
  } catch {
    /* No storage means no memory of a decision. Showing the notice again is the safe failure —
       the alternative is suppressing a consent notice we cannot prove was ever answered. */
    return false;
  }
}

export default function CookieConsent() {
  const [dismissed, setDismissed] = useState(alreadyAccepted);
  const [mounted, setMounted] = useState(!alreadyAccepted());
  const [state, setState] = useState<"open" | "closed">("closed");
  const [policyOpen, setPolicyOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  /*
   * The two-frame open, the same shape `PolicyModal` and `ScopeModal` both use and for the same
   * reason: a transition needs a PAINTED start value to move away from. React flushes this
   * passive effect inside the same task as the mount, so a single `requestAnimationFrame` can
   * still run before the browser has painted the closed state — the outer frame paints it
   * closed, the inner one opens it.
   */
  useEffect(() => {
    if (dismissed || !mounted) {
      return () => {
        /* noop cleanup */
      };
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
  }, [dismissed, mounted]);

  /*
   * RESERVE THE SPACE THE CARD SITS IN, for as long as it is up.
   *
   * A `position: fixed` card is out of flow, so it covers whatever the bottom of the document
   * scrolls under it — and at the very bottom there is nothing left to scroll, so anything under
   * the card at that point is permanently unreachable. Measured at 402x780 with the page scrolled
   * to `scrollHeight`, `elementFromPoint` over each control's centre returned the card itself
   * for:
   *
   *   /register        ลงทะเบียน
   *   /register/team   เลือกสถานศึกษา, two inputs, ย้อนกลับ, ถัดไป
   *   /register/terms  two inputs, ถัดไป
   *   /  (402)         the Facebook and Instagram links in the footer
   *   /register/team   ถัดไป — at 1440 as well, so this was never only a phone problem
   *
   * i.e. a first-time visitor could not press ถัดไป at all. That is the brief's "must not cover
   * anything important", and no z-index fixes it: the card is genuinely on top of a control the
   * user has no way to scroll out from under.
   *
   * So the document is made taller by exactly the card's footprint, which is what a fixed bar is
   * supposed to do — the last content can then scroll clear above it. `document.body` rather than
   * the root, because the root carries the site's `overflow-x: clip` pan guard and
   * `useDialogFocus`'s scroll lock already writes to its inline style; body padding extends
   * `scrollHeight` just the same and keeps the two mechanisms from ever touching the same
   * property.
   *
   * Measured rather than assumed: the card is 167.9 tall at 320 (the Thai body wraps to a fourth
   * line) and 149.8 from 390 up, so a constant would be wrong at one end or the other. The
   * `ResizeObserver` also catches the reflow when the viewport crosses that wrap point.
   *
   * The inline value is saved and restored, never a computed one — the same discipline
   * `useScrollLock` documents, so this cannot leave a stray padding on the body after the card
   * has gone.
   */
  useEffect(() => {
    const el = cardRef.current;
    if (!mounted || !el) {
      return () => {
        /* noop cleanup */
      };
    }

    const { body } = document;
    const restore = body.style.paddingBottom;

    /* the card's height plus its own bottom inset again, so the last control clears it rather
       than ending flush against it */
    function apply() {
      if (!el) {
        return;
      }
      body.style.paddingBottom = `${el.getBoundingClientRect().height + 28}px`;
    }
    apply();

    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      body.style.paddingBottom = restore;
    };
  }, [mounted]);

  /* The exit. The card is held mounted for `EXIT_MS` so the leaving animation can play — the
     whole point of a dismissible surface is that the dismissal is the animation the user asked
     for, and unmounting on click would delete it. */
  function accept() {
    try {
      window.localStorage.setItem(KEY, "accepted");
    } catch {
      /* the choice will not outlive the tab, but the card must still close — a notice that
         cannot be dismissed because storage is unavailable is far worse than one that re-asks */
    }
    setDismissed(true);
    setState("closed");
    window.setTimeout(() => {
      setMounted(false);
    }, EXIT_MS);
  }

  return (
    <>
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          /*
           * Portalled to `<body>` for the reason ToastProvider records of its own viewport: four
           * page roots and the wizard shell carry `overflow-clip`, any of which would crop a
           * `position: fixed` card raised from inside it.
           *
           * `z-40` — deliberately BELOW the navbar's `z-50` (Navbar.tsx:222) and below the
           * `z-[60]` shared by the toast viewport (Toast.tsx:566) and `ScopeModal`. This is a
           * persistent, non-modal notice and it must never cover a transient message or a
           * dialogue the user just opened. It shares the desktop bottom-right corner with the
           * upload toasts, which only exist inside the register wizard; when they do coincide the
           * toast paints over the card for its few seconds and then leaves it visible again,
           * which is the correct precedence between a passing message and a standing notice.
           * (On phones the toast viewport is `inset-x-0 top-0`, so there is no overlap at all.)
           *
           * `bottom-3 right-3` on phones and `sm:bottom-4 sm:right-4` above, matching the
           * toasts' own `md:p-4` inset so the two corners agree. Figma gives the card no page
           * placement — it is a detached 368px frame — so the anchor is the brief's
           * (bottom-right) and the inset is the site's.
           */
          <section
            ref={cardRef}
            data-state={state}
            aria-label="การใช้คุกกี้"
            /* `shadow-soft`, the UTILITY — `--shadow-soft` is declared inside `@theme`
               (index.css:38), so Tailwind generates a named class for it and the arbitrary form
               `shadow-[var(--shadow-soft)]` resolves to a fully transparent shadow instead.
               Measured: `box-shadow` computed `rgba(0, 0, 0, 0) 0px 0px 0px 0px` at every width,
               i.e. the card had no edge at all. */
            className="cookie-card shadow-soft fixed right-3 bottom-3 z-40 flex flex-col rounded-[12px] bg-white p-[10px] sm:right-4 sm:bottom-4"
            style={{
              /* 368 is Figma's own width; the `min` is what keeps a 320px viewport from panning */
              gap: 12,
              width: "min(368px, calc(100vw - 24px))",
            }}
          >
            {/* `2074:3221` — the badge/heading row, 12px gap, top-aligned */}
            <div className="flex gap-3">
              {/*
               * `2074:3202` — 32x32, `cornerRadius: 100` (i.e. a circle), filled `#c0563e`. The
               * `shrink-0` is load-bearing: the badge is a fixed 32 beside a flexible paragraph,
               * and without it the flex algorithm squashes the circle into an ellipse as the
               * Thai text wraps to three lines at the narrow end.
               */}
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:#c0563e] text-white">
                <CookieGlyph />
              </span>

              {/* `2074:3205` — heading over body, 8px gap */}
              <div className="flex flex-col gap-2">
                {/*
                 * `2074:3206`. Figma centres this text node inside a 304px column
                 * (`textAlignHorizontal: CENTER`) while the paragraph under it is LEFT — which
                 * only looks deliberate because the string happens to be shorter than the box.
                 * Both are left here: a centred heading over a left-set paragraph reads as a
                 * mistake at every width where the heading wraps, and Thai at 14px in a 296px
                 * card does wrap.
                 *
                 * The trailing space in Figma's `characters` ("เราใช้คุกกี้ ") is dropped.
                 */}
                <h2
                  className="font-medium text-[color:#282828]"
                  style={{ fontSize: 14, lineHeight: "21.154px" }}
                >
                  เราใช้คุกกี้
                </h2>

                {/*
                 * `2074:3208`, transcribed from its `characters`. Figma's string carries a hard
                 * line break before "เว็บไซต์ อ่านเพิ่มเติมได้ที่" — that is where the text
                 * happened to wrap in a 304px box, not a paragraph break, so it is restored to a
                 * single space and the browser wraps it for the width it actually has.
                 *
                 * The link is not a separate node: `characters` runs straight into it and
                 * `characterStyleOverrides` marks the last 21 characters with override 3 —
                 * `textDecoration: UNDERLINE` and fill rgb(0.7529, 0.3373, 0.2431), which is
                 * exactly `#c0563e`. So it is an inline span, and it is built as one.
                 */}
                {/*
                 * A real `<button>`, not an `<a>`: it opens the policy in the site's own
                 * reader (`PolicyModal`, given `PRIVACY_POLICY`) rather than navigating, and a
                 * link that does not go anywhere is a lie to assistive tech and to a
                 * middle-click. Both that component and `privacyPolicy.ts` are used exactly as
                 * they are — `{ document, onDecline }` is already the whole API — so nothing in
                 * either file had to change to reuse the reader here.
                 *
                 * `inline` so it flows inside the sentence, and `align-baseline` because a
                 * button is `inline-block`-ish by default in the reset and would otherwise sit
                 * a pixel low against the Thai baseline.
                 */}
                <p
                  className="text-[color:#8c8c8c]"
                  style={{ fontSize: 12, lineHeight: "18.132px" }}
                >
                  เราใช้คุกกี้ (Cookies) ที่จำเป็นเพื่อให้เว็บไซต์ทำงานได้อย่างถูกต้อง
                  และช่วยให้คุณใช้งานฟีเจอร์พื้นฐานและเข้าถึงพื้นที่ปลอดภัยของเว็บไซต์ อ่านเพิ่มเติมได้ที่{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setPolicyOpen(true);
                    }}
                    className="inline cursor-pointer align-baseline underline underline-offset-2 text-[color:#c0563e]"
                  >
                    นโยบายความเป็นส่วนตัว
                  </button>
                </p>
              </div>
            </div>

            {/*
             * `2074:3223` — full width, 6/16 padding, radius 8, `#c0563e`.
             *
             * Figma sets this label in Sukhumvit Set 600; the site has no such face loaded and
             * `--font-thai` (Noto Sans Thai) is what every other control on the site renders in,
             * so the weight is honoured and the family is the site's. Figma's own heading two
             * nodes above is already Noto Sans Thai, so the frame is internally inconsistent
             * here rather than asking for a second font.
             */}
            <button
              type="button"
              onClick={accept}
              className="w-full cursor-pointer rounded-[8px] bg-[color:#c0563e] px-4 py-1.5 font-semibold text-white transition-[filter] duration-150 hover:brightness-105 active:brightness-95"
              style={{ fontSize: 14, lineHeight: "22.218px" }}
            >
              ยอมรับ
            </button>
          </section>,
          document.body,
        )}

      {/*
       * The reader. Rendered outside the card's own mount flag so that dismissing the card while
       * the policy is open — which the user can do, the ยอมรับ button is still there behind the
       * scrim — does not tear the sheet out mid-read.
       */}
      <PolicyModal
        document={policyOpen ? PRIVACY_POLICY : null}
        onDecline={() => {
          setPolicyOpen(false);
        }}
      />
    </>
  );
}
