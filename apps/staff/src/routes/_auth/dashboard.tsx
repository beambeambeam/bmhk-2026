import {
  hasAdminAccess,
  hasRegistrationAccess,
  hasRegistrationReviewAccess,
  hasStaffAccess,
} from "@bmhk-2026/auth/permission";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/dashboard")({
  beforeLoad: ({ context }) => {
    const role = context.session.data?.user.role ?? "user";

    if (hasAdminAccess(role)) {
      return;
    }

    let destination:
      | "/participations"
      | "/round1-participants-check"
      | "/round1-staff-check"
      | "/wait-access";
    if (hasRegistrationReviewAccess(role)) {
      destination = "/participations";
    } else if (hasRegistrationAccess(role)) {
      destination = "/round1-participants-check";
    } else if (hasStaffAccess(role)) {
      destination = "/round1-staff-check";
    } else {
      destination = "/wait-access";
    }

    // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
    throw redirect({ to: destination });
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
