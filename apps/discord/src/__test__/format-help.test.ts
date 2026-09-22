import { describe, expect, it } from "vitest";

import { formatHelp } from "../lib/format-help";

describe(formatHelp, () => {
  it("lists each command's name and description, sorted alphabetically", () => {
    const text = formatHelp([
      { description: "Replies with Pong!", name: "ping" },
      { description: "(Admin) Look up a join code.", name: "codeinfo" },
    ]);

    expect(text).toBe(
      ["**/codeinfo** — (Admin) Look up a join code.", "**/ping** — Replies with Pong!"].join("\n"),
    );
  });

  it("returns an empty string for no commands", () => {
    expect(formatHelp([])).toBe("");
  });
});
