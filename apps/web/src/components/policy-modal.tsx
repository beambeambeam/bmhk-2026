import { useEffect, useRef, useState } from 'react'
import type { PolicyBlock, PolicyDocument } from '@/features/register/data/privacy-policy'
import useDialogFocus, { useScrollLock } from './use-dialog-focus'

const ARROW_DOWN = '/assets/figma/b5fa6d1d1c4352d0d01420816b8777fe81ff5920.svg'

/**
 * Matches the closing `.auth-modal-sheet` transition in styles/auth-motion.css. The exit
 * is deliberately shorter than the 300ms entrance: arriving is an event, leaving should
 * get out of the way.
 */
const EXIT_MS = 200

/**
 * Body copy, both anchors measured: 14 on `1297:1591` (a 306-wide, 176-tall box at 160%) and
 * 16 on `719:33` / `708:2249`. This was `fl-16`, whose floor is 15 — the ladder's own
 * narrow end, not Figma's — so the phone frame wins at the call site and the ranks in
 * index.css are left alone. 16.000 at `--fl` = 1, so 1440 does not move.
 *
 * Weight is Light (300) on BOTH frames, so `font-light` is flat rather than a breakpoint.
 */
const BODY = 'text-[calc(13.948px_+_2.052*var(--fl))] leading-[1.6] font-light'

function Block({ block }: { block: PolicyBlock }) {
  if (typeof block === 'string') {
    return <p className={`w-full ${BODY}`}>{block}</p>
  }

  // list of bullets that each carry their own sub-bullets
  if (typeof block[0] === 'object') {
    return (
      <ul className={`w-full list-disc ps-[24px] ${BODY}`}>
        {(block as { bullet: string; sub: string[] }[]).map((item) => (
          <li key={item.bullet}>
            {item.bullet}
            <ul className="list-disc ps-[24px]">
              {item.sub.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className={`w-full list-disc ps-[24px] ${BODY}`}>
      {(block as string[]).map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

/**
 * The two footer answers. Every length is a two-anchor ramp off `1297:1629` / `1297:1631`
 * (the 402 sheet: 10 radius, 20 of side pad, 8 of block pad, a 16 label — 38 tall) and
 * `708:2165` / `708:2167` (1440: 12 / 24 / 12 / 20 — 52 tall). All four were the 1440 value
 * held flat, so the phone drew a 52-tall button where Figma draws 38.
 *
 * Weight is Regular (400) on both frames, which is the inherited body weight, so no class.
 */
const ANSWER =
  'mm-press rounded-[calc(9.948px_+_2.052*var(--fl))] px-[calc(19.896px_+_4.104*var(--fl))] py-[calc(7.896px_+_4.104*var(--fl))] text-[calc(15.896px_+_4.104*var(--fl))] leading-[1.4]'

export default function PolicyModal({
  document: doc,
  origin,
  onAccept,
  onDecline,
}: {
  /** `null` closes the modal. */
  document: PolicyDocument | null
  /**
   * Viewport point of the control that opened the sheet, so it can grow out of that row
   * and shrink back into it. Optional: without it the sheet scales from its own centre,
   * which is the right default for a dialogue with no trigger to be anchored to.
   */
  origin?: { x: number; y: number } | null
  onAccept: () => void
  onDecline: () => void
}) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  /*
   * The sheet has to outlive `document` by one exit animation, so the modal keeps its own
   * mount flag and renders the last document it was given while it is leaving. `state`
   * flips a frame after mount (and back before unmount) — the transition needs a painted
   * start value, which is what the extra frame buys.
   */
  const shownRef = useRef<PolicyDocument | null>(null)
  if (doc) shownRef.current = doc
  const shown = shownRef.current

  const [mounted, setMounted] = useState(false)
  const [state, setState] = useState<'open' | 'closed'>('closed')

  /*
   * TWO effects, where this used to be one, and the split is a bug fix rather than tidying.
   *
   * Everything the entrance needs — the sheet's box to measure the origin from, and one painted
   * frame in the closed state for the transition to move away from — only exists AFTER `mounted`
   * has committed. Scheduled from the same effect that sets `mounted`, neither was true:
   *
   *  - `sheetRef.current` was still null when the frame ran on a real click, so
   *    `--auth-origin-x/y` were NEVER written. Measured at 1440: the sheet's `transform-origin`
   *    computed to `500px 411.5px`, i.e. its own centre, for a dialogue whose whole documented
   *    behaviour is that it grows out of the row the user pressed.
   *  - and `setState('open')` landed in the same frame as the mount, so the sheet's FIRST paint
   *    was already the open state and there was nothing to interpolate: sampled per frame from
   *    the press, opacity was 1 by the second frame with no transition at all. The dialogue was
   *    appearing, not arriving.
   *
   * So the mount is its own effect, and the open is a second one gated on `mounted`.
   */
  useEffect(() => {
    if (doc) {
      setMounted(true)
      return
    }
    setState('closed')
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [doc])

  useEffect(() => {
    if (!doc || !mounted) return

    bodyRef.current?.scrollTo({ top: 0 })

    /*
     * `transform-origin` has to be in place before the opening transition starts, and it can
     * only be worked out here: it is the trigger's point expressed in the sheet's own box, which
     * does not exist until the sheet has been laid out. Two writes of a custom property on one
     * element, once per open — not per frame. Measured while the sheet still holds its closed
     * `scale(0.96)`, so the box is ~20px in from its resting one at 1440; 2% of a 1000-wide
     * sheet is far below the threshold at which a growth centre reads as wrong.
     */
    const sheet = sheetRef.current
    if (sheet && origin) {
      const box = sheet.getBoundingClientRect()
      sheet.style.setProperty('--auth-origin-x', `${origin.x - box.left}px`)
      sheet.style.setProperty('--auth-origin-y', `${origin.y - box.top}px`)
    }

    /*
     * TWO frames, not one. React flushes a click's update — and the passive effect that mounts
     * this sheet — inside the event's own task, so a single `requestAnimationFrame` can still
     * fire before the browser has painted anything, which is the state that had no start value
     * to transition from. The outer frame is the one that paints the sheet closed; the inner one
     * opens it.
     */
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setState('open'))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [doc, mounted, origin])

  /*
   * `&& mounted` for the reason ResultModal's own call records at length: the hook focuses the
   * sheet from an effect keyed on this argument, and on the render where `doc` first arrives the
   * sheet is not in the document yet (this component returns `null` until `mounted` flips), so
   * the ref is empty, the focus is a no-op, and nothing re-runs the effect afterwards. Both
   * sheets in this flow had the same off-by-one-render hole.
   */
  useDialogFocus(!!doc && mounted, sheetRef)

  /* the wizard behind the scrim is held still — see `useScrollLock`. This replaces a
     `body.style.overflow = 'hidden'` that this site's `html { overflow-x: clip }` made inert:
     measured with a real wheel event, the page behind this sheet scrolled at every width. */
  useScrollLock(!!doc)

  // close on Escape
  useEffect(() => {
    if (!doc) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDecline()
    }
    window.document.addEventListener('keydown', onKey)
    return () => window.document.removeEventListener('keydown', onKey)
  }, [doc, onDecline])

  if (!mounted || !shown) return null

  return (
    /*
     * Figma overlays every dialog on a light grey scrim that blurs the page behind it.
     *
     * The scrim's inset was `p-4 lg:p-25`, which stepped from 16 to 100 at 1024 — a 168px jump
     * in the sheet's width at one pixel of viewport, and on the wrong side of it: at 1023 the
     * sheet was 32px narrower than the screen and at 1024 it was 224 narrower. It ramps now, and
     * 1440 is untouched because the `max-w-[1000px]` cap has taken over long before: 1440 - 200
     * is 1240, so the sheet is 1000 either way.
     *
     * The ramp's LOW end was 16, which was a guess: `1297:1580` puts the 402 sheet at (24, 24)
     * in a 402-wide frame, i.e. a 354 sheet inside a 24 inset, so the phone value is 24 and the
     * sheet has been 16px too wide at 402 all along. 100 at the top end is Figma's own vertical
     * inset (`708:2117` sits at y=100 in a 1023 overlay, 823 tall, 100 below it), and the
     * horizontal is capped by `max-w-[1000px]` either way — so 1440 is untouched by the change.
     *
     * Everything inside was transcribed as a single 1440 px with no phone pair at all — the same
     * class of defect index.css's flat-px ladder was added for — so the body, the section
     * headings, the subtitle and all three buttons now take the matching rank from it.
     */
    <div
      data-state={state}
      className="auth-modal-scrim fixed inset-0 z-50 flex items-center justify-center bg-[rgba(194,194,194,0.3)] p-[calc(22.023px_+_77.977*var(--fl))] backdrop-blur-[5px]"
      onClick={onDecline}
    >
      {/*
       * Figma 708:2239 / 708:2117 — a 1000x823 sheet, 24 of padding, 32 between header, body and
       * footer. The 402 sheet (`1297:1580`) is 354x897 with the same 24 of padding but a 24
       * radius and a 24 gap, so radius and gap are two-anchor ramps where padding is correctly
       * flat. Both were the 1440 value held flat before.
       *
       * `tabIndex={-1}` so `useDialogFocus` can put the caret on the sheet itself when it opens.
       */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={shown.title}
        tabIndex={-1}
        data-state={state}
        onClick={(e) => e.stopPropagation()}
        className="auth-modal-sheet flex max-h-full w-full max-w-[1000px] flex-col gap-[calc(23.792px_+_8.208*var(--fl))] rounded-[calc(23.792px_+_8.208*var(--fl))] border border-[#dcdcdc] bg-white p-6 outline-none lg:h-[823px]"
      >
        {/* the three regions settle in sequence behind the sheet — see `.auth-modal-part` */}
        <header className="auth-modal-part flex w-full shrink-0 items-center gap-4">
          {/* 24 @402 (`1297:1582`) → 40 @1440 (`708:2241`). `size-[40px]` was the 1440 box held
              flat, i.e. a 40px mark beside a 20px title in a 306-wide sheet. The 16 gap is
              Figma's on BOTH frames (`1297:1582` ends at 24 with the title at 40; `708:2241`
              ends at 40 with its block at 56), so `gap-4` is correctly flat. */}
          <img
            src={shown.icon}
            alt=""
            aria-hidden
            className="size-[calc(23.584px_+_16.416*var(--fl))] shrink-0"
          />
          <div className="flex min-w-0 flex-1 flex-col items-start justify-center">
            {/* 20 @402 → 28 @1440: `1297:1634` is a 28-tall box at 1.4 where `708:2244` is 39
                tall at 28. The old low anchor was 24. Exact at `--fl` = 1. */}
            <p className="text-[calc(19.792px_+_8.208*var(--fl))] leading-[1.4] font-medium">
              {shown.title}
            </p>
            {/* `1297:1581` carries only the icon and the title — the phone sheet drops this
                line — so `fl-18` keeps its own 16 → Figma's 18 (`708:2245`) with no anchor to
                solve through. Kept rather than hidden: dropping copy is a composition change. */}
            <p className="fl-18 leading-normal text-gray-1">{shown.subtitle}</p>
          </div>
        </header>

        {/* 20 between sections on `1297:1587`, 24 on `708:2124` — was `gap-6`, the 1440 value flat */}
        <div
          ref={bodyRef}
          className="auth-modal-part flex min-h-0 w-full flex-1 flex-col items-start gap-[calc(19.896px_+_4.104*var(--fl))] overflow-y-auto pr-2"
        >
          {/* 14 @402 (`1297:1588`, a 40-tall two-line box at 140%) → 20 @1440 (`719:34`). `fl-20`
              floors at 17, which is the ladder's narrow end rather than Figma's, so the phone
              frame wins here. Regular on both frames, so no weight class. */}
          {shown.effective && (
            <p className="w-full text-[calc(13.844px_+_6.156*var(--fl))] leading-[1.4]">
              {shown.effective}
            </p>
          )}
          {shown.sections.map((section) => (
            /* heading-to-body gap: 8 on `1297:1589`, 16 on `719:31` — `gap-4` was 1440 held flat */
            <section
              key={section.title}
              className="flex w-full flex-col items-start gap-[calc(7.792px_+_8.208*var(--fl))]"
            >
              {/* 16 @402 (`1297:1590`, a 22-tall box at 140%) → 24 @1440 (`719:32`). `fl-24`
                  floors at 20. Regular (400) on both frames — Figma does NOT bold these. */}
              <h3 className="w-full text-[calc(15.792px_+_8.208*var(--fl))] leading-[1.4]">
                {section.title}
              </h3>
              {section.body.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </section>
          ))}
        </div>

        {/*
         * A right-aligned row at BOTH anchors, not a column that turns into one at 640:
         * `1297:1628` is a 203x38 row at x=127 in a 306-wide content box (so 24 from the right
         * edge, gap 16) and `708:2250` is the same row with ดาวน์โหลด pushed to the far left.
         * `flex-col sm:flex-row` stacked the two answers full-width on the 402 frame, which is
         * neither frame's composition.
         *
         * `flex-wrap` + `me-auto` rather than `justify-between`: the three-button rules footer
         * does not fit 306px, and a nowrap row would have pushed the sheet's own scrollWidth past
         * its box — the one thing this flow may never do. Wrapped, ดาวน์โหลด keeps the left of
         * its line and the two answers keep the right of theirs. The gap is 16 on both frames.
         */}
        <footer className="auth-modal-part flex w-full shrink-0 flex-wrap items-center justify-end gap-4">
          {shown.downloadable && (
            <button
              type="button"
              className="mm-press me-auto flex shrink-0 items-center justify-center gap-[12px] rounded-[12px] bg-[#efefef] py-3 pr-6 pl-4 text-[calc(15.896px_+_4.104*var(--fl))] leading-[1.4] transition-colors hover:bg-[#e2e2e2]"
            >
              {/*
               * 28, flat, and it is a CORRECTION rather than a ramp. `708:2252` draws
               * `arrow_down_regular` 28 square inside a 165x52 button (16 of left pad, a 12 gap
               * to the label at x56, 24 of right pad) — this was transcribed as 24, so the box
               * has been 4px under Figma at 1440 all along. The phone sheet has no download
               * button at all (`1297:1628` holds only ไม่ยอมรับ and ยอมรับ), so there is no
               * second anchor and nothing to interpolate.
               *
               * The label rides the same 16 → 20 ramp as the two answers beside it (it was
               * `fl-20`, floor 17, so the row held three labels at two different sizes on a
               * phone). The 1440 end is Figma's 20 either way.
               *
               * The vector inside is inset by PERCENTAGES, but the inset alone was NOT sizing
               * it: an absolutely-positioned `<img>` with `width: auto` renders at its intrinsic
               * size and the over-constrained `right`/`bottom` are simply dropped (CSS 2.1
               * §10.3.8 / §10.6.5). This particular file happens to be 15.4913x20.5465, which is
               * exactly 28 minus those percentages, so it looked right by coincidence — and would
               * have silently stopped scaling the moment the box became a ramp. The inset now
               * sizes a `<span>` and the image fills it, which is the arrangement that actually
               * holds.
               */}
              <span className="mm-icon-pop relative block size-[28px] shrink-0 overflow-clip">
                <span className="absolute inset-[12.54%_22.35%_14.08%_22.33%] block">
                  <img src={ARROW_DOWN} alt="" aria-hidden className="block size-full" />
                </span>
              </span>
              ดาวน์โหลด
            </button>
          )}

          <div className="flex shrink-0 items-center gap-4">
            <button
              type="button"
              onClick={onDecline}
              className={`${ANSWER} bg-[#efefef] transition-colors hover:bg-[#e2e2e2]`}
            >
              ไม่ยอมรับ
            </button>
            <button
              type="button"
              onClick={onAccept}
              className={`${ANSWER} bg-brand-red text-white transition-opacity hover:opacity-90`}
            >
              ยอมรับ
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
