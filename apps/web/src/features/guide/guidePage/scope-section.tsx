import { useCallback, useState } from "react";
import ScopeCardArt, { ramp } from "@/components/scope-card-art";
import { SCOPE_CARDS, SCOPE_INTRO } from "../data/about-data";
import { SCOPE_CATEGORIES } from "../data/scope-content";
import ScopeModal from "@/features/guide/guidePage/scope-modal";
import { useReveal } from "@/hooks/use-reveal";

/**
 * The band Figma reserves above the folder for the topic's doodles: 201 on the 1440 card
 * (`708:516` puts the folder at y 201 of a 451-tall card) and 101 on the 402 one
 * (`1190:999` puts it at y 101 of a 300-tall card). It was a hard 201, which on the phone
 * was two thirds of the whole card.
 */
const BAND = ramp(101, 201);

/**
 * The folder panel's floor. Figma's six folders are all 250 tall on the 1440 frame
 * (`2074:2608` and its five siblings) against 199 on the phone frame (`1190:999`). It used to
 * be a per-card number, because the three-card frame drew its third folder 248; the new frame
 * has no such odd one out, so the floor is one value again.
 *
 * Held as a MIN rather than a height so the panel still grows when the copy wraps to another
 * line on a narrow card — which is now the common case rather than the exception, since five of
 * the six titles take two lines at 1440 (`2074:2622` and friends are 78 tall where card 1's
 * `2074:2611` is 39).
 */
const FOLDER_FLOOR = ramp(199, 250);

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
function ScopeCard({
  card,
  i,
  onOpen,
}: {
  card: (typeof SCOPE_CARDS)[number];
  i: number;
  onOpen: (i: number, origin: { x: number; y: number }) => void;
}) {
  const { ref, cls } = useReveal<HTMLElement>();
  /* the card's words and its count live with the document it opens — see aboutData.ts */
  const cat = SCOPE_CATEGORIES[i];
  const headingId = `scope-card-${cat.n}`;

  return (
    <article
      ref={ref}
      style={
        {
          "--reveal-delay": `${i * 70}ms`,
          "--scope-band": BAND,
          /* The art stage inside ScopeCardArt is scaled by `100cqw` of this card — see the
             header comment there. `inline-size` and not `size`: the card's own block size
             is what the folder's copy decides. */
          containerType: "inline-size",
        } as React.CSSProperties
      }
      /* these carry a "go" arrow in their footer, so they read as reachable — and now they
         genuinely are: the whole card opens the category's document (see the button below).

         The 2-over-1 special case that used to live here is GONE, and its removal is the
         whole point of the change. With three cards the middle band was two columns wide, so
         the third sat alone in the left half of a row with 430px of nothing beside it, and it
         was given both columns and half their width to centre it. Six cards divide evenly by
         both column counts — 3x2 at `lg` (Figma's own `2074:2605`, a 1200x942 block of two
         373x451 rows 40 apart) and 2x3 at `md` — so there is no orphan to arrange and every
         card is the same width again. */
      /* No `lg:h-[451px]` any more. 451 IS `201 + 250` — the band plus the folder — and
         both of those now ramp, so the height follows them and still comes to 451 at 1440,
         where each is at its Figma anchor and the copy (216 tall in a 333 measure) sits
         inside the 250 floor. As a hard height it was the band that gave way: at 1024 the
         card was still 451 with a 161 band, so the 373x250 folder silhouette was stretched
         to 264x290 and the card read as a tall box rather than as a smaller copy of the
         1440 one. Grid items stretch, so the three still share the tallest one's height
         exactly as they did. */
      /* `rounded-2xl` (16) is FLAT on purpose: read live 2026-08-06, `1190:974` and
         `708:491` are both `rounded-[16px]`, and `2074:2606` still is, so this is the one card
         radius on the site that does not ramp. The folder panel below keeps its 20 of side and
         bottom pad, its 4 gap, its 12 footer gap and its 24 arrow flat for the same reason
         (`1190:999` vs `708:516`). Its TOP pad is now the one exception — the new frame raises
         it to 40 (`2074:2607`) — so that one ramps and the other three do not. */
      className={`mm-lift relative overflow-hidden rounded-2xl bg-white shadow-soft ${cls}`}
    >
      <ScopeCardArt items={card.art} outlines={card.outlines} />
      {/* Figma reserves the doodle band above the folder — 201 at 1440, 101 at 402 */}
      <div aria-hidden style={{ height: BAND }} />
      <div
        /*
         * `pt` is a ramp where the other three pads stay flat 20, and that is Figma's own
         * asymmetry rather than an invention: `2074:2607` sets `padding 40 20 20 20`, so the
         * new card holds its title 40 below the folder's lip where the three-card frame held
         * it at 20 (`708:516`). The extra 20 is what keeps the title clear of the folder's
         * raised tab. There is no 402 frame for this card, so the narrow anchor stays the
         * phone frame's measured 20 (`1190:999`) and the ramp closes the difference.
         */
        className="relative flex flex-col justify-between gap-6 px-5 pb-5 text-white"
        style={{ minHeight: FOLDER_FLOOR, paddingTop: ramp(20, 40) }}
      >
        {/* the folder silhouette carries the card's colour; stretched so the panel
            can still grow past 250 when the copy wraps on a narrow screen */}
        <img
          src={card.folder}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full max-w-none"
        />
        {/*
         * These four sizes are solved through the PHONE frame's own values rather than left on
         * their ladder ranks, which is a deliberate reversal the user asked for: the ranks in
         * index.css are calibrated against the registration screens, and on this card they
         * landed 25-38% away from what `1190:1002`-`1190:1006` draw at 402 — the widest gap
         * anywhere on the site, and what made the phone cards read wrong.
         *
         *   rank          gave @402   Figma @402   @1440   node
         *   fl-title-sm      17.43        24           23     1190:1002 / 708:519
         *   fl-body          15.10        16           19     1190:1003 / 708:520
         *   fl-title         19.18        24           30     1190:1005 / 708:522
         *   fl-caption       13.08        18->20       20     1190:1006 / 708:523
         *
         * One of the four DESCENDS (24 -> 23), the same shape `fl-eyebrow` already carries and
         * for the same reason: the designer's phone value is simply larger than the
         * desktop-derived one.
         *
         * The bottom two rows' 1440 values were CORRECTED later, and they are the exception to
         * "1440 does not move" — they were never Figma's. The rank ceilings 26 and 16 had been
         * carried over as if verified; REST says all three desktop cards draw 30 and 20. See the
         * two notes on the count and the label below for the readings.
         */}
        {/*
         * The title block is a DIFFERENT pair from the one this card used to draw, and the
         * change is the reason the modal reads as coming out of the card at all.
         *
         * It was a Thai heading over a sentence of body copy ("คณิตศาสตร์" over "ครอบคลุมเลขคณิต
         * เรขาคณิต …"). `2074:2609` replaces that with the category's ENGLISH name over its THAI
         * name — 16/22.4 Light above 28/39.2 Medium, 4 apart — and `2074:2971`, the modal's
         * folder tab, draws the identical block at the identical two sizes and gap. One block
         * on both, so the thing the user pressed is still in front of them when the sheet has
         * finished opening. The prose is not lost: it is the category's `intro`, which belongs
         * with the document rather than on the card.
         *
         * Neither size has a 402 anchor — Figma drew no phone frame for the new card — so both
         * narrow ends are inferred and are SHARED with the modal's tab, which is what keeps the
         * pair identical at every width rather than only at 1440.
         */}
        <div className="relative flex flex-col gap-1">
          {/* 16 @1440 (2074:2610) — inferred 14 at 402, the same rank the policy reader's body
              takes there. `gap-1` is Figma's 4. */}
          <p className="leading-[1.4] font-light" style={{ fontSize: ramp(14, 16) }}>
            {cat.en}
          </p>
          {/* 28 @1440 (2074:2611) — inferred 20 at 402. The heading stays an `<h3>`: these six
              are the section's sub-headings and a screen reader's outline needs them. */}
          <h3
            id={headingId}
            className="leading-[1.4] font-medium"
            style={{ fontSize: ramp(20, 28) }}
          >
            {cat.th}
          </h3>
        </div>
        <p className="relative flex items-center gap-3">
          {/*
           * 24 @402 -> 30 @1440. The 1440 end was 26 and that was simply wrong: all three
           * desktop counts are 30 (`708:522` / `708:622` / `708:693`), read from REST, and all
           * three phone counts are 24 (`1190:1005` / `1190:1105` / `1190:1176`). Both anchors
           * are unanimous across the three cards, so there is nothing to arbitrate here.
           */}
          {/* DERIVED, not transcribed: the count is how many `1.x` sub-sections the document
              behind this card actually has, so the two can never drift. Figma's own six cards
              read 4/3/5/5/5/5, whose last two are placeholder copy — see scopeContent.ts. */}
          <span className="text-[calc(23.844px_+_6.156*var(--fl))] leading-[1.4]">
            {cat.groups.length}
          </span>
          {/*
           * FLAT 20, and this one IS an arbitration — Figma disagrees with itself.
           *
           *   desktop  `708:523` / `708:623` / `708:694`   20 / 20 / 20
           *   phone    `1190:1006` / `1190:1106` / `1190:1177`   **18** / 20 / 20
           *
           * So five of six nodes say 20 and card 1's phone label alone says 18. One shared
           * component can hold one value, and the 18 is the outlier that also disagrees with its
           * own desktop counterpart — authoring drift, not a breakpoint. Flat 20 matches five
           * nodes exactly and misses one by 2px.
           *
           * The previous value ramped 18 -> 16, which matched the 18 outlier at the phone end and
           * nothing at all at 1440, where every card says 20.
           */}
          <span className="flex-1 text-[20px] leading-[1.4]">หัวข้อ</span>
          {/*
           * `mm-nudge` — the glyph is `arrow_right_regular`, so it leans right by 4px while the
           * card is hovered. It answers the CARD's hover, not its own: this card is an
           * `<article>` carrying `mm-lift`, and every existing arrow utility keys off
           * `:is(a, button):hover`, so the card rose under the pointer while the arrow that
           * promises it is reachable sat still. The rule pairs with `.mm-lift` and is gated on a
           * fine pointer, since touch fires :hover on tap — see micro-motion.css.
           */}
          <img
            src="/assets/figma/7a9a840bc86f022af7d9842b56f91f168bd06a03.svg"
            alt=""
            aria-hidden
            className="mm-nudge size-6"
          />
        </p>
      </div>
      {/*
       * The card's control. A full-bleed button rather than the `<article>` itself being one,
       * because a `<button>` may only contain phrasing content and this card holds an `<h3>` —
       * the six headings are the section's outline and a screen reader needs them to stay
       * headings. `aria-labelledby` gives the button that heading as its accessible name, so
       * the control announces "คณิตศาสตร์เชิงคำนวณ, button" instead of nothing at all.
       *
       * It also keeps the hover story intact: `.mm-lift` is on the article and `.mm-nudge` pairs
       * with it (micro-motion.css), and pointing at a descendant hovers its ancestor, so the
       * card still lifts and the arrow still leans — now with something behind the promise.
       *
       * `outline-offset` is NEGATIVE. The site's one focus ring (index.css) draws 3px OUTSIDE
       * the control, and this control is the full bleed of a card that clips its own overflow,
       * so an outside ring would be cut away on all four sides. Drawn 4px inside it clears the
       * corner radius and stays visible. The colour is the card's own rather than the ring's
       * usual `currentColor`, which would be white here — invisible against the white doodle
       * band that is half of what the button covers.
       */}
      <button
        type="button"
        aria-labelledby={headingId}
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          onOpen(i, { x: box.left + box.width / 2, y: box.top + box.height / 2 });
        }}
        className="absolute inset-0 z-20 cursor-pointer rounded-2xl focus-visible:outline-offset-[-4px]"
        style={{ outlineColor: card.color }}
      />
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

  /*
   * Which category's document is open, and the point the sheet grows out of.
   *
   * `origin` is set ONLY when a card is pressed and is deliberately not cleared on close: the
   * sheet's exit shrinks back towards it, so it has to outlive the close by one animation. It is
   * also not updated when the reader's pager changes category — the sheet is already open and
   * has not moved, and re-pointing it would make the exit retreat into a card the user never
   * pressed. `ScopeModal` records the matching half of this.
   */
  const [open, setOpen] = useState<number | null>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  /* stable identities so the six cards do not all re-render when one opens */
  const onOpen = useCallback((i: number, at: { x: number; y: number }) => {
    setOrigin(at);
    setOpen(i);
  }, []);
  const onClose = useCallback(() => {
    setOpen(null);
  }, []);

  return (
    <section id="scope" className="shell sec-scope relative">
      {/* Header-to-cards: Figma's Content Container sits at y 239 under a 199-tall header
          block on the 1440 frame (`708:490`) and at y 231 under a header + CTA ending at 207
          on the 402 one (`1190:973`) — 40 and 24. It was a flat `gap-10`.

          Ramps derived by `ramp()` are set as inline styles, not as Tailwind arbitrary
          values: the class scanner only sees literal source text, so a class name built from
          a template literal would compile to nothing. */}
      <div
        className="relative z-10 mx-auto flex max-w-[1200px] flex-col"
        style={{ gap: ramp(24, 40) }}
      >
        <div ref={headRef} className={`flex flex-col gap-[calc(12px_+_8*var(--fl))] ${headCls}`}>
          <p className="fl-eyebrow leading-[1.5] font-medium text-brand-yellow">01</p>
          {/* the pill is centred against the title + intro pair, not against the row's top.
              The pill goes beside the intro at `lg` and not at `md`: it is 317 wide at 1024
              (it holds one unbreakable line), so at 768 the intro would be left with 335 of
              the 652 column for a 30px heading and a 96-character paragraph — five lines in
              half a row. Figma's own phone frame stacks them (`1190:969` sits under the
              header block), and 1024 is the first width where 544 + 317 reads as the 1440
              row's 875 + 325. */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-0">
            {/* Title-to-intro: `708:483` stacks its Title (h67) and Description (y71) 4 apart
                at 1440, and `1190:965` stacks the same pair 12 apart on the phone (Title y42
                h39, Description y93) — the phone header is a flat 3-child stack on a uniform
                12. It was `8 - 4`, an invented narrow anchor. Lands on 4.000 at `--fl` = 1. */}
            <div className="flex flex-col gap-[calc(12.208px_-_8.208*var(--fl))] lg:flex-1">
              <h2 className="fl-section leading-[1.4] font-semibold">ขอบเขตเนื้อหา</h2>
              <p className="fl-lead leading-[1.5] font-light">{SCOPE_INTRO}</p>
            </div>
            {/*
             * LABEL IS `ดาวน์โหลด`, NOT Figma's `ดาวน์โหลดฉบับเต็ม (PDF)` (`708:489` / `1190:972`).
             * A deliberate departure, asked for on 2026-08-16 — and it has now been reverted once
             * by a Figma sweep that read the difference as a defect, so this note exists to stop
             * that happening a third time. If the shorter label is ever reconsidered, it is the
             * user's call, not a parity fix.
             */}
            <a
              href="/files/BH26 - ขอบเขตเนื้อหาที่ใช้ในการแข่งขัน.pdf"
              download
              /* `rounded-[100px]` is Figma's on both frames (`1190:969`, and `708:486` is a
                 325x60 pill), so it is flat rather than a ramp.
                 `py` was `12 + 4`: `1190:969` sets `py-[10px]` (a 42-tall pill around a
                 22-tall 16px line), not 12, while `708:486` is 60 tall around a 28-tall line
                 = 16. The ramp below is 10.000 at 402 and exactly 16.000 at `--fl` = 1. */
              /*
               * Hover is a DARKENING plus a lift, never a fade.
               *
               * It was `transition-opacity hover:opacity-90`, and dimming is the wrong gesture
               * for a filled control on a light page: reducing a red pill's alpha lets the cream
               * band read through it, so the button appears to recede at the moment the pointer
               * arrives. `#b14f39` is brand red at 92% luminance — the same value `.hero-cta`
               * uses in liquid.css, so the site has one hover colour for its filled buttons.
               *
               * The 1px lift and the press below it are the pair: the pill rises to meet the
               * pointer and drops under the click. `.mm-press` already times `background-color`
               * at `--mm-fast` and owns `scale` for the press, so only the lift's own `translate`
               * is declared here — and as `translate`, never `transform`, because `.mm-press`
               * is animating `scale` on the same element and the shorthand would clobber it.
               *
               * `hover:hover and pointer:fine` gates the movement: on a touch screen `:hover`
               * sticks after a tap, which would leave the pill lifted. The colour is left
               * ungated and outside the motion guard — paint is the affordance this file keeps
               * under `prefers-reduced-motion`, and movement is what it drops.
               */
              className="mm-press mm-pdf-cta flex shrink-0 items-center gap-[calc(12px_+_8*var(--fl))] self-start rounded-[100px] bg-brand-red py-[calc(9.844px_+_6.156*var(--fl))] pr-[calc(24px_+_12*var(--fl))] pl-[calc(16px_+_8*var(--fl))] text-white lg:self-auto"
            >
              {/* a download arrow leans the way it points on hover.
                  The glyph box was a flat-floored `26 + 8` — 26 at 375 against the 20 the
                  phone frame gives it (`1190:970`, a 20x20 arrow in a 42-tall pill), which on
                  a 375 screen was the widest thing in a pill that has to stay on one line.
                  The 1440 end is left at the verified 34 rather than moved to Figma's 28
                  (`708:487`), because desktop is the reference here. */}
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
              {/* `fl-body` (15 → 19) was a rank short of the phone anchor: `1190:972` sets this
                  label at 16px/1.4 (a 174x22 box), and 15.101 at 402 measured 163.4 — a 237
                  pill where the frame draws 246. The ramp below is 16.000 at 402 and lands on
                  19.000 at `--fl` = 1, i.e. exactly the `fl-body` ceiling the ladder had here,
                  so the 1440 pill is unchanged (24 + 34 + 20 + 205.58 + 36 = 319.58 as before).
                  It is spelled out rather than promoted to `fl-lead`, whose 21 ceiling would
                  have moved desktop. Measured against the font: at 16/700 the label is 173.12,
                  so the phone pill comes to 16.20 + 12.20 + 20.03 + 173.12 + 24.30 = 245.85
                  against Figma's 246. Desktop's own 20px (`708:489`) is deliberately NOT the
                  ceiling — the type ladder in index.css is calibrated against /register at
                  1440 and owns that end. */}
              {/* Restored 2026-08-16. `93ef2b2` (the six-category rewrite) truncated this to
                  "ดาวน์โหลด" as collateral — the comment above it, which that commit did not
                  touch, still sizes the pill for the full string, and both Figma anchors carry
                  it: `708:489` is a 217x28 label at 20/700 and `1190:972` a 174x22 one at
                  16/700. 217 x 16/20 = 173.6 against that 174, so the two agree and the 173.12
                  the note measures is this string, not the short one. The short label belongs
                  to the MODAL's header row (`708:2250`, ScopeModal.tsx) and only there.
                  `whitespace-nowrap` keeps it on the one line the pill is built for. */}
              <span className="leading-[1.4] font-bold whitespace-nowrap text-[calc(15.922px_+_3.078*var(--fl))]">
                ดาวน์โหลด
              </span>
            </a>
          </div>
        </div>

        {/*
         * Column count, decided rather than inherited. Card widths, content = viewport −
         * 2·`--fl-gutter` and gap = `24 + 16·--fl`:
         *
         *   375 one-up   332   ·   768 two-up  311   ·  1023 two-up  413
         *  1024 three-up 264   ·  1180 three-up 305  ·  1440 three-up 373.33
         *
         * Three-up from `lg` keeps Figma's composition (`708:490` is a row of three) at every
         * width that can hold it, and two-up spans 311–413 — i.e. it straddles the 373 the art
         * is drawn for, which is why the 2-over-1 exists at all. The art no longer cares
         * either way: ScopeCardArt scales by the card's own width, so 264 at 1024 is a 71%
         * copy of the 1440 card rather than its middle third.
         */}
        <div className="grid gap-[calc(24px_+_16*var(--fl))] md:grid-cols-2 lg:grid-cols-3">
          {SCOPE_CARDS.map((card, i) => (
            <ScopeCard key={SCOPE_CATEGORIES[i].n} card={card} i={i} onOpen={onOpen} />
          ))}
        </div>
      </div>

      {/*
       * The reader. Mounted here rather than at the page root because it belongs to this
       * section's cards, and it renders `null` until one of them is pressed — so the six
       * documents are not in the DOM on a page load that never opens one.
       *
       * It is INSIDE the section but its scrim is `position: fixed`, so it escapes this
       * section's stacking context to cover the viewport. The section itself is only
       * `relative`, with no transform or filter, so there is nothing here to trap it.
       */}
      <ScopeModal index={open} origin={origin} onSelect={setOpen} onClose={onClose} />
    </section>
  );
}
