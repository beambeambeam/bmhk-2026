import { getPresigned } from "@bmhk-2026/s3";

import { createFileStorageUnavailableError } from "./files.errors";
import type { PublicFileWithUrl, StoredFile } from "./files.types";

export async function toPublicFileWithUrl(file: StoredFile): Promise<PublicFileWithUrl> {
  let url: string;
  try {
    url = await getPresigned({
      bucket: file.bucket,
      contentType: file.contentType,
      key: file.objectKey,
      method: "GET",
      originalName: file.originalName,
    });
  } catch (error) {
    throw createFileStorageUnavailableError(error);
  }

  return {
    contentType: file.contentType,
    id: file.id,
    originalName: file.originalName,
    sizeBytes: file.sizeBytes,
    uploadedAt: file.uploadedAt,
    url,
  };
}
