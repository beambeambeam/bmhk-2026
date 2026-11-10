import type { CertificateJob } from "./recipients";
import type { CertificateTemplate } from "./templates";
import { showsAwardText } from "./templates";

// Figma frames are 842×595 pt (A4 landscape). All layout values below are pt from the frame's top-left.
export const PAGE_WIDTH_MM = 297;
export const PAGE_HEIGHT_MM = 210;
export const THAI_FONT_FAMILY = "Certificate Thai";
export const LATIN_FONT_FAMILY = "Certificate Latin";
const PAGE_WIDTH_PT = 842;
const PAGE_HEIGHT_PT = 595;

const TEXT_LEFT = 428;
const TEXT_WIDTH = 374;
const NAME_TOP = 232;
const AFFILIATION_TOP = 290;
const AWARD_TOP = 324;
// The sample text in the exported frames is covered by a white box before real text is drawn.
const MASK_LEFT = 425;
const MASK_TOP = 228;
const MASK_HEIGHT = 137;
// Appreciation has no award line, so its name block sits lower in the frame.
const APPRECIATION_OFFSET = 17;
const APPRECIATION_MASK_HEIGHT = 87;

export interface FontFace {
  family: string;
  weight: number;
  dataUrl: string;
}

export interface RenderAssets {
  backgroundDataUrl: string;
  fonts: readonly FontFace[];
}

const HTML_ESCAPES: Record<string, string> = {
  '"': "&quot;",
  "&": "&amp;",
  "'": "&#39;",
  "<": "&lt;",
  ">": "&gt;",
};
const HTML_SPECIAL_CHARACTERS = /[&<>"']/gu;

function escapeHtml(value: string): string {
  return value.replaceAll(
    HTML_SPECIAL_CHARACTERS,
    (character) => HTML_ESCAPES[character] ?? character,
  );
}

function fontFaceCss({ family, weight, dataUrl }: FontFace): string {
  return `@font-face { font-family: "${family}"; font-weight: ${weight}; src: url("${dataUrl}"); }`;
}

function layoutFor(template: CertificateTemplate): { offset: number; maskHeight: number } {
  return template === "appreciation"
    ? { maskHeight: APPRECIATION_MASK_HEIGHT, offset: APPRECIATION_OFFSET }
    : { maskHeight: MASK_HEIGHT, offset: 0 };
}

// Lines marked with data-fit shrink until they fit TEXT_WIDTH; the generator runs this after fonts load.
// Line height is fixed in pt, so a shrunk line stays vertically centered in its Figma slot.
export function shrinkLinesToFit(): void {
  const MIN_FONT_SIZE_PT = 8;
  const STEP_PT = 0.5;
  for (const element of document.querySelectorAll<HTMLElement>("[data-fit]")) {
    let size = Number(element.dataset.fit);
    while (element.scrollWidth > element.clientWidth && size > MIN_FONT_SIZE_PT) {
      size -= STEP_PT;
      element.style.fontSize = `${size}pt`;
    }
  }
}

function line(
  className: string,
  top: number,
  fontSize: number,
  lineHeight: number,
  text: string,
): string {
  const style = `top: ${top}pt; font-size: ${fontSize}pt; line-height: ${fontSize * lineHeight}pt`;
  return `<div class="line ${className}" style="${style}" data-fit="${fontSize}">${escapeHtml(text)}</div>`;
}

export function renderCertificateHtml(job: CertificateJob, assets: RenderAssets): string {
  const { offset, maskHeight } = layoutFor(job.template);
  const awardLine = showsAwardText(job.template)
    ? line("award", AWARD_TOP + offset, 24, 1.6, job.awardText)
    : "";
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<style>
${assets.fonts.map(fontFaceCss).join("\n")}
@page { size: ${PAGE_WIDTH_MM}mm ${PAGE_HEIGHT_MM}mm; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: ${PAGE_WIDTH_PT}pt; height: ${PAGE_HEIGHT_PT}pt; position: relative; overflow: hidden; }
.background { position: absolute; inset: 0; width: 100%; height: 100%; }
.mask { position: absolute; left: ${MASK_LEFT}pt; top: ${MASK_TOP + offset}pt; width: ${PAGE_WIDTH_PT - MASK_LEFT}pt; height: ${maskHeight}pt; background: #fff; }
.line { position: absolute; left: ${TEXT_LEFT}pt; width: ${TEXT_WIDTH}pt; font-family: "${THAI_FONT_FAMILY}", "${LATIN_FONT_FAMILY}"; white-space: pre; overflow: hidden; color: #282828; }
.name { font-weight: 700; letter-spacing: 0.05em; word-spacing: 8pt; }
.affiliation { font-weight: 400; }
.award { font-weight: 600; color: #c0563e; }
</style>
</head>
<body>
<img class="background" src="${assets.backgroundDataUrl}" alt="">
<div class="mask"></div>
${line("name", NAME_TOP + offset, 40, 1.2, job.fullName)}
${line("affiliation", AFFILIATION_TOP + offset, 18, 1.2, job.affiliationText)}
${awardLine}
</body>
</html>`;
}
