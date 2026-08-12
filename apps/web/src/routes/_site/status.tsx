import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { getHealthCheckQueryOptions } from "@bmhk-2026/client/query-options";

export const Route = createFileRoute("/_site/status")({
  component: HomeComponent,
  head: () => ({
    meta: [{ content: "noindex, nofollow", name: "robots" }],
  }),
});

function HomeComponent() {
  const healthCheck = useQuery(getHealthCheckQueryOptions());
  let healthStatus = "Checking...";

  if (healthCheck.isError) {
    healthStatus = "Unable to reach API";
  } else if (!healthCheck.isPending) {
    healthStatus = healthCheck.data === "OK" ? "Connected" : "Disconnected";
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <div className="grid gap-6">
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">API Status</h2>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${healthCheck.data === "OK" ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-muted-foreground text-sm">{healthStatus}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
