import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import SignInForm from "@/features/auth/sign-in-form";
import { authClient } from "@bmhk-2026/client/auth-client";

const loginSearchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/login")({
  beforeLoad: async ({ search }) => {
    const session = await authClient.getSession();

    if (session.data) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({ href: search.redirect ?? "/dashboard" });
    }
  },
  component: SignInForm,
  ssr: false,
  validateSearch: loginSearchSchema,
});
