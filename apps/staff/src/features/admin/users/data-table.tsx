import { Button } from "@/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { Loader2, Pencil, Trash2 } from "lucide-react";

import { STAFF_ROLES, getUserRole, isAuthRole } from "./types";
import type { AuthRole, StaffUser } from "./types";

interface AdminUsersDataTableProps {
  readonly confirmingDeleteUserId: string | null;
  readonly currentUserId?: string;
  readonly deletingUserId?: string;
  readonly errorMessage?: string;
  readonly isError: boolean;
  readonly isLoading: boolean;
  readonly roleDrafts: Readonly<Record<string, AuthRole>>;
  readonly totalUsers: number;
  readonly updatingUserId?: string;
  readonly users: StaffUser[];
  readonly onDeleteUser: (user: StaffUser) => void;
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
  roleDrafts,
  totalUsers,
  updatingUserId,
  users,
  onDeleteUser,
  onRoleDraftChange,
  onUpdateRole,
}: AdminUsersDataTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-48 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                Loading users...
              </TableCell>
            </TableRow>
          ) : null}
          {isError ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-destructive">
                {errorMessage}
              </TableCell>
            </TableRow>
          ) : null}
          {!isLoading && !isError && totalUsers === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No users found.
              </TableCell>
            </TableRow>
          ) : null}
          {users.map((user) => {
            const currentRole = getUserRole(user);
            const selectedRole = roleDrafts[user.id] ?? currentRole;
            const isUpdatingRole = updatingUserId === user.id;
            const isDeleting = deletingUserId === user.id;
            const isPending = isUpdatingRole || isDeleting;
            const hasRoleChange = selectedRole !== currentRole;

            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>{user.name || "Unnamed user"}</TableCell>
                <TableCell>
                  <label className="block w-44" htmlFor={`role-${user.id}`}>
                    <span className="sr-only">Role for {user.email}</span>
                    <select
                      id={`role-${user.id}`}
                      className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isPending}
                      value={selectedRole}
                      onChange={(event) => {
                        const nextRole = event.target.value;

                        if (isAuthRole(nextRole)) {
                          onRoleDraftChange(user.id, nextRole);
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
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending || !hasRoleChange}
                      onClick={() => {
                        onUpdateRole(user);
                      }}
                    >
                      {isUpdatingRole ? (
                        <Loader2
                          aria-hidden="true"
                          className="animate-spin"
                          data-icon="inline-start"
                        />
                      ) : (
                        <Pencil aria-hidden="true" data-icon="inline-start" />
                      )}
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={isPending || user.id === currentUserId}
                      onClick={() => {
                        onDeleteUser(user);
                      }}
                    >
                      {isDeleting ? (
                        <Loader2
                          aria-hidden="true"
                          className="animate-spin"
                          data-icon="inline-start"
                        />
                      ) : (
                        <Trash2 aria-hidden="true" data-icon="inline-start" />
                      )}
                      {confirmingDeleteUserId === user.id ? "Confirm" : "Delete"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export { AdminUsersDataTable };
