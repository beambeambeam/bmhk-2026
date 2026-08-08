const POSTGRES_UNIQUE_VIOLATION = "23505";

export function isPostgresUniqueViolation(error: unknown, constraint: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === POSTGRES_UNIQUE_VIOLATION &&
    "constraint" in error &&
    error.constraint === constraint
  );
}
