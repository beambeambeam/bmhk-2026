import { createContext, useContext } from 'react'

/**
 * The upload toast's model, its context, and the one hook the rest of the app touches.
 *
 * Split out from the provider so nothing has to import a component to raise a toast:
 * form/Field.tsx needs `useToast` and the five state names, Toast.tsx needs the shape it
 * renders, and ToastProvider.tsx needs both plus the card. Keeping the types and the context
 * here is what makes that a tree instead of a cycle.
 */

/**
 * The five frames, one name each. Established from the frames themselves rather than
 * assumed — each is a 368-wide `Toast` frame on a 12 radius over white:
 *
 *   `uploading`  1359:1024  77 tall  #d79a4e  breathing disc + spinning ring   pause · dismiss
 *                           "กำลังอัปโหลด · 9.3 MB of 9.3 MB", progress bar at 66%
 *   `paused`     1359:1142  77 tall  #c0563e  the same disc, ring frozen       square · dismiss
 *                           "หยุดอัปโหลดแล้ว · 9.3 MB of 9.3 MB", bar held
 *   `success`    1359:1117  59 tall  #94b45e  drawn tick                       dismiss
 *                           "อัปโหลดสำเร็จ · 9.3 MB", no bar
 *   `failed`     1359:1161  59 tall  #c0563e  drawn warning triangle           retry · dismiss
 *                           "อัปโหลดไม่สำเร็จ · 1.0 MB of 9.3 MB", no bar
 *   `rejected`   1359:1185  59 tall  #c0563e  drawn warned document            dismiss
 *                           "รูปแบบไฟล์นี้ไม่รองรับ", no size, no bar
 *
 * `rejected` carries BOTH refusals. The frame set draws the wrong-type case and its copy
 * (1359:1193) but has no frame for a file that is over the limit, and the limit is real —
 * TeamStep's photo slot is 5 MB and every document slot is 10 MB. Rather than invent a sixth
 * frame, an over-size file gets 1359:1185's exact drawing with its own reason line, since the
 * two refusals are the same event to the user: the file never started moving. Called out in
 * the report.
 */
export type ToastKind = 'uploading' | 'paused' | 'success' | 'failed' | 'rejected'

/** Reasons that are Figma's own copy, so the strings live in one place. */
export const TOAST_REASON: Record<Exclude<ToastKind, 'rejected'>, string> = {
  uploading: 'กำลังอัปโหลด', // 1359:1101
  paused: 'หยุดอัปโหลดแล้ว', // 1359:1150
  success: 'อัปโหลดสำเร็จ', // 1359:1125
  failed: 'อัปโหลดไม่สำเร็จ', // 1359:1169
}

/** 1359:1193 — the drawn refusal. An over-size file overrides it with its own limit. */
export const TOAST_WRONG_TYPE = 'รูปแบบไฟล์นี้ไม่รองรับ'

export type ToastInput = {
  /**
   * Identity, and the whole of the de-duplication rule. A caller that pushes the same key
   * twice does not get a second card — the live one is re-timed and re-announced instead.
   * form/Field.tsx keys on slot + file name + byte length + why, so a user who picks the
   * same 40 MB PDF eight times in a row sees one toast eight times over rather than a
   * column of eight identical ones. It is also the handle `update` and `dismiss` take, which
   * is what lets a transfer mutate its own card from `uploading` through to `success`.
   */
  key: string
  kind: ToastKind
  /** Figma's title line, 1359:1030 — the file's own name, truncated rather than wrapped. */
  name: string
  /** bytes moved so far, and the file's length; both drive the caption and the bar */
  loaded?: number
  total?: number
  /** overrides `TOAST_REASON` / `TOAST_WRONG_TYPE` — used for the over-size limit copy */
  reason?: string
  /** the pause square on 1359:1024; absent means the control is not drawn */
  onPause?: () => void
  /** the square on 1359:1142 */
  onResume?: () => void
  /** the curved arrow on 1359:1161 */
  onRetry?: () => void
  /**
   * What the dismiss cross means on a card that is mid-transfer. On 1359:1024 and 1359:1142
   * the cross is the only control that can end the transfer — there is nothing else it could
   * mean — so a transfer toast passes an aborter here and the slot is emptied with it. On the
   * three settled states there is nothing to cancel and the cross only closes the card.
   */
  onCancel?: () => void
}

export type Toast = ToastInput & {
  /** render identity, stable for the life of the transfer so the card is never remounted */
  id: string
  /** flipped to `false` one frame before removal, which is what plays the exit */
  open: boolean
  /**
   * Incremented when a duplicate key is pushed. Nothing reads it for layout — it exists so
   * React re-runs the announcement for a repeat of an identical message, which an unchanged
   * live region would otherwise swallow.
   */
  bump: number
}

export type ToastApi = {
  /** raise a toast, or re-time and re-announce the one already holding this key */
  push: (toast: ToastInput) => void
  /** merge into a live toast; a no-op if it has already been dismissed */
  update: (key: string, patch: Partial<Omit<ToastInput, 'key'>>) => void
  /** begin the exit; the card is removed once it has played */
  dismiss: (key: string) => void
}

/**
 * How long each state holds the screen.
 *
 * The two transfer states are sticky (0). A transfer ends when it ends, and a progress card
 * that vanishes at four seconds while the bytes are still moving is worse than no card.
 * `success` gets the short end of the scale because the slot itself now shows the file, and
 * the two failures get roughly double because they carry an instruction — and in both cases
 * the reason is ALSO written into the slot's own caption line by Field.tsx, so nothing here
 * is the only chance to read it.
 */
export const TOAST_LIFE: Record<ToastKind, number> = {
  uploading: 0,
  paused: 0,
  success: 4000,
  failed: 7000,
  rejected: 7000,
}

/**
 * How many cards are visible at once. The rest of the queue waits its turn and its timer
 * does not start until it is on screen, so an overflowed toast still gets its full life.
 * Three is what fits above the mobile stack's own top offset without becoming a wall, and a
 * registration step has six upload slots, so overflow is a real case rather than a
 * theoretical one.
 */
export const TOAST_VISIBLE = 3

/**
 * A no-op default rather than a throw. `useFileSlot` lives in form/Field.tsx and is used by
 * both UploadBox and TeamStep's photo picker; making the provider a hard requirement would
 * mean any future render of a field outside the app shell — a test, an isolated page — dies
 * on a notification it did not ask for. The upload still works without a provider; it just
 * has nothing to say.
 */
const NOOP: ToastApi = { push: () => {}, update: () => {}, dismiss: () => {} }

export const ToastContext = createContext<ToastApi>(NOOP)

export function useToast() {
  return useContext(ToastContext)
}

/**
 * Figma prints "9.3 MB of 9.3 MB" (1359:1099) and "9.3 MB" (1359:1127) — one decimal, and
 * the same unit on both sides of the "of". Both are honoured: the unit is chosen from the
 * TOTAL and then applied to the part, so a transfer that has moved 40 KB of a 9.3 MB file
 * reads "0.0 MB of 9.3 MB" rather than switching units mid-sentence and appearing to shrink.
 *
 * 1024-based, to agree with the limit form/Field.tsx enforces (`maxMB * 1024 * 1024`). A
 * mebibyte limit reported in megabytes is how a 5.0 MB file gets refused for being over 5 MB.
 */
const KB = 1024
const MB = 1024 * KB

export function formatBytes(loaded: number | undefined, total: number | undefined) {
  if (total === undefined) return undefined
  const unit = total >= 0.1 * MB ? { div: MB, label: 'MB' } : { div: KB, label: 'KB' }
  const part = (n: number) => (n / unit.div).toFixed(1)
  return loaded === undefined || loaded >= total
    ? `${part(total)} ${unit.label}`
    : `${part(loaded)} ${unit.label} of ${part(total)} ${unit.label}`
}
