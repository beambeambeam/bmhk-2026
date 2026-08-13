import { useEffect, useId, useRef, useState } from "react";
import type { HTMLAttributes } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { authClient } from "@bmhk-2026/client/auth-client";
import GoogleLogo from "./google-logo";

const LOGO = "/assets/figma/95f39e217dc710a779c3c0b6cf30b3a377d857f5.png";

/** `down_regular`. Rotated 180° for the open state rather than shipping `up_regular` too —
 *  see the note at the chevron below. */
const CHEVRON = "/assets/figma/da1c84a7a51ab6256b69963fbe9c03c1607713d3.svg";

/** `exit_regular`, exported from `1359:962` (the 24px desktop instance; `1359:1006` is the
 *  same glyph in a 20 box). Its vector is already filled #282828, i.e. `--color-ink`. */
const EXIT = "/assets/figma/a29d61982eb1fac51acc51eb2d3932c81530450d.svg";

const GLYPH_20_24 = "size-[calc(19.896px_+_4.104*var(--fl))]";

const PLATE_RADIUS = "rounded-[calc(19.896px_+_4.104*var(--fl))]";

const CHIP =
  "mm-press flex items-center justify-center gap-[calc(7.792px_+_8.208*var(--fl))] rounded-[12px] border border-[#dcdcdc] bg-white py-[calc(7.922px_+_3.078*var(--fl))] pr-4 pl-5 fl-20 leading-[1.4] transition-colors hover:bg-black/5 data-[open=true]:bg-[#f7f7f7] sm:data-[open=true]:rounded-t-[16px] sm:data-[open=true]:rounded-b-none";

const PANEL_PAD = "pr-4 pl-5";

const REVEAL_STEP = 70;

function useLogOut() {
  const navigate = useNavigate();
  return function handleLogOut() {
    void authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          void navigate({ to: "/signin" });
        },
      },
    });
  };
}

export default function AccountMenu({ className = "" }: { className?: string }) {
  const { data: session } = authClient.useSession();
  const logOut = useLogOut();
  const [open, setOpen] = useState(false);
  const id = useId();
  const chipId = `${id}-chip`;
  const menuId = `${id}-menu`;

  const rootRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLButtonElement>(null);

  const displayName = session?.user?.name ?? session?.user?.email ?? "ผู้ใช้งาน";

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      setOpen(false);
      chipRef.current?.focus();
    }

    function onPointerDown(event: PointerEvent) {
      const { target } = event;
      if (target instanceof Node && rootRef.current?.contains(target) === false) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("keydown", onKeyDown);
      document.addEventListener("pointerdown", onPointerDown);
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      itemRef.current?.focus();
    }
  }, [open]);

  return (
    <div ref={rootRef} className={`relative z-20 ${className}`}>
      <button
        ref={chipRef}
        type="button"
        id={chipId}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        data-open={open}
        onClick={() => {
          setOpen((was) => !was);
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
            return;
          }
          event.preventDefault();
          setOpen(true);
        }}
        className={CHIP}
      >
        <GoogleLogo />
        {/* Hidden below `sm` because Figma hides it on every 402 frame — see the file header. */}
        <span className="hidden sm:inline">{displayName}</span>
        <img
          src={CHEVRON}
          alt=""
          aria-hidden
          className={`${GLYPH_20_24} transition-transform duration-[var(--mm-fast)] ease-[var(--mm-ease)] motion-reduce:transition-none ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      <div
        id={menuId}
        role="menu"
        aria-labelledby={chipId}
        inert={!open}
        className={`absolute top-[calc(100%_+_10px)] right-0 grid w-max overflow-clip rounded-[16px] border border-[#dcdcdc] bg-white transition-[grid-template-rows,opacity] duration-[var(--mm-base)] ease-[var(--mm-ease-out)] motion-reduce:transition-none sm:top-full sm:right-0 sm:left-0 sm:w-auto sm:-mt-px sm:rounded-t-none ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 sm:pt-1">
          <div
            style={{
              "--reveal-delay": open ? `${REVEAL_STEP}ms` : "0ms",
            }}
            className={`transition-[translate] delay-[var(--reveal-delay)] duration-[var(--mm-fast)] ease-[var(--mm-ease-out)] motion-reduce:translate-y-0 motion-reduce:transition-none ${
              open ? "translate-y-0" : "translate-y-1.5"
            }`}
          >
            <span aria-hidden className="mr-4 ml-5 hidden h-px bg-[#dcdcdc] sm:block" />

            <button
              ref={itemRef}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logOut();
              }}
              className={`mm-press flex w-full items-center gap-2 ${PANEL_PAD} py-3 text-[calc(13.844px_+_6.156*var(--fl))] leading-[1.511] font-normal whitespace-nowrap text-ink transition-colors hover:bg-black/5 sm:pt-4`}
            >
              {/* Both dimensions are named, so there is no over-constrained inset for a
                  replaced element to discard — the failure mode `GoogleLogo` documents. */}
              <img src={EXIT} alt="" aria-hidden className={`${GLYPH_20_24} block shrink-0`} />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthTopBar({
  className = "",
  ...rest
}: { className?: string } & HTMLAttributes<HTMLElement>) {
  return (
    <header
      className={`flex items-center justify-between gap-4 ${PLATE_RADIUS} bg-white p-5 shadow-soft ${className}`}
      {...rest}
    >
      <Link to="/" className="mm-press shrink-0">
        <img
          src={LOGO}
          alt="BangMod Hackathon 2026"
          className="h-[calc(39.74px_+_10.26*var(--fl))] w-[calc(176.855px_+_45.145*var(--fl))] object-cover"
        />
      </Link>
      <AccountMenu className="shrink-0" />
    </header>
  );
}
