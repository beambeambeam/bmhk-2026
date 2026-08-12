import { Input } from "@/components/input";
import { Search } from "lucide-react";

import { STAFF_ROLES, isRoleFilter, isSearchField } from "./types";
import type { RoleFilter, SearchField } from "./types";

interface FilterProps {
  readonly roleFilter: RoleFilter;
  readonly search: string;
  readonly searchField: SearchField;
  readonly onRoleFilterChange: (roleFilter: RoleFilter) => void;
  readonly onSearchChange: (search: string) => void;
  readonly onSearchFieldChange: (searchField: SearchField) => void;
}

function Filter({
  roleFilter,
  search,
  searchField,
  onRoleFilterChange,
  onSearchChange,
  onSearchFieldChange,
}: FilterProps) {
  return (
    <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
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
            onSearchChange(event.target.value);
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
              onSearchFieldChange(nextSearchField);
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
              onRoleFilterChange(nextRoleFilter);
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
  );
}

export { Filter };
