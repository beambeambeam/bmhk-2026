export interface RoleSettings {
  admin: string | null;
  participant: string | null;
  registrationStaff: string | null;
  staff: string | null;
}

function configured(value: string | null | undefined): string | null {
  return value === null || value === undefined || value === "" ? null : value;
}

/** Role ids `/setup` stored. Loaded lazily so importers don't pull in bun:sqlite — see lib/db.ts. */
export async function getRoleSettings(): Promise<RoleSettings> {
  const { getSettingsStore } = await import("./settings-store.js");
  const store = getSettingsStore();
  return {
    admin: configured(store.get("adminRole")),
    // Same env fallback verify-confirm uses, so a participant verified before /setup is still repairable.
    participant: configured(store.get("participantRole") ?? Bun.env.DISCORD_PARTICIPANT_ROLE_ID),
    registrationStaff: configured(store.get("registrationStaffRole")),
    staff: configured(store.get("staffRole")),
  };
}
