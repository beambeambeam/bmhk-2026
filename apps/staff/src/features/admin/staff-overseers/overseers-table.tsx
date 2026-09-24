import { DataTable } from "@/components/table/index";
import type { DataTableColumn } from "@/components/table/index";
import type { StaffOverseer } from "@bmhk-2026/api";

interface StaffOverseersTableProps {
  readonly overseers: readonly StaffOverseer[];
}

const columns: DataTableColumn<StaffOverseer>[] = [
  { accessorKey: "userName", header: "Name", size: 240 },
  { accessorKey: "email", header: "Email", size: 320 },
  {
    cell: ({ row }) => `[${row.original.groupIndex}] ${row.original.groupName}`,
    header: "Group",
    id: "group",
    size: 240,
  },
];

function StaffOverseersTable({ overseers }: StaffOverseersTableProps) {
  if (overseers.length === 0) {
    return <p className="text-muted-foreground text-sm">No overseers assigned yet.</p>;
  }

  return (
    <DataTable
      columns={columns}
      data={overseers}
      getRowId={(overseer) => overseer.userId}
      emptyMessage="No overseers assigned yet."
    />
  );
}

export { StaffOverseersTable };
