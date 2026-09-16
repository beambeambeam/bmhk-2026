import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { getTeamGroupsAdminListQueryOptions } from "@bmhk-2026/client/query-options";
import { useQuery } from "@tanstack/react-query";

import { TeamGroupsTable } from "./team-groups-table";

function TeamGroupsAdminPage() {
  const teamsQuery = useQuery(getTeamGroupsAdminListQueryOptions());

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Team groups</CardTitle>
          <CardDescription>
            Every team that passed document review, and the Discord team group it&apos;s assigned
            to.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamGroupsTable teams={teamsQuery.data ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

export { TeamGroupsAdminPage };
