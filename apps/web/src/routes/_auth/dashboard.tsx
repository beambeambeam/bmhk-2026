import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { getPrivateDataQueryOptions } from "@bmhk-2026/client/query-options";

const dashboardSearchSchema = z.object({
  modal: z.string().optional(),
  status: z.string().optional(),
});

export const Route = createFileRoute("/_auth/dashboard")({
  component: RouteComponent,
  validateSearch: dashboardSearchSchema,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const privateData = useQuery(getPrivateDataQueryOptions(session.data?.user.id));

  let apiStatus = privateData.data?.message ?? "Loading...";
  if (privateData.isError) {
    apiStatus = "Unable to load private data.";
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome {session.data?.user.name}</p>
      <p>API: {apiStatus}</p>
    </div>
  );
}
