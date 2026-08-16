/* eslint-disable func-style, promise/avoid-new, no-await-in-loop, jsx-a11y/no-noninteractive-element-interactions */
/* oxlint-disable func-style */
/* oxlint-disable promise/avoid-new */
/* oxlint-disable react(react-compiler) */
/* oxlint-disable no-await-in-loop */
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions */
/* oxlint-disable jsx-a11y/no-noninteractive-element-to-interactive-role */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, ReactNode } from "react";
import { useToast } from "../toast/store";
import { useQuery } from "@tanstack/react-query";

/**
 * Figma's field primitives (708:1311 and its siblings). Every control is a rounded-12
 * box with a 0.8px #dcdcdc hairline and 12 of padding around an 18px line, and every
 * label pairs a 20px medium name with an 18px red asterisk on a 6 gap.
 *
 * The type in this file is written as explicit two-anchor ramps, NOT as the flat-px ranks it
 * used to use. The ranks have floors (`fl-18` bottoms out at 16, `fl-20` at 17) and Figma's
 * phone frame goes under them nearly everywhere here — labels are 14 (`1214:221`), upload
 * captions 12 (`1239:1312`), document rows 14 (`1239:1303`) — so the floors were rendering the
 * phone form 2–5px over frame on ~40 nodes per step, which is most of why /register read as
 * oversized on a phone. Every ramp below still resolves to its exact 1440 value at `--fl` = 1.
 *
 * The one place the floor STAYS is `BOX`, the control's own text — see its note.
 *
 * Focus used to snap: the border went red in one frame, on around twenty fields per entrant
 * step, and `focus:outline-none` had removed the platform's own ring without putting anything
 * in its place. 160ms is `--mm-fast` and the curve is `--mm-ease` — the same pair every other
 * hover and colour change in the app takes — and the 3px ring at 12% is opacity-only paint on
 * a `box-shadow`, so it costs no layout and restores the affordance the outline reset took.
 */
/*
 * The padding and the radius are two-anchor ramps rather than the 1440 values held flat.
 * `1214:223` / `1214:229` draw the control with 8 of padding on an 8 radius on the 402 frame
 * (a 34-tall box) against `708:1315` / `708:1321`'s 12 on 12 at 1440 (51 tall). Held at 12
 * the phone control was 8px taller than the frame's, twenty-odd times per entrant step, which
 * is most of why /register/entrant/1 reads as too big on a phone. Both land on 12.000 at
 * `--fl` = 1, so no 1440 control moves.
 *
 * The TYPE stays `fl-18` — the one deliberate size departure in this file. Figma's phone value
 * is 12 (`1214:224`) against 18 at 1440 (`708:1316`), and the rank holds 16 at the phone end.
 *
 * Not a judgement call about legibility: iOS Safari ZOOMS THE PAGE when a focused input's
 * font-size is under 16px, and it does not zoom back out. Every field on /register would punch
 * the layout to ~1.2x on tap and leave the page pannable sideways — the one thing the phone
 * work is under standing instruction never to do. 16px is the documented threshold, so this is
 * the floor doing exactly the job it exists for. The ramp above still shrinks the BOX itself to
 * the frame's 34-tall control, so the field's geometry is Figma's; only the glyphs inside it
 * are 4px larger than drawn.
 */
const FIELD_SHAPE = "rounded-[calc(7.896px_+_4.104*var(--fl))] p-[calc(7.896px_+_4.104*var(--fl))]";

const BOX = `w-full ${FIELD_SHAPE} border-[0.8px] border-[#dcdcdc] fl-18 leading-[normal] text-ink placeholder:text-gray-1 focus:border-brand-red focus:outline-none transition-[border-color,box-shadow] duration-[160ms] ease-[cubic-bezier(0.4,0,0.2,1)] focus:shadow-[0_0_0_3px_rgb(192_86_62_/_0.12)]`;

/**
 * Every 24px glyph in this file, as one ramp. Figma draws each of them at 16 on the 402 frames
 * and 24 at 1440:
 *
 *   the select / date chevron   `1214:231`  16  →  `708:1323`  24
 *   the "ล้าง" cross            `1239:1063` 16  →  `708:1300`  24
 *
 * The trailing chevron is why this matters beyond taste: it sits inside the control, so a 24
 * mark in a 34-tall box left 5px of clearance top and bottom where the frame draws 9.
 */
const GLYPH_16_24 = "size-[calc(15.792px_+_8.208*var(--fl))]";

/**
 * ...and the ones Figma draws at 20 on the phone: the upload arrow (`1243:1376`) and the team
 * photo's picture mark (`1214:214`, used from TeamStep), both 24 at 1440 (`708:1306`).
 */
export const GLYPH_20_24 = "size-[calc(19.896px_+_4.104*var(--fl))]";

/**
 * Figma ships the tick as a flat SVG export, but a tick is the one glyph in this flow that
 * marks a decision, so it is inlined here and drawn on instead — the stroke travels the path
 * in 260ms (`.auth-check-path` in styles/auth-motion.css). Geometry matches the export: a
 * 16-unit box, a 2-unit round stroke, the corner at the lower third.
 *
 * `drawn` is what decides whether it travels, and it must be false on mount. A consent row
 * arrives with a default already chosen, and a stroke that draws itself on page entry claims
 * the user decided something they have not touched — identically for ยอมรับ and ไม่ยอมรับ, all
 * rows at once, over the incoming step transition. Call sites pass `drawn` from a per-control
 * `touched` flag set in the change handler: static on arrival, drawn on a choice.
 */
/**
 * The tick's own two anchors, and they are a BOX-AND-GLYPH pair rather than one size. Figma
 * nests it: `1297:1522` is a 16 box holding a 12 tick on the 402 frame, `722:374` a 24 box
 * holding a 16 tick at 1440 — so the mark is 12 → 16 while the box it sits in is 16 → 24, and
 * ramping only one of the two is what makes a glyph overflow its own container. The box lives
 * at the call sites (TermsStep's consent square, TeamStep's caption slot); this is the mark.
 */
export const CHECK_MARK = "size-[calc(11.896px_+_4.104*var(--fl))]";

export function CheckMark({
  className = CHECK_MARK,
  drawn = false,
}: {
  className?: string;
  drawn?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        className={drawn ? "auth-check-path" : undefined}
        d="M3.5 8.5L6.5 11.5L12.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Drag state for a dashed drop target. `data-over` is what `.auth-drop` in auth-motion.css
 * reads; `dragenter`/`dragleave` fire per descendant, so the counter is what stops the state
 * flickering as the pointer crosses the icon and the caption inside the box.
 */
export function useDropTarget(onFile?: (file: File) => void) {
  const [depth, setDepth] = useState(0);

  return {
    "data-over": depth > 0,
    onDragEnter: (e: DragEvent) => {
      e.preventDefault();
      setDepth((d) => d + 1);
    },
    onDragLeave: () => {
      setDepth((d) => Math.max(0, d - 1));
    },
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
    },
    /*
     * `preventDefault` because the browser's own default for a file dropped anywhere on the
     * page is to *navigate to it*, which would throw away a half-filled registration. The
     * highlight is cleared unconditionally — a drop that is refused for size or type still
     * has to stop looking like it is mid-drag — and only then is the first file handed on.
     * One file: every box in the design is a single slot, and `files[1..]` would vanish
     * silently, which is worse than never taking it.
     */
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setDepth(0);
      const file = e.dataTransfer?.files?.[0];
      if (file !== undefined && file !== null) {
        onFile?.(file);
      }
    },
  };
}

/**
 * What a drop target and its `<input type="file">` share: the one file the slot holds, the
 * reason a file was refused, and a preview URL for the images.
 *
 * There is no backend in this project, so this is deliberately local state and nothing else —
 * no request, no progress, no id. The `<input>` is reset to '' after every pick so that
 * choosing the same file again after a refusal still fires `change`, and so the DOM never
 * disagrees with `file` about what the slot holds.
 *
 * `URL.createObjectURL` pins the whole blob in memory until it is revoked, and a registration
 * has seven of these slots across four steps: the previous URL is revoked on replace and on
 * clear, and the last one on unmount, via a ref because the cleanup runs once with the mount
 * closure and would otherwise revoke whatever `preview` was at mount (nothing).
 */
const FILE_KINDS = {
  image: {
    accept: "image/*",
    ok: (f: File) => f.type.startsWith("image/"),
    refuse: "รองรับเฉพาะไฟล์รูปภาพ",
  },
  pdf: {
    accept: "application/pdf",
    ok: (f: File) => f.type === "application/pdf",
    refuse: "รองรับเฉพาะไฟล์ PDF",
  },
};

/**
 * ------------------------------------------------------------------- the transfer, and why
 *
 * Figma's toast set (1359:1024, 1359:1142, 1359:1117, 1359:1161, 1359:1185) draws a transfer
 * with a progress bar, a pause and a retry — five states that need something to be actually
 * happening, and the note above is right that this project has no backend to make it happen.
 *
 * So the transfer is a real READ, not a fake request. The file is walked in chunks with
 * `Blob.slice().arrayBuffer()`, and `loaded` is bytes that genuinely came off the disk. That
 * buys three things a `setInterval` counting to 100 would not:
 *
 *  - the progress bar is honest. It is the same number the caption prints.
 *  - `failed` (1359:1161) is REACHABLE, and for a real reason. A `File` handle is a pointer
 *    into the filesystem: move, rename, delete or unmount the thing between the picker
 *    closing and the read finishing and the slice throws `NotReadableError`. That is exactly
 *    the "upload failed part-way" the frame draws, including a partial byte count to print in
 *    it, and it is the one failure a browser-only app can genuinely have. Nothing here ever
 *    fails at random — a registration form that sometimes rejects a good file on purpose
 *    would be hostile.
 *  - pause and resume are real. The loop parks between chunks, so the bar stops where the
 *    bytes stopped.
 *
 * `READ_PACE_MS` is the one deliberate lie, and it is pacing rather than data: 24 slices of a
 * 5 MB file resolve in well under 100ms total, which would make the in-flight state a single
 * flashed frame. Holding each tick to ~58ms puts a transfer at roughly 1.4s — long enough to
 * see, short enough that nobody is waiting on it — while every byte reported is still a byte
 * that was read. 24 slices is also what gives the bar its granularity: 4% a step, which at
 * 348 wide is 14px, comfortably more than the 1px that would make the transition pointless.
 */
const READ_CHUNKS = 24;
const READ_PACE_MS = 58;

async function wait(ms: number) {
  return await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * The live transfer's switches. `cancelled` and `paused` are flipped by the toast's own
 * controls; `superseded` is flipped by the slot when it is the one ending the transfer.
 *
 * The third exists because withdrawing an in-flight card runs the card's `onCancel`, and that
 * callback's whole job is to EMPTY the slot — right for the user pressing the cross, wrong when
 * the slot is tidying up after itself. Picking a second file supersedes the first, and if the
 * first card's cancel were allowed to run it would delete the file that had just been accepted.
 */
interface Transfer {
  cancelled: boolean;
  paused: boolean;
  superseded: boolean;
}

interface UseFileSlotProps {
  kind: keyof typeof FILE_KINDS;
  maxMB: number;
  onChange?: (file: File | null) => void;
}

// eslint-disable-next-line func-style
// oxlint-disable-next-line react(react-compiler)
// oxlint-disable-next-line eslint(func-style)
export function useFileSlot({ kind, maxMB, onChange }: UseFileSlotProps) {
  "use no memo";
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  const toast = useToast();
  /*
   * The slot's identity, and half of the toast's de-duplication key. A registration has seven
   * of these — six document boxes on an entrant step plus TeamStep's photo — and two of them
   * refusing the same file must be two messages, while ONE of them refusing it eight times
   * must be one. `useId` is stable across renders and unique per mounted slot, which is
   * exactly that distinction.
   */
  const slotId = useId();
  const transfer = useRef<Transfer | null>(null);
  /* the in-flight toast's key, so an unmounted slot can withdraw it; null once it has settled */
  const openKey = useRef<string | null>(null);
  /* the api is memoised in the provider, but the unmount cleanup must not close over a render */
  const dismissRef = useRef(toast.dismiss);
  useEffect(() => {
    dismissRef.current = toast.dismiss;
  });

  useEffect(
    () => () => {
      if (previewRef.current !== null && previewRef.current !== "") {
        URL.revokeObjectURL(previewRef.current);
      }
      /*
       * A transfer whose slot has gone is a claim about nothing: the wizard's steps unmount on
       * every hop and a 1.4s read easily outlives one. The read is stopped and its card
       * withdrawn — but only if it never settled, because a `success` the user has not read yet
       * is still worth saying and costs nothing to leave up.
       */
      if (transfer.current) {
        /* `superseded` so the withdrawal below does not try to setState on a gone component */
        transfer.current.superseded = true;
        transfer.current.cancelled = true;
      }
      transfer.current = null;
      if (openKey.current !== null && openKey.current !== "") {
        dismissRef.current(openKey.current);
      }
      openKey.current = null;
    },
    [],
  );

  function put(next: string | null) {
    if (previewRef.current !== null && previewRef.current !== "") {
      URL.revokeObjectURL(previewRef.current);
    }
    previewRef.current = next;
    setPreview(next);
  }

  /**
   * One transfer per slot, and one card per transfer.
   *
   * Stops whatever is running and withdraws its card. Both halves are needed and each was a
   * separate defect: a second pick that only stopped the loop left the first file's in-flight
   * toast on screen for good — it is sticky by design, and nothing was ever going to update it
   * again — while "ล้าง" pressed mid-transfer did the same. `superseded` is set first so the
   * withdrawal cannot re-enter through the card's own cancel.
   */
  function stopTransfer() {
    const ctl = transfer.current;
    const key = openKey.current;
    transfer.current = null;
    openKey.current = null;
    if (ctl) {
      ctl.superseded = true;
      ctl.cancelled = true;
    }
    if (key !== null && key !== "") {
      toast.dismiss(key);
    }
  }

  function empty() {
    stopTransfer();
    put(null);
    setFile(null);
    setError(null);
    onChange?.(null);
  }

  /** 1359:1024 — raise the in-flight card and walk the file. */
  // eslint-disable-next-line func-style
  // oxlint-disable-next-line eslint(func-style)
  function start(f: File) {
    "use no memo";
    /* whatever was in flight is now the previous file's business, and its card goes with it.
       On the RETRY path there is nothing to stop: the failed transfer already released both
       refs, so this is a no-op and the push below lands on the same key — which is what makes
       a retry re-time and redraw the card that is already there rather than raising a second. */
    stopTransfer();

    const ctl: Transfer = {
      cancelled: false,
      paused: false,
      superseded: false,
    };
    transfer.current = ctl;

    const key = `up:${slotId}:${f.name}:${f.size}`;
    openKey.current = key;
    toast.push({
      key,
      kind: "uploading",
      loaded: 0,
      name: f.name,
      /* The cross on an in-flight card is the only thing that can end the transfer, so it also
         empties the slot — cancelling an upload and being left holding the file would be a
         cross that did half its job. `superseded` is the one case it must not: there the slot
         is already holding the NEXT file and emptying would delete it. */
      onCancel: () => {
        ctl.cancelled = true;
        if (ctl.superseded) {
          return;
        }
        openKey.current = null;
        empty();
      },
    });

    void run(f, ctl, key);
  }

  /** the paced read. Every `return` past a `cancelled` check is a transfer that no longer owns
   *  its card, so it must not write to it — the card may already belong to the next file. */
  // eslint-disable-next-line func-style
  // oxlint-disable-next-line eslint(func-style)
  async function run(f: File, ctl: Transfer, key: string) {
    "use no memo";
    const step = Math.max(1, Math.ceil(f.size / READ_CHUNKS));
    let loaded = 0;

    try {
      while (loaded < f.size) {
        if (ctl.cancelled) {
          return;
        }
        /* parked, not busy-waiting: 90ms is imperceptible against a paused progress bar */
        while (ctl.paused) {
          // eslint-disable-next-line no-await-in-loop
          // oxlint-disable-next-line eslint(no-await-in-loop)
          await wait(90);
          if (ctl.cancelled) {
            return;
          }
        }

        // oxlint-disable-next-line react-compiler
        // eslint-disable-next-line react-compiler/react-compiler
        // eslint-disable-next-line react/react-compiler
        const started = performance.now();
        const end = Math.min(loaded + step, f.size);
        // eslint-disable-next-line no-await-in-loop
        // oxlint-disable-next-line eslint(no-await-in-loop)
        // the real read, and the only thing that throws
        await f.slice(loaded, end).arrayBuffer();
        if (ctl.cancelled) {
          return;
        }

        loaded = end;
        toast.update(key, { loaded });

        // oxlint-disable-next-line react-compiler
        // eslint-disable-next-line react-compiler/react-compiler
        // eslint-disable-next-line react/react-compiler
        const spent = performance.now() - started;
        if (spent < READ_PACE_MS) {
          // eslint-disable-next-line no-await-in-loop
          // oxlint-disable-next-line eslint(no-await-in-loop)
          await wait(READ_PACE_MS - spent);
        }
      }

      if (ctl.cancelled) {
        return;
      }
      transfer.current = null;
      openKey.current = null;
      /*
       * 1359:1117. The three controls are cleared explicitly and not left to fall through the
       * merge: a settled card that still carried `onCancel` would throw the accepted file away
       * the moment the user closed the success message.
       */
      toast.update(key, {
        kind: "success",
        loaded: f.size,
        onCancel: undefined,
        onPause: undefined,
        onResume: undefined,
      });
    } catch {
      if (ctl.cancelled) {
        return;
      }
      transfer.current = null;
      openKey.current = null;
      /* 1359:1161, with the partial count the frame prints and the curved arrow it draws */
      toast.update(key, {
        kind: "failed",
        loaded,
        onCancel: undefined,
        onPause: undefined,
        onResume: undefined,
        onRetry: () => {
          start(f);
        },
      });
    }
  }

  /**
   * a refused file leaves the slot as it was: losing an accepted file to a mis-drop is worse.
   *
   * Both refusals raise 1359:1185 as well as writing the caption line, and the two surfaces
   * say different things on purpose: the caption is the slot's standing state and survives, the
   * toast is the event and goes. The keys are prefixed per reason so a file that is both the
   * wrong type AND over-size cannot silently reuse the other's card — only the first test that
   * fails ever reports, but the keys must still not collide across slots or reasons.
   */
  // eslint-disable-next-line func-style
  // oxlint-disable-next-line eslint(func-style)
  function take(next: File | null | undefined) {
    if (!next) {
      return;
    }

    if (!FILE_KINDS[kind].ok(next)) {
      setError(FILE_KINDS[kind].refuse);
      /* Figma's own copy for this state (1359:1193); the caption keeps the more specific
         "รองรับเฉพาะไฟล์ PDF", which names what the box DOES take. */
      toast.push({
        key: `type:${slotId}:${next.name}:${next.size}`,
        kind: "rejected",
        name: next.name,
      });
      return;
    }

    if (next.size > maxMB * 1024 * 1024) {
      const refuse = `ไฟล์นี้มีขนาดเกิน ${maxMB} MB`;
      setError(refuse);
      /* no frame draws the over-size case, so it borrows 1359:1185's drawing and states its own
         limit — the same string the caption uses, so the two surfaces cannot disagree */
      toast.push({
        key: `size:${slotId}:${next.name}:${next.size}`,
        kind: "rejected",
        name: next.name,
        reason: refuse,
      });
      return;
    }

    /*
     * The slot fills immediately and the transfer runs behind it, which is why nothing about
     * UploadBox or TeamStep's rendering changes: the preview, the name and the caption all
     * behave exactly as they did. A read that fails leaves the file in place — the choice was
     * good, the read was not — and only an explicit cancel empties the slot.
     */
    put(next.type.startsWith("image/") ? URL.createObjectURL(next) : null);
    setFile(next);
    setError(null);
    onChange?.(next);
    start(next);
  }

  /* the drag highlight and the picker are the two ways into the same slot */
  const drop = useDropTarget(take);

  return {
    clear: empty,
    drop,
    error,
    file,
    inputProps: {
      accept: FILE_KINDS[kind].accept,
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        take(e.target.files?.[0]);
        e.target.value = "";
      },
      type: "file" as const,
    },
    preview,
  };
}
// eslint-enable func-style

/**
 * The values of one titled section, so its "ล้าง" can empty exactly its own fields and
 * nothing else. `empty` has to be a module constant: it is both the initial state and what
 * clearing restores, and a fresh object per render would make `clear` unstable for no reason.
 *
 * This is a `useState` record and not a form library on purpose — the flow has no submit, no
 * validation and no server (see the field-validation note in styles/auth-motion.css), so the
 * only thing state is needed for is being able to put it back.
 */
export function useFieldGroup<T extends Record<string, string>>(empty: T) {
  const [values, setValues] = useState(empty);

  return {
    /** spread onto a field: `<TextField label="ชื่อทีม" {...bind('name')} />` */
    bind: (key: keyof T) => ({
      onChange: (next: string) => {
        setValues((prev) => ({ ...prev, [key]: next }));
      },
      value: values[key],
    }),
    clear: () => {
      setValues(empty);
    },
  };
}

const ICON = "/assets/figma/";

export function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 leading-[normal]">
      <span className="text-[calc(13.844px_+_6.156*var(--fl))] leading-[normal] font-medium">
        {children}
      </span>
      {required === true && (
        <span className="text-[calc(13.896px_+_4.104*var(--fl))] leading-[normal] text-[#ea4335]">
          *
        </span>
      )}
    </span>
  );
}

/*
 * Every control is controlled, and `value`/`onChange` are required rather than optional: the
 * section headings carry a "ล้าง" that has to be able to empty them, and an uncontrolled field
 * added later would leave that button looking like it works and doing nothing — which is the
 * bug this pair exists to make impossible. `useFieldGroup` supplies both in one spread.
 */
interface BaseProps {
  label: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  value: string;
  onChange: (value: string) => void;
}

/** Figma's field group: label over control on an 8 gap. */
function FieldShell({
  label,
  required,
  className,
  children,
}: Omit<BaseProps, "value" | "onChange"> & { children: ReactNode }) {
  return (
    <label className={`flex flex-col items-start gap-2 ${className ?? ""}`}>
      <Label required={required}>{label}</Label>
      {children}
    </label>
  );
}

export function TextField({ label, required, placeholder, className, value, onChange }: BaseProps) {
  return (
    <FieldShell label={label} required={required} className={className}>
      <input
        type="text"
        placeholder={placeholder}
        className={BOX}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    </FieldShell>
  );
}

export function SchoolAutocompleteField({
  label,
  required,
  placeholder,
  className,
  value,
  onChange,
}: BaseProps) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [value]);

  const { data: schools = [] } = useQuery({
    enabled: debouncedValue.length >= 2,
    queryFn: async () => {
      if (!debouncedValue || debouncedValue.length < 2) {
        return [];
      }
      const res = await fetch(
        `https://api.comcamp.io/api/util/schools?q=${encodeURIComponent(debouncedValue)}`,
      );
      if (!res.ok) {
        return [];
      }
      const data: unknown = await res.json();
      if (Array.isArray(data) && data.every((item) => typeof item === "string")) {
        return data;
      }
      return [];
    },
    queryKey: ["schools", debouncedValue],
    staleTime: 60_000,
  });

  return (
    <FieldShell label={label} required={required} className={`relative ${className ?? ""}`}>
      <input
        type="text"
        placeholder={placeholder}
        className={BOX}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          setIsOpen(true);
        }}
        onBlur={() => {
          setIsOpen(false);
        }}
        autoComplete="off"
      />
      {isOpen &&
        schools.length > 0 && (
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
          <ul
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-[calc(7.896px_+_4.104*var(--fl))] border-[0.8px] border-[#dcdcdc] bg-white py-1 shadow-lg"
            onMouseDown={(e) => {
              e.preventDefault();
            }}
          >
            {schools.map((school, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="w-full text-left cursor-pointer px-[calc(7.896px_+_4.104*var(--fl))] py-[calc(5px_+_3*var(--fl))] text-[calc(13.844px_+_6.156*var(--fl))] text-ink transition-colors hover:bg-brand-red/5 hover:text-brand-red"
                  onClick={() => {
                    onChange(school);
                    setIsOpen(false);
                  }}
                >
                  {school}
                </button>
              </li>
            ))}
          </ul>
        )}
    </FieldShell>
  );
}

/**
 * Figma trails the date control with a calendar glyph.
 *
 * The three lengths of a trailing glyph have to move together or the control breaks: the mark
 * ramps 16 → 24 (`GLYPH_16_24`), its offset from the edge ramps 8 → 12 with the control's own
 * padding, and the reserved right padding is offset + mark + offset, i.e. 32 → 44. `pr-11` was
 * the 1440 figure and it reserved 44 of a 314-wide phone control for a mark that only needed
 * 32, so a long date string cleared the glyph by 12px more than the design allows.
 */
const TRAIL = "pr-[calc(31.688px_+_12.312*var(--fl))]";
const TRAIL_GLYPH = `pointer-events-none absolute top-1/2 right-[calc(7.896px_+_4.104*var(--fl))] -translate-y-1/2 ${GLYPH_16_24}`;

/**
 * TWO calendar icons, and why only one of them can simply be deleted.
 *
 * `<input type="date">` draws its own `::-webkit-calendar-picker-indicator` in Chrome and Safari,
 * so the control shipped with the browser's glyph AND Figma's `1214:231` mark beside it. Figma's
 * is the one to keep — but the native indicator is also the thing that OPENS the picker, and
 * Figma's is `pointer-events-none`, so hiding the native one outright would leave a date field
 * with a decorative icon and no way to pick a date except by typing.
 *
 * So the native indicator is made invisible and STRETCHED over the whole reserved trailing zone
 * instead: `opacity: 0` with the same 32 → 44 width `TRAIL` reserves. Figma's glyph sits on top
 * of it, the click still lands on the real control, and the hit area is now the whole glyph
 * region rather than the browser's own smaller box.
 *
 * Firefox draws no indicator at all, so it never had the duplicate and is unaffected.
 */
const NATIVE_PICKER = [
  "[&::-webkit-calendar-picker-indicator]:absolute",
  "[&::-webkit-calendar-picker-indicator]:inset-y-0",
  "[&::-webkit-calendar-picker-indicator]:right-0",
  "[&::-webkit-calendar-picker-indicator]:w-[calc(31.688px_+_12.312*var(--fl))]",
  "[&::-webkit-calendar-picker-indicator]:m-0",
  "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
  "[&::-webkit-calendar-picker-indicator]:opacity-0",
].join(" ");

// eslint-disable-next-line func-style
export function DateField({ label, required, placeholder, className, value, onChange }: BaseProps) {
  return (
    <FieldShell label={label} required={required} className={className}>
      <span className="relative w-full">
        <input
          type="date"
          placeholder={placeholder}
          className={`${BOX} ${TRAIL} ${NATIVE_PICKER}`}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        />
        <img
          src={`${ICON}e2f35dcd983d5c03887288d750b8cab9ac1c240b.svg`}
          alt=""
          aria-hidden
          className={TRAIL_GLYPH}
        />
      </span>
    </FieldShell>
  );
}

/** The only multi-line control in the design is 100 tall and top-aligned. */
// eslint-disable-next-line func-style
export function TextArea({ label, required, placeholder, className, value, onChange }: BaseProps) {
  return (
    <FieldShell label={label} required={required} className={`w-full ${className ?? ""}`}>
      <textarea
        placeholder={placeholder}
        className={`${BOX} h-[100px] resize-y`}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    </FieldShell>
  );
}

const EMPTY_OPTIONS: string[] = [];

// eslint-disable-next-line func-style
export function SelectField({
  label,
  required,
  placeholder,
  options = EMPTY_OPTIONS,
  className,
  value,
  onChange,
}: BaseProps & { options?: string[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <FieldShell label={label} required={required} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onBlur={() => {
          setIsOpen(false);
        }}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        className={`${BOX} ${TRAIL} appearance-none bg-white text-left relative block`}
      >
        <span className={`block w-full truncate ${value ? "text-ink" : "text-gray-1"}`}>
          {value || placeholder}
        </span>
        <img
          src={`${ICON}da1c84a7a51ab6256b69963fbe9c03c1607713d3.svg`}
          alt=""
          aria-hidden
          className={TRAIL_GLYPH}
        />
      </button>
      {isOpen &&
        options.length > 0 && (
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
          // oxlint-disable-next-line jsx-a11y(no-noninteractive-element-interactions)
          <ul
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-[calc(7.896px_+_4.104*var(--fl))] border-[0.8px] border-[#dcdcdc] bg-white py-1 shadow-lg"
            onMouseDown={(e) => {
              e.preventDefault();
            }}
          >
            {options.map((o) => (
              <li key={o}>
                <button
                  type="button"
                  className="w-full text-left cursor-pointer px-[calc(7.896px_+_4.104*var(--fl))] py-[calc(5px_+_3*var(--fl))] text-[calc(13.844px_+_6.156*var(--fl))] text-ink transition-colors hover:bg-brand-red/5 hover:text-brand-red"
                  onClick={() => {
                    onChange(o);
                    setIsOpen(false);
                  }}
                >
                  {o}
                </button>
              </li>
            ))}
          </ul>
        )}
    </FieldShell>
  );
}

/** Section heading with the "ล้าง" reset affordance from the design. */
export function SectionTitle({ title, onClear }: { title: string; onClear?: () => void }) {
  return (
    <div className="flex w-full items-start justify-between gap-4">
      {/* 20 @402 → 28 @1440. The low anchor was 24, read off the wizard's PAGE title
          (`1297:1465`, a 34-tall box) on the assumption that a section title matches it; it
          does not. `1214:206` and `1243:1371` are 28-tall boxes at 1.4, i.e. 20, against
          `708:1298`'s 39-tall box at 28 — so the phone drops a section heading two steps below
          its page heading, where this was rendering them one apart. 1440 is unchanged: the ramp
          still lands on 28.000 at `--fl` = 1. */}
      <h2 className="text-[calc(19.792px_+_8.208*var(--fl))] leading-[1.4] font-medium">{title}</h2>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          /* 14 -> 16, written out rather than taken from `fl-16`, whose floor is 15 and so was
             1px over the frame. `1239:1065` is 14 (get_design_context on `1214:204`) against
             `708:1302`'s 16. The gap ramps with the glyph: 4 on `1239:1062`, 8 on `708:1299`. */
          className="mm-press flex shrink-0 items-start gap-[calc(3.896px_+_4.104*var(--fl))] text-[calc(13.948px_+_2.052*var(--fl))] leading-[normal] text-gray-2 transition-colors hover:text-ink"
        >
          <img
            src={`${ICON}1b94090585ff7a3b45d6697db4f2aae8ed04747e.svg`}
            alt=""
            aria-hidden
            className={GLYPH_16_24}
          />
          ล้าง
        </button>
      )}
    </div>
  );
}

/**
 * The 500-wide dashed drop target that trails every document requirement.
 *
 * `kind` and `maxMB` default to what the hint copy says out loud — PDF, 10 MB — because a box
 * that accepts what its own caption rules out is the same broken promise as one that accepts
 * nothing. Pass all three together when a slot wants something else.
 *
 * The caption line does double duty: it is the size rule until a file is refused and the reason
 * afterwards, so a refusal cannot push the 100-tall box or its neighbours around, and a long
 * file name truncates rather than widening the row (the page must not scroll sideways).
 */
export function UploadBox({
  hint = "จำกัดขนาดเอกสารไม่เกิน 10 MB (PDF เท่านั้น)",
  kind = "pdf",
  maxMB = 10,
  onChange,
  file,
}: {
  from?: string;
  hint?: string;
  kind?: "image" | "pdf";
  maxMB?: number;
  onChange?: (file: File | null) => void;
  file?: File | null | string;
}) {
  /* six of these per entrant step, and none of them used to answer a drag at all */
  const slot = useFileSlot({ kind, maxMB, onChange });

  return (
    /*
     * 500 is Figma's width at 1440, where the card's content column is 960 — so the box is 52%
     * of it and the numbered requirement beside it gets the other 48%. Held at a hard 500 from
     * `lg` up it stopped being a share and became a wall: at 1024 the same column is 908, so the
     * box took 55% of it and left 376 for a paragraph that runs to four lines. The ramp keeps
     * the 1440 number exactly and reaches 436 at 1024, which is the same 48% for the text.
     */
    <div className="flex w-full shrink-0 flex-col items-start gap-3 lg:w-[calc(336px_+_164*var(--fl))]">
      {/*
       * Box and glyph together. `1243:1375` draws this target 80 tall with a 20 upload mark
       * (`1243:1376`) on the 402 frame; at 1440 it is 100 with a 24 mark. `h-[100px]` and
       * `size-6` were both the 1440 figures held flat, which on a phone put a desktop-size
       * glyph in a desktop-size box inside a card 354 wide — six of them per entrant step.
       * Both ramps land on their 1440 value exactly.
       */}
      <label
        {...slot.drop}
        className="auth-drop mm-press flex h-[calc(79.48px_+_20.52*var(--fl))] w-full cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[20px] border border-dashed border-[#dcdcdc] hover:border-brand-red"
      >
        {slot.preview !== null && slot.preview !== "" ? (
          /* the thumbnail stands in for the glyph, so it takes the glyph's own ramp scaled to
             the 40 Figma gives a held file — no node of its own, hence the shared expression */
          <img
            src={slot.preview}
            alt=""
            aria-hidden
            className="size-[calc(33.16px_+_6.84*var(--fl))] rounded-[8px] object-cover"
          />
        ) : (
          <img
            src={`${ICON}1c78acc4a5b86e58e5a95e29c657511e410afedf.svg`}
            alt=""
            aria-hidden
            className={GLYPH_20_24}
          />
        )}
        {/* 14 -> 16, written out (`fl-16` floors at 15): `1243:1378` is a 21-tall box, i.e. 14 at the 1.5
            this style is set at, against 16 at 1440. */}
        <span className="w-full truncate px-3 text-center text-[calc(13.948px_+_2.052*var(--fl))] leading-[normal] font-medium">
          {(() => {
            if (slot.file) {
              return slot.file.name;
            }
            if (typeof file === "string") {
              return file;
            }
            if (file) {
              return file.name;
            }
            return "อัปโหลดไฟล์";
          })()}
        </span>
        <input {...slot.inputProps} className="hidden" />
      </label>
      {/* 12 -> 16, written out: `1243:1379` is 12 on the phone frame against 16 at 1440. A hint
          under a control is the one caption that may go to 12 — it is not an input's own text,
          so the 16px iOS-zoom floor that pins `BOX` does not apply to it. */}
      <p
        aria-live="polite"
        className={`w-full truncate text-[calc(11.896px_+_4.104*var(--fl))] leading-[normal] ${slot.error !== null && slot.error !== "" ? "text-[#ea4335]" : "text-gray-1"}`}
      >
        {slot.error ?? hint}
      </p>
    </div>
  );
}

/**
 * Numbered document requirement plus its upload target, on Figma's 32 gap. The number
 * is a real `<ol>` marker so the 30 indent and the counter match the design exactly.
 */
export function DocumentRow({
  index,
  text,
  onChange,
  file,
  kind,
  hint,
  maxMB,
}: {
  index: number;
  text: string;
  onChange?: (file: File | null) => void;
  file?: File | null | string;
  kind?: "image" | "pdf";
  hint?: string;
  maxMB?: number;
}) {
  return (
    <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
      <ol start={index} className="min-w-0 flex-1 list-decimal">
        <li className="ms-[30px] text-[calc(13.844px_+_6.156*var(--fl))] leading-[normal] font-medium">
          {text}
        </li>
      </ol>
      <UploadBox onChange={onChange} file={file} kind={kind} hint={hint} maxMB={maxMB} />
    </div>
  );
}

/** Figma's 0.5px section rule. */
export function Separator() {
  return <div aria-hidden className="h-[0.5px] w-full shrink-0 bg-[#dcdcdc]" />;
}
