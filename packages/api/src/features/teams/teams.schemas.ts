import { teamAwardValues } from "@bmhk-2026/db/schema/teams";
import { z } from "zod";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const awardSchema = z.enum(teamAwardValues);
const memberCountSchema = z.int().nonnegative();
const nameSchema = z.string().trim().min(1).max(120);
const schoolSchema = z.string().trim().min(1).max(200);
const teamIdSchema = z.uuid();

export const createTeamSchema = z
  .object({
    award: awardSchema.default("NO_ACHIEVEMENT"),
    memberCount: memberCountSchema.default(0),
    name: nameSchema,
    school: schoolSchema,
  })
  .strict();

export const listTeamsSchema = z
  .object({
    limit: z.int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
    offset: z.int().nonnegative().default(0),
  })
  .strict()
  .default({ limit: DEFAULT_LIMIT, offset: 0 });

export const teamIdInputSchema = z.object({ id: teamIdSchema }).strict();

const updateTeamDataSchema = z
  .object({
    award: awardSchema.optional(),
    memberCount: memberCountSchema.optional(),
    name: nameSchema.optional(),
    school: schoolSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one team field is required",
  });

export const updateTeamSchema = z
  .object({
    data: updateTeamDataSchema,
    id: teamIdSchema,
  })
  .strict();
