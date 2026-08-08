import { useState } from "react";
import type { CSSProperties } from "react";
import SectionHeader from "@/components/section-header";
import { FAQS } from "@/features/guide/data/about-data";
import { useReveal } from "@/hooks/use-reveal";

/**
 * The exported Figma icon is the expanded (minus) state only, so the collapsed
 * plus is composed from two copies of that same asset rather than hand-drawn.
 */
function ToggleIcon({ open }: { open: boolean }) {
  return (
    /* `mm-icon-pop` as well as `mm-press-child`: the row is a ~700px-wide button whose only
       feedback was the press, so on the way to it there was nothing to say it was a control.
       The glyph swells on hover and shrinks on press — the same pair the footer's social
       rows use. */
    <span aria-hidden className="mm-press-child mm-icon-pop relative block size-8 shrink-0">
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
        i > 0 ? "border-t-[0.5px] border-brand-yellow pt-[calc(24px_+_16*var(--fl))]" : ""
      } ${revealCls}`}
    >
      <dt>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="mm-link fl-title-sm flex w-full items-center gap-6 text-left leading-[1.4] font-medium hover:text-brand-red"
        >
          <span className="flex-1">{faq.q}</span>
          <ToggleIcon open={open} />
        </button>
      </dt>
      {/*
       * The answer stays mounted and its grid row collapses to 0fr, so closing animates as
       * well as opening. The 16 gap Figma puts between question and answer lives inside the
       * clipped row as padding — as a flex gap it would survive the collapse and leave a hole
       * under a closed question.
       */}
      <dd className={`mm-collapse ${open ? "is-open" : ""}`}>
        <div className="fl-body pt-4 leading-[1.5]">{faq.a}</div>
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
  const [closed, setClosed] = useState<ReadonlySet<number>>(() => new Set());
  const { ref: headRef, cls: headCls } = useReveal();

  return (
    <section id="faq" className="shell sec-faq relative">
      {/* Decoration: a #FFEAB4 blob far wider than the page, flipped and centred on the
          section — it is what tints this whole band cream. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <img
          src="/assets/figma/5b4f0c1a6c5aa6f21d4a8c19dce31ff99afb3877.svg"
          alt=""
          className="absolute left-[calc(50%+0.5px)] top-[calc(50%+39.5px)] h-[1163px] w-[3023px] max-w-none -translate-x-1/2 -translate-y-1/2 scale-y-[-1]"
        />
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1200px] flex-col gap-[calc(40px_+_20*var(--fl))] lg:flex-row lg:items-center">
        <div
          ref={headRef}
          className={`flex flex-col gap-[calc(40px_+_20*var(--fl))] lg:w-[calc(400px_+_100*var(--fl))] lg:shrink-0 lg:self-stretch lg:justify-center ${headCls}`}
        >
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
              open={!closed.has(i)}
              onToggle={() => {
                setClosed((prev) => {
                  const next = new Set(prev);
                  if (!next.delete(i)) {
                    next.add(i);
                  }
                  return next;
                });
              }}
            />
          ))}
        </dl>
      </div>

      {/* Decoration / Star — Figma draws the mascot over the section, cropped by its box */}
      <div
        aria-hidden
        /*
         * `decor-fit decor-stage` instead of `hidden lg:block` — the mascot was one of the
         * pieces missing from the phone page.
         *
         * Below `lg` it is anchored to the section's top-RIGHT rather than to Figma's page
         * coordinate. Scaling Figma's own pin (263, -72) about the top-left lands the star
         * squarely on top of "คำถามที่พบบ่อย" on a 390 screen, and a decoration over a section
         * heading is worse than no decoration. On the right it clears the single-column text
         * entirely: the questions are left-aligned and their measure stops well short of the
         * edge, which is the same relationship the desktop pin has to the two-column layout.
         * From `lg` up the Figma pin is restored exactly.
         */
        className="decor-fit decor-stage pointer-events-none absolute top-0 right-[-6%] z-20 h-[693px] w-[853px] origin-top-right overflow-hidden lg:top-[263px] lg:right-auto lg:left-[-72px] lg:origin-top-left"
      >
        <img
          src="/assets/figma/15683452949f0984de16e5631de71122be94c4ff.png"
          alt=""
          className="absolute top-0 left-[-33.11%] h-[166.84%] w-[194.88%] max-w-none"
        />
      </div>
    </section>
  );
}
