/**
 * Build-time codegen: scans src/events, src/interactions/buttons,
 * src/interactions/modals, and src/interactions/selectMenus, then writes
 * static manifest files for buildtime.
 *
 * Run this before bundling bot:
 */

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dir, "..");

interface ManifestSpec {
  dir: string;
  out: string;
  typeImport: string;
  exportName: string;
  exportType: string;
}

const specs: ManifestSpec[] = [
  {
    dir: path.join(root, "src", "events"),
    exportName: "events",
    exportType: "Event[]",
    out: path.join(root, "src", "events.manifest.ts"),
    typeImport: 'import type { Event } from "./types.js";',
  },
  {
    dir: path.join(root, "src", "interactions", "buttons"),
    exportName: "buttons",
    exportType: "Button[]",
    out: path.join(root, "src", "buttons.manifest.ts"),
    typeImport: 'import type { Button } from "./types.js";',
  },
  {
    dir: path.join(root, "src", "interactions", "modals"),
    exportName: "modals",
    exportType: "Modal[]",
    out: path.join(root, "src", "modals.manifest.ts"),
    typeImport: 'import type { Modal } from "./types.js";',
  },
  {
    dir: path.join(root, "src", "interactions", "select-menus"),
    exportName: "selectMenus",
    exportType: "SelectMenu[]",
    out: path.join(root, "src", "select-menus.manifest.ts"),
    typeImport: 'import type { SelectMenu } from "./types.js";',
  },
];

const writes = specs.flatMap((spec) => {
  if (!existsSync(spec.dir)) {
    console.warn(`Skipping ${spec.dir} (does not exist)`);
    return [];
  }

  const files = readdirSync(spec.dir)
    .filter((f) => f.endsWith(".ts") && !f.startsWith("."))
    .toSorted();

  const importLines = files.map((f, i) => {
    const srcRel = spec.dir.replace(`${path.join(root, "src")}/`, "");
    const modulePath = `./${srcRel}/${f.replace(/\.ts$/u, ".js")}`;
    return `import h${i} from "${modulePath}";`;
  });

  const exportNames = files.map((_, i) => `h${i}`);

  const content = [
    "// AUTO-GENERATED do not edit by hand.",
    `// Re-run scripts/generate-handlers-manifest.ts to update.`,
    spec.typeImport,
    "",
    ...importLines,
    "",
    `export const ${spec.exportName}: ${spec.exportType} = [${exportNames.join(", ")}];`,
    "",
  ].join("\n");

  console.log(`Generated ${spec.out.replace(`${root}/`, "")} with ${files.length} handler(s):`);
  for (const f of files) {
    console.log(`  • ${f}`);
  }

  return [Bun.write(spec.out, content)];
});

await Promise.all(writes);
