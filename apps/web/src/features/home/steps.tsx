import { useReveal } from "@/hooks/use-reveal";
import { DOCUMENT_GROUPS, STEP_CARDS } from "./data/home-data";
import SectionHeader from "./section-header";

const teamPhoto = "/assets/figma/522303cab6b008daf26c3f0e8e3f2ec214a0c0cf.png";
const advisorPhoto = "/assets/figma/2a36441d02ccfe195207a9ad27345494771cc3b6.png";
const documentsPhoto = "/assets/figma/09f5ceefe923ad7cfc2733544959a0be9389fc6d.png";

/**
 * Each card's illustration is a fixed-size plate with its photos pinned in px.
 * Keeping the plate's aspect ratio and pinning in percentages means the arrangement
 * scales as one instead of the photos sliding out of the card.
 */
function pinner(cw: number, ch: number) {
  return (x: number, y: number, w: number, h: number) => ({
    height: `${(h / ch) * 100}%`,
    left: `${(x / cw) * 100}%`,
    top: `${(y / ch) * 100}%`,
    width: `${(w / cw) * 100}%`,
  });
}

/**
 * There are now TWO plates per card, and they are different compositions rather than one
 * composition at two sizes: the 1440 plate is 540x200 with a 224-wide centre photo, the
 * phone plate (1190:632 / 1190:640 / 1190:646) is 322x160 — 306 on the documents card,
 * which insets 24 rather than 16 — with a 140-wide one. Both sets are published on the
 * `<img>` as custom properties so a single element can carry both and let `md:` choose;
 * pinning one of them inline would have made it unbeatable by the other.
 *
 * The choice is made at `md` and not at `lg`, which is where it used to sit. `md` is where
 * Figma's two-up row starts to exist (1190:630 stacks the same three cards below it), so it
 * is also where the card stops being the phone's full-width block and becomes the desktop
 * row's half-column: 318 wide at 768 against desktop's 588, i.e. 0.54 of it where the
 * viewport is 0.533 of 1440. The plate that box wants is the 540x200 one. Left at `lg` the
 * 768-1023 band drew the phone's taller 322x160 plate with the phone's tighter photo fan and
 * then re-pinned all four photos at 1024.
 */
const pinDesk = pinner(540, 200);
const pinDeskTall = pinner(540, 290);
const pinPhone = pinner(322, 160);
const pinPhoneWide = pinner(306, 160);

type Pin = ReturnType<typeof pinDesk>;

/** `--p*` is the phone box, `--d*` the 1440 one; `PIN` below reads them. */
function pins(phone: Pin, desk: Pin, rotate = 0) {
  return {
    "--dh": desk.height,
    "--dl": desk.left,
    "--dt": desk.top,
    "--dw": desk.width,
    "--ph": phone.height,
    "--pl": phone.left,
    "--pt": phone.top,
    "--pw": phone.width,
    transform: `rotate(${rotate}deg)`,
  } as React.CSSProperties;
}

const PIN =
  "absolute object-cover left-[var(--pl)] top-[var(--pt)] w-[var(--pw)] h-[var(--ph)] " +
  "md:left-[var(--dl)] md:top-[var(--dt)] md:w-[var(--dw)] md:h-[var(--dh)]";

/**
 * The plate itself: 322x160 on the phone, 540x200 (540x290 for documents) from `md` up.
 *
 * `mm-fan` is the plate's arrival, driven by the card's own reveal rather than by anything in
 * this file: the two tilted team photos swing out from a narrower fan and the single-photo
 * plates scale up, 120ms behind the card, on the reveal's own curve. The rule reads the photos
 * by paint order (`:nth-child`), which is why the pin tables below must keep listing the
 * upright centre photo first — see `.mm-fan` in styles/micro-motion.css for the full spec and
 * for why it animates `rotate`/`scale` and never `transform`, which `pins()` already owns.
 */
const PLATE = "mm-fan relative mx-auto aspect-[322/160] w-full max-w-[540px] md:aspect-[540/200]";
const PLATE_TALL =
  "mm-fan relative mx-auto aspect-[306/160] w-full max-w-[540px] md:aspect-[540/290]";

/**
 * Three student photos fanned out. Figma paints the upright centre one first, so the two
 * tilted ones overlap it rather than the other way round.
 *
 * Figma reports rotated bounding boxes; the phone boxes below are their centres taken back
 * to the unrotated box, which is what CSS positions before it transforms —
 * 1190:634 bbox (28, 29.8) 125.67x120.46 @ -27.38deg -> box (42.141, 47.42) 97.388x85.215.
 */
const TEAM_PHOTOS = [
  { style: pins(pinPhone(90.89, 10, 140, 123), pinDesk(158, 0, 224, 196)) },
  {
    style: pins(pinPhone(42.141, 47.42, 97.388, 85.215), pinDesk(80, 60, 156, 136), -27.38),
  },
  {
    style: pins(pinPhone(182.33, 47.48, 97.388, 85.215), pinDesk(304, 60, 156, 136), 26.89),
  },
];

/** 1190:641 / 1190:647 centre a single 140 square in the plate. */
const ADVISOR_PHOTO = pins(pinPhone(91, 10, 140, 140), pinDesk(172, 4, 196, 196));
const DOCUMENTS_PHOTO = pins(pinPhoneWide(83, 10, 140, 140), pinDeskTall(140, 31, 259, 259));

/** One illustration plate per step card, in the order Figma stacks them. */
const ILLUSTRATIONS = [
  <div className={PLATE} key="team">
    {TEAM_PHOTOS.map((photo, i) => (
      <img alt="" aria-hidden className={PIN} key={i} src={teamPhoto} style={photo.style} />
    ))}
  </div>,
  <div className={PLATE} key="advisor">
    <img alt="" aria-hidden className={PIN} src={advisorPhoto} style={ADVISOR_PHOTO} />
  </div>,
];

/**
 * Figma gives these cards a 20px shadow — softer than the 40px `shadow-soft` elsewhere.
 *
 * 1190:631/639 inset the two step cards by 16 on the phone (24 at 1440), while 1190:645
 * insets the documents card by 24 at both ends — so the padding is no longer shared.
 */
/*
 * `rounded-3xl` (24) is FLAT, verified live 2026-08-06: `1190:631` and `708:200` are both
 * `rounded-[24px]`. Worth stating, because the sibling cards on this site do NOT agree — the
 * calendar's rows are 16 on the phone and 24 at 1440 (`1190:614` / `708:181`, hence the ramp
 * in calendar.tsx), the scope card and the past-event tile carry their own radii. There is no
 * one card radius to hoist; each is read.
 */
const CARD = "rounded-3xl bg-white shadow-soft";
const STEP_PAD = "p-[calc(16px_+_8*var(--fl))]";

/**
 * 1190:631 butts the text container straight onto the 160-tall plate — the phone card has no
 * gap there at all, where 1440 has 60. `max(0px, …)` is what lets the ramp reach 0 at 402 and
 * hold it below: a straight interpolation through (402, 0) and (1440, 60) is negative at 375.
 */
const PLATE_GAP = "gap-[max(0px,calc(-1.56px_+_61.56*var(--fl)))]";
/** 1190:637 — 24 on the phone, the ladder's 26 at 1440. */
const CARD_TITLE = "text-[calc(23.948px_+_2.052*var(--fl))]";
/** 1190:638 — 16 on the phone, 19 at 1440. The 15.1 the ladder gave at 402 cost the
 *  descriptions a line each, which is where 30 of the phone card's 362 went missing. */
const CARD_BODY = "text-[calc(15.922px_+_3.078*var(--fl))]";
/** 1190:652 — 18 on the phone, the ladder's 23 at 1440. */
const DOC_HEADING = "text-[calc(17.87px_+_5.13*var(--fl))]";
/** 12 between the three cards on the phone (1190:630), 24 at 1440. */
const STACK_GAP = "gap-[calc(12px_+_12*var(--fl))]";

const [ENTRANT_DOCS, ADVISOR_DOCS] = DOCUMENT_GROUPS;

function DocGroup({ heading, items }: (typeof DOCUMENT_GROUPS)[number]) {
  return (
    <div className="flex flex-col gap-4">
      <h4 className={`${DOC_HEADING} text-center leading-[1.5] font-medium`}>{heading}</h4>
      {/* 1190:653 hangs the bullets 24 in on the phone, 30 at 1440 */}
      <ul
        className={`${CARD_BODY} ms-[calc(24px_+_6*var(--fl))] flex list-disc flex-col leading-[1.5] font-light`}
      >
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One step card, revealing itself.
 *
 * The row used to be a `reveal-group`, and a group staggers its DIRECT children. The
 * grid's two children are the left column (which holds two cards) and the right article, so
 * the ladder read as two arrivals for three cards and the two left-hand cards came in as one
 * block. At 390 the second child measured 1.70 of the viewport at the frame it was told to
 * animate, a screen below the fold.
 *
 * Three reveals, one per card, with the ladder carried inline as `--reveal-delay` — spent
 * only on the reveal's opacity and transform, never as a `transition-delay` longhand that
 * would also postpone anything else the card animates (styles/reveal.css).
 */
function StepCard({ card, i }: { card: (typeof STEP_CARDS)[number]; i: number }) {
  const { ref: revealRef, cls: revealCls } = useReveal<HTMLElement>();
  const style: React.CSSProperties & { "--reveal-delay": string } = {
    "--reveal-delay": `${i * 70}ms`,
  };

  return (
    <article
      className={`flex flex-col h-full ${PLATE_GAP} ${CARD} ${STEP_PAD} ${revealCls}`}
      ref={revealRef}
      style={style}
    >
      {ILLUSTRATIONS[i]}
      <div className="flex flex-col items-center gap-4 text-center">
        <h3 className={`${CARD_TITLE} leading-[1.4] font-semibold`}>{card.title}</h3>
        <p className={`${CARD_BODY} leading-[1.5] font-light`}>{card.body}</p>
      </div>
    </article>
  );
}

export default function Steps() {
  const { ref: headRef, cls: headCls } = useReveal();
  const { ref: docsRef, cls: docsCls } = useReveal<HTMLElement>();
  const docsStyle: React.CSSProperties & { "--reveal-delay": string } = {
    "--reveal-delay": "140ms",
  };

  return (
    /*
     * Figma: the header sits flush at the section top — the run-up above it belongs to the
     * calendar's tail. 109 of tail here carries the row into the red prize band.
     *
     * ------------------------------------------------- the "02" that vanishes at 1440
     *
     * Known bug, NOT fixable from this file, measured at 1440 so the next reader does not have
     * to re-derive it:
     *
     *   - the "02" eyebrow's glyph box lands at page y 2540..2554.
     *   - `GARLIC_LEFT` (home-background.tsx) is pinned at Figma page y 2184.068 and is
     *     363.932 tall, so its yellow wave's bottom edge is at 2548.0.
     *   - that wave is `#D79A4E`, byte-for-byte `--color-brand-yellow`, which is the eyebrow's
     *     own colour (Figma 708:195 confirms #d79a4e). The top 8px of the digits are therefore
     *     drawn in the wave's colour on the wave and the number reads as half-eaten.
     *
     * It is not a stacking bug and cannot be fixed by raising one: the column below is already
     * `relative z-10` against a canvas that is `-z-10` inside the page wrapper's `isolate`, so
     * the number IS painted on top — it just has nothing to contrast with. Nor is it a colour
     * bug: Figma's own render of 708:39 has the garlic wave ending well clear of the heading,
     * with the header at y2588 to the wave's 2548 — 40px of cream between them.
     *
     * The live page is 48px short of that 2588, which is the whole of the defect. Fixing it by
     * padding this section is what a first pass would reach for and is wrong: the Prizes
     * content is currently 18.5px ABOVE its Figma y (live "03" at 3890, Figma 708:267 at
     * 3908.5) while the red band it sits on is canvas-anchored and would not move with it, so
     * +48 here buys a legible "02" at the price of dropping Prizes 30px off its own band.
     *
     * The fix belongs to the decoration, not to the rhythm: home-background.tsx GARLIC_LEFT.y
     * 2184.068 -> 2136.068. -48 puts the wave's bottom at 2500, restores Figma's exact 40px of
     * clearance above the live header, and reflows nothing — the calendar's tail is empty page
     * from ~2050 down to this header, so the group has the room to move up into.
     */
    <section className="shell sec-steps relative" id="steps">
      {/* 1190:626 opens 24 between the header and the first card, 40 at 1440 */}
      <div className="relative z-10 mx-auto flex max-w-[1200px] flex-col gap-[calc(24px_+_16*var(--fl))]">
        <div className={headCls} ref={headRef}>
          {/* `708:196` — shortened from ขั้นตอนสมัครเข้าแข่งขัน. The footer still links to this
              section by its own label, which lives in `FOOTER_GROUPS`. */}
          <SectionHeader number="02" title="ขั้นตอนการสมัคร" />
        </div>

        {/*
         * Figma splits the row 588 / 588 inside the 1200 column, 936 tall; below `md`
         * 1190:630 stacks the same three cards on a 12 gap in the same order.
         *
         * The 936 is Figma's height for the row and it is a FLOOR, not a size — the left
         * column centres two cards inside it and the documents card justifies between. As a
         * hard px from `lg` it was the one number in this section that did not come down with
         * the viewport: at 1024 it reserved 936 for a row whose content asks for ~700, opening
         * a quarter-screen of blank page inside the section. 65vw is 936/1440, so it is
         * Figma's own figure at 1440 and the same fraction of the stage below it; `min()`
         * freezes it at 936 above 1440, where the 1200 column and `--fl` are frozen too.
         */}
        <div
          className={`grid items-stretch md:min-h-[min(936px,65vw)] md:grid-cols-2 ${STACK_GAP}`}
        >
          <div className={`flex min-w-0 flex-col justify-center ${STACK_GAP}`}>
            {STEP_CARDS.map((card, i) => (
              <StepCard card={card} i={i} key={card.title} />
            ))}
          </div>

          <article
            className={`flex min-w-0 flex-col justify-between p-6 ${PLATE_GAP} ${CARD} ${docsCls}`}
            ref={docsRef}
            style={docsStyle}
          >
            <div className={PLATE_TALL}>
              <img
                alt=""
                aria-hidden
                className={PIN}
                src={documentsPhoto}
                style={DOCUMENTS_PHOTO}
              />
            </div>
            {/* the entrant list belongs to the heading — only the advisor block is 24 away */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <h3 className={`${CARD_TITLE} text-center leading-[1.4] font-semibold`}>
                  การเตรียมเอกสาร
                </h3>
                <DocGroup {...ENTRANT_DOCS} />
              </div>
              <DocGroup {...ADVISOR_DOCS} />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
