import { authClient } from "@bmhk-2026/client/auth-client";

import type { AuthRole, FetchUsersPageInput, SearchField, UsersPage } from "./types";

const TABLE_USER_PAGE_SIZE = 10;

function getUsersQuery(input: FetchUsersPageInput) {
  const normalizedSearch = input.search.trim();
  const query = {
    limit: input.pageSize,
    offset: input.pageIndex * input.pageSize,
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

async function fetchUsersPage(input: FetchUsersPageInput, signal: AbortSignal): Promise<UsersPage> {
  const response = await authClient.admin.listUsers({
    fetchOptions: { signal },
    query: getUsersQuery(input),
  });

  if (response.error) {
    throw new Error(response.error.message ?? response.error.statusText);
  }

  const { total, users } = response.data;

  return { total, users };
}

async function removeUser(userId: string): Promise<void> {
  const response = await authClient.admin.removeUser({ userId });

  if (response.error) {
    throw new Error(response.error.message ?? response.error.statusText);
  }
}

async function setUserRole(input: {
  readonly role: AuthRole;
  readonly userId: string;
}): Promise<void> {
  const response = await authClient.admin.setRole(input);

  if (response.error) {
    throw new Error(response.error.message ?? response.error.statusText);
  }
}

export { TABLE_USER_PAGE_SIZE, fetchUsersPage, removeUser, setUserRole };
