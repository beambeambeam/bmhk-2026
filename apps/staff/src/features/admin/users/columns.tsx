import { Button } from "@/components/button";
import { createColumnHelper } from "@tanstack/react-table";
import { Loader2, Pencil, Trash2 } from "lucide-react";

import { STAFF_ROLES, getUserRole, isAuthRole } from "./types";
import type { AdminUsersTableFeatures } from "./table-features";
import type { StaffUser } from "./types";

const columnHelper = createColumnHelper<AdminUsersTableFeatures, StaffUser>();

const adminUsersColumns = columnHelper.columns([
  columnHelper.accessor("email", {
    cell: ({ getValue }) => getValue(),
    header: "Email",
    meta: {
      cellClassName: "font-medium",
    },
  }),
  columnHelper.accessor("name", {
    cell: ({ getValue }) => getValue() || "Unnamed user",
    header: "Name",
  }),
  columnHelper.accessor("role", {
    cell: ({ row, table }) => {
      const { meta } = table.options;
      const user = row.original;

      if (!meta) {
        return getUserRole(user);
      }

      const currentRole = getUserRole(user);
      const selectedRole = meta.roleDrafts[user.id] ?? currentRole;
      const isUpdatingRole = meta.updatingUserId === user.id;
      const isDeleting = meta.deletingUserId === user.id;

      return (
        <label className="block w-44" htmlFor={`role-${user.id}`}>
          <span className="sr-only">Role for {user.email}</span>
          <select
            id={`role-${user.id}`}
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isUpdatingRole || isDeleting}
            value={selectedRole}
            onChange={(event) => {
              const nextRole = event.target.value;

              if (isAuthRole(nextRole)) {
                meta.onRoleDraftChange(user.id, nextRole);
              }
            }}
          >
            {STAFF_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
      );
    },
    header: "Role",
  }),
  columnHelper.display({
    cell: ({ row, table }) => {
      const { meta } = table.options;

      if (!meta) {
        return null;
      }

      const user = row.original;
      const currentRole = getUserRole(user);
      const selectedRole = meta.roleDrafts[user.id] ?? currentRole;
      const isUpdatingRole = meta.updatingUserId === user.id;
      const isDeleting = meta.deletingUserId === user.id;
      const isPending = isUpdatingRole || isDeleting;

      return (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending || selectedRole === currentRole}
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
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isPending || user.id === meta.currentUserId}
            onClick={() => {
              meta.onDeleteUser(user);
            }}
          >
            {isDeleting ? (
              <Loader2 aria-hidden="true" className="animate-spin" data-icon="inline-start" />
            ) : (
              <Trash2 aria-hidden="true" data-icon="inline-start" />
            )}
            {meta.confirmingDeleteUserId === user.id ? "Confirm" : "Delete"}
          </Button>
        </div>
      );
    },
    header: "Actions",
    id: "actions",
    meta: {
      headerClassName: "w-48 text-right",
    },
  }),
]);

export { adminUsersColumns };
