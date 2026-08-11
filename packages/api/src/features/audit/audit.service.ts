import type { AuditInput } from "evlog";

import type { ApiContext } from "../../core/context";

interface AuditSuccessFields {
  action?: AuditInput["action"];
  changes?: AuditInput["changes"];
  target?: AuditInput["target"];
}

interface AuditOperationOptions<Result> {
  audit: AuditInput;
  deniedErrorCodes?: readonly string[];
  execute: () => Promise<Result>;
  log: ApiContext["log"];
  onSuccess?: (result: Result) => AuditSuccessFields;
}

function getErrorField(error: unknown, field: "code" | "status"): unknown {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  if (field === "code" && "code" in error) {
    return error.code;
  }
  return "status" in error ? error.status : undefined;
}

function getFailureReason(error: unknown): string {
  const code = getErrorField(error, "code");
  if (typeof code === "string" && code.length > 0) {
    return code;
  }

  const status = getErrorField(error, "status");
  return typeof status === "number" ? `HTTP_${status}` : "UNKNOWN_FAILURE";
}

function getFailureOutcome(
  error: unknown,
  deniedErrorCodes: readonly string[],
): "denied" | "failure" {
  const code = getErrorField(error, "code");
  return getErrorField(error, "status") === 403 ||
    (typeof code === "string" && deniedErrorCodes.includes(code))
    ? "denied"
    : "failure";
}

export async function executeAudited<Result>({
  audit,
  deniedErrorCodes = [],
  execute,
  log,
  onSuccess,
}: AuditOperationOptions<Result>): Promise<Result> {
  try {
    const result = await execute();
    log.audit({
      ...audit,
      ...onSuccess?.(result),
      outcome: "success",
    });
    return result;
  } catch (error) {
    log.audit({
      ...audit,
      outcome: getFailureOutcome(error, deniedErrorCodes),
      reason: getFailureReason(error),
    });
    throw error;
  }
}
