import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { orpc } from "@bmhk-2026/client/orpc";

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

  const privateData = useQuery(orpc.privateData.get.queryOptions());

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome {session.data?.user.name}</p>
      <p>API: {privateData.data?.message}</p>
    </div>
  );
}
