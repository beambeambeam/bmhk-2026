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
        <CardContent className="px-0 pb-2">
          <Card>
            <CardContent className="px-4">
              <AdminUserTable actorId={session.data?.user.id} />
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </section>
  );
}
