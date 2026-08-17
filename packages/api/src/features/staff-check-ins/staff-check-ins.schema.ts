import { z } from "zod";

import { createTableListResultSchema, createTableQuerySchema } from "../../core/table-query";

export const staffCheckInSchema = z
  .object({
    checkedInAt: z.date(),
    checkedInByName: z.string(),
  })
  .strict();

export const staffCheckInStaffSchema = z
  .object({
    checkIn: staffCheckInSchema.nullable(),
    email: z.email(),
    id: z.string().min(1),
    name: z.string(),
  })
  .strict();

export const staffCheckInColumnFilterSchema = z.discriminatedUnion("id", [
  z.object({ id: z.literal("email"), value: z.string().trim().max(254) }).strict(),
  z.object({ id: z.literal("name"), value: z.string().trim().max(255) }).strict(),
]);

export const listStaffCheckInsSchema = createTableQuerySchema({
  columnFilterSchema: staffCheckInColumnFilterSchema,
  defaultPageSize: 10,
  defaultSorting: [{ desc: false, id: "name" }],
  maxColumnFilters: 2,
  sortableColumnIds: ["email", "name", "checkedInAt"],
});

export const staffCheckInListResultSchema = createTableListResultSchema(staffCheckInStaffSchema);

export const createStaffCheckInSchema = z.object({ staffUserId: z.string().min(1) }).strict();

export type StaffCheckInColumnFilter = z.infer<typeof staffCheckInColumnFilterSchema>;
export type StaffCheckInListQuery = z.output<typeof listStaffCheckInsSchema>;
export type StaffCheckInListResult = z.output<typeof staffCheckInListResultSchema>;
export type StaffCheckInSort = StaffCheckInListQuery["sorting"][number];
export type StaffCheckInStaff = z.infer<typeof staffCheckInStaffSchema>;
