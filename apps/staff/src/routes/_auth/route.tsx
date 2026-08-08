import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { StaffNavbar } from "@/components/staff-navbar";
import { authClient } from "@bmhk-2026/client/auth-client";

const STAFF_EMAIL_DOMAIN = "@kmutt.ac.th";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    const email = session.data?.user.email.toLowerCase();
    const isStaffEmail = email?.endsWith(STAFF_EMAIL_DOMAIN) === true;

    if (!isStaffEmail) {
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
  const { session } = Route.useRouteContext();

  return (
    <>
      <StaffNavbar role={session.data?.user.role} userName={session.data?.user.name} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </>
  );
}
