import { authRoleValues } from "@bmhk-2026/auth/permission";
import { z } from "zod";

import { createTableListResultSchema, createTableQuerySchema } from "../../core/table-query";

export const adminUserRoleSchema = z.enum(authRoleValues);

export const adminUserSchema = z
  .object({
    email: z.email(),
    id: z.string().min(1),
    name: z.string(),
    role: adminUserRoleSchema,
  })
  .strict();

export const adminUserColumnFilterSchema = z.discriminatedUnion("id", [
  z.object({ id: z.literal("email"), value: z.string().trim().max(254) }).strict(),
  z.object({ id: z.literal("name"), value: z.string().trim().max(255) }).strict(),
  z.object({ id: z.literal("role"), value: adminUserRoleSchema }).strict(),
]);

export const listAdminUsersSchema = createTableQuerySchema({
  columnFilterSchema: adminUserColumnFilterSchema,
  defaultPageSize: 10,
  defaultSorting: [{ desc: false, id: "email" }],
  maxColumnFilters: 3,
  sortableColumnIds: ["email", "name", "role"],
});

export const adminUserListResultSchema = createTableListResultSchema(adminUserSchema);

export const adminUserFilterOptionsSchema = z
  .object({
    roles: z.array(adminUserRoleSchema).length(authRoleValues.length),
  })
  .strict();

export const setAdminUserRoleSchema = z
  .object({
    role: adminUserRoleSchema,
    userId: z.string().min(1),
  })
  .strict();

export const adminUserRoleResultSchema = setAdminUserRoleSchema;

export type AdminUser = z.infer<typeof adminUserSchema>;
export type AdminUserColumnFilter = z.infer<typeof adminUserColumnFilterSchema>;
export type AdminUserFilterOptions = z.infer<typeof adminUserFilterOptionsSchema>;
export type AdminUserListInput = z.input<typeof listAdminUsersSchema>;
export type AdminUserListQuery = z.output<typeof listAdminUsersSchema>;
export type AdminUserListResult = z.output<typeof adminUserListResultSchema>;
export type AdminUserPagination = AdminUserListQuery["pagination"];
export type AdminUserRole = z.infer<typeof adminUserRoleSchema>;
export type AdminUserRoleResult = z.infer<typeof adminUserRoleResultSchema>;
export type AdminUserSort = AdminUserListQuery["sorting"][number];
