export interface HelpCommandInfo {
  description: string;
  name: string;
}

export function formatHelp(commands: HelpCommandInfo[]): string {
  return commands
    .toSorted((left, right) => left.name.localeCompare(right.name))
    .map(({ description, name }) => `**/${name}** — ${description}`)
    .join("\n");
}
