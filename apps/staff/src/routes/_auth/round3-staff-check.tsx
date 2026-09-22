import { hasStaffAccess } from "@bmhk-2026/auth/permission";
import { StaffCheckInTable } from "@/features/staff-check-ins/staff-check-in-table";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/round3-staff-check")({
  beforeLoad: ({ context }) => {
    const role = context.session.data?.user.role;
    if (!hasStaffAccess(role)) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({ to: "/dashboard" });
    }
  },
  component: StaffCheckInPage,
});

function StaffCheckInPage() {
  const { session } = Route.useRouteContext();

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-base leading-snug font-medium">ลงทะเบียนเข้างานทีมงาน (รอบที่ 3)</h1>
        <p className="text-sm text-muted-foreground">
          บันทึกการมาถึงของทีมงานที่ปฏิบัติงานหน้างานรอบที่ 3
        </p>
      </div>
      <StaffCheckInTable actorId={session.data?.user.id} round="ROUND_3" />
    </section>
  );
}
