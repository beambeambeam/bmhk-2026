import { hasAdminAccess, hasRegistrationAccess } from "@bmhk-2026/auth/permission";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/dashboard")({
  beforeLoad: ({ context }) => {
    const role = context.session.data?.user.role ?? "user";

    if (hasAdminAccess(role)) {
      return;
    }

    // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
    throw redirect({
      to: hasRegistrationAccess(role) ? "/participations" : "/round1-staff-check",
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();

  return (
    <section className="space-y-2">
      <h1 className="text-3xl font-semibold">ยินดีต้อนรับ {session.data?.user.name ?? "ทีมงาน"}</h1>
    </section>
  );
}
