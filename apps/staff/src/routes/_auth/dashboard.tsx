import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { getPrivateDataQueryOptions } from "@bmhk-2026/client/query-options";

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
  const role = session.data?.user.role ?? "user";
  const privateData = useQuery(getPrivateDataQueryOptions(session.data?.user.id, role !== "user"));

  let apiStatus = privateData.data?.message ?? "Loading...";
  if (privateData.isError) {
    apiStatus = "Unable to load private data.";
  }

  return (
    <section className="space-y-2">
      <h1 className="font-semibold text-2xl">Dashboard</h1>
      <p className="text-muted-foreground">Welcome {session.data?.user.name}</p>
      <p className="text-sm">API: {apiStatus}</p>
    </section>
  );
}
