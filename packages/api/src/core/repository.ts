import { hasErrorCode } from "./errors";

type RepositoryErrorFactory = (cause: unknown) => Error;

export function rethrowRepositoryError(
  cause: unknown,
  errorCode: string,
  createRepositoryError: RepositoryErrorFactory,
): never {
  if (hasErrorCode(cause, errorCode)) {
    throw cause;
  }

  throw createRepositoryError(cause);
}

export function createRepositoryExecutor(
  errorCode: string,
  createRepositoryError: RepositoryErrorFactory,
) {
  return async <Result>(operation: () => Promise<Result>): Promise<Result> => {
    try {
      return await operation();
    } catch (error) {
      return rethrowRepositoryError(error, errorCode, createRepositoryError);
    }
  };
}
