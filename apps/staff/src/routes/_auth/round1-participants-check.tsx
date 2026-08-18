import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { ParticipantCheckInTable } from "@/features/participant-check-ins/participant-check-in-table";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/round1-participants-check")({
  beforeLoad: ({ context }) => {
    const role = context.session.data?.user.role;
    if (role !== "admin" && role !== "staff") {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({ to: "/dashboard" });
    }
  },
  component: ParticipantCheckInPage,
});

function ParticipantCheckInPage() {
  const { session } = Route.useRouteContext();
  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>ลงทะเบียนเข้างานผู้เข้าร่วม</CardTitle>
          <CardDescription>บันทึกการมาถึงและหมายเหตุของผู้เข้าร่วมงาน</CardDescription>
        </CardHeader>
        <CardContent>
          <ParticipantCheckInTable actorId={session.data?.user.id} />
        </CardContent>
      </Card>
    </section>
  );
}
