import { createFileRoute, redirect } from "@tanstack/react-router";

import SignInForm from "@/features/auth/sign-in-form";
import { authClient } from "@bmhk-2026/client/auth-client";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (session.data) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({
        to: "/dashboard",
      });
    }
  },
  component: SignInForm,
  ssr: false,
});
