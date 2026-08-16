import { z } from "zod";

export const staffRegistrationSchema = z
  .object({
    email: z.email(),
    id: z.string().min(1),
    image: z.string().nullable(),
    name: z.string(),
    role: z.literal("staff"),
  })
  .strict();

export const staffRegistrationIdInputSchema = z
  .object({ id: staffRegistrationSchema.shape.id })
  .strict();

export const staffRegistrationListSchema = z.array(staffRegistrationSchema);

export type StaffRegistration = z.output<typeof staffRegistrationSchema>;
