import { BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";
import { describe, expect, it } from "vitest";

import { planUploadBatches, uploadCertificateZip } from "../certificate-zip";

const SET_ID = "55555555-5555-4555-8555-555555555555";
const ADVISOR_PATH = "cert/appreciation/BH001-26_advisor_Gamma-Advisor.pdf";
const PARTICIPANT_PATH = "cert/semi-final/BH001-26_1_Alpha-One.pdf";

interface StartInput {
  entries: { path: string; sizeBytes: number }[];
  infoCsv: string;
  mode: string;
  sourceName: string;
  sourceSizeBytes: number;
}

async function createZip(files: Record<string, string>): Promise<File> {
  const writer = new ZipWriter(new BlobWriter("application/zip"), { useWebWorkers: false });
  await writer.add("cert/", undefined, { directory: true });
  await Promise.all(
    Object.entries(files).map(async ([path, body]) => await writer.add(path, new TextReader(body))),
  );
  return new File([await writer.close()], "certificates.zip");
}

function createClient() {
  const calls = {
    completed: [] as string[],
    started: [] as StartInput[],
    uploaded: [] as { bodies: string[]; paths: string[] }[],
  };
  const client = {
    completeUpload: async ({ setId }: { setId: string }) => {
      calls.completed.push(setId);
      return await Promise.resolve({
        certificateCount: 2,
        id: setId,
        mode: "MERGE" as const,
        sourceName: "certificates.zip",
        sourceSizeBytes: 1,
        uploadedAt: new Date("2026-11-01T03:00:00.000Z"),
        uploadedBy: null,
        uploadedCount: 2,
      });
    },
    startUpload: async (input: StartInput) => {
      calls.started.push(input);
      return await Promise.resolve({ paths: [ADVISOR_PATH, PARTICIPANT_PATH], setId: SET_ID });
    },
    uploadFiles: async ({ files }: { files: { file: File; path: string }[]; setId: string }) => {
      const bodies = await Promise.all(files.map(async ({ file }) => await file.text()));
      calls.uploaded.push({ bodies, paths: files.map(({ path }) => path) });
      return { remaining: 0, stored: files.length };
    },
  };
  return { calls, client };
}

describe("certificate zip upload", () => {
  it("sends info.csv, the entry list, and the mode, then each PDF, then completes the set", async () => {
    const file = await createZip({
      [ADVISOR_PATH]: "%PDF-advisor",
      [PARTICIPANT_PATH]: "%PDF-alpha",
      "info.csv": "role,certificate\r\n",
    });
    const { calls, client } = createClient();
    const progress: number[] = [];

    const set = await uploadCertificateZip({
      client,
      file,
      mode: "MERGE",
      onProgress: ({ stored }) => {
        progress.push(stored);
      },
    });

    expect(
      calls.started.map(({ entries, ...rest }) => ({
        ...rest,
        entries: new Set(entries.map(({ path, sizeBytes }) => `${path}:${sizeBytes}`)),
      })),
    ).toStrictEqual([
      {
        entries: new Set([
          "cert/:0",
          `${ADVISOR_PATH}:12`,
          `${PARTICIPANT_PATH}:10`,
          "info.csv:18",
        ]),
        infoCsv: "role,certificate\r\n",
        mode: "MERGE",
        sourceName: "certificates.zip",
        sourceSizeBytes: file.size,
      },
    ]);
    expect(calls.uploaded).toStrictEqual([
      {
        bodies: ["%PDF-advisor", "%PDF-alpha"],
        paths: [ADVISOR_PATH, PARTICIPANT_PATH],
      },
    ]);
    expect(calls.completed).toStrictEqual([SET_ID]);
    expect(progress).toStrictEqual([0, 2]);
    expect(set.id).toBe(SET_ID);
  });
});

describe("upload batches", () => {
  it("starts a new batch when the next file would pass the byte or file limit", () => {
    const files = [
      { path: "a.pdf", sizeBytes: 4 },
      { path: "b.pdf", sizeBytes: 4 },
      { path: "c.pdf", sizeBytes: 3 },
      { path: "d.pdf", sizeBytes: 20 },
      { path: "e.pdf", sizeBytes: 1 },
      { path: "f.pdf", sizeBytes: 1 },
      { path: "g.pdf", sizeBytes: 1 },
    ];

    expect(planUploadBatches(files, { maxBytes: 10, maxFiles: 2 })).toStrictEqual([
      ["a.pdf", "b.pdf"],
      ["c.pdf"],
      ["d.pdf"],
      ["e.pdf", "f.pdf"],
      ["g.pdf"],
    ]);
  });
});
