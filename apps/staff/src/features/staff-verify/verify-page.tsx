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
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}

export { StaffVerifyPage };
