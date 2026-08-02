import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { orpc } from "@bmhk-2026/client/orpc";
import { Button } from "@base-ui/react/button";
import { authClient } from "@bmhk-2026/client/auth-client";

export const Route = createFileRoute("/_auth/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();

  const privateData = useQuery(orpc.privateData.get.queryOptions());

  async function handleSignOut() {
    await authClient.signOut();
    await navigate({ to: "/login" });
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome {session.data?.user.name}</p>
      <p>API: {privateData.data?.message}</p>
      <Button
        className="p-2 bg-white rounded-md text-red-500 hover:bg-red-100 transition-all cursor-pointer"
        onClick={() => void handleSignOut()}
      >
        Sign out test
      </Button>
    </div>
  );
}
