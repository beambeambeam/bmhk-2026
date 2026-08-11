import ScopeCardArt, { ramp } from "@/components/scope-card-art";
import { SCOPE_CARDS, SCOPE_INTRO } from "../data/about-data";
import { useReveal } from "@/hooks/use-reveal";
import type { CSSProperties } from "react";

const BAND = ramp(101, 201);

/**
 * The folder panel's floor. Figma's folder is 250 tall on the first two 1440 cards
 * (`708:516` / `708:616`) and 248 on the third (`708:687`); all three are 199 on the phone
 * frame (`1190:999` / `1190:1099` / `1190:1170`). Held as a MIN rather than a height so the
 * panel still grows when the copy wraps to another line on a narrow card.
 */
function folderFloor(h: number) {
  return ramp(199, h);
}

/**
 * One card, revealing itself.
 *
 * D5 — the three of these used to be children of one `reveal-group` on the grid. That is
 * correct from `md` up, where they sit in a row and measured 0.43 of the viewport all three:
 * one trigger, one 70ms ladder. At 390 the grid is a single column and the same trigger fired
 * for cards whose tops were at 1.03 and 1.60 of the viewport — a screen below the fold, where
 * the animation is spent before it can be seen.
 *
 * Per-card reveals cover both, and the ladder survives the split because the stagger is
 * published as `--reveal-delay` (index.css) rather than as a `transition-delay` a group has
 * to own. In the row, the three triggers land in the same frame and the delays read exactly
 * as the group's did; in the column each card brings its own delay with it, which is a 70ms
 * lead-in rather than a queue.
 *
 * The delay is set inline and NOT as `transition-delay`, which is a list matching
 * `transition-property`: as a longhand it also postponed this card's own hover lift by up to
 * 140ms.
 */
function ScopeCard({ card, i }: { card: (typeof SCOPE_CARDS)[number]; i: number }) {
  const { ref: revealRef, cls: revealCls } = useReveal<HTMLElement>();

  const style: CSSProperties & Record<`--${string}`, string> = {
    "--reveal-delay": `${i * 70}ms`,
    "--scope-band": BAND,
    /* The art stage inside ScopeCardArt is scaled by `100cqw` of this card — see the
             header comment there. `inline-size` and not `size`: the card's own block size
             is what the folder's copy decides. */
    containerType: "inline-size",
  };

  return (
    <article
      ref={revealRef}
      style={style}
      /* these carry a "go" arrow in their footer, so they read as reachable —
         the lift is what confirms it before anything is wired up

         There are three cards and the middle band is two columns wide, so the third
         sat alone in the left half of a row with 430px of nothing beside it. It is
         given both columns and half their width instead, which centres it and turns
         the row into a deliberate 2-over-1 rather than an orphan. Three columns would
         have been the other way out, but ScopeCardArt is pinned in absolute px
         against Figma's 373-wide card, so a 198-wide card would show only the left
         half of each doodle band — two-up at 768 is 315, which is close to the
         width the art is drawn for. */
      className={`mm-lift relative overflow-hidden rounded-2xl bg-white shadow-soft lg:h-[451px] ${
        i === SCOPE_CARDS.length - 1
          ? "md:col-span-2 md:mx-auto md:w-[calc(50%_-_(12px_+_8*var(--fl)))] lg:col-span-1 lg:mx-0 lg:w-auto"
          : ""
      } ${revealCls}`}
    >
      <ScopeCardArt items={card.art} outlines={card.outlines} />
      {/* Figma reserves 201 above the folder for the topic's doodle band */}
      <div aria-hidden style={{ height: BAND }} />
      <div
        className="relative flex flex-col justify-between gap-6 p-5 text-white"
        style={{ minHeight: folderFloor(card.folderHeight) }}
      >
        {/* the folder silhouette carries the card's colour; stretched so the panel
            can still grow past 250 when the copy wraps on a narrow screen */}
        <img
          src={card.folder}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full max-w-none"
        />
        <div className="relative flex flex-col gap-1">
          <h3 className="text-[calc(24.026px_-_1.026*var(--fl))] leading-[1.4] font-medium">
            {card.title}
          </h3>
          <p className="text-[calc(15.922px_+_3.078*var(--fl))] leading-[1.4] font-light">
            {card.body}
          </p>
        </div>
        <p className="relative flex items-center gap-3">
          <span className="text-[calc(23.844px_+_6.156*var(--fl))] leading-[1.4]">
            {card.count}
          </span>
          <span className="flex-1 text-[20px] leading-[1.4]">หัวข้อ</span>
          <img
            src="/assets/figma/7a9a840bc86f022af7d9842b56f91f168bd06a03.svg"
            alt=""
            aria-hidden
            className="size-6"
          />
        </p>
      </div>
    </article>
  );
}

/**
 * Figma node 708:478 "Section / Coding Platform" — page y 139, 1024 tall, 120 side
 * padding, content inset 80 from the section top. The pads below resolve to the page
 * offsets Figma gives the next section: 139 + 80 in, 197 out.
 */
export default function ScopeSection() {
  const { ref: headRef, cls: headCls } = useReveal();

  return (
    <section id="scope" className="shell sec-scope relative">
      <div
        className="relative z-10 mx-auto flex max-w-[1200px] flex-col"
        style={{ gap: ramp(24, 40) }}
      >
        <div ref={headRef} className={`flex flex-col gap-[calc(12px_+_8*var(--fl))] ${headCls}`}>
          <p className="fl-eyebrow leading-[1.5] font-medium text-brand-yellow">01</p>
          {/* the pill is centred against the title + intro pair, not against the row's top */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-0">
            <div className="flex flex-col gap-[calc(8px_-_4*var(--fl))] lg:flex-1">
              <h2 className="fl-section leading-[1.4] font-semibold">ขอบเขตเนื้อหา</h2>
              <p className="fl-lead leading-[1.5] font-light">{SCOPE_INTRO}</p>
            </div>
            <a
              href="/bangmod-hackathon-2026-competition-handbook.pdf"
              download="bangmod-hackathon-2026-competition-handbook.pdf"
              className="mm-press mm-pdf-cta flex shrink-0 items-center gap-[calc(12px_+_8*var(--fl))] self-start rounded-[100px] bg-brand-red py-[calc(9.844px_+_6.156*var(--fl))] pr-[calc(24px_+_12*var(--fl))] pl-[calc(16px_+_8*var(--fl))] text-white lg:self-auto"
            >
              {/* a download arrow leans the way it points on hover */}
              <span
                className="mm-arrow-down relative block shrink-0"
                style={{ height: ramp(20, 34), width: ramp(20, 34) }}
              >
                {/* The inset is on this SPAN, not on the <img>, and that is the whole fix for
                    the "icon too big" report. An `<img>` is a REPLACED element: absolutely
                    positioned with all four insets set, `width: auto` resolves to the image's
                    INTRINSIC width and the over-constrained `right` is discarded outright
                    (CSS 2.1 §10.3.7). So the glyph painted at the asset's own
                    18.8109 x 24.9493 at EVERY width — a 25-tall arrow inside a box the ramp
                    had correctly narrowed to 20.03 at 402, standing beside a 16px label.
                    `max-w-none` had also removed the preflight `max-width: 100%` that would
                    otherwise have capped it, so nothing was left to bound it at all. A span is
                    a non-replaced box, so the inset genuinely sizes it and `size-full` makes
                    the image follow.

                    The insets stay percentages rather than becoming a second ramp: 55.32% wide
                    x 73.38% tall is the glyph's share of Figma's icon frame, and at the box's
                    34 ceiling that is exactly 18.8088 x 24.9492 — the asset drawn 1:1. 1440 is
                    therefore unmoved to within the 4th decimal (same top/left, same size), and
                    402 finally gets the 11.08 x 14.70 glyph the 20-box implies. */}
                <span className="absolute inset-[12.54%_22.35%_14.08%_22.33%] block">
                  <img
                    src="/assets/figma/115b31f82f018f10c7430912ba6f548f7d8eab15.svg"
                    alt=""
                    aria-hidden
                    className="block size-full"
                  />
                </span>
              </span>
              <span className="fl-body leading-[1.4] font-bold whitespace-nowrap">
                ดาวน์โหลดฉบับเต็ม (PDF)
              </span>
            </a>
          </div>
        </div>

        <div className="grid gap-[calc(24px_+_16*var(--fl))] md:grid-cols-2 lg:grid-cols-3">
          {SCOPE_CARDS.map((card, i) => (
            <ScopeCard key={card.title} card={card} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
