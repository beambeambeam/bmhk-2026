import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaginationState } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminUsersDataTable } from "./data-table";
import { AdminUsersFilter } from "./filter";
import { TABLE_USER_PAGE_SIZE, fetchUsersPage, removeUser, setUserRole } from "./api";
import { getUserRole } from "./types";
import type { AuthRole, RoleFilter, SearchField, StaffUser } from "./types";

const STAFF_ADMIN_USERS_QUERY_KEY = ["staff-admin-users"] as const;
const SEARCH_DEBOUNCE_MS = 300;

interface AdminUserTableProps {
  readonly currentUserId?: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function AdminUserTable({ currentUserId }: AdminUserTableProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("email");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: TABLE_USER_PAGE_SIZE,
  });
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AuthRole>>({});
  const [confirmingDeleteUserId, setConfirmingDeleteUserId] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPagination((currentPagination) => ({
        ...currentPagination,
        pageIndex: 0,
      }));
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  const usersQuery = useQuery({
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) =>
      await fetchUsersPage(
        { ...pagination, roleFilter, search: debouncedSearch, searchField },
        signal,
      ),
    queryKey: [
      ...STAFF_ADMIN_USERS_QUERY_KEY,
      pagination,
      roleFilter,
      debouncedSearch,
      searchField,
    ],
  });

  async function invalidateUsers(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: STAFF_ADMIN_USERS_QUERY_KEY });
  }

  const updateRoleMutation = useMutation({
    mutationFn: setUserRole,
    onSuccess: invalidateUsers,
  });
  const deleteUserMutation = useMutation({
    mutationFn: removeUser,
    onSuccess: invalidateUsers,
  });

  const totalUsers = usersQuery.data?.total ?? 0;
  const users = usersQuery.data?.users ?? [];
  const updatingUserId = updateRoleMutation.isPending
    ? updateRoleMutation.variables?.userId
    : undefined;
  const deletingUserId = deleteUserMutation.isPending ? deleteUserMutation.variables : undefined;

  function moveBackAfterLastRowRemoval(): void {
    if (users.length === 1 && pagination.pageIndex > 0) {
      setPagination((currentPagination) => ({
        ...currentPagination,
        pageIndex: currentPagination.pageIndex - 1,
      }));
    }
  }

  async function updateRole(user: StaffUser): Promise<void> {
    const role = roleDrafts[user.id] ?? getUserRole(user);

    if (role === getUserRole(user)) {
      return;
    }

    try {
      await updateRoleMutation.mutateAsync({ role, userId: user.id });

      toast.success("Role updated");
      setRoleDrafts(({ [user.id]: _updatedUserRole, ...drafts }) => drafts);
      if (roleFilter !== "all" && role !== roleFilter) {
        moveBackAfterLastRowRemoval();
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function deleteUser(user: StaffUser): Promise<void> {
    if (user.id === currentUserId) {
      toast.error("You cannot delete your own account.");
      return;
    }

    if (confirmingDeleteUserId !== user.id) {
      setConfirmingDeleteUserId(user.id);
      return;
    }

    try {
      await deleteUserMutation.mutateAsync(user.id);

      toast.success("User deleted");
      setConfirmingDeleteUserId(null);
      moveBackAfterLastRowRemoval();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <AdminUsersFilter
        roleFilter={roleFilter}
        search={search}
        searchField={searchField}
        onRoleFilterChange={(nextRoleFilter) => {
          setRoleFilter(nextRoleFilter);
          setPagination((currentPagination) => ({
            ...currentPagination,
            pageIndex: 0,
          }));
        }}
        onSearchChange={setSearch}
        onSearchFieldChange={(nextSearchField) => {
          setSearchField(nextSearchField);
          setPagination((currentPagination) => ({
            ...currentPagination,
            pageIndex: 0,
          }));
        }}
      />
      <AdminUsersDataTable
        confirmingDeleteUserId={confirmingDeleteUserId}
        currentUserId={currentUserId}
        deletingUserId={deletingUserId}
        errorMessage={usersQuery.isError ? getErrorMessage(usersQuery.error) : undefined}
        isError={usersQuery.isError}
        isLoading={usersQuery.isLoading}
        pagination={pagination}
        roleDrafts={roleDrafts}
        totalUsers={totalUsers}
        updatingUserId={updatingUserId}
        users={users}
        onDeleteUser={(user) => {
          void deleteUser(user);
        }}
        onPaginationChange={setPagination}
        onRoleDraftChange={(userId, role) => {
          setRoleDrafts((drafts) => ({
            ...drafts,
            [userId]: role,
          }));
        }}
        onUpdateRole={(user) => {
          void updateRole(user);
        }}
      />
    </div>
  );
}

export { AdminUserTable };
