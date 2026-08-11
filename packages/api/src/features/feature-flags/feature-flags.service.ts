import { featureFlags } from "@bmhk-2026/feature-flags";
import type { FeatureFlagKey } from "@bmhk-2026/feature-flags";
import { Temporal } from "temporal-polyfill";

import type { FeatureFlags } from "./feature-flags.schema";

export interface FeatureFlagService {
  getAll: () => FeatureFlags;
}

interface FeatureFlagDefinition {
  endsAt?: string;
  startsAt: string;
}

interface ParsedFeatureFlagDefinition {
  endsAt?: Temporal.Instant;
  startsAt: Temporal.Instant;
}

function parseInstant(
  key: FeatureFlagKey,
  field: "endsAt" | "startsAt",
  value: string,
): Temporal.Instant {
  try {
    return Temporal.Instant.from(value);
  } catch (error) {
    throw new Error(
      `Invalid ${field} for feature flag "${key}": expected an ISO 8601 timestamp with an explicit offset`,
      { cause: error },
    );
  }
}

function parseDefinition(
  key: FeatureFlagKey,
  definition: FeatureFlagDefinition,
): ParsedFeatureFlagDefinition {
  const startsAt = parseInstant(key, "startsAt", definition.startsAt);
  const endsAt =
    definition.endsAt === undefined ? undefined : parseInstant(key, "endsAt", definition.endsAt);

  if (endsAt !== undefined && Temporal.Instant.compare(endsAt, startsAt) <= 0) {
    throw new Error(`Invalid window for feature flag "${key}": endsAt must be after startsAt`);
  }

  return { endsAt, startsAt };
}

export function createFeatureFlagService(
  now: () => Temporal.Instant = () => Temporal.Now.instant(),
): FeatureFlagService {
  const schedule = {
    eligibleTeamsAnnouncement: parseDefinition(
      "eligibleTeamsAnnouncement",
      featureFlags.eligibleTeamsAnnouncement,
    ),
    finalRound: parseDefinition("finalRound", featureFlags.finalRound),
    qualifyingResultsAnnouncement: parseDefinition(
      "qualifyingResultsAnnouncement",
      featureFlags.qualifyingResultsAnnouncement,
    ),
    qualifyingRound: parseDefinition("qualifyingRound", featureFlags.qualifyingRound),
    registration: parseDefinition("registration", featureFlags.registration),
  } satisfies Record<FeatureFlagKey, ParsedFeatureFlagDefinition>;

  return {
    getAll: () => {
      const currentTime = now();

      return {
        eligibleTeamsAnnouncement:
          Temporal.Instant.compare(currentTime, schedule.eligibleTeamsAnnouncement.startsAt) >= 0,
        finalRound: Temporal.Instant.compare(currentTime, schedule.finalRound.startsAt) >= 0,
        qualifyingResultsAnnouncement:
          Temporal.Instant.compare(currentTime, schedule.qualifyingResultsAnnouncement.startsAt) >=
          0,
        qualifyingRound:
          Temporal.Instant.compare(currentTime, schedule.qualifyingRound.startsAt) >= 0,
        registration:
          Temporal.Instant.compare(currentTime, schedule.registration.startsAt) >= 0 &&
          (schedule.registration.endsAt === undefined ||
            Temporal.Instant.compare(currentTime, schedule.registration.endsAt) < 0),
      };
    },
  };
}
