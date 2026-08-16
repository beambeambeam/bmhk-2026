import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { ParticipationTable } from "@/features/registration/participation-table";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/participations")({
  beforeLoad: ({ context }) => {
    const role = context.session.data?.user.role;
    if (role !== "admin" && role !== "registrationStaff" && role !== "staff") {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({ to: "/dashboard" });
    }
  },
  component: ParticipationsPage,
});

function ParticipationsPage() {
  return (
    <section className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Participations</CardTitle>
          <CardDescription>
            Review competitor teams, participants, advisors, and submitted documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ParticipationTable />
        </CardContent>
      </Card>
    </section>
  );
}
