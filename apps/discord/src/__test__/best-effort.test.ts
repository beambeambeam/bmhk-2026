import { describe, expect, it } from "vitest";

import { runBestEffort } from "../lib/best-effort";

describe(runBestEffort, () => {
  it("runs every step and reports only the labels of the ones that failed", async () => {
    const ran: string[] = [];
    const failed = await runBestEffort([
      {
        label: "remove role",
        run: async () => {
          ran.push("remove role");
          await Promise.resolve();
        },
      },
      {
        label: "reset nickname",
        run: async () => {
          ran.push("reset nickname");
          await Promise.reject(new Error("Missing Permissions"));
        },
      },
      {
        label: "revoke channel",
        run: async () => {
          ran.push("revoke channel");
          await Promise.resolve();
        },
      },
    ]);

    expect(ran).toStrictEqual(["remove role", "reset nickname", "revoke channel"]);
    expect(failed).toStrictEqual(["reset nickname"]);
  });
});
