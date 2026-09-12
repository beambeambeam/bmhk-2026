import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import {
  getStaffOverseersBacklogQueryOptions,
  getStaffOverseersListQueryOptions,
} from "@bmhk-2026/client/query-options";
import { useQuery } from "@tanstack/react-query";

import { StaffOverseersBacklogTable } from "./backlog-table";
import { StaffOverseerImportForm } from "./import-form";
import { StaffOverseersTable } from "./overseers-table";

function StaffOverseersAdminPage() {
  const overseersQuery = useQuery(getStaffOverseersListQueryOptions());
  const backlogQuery = useQuery(getStaffOverseersBacklogQueryOptions());

  return (
    <div className="flex flex-col gap-5">
      <StaffOverseerImportForm />

      <Card>
        <CardHeader>
          <CardTitle>Current overseers</CardTitle>
          <CardDescription>Every staff member currently assigned to a team group.</CardDescription>
        </CardHeader>
        <CardContent>
          <StaffOverseersTable overseers={overseersQuery.data ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backlog</CardTitle>
          <CardDescription>
            Rows imported before the matching staff account existed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StaffOverseersBacklogTable entries={backlogQuery.data ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

export { StaffOverseersAdminPage };
