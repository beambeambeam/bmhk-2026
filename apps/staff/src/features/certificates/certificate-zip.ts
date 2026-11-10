import { MAX_CERTIFICATE_FILES_PER_REQUEST } from "@bmhk-2026/api/certificates/rules";
import type { AppRouterClient, CertificateSet } from "@bmhk-2026/api";
import { BlobReader, BlobWriter, TextWriter, ZipReader } from "@zip.js/zip.js";
import type { FileEntry } from "@zip.js/zip.js";

const INFO_CSV_PATH = "info.csv";
// Keeps each upload request well under the server's 12 MiB body limit.
const MAX_BATCH_BYTES = 8 * 1024 * 1024;

export interface CertificateZipEntry {
  path: string;
  sizeBytes: number;
}

export interface CertificateUploadProgress {
  stored: number;
  total: number;
}

type CertificateUploadClient = Pick<
  AppRouterClient["certificates"],
  "completeUpload" | "startUpload" | "uploadFiles"
>;

interface BatchLimits {
  maxBytes: number;
  maxFiles: number;
}

const defaultBatchLimits: BatchLimits = {
  maxBytes: MAX_BATCH_BYTES,
  maxFiles: MAX_CERTIFICATE_FILES_PER_REQUEST,
};

/**
 * Groups files in order so each request stays under the byte and file limits. A file
 * larger than the byte limit goes alone; the server rejects it if it is too large.
 */
export function planUploadBatches(
  files: readonly CertificateZipEntry[],
  limits: BatchLimits = defaultBatchLimits,
): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let currentBytes = 0;
  for (const { path, sizeBytes } of files) {
    const isFull = current.length === limits.maxFiles || currentBytes + sizeBytes > limits.maxBytes;
    if (current.length > 0 && isFull) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(path);
    currentBytes += sizeBytes;
  }
  if (current.length > 0) {
    batches.push(current);
  }
  return batches;
}

function fileNameOf(path: string): string {
  return path.split("/").at(-1) ?? path;
}

/**
 * Reads the zip from disk on demand: only the central directory, info.csv, and one
 * batch of PDFs are in memory at a time. The server checks the layout.
 */
export async function uploadCertificateZip({
  client,
  file,
  onProgress,
}: {
  client: CertificateUploadClient;
  file: File;
  onProgress?: (progress: CertificateUploadProgress) => void;
}): Promise<CertificateSet> {
  const reader = new ZipReader(new BlobReader(file), { useWebWorkers: false });
  try {
    const entries = await reader.getEntries();
    const files = new Map<string, FileEntry>();
    for (const entry of entries) {
      if (!entry.directory) {
        files.set(entry.filename, entry);
      }
    }
    const infoEntry = files.get(INFO_CSV_PATH);
    const infoCsv = infoEntry ? await infoEntry.getData(new TextWriter()) : "";
    const { paths, setId } = await client.startUpload({
      entries: entries.map((entry) => ({
        path: entry.filename,
        sizeBytes: entry.directory ? 0 : entry.uncompressedSize,
      })),
      infoCsv,
      sourceName: file.name,
      sourceSizeBytes: file.size,
    });
    const batches = planUploadBatches(
      paths.map((path) => ({ path, sizeBytes: files.get(path)?.uncompressedSize ?? 0 })),
    );
    let stored = 0;
    onProgress?.({ stored, total: paths.length });
    for (const batch of batches) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- one batch at a time bounds memory and request size
      const batchFiles = await Promise.all(
        batch.map(async (path) => {
          const entry = files.get(path);
          if (!entry) {
            throw new Error(`Zip entry ${path} disappeared while uploading`);
          }
          const blob = await entry.getData(new BlobWriter("application/pdf"));
          return { file: new File([blob], fileNameOf(path), { type: "application/pdf" }), path };
        }),
      );
      // oxlint-disable-next-line eslint/no-await-in-loop -- one batch at a time bounds memory and request size
      await client.uploadFiles({ files: batchFiles, setId });
      stored += batch.length;
      onProgress?.({ stored, total: paths.length });
    }
    return await client.completeUpload({ setId });
  } finally {
    await reader.close();
  }
}
