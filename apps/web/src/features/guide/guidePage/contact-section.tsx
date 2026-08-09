import ScrollEdgeEffect from "@/components/scroll-edge-effect";
import SectionHeader from "@/components/section-header";
import { ramp, rampV } from "@/components/scope-card-art";
import { CONTACT } from "../data/about-data";
import { SOCIAL_LINKS } from "../data/data";
import { useReveal } from "@/hooks/use-reveal";

const A = "/assets/figma/";

/**
 * Both social glyphs are multi-layer Figma components, so each layer keeps the inset
 * Figma gives it inside a fixed box rather than being flattened into one file.
 *
 * -------------------------------------------------------- the badge, solved through 402
 *
 * `size` is a two-anchor `ramp()` in px, and it used to be a percentage of the icon box —
 * 65% for Facebook, 60% for Instagram, read as "52 of the 1440 frame's 80 box". A fraction
 * is the right instinct and the wrong number, because Figma does not scale these two glyphs
 * by the same factor as the box: the PAD is what it holds roughly constant.
 *
 *              box   glyph   pad    fraction
 *   402  fb     40    24      8      60%     `1190:938` / `1190:939`
 *        ig     40    24      8      60%     `1190:942` / `1190:943`
 *  1440  fb     80    52     14      65%     `708:454`  / `708:455`
 *        ig     80    48     16      60%     `708:458`  / `708:459`
 *
 * So Facebook's fraction is NOT one number (60% at 402, 65% at 1440) — 65% of the phone's
 * 40 box is 26, two px over Figma's 24 — and Instagram's happens to be. Both are written as
 * px ramps through their own two anchors instead, which is also proof against the failure
 * the percentages had: a percentage only resolves against the box if every ancestor keeps a
 * definite size, and each of these badges is a fixed box holding absolutely-inset layers.
 * `ramp(24, 52)` and `ramp(24, 48)` are 52.000 and 48.000 at `--fl` = 1 — 1440 unchanged.
 */
/*
 * The two rows' destinations are the SAME two URLs the footer and the team dashboard use, out
 * of `SOCIAL_LINKS` in data.ts — they were both `href="#"`, i.e. the "ติดต่อทีมงาน" section's
 * only two controls did nothing but jump to the top of the page. Figma draws them as the
 * channels' own names ("BangMod Hackathon" is the Facebook page, "bangmodhack.kmutt" the
 * Instagram handle) and `SOCIAL_LINKS` is in that order, so the pairing is by index rather
 * than by a second copy of the URLs. `target="_blank"` + `rel="noopener noreferrer"` matches
 * what Footer.tsx and StatusPanel.tsx already do with the same two links.
 */
const CHANNELS = [
  {
    href: SOCIAL_LINKS[0].href,
    label: "BangMod Hackathon",
    layers: [
      { inset: "0 0 0.37% 0", src: `${A}511e988ab2a468e6fa802c0f8d0d9143f652e6d9.svg` },
      { inset: "18.51% 26.8% 0 27.61%", src: `${A}e093d005737ba6080ea1ab54fad5a8e3e034d839.svg` },
    ],
    /** 24 in the 40 box at 402 (`1190:939`), 52 in the 80 one at 1440 (`708:455`) */
    size: ramp(24, 52),
  },
  {
    href: SOCIAL_LINKS[1].href,
    label: "bangmodhack.kmutt",
    layers: [
      { inset: "0 0.06% 0.02% 0", src: `${A}02ba547447d5d88ca1fc4cd6046c9cad48297c45.svg` },
      { inset: "24.32%", src: `${A}bc01640f62f5ba96f4759e7650ca010ce85028e6.svg` },
      {
        inset: "17.3% 17.3% 70.7% 70.7%",
        src: `${A}f69c5d76e20f72bb57c5d611c23783503d4540b4.svg`,
      },
    ],
    /** 24 in the 40 box at 402 (`1190:943`), 48 in the same 80 box at 1440 (`708:459`) —
     *  a 16 pad rather than Facebook's 14, which is why it is its own ramp */
    size: ramp(24, 48),
  },
];

/**
 * Figma node 708:444 "Section / Hero Banner" — page y 3539, 1024 tall, 120 side padding,
 * its 923-tall content vertically centred (hence 50.5 top). The trailing pad is that
 * 50.5 plus the 325 Figma leaves before the footer at page y 4888.
 */
export default function ContactSection() {
  const { ref: headRef, cls: headCls } = useReveal();
  const { ref: channelsRef, cls: channelsCls } = useReveal({ group: true });
  const { ref: mapRef, cls: mapCls } = useReveal();

  return (
    /*
     * The section's own vertical pads, on `--flv` — the ramp index.css reserves for exactly
     * this and freezes at 1024, so the `lg` figures below are unchanged from 1024 up and
     * desktop does not move. They used to be `py-20` with a `lg:` pair, i.e. 80/80 everywhere
     * under 1024 and then a 124/296px STEP at it, and both halves of that were wrong:
     *
     * - top. Figma's 402 frame puts 159.65 between the question grid's bottom (`1190:1338`
     *   ends at 3127.35) and this section's content (`1190:930` at 3287); the 1440 frame puts
     *   203.5 between `708:702`'s box end (3386) and `708:445` (3589.5). The FAQ section
     *   already contributes `sec-faq`'s own bottom pad, so the figure here is the remainder —
     *   and that pad is now 0 at 402, because the phone FAQ section has no block padding at
     *   all (its mascot sits at the section's y0 and its grid ends on the bottom edge). So the
     *   low anchor is the whole 159.65. It was 77.79 = 159.65 − 81.86 while `sec-faq` still
     *   carried the invented 80px floor at the narrow end; the two move together, and this
     *   line is the coupling index.css's `sec-faq` comment points at.
     * - bottom. This is not rhythm, it is the tomato-and-pot field — `AboutDecor` hangs that
     *   group off the page's bottom edge, scaled by 100vw/1440, so it needs 373·(vw/1440) of
     *   clearance: 97 at 375, 199 at 768, 265 at 1023. A flat 80 meant the pots sat on the
     *   address plate at every width below `lg`. Figma's two frames give the field directly:
     *   124 at 402 (`1190:930` ends at 3868, the footer `1190:1373` starts at 3992) and 375.5
     *   at 1440 (4512.5 to 4888). Interpolated that is 271.9 at 768 and 375.1 at 1023 — the
     *   art clears at every width by construction.
     */
    <section
      id="contact"
      className="shell relative"
      style={{ paddingBottom: rampV(124, 375.5), paddingTop: rampV(159.65, 203.5) }}
    >
      {/*
       * No `overflow-hidden rounded-3xl` here. It was clipping the section eyebrow, whose line
       * box starts flush with this wrapper's top edge, and it was never needed: the only round
       * corners in the section are the map's, and the map carries its own clip.
       */}
      {/* Block rhythm: 40 at 1440 (`708:446`/`708:451`/`708:461` at y 0, 203, 323 — a 163
          header, then 40, an 80 row, then 40) and 24 at 402 (`1190:932`/`1190:936`/`1190:945`
          at y 0, 165, 281 — 141, 24, 92, 24). It was a flat `gap-10`. */}
      <div
        className="relative z-10 mx-auto flex max-w-[1200px] flex-col"
        style={{ gap: ramp(24, 40) }}
      >
        <div ref={headRef} className={headCls}>
          <SectionHeader number="04" title={CONTACT.title} description={CONTACT.description} />
        </div>

        {/* Two channels side by side at 1440 (`708:453`/`708:457`, 580 each, 40 apart) and
            stacked 12 apart on the phone (`1190:937` at y 0, `1190:941` at y 52 over 40-tall
            rows) — one gap token covers both, since the grid is one column below `md`. */}
        <div
          ref={channelsRef}
          className={`grid md:grid-cols-2 ${channelsCls}`}
          style={{ gap: ramp(12, 40) }}
        >
          {CHANNELS.map((channel) => (
            <a
              key={channel.label}
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
              /*
               * A colour tint rather than an opacity dim, which is the same hover the footer's
               * social rows have — and the only one available here. These two links are
               * `reveal-group` children, so `opacity` belongs to the reveal: the (unlayered)
               * `.reveal.is-visible { opacity: 1 }` in index.css beats a layered Tailwind
               * `hover:opacity-80` outright, which is why the dim measured `opacity: 1` on
               * hover both before and after this round. Claiming opacity back would mean
               * either an `!important` or a 600ms hover fade, since the reveal's own opacity
               * transition is 600ms; `color` is in the same transition list at `--mm-fast` and
               * costs nothing.
               */
              className="mm-link mm-press flex items-center hover:text-brand-red"
              /* label offset: 16 at 1440 (`708:456` at x 96 past an 80 box), 4 at 402
                 (`1190:940` at x 44 past a 40 box) */
              style={{ gap: ramp(4, 16) }}
            >
              {/* Figma pads each glyph inside an 80 box (`708:454`), 40 on the phone
                  (`1190:938`), so the label always lands one pad past it.
                  `rounded-xl` (12) is FLAT: `1190:938` and `708:454` are both
                  `rounded-[12px]`, i.e. the badge's corner is the one radius in this section
                  Figma does not scale with the box. */}
              <span
                className="mm-icon-pop flex shrink-0 items-center justify-center rounded-xl"
                style={{ height: ramp(40, 80), width: ramp(40, 80) }}
              >
                <span
                  className="relative block shrink-0"
                  style={{ height: channel.size, width: channel.size }}
                >
                  {/*
                   * Each layer is a SPAN carrying Figma's inset, with the image filling it —
                   * not an `<img>` carrying the inset directly. That distinction is the whole
                   * bug this replaced:
                   *
                   * An `<img>` is a REPLACED element, and for an absolutely positioned replaced
                   * box with `width: auto`, CSS resolves the width to the image's INTRINSIC
                   * width and then discards the over-constrained `right` (CSS 2.1 10.3.7). So
                   * `absolute` + four insets does not size an image at all — it positions its
                   * top-left and lets it render native. These two SVGs are natively 52 and 48,
                   * which is exactly what they measured inside a 24px badge on a phone: the
                   * marks spilled over the labels beside them, which is what the user reported.
                   * Desktop looked right only because 52 and 48 happen to be the 1440 sizes.
                   *
                   * A span is non-replaced, so there `width: auto` with both insets set fills
                   * the box — the insets become the geometry Figma drew. The image then takes
                   * `size-full` of that, and the badge's own `width`/`height` ramp is what
                   * actually scales the mark.
                   */}
                  {channel.layers.map((layer) => (
                    <span key={layer.src} className="absolute block" style={{ inset: layer.inset }}>
                      <img src={layer.src} alt="" aria-hidden className="block size-full" />
                    </span>
                  ))}
                </span>
              </span>
              {/* `1190:940` / `1190:944` are 22 tall over one line — 22/1.4 = 15.7, i.e. 16 @402
                  against `fl-title`'s 19.07 there. Ramped to the same 26.000 at `--fl` = 1. */}
              <span className="leading-[1.4] font-medium" style={{ fontSize: ramp(16, 26) }}>
                {channel.label}
              </span>
            </a>
          ))}
        </div>

        {/*
         * Figma lays the address OVER the bottom of the map on a dark progressive blur — which
         * is why the copy is white — and it does so on BOTH frames, so the overlay is now
         * unconditional. It used to stack underneath on an opaque ink plate below `lg`, on the
         * reading that the overlay would crowd a short map; that cost the phone 147px of extra
         * section height and a composition the design does not have.
         *
         * The reason the overlay was unsafe below `lg` is real, though, and it is a
         * PROPORTION, not a crowding problem. Both frames, measured:
         *
         *          map    tint band          plate (bottom-anchored)   plate / band
         *    402   300    187  `1190:946`    151  `1190:947`           0.807
         *   1440   600    344  `708:462`     164  `708:463`            0.477
         *
         * The plate is a much deeper share of a much shallower band on the phone. So
         * `tintReach={0.45}` — which is exactly right at 1440, where it covers the bottom 155
         * of 344 against a 164 plate — only reaches 84px up the phone's 187 band while the
         * plate is 151 tall, leaving the pin and the first line of white type sitting on bare
         * photograph. `tintReach` is a plain number the component bakes into gradient stops, so
         * it cannot itself be a ramp without changing that component.
         *
         * The scrim below is the complement instead: an ink wash on the plate whose ALPHA ramps
         * to zero by 1440, so it makes up the tint the band does not reach at the narrow end
         * and contributes literally nothing at the wide end. Continuous — no step at any
         * breakpoint, which is the property this whole overlay exists to preserve — and the
         * 1440 render is byte-identical to before, since alpha 0 is `transparent`.
         */}
        <div ref={mapRef} className={`relative ${mapCls}`}>
          {/* 600 at 1440 (`708:461`) and 300 at 402 (`1190:945`), one ramp instead of
              `300 / sm:420 / lg:600` — three frozen sizes with a 180px step at 1024, which
              is the one place on this page the photograph changed size faster than the
              column it sits in. Interpolated: 406 at 768, 480 at 1024. */}
          {/* The map's corners RAMP: `1190:945` is `rounded-[16px]` and `708:461` is
              `rounded-[24px]`. As a flat `rounded-3xl` the 354-wide phone map wore the
              1200-wide one's corner. 15.792 + 8.208 is 16.000 at 402 and exactly 24.000 at
              `--fl` = 1. The blur plate below repeats it on its bottom two corners, since it
              is the thing that actually paints them. */}
          <div
            className="relative overflow-hidden rounded-[calc(15.792px_+_8.208*var(--fl))]"
            style={{ height: ramp(300, 600) }}
          >
            <img
              src={`${A}86eccf9a63e4eae8dfc182a99fd6df1e5dd1304b.png`}
              alt="แผนที่ที่ตั้งภาควิชาวิศวกรรมคอมพิวเตอร์ มจธ."
              className="absolute top-[-30.29%] left-[-14.86%] h-[168.63%] w-[129.72%] max-w-none"
            />
            {/*
             * The band is a fraction of the map, not Figma's flat 344: `57.33%` IS 344 on the
             * 600-tall lg map, and on the 300-tall phone map it is 172 rather than 344 — which
             * as a literal 344 overhung the photograph by 44px, putting the solid end of the
             * ramp *below* the image and fogging the whole thing instead of capping it.
             * Below lg the address is not over the map at all, so there the band only has to
             * hand the photo over to the ink plate underneath it, and 40% does that.
             * Both ramps still finish well before the top of the band: run full height they
             * cover the artwork, which is the one thing this overlay is not meant to do.
             */}
            {/* 344 of the 600 map at 1440 (`708:462`) and 187 of the 300 one at 402
                (`1190:946`) — the percentages this carried (40% / lg:57.33%) came to two
                numbers but stepped between them at 1024, and a progressive blur whose depth
                jumps in one frame of a resize is the artefact that component exists to avoid.
                The 187 replaces a 120 that was read while the phone plate still stacked below
                the map: with the plate back over it, the band is the one Figma draws under the
                plate, and it is 62.33% of the phone map against 57.33% of the desktop one. The
                height is on a wrapper because ScrollEdgeEffect takes no `style`; it fills it,
                and keeps the rounded corner it has to clip its own oversized layers to. */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0"
              style={{ height: ramp(187, 344) }}
            >
              {/*
               * `tintReach` and `blurReach` are BOTH 1, and that is the fix for the address copy
               * reading as mush over the photograph.
               *
               * They are fractions of the BAND, and they used to be 0.45 and 0.6 — a second
               * restriction stacked on top of a wrapper that is already exactly Figma's band
               * (`ramp(187, 344)` = `1190:946` / `708:462`). Tinting only the bottom 45% of a
               * 187-tall band leaves its top 103px clear, and the plate is the bottom 151 of that
               * same band — so the title and the pin sat on bare, bright photograph with no tint
               * behind them at all. White type on a sunlit building is what the user saw.
               *
               * Figma's own exported mask is a two-stop linear gradient spanning the WHOLE band,
               * so 1 is not a legibility hack, it is the spec: the ramp runs the band's full
               * height and the plate is inside it by construction at both anchors (bottom 151 of
               * 187 on the phone, bottom 164 of 344 at 1440).
               *
               * This DOES change 1440 — the tint now reaches the band's top edge instead of
               * stopping at 155 of 344 — and that is a correction toward the design, not a
               * regression. It is also what let the masked scrim below be deleted outright.
               */}
              {/*
               * `tintReach` and `blurReach` are DIFFERENT numbers, and conflating them was an
               * over-correction I made and have now undone.
               *
               * Both were 0.45 / 0.6 originally. The tint at 0.45 was genuinely wrong — it
               * covered only the bottom 45% of a 187-tall band while the address plate is the
               * bottom 151 of that same band, so the title and the pin sat on bare sunlit
               * photograph and the copy read as mush. Raising the TINT to 1 fixed that.
               *
               * Raising the BLUR to 1 along with it did not fix anything and broke the picture:
               * at 1 the softening runs the band's full 344, i.e. the bottom 57% of the 600 map,
               * so more than half the building dissolved. Figma keeps the photograph sharp and
               * only breathes at its lower edge. 0.6 of the band is 206px — about 34% of the map
               * — which is what the frame shows.
               *
               * The two are independent on purpose: the tint's job is legibility (it must reach
               * the whole plate), the blur's job is to soften an edge (it must not eat the
               * subject). One number could never serve both.
               */}
              <ScrollEdgeEffect
                tone="dark"
                flip
                maskAlpha={0.9}
                tintReach={1}
                blurReach={0.6}
                className="absolute inset-0 rounded-b-[calc(15.792px_+_8.208*var(--fl))]"
              />
            </div>
          </div>

          {/*
           * `items-start` below `md`, `items-center` from there up, and that is Figma's own
           * pair rather than a tweak: `1190:947` is `items-start` — the 32 pin sits at the
           * plate's own 16 pad, level with the first line of a 119-tall copy block — while
           * `708:463` is `items-center`, which is what puts its 80 box at y42 of a 164 plate
           * against copy that starts at 40. Centred at 402 the pin dropped to y59.5, i.e. 43
           * below where the design has it, beside the second line of the address.
           *
           * ---------------------------------------------------------- there is no scrim now
           *
           * A `.contact-plate-scrim` ink wash used to sit here, and it is GONE. It only ever
           * existed to make up the tint that `tintReach={0.45}` was withholding, and it went
           * through two shapes trying to be invisible while doing so: a flat background on this
           * box, which drew a hard dark line straight across the photograph at the plate's top
           * edge, and then a masked child span, which faded out by 45% of the plate — i.e.
           * exactly across the title, which is the "ตัวอักษรแปลก ๆ" the user reported.
           *
           * Setting the band's own reach to 1, which is what Figma's exported mask actually
           * does, removes the need for any of it: the tint is a single continuous ramp over the
           * whole band and the plate sits inside it. One layer instead of two, no hard edge, no
           * mask to misjudge, and Figma draws no plate fill either. The matching
           * `.contact-plate-scrim` rules and their `@supports not` fallback are deleted from
           * index.css.
           */}
          <div
            className="absolute inset-x-0 -bottom-[0.5px] flex items-start gap-4 text-white md:items-center "
            /* 40 at 1440 (`708:464` inset 40 in the plate), 16 at 402 (`1190:948`) */
            style={{ padding: ramp(16, 40) }}
          >
            {/* Figma pads the pin to 56 inside an 80 box (`708:464`), 24 inside a 32 one on
                the phone (`1190:948`), then insets the vector again.
                `rounded-xl` (12) is flat, as on the two channel badges: `1190:948` and
                `708:464` are both `rounded-[12px]`. */}
            <span
              className="flex shrink-0 items-center justify-center rounded-xl"
              style={{ height: ramp(32, 80), width: ramp(32, 80) }}
            >
              {/* The pin, on its own two anchors rather than on one fraction. 56 of the 1440
                  frame's 80 box is 70%, but the phone frame pads a 32 box by 4 rather than by
                  70%'s 4.8 — `1190:949` is 24 in the 32 box, i.e. 75%. So a flat 70% drew the
                  glyph at 22.4 on the phone, 1.6 under Figma, and the address plate read as a
                  big pin beside small copy because the BOX was right and the glyph was not.
                  `ramp(24, 56)` is 24.000 at 402 and exactly 56.000 at `--fl` = 1. */}
              <span
                className="relative block"
                style={{ height: ramp(24, 56), width: ramp(24, 56) }}
              >
                {/*
                 * The inset is on a SPAN and the image fills it — the fifth instance of this bug
                 * in this file's page, and the one the user reported as a pin big enough to
                 * collide with the address title.
                 *
                 * `1729b3bf….svg` declares `width="41.8904" height="46.9954"`, so as an
                 * absolutely-positioned REPLACED box with `width: auto` it resolved to that
                 * intrinsic 41.89 x 47.00 and the over-constrained `right`/`bottom` were simply
                 * discarded (CSS 2.1 §10.3.7). Inside the phone's 32 badge that is a 47-tall pin
                 * — 15px taller than the box that is supposed to contain it — and `max-w-none`
                 * had removed even the preflight `max-width: 100%` that would have capped the
                 * width. The two channel badges above already carry the span form and say so;
                 * this one was missed.
                 *
                 * A span is non-replaced, so `width: auto` with both insets set fills the box and
                 * Figma's four percentages become geometry again. At 1440 the badge is 56, of
                 * which the glyph's insets leave 41.86 x 47.00 — which is why desktop looked
                 * correct: the intrinsic size and the intended size happened to coincide there.
                 */}
                <span className="absolute block inset-[8.39%_12.59%_7.69%_12.6%]">
                  <img
                    src={`${A}1729b3bffbd91e5facf50704cb0d869d52659e47.svg`}
                    alt=""
                    aria-hidden
                    className="block size-full"
                  />
                </span>
              </span>
            </span>
            {/*
             * The plate's two ranks come off `1190:951`'s own two text nodes rather than off the
             * ladder, which at 402 sets both a size too large — this is the "big pin beside big
             * copy" half of what the address plate was reported for. Figma states each node's
             * box, and a single style resolves it:
             *
             *   place    `1190:952` 274 x 50 over two lines at 1.4  ->  25.0 / 1.4 = 18 @402
             *   address  `1190:953` 274 x 63 over three at 1.5      ->  21.0 / 1.5 = 14 @402
             *
             * Ramped to `fl-title`'s and `fl-lead`'s own ceilings, so `--fl` = 1 gives exactly
             * 26.000 and 21.000 and the 1440 plate does not move: at 402 they were 19.07 and
             * 16.02, i.e. a whole rank and two ranks over the frame.
             */}
            <div className="flex flex-1 flex-col gap-1.5">
              <p className="leading-[1.4] font-medium" style={{ fontSize: ramp(18, 26) }}>
                {CONTACT.place}
              </p>
              <p className="leading-[1.5] font-light" style={{ fontSize: ramp(14, 21) }}>
                {CONTACT.address}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
