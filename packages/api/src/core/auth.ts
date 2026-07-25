import type { auth } from "@bmhk-2026/auth";
import type { AuthRole } from "@bmhk-2026/auth/permission";

export type ApiSession = typeof auth.$Infer.Session;
export type ApiUser = ApiSession["user"];
export type ApiRole = AuthRole;

export interface AuthReader {
  getSession: (options: { headers: Headers }) => Promise<ApiSession | null>;
}
