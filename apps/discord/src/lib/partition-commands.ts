import type { Command } from "../types.js";

export interface PartitionedCommands {
  main: Command[];
  staff: Command[];
}

/** Splits commands by guildScope so the main and staff-only guilds each get their own set. */
export function partitionCommandsByGuildScope(commands: Command[]): PartitionedCommands {
  const main: Command[] = [];
  const staff: Command[] = [];

  for (const command of commands) {
    (command.guildScope === "staff" ? staff : main).push(command);
  }

  return { main, staff };
}
