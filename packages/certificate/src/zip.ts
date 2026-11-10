import { mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

import Papa from "papaparse";

import { buildInfoCsv, CERT_DIR } from "./manifest";

const packageRoot = path.resolve(import.meta.dir, "..");
const INFO_FILE = "info.csv";
// Excel needs a byte order mark to read Thai text in a UTF-8 CSV.
const BYTE_ORDER_MARK = "\uFEFF";

async function findMissingPdfs(infoCsv: string, outDir: string): Promise<string[]> {
  const { data } = Papa.parse<{ certificate: string }>(infoCsv, { header: true });
  const checks = await Promise.all(
    data.map(async ({ certificate }) => {
      const pdfPath = path.join(outDir, path.relative(CERT_DIR, certificate));
      return (await Bun.file(pdfPath).exists()) ? undefined : certificate;
    }),
  );
  return checks.filter((certificate) => certificate !== undefined);
}

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { out: { type: "string" }, zip: { type: "string" } },
  });
  const [csvPath] = positionals;
  if (csvPath === undefined) {
    throw new Error("Usage: bun run zip <recipients.csv> [--out dir] [--zip file]");
  }
  const outDir = path.resolve(values.out ?? path.join(packageRoot, "out"));
  const zipPath = path.resolve(values.zip ?? path.join(packageRoot, "certificates.zip"));

  const infoCsv = buildInfoCsv(await Bun.file(csvPath).text());
  const missing = await findMissingPdfs(infoCsv, outDir);
  if (missing.length > 0) {
    throw new Error(
      `${missing.length} certificates are missing from ${outDir}, run generate first. First: ${missing[0]}`,
    );
  }

  // Stage info.csv next to a cert/ link to the output folder, so the zip root holds both.
  const stagingDir = await mkdtemp(path.join(tmpdir(), "certificates-"));
  try {
    await Bun.write(path.join(stagingDir, INFO_FILE), `${BYTE_ORDER_MARK}${infoCsv}\n`);
    await symlink(outDir, path.join(stagingDir, CERT_DIR));
    await rm(zipPath, { force: true });
    const zip = Bun.spawn(["zip", "-r", "-q", zipPath, INFO_FILE, CERT_DIR, "-x", "*.DS_Store"], {
      cwd: stagingDir,
      stderr: "inherit",
    });
    if ((await zip.exited) !== 0) {
      throw new Error(`zip exited with code ${zip.exitCode}`);
    }
  } finally {
    await rm(stagingDir, { force: true, recursive: true });
  }
  process.stdout.write(`Wrote ${zipPath}\n`);
}

await main();
