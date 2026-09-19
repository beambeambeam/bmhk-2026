import { Button } from "@/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import type { TeamWithGroup } from "@bmhk-2026/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { AssignGroupsDialog } from "./assign-groups-dialog";

const PAGE_SIZE = 25;

interface TeamGroupsTableProps {
  readonly teams: readonly TeamWithGroup[];
}

function TeamGroupsTable({ teams }: TeamGroupsTableProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = Math.max(1, Math.ceil(teams.length / PAGE_SIZE));
  const page = Math.min(pageIndex, pageCount - 1);
  const start = page * PAGE_SIZE;
  const visibleTeams = teams.slice(start, start + PAGE_SIZE);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <AssignGroupsDialog />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>School</TableHead>
            <TableHead>Group</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No teams have passed document review yet.
              </TableCell>
            </TableRow>
          ) : (
            visibleTeams.map((team) => (
              <TableRow key={team.id}>
                <TableCell>{team.index}</TableCell>
                <TableCell className="font-medium">{team.name}</TableCell>
                <TableCell>{team.school}</TableCell>
                <TableCell>
                  {team.group ? `[${team.group.index}] ${team.group.name}` : "Unassigned"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {teams.length > 0 && (
        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            Showing {start + 1}-{start + visibleTeams.length} of {teams.length} teams
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => {
                setPageIndex(page - 1);
              }}
            >
              <ChevronLeft aria-hidden="true" data-icon="inline-start" />
              Previous
            </Button>
            <span className="min-w-20 text-center text-muted-foreground">
              Page {page + 1} of {pageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= pageCount - 1}
              onClick={() => {
                setPageIndex(page + 1);
              }}
            >
              Next
              <ChevronRight aria-hidden="true" data-icon="inline-end" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { TeamGroupsTable };
