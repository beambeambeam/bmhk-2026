import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { getParticipationListQueryOptions } from "@bmhk-2026/client/query-options";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

function ParticipationTable() {
  const query = useQuery(getParticipationListQueryOptions());
  const teams = query.data?.data ?? [];

  return (
    <Card>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={5}>Loading participations...</TableCell>
              </TableRow>
            ) : null}
            {query.isError ? (
              <TableRow>
                <TableCell className="text-destructive" colSpan={5}>
                  Unable to load participations.
                </TableCell>
              </TableRow>
            ) : null}
            {!query.isLoading && !query.isError && teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>No participations found.</TableCell>
              </TableRow>
            ) : null}
            {teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell className="font-medium">{team.name}</TableCell>
                <TableCell>{team.school}</TableCell>
                <TableCell>{team.memberCount}</TableCell>
                <TableCell>{team.registrationSubmittedAt ? "Submitted" : "Draft"}</TableCell>
                <TableCell>
                  <Button
                    render={<Link to="/participations/$teamId" params={{ teamId: team.id }} />}
                    size="sm"
                    variant="outline"
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export { ParticipationTable };
