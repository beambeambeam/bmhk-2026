import Mark2024 from "./mark2024";
import ScrollEdgeEffect from "@/components/scroll-edge-effect";
import { useReveal } from "@/hooks/use-reveal";
import type { PastEvent } from "./data/past-events-data";

/*
 * A past-event tile. Figma draws it twice and the two frames are the same object at two
 * sizes, so every figure below is written as `calc(MIN + DELTA * var(--fl))` with MIN taken
 * from the 402 phone frame and MIN+DELTA from the 1440 one:
 *
 *   desktop  1297:132  1200x800 tile, 40 pad, 73 between the columns, 300 logo,
 *                      73 between header and awards, 32 between award groups, 16 inside one
 *   phone    1190:1515 280x650 tile, 24 pad, 240 logo pinned to the top edge,
 *                      20 between award groups, 8 inside one
 *
 * TWO COMPOSITIONS, and the switch is `md` (768) because that is where the page stops being
 * a phone and starts being a narrowed desktop:
 *
 * - md and up: Figma's row — logo left, copy right. Everything that is a FRACTION OF THE
 *   TILE is written as a percentage rather than as a ramp, and written as the division it
 *   is — `calc(100% * 300 / 1120)` for the logo, `calc(100% * 73 / 1120)` for the column gap
 *   — so as the tile narrows the wordmark keeps exactly the quarter of the card Figma gives
 *   it instead of ballooning to 40% of it, which is what the old `w-[180px] lg:w-[300px]`
 *   pair did at 768: a 261 logo on a 652 tile, the award list squeezed into 290 and its
 *   labels colliding with the photo. 1120 is the flex container's content box at 1440
 *   (1200 less the two 40 pads), which is what a percentage here resolves against, so both
 *   come out at Figma's own number there.
 * - below md: Figma's phone card — the logo is pinned to the top edge, centred and 240 of
 *   the 280 wide, and the copy is bottom-aligned under it. `1190:1518` drops the title and
 *   the subtitle on the phone (the wordmark carries the year), so the header is `sr-only`
 *   rather than removed: `.sr-only` is absolutely positioned, so it leaves the flex flow —
 *   and its gap with it — while the h3 stays in the accessibility tree and in the document
 *   outline. It is the only heading a card has.
 *
 * The old `lg:` pairs are gone. Every one of them was a jump at 1024 — 24/40 padding,
 * 8/73 column gap, 16/24 header gap, 24/32 award gap, 8/16 group gap — and the whole
 * 768-1023 band sat on the phone value while the layout was already the desktop row.
 */
/*
 * The card's heading rank, overridden here rather than taken from `fl-title` in index.css.
 *
 * Figma sets the card title AND every award label at 20 on the phone (`1190:1520`,
 * `1190:1524` / `:1527` / `:1530` / `:1533`) and at 30 at 1440 (`1297:138`, `1297:142` …).
 * The ladder's own low end is 19.1775 at 402 — 0.82 under the frame — while its ceiling, 26,
 * is the DELIBERATE 1440 reading this file already documents (the ladder is tighter than
 * Figma's marketing 30/24 and that decision stands). So only the narrow end moves:
 * `19.8439 + 6.1561·--fl` is 20.0000 at 402 and exactly 26.000 at `--fl` = 1.
 *
 * It fits: at 20px "รางวัลรองชนะเลิศอันดับ 1" is 210 wide by Figma's own box, inside the
 * phone card's 232 copy column, so the wrap guard below is not called on.
 *
 * The award WINNERS and the subtitle keep `fl-lead`, which is 16.127 at 402 against
 * `1190:1525`'s 16 — a tenth of a pixel, i.e. the ladder is already the frame there.
 */
const HEADING = "calc(19.8439px + 6.1561 * var(--fl))";

export default function PastEventCard({ event }: { event: PastEvent }) {
  const { photoCrop, logo } = event;

  /*
   * Each card observes itself. The three of them used to share one `reveal-group` on the
   * column in pages/PastEvents.tsx, and at 800 tall apiece that meant cards two and three
   * were told to animate while they were a screen and a half below the fold — measured at
   * 1.39 and 2.33 of the viewport at 1440. There is no stagger to keep: nothing this tall
   * is ever on screen with its neighbour.
   *
   * It survives the phone carousel unchanged, and this is the reason to keep it per-card
   * rather than moving to a group now that the three sit side by side: the observer reports
   * a card clipped by the carousel's scrollport as not intersecting, so cards two and three
   * reveal as they are swiped in. The scroll listener in useReveal covers the other order —
   * all three tops share one y, so scrolling the row into view finishes all three.
   */
  const { ref: revealRef, cls: revealCls } = useReveal<HTMLElement>();

  return (
    /*
     * `overflow-clip`, not `overflow-hidden`. The photo crop below reaches 114.79% of the
     * tile and `hidden` would make that a scrollport a touch drag can pan — the same bug the
     * `html` note in index.css was written for, one box further in. `clip` clips to the same
     * padding box and to the same 40 radius without creating one.
     *
     * `min-h` rather than Figma's fixed height: the type ladder is deliberately smaller than
     * Figma's (26/21 against 30/24, see index.css), so the copy is strictly shorter than the
     * 720 Figma fits inside its own 800 tile and the tile resolves to exactly 800 at 1440 —
     * while a narrow width, where the type has stopped shrinking with the box, can push the
     * tile taller instead of clipping the last award off the bottom.
     *
     * ------------------------------------------------------- the radius, re-read 2026-08-06
     *
     * `rounded-[40px]` is FLAT and stays flat. Read live off all four frames:
     *
     *   1190:1515  rounded-[24px]   <- the odd one out
     *   1190:1536  rounded-[40px]
     *   1190:1584  rounded-[40px]
     *   1297:132   rounded-[40px]   (desktop, all three cards)
     *
     * So the 24 is one card of four, and the other two PHONE cards agree with the desktop
     * ones. A ramp 24 -> 40 would therefore be interpolating between a slip and the design;
     * a flat 40 is the phone value on two of the three tiles and the 1440 value on all of
     * them, which is why it is not written as `calc()` like everything else in this file.
     */
    <article
      ref={revealRef}
      className={`relative flex min-h-[calc(646.1px_+_153.9*var(--fl))] flex-col overflow-clip rounded-[40px] p-[calc(23.58px_+_16.42*var(--fl))] w-[280px] shrink-0 snap-start md:w-auto md:shrink md:snap-none md:flex-row md:items-start md:gap-x-[calc(100%*73/1120)] ${revealCls}`}
    >
      {photoCrop ? (
        // Figma frames the 2025 shot wider than the card and slides it left
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-clip">
          <img
            src={event.photo}
            alt=""
            /*
             * `object-cover` on the crop as well. Figma's box is 1422.24x800, i.e. exactly
             * the 16:9 of the source, so at 1440 this is a no-op — but the tile's own aspect
             * moves a long way from 3:2 as it narrows (652x703 at 768), and without it the
             * fill is stretched to whatever shape the box has taken.
             */
            className="absolute max-w-none object-cover"
            style={{
              height: `${photoCrop.height}%`,
              left: `${photoCrop.left}%`,
              top: `${photoCrop.top}%`,
              width: `${photoCrop.width}%`,
            }}
          />
        </div>
      ) : (
        <img
          src={event.photo}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full object-cover"
        />
      )}

      {event.photoWash !== undefined && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `rgba(0,0,0,${event.photoWash})` }}
        />
      )}

      {/* "Scroll Edge Effect - Soft" over the bottom 400: an ink plate, since it sits on
          dark photography, at the per-card outer radius Figma gives each one.
          400 is Figma's figure on BOTH frames — `1297:133` and `1190:1516` — so it is a flat
          px rather than a ramp, and 400 is also half of the 800 tile. `max(400px, 50%)` is
          that number everywhere it is the design and half the tile on the one case Figma
          never drew: a tile the copy has pushed past 800, where a flat 400 would leave the
          first award rows on unblurred photography.

          Verified against `1190:1516` for the phone: `bottom-0 left-0 h-[400px] w-[280px]`,
          i.e. the FULL tile width and 400 of its 650 — so the band is `inset-x-0` rather than
          inset by the card's 24 padding, and 400 is the same flat figure the desktop card has.

          `maskAlpha={0.9}` is Figma's, and it is a SECOND 0.9 rather than the layer's: the
          mask SVG carries `fill-opacity="0.9"` while the layer it masks is already
          `opacity-90`, so the plate's peak tint is 0.81. Without it this was the only one of
          the three Scroll Edge Effect instances on the site rendering at 0.9, i.e. visibly
          heavier than the design — `CodernSection` and `ContactSection` both pass it. */}
      <ScrollEdgeEffect
        tone="dark"
        flip
        maskAlpha={0.9}
        plateBlur={event.edgeBlur}
        className="absolute inset-x-0 bottom-0 h-[max(400px,50%)]"
      />

      {/*
       * The wordmark. Below md it is Figma's phone treatment — `1190:1517` pins it to the
       * tile's TOP EDGE (top 0, outside the 24 padding), centred, at 240 of the 280 width,
       * which is why it is absolute there and a flex item from md up. An absolute box's
       * percentage width resolves against the tile's padding box, i.e. the full 280, so the
       * 240 is written against that and the md value against the 1120 content box.
       *
       * `--logo-top`, and why a wordmark that is not square needs it. Figma's slot is a
       * SQUARE — `1190:1517` and `1190:1556` are both `size-[240px]` at top 0 — and a
       * shorter wordmark is CENTRED inside it rather than hung from its top edge:
       * `1190:1557` is a 240x194 container at `top-1/2 -translate-y-1/2` of the 240 box.
       * This box is the ARTWORK's box (the crops below are percentages of it), so it cannot
       * itself be the square; the offset is applied instead, and below `md` the tile is a
       * fixed 280 so it is exact px rather than a percentage of an unknown width:
       *
       *     (240 - 240 * logoHeight / 300) / 2
       *
       * 0 for the 2025 and 2023 marks (logoHeight 300, already square) and 23.2 for the 2024
       * one (242), which had been sitting 23px high in its slot. `md:top-auto` still wins
       * from 768 up, where the box is a flex item and Figma's own row governs.
       */}
      {/*
       * `mm-settle` — the wordmark grows from 0.94 onto its resting size 140ms behind the card's
       * own reveal, so the tile reads as a plate being stamped rather than as a photo with a logo
       * already on it. `scale` and nothing else, and that is forced rather than chosen: below
       * `md` this box is centred with `-translate-x-1/2`, which Tailwind 4 compiles to the
       * `translate` PROPERTY, so animating `translate` here would drop the -50% and throw the
       * wordmark half its own width off centre. It is also deliberately the wordmark and NOT the
       * photograph behind it: the photo sits in the backdrop of this card's seven-layer
       * ScrollEdgeEffect, so moving it would force all seven `backdrop-filter` layers to
       * re-blur every frame — the exact frame-time problem the per-card reveals in
       * pages/PastEvents.tsx were introduced to fix. The wordmark paints AFTER the effect, so it
       * is not in its backdrop and costs nothing. Spec on `.mm-settle` in micro-motion.css.
       */}
      <div
        className="mm-settle absolute top-[var(--logo-top)] left-1/2 w-[calc(100%*240/280)] -translate-x-1/2 overflow-clip md:relative md:top-auto md:left-auto md:w-[calc(100%*300/1120)] md:shrink-0 md:translate-x-0"
        style={
          {
            "--logo-top": `${((240 - (240 * event.logoHeight) / 300) / 2).toFixed(3)}px`,
            aspectRatio: `300 / ${event.logoHeight}`,
          } as React.CSSProperties
        }
      >
        {(() => {
          if (logo === null) {
            return <Mark2024 />;
          }

          if (logo.crop) {
            return (
              <img
                src={logo.src}
                alt=""
                aria-hidden
                className="absolute max-w-none"
                style={{
                  height: `${logo.crop.height}%`,
                  left: `${logo.crop.left}%`,
                  top: `${logo.crop.top}%`,
                  width: `${logo.crop.width}%`,
                }}
              />
            );
          }

          return (
            <img
              src={logo.src}
              alt=""
              aria-hidden
              className="absolute inset-0 size-full object-cover"
            />
          );
        })()}
      </div>

      {/* `justify-end` below md: `1190:1515` bottom-aligns the award list under the pinned
          wordmark. From md up the column starts at the top of the row, as `1297:136` does. */}
      <div className="relative flex min-w-0 flex-1 flex-col gap-[calc(39.142px_+_33.858*var(--fl))] text-white max-md:justify-end">
        {/* These four were the last hard `text-a lg:text-b` pairs on the marketing pages —
            24/18 below lg and 30/24 above it, i.e. two sizes and a jump at 1024. They are
            the card-heading and lead ranks of the shared ladder. */}
        <header className="flex flex-col gap-[calc(16px_+_8*var(--fl))] max-md:sr-only">
          <h3 className="leading-[1.4] font-medium" style={{ fontSize: HEADING }}>
            {event.title}
          </h3>
          <p className="fl-lead leading-[1.5] font-light">{event.subtitle}</p>
        </header>

        <dl className="flex flex-col gap-[calc(19.688px_+_12.312*var(--fl))]">
          {event.awards.map((award) => (
            <div key={award.label} className="flex flex-col gap-[calc(7.792px_+_8.208*var(--fl))]">
              {/* Figma sets every label `whitespace-nowrap`, on both frames. It is honoured
                  from md up, where the copy column is 393 at 768 against a longest label of
                  ~225 and only gets roomier; below md the column is 232 and a label that
                  came out one glyph too long would run off a 280 tile, so it wraps there. */}
              <dt
                className="leading-[1.4] font-medium md:whitespace-nowrap"
                style={{ fontSize: HEADING }}
              >
                {award.label}
              </dt>
              {award.winners.map((winner) => (
                <dd key={winner} className="fl-lead leading-[1.5] font-light">
                  {winner}
                </dd>
              ))}
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}
