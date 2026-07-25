import type {
  ApiRole,
  AuthReader,
  PermissionRequirement,
  SessionPermission,
  StaffPermission,
  UserPermission,
} from "@bmhk-2026/api";
import type { auth } from "@bmhk-2026/auth";

function normalizeRole(value: unknown): ApiRole {
  switch (value) {
    case "admin":
    case "registrationStaff":
    case "staff":
    case "user": {
      return value;
    }
    default: {
      return "user";
    }
  }
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

interface MutablePermissionRequirement {
  user?: UserPermission[];
  session?: SessionPermission[];
  staff?: StaffPermission[];
}

function copyPermissionLists(requirement: PermissionRequirement): MutablePermissionRequirement {
  return {
    ...(requirement.user ? { user: [...requirement.user] } : {}),
    ...(requirement.session ? { session: [...requirement.session] } : {}),
    ...(requirement.staff ? { staff: [...requirement.staff] } : {}),
  };
}

export function createAuthReader(authInstance: typeof auth): AuthReader {
  return {
    async getSession({ headers }) {
      const session = await authInstance.api.getSession({ headers });

      if (!session) {
        return null;
      }

      return {
        impersonatedBy: session.session?.impersonatedBy ?? null,
        user: {
          banExpires: toIsoString(session.user.banExpires),
          banReason: typeof session.user.banReason === "string" ? session.user.banReason : null,
          banned: session.user.banned === true,
          displayUsername: session.user.displayUsername ?? null,
          email: session.user.email,
          emailVerified: session.user.emailVerified,
          id: session.user.id,
          image: session.user.image ?? null,
          name: session.user.name,
          role: normalizeRole(session.user.role),
          username: session.user.username ?? null,
        },
      };
    },
    async hasPermission({ permissions, role, userId }) {
      const result = await authInstance.api.userHasPermission({
        body: {
          permissions: copyPermissionLists(permissions),
          role,
          userId,
        },
      });

      return result.success;
    },
  };
}

export type AuthInstance = typeof auth;
