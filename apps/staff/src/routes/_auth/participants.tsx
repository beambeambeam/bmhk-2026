import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { ParticipantCheckInTable } from "@/features/participant-check-ins/participant-check-in-table";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/participants")({ component: ParticipantCheckInPage });

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
