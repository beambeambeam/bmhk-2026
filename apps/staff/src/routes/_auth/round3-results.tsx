import { hasAcademicAccess } from "@bmhk-2026/auth/permission";
import { TeamRoundResultsPage } from "@/features/team-round-results/team-round-results-page";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/round3-results")({
  beforeLoad: ({ context }) => {
    const role = context.session.data?.user.role;
    if (!hasAcademicAccess(role)) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({ to: "/dashboard" });
    }
  },
  component: Round3ResultsRoute,
});

function Round3ResultsRoute() {
  const { session } = Route.useRouteContext();
  return <TeamRoundResultsPage actorId={session.data?.user.id} round="ROUND_3" />;
}
