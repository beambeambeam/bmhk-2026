import type { auth } from "@bmhk-2026/auth";
import type { AuthRole } from "@bmhk-2026/auth/permission";

export type ApiSession = typeof auth.$Infer.Session;
export type ApiUser = ApiSession["user"];
export type ApiRole = AuthRole;

export interface TeamAccessContext {
  actorId: string;
  scope: "ALL_TEAMS" | "OWN_TEAM";
}

export interface ApiKeyVerification {
  key: { id: string; referenceId: string } | null;
  valid: boolean;
}

export interface IssuedApiKey {
  createdAt: Date;
  expiresAt: Date | null;
  id: string;
  key: string;
  name: string | null;
  start: string | null;
}

export interface AuthReader {
  createApiKey: (options: {
    expiresIn: number | null;
    name: string;
    userId: string;
  }) => Promise<IssuedApiKey>;
  getSession: (options: { headers: Headers }) => Promise<ApiSession | null>;
  verifyApiKey: (options: { key: string }) => Promise<ApiKeyVerification>;
}
