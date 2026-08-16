import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { StaffCheckInTable } from "@/features/staff-check-ins/staff-check-in-table";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/staff")({
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
