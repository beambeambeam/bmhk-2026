import { z } from "zod";

export const apiKeySchema = z
  .object({
    createdAt: z.date(),
    enabled: z.boolean(),
    expiresAt: z.date().nullable(),
    id: z.string().min(1),
    lastRequest: z.date().nullable(),
    name: z.string().nullable(),
    ownerEmail: z.string().nullable(),
    ownerName: z.string().nullable(),
    start: z.string().nullable(),
  })
  .strict();

export const listApiKeysResultSchema = z
  .object({
    apiKeys: z.array(apiKeySchema),
  })
  .strict();

export const createApiKeySchema = z
  .object({
    expiresInDays: z.int().min(1).max(365).nullable().optional(),
    name: z.string().trim().min(1).max(64),
  })
  .strict();

export const createApiKeyResultSchema = z
  .object({
    createdAt: z.date(),
    expiresAt: z.date().nullable(),
    id: z.string().min(1),
    key: z.string().min(1),
    name: z.string().nullable(),
    start: z.string().nullable(),
  })
  .strict();

export const revokeApiKeySchema = z
  .object({
    id: z.string().min(1),
  })
  .strict();

export const revokeApiKeyResultSchema = apiKeySchema;

export type ApiKey = z.infer<typeof apiKeySchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type CreateApiKeyResult = z.infer<typeof createApiKeyResultSchema>;
export type ListApiKeysResult = z.infer<typeof listApiKeysResultSchema>;
export type RevokeApiKeyInput = z.infer<typeof revokeApiKeySchema>;
