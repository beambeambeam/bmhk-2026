import type { AdminUserColumnFilter, AdminUserListQuery, AdminUserSort } from "@bmhk-2026/api";
import {
  getAdminUserFilterQueryOptions,
  getAdminUserListQueryOptions,
} from "@bmhk-2026/client/query-options";
import { orpc } from "@bmhk-2026/client/orpc";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaginationState, SortingState, Updater } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminUsersDataTable } from "./data-table";
import { AdminUsersFilter } from "./filter";
import type { AdminUser, AuthRole, RoleFilter } from "./types";

const TABLE_USER_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;
const SORTABLE_COLUMN_IDS = ["email", "name", "role"] as const;

interface AdminUserSearches {
  readonly email: string;
  readonly name: string;
}

interface AdminUserTableProps {
  readonly actorId: string | undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function isSortableColumnId(id: string): id is AdminUserSort["id"] {
  return SORTABLE_COLUMN_IDS.some((sortableColumnId) => sortableColumnId === id);
}

function toAdminUserSorting(sorting: SortingState): AdminUserSort[] {
  return sorting.flatMap((sort) =>
    isSortableColumnId(sort.id) ? [{ desc: sort.desc, id: sort.id }] : [],
  );
}

function AdminUserTable({ actorId }: AdminUserTableProps) {
  const queryClient = useQueryClient();
  const [searches, setSearches] = useState<AdminUserSearches>({ email: "", name: "" });
  const [debouncedSearches, setDebouncedSearches] = useState<AdminUserSearches>({
    email: "",
    name: "",
  });
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: TABLE_USER_PAGE_SIZE,
  });
  const [sorting, setSorting] = useState<SortingState>([{ desc: false, id: "email" }]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearches({
        email: searches.email.trim(),
        name: searches.name.trim(),
      });
      setPagination((currentPagination) => ({
        ...currentPagination,
        pageIndex: 0,
      }));
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searches]);

  const columnFilters = useMemo<AdminUserColumnFilter[]>(() => {
    const filters: AdminUserColumnFilter[] = [];

    if (debouncedSearches.email.length > 0) {
      filters.push({ id: "email", value: debouncedSearches.email });
    }
    if (debouncedSearches.name.length > 0) {
      filters.push({ id: "name", value: debouncedSearches.name });
    }
    if (roleFilter !== "all") {
      filters.push({ id: "role", value: roleFilter });
    }

    return filters;
  }, [debouncedSearches, roleFilter]);

  const listQuery = useMemo<AdminUserListQuery>(
    () => ({
      columnFilters,
      pagination,
      sorting: toAdminUserSorting(sorting),
    }),
    [columnFilters, pagination, sorting],
  );

  const filterOptionsQuery = useQuery(getAdminUserFilterQueryOptions(actorId));
  const usersQuery = useQuery({
    ...getAdminUserListQueryOptions(actorId, listQuery),
    placeholderData: keepPreviousData,
  });
  const roles = filterOptionsQuery.data?.roles ?? [];

  async function invalidateUsers(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: orpc.adminUsers.list.key() });
  }

  const updateRoleMutation = useMutation(
    orpc.adminUsers.setRole.mutationOptions({ onSuccess: invalidateUsers }),
  );

  const totalUsers = usersQuery.data?.rowCount ?? 0;
  const users = usersQuery.data?.rows ?? [];
  const updatingUserId = updateRoleMutation.isPending
    ? updateRoleMutation.variables?.userId
    : undefined;

  function resetPage(): void {
    setPagination((currentPagination) => ({
      ...currentPagination,
      pageIndex: 0,
    }));
  }

  function moveBackAfterLastRowRemoval(): void {
    if (users.length === 1 && pagination.pageIndex > 0) {
      setPagination((currentPagination) => ({
        ...currentPagination,
        pageIndex: currentPagination.pageIndex - 1,
      }));
    }
  }

  async function updateRole(user: AdminUser, role: AuthRole): Promise<boolean> {
    if (role === user.role) {
      return false;
    }

    try {
      await updateRoleMutation.mutateAsync({ role, userId: user.id });

      toast.success("Role updated");
      if (roleFilter !== "all" && role !== roleFilter) {
        moveBackAfterLastRowRemoval();
      }
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    }
  }

  function handleSortingChange(updater: Updater<SortingState>): void {
    setSorting((currentSorting) =>
      typeof updater === "function" ? updater(currentSorting) : updater,
    );
    resetPage();
  }
  const queryError = usersQuery.error ?? filterOptionsQuery.error;

  return (
    <div className="flex flex-col gap-5">
      <AdminUsersFilter
        email={searches.email}
        name={searches.name}
        roleFilter={roleFilter}
        roles={roles}
        onEmailChange={(email) => {
          setSearches((currentSearches) => ({ ...currentSearches, email }));
        }}
        onNameChange={(name) => {
          setSearches((currentSearches) => ({ ...currentSearches, name }));
        }}
        onRoleChange={(role) => {
          setRoleFilter(role);
          resetPage();
        }}
      />
      <AdminUsersDataTable
        columnFilters={columnFilters}
        currentUserId={actorId}
        errorMessage={queryError ? getErrorMessage(queryError) : undefined}
        isError={queryError !== null}
        isLoading={usersQuery.isLoading || filterOptionsQuery.isLoading}
        pagination={pagination}
        roles={roles}
        sorting={sorting}
        totalUsers={totalUsers}
        updatingUserId={updatingUserId}
        users={users}
        onPaginationChange={setPagination}
        onSortingChange={handleSortingChange}
        onUpdateRole={updateRole}
      />
    </div>
  );
}

export { AdminUserTable };
