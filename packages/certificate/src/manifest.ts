import Papa from "papaparse";

import { jobPath, parseRecipientRecords, toCertificateJobs } from "./recipients";

// Folder that holds the PDFs inside the zip.
export const CERT_DIR = "cert";

// The source CSV with one added column: the recipient's PDF path inside the zip.
export function buildInfoCsv(csv: string): string {
  const records = parseRecipientRecords(csv);
  const jobs = toCertificateJobs(records);
  return Papa.unparse(
    records.map((record, index) => {
      const job = jobs[index];
      if (job === undefined) {
        throw new Error(`No certificate for row ${index}`);
      }
      return { ...record, certificate: `${CERT_DIR}/${jobPath(job)}` };
    }),
  );
}
