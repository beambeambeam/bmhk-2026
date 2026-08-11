import type { FeatureFlagKey } from "@bmhk-2026/feature-flags";
import { z } from "zod";

const featureFlagsShape = {
  eligibleTeamsAnnouncement: z.boolean(),
  finalRound: z.boolean(),
  qualifyingResultsAnnouncement: z.boolean(),
  qualifyingRound: z.boolean(),
  registration: z.boolean(),
} satisfies Record<FeatureFlagKey, z.ZodBoolean>;

export const featureFlagsSchema = z.object(featureFlagsShape);

export type FeatureFlags = z.infer<typeof featureFlagsSchema>;
