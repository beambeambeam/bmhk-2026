import { authClient } from "@bmhk-2026/client/auth-client";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { StaffVerifyPage } from "@/features/staff-verify/verify-page";

const verifyStaffSearchSchema = z.object({ token: z.string().min(1) });

export const Route = createFileRoute("/verifystaff")({
  beforeLoad: async ({ search }) => {
    const session = await authClient.getSession();

    if (!session.data) {
      const redirectTarget = `/verifystaff?token=${encodeURIComponent(search.token)}`;
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({ href: `/login?redirect=${encodeURIComponent(redirectTarget)}` });
    }
  },
  component: VerifyStaffRoute,
  ssr: false,
  validateSearch: verifyStaffSearchSchema,
});

function VerifyStaffRoute() {
  const { token } = Route.useSearch();
  return <StaffVerifyPage token={token} />;
}
