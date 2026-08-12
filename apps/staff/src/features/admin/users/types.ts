const STAFF_ROLES = ["admin", "registrationStaff", "staff", "user"] as const;
const SEARCH_FIELDS = ["email", "name"] as const;

type AuthRole = (typeof STAFF_ROLES)[number];
type RoleFilter = AuthRole | "all";
type SearchField = (typeof SEARCH_FIELDS)[number];

interface StaffUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role?: string | null;
}

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

function getUserRole(user: StaffUser): AuthRole {
  return isAuthRole(user.role) ? user.role : "user";
}

export {
  STAFF_ROLES,
  getUserRole,
  isAuthRole,
  isRoleFilter,
  isSearchField,
  type AuthRole,
  type FetchUsersPageInput,
  type RoleFilter,
  type SearchField,
  type StaffUser,
  type UsersPage,
};
