import { pgEnum } from "drizzle-orm/pg-core";

export const checkInRoundValues = ["ROUND_1", "ROUND_2"] as const;
export const checkInRoundEnum = pgEnum("check_in_round", checkInRoundValues);
