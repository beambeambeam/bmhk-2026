import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { orpc } from "@bmhk-2026/client/orpc";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";

import { resolveStaffVerifyMessage } from "./resolve-message";

interface StaffVerifyPageProps {
  readonly token: string;
}

function StaffVerifyPage({ token }: StaffVerifyPageProps) {
  const linkMutation = useMutation(orpc.staffDiscordLink.link.mutationOptions());
  const { mutate } = linkMutation;

  useEffect(() => {
    mutate({ token });
  }, [mutate, token]);

  const message = resolveStaffVerifyMessage({
    isError: linkMutation.isError,
    isPending: linkMutation.isPending,
    status: linkMutation.data?.status,
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
