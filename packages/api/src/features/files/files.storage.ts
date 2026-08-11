import { env } from "@bmhk-2026/env/server";
import { deleteObject, getPresigned, putObject } from "@bmhk-2026/s3";

import type { AllowedFileContentType } from "./files.schema";

export interface FileStorageLocation {
  bucket: string;
  objectKey: string;
}

export interface FileStorageObject extends FileStorageLocation {
  contentType: AllowedFileContentType;
  originalName: string;
}

export interface FileStorageUpload extends FileStorageObject {
  body: Uint8Array;
}

export interface FileStorage {
  bucket: string;
  delete: (location: FileStorageLocation) => Promise<void>;
  getDownloadUrl: (object: FileStorageObject) => Promise<string>;
  upload: (object: FileStorageUpload) => Promise<void>;
}

export function createS3FileStorage(): FileStorage {
  return {
    bucket: env.AWS_S3_BUCKET,
    delete: async ({ bucket, objectKey }) => {
      await deleteObject({ bucket, key: objectKey });
    },
    getDownloadUrl: async ({ bucket, contentType, objectKey, originalName }) =>
      await getPresigned({
        bucket,
        contentType,
        key: objectKey,
        method: "GET",
        originalName,
      }),
    upload: async ({ body, bucket, contentType, objectKey, originalName }) => {
      await putObject({
        body,
        bucket,
        contentType,
        key: objectKey,
        originalName,
      });
    },
  };
}
