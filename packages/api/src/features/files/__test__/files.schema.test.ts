import type { files } from "@bmhk-2026/db/schema/files";
import { describe, expect, it } from "vitest";

import { toStoredFileOfKind } from "../files.schema";

const storedFile = {
  bucket: "uploads",
  contentType: "application/pdf",
  id: "11111111-1111-4111-8111-111111111111",
  objectKey: "files/11111111-1111-4111-8111-111111111111",
  originalName: "submission.pdf",
  sizeBytes: 9,
  uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
  uploadedBy: "user-1",
} satisfies typeof files.$inferSelect;

describe("stored file kind validation", () => {
  it("accepts a file matching the required kind", () => {
    expect(toStoredFileOfKind(storedFile, "pdf")).toStrictEqual(storedFile);
  });

  it.each([
    ["application/pdf", "image"],
    ["image/png", "pdf"],
  ] as const)("rejects %s as %s", (contentType, kind) => {
    expect(() => toStoredFileOfKind({ ...storedFile, contentType }, kind)).toThrow(
      "Stored file type is invalid",
    );
  });
});
