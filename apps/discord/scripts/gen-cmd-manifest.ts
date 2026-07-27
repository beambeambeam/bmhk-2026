/**
 * Build-time codegen: scans src/interactions/commands and writes
 * src/commands-manifest.ts with explicit static imports so that
 * deploy-commands.ts can be bundled by `bun build` without needing
 * a runtime glob scan.
 *
 * Run this before bundling deploy-commands.ts:
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";

const commandsDir = join(import.meta.dir, "..", "src", "interactions", "commands");
const manifestPath = join(import.meta.dir, "..", "src", "commands.manifest.ts");

const files = readdirSync(commandsDir)
    .filter((f) => f.endsWith(".ts"))
    .sort();

const importLines = files.map((f, i) => {
    const name = `cmd${i}`;
    // Use .js extension so the static import resolves correctly after bundling
    const modulePath = `./interactions/commands/${f.replace(/\.ts$/, ".js")}`;
    return `import ${name} from "${modulePath}";`;
});

const exportNames = files.map((_, i) => `cmd${i}`);

const content = [
    "// AUTO-GENERATED do not edit by hand.",
    "// Re-run scripts/generate-commands-manifest.ts to update.",
    'import type { Command } from "./types.js";',
    "",
    ...importLines,
    "",
    `export const commands: Command[] = [${exportNames.join(", ")}];`,
    "",
].join("\n");

await Bun.write(manifestPath, content);
console.log(`Generated commands-manifest.ts with ${files.length} command(s):`);
for (const f of files) console.log(`  • ${f}`);
