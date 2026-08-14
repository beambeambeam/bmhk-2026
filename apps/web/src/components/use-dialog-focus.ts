import { useEffect, type RefObject } from 'react'

/**
 * How many dialogs currently want the page held still. A module-level count rather than a flag,
 * because the two sheets can overlap by one frame: `ResultModal` keeps itself mounted for a
 * 200ms exit, so a close-then-open inside that window would otherwise have the leaving sheet's
 * cleanup unlock the page under the arriving one.
 */
let locks = 0
/** the root's own inline `overflow` and `padding-right`, as they were before the first lock */
let restore: { overflow: string; paddingRight: string } | null = null

/**
 * Holds the page still while a dialog owns the screen.
 *
 * BOTH sheets did this with `document.body.style.overflow = 'hidden'`, and on this site that
 * does nothing at all. Overflow on `<body>` only propagates to the viewport while the ROOT's
 * own computed overflow is `visible` (CSS Overflow 3 §3.3), and index.css sets
 * `html { overflow-x: clip }` — measured on /my-team?modal=qualified, the root computes
 * `overflow: clip visible`, so the propagation is switched off and the declaration is inert.
 *
 * Measured with a real wheel event dispatched onto the scrim at 402x780 with the qualified
 * sheet open: `document.scrollingElement.scrollTop` went 0 → 300. The page behind the dialogue
 * scrolled, at every width, on both sheets. The same gesture now leaves it at 0.
 *
 * So the lock goes on the root, where it is the used value rather than a donated one. Two
 * details it has to get right:
 *
 *  - the gutter. Removing the scrollbar reflows the page a scrollbar's width narrower, which
 *    on a classic-scrollbar platform is a visible sideways jolt at the moment a dialogue opens.
 *    The width is measured (`innerWidth - clientWidth`) rather than assumed, so it is 0 on
 *    overlay-scrollbar platforms and exact everywhere else.
 *  - the restore. `overflow-x: clip` is what keeps every route from panning sideways, and it
 *    lives in the stylesheet — so the INLINE value is what is saved and put back, never a
 *    computed one. Writing `overflow: visible` back would have deleted the site's pan guard.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return

    const root = document.documentElement
    if (locks === 0) {
      restore = { overflow: root.style.overflow, paddingRight: root.style.paddingRight }
      const gutter = window.innerWidth - root.clientWidth
      root.style.overflow = 'hidden'
      if (gutter > 0) root.style.paddingRight = `${gutter}px`
    }
    locks += 1

    return () => {
      locks -= 1
      if (locks > 0 || !restore) return
      root.style.overflow = restore.overflow
      root.style.paddingRight = restore.paddingRight
      restore = null
    }
  }, [active])
}

/**
 * Selector for the things a dialog can hand the caret to. Deliberately narrow — the two
 * sheets that use this hook hold links, buttons and nothing else.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * The focus half of a modal: move the caret into the sheet when it opens, keep Tab inside
 * it, and hand focus back to whatever opened it on the way out.
 *
 * Both `PolicyModal` and `ResultModal` already declared `role="dialog" aria-modal="true"`
 * and locked body scroll, but neither moved focus — so a screen reader stayed on the page
 * behind the scrim and Tab walked straight out of the dialog into the form underneath it,
 * which is exactly the state `aria-modal` promises is impossible.
 *
 * The sheet itself takes the initial focus rather than its first control: these dialogues
 * lead with a heading, and focusing "ไม่ยอมรับ" or the close cross first reads as the
 * dialogue asking for an answer before it has said anything. `preventScroll` because the
 * sheet is mid-transform when this runs and letting the browser scroll it into view fights
 * the entrance.
 *
 * @param open  whether the dialog is being shown; the trap is only armed while true
 * @param sheet the dialog element — must carry `tabIndex={-1}` to be focusable
 */
export default function useDialogFocus(open: boolean, sheet: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return

    const opener = document.activeElement as HTMLElement | null
    const node = sheet.current
    node?.focus({ preventScroll: true })

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !node) return

      /* `offsetParent` is the cheapest "is this actually laid out" test that also catches the
         download button, which only exists on the rules document. Nothing here is
         `position: fixed`, so the usual caveat about that returning null does not apply. */
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      )
      if (items.length === 0) {
        e.preventDefault()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      // the sheet itself holds focus on open, so the first Tab has to be steered inwards
      if (!active || !node.contains(active) || active === node) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
        return
      }
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus?.({ preventScroll: true })
    }
  }, [open, sheet])
}
