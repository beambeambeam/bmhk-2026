import { Button } from "@/components/button";
import { DataTable } from "@/components/table/index";
import type { DataTableColumn } from "@/components/table/index";
import type { TeamWithGroup } from "@bmhk-2026/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { AssignGroupsDialog } from "./assign-groups-dialog";

const PAGE_SIZE = 25;

const columns: DataTableColumn<TeamWithGroup>[] = [
  { accessorKey: "index", header: "#", size: 80 },
  { accessorKey: "name", header: "Team", meta: { cellClassName: "font-medium" }, size: 240 },
  { accessorKey: "school", header: "School", size: 320 },
  {
    cell: ({ row }) =>
      row.original.group
        ? `[${row.original.group.index}] ${row.original.group.name}`
        : "Unassigned",
    header: "Group",
    id: "group",
    size: 200,
  },
];

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
      <DataTable
        columns={columns}
        data={visibleTeams}
        getRowId={(team) => team.id}
        emptyMessage="No teams have passed document review yet."
      />
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
