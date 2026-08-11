import type { PublicProcedure } from "../../core/procedure";
import { featureFlagsSchema } from "./feature-flags.schema";
import type { FeatureFlagService } from "./feature-flags.service";

export function createFeatureFlagsRouter(
  publicProcedure: PublicProcedure,
  service: FeatureFlagService,
) {
  return {
    getAll: publicProcedure
      .route({ method: "GET", tags: ["Feature Flags"] })
      .output(featureFlagsSchema)
      .handler(() => service.getAll()),
  };
}
