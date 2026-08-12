import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { getPrivateDataQueryOptions } from "@bmhk-2026/client/query-options";

export const Route = createFileRoute("/_auth/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const role = session.data?.user.role ?? "user";
  const privateData = useQuery(getPrivateDataQueryOptions(session.data?.user.id, role !== "user"));

  if (role === "user") {
    return (
      <section className="space-y-3">
        <h1 className="font-semibold text-2xl">Dashboard</h1>
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <p className="font-medium">Waiting for staff access</p>
          <p className="mt-1 text-muted-foreground text-sm">
            You are signed in, but an admin needs to assign you a staff role before you can use
            staff tools.
          </p>
        </div>
      </section>
    );
  }

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
