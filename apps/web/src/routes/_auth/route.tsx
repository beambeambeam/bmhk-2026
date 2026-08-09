import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "@bmhk-2026/client/auth-client";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({
        to: "/signin",
      });
    }
    return { session };
  },
  component: AuthLayout,
  ssr: false,
});

function AuthLayout() {
  return <Outlet />;
}
