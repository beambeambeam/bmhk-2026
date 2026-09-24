import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { hasStaffAccess } from "@bmhk-2026/auth/permission";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/sidebar";
import { authClient } from "@bmhk-2026/client/auth-client";

import { StaffSidebar } from "@/features/sidebar";

const STAFF_EMAIL_DOMAIN = "@kmutt.ac.th";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ context, location }) => {
    const session = await authClient.getSession();
    const email = session.data?.user.email.toLowerCase();
    const isStaffEmail = email?.endsWith(STAFF_EMAIL_DOMAIN) === true;

    if (!isStaffEmail) {
      if (session.data) {
        await authClient.signOut();
        context.queryClient.clear();
      }

      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({
        to: "/login",
      });
    }

    const role = session.data?.user.role ?? "user";
    if (!hasStaffAccess(role) && location.pathname !== "/wait-access") {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({
        to: "/wait-access",
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
    <SidebarProvider>
      <StaffSidebar role={session.data?.user.role} userName={session.data?.user.name} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <div className="w-full flex-1 p-4">
          <div className="w-full">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
