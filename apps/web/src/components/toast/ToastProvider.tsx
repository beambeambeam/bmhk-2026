import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ToastViewport } from '../toasts'
import {
  ToastContext,
  TOAST_LIFE,
  TOAST_VISIBLE,
  type Toast,
  type ToastApi,
  type ToastInput,
} from './store'
import '../../styles/toast.css'

/**
 * The upload toasts' queue, their clocks, and the portal they render into.
 *
 * Imports styles/toast.css itself rather than relying on an `@import` in index.css, because
 * the toast track does not own index.css. Vite resolves a CSS import from a module into the
 * same bundled sheet, and every rule in it is unlayered, so it beats Tailwind's
 * `@layer utilities` regardless of which order the two sheets end up in — the cascade problem
 * micro-motion.css documents cannot bite here. Moving the line to index.css beside the other
 * four sheets is equivalent; see the report.
 *
 * ------------------------------------------------------------------------------- the portal
 *
 * `document.body`, and not the component tree. Four page roots, the wizard shell, the auth
 * backdrop and five decoration bands in this app carry `overflow-clip`, and several carry a
 * `view-transition-name` or a transform — any one of which becomes the containing block for a
 * `position: fixed` descendant and would crop or displace a toast raised from inside it. The
 * uploads all live inside the wizard shell, so this is not hypothetical. Portalling also keeps
 * the stack out of the ancestor chain of `.site-nav-band`, so nothing here can create a
 * backdrop root and kill the nav's progressive blur.
 */

/* how long the exit transition needs before the row can be removed — `--mm-fast` plus slack */
const EXIT_MS = 200

let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  /**
   * A committed mirror of the list, for the one thing an updater function must not do: run a
   * side effect. Dismissing an in-flight card has to ABORT the transfer as well as close the
   * card, and reading the payload out of a `setToasts` callback would fire that abort twice
   * under StrictMode's double invocation. Written in an effect, so it is always the last
   * committed list by the time a click can reach it.
   */
  const live = useRef<Toast[]>([])
  useEffect(() => {
    live.current = toasts
  }, [toasts])

  /**
   * Every pending clock, keyed the way the toasts are.
   *
   * `remaining` is the model rather than an end timestamp, because the whole point is that a
   * clock can be stopped and picked up again — on hover, on focus, and on the tab going to the
   * background. `timer` is only set while it is actually running.
   */
  const clocks = useRef(new Map<string, { remaining: number; startedAt: number; timer: number }>())
  /* one-shot removal timers, so a card cannot be torn out mid-exit or removed twice */
  const exits = useRef(new Map<string, number>())
  /* a pointer resting on the stack, focus inside it, or a hidden tab: all three hold the clocks */
  const held = useRef(false)

  const stopClock = useCallback((key: string) => {
    const clock = clocks.current.get(key)
    if (!clock) return
    window.clearTimeout(clock.timer)
    clocks.current.delete(key)
  }, [])

  /**
   * Starts the exit. Two steps and not one: the row is marked closed so toast.css can play the
   * transition, and only then is it removed.
   *
   * The removal is a TIMER and not a `transitionend` listener. `transitionend` is the tempting
   * version — it removes the row the instant the animation actually finishes, whatever its
   * duration — but it does not fire for a transition that never ran, it does not fire for one
   * the compositor discards, and it fires once per property so it needs filtering. Any of those
   * three leaves a dismissed card on screen for good. A timer cannot fail that way.
   *
   * It is NOT shortened under reduced motion, which an earlier pass had it doing. The card's
   * opacity transition is declared on the base rule precisely so that reduced motion keeps the
   * fade — paint is what that setting preserves, movement is what it drops — and cutting the
   * timer to zero would have deleted the row out from under a fade that was still running.
   */
  const dismiss = useCallback(
    (key: string) => {
      if (exits.current.has(key)) return // already leaving
      stopClock(key)

      /*
       * What the cross means on 1359:1024 and 1359:1142. Those two frames put the dismiss
       * beside a transfer that is still running, and there is nothing else it could mean than
       * "stop" — so closing one of them aborts the read and empties the slot (Field.tsx supplies
       * the aborter). Guarded on the kind rather than on the callback's presence: a transfer that
       * has already reached `success` must not have its file thrown away by a dismiss, and the
       * kind is the only fact that distinguishes the two.
       */
      const target = live.current.find((t) => t.key === key)
      if (target && (target.kind === 'uploading' || target.kind === 'paused')) target.onCancel?.()

      setToasts((prev) => prev.map((t) => (t.key === key ? { ...t, open: false } : t)))

      exits.current.set(
        key,
        window.setTimeout(() => {
          exits.current.delete(key)
          setToasts((prev) => prev.filter((t) => t.key !== key))
        }, EXIT_MS),
      )
    },
    [stopClock],
  )

  const dismissRef = useRef(dismiss)
  dismissRef.current = dismiss

  /**
   * (Re)starts a card's clock, unless it is sticky or the stack is being held.
   *
   * Called on push, on every state change (a transfer that reaches `success` starts a
   * four-second clock it did not have while it was in flight), and on release from a hold.
   */
  const startClock = useCallback(
    (key: string, life: number) => {
      stopClock(key)
      if (life <= 0) return // uploading and paused: sticky by design
      if (held.current) {
        clocks.current.set(key, { remaining: life, startedAt: 0, timer: 0 })
        return
      }
      clocks.current.set(key, {
        remaining: life,
        startedAt: performance.now(),
        timer: window.setTimeout(() => dismissRef.current(key), life),
      })
    },
    [stopClock],
  )

  /**
   * A card only gets a clock once it is ON SCREEN. Beyond `TOAST_VISIBLE` the queue holds the
   * overflow, and a toast that spent three seconds waiting its turn would otherwise arrive
   * with one second left to read. This runs after every list change and gives a clock to any
   * visible card that has not got one — which is exactly the promotion rule.
   */
  useEffect(() => {
    for (const toast of toasts.slice(0, TOAST_VISIBLE)) {
      if (!toast.open) continue
      if (clocks.current.has(toast.key)) continue
      if (exits.current.has(toast.key)) continue
      startClock(toast.key, TOAST_LIFE[toast.kind])
    }
  }, [toasts, startClock])

  const hold = useCallback(() => {
    if (held.current) return
    held.current = true
    for (const [key, clock] of clocks.current) {
      if (!clock.timer) continue
      window.clearTimeout(clock.timer)
      const spent = performance.now() - clock.startedAt
      clocks.current.set(key, {
        // never below a beat: releasing a hold should not instantly dissolve the card
        remaining: Math.max(600, clock.remaining - spent),
        startedAt: 0,
        timer: 0,
      })
    }
  }, [])

  const release = useCallback(() => {
    if (!held.current) return
    held.current = false
    for (const [key, clock] of clocks.current) {
      clocks.current.set(key, {
        remaining: clock.remaining,
        startedAt: performance.now(),
        timer: window.setTimeout(() => dismissRef.current(key), clock.remaining),
      })
    }
  }, [])

  /* a toast must not expire while the tab is in the background — there was nobody to read it */
  useEffect(() => {
    const onVisibility = () => (document.hidden ? hold() : release())
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [hold, release])

  /* every pending timer belongs to this provider and must not outlive it */
  useEffect(() => {
    const running = clocks.current
    const leaving = exits.current
    return () => {
      for (const clock of running.values()) window.clearTimeout(clock.timer)
      running.clear()
      for (const timer of leaving.values()) window.clearTimeout(timer)
      leaving.clear()
    }
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      /**
       * De-duplication lives here, and it is keyed rather than content-based: a caller that
       * pushes a key already on screen does not add a row. The live card takes the new
       * payload, its clock restarts, and `bump` increments — which remounts exactly that row
       * (see Toast.tsx) so the message is re-announced and the card visibly pulses. Eight
       * attempts at the same over-size file are one card, eight times.
       */
      push: (input: ToastInput) => {
        /*
         * A key that is mid-exit is revived rather than replaced. Without this, dismissing a
         * card and immediately re-picking the same file inside the 200ms exit window handed the
         * new toast to the OLD removal timer, which then deleted it — a message that vanishes a
         * fifth of a second after it appears, and only when the user is being quick.
         */
        const leaving = exits.current.get(input.key)
        if (leaving !== undefined) {
          window.clearTimeout(leaving)
          exits.current.delete(input.key)
        }

        setToasts((prev) => {
          const at = prev.findIndex((t) => t.key === input.key)
          if (at === -1) {
            return [...prev, { ...input, id: `toast-${++seq}`, open: true, bump: 0 }]
          }
          const next = [...prev]
          next[at] = { ...next[at], ...input, open: true, bump: next[at].bump + 1 }
          return next
        })
        /*
         * Drop the old clock and let the promotion effect above mint a new one. It does that
         * AFTER the commit, which is the only point at which two things this needs are both
         * known: the card's new kind (so the right life is used) and whether the card is on
         * screen at all (so a toast that pushed straight into the queue does not spend its
         * four seconds waiting for a slot).
         */
        stopClock(input.key)
      },

      /**
       * Merges into a live card. Silent when the key is gone, which is the correct answer for
       * a transfer whose toast the user has already dismissed — Field.tsx's read loop is
       * stopped by the aborter the dismiss calls, and any tick already in flight lands here
       * and does nothing.
       *
       * A patch that changes `kind` re-times the card: `uploading` (sticky) becoming `success`
       * is what starts the four-second clock, and it is the only place that transition happens.
       */
      update: (key, patch) => {
        setToasts((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)))
        /* same handover as `push`: a kind change is a life change, and the effect re-times it */
        if (patch.kind && live.current.find((t) => t.key === key)?.kind !== patch.kind) {
          stopClock(key)
        }
      },

      dismiss: (key) => dismissRef.current(key),
    }),
    [stopClock],
  )

  /*
   * A handle on the queue for driving the five states from a devtools console or a CDP session
   * — the toasts are otherwise only reachable by picking a real file, which no headless driver
   * can do, and the states are exactly what has to be verifiable.
   *
   * `import.meta.env.DEV` is the gate, and it is not decoration: Vite replaces the expression
   * with a literal, so in a production build this is `if (false)` and both the branch and the
   * property name are dropped by the minifier. Nothing is exported to `window` from a shipped
   * bundle. This was an ungated assignment before.
   */
  if (import.meta.env.DEV) {
    ;(window as unknown as { __toast?: ToastApi }).__toast = api
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <ToastViewport
            /* the queue is the tail; only the head is rendered, and only the head has a clock */
            toasts={toasts.slice(0, TOAST_VISIBLE)}
            onDismiss={(key) => dismissRef.current(key)}
            onHold={hold}
            onRelease={release}
          />,
          document.body,
        )}
    </ToastContext.Provider>
  )
}
