import { mkdir } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright";
import type { Page } from "playwright";

import { jobPath, parseCertificateJobs } from "./recipients";
import type { CertificateJob } from "./recipients";
import {
  LATIN_FONT_FAMILY,
  PAGE_HEIGHT_MM,
  PAGE_WIDTH_MM,
  renderCertificateHtml,
  shrinkLinesToFit,
  THAI_FONT_FAMILY,
} from "./render";
import type { FontFace } from "./render";
import { backgroundName } from "./templates";
import type { CertificateTemplate } from "./templates";

const packageRoot = path.resolve(import.meta.dir, "..");
const backgroundsDir = path.join(packageRoot, "assets/backgrounds");
const fontsDir = path.join(packageRoot, "assets/fonts");

// Noto Sans Thai has no Latin letters, so Noto Sans draws the Latin text in team names.
const fontFamilies = [
  { family: THAI_FONT_FAMILY, prefix: "NotoSansThai" },
  { family: LATIN_FONT_FAMILY, prefix: "NotoSans" },
] as const;
const fontWeights = [
  { style: "Regular", weight: 400 },
  { style: "SemiBold", weight: 600 },
  { style: "Bold", weight: 700 },
] as const;

async function toDataUrl(filePath: string, mimeType: string): Promise<string> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new Error(`Missing asset: ${filePath}`);
  }
  return `data:${mimeType};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
}

async function loadFonts(): Promise<FontFace[]> {
  return await Promise.all(
    fontFamilies.flatMap(({ family, prefix }) =>
      fontWeights.map(async ({ style, weight }) => ({
        dataUrl: await toDataUrl(path.join(fontsDir, `${prefix}-${style}.ttf`), "font/ttf"),
        family,
        weight,
      })),
    ),
  );
}

async function loadBackgrounds(
  templates: ReadonlySet<CertificateTemplate>,
): Promise<Map<CertificateTemplate, string>> {
  const entries = await Promise.all(
    [...templates].map(
      async (template) =>
        [
          template,
          await toDataUrl(
            path.join(backgroundsDir, `${backgroundName(template)}.png`),
            "image/png",
          ),
        ] as const,
    ),
  );
  return new Map(entries);
}

async function writeCertificate(
  page: Page,
  job: CertificateJob,
  backgroundDataUrl: string,
  fonts: readonly FontFace[],
  outDir: string,
): Promise<void> {
  const pdfPath = path.join(outDir, jobPath(job));
  await mkdir(path.dirname(pdfPath), { recursive: true });
  await page.setContent(renderCertificateHtml(job, { backgroundDataUrl, fonts }), {
    waitUntil: "load",
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.evaluate(shrinkLinesToFit);
  await page.pdf({
    height: `${PAGE_HEIGHT_MM}mm`,
    path: pdfPath,
    printBackground: true,
    width: `${PAGE_WIDTH_MM}mm`,
  });
}

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { limit: { type: "string" }, out: { type: "string" } },
  });
  const [csvPath] = positionals;
  if (csvPath === undefined) {
    throw new Error("Usage: bun run render <recipients.csv> [--out dir] [--limit n]");
  }
  const outDir = path.resolve(values.out ?? path.join(packageRoot, "out"));
  const allJobs = parseCertificateJobs(await Bun.file(csvPath).text());
  const jobs = values.limit === undefined ? allJobs : allJobs.slice(0, Number(values.limit));

  const fonts = await loadFonts();
  const backgrounds = await loadBackgrounds(new Set(jobs.map((job) => job.template)));

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (const [index, job] of jobs.entries()) {
      const backgroundDataUrl = backgrounds.get(job.template);
      if (backgroundDataUrl === undefined) {
        throw new Error(`No background loaded for template ${job.template}`);
      }
      // eslint-disable-next-line no-await-in-loop -- one shared page renders certificates in order
      await writeCertificate(page, job, backgroundDataUrl, fonts, outDir);
      process.stdout.write(`\r${index + 1}/${jobs.length}`);
    }
    process.stdout.write(`\nWrote ${jobs.length} certificates to ${outDir}\n`);
  } finally {
    await browser.close();
  }
}

await main();
