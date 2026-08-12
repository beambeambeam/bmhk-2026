import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DataTable } from "./data-table";
import { Filter } from "./filter";
import { Pagination } from "./pagination";
import {
  TABLE_USER_PAGE_SIZE,
  fetchUsersPage,
  getPageOffset,
  removeUser,
  setUserRole,
} from "./api";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AuthRole>>({});
  const [confirmingDeleteUserId, setConfirmingDeleteUserId] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  const usersQuery = useQuery({
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) =>
      await fetchUsersPage(
        { page: currentPage, roleFilter, search: debouncedSearch, searchField },
        signal,
      ),
    queryKey: [
      ...STAFF_ADMIN_USERS_QUERY_KEY,
      currentPage,
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
  const pageCount = Math.max(1, Math.ceil(totalUsers / TABLE_USER_PAGE_SIZE));
  const visiblePage = Math.min(currentPage, pageCount);
  const firstVisibleUserNumber = totalUsers === 0 ? 0 : getPageOffset(visiblePage) + 1;
  const lastVisibleUserNumber = Math.min(getPageOffset(visiblePage) + users.length, totalUsers);
  const updatingUserId = updateRoleMutation.isPending
    ? updateRoleMutation.variables?.userId
    : undefined;
  const deletingUserId = deleteUserMutation.isPending ? deleteUserMutation.variables : undefined;

  function moveBackAfterLastRowRemoval(): void {
    if (users.length === 1 && currentPage > 1) {
      setCurrentPage((page) => page - 1);
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
      <Filter
        roleFilter={roleFilter}
        search={search}
        searchField={searchField}
        onRoleFilterChange={(nextRoleFilter) => {
          setRoleFilter(nextRoleFilter);
          setCurrentPage(1);
        }}
        onSearchChange={setSearch}
        onSearchFieldChange={(nextSearchField) => {
          setSearchField(nextSearchField);
          setCurrentPage(1);
        }}
      />
      <DataTable
        confirmingDeleteUserId={confirmingDeleteUserId}
        currentUserId={currentUserId}
        deletingUserId={deletingUserId}
        errorMessage={usersQuery.isError ? getErrorMessage(usersQuery.error) : undefined}
        isError={usersQuery.isError}
        isLoading={usersQuery.isLoading}
        roleDrafts={roleDrafts}
        totalUsers={totalUsers}
        updatingUserId={updatingUserId}
        users={users}
        onDeleteUser={(user) => {
          void deleteUser(user);
        }}
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
      <Pagination
        firstVisibleUserNumber={firstVisibleUserNumber}
        lastVisibleUserNumber={lastVisibleUserNumber}
        page={visiblePage}
        pageCount={pageCount}
        totalUsers={totalUsers}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}

export { AdminUserTable };
