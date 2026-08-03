import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "@bmhk-2026/client/auth-client";

const STAFF_EMAIL_DOMAIN = "@kmutt.ac.th";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    const email = session.data?.user.email.toLowerCase();

    if (email?.endsWith(STAFF_EMAIL_DOMAIN) !== true) {
      if (session.data) {
        await authClient.signOut();
      }

      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({
        to: "/login",
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
