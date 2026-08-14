import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/dashboard")({
  beforeLoad: ({ context }) => {
    const role = context.session.data?.user.role ?? "user";

    if (role === "user") {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({
        to: "/wait-access",
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();

  return (
    <section className="space-y-2">
      <h1 className="text-3xl font-semibold">Welcome, {session.data?.user.name}</h1>
    </section>
  );
}
