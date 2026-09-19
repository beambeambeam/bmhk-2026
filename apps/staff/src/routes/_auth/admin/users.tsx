import { AdminUserTable } from "@/features/admin/users";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { session } = Route.useRouteContext();

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-base leading-snug font-medium">จัดการผู้ใช้</h1>
        <p className="text-sm text-muted-foreground">จัดการสิทธิ์การเข้าถึงของผู้ใช้</p>
      </div>
      <AdminUserTable actorId={session.data?.user.id} actorRole={session.data?.user.role} />
    </section>
  );
}
