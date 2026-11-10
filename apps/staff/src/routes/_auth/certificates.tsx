import { hasRegistrationAccess } from "@bmhk-2026/auth/permission";
import { CertificatesPage } from "@/features/certificates/certificates-page";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/certificates")({
  beforeLoad: ({ context }) => {
    const role = context.session.data?.user.role;
    if (!hasRegistrationAccess(role)) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({ to: "/dashboard" });
    }
  },
  component: CertificatesPage,
});
