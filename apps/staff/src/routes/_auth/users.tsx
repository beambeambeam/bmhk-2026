import { hasUserManagementAccess } from "@bmhk-2026/auth/permission";
import { AdminUserTable } from "@/features/admin/users";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/users")({
  beforeLoad: ({ context }) => {
    if (!hasUserManagementAccess(context.session.data?.user.role)) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({ to: "/dashboard" });
    }
  },
  component: UsersPage,
});

function UsersPage() {
  const { session } = Route.useRouteContext();

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-base leading-snug font-medium">จัดการผู้ใช้ในระบบ</h1>
        <p className="text-sm text-muted-foreground">จัดการสิทธิ์การเข้าถึงของผู้ใช้</p>
      </div>
      <AdminUserTable actorId={session.data?.user.id} actorRole={session.data?.user.role} />
    </section>
  );
}
