import { describe, expect, it, vi } from "vitest";
import type { GetPresignedInput } from "..";
import { getPresigned } from "..";

vi.mock(import("@bmhk-2026/env/server"), () => ({
  env: {
    AWS_ACCESS_KEY_ID: "test-access-key",
    AWS_ENDPOINT_URL_S3: "http://localhost:9000",
    AWS_REGION: "us-east-1",
    AWS_S3_BUCKET: "media",
    AWS_SECRET_ACCESS_KEY: "test-secret-key",
    BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
    BETTER_AUTH_URL: "http://localhost:3000",
    CORS_ORIGIN: ["http://localhost:3001"],
    DATABASE_URL: "postgresql://localhost/test",
    NODE_ENV: "test" as const,
    PORT: 3000,
  },
}));

const validGetInput: GetPresignedInput = {
  bucket: "media",
  key: "documents/report.pdf",
  method: "GET",
};

const validPutInput: GetPresignedInput = {
  bucket: "media",
  contentType: "application/pdf",
  key: "documents/report.pdf",
  method: "PUT",
};

// @ts-expect-error PUT presigned URLs require contentType.
const invalidPutInput: GetPresignedInput = {
  bucket: "media",
  key: "documents/report.pdf",
  method: "PUT",
};

void invalidPutInput;

describe("presigned URLs", () => {
  it("generates a path-style GET URL with a 15-minute expiry", async () => {
    const url = new URL(await getPresigned(validGetInput));

    expect({
      algorithm: url.searchParams.get("X-Amz-Algorithm"),
      expires: url.searchParams.get("X-Amz-Expires"),
      host: url.host,
      path: url.pathname,
      signedHeaders: url.searchParams.get("X-Amz-SignedHeaders")?.split(";"),
    }).toStrictEqual({
      algorithm: "AWS4-HMAC-SHA256",
      expires: "900",
      host: "localhost:9000",
      path: "/media/documents/report.pdf",
      signedHeaders: ["host"],
    });
  });

  it("generates a PUT URL that signs the required content type", async () => {
    const url = new URL(await getPresigned(validPutInput));

    expect({
      algorithm: url.searchParams.get("X-Amz-Algorithm"),
      expires: url.searchParams.get("X-Amz-Expires"),
      host: url.host,
      path: url.pathname,
      signedHeaders: url.searchParams.get("X-Amz-SignedHeaders")?.split(";"),
    }).toStrictEqual({
      algorithm: "AWS4-HMAC-SHA256",
      expires: "900",
      host: "localhost:9000",
      path: "/media/documents/report.pdf",
      signedHeaders: ["content-type", "host"],
    });
  });

  it("adds inline response headers for file reads", async () => {
    const url = new URL(
      await getPresigned({
        bucket: "media",
        contentType: "application/pdf",
        key: "documents/report.pdf",
        method: "GET",
        originalName: "résumé final.pdf",
      }),
    );

    expect({
      contentDisposition: url.searchParams.get("response-content-disposition"),
      contentType: url.searchParams.get("response-content-type"),
    }).toStrictEqual({
      contentDisposition:
        "inline; filename=\"r_sum_ final.pdf\"; filename*=UTF-8''r%C3%A9sum%C3%A9%20final.pdf",
      contentType: "application/pdf",
    });
  });

  it("rejects an empty bucket", async () => {
    await expect(getPresigned({ ...validGetInput, bucket: "   " })).rejects.toThrow(
      "bucket must not be empty",
    );
  });

  it("rejects an empty key", async () => {
    await expect(getPresigned({ ...validGetInput, key: "" })).rejects.toThrow(
      "key must not be empty",
    );
  });

  it("rejects an empty PUT content type", async () => {
    await expect(getPresigned({ ...validPutInput, contentType: "\t" })).rejects.toThrow(
      "contentType must not be empty",
    );
  });
});
