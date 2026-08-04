import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { authClient } from "@bmhk-2026/client/auth-client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2, Pencil, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STAFF_ROLES = ["admin", "registrationStaff", "staff", "user"] as const;
const TABLE_USER_PAGE_SIZE = 10;
const SEARCH_FIELDS = ["email", "name"] as const;

type AuthRole = (typeof STAFF_ROLES)[number];
type SearchField = (typeof SEARCH_FIELDS)[number];

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

interface FetchUsersPageInput {
  readonly page: number;
  readonly roleFilter: RoleFilter;
  readonly search: string;
  readonly searchField: SearchField;
}

function isAuthRole(role: string | null | undefined): role is AuthRole {
  return STAFF_ROLES.some((staffRole) => staffRole === role);
}

function isSearchField(value: string): value is SearchField {
  return SEARCH_FIELDS.some((field) => field === value);
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

function getPageOffset(page: number): number {
  return (page - 1) * TABLE_USER_PAGE_SIZE;
}

function getUsersQuery(input: FetchUsersPageInput) {
  const normalizedSearch = input.search.trim();
  const query = {
    limit: TABLE_USER_PAGE_SIZE,
    offset: getPageOffset(input.page),
    sortBy: "email",
    sortDirection: "asc",
  } as {
    filterField?: string;
    filterOperator?: "eq";
    filterValue?: string;
    limit: number;
    offset: number;
    searchField?: SearchField;
    searchOperator?: "contains";
    searchValue?: string;
    sortBy: string;
    sortDirection: "asc";
  };

  if (normalizedSearch.length > 0) {
    query.searchField = input.searchField;
    query.searchOperator = "contains";
    query.searchValue = normalizedSearch;
  }

  if (input.roleFilter !== "all") {
    query.filterField = "role";
    query.filterOperator = "eq";
    query.filterValue = input.roleFilter;
  }

  return query;
}

async function fetchUsersPage(input: FetchUsersPageInput): Promise<UsersPage> {
  const response = await authClient.admin.listUsers({
    query: getUsersQuery(input),
  });

  if (response.error) {
    throw new Error(response.error.message ?? response.error.statusText);
  }

  const { total, users } = response.data;

  return { total, users };
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
  const [searchField, setSearchField] = useState<SearchField>("email");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AuthRole>>({});
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [confirmingDeleteUserId, setConfirmingDeleteUserId] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryFn: async () =>
      await fetchUsersPage({ page: currentPage, roleFilter, search, searchField }),
    queryKey: ["staff-admin-users", currentPage, roleFilter, search, searchField],
  });

  const totalUsers = usersQuery.data?.total ?? 0;
  const users = usersQuery.data?.users ?? [];
  const pageCount = Math.max(1, Math.ceil(totalUsers / TABLE_USER_PAGE_SIZE));
  const visiblePage = Math.min(currentPage, pageCount);
  const firstVisibleUserNumber = totalUsers === 0 ? 0 : getPageOffset(visiblePage) + 1;
  const lastVisibleUserNumber = Math.min(getPageOffset(visiblePage) + users.length, totalUsers);

  async function refetchAfterRowRemoval(): Promise<void> {
    if (users.length === 1 && currentPage > 1) {
      setCurrentPage((page) => page - 1);
      return;
    }

    await usersQuery.refetch();
  }

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
      if (roleFilter !== "all" && role !== roleFilter) {
        await refetchAfterRowRemoval();
        return;
      }

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
      await refetchAfterRowRemoval();
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
                setCurrentPage(1);
              }}
            />
          </label>
          <label className="block sm:w-32" htmlFor="admin-search-field">
            <span className="sr-only">Search by</span>
            <select
              id="admin-search-field"
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={searchField}
              onChange={(event) => {
                const nextSearchField = event.target.value;

                if (isSearchField(nextSearchField)) {
                  setSearchField(nextSearchField);
                  setCurrentPage(1);
                }
              }}
            >
              <option value="email">Email</option>
              <option value="name">Name</option>
            </select>
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
                  setCurrentPage(1);
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
            {usersQuery.isSuccess && totalUsers === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : null}
            {users.map((user) => {
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

      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          Showing {firstVisibleUserNumber}-{lastVisibleUserNumber} of {totalUsers} users
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={visiblePage === 1}
            onClick={() => {
              setCurrentPage((page) => Math.max(1, page - 1));
            }}
          >
            <ChevronLeft aria-hidden="true" />
            Previous
          </Button>
          <span className="min-w-20 text-center text-muted-foreground">
            Page {visiblePage} of {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={visiblePage === pageCount}
            onClick={() => {
              setCurrentPage((page) => Math.min(pageCount, page + 1));
            }}
          >
            Next
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
