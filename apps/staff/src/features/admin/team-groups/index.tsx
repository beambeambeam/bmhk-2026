import { getTeamGroupsAdminListQueryOptions } from "@bmhk-2026/client/query-options";
import { useQuery } from "@tanstack/react-query";

import { TeamGroupsTable } from "./team-groups-table";

function TeamGroupsAdminPage() {
  const teamsQuery = useQuery(getTeamGroupsAdminListQueryOptions());

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-base leading-snug font-medium">Team groups</h1>
        <p className="text-sm text-muted-foreground">
          Every team that passed document review, and the Discord team group it&apos;s assigned to.
        </p>
      </div>
      <TeamGroupsTable teams={teamsQuery.data ?? []} />
    </div>
  );
}

export { TeamGroupsAdminPage };
