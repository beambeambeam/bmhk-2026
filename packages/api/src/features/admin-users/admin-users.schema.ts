import { z } from "zod";

export const adminUserRoleSchema = z.enum(["admin", "registrationStaff", "staff", "user"]);

export const setAdminUserRoleSchema = z
  .object({
    role: adminUserRoleSchema,
    userId: z.string().min(1),
  })
  .strict();

export const adminUserRoleResultSchema = setAdminUserRoleSchema;

export type AdminUserRole = z.infer<typeof adminUserRoleSchema>;
export type AdminUserRoleResult = z.infer<typeof adminUserRoleResultSchema>;
