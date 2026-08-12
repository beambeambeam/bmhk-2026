import { describe, expect, it } from "vitest";

import { handleSettingsCommand } from "../interactions/commands/settings";
import type { SettingsStore } from "../lib/settings-store";

function createFakeStore(initial: Record<string, string> = {}): SettingsStore {
  const rows = new Map(Object.entries(initial));
  return {
    get: (key) => rows.get(key) ?? null,
    list: () => [...rows.entries()].map(([key, value]) => ({ key, value })),
    set: (key, value) => {
      rows.set(key, value);
    },
  };
}

describe(handleSettingsCommand, () => {
  it("stores the value and confirms the write on set", () => {
    const store = createFakeStore();

    const reply = handleSettingsCommand(store, {
      key: "welcome_channel",
      subcommand: "set",
      value: "#general",
    });

    expect(store.get("welcome_channel")).toBe("#general");
    expect(reply).toBe("Set `welcome_channel` to `#general`.");
  });

  it("overwrites an existing value on set", () => {
    const store = createFakeStore({ welcome_channel: "#old" });

    handleSettingsCommand(store, { key: "welcome_channel", subcommand: "set", value: "#new" });

    expect(store.get("welcome_channel")).toBe("#new");
  });

  it("returns the stored value on get", () => {
    const store = createFakeStore({ welcome_channel: "#general" });

    const reply = handleSettingsCommand(store, { key: "welcome_channel", subcommand: "get" });

    expect(reply).toBe("`welcome_channel` = `#general`");
  });

  it("reports when a key has no value on get", () => {
    const store = createFakeStore();

    const reply = handleSettingsCommand(store, { key: "missing", subcommand: "get" });

    expect(reply).toBe("No value set for `missing`.");
  });

  it("lists all stored keys and values", () => {
    const store = createFakeStore({ a: "1", b: "2" });

    const reply = handleSettingsCommand(store, { subcommand: "list" });

    expect(reply).toBe("`a` = `1`\n`b` = `2`");
  });

  it("reports when no settings are configured on list", () => {
    const store = createFakeStore();

    const reply = handleSettingsCommand(store, { subcommand: "list" });

    expect(reply).toBe("No settings configured.");
  });
});
