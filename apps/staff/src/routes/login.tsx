import { createFileRoute, redirect } from "@tanstack/react-router";

import SignInForm from "@/features/auth/sign-in-form";
import { authClient } from "@bmhk-2026/client/auth-client";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (session.data) {
      throw redirect({
        to: "/dashboard",
      });
    }
  },
  component: SignInForm,
  ssr: false,
});
