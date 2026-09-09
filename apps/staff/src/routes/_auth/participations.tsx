import { hasRegistrationAccess } from "@bmhk-2026/auth/permission";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { ParticipationTable } from "@/features/registration/participation-table";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/participations")({
  beforeLoad: ({ context }) => {
    const role = context.session.data?.user.role;
    if (!hasRegistrationAccess(role)) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({ to: "/dashboard" });
    }
  },
  component: ParticipationsPage,
});

function ParticipationsPage() {
  const { session } = Route.useRouteContext();
  const role = session.data?.user.role;
  const canReview = hasRegistrationAccess(role);

  return (
    <section className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>รายการสมัครแข่งขัน</CardTitle>
          <CardDescription>ตรวจสอบข้อมูลทีม สมาชิก อาจารย์ที่ปรึกษา และเอกสารที่ส่งสมัคร</CardDescription>
        </CardHeader>
        <CardContent>
          <ParticipationTable canReview={canReview} />
        </CardContent>
      </Card>
    </section>
  );
}
