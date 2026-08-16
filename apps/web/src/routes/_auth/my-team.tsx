import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router";
import { client } from "@bmhk-2026/client/orpc";
import MyTeam from "@/features/dashboard/my-team";

export const Route = createFileRoute("/_auth/my-team")({
  beforeLoad: async () => {
    try {
      const status = await client.teamRegistrationStatus.get({});
      if (!status.teamId) {
        // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
        throw redirect({
          href: "/register",
        });
      }
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({
        href: "/register",
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <MyTeam />;
}
