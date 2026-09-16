import { TeamGroupsAdminPage } from "@/features/admin/team-groups";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/admin/team-groups")({
  component: TeamGroupsAdminPage,
});
