import { hasRegistrationAccess } from "@bmhk-2026/auth/permission";
import { Round2ConfirmationsPage } from "@/features/round2-confirmations/round2-confirmations-page";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/round2-confirmation")({
  beforeLoad: ({ context }) => {
    const role = context.session.data?.user.role;
    if (!hasRegistrationAccess(role)) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({ to: "/dashboard" });
    }
  },
  component: Round2ConfirmationRoute,
});

function Round2ConfirmationRoute() {
  const { session } = Route.useRouteContext();
  return <Round2ConfirmationsPage actorId={session.data?.user.id} />;
}
