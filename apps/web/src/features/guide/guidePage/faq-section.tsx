import { useState } from "react";
import type { CSSProperties } from "react";
import SectionHeader from "@/components/section-header";
import { FAQS } from "@/features/guide/data/about-data";
import { useReveal } from "@/hooks/use-reveal";
import { PhoneGarlic } from "./about-decor";
import { ramp } from "@/components/scope-card-art";

/**
 * The exported Figma icon is the expanded (minus) state only, so the collapsed
 * plus is composed from two copies of that same asset rather than hand-drawn.
 */

function Star({ className }: { className: string }) {
  return (
    /*
     * `overflow-clip`, not `overflow-hidden`. This box holds a 690px-wide bitmap in a 354 window
     * and `hidden` would make that a scrollport — touch-pannable on the phone, and one more
     * place for `documentElement.scrollWidth` to escape `clientWidth`. Same rule as every other
     * over-sized-art box on this page.
     */
    <div aria-hidden className={`pointer-events-none overflow-clip ${className}`}>
      <img
        src="/assets/figma/15683452949f0984de16e5631de71122be94c4ff.png"
        alt=""
        className="absolute top-0 left-[-33.11%] h-[166.84%] w-[194.88%] max-w-none"
      />
    </div>
  );
}

const Q_SIZE = ramp(18, 23);
const A_SIZE = ramp(16, 19);

/**
 * The two gaps this section is built from, both solved through Figma's two frames:
 *
 *   BLOCK  60 at 1440 — `708:704`'s title column: the "03" block ends at 247.705 and the
 *          mascot's reserved footprint starts at 307.705; the two columns are 620 and 680
 *          apart in a 1200 row, i.e. also 60.
 *          24 at 402 — `1190:1340` ends at 287.35 and the header starts at 311.35; the header
 *          ends at 392.35 and the question grid starts at 416.35.
 *   ROW    40 at 1440 — `708:717`, a divider at y 167 between rows ending at 127 and
 *          starting at 207: 40 above it and 40 below.
 *          16 at 402 — `1190:1352`, the same divider at y 105 between 89 and 121.
 */
const BLOCK_GAP = ramp(24, 60);
const ROW_GAP = ramp(16, 40);

function ToggleIcon({ open }: { open: boolean }) {
  return (
    /* `mm-icon-pop` as well as `mm-press-child`: the row is a ~700px-wide button whose only
       feedback was the press, so on the way to it there was nothing to say it was a control.
       The glyph swells on hover and shrinks on press — the same pair the footer's social
       rows use. */
    <span
      aria-hidden
      className="mm-press-child mm-icon-pop relative block shrink-0"
      style={{ height: ramp(24, 32), width: ramp(24, 32) }}
    >
      <img
        src="/assets/figma/0e681a2a1d4944287c14f80f1e46ef1bd044ab87.svg"
        alt=""
        className="absolute inset-0 size-full"
      />
      <img
        src="/assets/figma/0e681a2a1d4944287c14f80f1e46ef1bd044ab87.svg"
        alt=""
        data-open={open}
        className="mm-toggle-bar absolute inset-0 size-full"
      />
    </span>
  );
}

/**
 * One question, revealing itself.
 *
 * The list is taller than the viewport at every width, so it cannot share one trigger: as a
 * `reveal-group` the rows measured 0.91 / 1.05 / 1.22 of the viewport at 1440 at the frame
 * they were told to animate, i.e. three of the four spent their arrival below the fold. Same
 * fix as the scope cards and the prizes — a reveal per row, with the 70ms ladder carried
 * inline as `--reveal-delay` so it survives the split (index.css).
 */
function FaqRow({
  faq,
  i,
  open,
  onToggle,
}: {
  faq: (typeof FAQS)[number];
  i: number;
  open: boolean;
  onToggle: () => void;
}) {
  const { ref: revealRef, cls: revealCls } = useReveal();
  const style: CSSProperties & Record<`--${string}`, string> = {
    "--reveal-delay": `${i * 70}ms`,
    /* the divider's own half of the row gap; the `<dl>` carries the other half */
    paddingTop: i > 0 ? ROW_GAP : undefined,
  };

  return (
    /*
     * One real box per question, and the rule between two questions is a border on the lower
     * one rather than a separator element beside it.
     *
     * This used to be a `<div className="contents">` holding a separator and the row, which
     * made the whole list's reveal a no-op: `display: contents` generates no box, so
     * `opacity`, `transform` and every `transition-delay` the group handed these children were
     * simply dropped. Measured: all four children `display: "contents"`, `opacity: "0"`,
     * `transform: "none"` — fully visible on screen with nothing to animate — while the
     * heading beside them revealed normally. On the largest block of `/guide` the title moved
     * and the questions did not.
     *
     * The spacing is unchanged to the half-pixel. The `<dl>` keeps its own gap, and a row
     * after the first adds the border plus a top pad of that same gap, which is exactly what
     * the zero-height separator sitting between two gaps came to.
     */
    <div
      ref={revealRef}
      style={style}
      className={`flex flex-col ${
        i > 0 ? "border-t-[0.5px] border-brand-yellow" : ""
      } ${revealCls}`}
    >
      <dt>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          /*
           * The gap before the toggle RAMPS to 0, and that is the whole of why this list ran
           * taller than Figma's on the phone. It was a flat `gap-6`, i.e. the 1440 figure worn
           * at 402: Figma's desktop row is 640 wide with its widest question given 584 and a 32
           * toggle at x 608, so 24 of gap — but the phone row is 354 with the question given the
           * full 330 (`1190:1355` is `flex-[1_0_0]` at 330, `1190:1356` at x 330), i.e. NO gap.
           * Holding 24 there took the question column down to 306 and wrapped questions Figma
           * keeps on one line, which is most of the extra air the list carried.
           *
           * `ramp(0, 24)` is 0.000 at 402 and exactly 24.000 at `--fl` = 1 — 1440 unchanged.
           * Wrapped in `max(0px, …)` because that ramp's intercept is negative (-0.624px, so it
           * is under 375 that it would go negative): a negative `gap` is an invalid value, the
           * declaration would be DROPPED, and the element would silently fall back to whatever
           * the cascade left — the same guard `sec-prizes` and `sec-faq` use in index.css.
           */
          /*
           * NO red on hover. It was `mm-link … hover:text-brand-red`, and on a question that can
           * run two lines a whole paragraph changing colour is far too loud for "you may click
           * this" — it also reads as a state (active/selected) rather than as an invitation.
           *
           * The affordance is MOVEMENT instead: `.mm-faq-row` leans the question 2px right, and
           * the toggle glyph already swells via `mm-icon-pop`. Two small things at the two ends
           * of the row, so the whole row reads as one control without any of it recolouring.
           * `mm-link` is dropped with the colour it existed to time.
           */
          className="mm-faq-row flex w-full items-center text-left leading-[1.4] font-medium"
          style={{ fontSize: Q_SIZE, gap: `max(0px, ${ramp(0, 24)})` }}
        >
          {/* `min-w-0` so a long Thai question wraps inside the row instead of forcing the
              flex line wider than 354 and pushing the toggle off the column — the questions
              have no spaces to break at, so the flex base size is the whole string. */}
          <span className="min-w-0 flex-1">{faq.q}</span>
          <ToggleIcon open={open} />
        </button>
      </dt>
      {/*
       * The answer stays mounted and its grid row collapses to 0fr, so closing animates as
       * well as opening. The 16 gap Figma puts between question and answer lives inside the
       * clipped row as padding — as a flex gap it would survive the collapse and leave a hole
       * under a closed question.
       */}
      <dd className={`mm-collapse mm-collapse-lift ${open ? "is-open" : ""}`}>
        {/* `font-normal` stated rather than inherited: `1190:1351` is Noto Sans Thai **Regular**,
            and the answers are the one place on this page where a Description node is NOT set
            Light. The document root carries no `font-weight`, so 400 was already what resolved
            here — this pins it against the surrounding `font-light` Descriptions. */}
        <div className="pt-4 leading-[1.5] font-normal" style={{ fontSize: A_SIZE }}>
          {faq.a}
        </div>
      </dd>
    </div>
  );
}

/**
 * Figma node 708:702 "Section / Features" — page y 2362, 1024 tall, 120 side padding,
 * a 500 title column and the questions sharing a 60 gap, both vertically centred. The
 * 124.705 pads are what centring a 774.59 row inside 1024 comes to.
 */
export default function FaqSection() {
  // Figma shows every question expanded — each toggle is drawn in its minus state — so
  // these open independently rather than as a one-at-a-time accordion.
  const [open, setOpen] = useState<number | null>(null);
  const { ref: headRef, cls: headCls } = useReveal();

  return (
    <section id="faq" className="shell sec-faq relative">
      {/* Decoration: a #FFEAB4 blob far wider than the page, flipped and centred on the
          section — it is what tints this whole band cream. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <img
          src="/assets/figma/5b4f0c1a6c5aa6f21d4a8c19dce31ff99afb3877.svg"
          alt=""
          className="absolute max-w-none scale-y-[-1]"
          style={{
            /* 100% + top overhang + bottom overhang: 209 @402 -> 139 @1440 */
            height: "calc(100% + 210.821px - 71.821 * var(--fl))",
            /* -1326 @402 -> -791 @1440 */
            left: "calc(-1339.92px + 548.92 * var(--fl))",
            /* -65 -> -30 */
            top: "calc(-65.9105px + 35.9105 * var(--fl))",
            /* 3055 -> 3023 */
            width: "calc(3055.83px - 32.83 * var(--fl))",
          }}
        />
      </div>
      <PhoneGarlic />

      <div
        className="relative z-10 mx-auto flex max-w-[1200px] flex-col md:flex-row md:items-center"
        /* One token on both axes, which is what Figma has: the 1440 row's two columns are 60
           apart and its title column stacks its own blocks 60 apart, and the phone frame
           stacks everything 24 apart. `5%` of the 1200 column would also be exactly 60 — but
           an inline `gap` outranks any class, so writing the column gap as a percentage here
           would have been a rule that silently never applied. */
        style={{ gap: BLOCK_GAP }}
      >
        <div
          className="flex flex-col md:w-[41.6667%] md:shrink-0 md:justify-center md:self-stretch"
          style={{ gap: BLOCK_GAP }}
        >
          {/* Below `lg` Figma puts the mascot at the TOP of the column, in the flow, at the
              full column width: `1190:1340` is 354x287.35 at the section's own y 0, with the
              header 24 under it. That replaces a `decor-stage` copy hung off the section's
              top-RIGHT corner, which existed only to keep the old pinned position from
              landing on the heading — Figma's own answer is to give it its own room. */}
          {/* `aspect-[1211/983]` is `1190:1340`'s own ratio and resolves the 354 column to
              287.351 — Figma's stated height to three decimals. It was `853/693`, the DESKTOP
              window's ratio, which came to 287.60: right to a quarter-pixel, but this is the box
              the section's 24 gaps and its 966.351 total are measured from, so it is stated from
              the frame that owns it. */}
          <Star className="relative aspect-[1211/983] w-full lg:hidden" />
          {/* The reveal wraps the header alone. It used to be this whole column, which is the
              same thing while the column's other child is invisible — but the mascot is not,
              below `lg`, and a background mascot sliding in is not a reveal desktop has. */}
          <div ref={headRef} className={headCls} />
          <SectionHeader number="03" title="คำถามที่พบบ่อย" />
          {/* Figma reserves the mascot's footprint in this column with a hidden copy of
              it, which is what pushes the heading up off the section's centre line. */}
          <div aria-hidden className="hidden aspect-[1736/2054] w-full lg:block" />
        </div>

        <dl className="flex flex-1 flex-col gap-[calc(24px_+_16*var(--fl))]">
          {FAQS.map((faq, i) => (
            <FaqRow
              key={faq.q}
              faq={faq}
              i={i}
              open={open === i}
              /* Clicking the open row shuts it; clicking any other row moves the single open
                 index, which closes the previous one as a consequence rather than as a step. */
              onToggle={() => {
                setOpen((prev) => (prev === i ? null : i));
              }}
            />
          ))}
        </dl>
      </div>

      {/* Decoration / Star — Figma draws the mascot over the section, cropped by its box */}
      <Star className="decor-fit decor-stage absolute top-[263px] left-[-72px] z-20 hidden h-[693px] w-[853px] origin-top-left lg:block" />
    </section>
  );
}
