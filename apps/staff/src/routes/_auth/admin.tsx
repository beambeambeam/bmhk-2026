import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { authClient } from "@bmhk-2026/client/auth-client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Loader2, Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const STAFF_ROLES = ["admin", "registrationStaff", "staff", "user"] as const;
const USER_PAGE_SIZE = 100;

type AuthRole = (typeof STAFF_ROLES)[number];

interface StaffUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role?: string | null;
}

type RoleFilter = AuthRole | "all";

interface UsersPage {
  readonly total: number;
  readonly users: StaffUser[];
}

function isAuthRole(role: string | null | undefined): role is AuthRole {
  return STAFF_ROLES.some((staffRole) => staffRole === role);
}

function isRoleFilter(value: string): value is RoleFilter {
  return value === "all" || isAuthRole(value);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function getUserRole(user: StaffUser): AuthRole {
  return isAuthRole(user.role) ? user.role : "user";
}

async function fetchUsersPage(offset: number): Promise<UsersPage> {
  const response = await authClient.admin.listUsers({
    query: {
      limit: USER_PAGE_SIZE,
      offset,
      sortBy: "email",
      sortDirection: "asc",
    },
  });

  if (response.error) {
    throw new Error(response.error.message ?? response.error.statusText);
  }

  const { total, users } = response.data;

  return { total, users };
}

function appendUsers(target: StaffUser[], source: readonly StaffUser[]): void {
  for (const user of source) {
    target.push(user);
  }
}

async function listAllUsers(): Promise<StaffUser[]> {
  const firstPage = await fetchUsersPage(0);
  const users: StaffUser[] = [];
  appendUsers(users, firstPage.users);

  const remainingPageRequests: Promise<UsersPage>[] = [];

  for (let offset = USER_PAGE_SIZE; offset < firstPage.total; offset += USER_PAGE_SIZE) {
    remainingPageRequests.push(fetchUsersPage(offset));
  }

  const remainingPages = await Promise.all(remainingPageRequests);

  for (const page of remainingPages) {
    appendUsers(users, page.users);
  }

  return users;
}

export const Route = createFileRoute("/_auth/admin")({
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (session.data?.user.role !== "admin") {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirects are thrown intentionally
      throw redirect({
        to: "/dashboard",
      });
    }
  },
  component: AdminPage,
});

function AdminPage() {
  const { session } = Route.useRouteContext();
  const currentUserId = session.data?.user.id;
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AuthRole>>({});
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [confirmingDeleteUserId, setConfirmingDeleteUserId] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryFn: listAllUsers,
    queryKey: ["staff-admin-users"],
  });

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (usersQuery.data ?? []).filter((user) => {
      const role = getUserRole(user);
      const matchesRole = roleFilter === "all" || role === roleFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch);

      return matchesRole && matchesSearch;
    });
  }, [roleFilter, search, usersQuery.data]);

  async function updateRole(user: StaffUser) {
    const role = roleDrafts[user.id] ?? getUserRole(user);

    if (role === getUserRole(user)) {
      return;
    }

    setPendingUserId(user.id);

    try {
      const response = await authClient.admin.setRole({
        role,
        userId: user.id,
      });

      if (response.error) {
        throw new Error(response.error.message ?? response.error.statusText);
      }

      toast.success("Role updated");
      setRoleDrafts(({ [user.id]: _updatedUserRole, ...drafts }) => drafts);
      await usersQuery.refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPendingUserId(null);
    }
  }

  async function deleteUser(user: StaffUser) {
    if (user.id === currentUserId) {
      toast.error("You cannot delete your own account.");
      return;
    }

    if (confirmingDeleteUserId !== user.id) {
      setConfirmingDeleteUserId(user.id);
      return;
    }

    setPendingUserId(user.id);

    try {
      const response = await authClient.admin.removeUser({
        userId: user.id,
      });

      if (response.error) {
        throw new Error(response.error.message ?? response.error.statusText);
      }

      toast.success("User deleted");
      setConfirmingDeleteUserId(null);
      await usersQuery.refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl">Admin</h1>
          <p className="text-muted-foreground text-sm">
            Manage staff access and registration roles.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <label className="relative block min-w-0 sm:w-72" htmlFor="admin-user-search">
            <span className="sr-only">Search users</span>
            <Search
              aria-hidden="true"
              className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-4 text-muted-foreground"
            />
            <Input
              id="admin-user-search"
              className="pl-8"
              placeholder="Search name or email"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
            />
          </label>
          <label className="block sm:w-48" htmlFor="admin-role-filter">
            <span className="sr-only">Filter by role</span>
            <select
              id="admin-role-filter"
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={roleFilter}
              onChange={(event) => {
                const nextRoleFilter = event.target.value;

                if (isRoleFilter(nextRoleFilter)) {
                  setRoleFilter(nextRoleFilter);
                }
              }}
            >
              <option value="all">All roles</option>
              {STAFF_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

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
            {usersQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : null}
            {usersQuery.isError ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-destructive">
                  {getErrorMessage(usersQuery.error)}
                </TableCell>
              </TableRow>
            ) : null}
            {usersQuery.isSuccess && filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : null}
            {filteredUsers.map((user) => {
              const currentRole = getUserRole(user);
              const selectedRole = roleDrafts[user.id] ?? currentRole;
              const isPending = pendingUserId === user.id;
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

                          if (!isAuthRole(nextRole)) {
                            return;
                          }

                          setRoleDrafts((drafts) => ({
                            ...drafts,
                            [user.id]: nextRole,
                          }));
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
                          void updateRole(user);
                        }}
                      >
                        {isPending && hasRoleChange ? (
                          <Loader2 aria-hidden="true" className="animate-spin" />
                        ) : (
                          <Pencil aria-hidden="true" />
                        )}
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={isPending || user.id === currentUserId}
                        onClick={() => {
                          void deleteUser(user);
                        }}
                      >
                        {isPending && !hasRoleChange ? (
                          <Loader2 aria-hidden="true" className="animate-spin" />
                        ) : (
                          <Trash2 aria-hidden="true" />
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
    </section>
  );
}
