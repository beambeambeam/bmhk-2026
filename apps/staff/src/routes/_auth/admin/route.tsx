import { authClient } from "@bmhk-2026/client/auth-client";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/admin")({
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (session.data?.user.role !== "admin") {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({
        to: "/dashboard",
      });
    }
  },
  component: Outlet,
});
