import { z } from "zod";

const ID_PREFIX_PATTERN = /^[0-9a-f]{8}$/iu;
export const MAX_TEAM_NAME_QUERY_LENGTH = 40;

export const discordAdminUserInputSchema = z
  .object({ discord_user_id: z.string().trim().min(1) })
  .strict();

export const discordAdminCodeInputSchema = z.object({ code: z.string().trim().min(1) }).strict();

// Query-string values arrive as strings; exactly one selector must be present.
export const discordAdminTeamQuerySchema = z
  .object({
    id: z.string().regex(ID_PREFIX_PATTERN).optional(),
    index: z.coerce.number().int().positive().optional(),
    name: z.string().trim().min(1).max(MAX_TEAM_NAME_QUERY_LENGTH).optional(),
  })
  .strict()
  .refine(
    (query) => Object.values(query).filter((value) => value !== undefined).length === 1,
    "Provide exactly one of id, name, index",
  )
  .transform((query) => {
    if (query.id !== undefined) {
      return { id: query.id };
    }
    if (query.index !== undefined) {
      return { index: query.index };
    }
    return { name: query.name ?? "" };
  });
