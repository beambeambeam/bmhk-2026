import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import z from "zod";
import { Card, CardContent } from "@/components/card";

import { authClient } from "@bmhk-2026/client/auth-client";
import { cn } from "@/lib/utils";

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
  const navigate = useNavigate({
    from: "/login",
  });
  const oauthError = useMemo(() => getInitialOAuthError(), []);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { isPending } = authClient.useSession();
  const form = useForm({
    defaultValues: {
      identifier: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      const identifier = value.identifier.trim();
      const isEmail = identifier.includes("@");
      const credentials = {
        password: value.password,
      };

      const response = isEmail
        ? await authClient.signIn.email({
            email: identifier,
            ...credentials,
          })
        : await authClient.signIn.username({
            username: identifier,
            ...credentials,
          });

      if (response.error) {
        toast.error(response.error.message ?? response.error.statusText);
        return;
      }

      toast.success("Sign in successful");
      await navigate({
        to: "/dashboard",
      });
    },
    validators: {
      onSubmit: z.object({
        identifier: z.string().trim().min(1, "Enter your email or username"),
        password: z.string().min(1, "Enter your password"),
      }),
    },
  });

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
      <Card>
        <CardContent>
          <div className="space-y-6">
            <div className="text-start">
              <h1 className="text-2xl font-semibold">Bangmod Hackthon 2026</h1>
              <p className="text-start text-xs text-muted-foreground">
                Access is limited to Bangmod Hackathon staff.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className={cn("h-10 w-full gap-2", isSigningIn && "cursor-wait opacity-50")}
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
              <p className="text-xs text-muted-foreground">
                Use your KMUTT Microsoft account ending with @kmutt.ac.th.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-muted-foreground text-xs">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
              }}
            >
              <form.Field name="identifier">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Email or username</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      autoComplete="username"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                      }}
                    />
                    {field.state.meta.errors.map((error) => (
                      <p key={error?.message} className="text-destructive text-sm">
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <form.Field name="password">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Password</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      autoComplete="current-password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                      }}
                    />
                    {field.state.meta.errors.map((error) => (
                      <p key={error?.message} className="text-destructive text-sm">
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <form.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ canSubmit, isSubmitting }) => (
                  <Button
                    type="submit"
                    className="h-10 w-full"
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                        Signing in
                      </>
                    ) : (
                      "Sign in with password"
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </form>

            {oauthError === null ? null : (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {oauthError}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
