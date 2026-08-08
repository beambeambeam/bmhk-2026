import { createError } from "evlog";
import { describe, expect, it } from "vitest";

import { createRepositoryExecutor } from "../core/repository";

function createRepositoryError(cause: unknown) {
  return createError({
    cause: cause instanceof Error ? cause : new Error("Unknown repository error"),
    code: "TEST_REPOSITORY_ERROR",
    message: "Repository operation failed",
    status: 500,
  });
}

describe("repository executor", () => {
  it("returns successful operation results", async () => {
    const execute = createRepositoryExecutor("TEST_REPOSITORY_ERROR", createRepositoryError);

    await expect(execute(async () => await Promise.resolve("result"))).resolves.toBe("result");
  });

  it("wraps unknown failures with a sanitized repository error", async () => {
    const execute = createRepositoryExecutor("TEST_REPOSITORY_ERROR", createRepositoryError);

    await expect(
      execute(async () => await Promise.reject(new Error("password authentication failed"))),
    ).rejects.toMatchObject({
      code: "TEST_REPOSITORY_ERROR",
      message: "Repository operation failed",
      status: 500,
    });
  });

  it("preserves existing repository errors", async () => {
    const execute = createRepositoryExecutor("TEST_REPOSITORY_ERROR", createRepositoryError);
    const repositoryError = createRepositoryError(new Error("database failed"));

    await expect(execute(async () => await Promise.reject(repositoryError))).rejects.toBe(
      repositoryError,
    );
  });
});
