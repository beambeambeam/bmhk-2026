import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { AdminUserTable } from "@/features/admin/users";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { session } = Route.useRouteContext();

  return (
    <section className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>User Managments</CardTitle>
          <CardDescription>Manage user acess</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminUserTable actorId={session.data?.user.id} />
        </CardContent>
      </Card>
    </section>
  );
}
