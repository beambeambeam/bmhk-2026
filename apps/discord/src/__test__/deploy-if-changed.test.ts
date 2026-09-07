import { SlashCommandBuilder } from "discord.js";
import { describe, expect, it } from "vitest";

import { hashCommands } from "../deploy-if-changed";
import type { Command } from "../types";

function fakeCommand(name: string, description: string): Command {
  return {
    data: new SlashCommandBuilder().setName(name).setDescription(description),
    execute: async () => {},
  };
}

describe(hashCommands, () => {
  it("produces the same hash for an identical command set", () => {
    const a = [fakeCommand("ping", "Replies with pong")];
    const b = [fakeCommand("ping", "Replies with pong")];

    expect(hashCommands(a)).toBe(hashCommands(b));
  });

  it("produces a different hash when a command's definition changes", () => {
    const before = [fakeCommand("ping", "Replies with pong")];
    const after = [fakeCommand("ping", "Replies with a pong")];

    expect(hashCommands(before)).not.toBe(hashCommands(after));
  });

  it("produces a different hash when a command is added", () => {
    const before = [fakeCommand("ping", "Replies with pong")];
    const after = [...before, fakeCommand("settings", "Manage settings")];

    expect(hashCommands(before)).not.toBe(hashCommands(after));
  });
});
