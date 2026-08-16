import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { StaffCheckInTable } from "@/features/staff-check-ins/staff-check-in-table";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/round1-staff-check")({
  beforeLoad: ({ context }) => {
    const role = context.session.data?.user.role;
    if (role !== "admin" && role !== "registrationStaff") {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({ to: "/dashboard" });
    }
  },
  component: StaffCheckInPage,
});

function StaffCheckInPage() {
  const { session } = Route.useRouteContext();

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>ลงทะเบียนเข้างานทีมงาน</CardTitle>
          <CardDescription>บันทึกการมาถึงของทีมงานที่ปฏิบัติงานหน้างาน</CardDescription>
        </CardHeader>
        <CardContent>
          <StaffCheckInTable actorId={session.data?.user.id} />
        </CardContent>
      </Card>
    </section>
  );
}
