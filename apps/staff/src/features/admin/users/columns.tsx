import { Button } from "@/components/button";
import { Field, FieldLabel } from "@/components/field";
import { NativeSelect, NativeSelectOption } from "@/components/native-select";
import { createColumnHelper } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Pencil } from "lucide-react";

import { isAuthRole } from "./types";
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

      const currentRole = user.role;
      const selectedRole = meta.roleDrafts[user.id] ?? currentRole;
      const isUpdatingRole = meta.updatingUserId === user.id;

      return (
        <Field className="w-44 gap-0">
          <FieldLabel className="sr-only" htmlFor={`role-${user.id}`}>
            Role for {user.email}
          </FieldLabel>
          <NativeSelect
            id={`role-${user.id}`}
            className="w-full"
            disabled={isUpdatingRole || meta.roles.length === 0}
            value={selectedRole}
            onChange={(event) => {
              const nextRole = event.target.value;

              if (isAuthRole(nextRole, meta.roles)) {
                meta.onRoleDraftChange(user.id, nextRole);
              }
            }}
          >
            {meta.roles.map((role) => (
              <NativeSelectOption key={role} value={role}>
                {role}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      );
    },
    header: ({ column }) => (
      <Button type="button" size="sm" variant="ghost" onClick={column.getToggleSortingHandler()}>
        Role
        {getSortIcon(column.getIsSorted())}
      </Button>
    ),
  }),
  columnHelper.display({
    cell: ({ row, table }) => {
      const { meta } = table.options;

      if (!meta) {
        return null;
      }

      const user = row.original;
      const currentRole = user.role;
      const selectedRole = meta.roleDrafts[user.id] ?? currentRole;
      const isUpdatingRole = meta.updatingUserId === user.id;

      return (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUpdatingRole || selectedRole === currentRole}
            onClick={() => {
              meta.onUpdateRole(user);
            }}
          >
            {isUpdatingRole ? (
              <Loader2 aria-hidden="true" className="animate-spin" data-icon="inline-start" />
            ) : (
              <Pencil aria-hidden="true" data-icon="inline-start" />
            )}
            Edit
          </Button>
        </div>
      );
    },
    header: "Actions",
    id: "actions",
    meta: {
      headerClassName: "w-24 text-right",
    },
  }),
]);

export { adminUsersColumns };
