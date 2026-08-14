export const featureFlags = {
  eligibleTeamsAnnouncement: {
    startsAt: "2026-09-23T00:00:00+07:00",
  },
  finalRound: {
    startsAt: "2026-11-07T00:00:00+07:00",
  },
  qualifyingResultsAnnouncement: {
    startsAt: "2026-09-28T00:00:00+07:00",
  },
  qualifyingRound: {
    startsAt: "2026-09-26T09:00:00+07:00",
  },
  registration: {
    endsAt: "2026-09-21T00:00:00+07:00",
    startsAt: "2026-08-17T00:00:00+07:00",
  },
} as const;

export type FeatureFlagKey = keyof typeof featureFlags;
