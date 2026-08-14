import { useId } from "react";
import { SOCIAL_LINKS } from "@/data";
import { DISCORD_CARD, getStatusSteps, TEAM } from "../team-data";
import type { Person, ReviewFeedbackInput, StatusStep, StepTone, TeamStatus } from "../team-data";

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

const SOCIALS = SOCIAL_LINKS;
function Badge({ tone, compact = false }: { tone: StepTone; compact?: boolean }) {
  const { skin, icon } = BADGE[tone];
  /* 16 in the 28 pill, 20 in the 32 — the glyph frame Figma nests, not a scaled-down icon. */
  const glyph = compact ? 16 : 20;
  const src = compact && tone === "pending" ? ICON.dot16 : icon;
  const done = tone === "ok";
  const box = { height: glyph, width: glyph };

  return (
    <span
      className={`flex shrink-0 items-center justify-center ${compact ? "h-[32px] w-[36px]" : "size-[32px]"}`}
    >
      <span
        data-on={done}
        className={`mm-swap shrink-0 rounded-full p-[6px] transition-[background-color,box-shadow] ${skin}`}
      >
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

export function DiscordGlyph({ size, src }: { size: number; src: string }) {
  return (
    <span className="relative block shrink-0 overflow-clip" style={{ height: size, width: size }}>
      <span className="absolute top-[21.88%] bottom-[13.13%] left-1/2 block aspect-[64/48] -translate-x-1/2 overflow-clip">
        <span className="absolute inset-y-0 right-[1.06%] left-0 block">
          <img src={src} alt="" aria-hidden className="block size-full" />
        </span>
      </span>
    </span>
  );
}

const PLATE = "rounded-[20px] bg-white p-4 shadow-soft";

export default function StatusPanel({
  status,
  showDiscord = false,
  heading = true,
  card = true,
  members,
  reviewFeedback,
}: {
  status: TeamStatus;
  /** The qualified dashboard also carries the Discord join card. */
  showDiscord?: boolean;
  members: Person[];
  card?: boolean;
  heading?: boolean;
  reviewFeedback?: ReviewFeedbackInput | null;
}) {
  return (
    /* `708:3506` stacks the sidebar's two cards with a 24 gap. */
    <div className="flex flex-col gap-6">
      {/* Figma: a 400-wide card, 16 of padding, 16 between the header and each step */}
      <div className={`flex w-full flex-col items-start ${card ? PLATE : ""}`}>
        <div className="flex w-full flex-col items-start gap-4">
          <div className="flex w-full flex-col items-start">
            {heading && <p className="w-full text-[20px] leading-[1.4] font-medium">สถานะ</p>}
            <p className={`${SUBTITLE_12_14} leading-normal text-gray-2`}>
              อัปเดตล่าสุดเมื่อ {TEAM.updatedAt}
            </p>
          </div>

          {/* the ladder tops out at 7, which is the last delay auth-motion.css defines */}
          {getStatusSteps(members, reviewFeedback)[status].map((step, i) => (
            <Step key={step.title} step={step} rise={Math.min(i + 3, 7)} />
          ))}
        </div>
      </div>

      {showDiscord && (
        <div className={`mm-card-in flex w-full flex-col items-start ${card ? PLATE : ""}`}>
          <div className="flex w-full flex-col items-start gap-4">
            <div className="flex w-full flex-col items-start">
              <p className="w-full text-[20px] leading-[1.4] font-medium">{DISCORD_CARD.title}</p>
              <p className={`${SUBTITLE_12_14} leading-normal text-gray-2`}>
                {DISCORD_CARD.subtitle}
              </p>
            </div>

            <div className="flex w-full items-center gap-[12px] rounded-[12px] p-[10px] shadow-[inset_0_0_0_0.5px_#dcdcdc]">
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
