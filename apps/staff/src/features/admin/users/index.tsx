import type { AdminUserColumnFilter, AdminUserListQuery, AdminUserSort } from "@bmhk-2026/api";
import {
  getAdminUserFilterQueryOptions,
  getAdminUserListQueryOptions,
} from "@bmhk-2026/client/query-options";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PaginationState, SortingState, Updater } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

import { AdminUsersDataTable } from "./data-table";
import { AdminUsersFilter } from "./filter";
import type { AuthRole, EmailDomainFilter, RoleFilter } from "./types";

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
  const [searches, setSearches] = useState<AdminUserSearches>({ email: "", name: "" });
  const [debouncedSearches, setDebouncedSearches] = useState<AdminUserSearches>({
    email: "",
    name: "",
  });
  const [emailDomainFilter, setEmailDomainFilter] = useState<EmailDomainFilter>("all");
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
    if (emailDomainFilter !== "all") {
      filters.push({ id: "emailDomain", value: emailDomainFilter });
    }
    if (debouncedSearches.name.length > 0) {
      filters.push({ id: "name", value: debouncedSearches.name });
    }
    if (roleFilter !== "all") {
      filters.push({ id: "role", value: roleFilter });
    }

    return filters;
  }, [debouncedSearches, emailDomainFilter, roleFilter]);

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

  const totalUsers = usersQuery.data?.rowCount ?? 0;
  const users = usersQuery.data?.rows ?? [];

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

  function handleRoleUpdated(role: AuthRole): void {
    if (roleFilter !== "all" && role !== roleFilter) {
      moveBackAfterLastRowRemoval();
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
        emailDomainFilter={emailDomainFilter}
        name={searches.name}
        roleFilter={roleFilter}
        roles={roles}
        onEmailChange={(email) => {
          setSearches((currentSearches) => ({ ...currentSearches, email }));
        }}
        onEmailDomainChange={(emailDomain) => {
          setEmailDomainFilter(emailDomain);
          resetPage();
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
        users={users}
        onRoleUpdated={handleRoleUpdated}
        onPaginationChange={setPagination}
        onSortingChange={handleSortingChange}
      />
    </div>
  );
}

export { AdminUserTable };
