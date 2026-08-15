import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@bmhk-2026/client/auth-client";
import { env } from "@bmhk-2026/env/web";
import AuthBackdrop, { PhoneAuthBackdrop } from "@/components/auth-backdrop";
import { useAuthNavigate, useOwnArrival } from "@/components/form/wizard-nav";
import GoogleLogo from "@/components/google-logo";
import { STACKED_ASPECT, StackedLockup } from "@/components/lockup";

export const Route = createFileRoute("/signin")({
  component: SignInRoute,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
  }),
});

let entrancePlayed = false;

function useArrivalEntrance() {
  // oxlint-disable-next-line react/hook-use-state
  const [play] = useState(() => !entrancePlayed);
  useEffect(() => {
    entrancePlayed = true;
  }, []);
  return play;
}

const PANEL_W = "calc(69.6px + 624.4 * var(--fl))";

const PANEL: React.CSSProperties = {
  height: "calc(98.6px + 885.4 * var(--fl))",
  width: PANEL_W,
};

const PANEL_STAGE = {
  "--signin-panel-scale": `tan(atan2(${PANEL_W}, 694px))`,
  scale: "var(--signin-panel-scale)",
  transformOrigin: "top left",
} as React.CSSProperties;

function SignInRoute() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const firstArrival = useArrivalEntrance();
  const own = useOwnArrival();
  const entrance = firstArrival && own;

  const navigate = useNavigate();
  const go = useAuthNavigate();
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const isLoading = isSigningIn || isSessionPending || isChecking || !!session?.user;

  useEffect(() => {
    if (session?.user) {
      const checkRegistration = async () => {
        setIsChecking(true);
        try {
          const res = await fetch(`${env.VITE_SERVER_URL}/api-reference/teamRegistrationStatus/get`, {
            credentials: "include",
          });
          if (res.ok) {
            const data = await res.json();
            if (data.isComplete) {
              navigate({ to: "/dashboard" });
            } else {
              go("/register", "gate");
            }
          } else {
            go("/register", "gate");
          }
        } catch {
          go("/register", "gate");
        }
      };
      void checkRegistration();
    }
  }, [session?.user, navigate, go]);

  async function handleGoogleSignIn() {
    setIsSigningIn(true);
    await authClient.signIn.social(
      {
        callbackURL: `${window.location.origin}/signin`,
        errorCallbackURL: `${window.location.origin}/signin`,
        provider: "google",
      },
      {
        onError: (error) => {
          setIsSigningIn(false);
          toast.error(error.error.message || error.error.statusText);
        },
      },
    );
  }

  return (
    <div
      data-auth-entrance={entrance || undefined}
      className="relative min-h-dvh overflow-clip bg-white"
    >
      <PhoneAuthBackdrop />

      <div className="relative flex min-h-dvh flex-col items-center justify-center gap-10 px-6 py-5 md:flex-row md:gap-[calc(22.543px_+_57.457*var(--fl))] md:p-5">
        <div className="flex w-full flex-1 flex-col items-start justify-center gap-[calc(23.063px_+_36.937*var(--fl))] md:pl-[calc(80*var(--fl))]">
          <Link
            to="/"
            data-rise={0}
            className="auth-rise auth-rise-sm mm-press flex w-full items-center gap-[calc(7.948px_+_2.052*var(--fl))] text-[calc(15.896px_+_4.104*var(--fl))] leading-[1.4] transition-opacity hover:opacity-70"
          >
            <img
              src="/assets/figma/ea51a69c788a5d0d5d7479c1fff987eee5a19fe5.svg"
              alt=""
              aria-hidden
              className="size-[calc(19.896px_+_4.104*var(--fl))]"
            />
            หน้าหลัก
          </Link>

          <div className="flex w-full flex-col items-center gap-[calc(23.792px_+_8.208*var(--fl))] text-center md:items-stretch md:text-left">
            <div
              data-rise={1}
              className="auth-rise auth-rise-sm relative aspect-[5/4] w-[90.3955%] max-w-[320px] md:hidden"
            >
              <div
                style={{ aspectRatio: STACKED_ASPECT }}
                className="absolute top-[1.956%] left-[2.1875%] w-[97.1875%]"
              >
                <StackedLockup />
              </div>
            </div>

            <img
              src="/assets/figma/95f39e217dc710a779c3c0b6cf30b3a377d857f5.png"
              alt="BangMod Hackathon 2026"
              data-rise={1}
              className="auth-rise auth-rise-sm hidden h-[calc(63.584px_+_16.416*var(--fl))] w-[calc(282.58px_+_73.42*var(--fl))] max-w-full object-cover md:block"
            />

            <div
              data-rise={2}
              className="auth-rise auth-rise-sm flex w-full flex-col gap-[calc(5.844px_+_6.156*var(--fl))]"
            >
              <h1 className="w-full text-[calc(23.792px_+_8.208*var(--fl))] leading-[normal] font-semibold tracking-[0.374px] md:font-bold">
                สมัครเข้าแข่งขัน
              </h1>
              <p className="w-full text-[calc(15.896px_+_4.104*var(--fl))] leading-[normal] text-gray-2">
                กรุณาใช้บัญชี Google ในการสมัครเข้าแข่งขัน
              </p>
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                void handleGoogleSignIn();
              }}
              data-rise={3}
              className="auth-rise auth-rise-sm mm-press flex h-[calc(44.61px_+_15.39*var(--fl))] w-full items-center justify-center gap-[calc(15.896px_+_4.104*var(--fl))] rounded-[20px] bg-[#f6f6f6] px-6 py-[calc(9.844px_+_6.156*var(--fl))] font-display text-[calc(15.896px_+_4.104*var(--fl))] leading-[normal] font-semibold transition-colors hover:bg-[#ececec] disabled:opacity-50"
            >
              <GoogleLogo />
              {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วย Google"}
            </button>
          </div>
        </div>

        <div style={PANEL} className="relative hidden shrink-0 md:block">
          <div
            style={PANEL_STAGE}
            className="signin-panel-stage absolute top-0 left-0 h-[984px] w-[694px]"
          >
            <AuthBackdrop />
          </div>
        </div>
      </div>
    </div>
  );
}
