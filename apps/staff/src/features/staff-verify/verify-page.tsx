import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { orpc } from "@bmhk-2026/client/orpc";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { StaffVerifyStatus } from "./resolve-message";
import { resolveStaffVerifyMessage } from "./resolve-message";

interface StaffVerifyPageProps {
  readonly token: string;
}

type LinkOutcome =
  | { kind: "pending" }
  | { kind: "success"; status: StaffVerifyStatus }
  | { kind: "error" };

function StaffVerifyPage({ token }: StaffVerifyPageProps) {
  const { mutateAsync } = useMutation(orpc.staffDiscordLink.link.mutationOptions());
  const firedTokenRef = useRef<string | null>(null);
  const [outcome, setOutcome] = useState<LinkOutcome>({ kind: "pending" });

  useEffect(() => {
    // The token is single-use, so guard against React's dev-mode double
    // effect invocation (and any remount) firing the mutation twice for
    // the same token — a ref survives that double-invoke, state doesn't.
    if (firedTokenRef.current === token) {
      return;
    }
    firedTokenRef.current = token;

    // Track the result in local state instead of reading useMutation's own
    // isPending/data/isError: those reflect whichever render last subscribed
    // to the mutation observer, which can desync from the render that
    // actually fired it, leaving the UI stuck on the pending message forever.
    async function link(): Promise<void> {
      try {
        const data = await mutateAsync({ token });
        setOutcome({ kind: "success", status: data.status });
      } catch {
        setOutcome({ kind: "error" });
      }
    }

    void link();
  }, [mutateAsync, token]);

  const message = resolveStaffVerifyMessage({
    isError: outcome.kind === "error",
    isPending: outcome.kind === "pending",
    status: outcome.kind === "success" ? outcome.status : undefined,
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>เชื่อมบัญชี Discord</CardTitle>
          {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- CardDescription renders a div; role="status" announces the pending/success/error transition to assistive tech */}
          <CardDescription role="status">{message}</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}

export { StaffVerifyPage };
