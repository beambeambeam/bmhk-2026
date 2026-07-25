export type ApiRole = "admin" | "registrationStaff" | "staff" | "user";

export type UserPermission =
  | "create"
  | "list"
  | "set-role"
  | "ban"
  | "impersonate"
  | "impersonate-admins"
  | "delete"
  | "set-password"
  | "set-email"
  | "get"
  | "update";

export type SessionPermission = "list" | "revoke" | "delete";

export type StaffPermission = "access" | "registration_access";

export type NonEmptyPermissionList<T> = readonly [T, ...T[]];

export type PermissionRequirement =
  | {
      user: NonEmptyPermissionList<UserPermission>;
      session?: NonEmptyPermissionList<SessionPermission>;
      staff?: NonEmptyPermissionList<StaffPermission>;
    }
  | {
      user?: NonEmptyPermissionList<UserPermission>;
      session: NonEmptyPermissionList<SessionPermission>;
      staff?: NonEmptyPermissionList<StaffPermission>;
    }
  | {
      user?: NonEmptyPermissionList<UserPermission>;
      session?: NonEmptyPermissionList<SessionPermission>;
      staff: NonEmptyPermissionList<StaffPermission>;
    };

export interface ApiUser {
  banExpires: string | null;
  banned: boolean;
  banReason: string | null;
  displayUsername: string | null;
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  username: string | null;
  role: ApiRole;
}

export interface ApiSession {
  impersonatedBy: string | null;
  user: ApiUser;
}

export interface AuthReader {
  getSession: (options: { headers: Headers }) => Promise<ApiSession | null>;
  hasPermission: (options: {
    permissions: PermissionRequirement;
    role: ApiRole;
    userId: string;
  }) => Promise<boolean>;
}
