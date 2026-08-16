import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { StaffTable } from "@/features/registration/staff-table";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/staff")({
  beforeLoad: ({ context }) => {
    const role = context.session.data?.user.role;
    if (role !== "admin" && role !== "registrationStaff") {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({ to: "/dashboard" });
    }
  },
  component: StaffRegistrationPage,
});

function StaffRegistrationPage() {
  return (
    <section className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Staff registration</CardTitle>
          <CardDescription>Review staff accounts and registration information.</CardDescription>
        </CardHeader>
        <CardContent>
          <StaffTable />
        </CardContent>
      </Card>
    </section>
  );
}
