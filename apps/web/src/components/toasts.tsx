import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  formatBytes,
  TOAST_REASON,
  TOAST_WRONG_TYPE,
  type Toast as ToastModel,
  type ToastKind,
} from './toast/store'
import {
  AlertGlyph,
  CheckGlyph,
  CloseGlyph,
  FileWarningGlyph,
  PauseGlyph,
  RetryGlyph,
  RingArc,
  StopGlyph,
  TransferDot,
} from './toast/icons'

/**
 * The upload toast — Figma 1359:1024 (uploading), 1359:1142 (paused), 1359:1117 (success),
 * 1359:1161 (failed) and 1359:1185 (refused) — and the viewport that stacks them.
 *
 * ============================================================== the two anchors, and Figma's
 *
 * All five frames are 368 wide, and there is no narrow variant of any of them in the file.
 * So there is exactly ONE anchor here: the 1440 column. Every number below that came from
 * Figma is that anchor's, and where a second anchor was needed it was CHOSEN, not read —
 * each choice is written out where it is made. That is a deliberate departure from the rest
 * of this codebase, where every `calc(MIN + DELTA * var(--fl))` has a measured frame at both
 * ends; inventing a phone frame's geometry would be worse than saying so.
 *
 * What is held flat at Figma's value, and why each is safe on a 402 viewport:
 *
 *   radius 12                    the frame's `cornerRadius`. Same 12 the fields land on at
 *                                1440 (Field.tsx's FIELD_SHAPE), and a floating card is not
 *                                a control the thumb has to fit inside.
 *   padding 10                   1359:1024's `paddingLeft/Top/Right/Bottom`. Already smaller
 *                                than the 8 the phone's own controls use.
 *   gaps 12 / 4 / 8              icon→text (1359:1208), reason→dot→size (1359:1100),
 *                                action→dismiss (1359:1116).
 *   ring 32, glyph 20, stroke 1  1359:1095 and its four siblings.
 *   action 28, its glyph 20      1359:1115.
 *   bar 6 tall on a 100 radius   1359:1205.
 *
 * What is NOT held flat is the card's WIDTH, because 368 in a 402 viewport leaves 17px of
 * gutter on each side and reads as a desktop card that happens to have shrunk. Below `md` the
 * card is full width inside a 12px inset (378 at 402, within 10px of Figma's own 368) and
 * from `md` up it is Figma's 368 exactly.
 *
 * Type is the repo's ladder rather than a new ramp, and it lands on Figma's numbers at 1440:
 * the title is 14/500 on a 21.154 line (1359:1030) → `fl-14` (14 at both ends) at
 * `leading-[1.511]`, and the status line is 12/400 on 18.132 (1359:1099, 1359:1101) →
 * `fl-12` at the same 1.511. Weight is never ramped and there is only one anchor to match, so
 * there is no breakpoint on it: `font-medium` on the title, normal on the status line.
 *
 * ---------------------------------------------------------------------------- the one addition
 *
 * None of the five frames carries an `effects` entry, i.e. Figma draws no shadow. A card that
 * floats over a live form with no shadow at all does not read as floating — it reads as
 * pasted into the page — so a restrained two-stop shadow in the card's own ink is added here.
 * It is the only value on this component that is not from Figma, and it is called out in the
 * report rather than buried.
 */

/* --------------------------------------------------------------------------- the card */

/** Which glyph the ring holds, per state. */
function KindGlyph({ kind }: { kind: ToastKind }) {
  if (kind === 'success') return <CheckGlyph />
  if (kind === 'failed') return <AlertGlyph />
  if (kind === 'rejected') return <FileWarningGlyph />
  /* 1359:1096 — both transfer states draw the same disc; only the ring's motion differs */
  return <TransferDot />
}

/**
 * The 32 ring — 1359:1095. Accent at 10% over white with a 1px INSIDE stroke at 20%, which
 * is `border` (Tailwind borders are inside the box) over a `bg`, both resolved from
 * `--toast-accent` so a state change tints rather than cuts.
 *
 * `relative` because `RingArc` overlays it, and the arc is `absolute inset-0 size-full` on an
 * inline `<svg>` — never an `<img>`, where the over-constrained `right` would be dropped and
 * the mark would render at its intrinsic size.
 */
function Ring({ kind }: { kind: ToastKind }) {
  return (
    <span className="toast-ring relative grid size-8 shrink-0 place-items-center rounded-full border border-[color-mix(in_srgb,var(--toast-accent)_20%,transparent)] bg-[color-mix(in_srgb,var(--toast-accent)_10%,transparent)] text-[var(--toast-accent)]">
      {(kind === 'uploading' || kind === 'paused') && <RingArc />}
      <KindGlyph kind={kind} />
    </span>
  )
}

/**
 * An icon-only control. `mm-press-icon` rather than a toast-local press rule: the tint and
 * the 10% scale it already carries are exactly this gesture, and a second vocabulary for one
 * press would be a defect.
 *
 * `chrome` is what separates the two kinds of control Figma draws. The pause / square / retry
 * buttons sit in a 28 circle of #f7f7f7 (1359:1115); the dismiss cross has no chrome at all
 * and is a bare 20 mark flush to the card's padding (1359:1139 at x 338 = 368 − 10 − 20). The
 * cross therefore gets its hit area from an `::after` that reaches 8px past the mark on every
 * side — 36×36, a real target — without adding a pixel to the layout Figma measured.
 */
function IconButton({
  label,
  onClick,
  chrome,
  className = '',
  children,
}: {
  label: string
  onClick: () => void
  chrome?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={
        chrome
          ? `mm-press-icon grid size-7 shrink-0 place-items-center rounded-full bg-[#f7f7f7] hover:bg-[#ededed] ${className}`
          : `mm-press-icon relative grid size-5 shrink-0 place-items-center after:absolute after:-inset-2 after:content-[''] ${className}`
      }
    >
      {children}
    </button>
  )
}

/**
 * One card.
 *
 * It is ONE element for the whole life of a transfer: `uploading` → `paused` → `uploading` →
 * `success` or `failed` all land on this same DOM node, because the alternative — dismissing
 * one card and raising another at the moment a transfer completes — is 340ms of churn and a
 * stack that shuffles for no reason the user can see. Three things carry the morph:
 *
 *   the accent    a variable, so `color`/`background-color`/`border-color` transition (toast.css)
 *   the height    77 → 59 when the bar goes, which is the progress row's 0fr collapse
 *   the glyph     `key={kind}` on the ring, so a NEW `<svg>` mounts and its draw-on plays
 *
 * That last one is the whole reason the ring is keyed. Without it React would keep the old
 * `<svg>` and swap its children, the CSS animation would never restart, and the tick would
 * simply appear — which is the one thing a mark that states an outcome must not do.
 */
function ToastCard({ toast, onDismiss }: { toast: ToastModel; onDismiss: () => void }) {
  const { kind, name, loaded, total } = toast
  const transferring = kind === 'uploading' || kind === 'paused'
  const reason = toast.reason ?? (kind === 'rejected' ? TOAST_WRONG_TYPE : TOAST_REASON[kind])

  /*
   * The card flips its own `data-state` a frame after mount, exactly as micro-motion.css
   * describes for the scrim and the sheet. It has to be the CARD and not the provider: a
   * transition needs a first painted frame in the `closed` state to run FROM, and a card that
   * is handed `open` in the same commit it mounts in has nothing to transition from and simply
   * appears.
   *
   * A double `requestAnimationFrame` rather than one. A single callback can still land inside
   * the frame that first paints the element in some engines, which collapses the transition;
   * the second is the frame after the paint, which is the guarantee. Cheap, and it is the
   * difference between an entrance and a pop.
   */
  const [shown, setShown] = useState(false)

  useEffect(() => {
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setShown(true))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [])

  /*
   * 1359:1185 has a size line in the frame tree but it sits outside its own row's bounds and
   * does not render — the frame prints the reason and nothing else. Honoured: a refusal shows
   * no byte count, because a file that never started moving has no count worth printing.
   */
  const size = kind === 'rejected' ? undefined : formatBytes(loaded, total)

  /* 1359:1206 is 230 of the 348 track, i.e. the frame is drawn at 66%. Live, it is bytes. */
  const ratio = total ? Math.min(1, Math.max(0, (loaded ?? 0) / total)) : 0

  return (
    <div
      data-kind={kind}
      /* both halves have to agree: `shown` is the post-mount frame, `open` is the provider
         withdrawing it. Either being false is the closed state, which is what makes the exit
         reverse an entrance that has not finished — the transition retargets from wherever the
         translate and the scale have actually reached rather than restarting from the offset. */
      data-state={toast.open && shown ? 'open' : 'closed'}
      /*
       * `alert` on the two states that report a problem, `status` on the three that report
       * progress — which is how one container carries both politeness levels. `role="alert"`
       * is implicitly assertive and `role="status"` implicitly polite, and the closest
       * ancestor with a live role governs, so an error escalates past the viewport's polite
       * region while a success stays inside it.
       */
      role={kind === 'failed' || kind === 'rejected' ? 'alert' : 'status'}
      aria-atomic="true"
      className="toast-card pointer-events-auto flex w-full flex-col rounded-[12px] bg-white p-[10px] shadow-[0_8px_24px_-6px_rgb(40_40_40_/_0.16),0_2px_6px_-2px_rgb(40_40_40_/_0.07)] md:w-[368px]"
    >
      {/* 1359:1208 / 1359:1212 / the three short frames' own row: icon · text · actions on a
          12 gap, centred on the cross axis. */}
      <div className="flex items-center gap-3">
        <Ring key={kind} kind={kind} />

        {/* 1359:1029 — a 39-tall column, title over status with no gap, centred. `min-w-0` is
            what lets both lines truncate instead of widening the card; a 60-character file
            name must not be able to push the page sideways. */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="truncate fl-14 leading-[1.511] font-medium text-ink">{name}</p>
          <p className="flex min-w-0 items-center gap-1 fl-12 leading-[1.511]">
            <span className="toast-reason shrink-0 text-[var(--toast-accent)]">{reason}</span>
            {size && (
              <>
                {/* 1359:1103 — a 2px #dcdcdc separator, not a typographic middle dot */}
                <span aria-hidden className="size-[2px] shrink-0 rounded-full bg-[#dcdcdc]" />
                {/*
                 * Hidden from the tree while the bytes are moving, and only while they are.
                 * The card is its own live region (`role="status"`/`role="alert"` above) and it
                 * is atomic, so a counter that rewrites itself two dozen times over 1.4s would
                 * have the whole card read out two dozen times. `role="progressbar"` below
                 * carries the same number for anyone who asks for it, and the moment the
                 * transfer settles this becomes visible again and is included in the one
                 * announcement that matters.
                 */}
                <span aria-hidden={transferring} className="truncate text-gray-2">
                  {size}
                </span>
              </>
            )}
          </p>
        </div>

        {/* 1359:1116 / 1359:1172 — the optional action, then the cross, on an 8 gap. */}
        <div className="flex shrink-0 items-center gap-2">
          {kind === 'uploading' && toast.onPause && (
            <IconButton chrome label={`หยุดอัปโหลด ${name}`} onClick={toast.onPause}>
              <PauseGlyph />
            </IconButton>
          )}
          {kind === 'paused' && toast.onResume && (
            /* 1359:1159 draws a square here. A square is the glyph; resuming is the only
               action a stopped transfer has left, since the cross beside it already ends it
               for good — so the mark is Figma's and the label says what it does. Flagged in
               the report as the one place the drawing and the behaviour are not the same
               word. */
            <IconButton chrome label={`อัปโหลด ${name} ต่อ`} onClick={toast.onResume}>
              <StopGlyph />
            </IconButton>
          )}
          {kind === 'failed' && toast.onRetry && (
            /* 1359:1184's own ink is #10161f rather than the cross's #282828 */
            <IconButton
              chrome
              label={`ลองอัปโหลด ${name} อีกครั้ง`}
              onClick={toast.onRetry}
              className="text-[#10161f]"
            >
              <RetryGlyph />
            </IconButton>
          )}
          <IconButton
            label={transferring ? `ยกเลิกการอัปโหลด ${name}` : `ปิดการแจ้งเตือน ${name}`}
            onClick={onDismiss}
            /* the cross has no chrome to tint, so its hover is the mark itself. `opacity` is
               already in `.mm-press-icon`'s transition list, so nothing new is timed here. */
            className="text-ink hover:opacity-60"
          >
            <CloseGlyph />
          </IconButton>
        </div>
      </div>

      {/*
       * 1359:1205 — the bar, and the 18px of card height that separates the two 77-tall
       * frames from the three 59-tall ones. The 12 gap is the row's own top padding rather
       * than a flex `gap`, because a `gap` does not collapse with its item and would leave
       * 12px of white under the text when the row closes.
       *
       * Rendered in every state, not just the two that show it — an element that is only
       * mounted when it is needed has nothing to collapse FROM, and the height would snap.
       *
       * THREE elements, and the middle one is a FIX rather than a wrapper for its own sake.
       *
       * `min-h-0` on the row is necessary — this element is a flex item of the card's column,
       * where `min-height: auto` would floor it at its own min-content height — but it was not
       * SUFFICIENT, and the difference was measured: at 375 a settled card was 71.27 tall with
       * `grid-template-rows` computing to `12px`, against the 59 that `1359:1117`, `1359:1161`
       * and `1359:1185` all draw. The collapse was removing the 6px bar and nothing else, i.e.
       * 6 of the 18 the note above claims.
       *
       * The floor was the grid ITEM's own `padding-top`. `min-height: 0` (toast.css,
       * `.toast-progress > *`) zeroes the item's CONTENT box; its padding still contributes to
       * the border-box minimum, so a `0fr` track containing a 12px-padded item resolves to
       * 12px, not 0. Proven both ways in the browser: clearing that padding took the track to
       * `0px` and the card to 59.27, and moving it onto an inner element did the same while
       * leaving the open row at `18px` / 77.27.
       *
       * So the grid item now carries nothing but the box, and the 12 gap lives one level in.
       * It still belongs INSIDE the collapsing row rather than on the card's flex `gap`, for
       * the reason the note above gives — a `gap` does not collapse with its item — and the
       * row's `overflow: clip` is what hides the padded child while the track is at 0.
       */}
      <div className="toast-progress min-h-0" data-open={transferring}>
        <div>
          <div className="pt-3">
            <div
              role="progressbar"
              aria-label={`ความคืบหน้าการอัปโหลด ${name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(ratio * 100)}
              /* the row is always mounted so it has something to collapse FROM, but a bar that
                 is closed is not a bar — hidden from the tree so a settled card does not report
                 a stale 100% to a screen reader that has no way to see it is gone */
              aria-hidden={!transferring}
              className="h-[6px] w-full overflow-clip rounded-full bg-[#f7f7f7]"
            >
              <div
                className="toast-fill h-full w-full rounded-full bg-[var(--toast-accent)]"
                style={{ scale: `${ratio} 1` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------------- the viewport */

/**
 * Reads the app's own motion tokens instead of restating their numbers.
 *
 * The stack's settle is a WAAPI animation, so its duration and curve cannot be written in
 * CSS — but they must be the SAME duration and curve as everything else that moves here, and
 * a hardcoded `220` beside `--mm-base` is exactly the parallel system this repo's stylesheets
 * are structured to avoid. Resolved once, lazily, on the first settle.
 */
let tokens: { duration: number; easing: string } | null = null

function motionTokens() {
  if (!tokens) {
    const style = getComputedStyle(document.documentElement)
    const base = parseFloat(style.getPropertyValue('--mm-base'))
    tokens = {
      duration: Number.isFinite(base) ? base : 220,
      easing: style.getPropertyValue('--mm-ease-out').trim() || 'cubic-bezier(0.16, 1, 0.3, 1)',
    }
  }
  return tokens
}

/**
 * Settles the stack when a card is removed from the middle of it.
 *
 * A flex column with a gap re-lays out in one frame, so dismissing the top of three toasts
 * teleports the other two upward. This is a FLIP: the previous top of every row is kept, the
 * new top is measured after the commit, and the difference is animated away from the old
 * position to zero. It is `transform` on the ROW, while the card inside the row owns its own
 * `translate`/`scale` for the entrance — two elements, so the settle and the arrival can never
 * overwrite each other, and a card that is arriving while its neighbour leaves does both.
 *
 * A layout effect with no dependency list, because FLIP has to measure inside the same frame
 * the browser lays out in, and the trigger is "the list changed" rather than any one value.
 * Progress ticks run through it too (~24 per transfer): three `getBoundingClientRect` calls
 * that find no delta and start nothing.
 *
 * Reduced motion records the positions and animates nothing. `grid-template-rows` was the
 * other candidate — micro-motion.css sanctions it for the two collapsibles — but its own note
 * says it is there because those cannot be done with a transform without distorting the text.
 * This one can, so it is.
 */
function useSettle(listRef: React.RefObject<HTMLOListElement | null>) {
  const tops = useRef(new Map<string, number>())
  const running = useRef(new Map<string, Animation>())

  /**
   * Measure, and animate away any row that moved since the last measurement.
   *
   * `animate` is false when this is only refreshing the record — see the transition listener
   * below for the case that needs it.
   */
  const sample = (animate: boolean) => {
    const list = listRef.current
    if (!list) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const next = new Map<string, number>()

    for (const child of Array.from(list.children)) {
      const row = child as HTMLElement
      const id = row.dataset.toastId
      if (!id) continue

      const top = row.getBoundingClientRect().top
      next.set(id, top)

      const was = tops.current.get(id)
      // sub-pixel deltas are float noise from the ramps, not movement
      if (!animate || reduce || was === undefined || Math.abs(was - top) < 0.5) continue

      // one settle per row: a second dismiss mid-settle must retarget, not compound
      running.current.get(id)?.cancel()
      const { duration, easing } = motionTokens()
      running.current.set(
        id,
        row.animate(
          [
            { transform: `translate3d(0, ${was - top}px, 0)` },
            { transform: 'translate3d(0, 0, 0)' },
          ],
          { duration, easing },
        ),
      )
    }

    // rows that have gone take their entries with them, so ids cannot leak
    for (const id of Array.from(running.current.keys())) {
      if (!next.has(id)) {
        running.current.get(id)?.cancel()
        running.current.delete(id)
      }
    }

    tops.current = next
  }

  /* No dependency list on purpose. FLIP has to measure inside the frame the browser lays out
     in, and the trigger is "the list changed" rather than any one value — a dependency array
     would let a render that moves a row slip past unrecorded and leave the next settle animating
     from a position that has not been true for four seconds. Progress ticks run through here too
     (~24 per transfer): three `getBoundingClientRect` calls that find no delta and start
     nothing. */
  useLayoutEffect(() => sample(true))

  /**
   * The one movement React never renders.
   *
   * A transfer reaching `success` collapses its progress row (toast.css), which is a 220ms CSS
   * transition — it moves every row below it by 18px without producing a single React render, so
   * the record above would go stale by exactly that and the NEXT dismiss would settle those rows
   * from 18px too low. Re-sampling when the collapse ends, without animating, is what keeps the
   * record honest through it.
   */
  useEffect(() => {
    const list = listRef.current
    if (!list) return

    const onEnd = (event: TransitionEvent) => {
      if (event.propertyName === 'grid-template-rows') sample(false)
    }
    list.addEventListener('transitionend', onEnd)

    const live = running.current
    return () => {
      list.removeEventListener('transitionend', onEnd)
      for (const animation of live.values()) animation.cancel()
      live.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listRef])
}

/**
 * The region the cards live in.
 *
 * POSITION. Below `md` the stack hangs from the TOP edge, full width inside a 12px inset;
 * from `md` up it is a bottom-right corner card at Figma's 368. Neither is in the file — no
 * frame in this set places a toast on a screen — so both were chosen, on two grounds:
 *
 *  - the keyboard. Every one of these toasts is raised from a form that has text fields above
 *    and below the upload box. A bottom-anchored toast on a phone sits exactly where the
 *    software keyboard opens, and a success message that is only visible when nothing is
 *    focused is not a message. The top edge is never occluded.
 *  - the nav. `.site-nav-band` is `fixed top-0` at `clamp(92px, 6.5510597vw + 65.6647399px,
 *    160px)` (Navbar.tsx), so the top inset is that same expression plus 12 — the toast clears
 *    the blur band at every width rather than at one. The wizard routes have no navbar, where
 *    the offset simply reads as headroom.
 *
 * The card ARRIVES FROM the edge it is anchored to and LEAVES the same way — `--toast-enter-y`
 * in toast.css is negative below `md` and positive above it, and the exit is the entrance
 * played backwards. That symmetry is the whole reason a dismiss feels like the inverse of an
 * arrival rather than a separate event.
 *
 * NO SIDEWAYS PAN. `inset-x-0` is `left: 0; right: 0`, which cannot exceed the viewport, and
 * every transform in play is on the Y axis only, so nothing here can widen the document. No
 * `overflow` is set because nothing overflows horizontally; no `contain`, `isolation`,
 * `filter` or ancestor `opacity` is set either, and the element is portalled to `<body>` so it
 * is not an ancestor of `.site-nav-band` in the first place — the nav's progressive blur is
 * untouched by construction.
 *
 * PAUSE ON HOVER. A pointer resting on the stack, or focus landing inside it, stops every
 * timer — all of them, not just the card under the cursor, because a column that dissolves
 * from underneath the one you are reading is the failure this is for. Keyboard users get the
 * same via focus capture, and a backgrounded tab gets it via `visibilitychange` in the
 * provider, so a toast cannot expire while nobody is looking at it.
 */
export function ToastViewport({
  toasts,
  onDismiss,
  onHold,
  onRelease,
}: {
  toasts: ToastModel[]
  onDismiss: (key: string) => void
  onHold: () => void
  onRelease: () => void
}) {
  const listRef = useRef<HTMLOListElement>(null)
  useSettle(listRef)

  return (
    <div
      role="region"
      aria-label="สถานะการอัปโหลดไฟล์"
      /* polite by default — success and progress. `additions` and not `all`: an in-flight
         card rewrites its byte count around two dozen times, and `text` would read every one
         of them out. The two error states carry `role="alert"` on the card itself, which
         escalates just those. */
      aria-live="polite"
      aria-relevant="additions"
      onPointerEnter={onHold}
      onPointerLeave={onRelease}
      onFocusCapture={onHold}
      onBlurCapture={onRelease}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col px-3 pt-[calc(clamp(92px,6.5510597vw_+_65.6647399px,160px)_+_12px)] md:inset-x-auto md:top-auto md:right-0 md:bottom-0 md:items-end md:p-4"
    >
      {/* a real list, so a screen reader is told how many messages there are. 8px between
          cards is chosen — the frames are drawn in isolation and never as a stack. */}
      <ol ref={listRef} className="flex w-full flex-col gap-2 md:w-[368px]">
        {toasts.map((toast) => (
          /*
           * `bump` is in the React key and `id` is not, which is the de-duplication rule
           * made visible. A second push of a live key does not add a row — it increments
           * `bump`, so this ONE row remounts: the card replays its entrance, its glyph
           * redraws, and the live region sees an addition and reads the message again.
           * Picking the same over-size file eight times therefore pulses one card eight
           * times instead of stacking eight identical ones.
           *
           * `data-toast-id` deliberately stays `id`, so the settle below tracks the row
           * across that remount and finds no delta rather than treating it as a new arrival.
           */
          <li key={`${toast.id}:${toast.bump}`} data-toast-id={toast.id} className="flex">
            <ToastCard toast={toast} onDismiss={() => onDismiss(toast.key)} />
          </li>
        ))}
      </ol>
    </div>
  )
}
