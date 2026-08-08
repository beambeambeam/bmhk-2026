import { env } from "@bmhk-2026/env/web";
import { adminClient, usernameClient } from "better-auth/client/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc, userAc } from "better-auth/plugins/admin/access";
import { createAuthClient } from "better-auth/react";

const permissionStatement = {
  ...defaultStatements,
  staff: ["access", "registration_access"],
} as const;

const ac = createAccessControl(permissionStatement);

const roles = {
  admin: ac.newRole({
    staff: ["access", "registration_access"],
    ...adminAc.statements,
  }),
  registrationStaff: ac.newRole({
    staff: ["access", "registration_access"],
    ...userAc.statements,
  }),
  staff: ac.newRole({
    staff: ["access"],
    ...userAc.statements,
  }),
  user: ac.newRole({
    ...userAc.statements,
  }),
} as const;

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  plugins: [
    usernameClient(),
    adminClient({
      ac,
      roles,
    }),
  ],
});
