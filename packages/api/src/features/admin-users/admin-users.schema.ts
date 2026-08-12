import { authRoleValues } from "@bmhk-2026/auth/permission";
import { z } from "zod";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

export const adminUserRoleSchema = z.enum(authRoleValues);

export const adminUserSchema = z
  .object({
    email: z.email(),
    id: z.string().min(1),
    name: z.string(),
    role: adminUserRoleSchema,
  })
  .strict();

export const adminUserPaginationSchema = z
  .object({
    pageIndex: z.int().nonnegative().default(0),
    pageSize: z.int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  })
  .strict();

export const adminUserSortSchema = z
  .object({
    desc: z.boolean(),
    id: z.enum(["email", "name", "role"]),
  })
  .strict();

export const adminUserColumnFilterSchema = z.discriminatedUnion("id", [
  z.object({ id: z.literal("email"), value: z.string().trim().max(254) }).strict(),
  z.object({ id: z.literal("name"), value: z.string().trim().max(255) }).strict(),
  z.object({ id: z.literal("role"), value: adminUserRoleSchema }).strict(),
]);

function hasUniqueIds(values: readonly { id: string }[]): boolean {
  return new Set(values.map(({ id }) => id)).size === values.length;
}

export const listAdminUsersSchema = z
  .object({
    columnFilters: z
      .array(adminUserColumnFilterSchema)
      .max(3)
      .refine(hasUniqueIds, { message: "Column filter IDs must be unique" })
      .default([]),
    pagination: adminUserPaginationSchema.default({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE }),
    sorting: z
      .array(adminUserSortSchema)
      .max(3)
      .refine(hasUniqueIds, { message: "Sort IDs must be unique" })
      .default([{ desc: false, id: "email" }]),
  })
  .strict();

export const adminUserListResultSchema = z
  .object({
    rowCount: z.int().nonnegative(),
    rows: z.array(adminUserSchema),
  })
  .strict();

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
export type AdminUserPagination = z.output<typeof adminUserPaginationSchema>;
export type AdminUserRole = z.infer<typeof adminUserRoleSchema>;
export type AdminUserRoleResult = z.infer<typeof adminUserRoleResultSchema>;
export type AdminUserSort = z.infer<typeof adminUserSortSchema>;
