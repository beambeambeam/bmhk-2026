import { createFileRoute } from "@tanstack/react-router";
import MyTeam from "@/features/dashboard/my-team";

export const Route = createFileRoute("/_auth/my-team")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MyTeam />;
}
