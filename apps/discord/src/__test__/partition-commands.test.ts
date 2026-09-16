import { describe, expect, it } from "vitest";

import { partitionCommandsByGuildScope } from "../lib/partition-commands";
import type { Command } from "../types";

function fakeCommand(name: string, guildScope?: "staff"): Command {
  return {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- only `data.name` is read by the partition logic
    data: { name } as Command["data"],
    execute: () => {},
    guildScope,
  };
}

describe(partitionCommandsByGuildScope, () => {
  it("sends unscoped commands to the main guild", () => {
    const result = partitionCommandsByGuildScope([fakeCommand("ping")]);

    expect(result.main.map((c) => c.data.name)).toStrictEqual(["ping"]);
    expect(result.staff).toStrictEqual([]);
  });

  it("sends staff-scoped commands to the staff guild only", () => {
    const result = partitionCommandsByGuildScope([fakeCommand("verifystaff", "staff")]);

    expect(result.staff.map((c) => c.data.name)).toStrictEqual(["verifystaff"]);
    expect(result.main).toStrictEqual([]);
  });

  it("splits a mixed list correctly", () => {
    const result = partitionCommandsByGuildScope([
      fakeCommand("ping"),
      fakeCommand("verifystaff", "staff"),
      fakeCommand("verify"),
    ]);

    expect(result.main.map((c) => c.data.name)).toStrictEqual(["ping", "verify"]);
    expect(result.staff.map((c) => c.data.name)).toStrictEqual(["verifystaff"]);
  });
});
