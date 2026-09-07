import { hasAdminAccess } from "@bmhk-2026/auth/permission";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { AchievementsTable } from "@/features/achievements/achievements-table";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/achievements")({
  beforeLoad: ({ context }) => {
    const role = context.session.data?.user.role;
    if (!hasAdminAccess(role) && role !== "staff") {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AchievementsPage,
});

function AchievementsPage() {
  return (
    <section className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>ผลงานการแข่งขัน</CardTitle>
          <CardDescription>
            อัปเดตผลงานการแข่งขันของทีม สำหรับสถานะการสมัครดูที่หน้ารายการสมัครแข่งขัน
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AchievementsTable />
        </CardContent>
      </Card>
    </section>
  );
}
