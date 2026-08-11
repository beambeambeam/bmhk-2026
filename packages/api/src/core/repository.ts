import { hasErrorCode } from "./errors";

type RepositoryErrorFactory = (cause: unknown) => Error;

interface RepositoryErrorDescriptor {
  code: string;
  create: RepositoryErrorFactory;
}

export function rethrowRepositoryError(
  cause: unknown,
  descriptor: RepositoryErrorDescriptor,
): never {
  if (hasErrorCode(cause, descriptor.code)) {
    throw cause;
  }

  throw descriptor.create(cause);
}

export function createRepositoryExecutor(descriptor: RepositoryErrorDescriptor) {
  return async <Result>(operation: () => Promise<Result>): Promise<Result> => {
    try {
      return await operation();
    } catch (error) {
      return rethrowRepositoryError(error, descriptor);
    }
  };
}
