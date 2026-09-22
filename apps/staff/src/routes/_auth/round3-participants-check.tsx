import { hasRegistrationAccess } from "@bmhk-2026/auth/permission";
import { ParticipantCheckInTable } from "@/features/participant-check-ins/participant-check-in-table";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/round3-participants-check")({
  beforeLoad: ({ context }) => {
    const role = context.session.data?.user.role;
    if (!hasRegistrationAccess(role)) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({ to: "/dashboard" });
    }
  },
  component: ParticipantCheckInPage,
});

function ParticipantCheckInPage() {
  const { session } = Route.useRouteContext();
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-base leading-snug font-medium">
          ลงทะเบียนเข้างานผู้เข้าร่วม (รอบที่ 3)
        </h1>
        <p className="text-sm text-muted-foreground">
          บันทึกการมาถึงและหมายเหตุของผู้เข้าร่วมงานรอบที่ 3 เฉพาะทีมที่ผ่านรอบที่ 2
        </p>
      </div>
      <ParticipantCheckInTable actorId={session.data?.user.id} round="ROUND_3" />
    </section>
  );
}
