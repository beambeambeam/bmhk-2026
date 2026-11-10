export const certificateTemplates = [
  "first",
  "second",
  "third",
  "honorable-mention",
  "semi-final",
  "final",
  "participate",
  "appreciation",
] as const;

export type CertificateTemplate = (typeof certificateTemplates)[number];

// Appreciation certificates go to advisors and print no award line.
export function showsAwardText(template: CertificateTemplate): boolean {
  return template !== "appreciation";
}

// Figma has no Final frame, so Final certificates reuse the Semi-Final artwork.
export function backgroundName(template: CertificateTemplate): CertificateTemplate {
  return template === "final" ? "semi-final" : template;
}
