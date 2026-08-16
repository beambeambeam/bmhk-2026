import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SCOPE_CATEGORIES } from "@/features/guide/data/scope-content";
import { SCOPE_CARDS } from "@/features/guide/data/about-data";
import { ramp } from "@/components/scope-card-art";
import useDialogFocus, { useScrollLock } from "@/hooks/use-dialog-focus";
import "@/styles/scope-motion.css";

/** the same glyph the section's own ดาวน์โหลดฉบับเต็ม pill uses — one asset for the route */
const ARROW_DOWN = "/assets/figma/115b31f82f018f10c7430912ba6f548f7d8eab15.svg";

/** matches the closing `.scope-sheet` transition in styles/scope-motion.css */
const EXIT_MS = 190;

/**
 * The folder's step: how far the raised left portion of the tab rises above the rest of the
 * bar. Figma's path (`2074:2962`) runs its top edge along y=0 to x=780.243, slants down to
 * (824.895, 16.1992) and then runs along y=16.1992 to the right-hand corner — so the step is
 * 16.2 and it is FLAT, exactly as the 16px folder radius on the cards is flat (see the note in
 * ScopeSection about `rounded-2xl`).
 */
const STEP = 16.1992;
/** where the raised portion ends, and where its slant begins, as fractions of the 1200 bar */
const TAB_END = (824.895 / 1200) * 100;
const SLANT = (780.243 / 824.895) * 100;

/**
 * The folder silhouette behind the tab bar — `2074:2962`, 1200x181, filled with the category's
 * colour.
 *
 * Built from two boxes and a `clip-path` rather than shipped as the exported path, which is the
 * one place this component departs from how the CARD folders are drawn. Those are `<img>`s of a
 * 373x250 export stretched by `preserveAspectRatio="none"`, and that is fine for them: the card
 * is 373 wide at 1440 and 264 at its narrowest, a 1.4x squeeze. This bar is 1200 at 1440 and
 * ~354 on a phone — 3.4x — and a path stretched that far turns every 16px corner radius into a
 * 4.7x16 ellipse and visibly breaks the shape.
 *
 * Two boxes hold their radii at any width instead. The body is the low part of the folder; the
 * tab is the raised part, clipped along Figma's own slant. Both are `bg-current`, so the whole
 * silhouette takes its colour from the one `color` set on the bar.
 */
function FolderTab({ color }: { color: string }) {
  return (
    /*
     * `color` is set HERE, on the silhouette's own wrapper, and not on the bar above it. Both
     * boxes below paint with `bg-current`, so one property still colours the whole folder — but
     * `color` also inherits, and on the bar it beat the `text-white` class (an inline style
     * outranks a utility) and rendered the category's name in the category's own colour on top
     * of the category's own folder. The name was invisible at every width; the tab looked like
     * an empty coloured slab with a pager in it.
     */
    <div aria-hidden className="absolute inset-0" style={{ color }}>
      {/* the folder's body — its top edge is the low side of the step */}
      <div
        className="absolute inset-x-0 bottom-0 rounded-[16px] bg-current"
        style={{ top: STEP }}
      />
      {/*
       * The raised portion. `bottom-0` so it merges into the body rather than sitting on it —
       * only the 16.2px above the body's edge is ever visible, and the two share a colour so the
       * seam does not exist. The polygon keeps the top-left radius (it lies inside the clip) and
       * cuts the top-right one away, which is what Figma's path does too.
       *
       * The slant's horizontal run is a percentage, so it steepens as the bar narrows. That is
       * the right way for it to give: the step's HEIGHT is the thing that reads as a folder tab
       * and it is held at 16.2 everywhere.
       */}
      <div
        className="absolute top-0 bottom-0 left-0 rounded-t-[16px] bg-current"
        style={{
          clipPath: `polygon(0 0, ${SLANT}% 0, 100% ${STEP}px, 100% 100%, 0 100%)`,
          width: `${TAB_END}%`,
        }}
      />
    </div>
  );
}

export default function ScopeModal({
  index,
  origin,
  onSelect,
  onClose,
}: {
  /** which category is open, as an index into `SCOPE_CATEGORIES`; `null` closes the sheet. */
  index: number | null;
  /**
   * Viewport point of the card that opened the sheet, so it can grow out of that card and
   * shrink back into it. Optional: without it the sheet scales about its own centre.
   */
  origin?: { x: number; y: number } | null;
  /** the pager — switch category without closing. */
  onSelect: (i: number) => void;
  /** dismiss. Called by the close X, the scrim and Escape. */
  onClose: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);

  /*
   * The sheet outlives `index` by one exit animation, so the modal keeps its own mount flag and
   * goes on rendering the last category it was given while it is leaving. Same shape as
   * PolicyModal, and for the same reason: `state` flips a frame after mount (and back before
   * unmount) because a transition needs a painted start value to move away from.
   */
  const [shown, setShown] = useState<number>(index ?? 0);
  if (index !== null && index !== shown) {
    setShown(index);
  }

  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<"open" | "closed">("closed");

  useEffect(() => {
    if (index === null) {
      /* oxlint-disable-next-line react/react-compiler */
      setState("closed");
      const timer = window.setTimeout(() => {
        setMounted(false);
      }, EXIT_MS);
      return () => {
        window.clearTimeout(timer);
      };
    }

    setMounted(true);
    return () => {
      // no cleanup needed when opened
    };
  }, [index]);

  /*
   * The origin, and the frame that gives the entrance something to start from.
   *
   * Deliberately NOT keyed on `index` — only on `mounted`. Measuring again when the user pages
   * to another category would re-point `transform-origin` at a card that is not the one this
   * sheet grew out of, and since the sheet is already open and at `scale(1)` the only visible
   * effect would be on the CLOSING scale, which would then shrink towards the wrong card. The
   * sheet exits into whatever opened it. (`origin` itself is held stable by the section for the
   * same reason — see ScopeSection.)
   *
   * PolicyModal's two-frame note applies verbatim: React flushes a click's update and this
   * passive effect inside the event's own task, so a single `requestAnimationFrame` can still
   * run before the browser has painted the closed state. The outer frame paints it closed; the
   * inner one opens it.
   */
  const isOpen = index !== null;

  useEffect(() => {
    if (!isOpen || !mounted) {
      return () => {
        // closed or unmounted; no animation frames scheduled
      };
    }

    /*
     * The origin, corrected for the scale the sheet is already holding.
     *
     * `getBoundingClientRect()` reports the TRANSFORMED box, and at this moment the sheet is
     * sitting at its closed `scale(0.9)` — so measuring `origin - box.left` expresses the card's
     * centre in a box that is 10% too small, while `transform-origin` resolves against the
     * element's untransformed BORDER BOX. Measured at 1440 with the first card: the naive form
     * wrote (126.7, 516.5) where the card's centre in layout coordinates is (187, 559) — the
     * sheet grew out of a point 60px left and 42px above the card it was told to grow from.
     *
     * Scaling happens about the box's centre here (nothing has set `--scope-origin-*` yet, so
     * the 50%/50% fallback is in force), and a scale about the centre leaves the centre where it
     * is. So the transformed box's centre IS the untransformed box's centre, and `offsetWidth`/
     * `offsetHeight` — which are untransformed by definition — give the rest. No knowledge of
     * the scale's value is needed, which is what keeps this from drifting if the CSS changes.
     *
     * PolicyModal has the same defect and gets away with it: at `scale(0.96)` the error is ~2%
     * of a 1000px sheet, which it explicitly judges below the threshold where a growth centre
     * reads as wrong. At 0.9 across 1200px it is not.
     */
    const sheet = sheetRef.current;
    if (sheet && origin) {
      const box = sheet.getBoundingClientRect();
      const left = box.left + box.width / 2 - sheet.offsetWidth / 2;
      const top = box.top + box.height / 2 - sheet.offsetHeight / 2;
      sheet.style.setProperty("--scope-origin-x", `${origin.x - left}px`);
      sheet.style.setProperty("--scope-origin-y", `${origin.y - top}px`);
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
    /* oxlint-disable-next-line react-hooks/exhaustive-deps */
  }, [isOpen, mounted]);

  /* every page turn starts at the top of its own document */
  useEffect(() => {
    docRef.current?.scrollTo({ top: 0 });
  }, [shown]);

  /* `&& mounted`: on the render where `index` first arrives this component still returns null,
     so the ref is empty and focusing it would be a no-op that nothing re-runs. */
  useDialogFocus(index !== null && mounted, sheetRef);
  useScrollLock(index !== null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (index === null) {
      return () => {
        // modal closed; no keydown listener attached
      };
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [index, onClose]);

  /*
   * SWIPE to page between categories.
   *
   * Pointer Events, not touch events: one code path covers finger, pen and a trackpad drag,
   * and `setPointerCapture` means a swipe that leaves the sheet mid-gesture still completes
   * instead of stranding the state.
   *
   * The gesture is only claimed when it is decisively HORIZONTAL — 48px across and at least
   * twice the vertical travel. The sheet's body is a long scrolling document, so a lenient
   * threshold would steal every attempt to scroll it; requiring the horizontal component to
   * dominate is what lets the two coexist on a phone.
   *
   * Paging is clamped rather than wrapped. With six dots visible, running off the end and
   * reappearing at the start reads as a glitch; stopping communicates "this is the last one".
   */
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) {
      return;
    }
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }

  function onPointerUp(e: React.PointerEvent) {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== e.pointerId) {
      return;
    }
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 2) {
      return;
    }
    const next = shown + (dx < 0 ? 1 : -1);
    if (next >= 0 && next < SCOPE_CATEGORIES.length) {
      onSelect(next);
    }
  }

  if (!mounted) {
    return null;
  }

  const cat = SCOPE_CATEGORIES[shown];
  const { color } = SCOPE_CARDS[shown];

  return createPortal(
    /*
     * `2074:2951` "Overlay" — a #C2C2C2 scrim at 30% over a 10px backdrop blur, the same
     * treatment every dialogue on the site gets.
     *
     * The sheet sits at (120, 88) in the 1440x1023 overlay, so the inset is 120 across and 88
     * down at that end. Figma has no 402 frame for this modal, so both narrow anchors are
     * INFERRED at 24 — which is not a guess so much as the value the phone frame gives every
     * other sheet on the site (`1297:1580` insets the policy sheet by 24) and the same number
     * `--fl-gutter` resolves to at 402.
     *
     * The two vertical insets are NOT equal, and that is Figma's: 88 above the sheet and
     * 1023 − 88 − 850 = 85 below it. Written symmetrically the pair came to 176, which in a
     * 1024-tall viewport leaves 848 — so `max-h-full` clipped 2px off the sheet's own 850 and
     * the one height Figma actually states was the one value that did not survive.
     */
    <div
      data-state={state}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
          onClose();
        }
      }}
      role="presentation"
      /*
       * `z-[60]`, above the nav's `z-50` (Navbar.tsx:222). Both were 50, and at equal z-index
       * paint order falls back to DOM order — the nav is rendered after the page's content, so
       * it won and drew the pill straight across the top of the sheet.
       *
       * Raising the modal rather than lowering the nav: the nav has to stay above the PAGE, and
       * a modal is above everything by definition. `PolicyModal` sits at 50 and is fine only
       * because the wizard it opens over has no marketing nav to lose to — it is not a
       * counter-example, it is a route that never has this collision.
       */
      className="scope-scrim fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(194,194,194,0.3)] backdrop-blur-[10px]"
      style={{
        paddingBottom: ramp(24, 85),
        paddingInline: ramp(24, 120),
        paddingTop: ramp(24, 88),
      }}
    >
      {/*
       * The document sheet, `2074:2952` — 1200x850, radius 24, and a 40px `0 0` shadow at 5%
       * black. `overflow-clip` is Figma's own `clipsContent`, and it is load-bearing twice over:
       * it is what lets the document scroll under nothing, and what hides the folder tab while
       * the tab is translated below the sheet's bottom edge on the way in.
       *
       * `lg:h-[850px]` rather than a flat height, with `max-h-full` above it — the same shape
       * PolicyModal uses. Below `lg` the sheet is as tall as the scrim's padding allows, which
       * is what a phone wants; at 1440 it is Figma's 850 inside an 1023 overlay.
       */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/prefer-tag-over-role */}
      <div
        ref={sheetRef}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipe.current = null;
        }}
        /* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */
        role="dialog"
        aria-modal="true"
        aria-label={`ขอบเขตเนื้อหา — ${cat.th}`}
        tabIndex={-1}
        data-state={state}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
        className="scope-sheet relative flex max-h-full w-full max-w-[1200px] flex-col overflow-clip rounded-[24px] bg-white shadow-[0_0_40px_rgba(0,0,0,0.05)] outline-none lg:h-[850px]"
      >
        {/*
         * The close X, `2074:2978` — a 24px mark 20 in from the sheet's top-right corner, which
         * is inside the document's own 40 of padding rather than aligned to it.
         *
         * Drawn rather than shipped as an asset so it takes `currentColor` and can answer hover
         * at all, and given a full 44px touch target pulled back out to the 20px mark by the
         * negative margins — the arrangement PolicyModal's own close records.
         */}
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="mm-press-icon absolute end-0 top-0 z-20 flex size-11 items-center justify-center rounded-full text-gray-1 hover:text-ink"
          style={{ margin: ramp(12, 20) }}
        >
          <svg viewBox="0 0 24 24" aria-hidden className="size-6" fill="none">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/*
         * The document, `2074:2954` "Pilicy" — a 40-padded vertical stack on a uniform 16 gap,
         * alternating a 24/33.6 heading (`2074:2955`) with a 16/25.6 list (`2074:2956`), all in
         * #282828.
         *
         * `flex-1 min-h-0 overflow-y-auto` is what keeps long content scrolling INSIDE the sheet
         * rather than growing it: the page behind is already held still by `useScrollLock`, and a
         * sheet that grows instead of scrolling would push its own folder tab off the screen.
         *
         * Figma draws the document's background as a 1200x1325 image clipped to 850 — i.e. the
         * whole scroll extent flattened into one bitmap. That is a mock-up artefact, not a
         * design: the real document is as long as its own list.
         */}
        <div
          ref={docRef}
          className="scope-part scope-part-1 flex min-h-0 flex-1 flex-col overflow-y-auto text-[#282828]"
          style={{ gap: ramp(12, 16), padding: ramp(24, 40) }}
        >
          {/* keyed on the category so a page turn re-runs the cross-fade rather than swapping */}
          <div key={shown} className="scope-page-in flex flex-col" style={{ gap: ramp(12, 16) }}>
            {cat.groups.map((group) => (
              <section key={group.heading} className="flex flex-col" style={{ gap: ramp(12, 16) }}>
                {/* 24/33.6 Regular at 1440 (`2074:2955`). The narrow anchor is the 16 the policy
                    reader's own section headings take at 402 (`1297:1590`), so the two documents
                    on the site are set at the same size on a phone. Exact at `--fl` = 1. */}
                <h3 className="leading-[1.4] font-normal" style={{ fontSize: ramp(16, 24) }}>
                  {group.heading}
                </h3>
                {/* 16/25.6 Light (`2074:2956`), against the policy reader's 14 at 402. The
                    bullets are a real `<ul>`: Figma sets them as one text node with a bullet
                    character per line, which is a list drawn rather than marked up. */}
                <ul
                  className="list-disc leading-[1.6] font-light"
                  style={{ fontSize: ramp(14, 16), paddingInlineStart: ramp(20, 24) }}
                >
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        {/*
         * The folder tab, `2074:2961` — 1200x181 across the sheet's foot, 40 of padding, the
         * pager and the category's name on the left and ดาวน์โหลด on the right.
         *
         * `shrink-0` and in normal flow, so the document above it gets exactly the height that is
         * left; the bar's own height is its content's, which is what lets the title wrap to two
         * lines on a phone without the copy escaping the folder. Its `translate` on the way in is
         * visual only and cannot disturb that.
         *
         * The category's colour goes to `FolderTab` and stops there — see the note inside it.
         * Everything written on top of the folder is white, which is what `text-white` here
         * means and what it could not deliver while an inline `color` sat on this element.
         */}
        <div className="scope-tab relative shrink-0 text-white" style={{ padding: ramp(24, 40) }}>
          <FolderTab color={color} />
          {/* the row: the pager + name block, and the download pill pushed to the far end.
              `flex-wrap` so the pill drops under the name rather than crushing it on a phone,
              which is the one thing a 197px control beside a 28px title cannot do at 354. */}
          <div
            className="relative flex flex-wrap items-end justify-between"
            style={{ gap: ramp(20, 40) }}
          >
            <div className="flex min-w-0 flex-col" style={{ gap: ramp(16, 24) }}>
              {/*
               * Six dots, one per category, and they are BUTTONS — `2074:2964` draws a pager and
               * a pager that cannot be pressed is a picture of one. The open category's dot is
               * solid white (`2074:2965`), the rest are white at 30% (`2074:2966`).
               *
               * `aria-current` rather than a label that changes: the accessible name is the
               * category, which is what a reader needs to choose between them.
               */}
              <div
                aria-label="เลือกหมวดเนื้อหา"
                className="flex items-center"
                style={{ gap: ramp(8, 12) }}
              >
                {SCOPE_CATEGORIES.map((c, i) => (
                  <button
                    key={c.n}
                    type="button"
                    onClick={() => {
                      onSelect(i);
                    }}
                    aria-label={c.th}
                    aria-current={i === shown}
                    className={`mm-press-icon rounded-full bg-white transition-opacity ${
                      i === shown ? "opacity-100" : "opacity-30 hover:opacity-60"
                    }`}
                    style={{ height: ramp(10, 12), width: ramp(10, 12) }}
                  />
                ))}
              </div>
              {/* `2074:2971` — the English name at 16/22.4 Light over the Thai at 28/39.2
                  Medium, 4 apart. This is the SAME pair, at the same two sizes and the same
                  gap, that the card draws (`2074:2609`); that the tab and the card carry one
                  block is what the morph is showing the user. */}
              <div className="flex min-w-0 flex-col" style={{ gap: 4 }}>
                <p className="leading-[1.4] font-light" style={{ fontSize: ramp(14, 16) }}>
                  {cat.en}
                </p>
                <p className="leading-[1.4] font-medium" style={{ fontSize: ramp(20, 28) }}>
                  {cat.th}
                </p>
              </div>
            </div>

            {/*
             * `2074:2974` — a 197x60 pill on white at 20%, radius 100, holding a 28px arrow and
             * a 20/28 Bold label 20 apart, padded 24/16/36/16.
             *
             * `href="#"` is the SAME placeholder the section's own ดาวน์โหลดฉบับเต็ม (PDF) pill
             * carries: there is no document URL in the design yet, and the two controls should
             * not disagree about that. Both want the real path in one edit when it exists.
             */}
            <a
              href="/files/BH26 - ขอบเขตเนื้อหาที่ใช้ในการแข่งขัน.pdf"
              download
              className="mm-press flex shrink-0 items-center rounded-[100px] bg-white/20 transition-colors hover:bg-white/30"
              style={{
                gap: ramp(14, 20),
                paddingBlock: ramp(10, 16),
                paddingInlineEnd: ramp(22, 36),
                paddingInlineStart: ramp(16, 24),
              }}
            >
              {/*
               * The glyph is inset by PERCENTAGES on a `<span>`, never on the `<img>` — an
               * absolutely-positioned replaced element resolves `width: auto` to its INTRINSIC
               * width and drops the over-constrained inset (CSS 2.1 §10.3.7), so the arrow would
               * paint at its own 18.8x24.9 at every width. ScopeSection's own note on the
               * identical control records the whole diagnosis.
               */}
              <span
                className="mm-icon-pop relative block shrink-0"
                style={{ height: ramp(20, 28), width: ramp(20, 28) }}
              >
                <span className="absolute inset-[12.54%_22.35%_14.08%_22.33%] block">
                  <img src={ARROW_DOWN} alt="" aria-hidden className="block size-full" />
                </span>
              </span>
              <span
                className="leading-[1.4] font-bold whitespace-nowrap"
                style={{ fontSize: ramp(16, 20) }}
              >
                ดาวน์โหลด
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>,
    /*
     * PORTALLED TO `<body>`, and this is the fix for the nav drawing across the sheet — not the
     * z-index above it, which was necessary but on its own useless.
     *
     * `About.tsx`'s page root carries `isolate`, which creates a stacking context. A z-index
     * only ever competes INSIDE its own context, so the sheet's 60 was being compared with its
     * siblings on the page and the whole context was then placed under the nav's 50 in the root.
     * Measured: with the sheet open, `elementFromPoint` at the nav pill's centre still returned
     * a nav link. No z-index on the sheet can win that, because the number is not the problem.
     *
     * A portal moves the DOM node to `<body>`, so the sheet is a sibling of the nav in the root
     * context and the 60 finally means what it says. It also makes the sheet immune to any
     * future ancestor growing a transform, filter or `contain` — the same trap, one refactor
     * away. React keeps the portal in the component tree, so state, context and the Escape
     * handler are unaffected.
     */
    document.body,
  );
}
