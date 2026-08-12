import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { cn } from "@/lib/utils";
import { useTable } from "@tanstack/react-table";
import type { OnChangeFn, PaginationState } from "@tanstack/react-table";

import { adminUsersColumns } from "./columns";
import { AdminUsersPagination } from "./pagination";
import { adminUsersTableFeatures } from "./table-features";
import type { AuthRole, StaffUser } from "./types";

interface AdminUsersDataTableProps {
  readonly confirmingDeleteUserId: string | null;
  readonly currentUserId?: string;
  readonly deletingUserId?: string;
  readonly errorMessage?: string;
  readonly isError: boolean;
  readonly isLoading: boolean;
  readonly pagination: PaginationState;
  readonly roleDrafts: Readonly<Record<string, AuthRole>>;
  readonly totalUsers: number;
  readonly updatingUserId?: string;
  readonly users: StaffUser[];
  readonly onDeleteUser: (user: StaffUser) => void;
  readonly onPaginationChange: OnChangeFn<PaginationState>;
  readonly onRoleDraftChange: (userId: string, role: AuthRole) => void;
  readonly onUpdateRole: (user: StaffUser) => void;
}

function AdminUsersDataTable({
  confirmingDeleteUserId,
  currentUserId,
  deletingUserId,
  errorMessage,
  isError,
  isLoading,
  pagination,
  roleDrafts,
  totalUsers,
  updatingUserId,
  users,
  onDeleteUser,
  onPaginationChange,
  onRoleDraftChange,
  onUpdateRole,
}: AdminUsersDataTableProps) {
  const table = useTable({
    autoResetPageIndex: false,
    columns: adminUsersColumns,
    data: users,
    features: adminUsersTableFeatures,
    getRowId: (user) => user.id,
    manualPagination: true,
    meta: {
      confirmingDeleteUserId,
      currentUserId,
      deletingUserId,
      onDeleteUser,
      onRoleDraftChange,
      onUpdateRole,
      roleDrafts,
      updatingUserId,
    },
    onPaginationChange,
    rowCount: totalUsers,
    state: { pagination },
  });
  const { rows } = table.getRowModel();
  const columnCount = table.getAllLeafColumns().length;

  let statusMessage: string | undefined;
  let statusClassName = "text-muted-foreground";

  if (isLoading) {
    statusMessage = "Loading users...";
  } else if (isError) {
    statusMessage = errorMessage ?? "Something went wrong.";
    statusClassName = "text-destructive";
  } else if (rows.length === 0) {
    statusMessage = "No users found.";
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.columnDef.meta?.headerClassName}
                  >
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {statusMessage === undefined ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className={cell.column.columnDef.meta?.cellClassName}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className={cn("h-24 text-center", statusClassName)}
                >
                  {statusMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <AdminUsersPagination table={table} visibleRowCount={rows.length} />
    </div>
  );
}

export { AdminUsersDataTable };
