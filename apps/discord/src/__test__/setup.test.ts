import { describe, expect, it } from "vitest";

import { applySetup } from "../interactions/commands/setup";
import type { SettingsStore } from "../lib/settings-store";

function createFakeStore(initial: Record<string, string> = {}): SettingsStore {
  const rows = new Map(Object.entries(initial));
  return {
    get: (key) => rows.get(key) ?? null,
    list: () => [...rows.entries()].map(([key, value]) => ({ key, value })),
    remove: (key) => {
      rows.delete(key);
    },
    set: (key, value) => {
      rows.set(key, value);
    },
  };
}

describe(applySetup, () => {
  it("stores only the roles given and keeps the ones already configured", () => {
    const store = createFakeStore({
      adminRole: "admin-1",
      participantRole: "part-1",
      staffRole: "staff-1",
    });

    applySetup(store, { registrationStaffRole: "reg-1" });

    expect(store.list()).toStrictEqual([
      { key: "adminRole", value: "admin-1" },
      { key: "participantRole", value: "part-1" },
      { key: "staffRole", value: "staff-1" },
      { key: "registrationStaffRole", value: "reg-1" },
    ]);
  });

  it("confirms each role set and points to /repairpermission for registration staff access", () => {
    const reply = applySetup(createFakeStore(), { registrationStaffRole: "reg-1" });

    expect(reply).toContain("`registrationStaffRole` set to <@&reg-1>");
    expect(reply).toContain("/repairpermission");
  });

  it("lists roles that are still not configured", () => {
    const reply = applySetup(createFakeStore({ staffRole: "staff-1" }), {
      participantRole: "part-1",
    });

    expect(reply).toContain("Still not configured: `adminRole`, `registrationStaffRole`");
  });

  it("says nothing changed when no role is given", () => {
    const reply = applySetup(
      createFakeStore({
        adminRole: "admin-1",
        participantRole: "part-1",
        registrationStaffRole: "reg-1",
        staffRole: "staff-1",
      }),
      {},
    );

    expect(reply).toBe("No roles given; nothing changed.");
  });
});
