import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { orpc } from "@bmhk-2026/client/orpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { StaffVerifyStatus } from "./resolve-message";
import { resolveStaffVerifyMessage } from "./resolve-message";

interface StaffVerifyPageProps {
  readonly staffUser: { email: string; name: string };
  readonly token: string;
}

type ConfirmPhase =
  | { kind: "cancelled" }
  | { kind: "link-error" }
  | { kind: "linked"; status: StaffVerifyStatus }
  | { kind: "linking" };

const LOADING_MESSAGE = "กำลังโหลดข้อมูล...";
const CANCELLED_MESSAGE = "ยกเลิกแล้ว หากต้องการเชื่อมบัญชี กรุณาใช้คำสั่ง /verifystaff อีกครั้ง";
const INVALID_TOKEN_MESSAGE = resolveStaffVerifyMessage({
  isError: false,
  isPending: false,
  status: "INVALID_TOKEN",
});

function StaffVerifyPage({ staffUser, token }: StaffVerifyPageProps) {
  const previewQuery = useQuery(orpc.staffDiscordLink.preview.queryOptions({ input: { token } }));
  const { mutateAsync } = useMutation(orpc.staffDiscordLink.link.mutationOptions());
  const [phase, setPhase] = useState<ConfirmPhase | null>(null);

  async function handleConfirm(): Promise<void> {
    setPhase({ kind: "linking" });
    try {
      const result = await mutateAsync({ token });
      setPhase({ kind: "linked", status: result.status });
    } catch {
      setPhase({ kind: "link-error" });
    }
  }

  function handleCancel(): void {
    setPhase({ kind: "cancelled" });
  }

  if (phase !== null) {
    const message =
      phase.kind === "cancelled"
        ? CANCELLED_MESSAGE
        : resolveStaffVerifyMessage({
            isError: phase.kind === "link-error",
            isPending: phase.kind === "linking",
            status: phase.kind === "linked" ? phase.status : undefined,
          });

    return <StatusCard message={message} />;
  }

  if (previewQuery.isPending) {
    return <StatusCard message={LOADING_MESSAGE} />;
  }

  if (previewQuery.isError || previewQuery.data.status === "INVALID_TOKEN") {
    return <StatusCard message={INVALID_TOKEN_MESSAGE} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>เชื่อมบัญชี Discord</CardTitle>
          <CardDescription>ยืนยันว่าบัญชีทั้งสองด้านล่างนี้ถูกต้องก่อนเชื่อมบัญชี</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">บัญชีทีมงาน</dt>
              <dd>
                {staffUser.name} ({staffUser.email})
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">บัญชี Discord</dt>
              <dd>{previewQuery.data.discordUsername}</dd>
            </div>
          </dl>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => {
                void handleConfirm();
              }}
            >
              ยืนยัน
            </Button>
            <Button className="flex-1" onClick={handleCancel} variant="outline">
              ยกเลิก
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusCard({ message }: { readonly message: string }) {
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
