import { AdminUserTable } from "@/features/admin/users";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { session } = Route.useRouteContext();

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl">Admin</h1>
        <p className="text-muted-foreground text-sm">Manage staff access and registration roles.</p>
      </div>
      <AdminUserTable actorId={session.data?.user.id} />
    </section>
  );
}
