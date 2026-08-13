import { Button } from "@/components/button";
import { createColumnHelper } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { AdminUserRole } from "./role";
import type { AdminUsersTableFeatures } from "./table-features";
import type { AdminUser } from "./types";

const columnHelper = createColumnHelper<AdminUsersTableFeatures, AdminUser>();

function getSortIcon(direction: false | "asc" | "desc") {
  if (direction === "asc") {
    return <ArrowUp aria-hidden="true" data-icon="inline-end" />;
  }

  if (direction === "desc") {
    return <ArrowDown aria-hidden="true" data-icon="inline-end" />;
  }

  return <ArrowUpDown aria-hidden="true" data-icon="inline-end" />;
}

const adminUsersColumns = columnHelper.columns([
  columnHelper.accessor("email", {
    cell: ({ getValue }) => getValue(),
    header: ({ column }) => (
      <Button type="button" size="sm" variant="ghost" onClick={column.getToggleSortingHandler()}>
        Email
        {getSortIcon(column.getIsSorted())}
      </Button>
    ),
    meta: {
      cellClassName: "font-medium",
    },
  }),
  columnHelper.accessor("name", {
    cell: ({ getValue }) => getValue() || "Unnamed user",
    header: ({ column }) => (
      <Button type="button" size="sm" variant="ghost" onClick={column.getToggleSortingHandler()}>
        Name
        {getSortIcon(column.getIsSorted())}
      </Button>
    ),
  }),
  columnHelper.accessor("role", {
    cell: ({ row, table }) => {
      const { meta } = table.options;
      const user = row.original;

      if (!meta) {
        return user.role;
      }

      return (
        <AdminUserRole
          isCurrentUser={meta.currentUserId === user.id}
          roles={meta.roles}
          user={user}
          onRoleUpdated={meta.handleRoleUpdated}
        />
      );
    },
    header: ({ column }) => (
      <Button type="button" size="sm" variant="ghost" onClick={column.getToggleSortingHandler()}>
        Role
        {getSortIcon(column.getIsSorted())}
      </Button>
    ),
  }),
]);

export { adminUsersColumns };
