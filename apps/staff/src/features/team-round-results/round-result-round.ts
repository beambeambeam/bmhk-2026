import type { CheckInRound } from "@bmhk-2026/api";

const roundNumberByRound = {
  ROUND_1: 1,
  ROUND_2: 2,
  ROUND_3: 3,
} as const satisfies Record<CheckInRound, number>;

function getRoundNumber(round: CheckInRound): number {
  return roundNumberByRound[round];
}

export { getRoundNumber };
