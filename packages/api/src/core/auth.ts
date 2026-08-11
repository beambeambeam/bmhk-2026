import type { auth } from "@bmhk-2026/auth";
import type { AuthRole } from "@bmhk-2026/auth/permission";

export type ApiSession = typeof auth.$Infer.Session;
export type ApiUser = ApiSession["user"];
export type ApiRole = AuthRole;

export interface TeamAccessContext {
  actorId: string;
  scope: "ALL_TEAMS" | "OWN_TEAM";
}

export interface AuthReader {
  getSession: (options: { headers: Headers }) => Promise<ApiSession | null>;
}
