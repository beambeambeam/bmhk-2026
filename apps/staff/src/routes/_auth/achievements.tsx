import { hasRegistrationAccess } from "@bmhk-2026/auth/permission";
import { AchievementsTable } from "@/features/achievements/achievements-table";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/achievements")({
  beforeLoad: ({ context }) => {
    const role = context.session.data?.user.role;
    if (!hasRegistrationAccess(role)) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AchievementsPage,
});

function AchievementsPage() {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-base leading-snug font-medium">ผลงานการแข่งขัน</h1>
        <p className="text-sm text-muted-foreground">
          อัปเดตผลงานการแข่งขันของทีม สำหรับสถานะการสมัครดูที่หน้าตรวจสอบผู้สมัครเข้าแข่งขัน
        </p>
      </div>
      <AchievementsTable />
    </section>
  );
}
