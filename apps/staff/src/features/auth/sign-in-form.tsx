import { Button } from "@/components/button";
import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@bmhk-2026/client/auth-client";

import Loader from "@/components/loader";

function getOAuthErrorMessage(error: string) {
  if (error === "invalid_code") {
    return "Microsoft could not exchange the login code. Check the server logs, client secret, and redirect URI.";
  }

  if (error === "email_not_found") {
    return "Microsoft did not return an email address for this account.";
  }

  if (error === "oauth_provider_not_found") {
    return "Microsoft SSO is not configured on the server.";
  }

  return `Microsoft sign in failed: ${error}`;
}

function getInitialOAuthError() {
  if (typeof window === "undefined") {
    return null;
  }

  const error = new URLSearchParams(window.location.search).get("error");

  return error === null ? null : getOAuthErrorMessage(error);
}

export default function SignInForm() {
  const oauthError = useMemo(() => getInitialOAuthError(), []);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { isPending } = authClient.useSession();

  useEffect(() => {
    if (oauthError === null) {
      return;
    }

    toast.error(oauthError);
  }, [oauthError]);

  async function signInWithMicrosoft() {
    setIsSigningIn(true);
    const staffOrigin = window.location.origin;

    await authClient.signIn.social(
      {
        callbackURL: `${staffOrigin}/dashboard`,
        errorCallbackURL: `${staffOrigin}/login`,
        provider: "microsoft",
      },
      {
        onError: (error) => {
          setIsSigningIn(false);
          toast.error(error.error.message || error.error.statusText);
        },
      },
    );
  }

  if (isPending) {
    return <Loader />;
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-lg border border-border bg-muted">
            <Building2 aria-hidden="true" className="size-5" />
          </div>
          <h1 className="text-2xl font-semibold">Staff sign in</h1>
          <p className="text-sm text-muted-foreground">
            Use your KMUTT Microsoft account ending with @kmutt.ac.th.
          </p>
        </div>

        <Button
          type="button"
          className="h-10 w-full gap-2"
          disabled={isSigningIn}
          onClick={() => {
            void signInWithMicrosoft();
          }}
        >
          {isSigningIn ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <svg aria-hidden="true" className="size-4" viewBox="0 0 23 23">
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
          )}
          Continue with Microsoft
        </Button>

        {oauthError === null ? null : (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {oauthError}
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Access is limited to Bangmod Hackathon staff.
        </p>
      </div>
    </main>
  );
}
