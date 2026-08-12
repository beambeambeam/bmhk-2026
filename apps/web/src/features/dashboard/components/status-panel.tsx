import { useId } from "react";
import { SOCIAL_LINKS } from "@/data";
import { DISCORD_CARD, getStatusSteps, TEAM } from "../team-data";
import type { Person, StatusStep, StepTone, TeamStatus } from "../team-data";

/**
 * ── Size ramps, both anchors measured ──────────────────────────────────────────────────────
 * Almost nothing in this panel ramps: `1297:1392` … `1297:2275` on the 402 dashboard are the
 * same numbers as `708:2651` … `708:2744` at 1440 — 12 radius, 10 padding, a 12 gap, a 32
 * badge, 14/500 titles, 12/400 dates, 14/400 labels, an 8 row gap, 24 social marks. The one
 * exception is the card's own subtitle.
 *
 * `อัปเดตล่าสุดเมื่อ …` is 12/400 lh18.1 on the phone (`1297:1431`) against 14/400 lh21.2 at
 * 1440 (`708:2650`). `fl-14` held 14 flat, so the phone read two ranks too large next to its
 * own 12 date lines. Ramp lands 12.000 @402 and 14.000 @1440 — desktop unmoved.
 */
const SUBTITLE_12_14 = "text-[calc(11.948px_+_2.052*var(--fl))]";

const ICON = {
  alert: "/assets/figma/e2ca3f8c81dc8ab3ede0613c50c57734946678d7.svg",
  check: "/assets/figma/dbe84d89c90a467bc28f8077de53cd3518786684.svg",
  close: "/assets/figma/36f13a184206ab27dedb4992d9d5b63a3a3f8cb6.svg",
  discord: "/assets/figma/9769d281893b12798e8f55f41d05010cbd556d76.svg",
  dot16: "/assets/figma/f498dfdf3c14fe0850c950e35fdc12de525457bf.svg",
  dot20: "/assets/figma/f8d4363b76896ccf0aac59b3c9c49ccf09ea3174.svg",
};

/**
 * Badge skin per tone. Figma tints the pill with the tone colour at 10% and rings it at 20%,
 * and the glyph inside is always the tone-coloured export rather than a recoloured icon.
 *
 * The tone hexes are read off the frames, not eyeballed — every one of the eight status cards
 * agrees on them, at both anchors:
 *   ok      #94B45E  `708:2652` (1440) / `1297:1394` (402)
 *   pending #D79A4E  `708:2662` / `708:2849` / `708:2927`
 *   alert   #C0563E  `708:2706` / `1297:2237`
 *   failed  #C0563E  `708:2883` / `708:2971`
 *
 * The ring is an INSIDE stroke in Figma (weight 1), so it is a `box-shadow` inset and not a
 * CSS `border`: a border is drawn OUTSIDE the padding box and grew the pill past the diameter
 * the design draws — see the note on `Badge` below.
 */
const BADGE: Record<StepTone, { skin: string; icon: string }> = {
  alert: {
    icon: ICON.alert,
    skin: "bg-[rgba(192,86,62,0.1)] shadow-[inset_0_0_0_1px_rgba(192,86,62,0.2)]",
  },
  failed: {
    icon: ICON.close,
    skin: "bg-[rgba(192,86,62,0.1)] shadow-[inset_0_0_0_1px_rgba(192,86,62,0.2)]",
  },
  ok: {
    icon: ICON.check,
    skin: "bg-[rgba(148,180,94,0.1)] shadow-[inset_0_0_0_1px_rgba(148,180,94,0.2)]",
  },
  pending: {
    icon: ICON.dot20,
    skin: "bg-[rgba(215,154,78,0.1)] shadow-[inset_0_0_0_1px_rgba(215,154,78,0.2)]",
  },
};

/**
 * `check_regular`, inlined so it can DRAW itself instead of appearing — the beat the status
 * timeline was missing. The asset it replaces (`dbe84d…svg`, still the source of these numbers)
 * is a 20-unit filled outline of a tick, so the path below is that export's `d` verbatim, its
 * `fillRule`/`clipRule` verbatim and its `#94B45E` verbatim: nothing about the resting glyph
 * changes, at any size, which is the whole constraint on animating a transcribed asset.
 *
 * A fill has no length to dash, so the reveal is a MASK: `SPINE` runs down the middle of the
 * tick and is stroked wide enough to cover it, and `.auth-step-check` walks the dash along that
 * spine from the tail to the tip (styles/auth-motion.css, which carries the geometry note). At
 * rest the mask covers everything and the two renders are pixel-identical — checked at 20 and
 * at 200.
 *
 * The id has to be per-instance: a document can hold five of these at once (four steps plus the
 * phone pane's copy), and two `<mask id>`s that agree would have the first one win for both.
 */
const CHECK_D =
  "M16.9108 4.33667C16.8302 4.3521 16.7518 4.37758 16.6775 4.4125C16.6258 4.44 14.5733 6.47333 12.1167 8.93083L7.65 13.4L5.53333 11.285C3.91083 9.66417 3.38167 9.15417 3.26667 9.1025C2.83833 8.90917 2.32083 9.13083 2.14917 9.58C2.08 9.7625 2.095 10.06 2.18333 10.2367C2.2575 10.3858 7.11583 15.2425 7.265 15.3175C7.32833 15.3492 7.47167 15.3825 7.58333 15.3917C7.9875 15.4242 7.61917 15.765 12.9558 10.4242C18.2967 5.07833 17.9283 5.4775 17.8917 5.07167C17.8717 4.84833 17.8117 4.71667 17.6642 4.56917C17.568 4.47062 17.4487 4.39772 17.3171 4.35711C17.1855 4.31649 17.0458 4.30947 16.9108 4.33667Z";

/** The tick's spine: tail (2.7, 9.95) → corner (7.46, 14.36) → tip (17.29, 4.95), solved as the
 *  midline between the two sides of each arm in the export's own outline. */
const CHECK_SPINE = "M2.7 9.95L7.46 14.36L17.29 4.95";

function DrawnCheck({ size, className }: { size: number; className: string }) {
  const id = useId();

  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      width={size}
      height={size}
      className={className}
    >
      {/* `userSpaceOnUse` with an explicit region: the default mask region is the fill's own
          bounding box plus 10%, and the spine's round cap runs ~3 units past the tail, which
          that region would clip — taking a sliver of the resting glyph with it. */}
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20">
        <path
          className="auth-step-check"
          d={CHECK_SPINE}
          stroke="#fff"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="16"
        />
      </mask>
      <path mask={`url(#${id})`} fillRule="evenodd" clipRule="evenodd" d={CHECK_D} fill="#94B45E" />
    </svg>
  );
}

const LABEL_COLOR: Record<StepTone, string> = {
  alert: "text-brand-red",
  failed: "text-brand-red",
  ok: "text-brand-green",
  pending: "text-brand-yellow",
};

/**
 * The contact buttons on a step were their own `{ icon, label }` pair with a dead `href="#"`.
 * They point at the same two accounts the footer does, and the footer's `SOCIAL_LINKS` already
 * carries the real URLs alongside these exact same two SVG paths — so the panel reads that
 * instead of keeping a second, hrefless copy. One place to change an account, and the buttons
 * actually go somewhere.
 */
const SOCIALS = SOCIAL_LINKS;

/**
 * ── The badge, measured ────────────────────────────────────────────────────────────────────
 * Figma authors it as a "Layout Container" wrapping an "Icon" pill, and the pill is what is
 * visible. Every one of the eight status cards draws it at ONE of two diameters, and the
 * diameter is set by the glyph inside, not by the tone:
 *
 *   32 pill = 6 ring pad + 20 glyph + 6, wrapper `Layout Container` 32x32
 *     ok       `708:2652` `708:2761` `708:2771` `708:2815` (1440) / `1297:1394` (402)
 *     pending  `708:2662` (ตรวจสอบเอกสาร) `708:2849` `708:2927`
 *     alert    `708:2706` / `1297:2237`
 *     failed   `708:2971` (Semi-Final Failed — 20 close, NOT 16)
 *   28 pill = 6 + 16 glyph + 6, wrapper `Layout Container` 36x32 (4 pad either side, the
 *             pill centred in a 32-tall row)
 *     failed   `708:2883` (Not Qualified) — the ONLY compact badge in the whole design
 *
 * Two defects fixed here.
 *
 * 1. The pill rendered 2px over. `size-[32px] p-[4px]` on the wrapper left a 24 content box,
 *    but the pill inside computed 20 glyph + 12 ring pad + 2px of CSS `border` = 34 — a 34
 *    badge in a box Figma draws 32 (`708:2652`), overflowing the wrapper's padding. Figma's
 *    ring is an INSIDE stroke, so it is an inset box-shadow (the same trick `Step` already
 *    uses for the row hairline) and the wrapper's `p-[4px]` goes: 20 + 12 = 32 exactly, and
 *    the wrapper is the 32 square itself. This moves 1440 by 2px, deliberately.
 *
 * 2. `compact` was decided here, by tone — `compact || tone === 'failed'` — which forced the
 *    16 glyph onto BOTH failed variants. Figma disagrees: Not Qualified is 16 (`708:2883`)
 *    and Semi-Final Failed is 20 (`708:2971`). The diameter is now purely the step's own
 *    `compact` flag, authored per step in teamData.ts against those two nodes.
 *
 * Flat at both anchors: `1297:1393`/`1297:1394` on the 402 frame are byte-for-byte the 1440
 * `708:2652` — 32 wrapper, 6 ring pad, 20 glyph. Nothing here ramps.
 *
 * A badge is the one thing on this screen that changes meaning while the user is looking at
 * it — a step goes from pending to done — and it used to teleport: the pill's tint class and
 * the glyph asset both swapped in a single frame, so a review completing read as a glitch
 * rather than as progress. Two fixes, both cheap:
 *
 * - a transition on the pill's fill AND its inset ring, so the 10% tint and the 20% ring
 *   interpolate to the new tone instead of cutting. This covers every tone pair. (It names
 *   both properties because the ring is a box-shadow now, which `transition-colors` misses.)
 * - `mm-swap` on the pill, with the tone's own glyph and the check both permanently mounted
 *   in one grid cell. Nothing mounts or unmounts, so the completing transition — pending,
 *   alert or failed → ok, the direction a status actually travels — cross-fades on
 *   micro-motion's shared curve, the same way the copy button's tick does. Both layers are
 *   given the same box, so the pill cannot resize mid-cross-fade.
 */
function Badge({ tone, compact = false }: { tone: StepTone; compact?: boolean }) {
  const { skin, icon } = BADGE[tone];
  /* 16 in the 28 pill, 20 in the 32 — the glyph frame Figma nests, not a scaled-down icon. */
  const glyph = compact ? 16 : 20;
  /* The dot is exported at both sizes (`708:2664` is a 14 ellipse in a 20 frame, and the 16
     export the matching 11.2) so the compact pending badge uses the 16 asset rather than
     resampling the 20 one. `close_regular` ships only at 16 (`36f13a…`, viewBox 0 0 16 16) and
     is the same glyph at both — 9.8/16 and 12.3/20 are one ratio — so it scales exactly. */
  const src = compact && tone === "pending" ? ICON.dot16 : icon;
  const done = tone === "ok";
  const box = { height: glyph, width: glyph };

  return (
    /* `708:2882` is the 36x32 wrapper the 28 pill sits centred in; `708:2651`'s is the plain
       32 square. No `p-[4px]`: the pill is its own exact diameter now, so padding here would
       only push the row's 12 gap out again. */
    <span
      className={`flex shrink-0 items-center justify-center ${compact ? "h-[32px] w-[36px]" : "size-[32px]"}`}
    >
      <span
        data-on={done}
        className={`mm-swap shrink-0 rounded-full p-[6px] transition-[background-color,box-shadow] ${skin}`}
      >
        {/* Both layers share the same box so the pill's diameter cannot change under the
            cross-fade. A compact badge is only ever `failed`, which is terminal — it never
            reaches `ok` — so the 16 check on the hidden layer is unreachable rather than wrong.
            The check layer is the inlined, drawn glyph; the tone layer stays the export. */}
        <img src={src} alt="" aria-hidden className="mm-swap-off" style={box} />
        <DrawnCheck size={glyph} className="mm-swap-on" />
      </span>
    </span>
  );
}

function Row({ title, label, tone }: { title: string; label: string; tone: StepTone }) {
  return (
    <div className="flex w-full items-center gap-[8px]">
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="fl-14 leading-normal">{title}</p>
        <p className="fl-12 leading-normal text-gray-2">ชื่อ-สกุล</p>
      </div>
      <p className={`shrink-0 fl-14 leading-normal ${LABEL_COLOR[tone]}`}>{label}</p>
    </div>
  );
}

/**
 * Figma's hairline is an inside stroke, so it must not grow the card past its 59px content
 * height the way a CSS border would — an inset ring draws it in place instead.
 *
 * `rise` continues the page's entrance ladder into the panel so the timeline builds
 * downward, one step after another, rather than the two-to-four steps landing as one slab.
 * It is the shared auth cascade — see pages/MyTeam.tsx — at the short 14px distance, since
 * a step is a line of copy and not a card.
 */
function Step({ step, rise }: { step: StatusStep; rise: number }) {
  return (
    <div
      className="auth-rise auth-rise-sm flex w-full flex-col gap-[12px] rounded-[12px] p-[10px] shadow-[inset_0_0_0_0.5px_#dcdcdc]"
      data-rise={rise}
    >
      <div className={`flex gap-[12px] ${step.rows ? "items-start" : "items-center"}`}>
        <Badge tone={step.tone} compact={step.compact} />

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-[12px]">
          <div className="flex w-full items-center gap-[8px]">
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <p className="fl-14 leading-normal font-medium">{step.title}</p>
              <p className="fl-12 leading-normal text-gray-2">{TEAM.updatedAt}</p>
            </div>
            {Boolean(step.label) && (
              <p className={`shrink-0 fl-14 leading-normal ${LABEL_COLOR[step.tone]}`}>
                {step.label}
              </p>
            )}
          </div>

          {step.rows?.map((row) => (
            <Row key={row.title} {...row} />
          ))}
        </div>
      </div>

      {step.contact === true && (
        <>
          <div className="h-0 w-full border-t-[0.5px] border-[#dcdcdc]" />
          <div className="flex w-full flex-col items-start gap-[8px]">
            <p className="fl-12 leading-[1.6] text-gray-2">ติดต่อทีมงาน</p>
            <div className="flex w-full items-center gap-[8px]">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  /* external, and nothing wrapping the click: a bare `target="_blank"` to
                     facebook.com / instagram.com is what lets a phone hand off to the installed
                     app. `rel` keeps `window.opener` from leaking to it. */
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="mm-press flex min-w-0 flex-1 items-center justify-center rounded-[10px] bg-[#f6f6f6] px-[16px] py-[6px] transition-colors hover:bg-[#ececec]"
                >
                  <img src={social.icon} alt="" aria-hidden className="mm-icon-pop size-[24px]" />
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Figma nests the Discord mark inside a 64:48 box pinned by percentage, so the glyph keeps
 * its own aspect while the outer square stays on the 20/32px grid.
 */
export function DiscordGlyph({ size, src }: { size: number; src: string }) {
  return (
    <span className="relative block shrink-0 overflow-clip" style={{ height: size, width: size }}>
      {/* `708:3549` is the 20 frame, `708:3550` the 17.3x13 mark inside it: 4.375/20 = 21.88%
          from the top, 13/20 = 65% tall, and 64/48 keeps the mark's own aspect. */}
      <span className="absolute top-[21.88%] bottom-[13.13%] left-1/2 block aspect-[64/48] -translate-x-1/2 overflow-clip">
        {/*
         * The inset is on a `<span>`, and the image fills it. It used to be on the `<img>`
         * itself — `absolute inset-y-0 right-[1.06%] left-0` — which does not size a replaced
         * element: with `width: auto` the box is over-constrained, `right` is dropped
         * (CSS 2.1 §10.3.7) and the file renders at its INTRINSIC 17.1497x13. That is
         * accidentally right at `size={32}`'s parent by nothing more than coincidence at
         * `size={20}`, and visibly small in the 32 modal button (pages/MyTeam.tsx `708:3560`),
         * where the box asks for 27.7x20.8. `block size-full` makes the image obey the box.
         */}
        <span className="absolute inset-y-0 right-[1.06%] left-0 block">
          <img src={src} alt="" aria-hidden className="block size-full" />
        </span>
      </span>
    </span>
  );
}

/**
 * The white plate each block sits on at 1440 (`708:2416`: a 400-wide card, radius 20, 16 of
 * padding). Suppressed by `card={false}` — see the prop's own note.
 */
const PLATE = "rounded-[20px] bg-white p-4 shadow-soft";

export default function StatusPanel({
  status,
  showDiscord = false,
  heading = true,
  card = true,
  members,
}: {
  status: TeamStatus;
  /** The qualified dashboard also carries the Discord join card. */
  showDiscord?: boolean;
  members: Person[];
  /**
   * Whether the panel draws its own white card.
   *
   * At 1440 it must: `708:2416` is a standalone 400x435 plate — radius 20, 16 of padding —
   * beside the team card. On the 402 dashboard it must NOT. `1297:1388` is a plain 322-wide
   * column with no `cornerRadius`, no fill, no padding and no effects, sitting directly inside
   * the team card's own 16 (`1297:1289` is 354 with `paddingLeft/Right: 16`), because the phone
   * shows this as the second pane of one card rather than as a second card.
   *
   * Held flat, the plate nested a white card in a white card and squeezed the content to 290
   * where Figma draws 322 — measured on /my-team at 402 with the สถานะ pill selected. The
   * counterpart to `heading`, and it is set from the same call site.
   */
  card?: boolean;
  /**
   * The 402 frame has NO `สถานะ` heading inside the card: `1297:1388` opens straight on the
   * `อัปเดตล่าสุดเมื่อ` line, because the phone names the pane with the `สถานะ` pill of the
   * two-up segmented switcher above it (`1297:1290`, `1297:1386`/`1297:1387`) instead. The
   * switcher lives in pages/MyTeam.tsx, so this is the hook for it: pass `heading={false}`
   * from inside the phone pane. It stays on by default so the panel is never headingless
   * while the two columns are still stacked.
   */
  heading?: boolean;
}) {
  return (
    /* `708:3506` stacks the sidebar's two cards with a 24 gap. */
    <div className="flex flex-col gap-6">
      {/* Figma: a 400-wide card, 16 of padding, 16 between the header and each step */}
      <div className={`flex w-full flex-col items-start ${card ? PLATE : ""}`}>
        <div className="flex w-full flex-col items-start gap-4">
          <div className="flex w-full flex-col items-start">
            {/* Flat 20, not `fl-20`'s 17 → 20. The phone card has no `สถานะ` heading to
                measure, but the 402 dashboard's own card headings are 20/500 — `1297:1136`
                sets `ทีม A` at 20 where 1440 (`708:2322`) has 24 — so the card-heading rank on
                a phone is 20 and `fl-20`'s 17 sat a rank below every sibling. 1440 unmoved:
                `708:2649` is 20/500 lh28. */}
            {heading && <p className="w-full text-[20px] leading-[1.4] font-medium">สถานะ</p>}
            <p className={`${SUBTITLE_12_14} leading-normal text-gray-2`}>
              อัปเดตล่าสุดเมื่อ {TEAM.updatedAt}
            </p>
          </div>

          {/* the ladder tops out at 7, which is the last delay auth-motion.css defines */}
          {getStatusSteps(members)[status].map((step, i) => (
            <Step key={step.title} step={step} rise={Math.min(i + 3, 7)} />
          ))}
        </div>
      </div>

      {/*
       * The Discord card only exists for a qualified team, and it used to appear and vanish
       * with no transition at all — a 20px-radius card materialising under the status panel
       * in one frame, which reads as a layout bug rather than as a reward being handed over.
       * `mm-card-in` lifts and settles it (280ms, 8px, 0.98 → 1). Only the entrance is
       * animated: the unmount is a route change away, where the page transition owns the
       * exit, so there is nothing here to hold open.
       */}
      {showDiscord && (
        <div className={`mm-card-in flex w-full flex-col items-start ${card ? PLATE : ""}`}>
          <div className="flex w-full flex-col items-start gap-4">
            {/* `708:3544` / `708:3545`: 20/500 lh28 over 14/400 lh21.2, the same lockup the
                status card above uses. There is no phone frame for this card — Figma only
                draws the 402 dashboard's two panes (`1297:812`, `1297:1259`) and neither
                reaches the Discord state — so it takes its sibling's anchors: the card-heading
                rank on a phone is 20 (`1297:1136`) and the card subtitle 12 (`1297:1431`).
                Inferred, not measured; 1440 is Figma's either way. */}
            <div className="flex w-full flex-col items-start">
              <p className="w-full text-[20px] leading-[1.4] font-medium">{DISCORD_CARD.title}</p>
              <p className={`${SUBTITLE_12_14} leading-normal text-gray-2`}>
                {DISCORD_CARD.subtitle}
              </p>
            </div>

            <div className="flex w-full items-center gap-[12px] rounded-[12px] p-[10px] shadow-[inset_0_0_0_0.5px_#dcdcdc]">
              {/* The same 32 pill as every status badge, and the same fix: `708:3548` is
                  6 + 20 + 6 with a weight-1 INSIDE stroke, so the ring is an inset shadow and
                  the wrapper carries no padding. It was rendering 34 (20 + 12 + 2px border) in
                  a 32 box, and the wrapper's own `p-[4px]` then pushed the row's 12 gap out. */}
              <span className="flex size-[32px] shrink-0 items-center justify-center">
                <span className="flex shrink-0 items-center justify-center rounded-full bg-[rgba(88,101,242,0.1)] p-[6px] shadow-[inset_0_0_0_1px_rgba(88,101,242,0.2)]">
                  <DiscordGlyph size={20} src={ICON.discord} />
                </span>
              </span>
              <p className="min-w-0 flex-1 fl-14 leading-normal font-medium">
                {DISCORD_CARD.label}
              </p>
              <button
                type="button"
                className="mm-press shrink-0 rounded-[10px] bg-[#f6f6f6] px-[20px] py-[8px] fl-14 leading-normal transition-colors hover:bg-[#ececec]"
              >
                {DISCORD_CARD.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
