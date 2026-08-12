import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import MyTeam from "@/features/dashboard/my-team";

const myTeamSearchSchema = z.object({
  modal: z.string().optional(),
  status: z.string().optional(),
});

export const Route = createFileRoute("/_auth/my-team")({
  component: RouteComponent,
  validateSearch: myTeamSearchSchema,
});

function RouteComponent() {
  return <MyTeam />;
}
