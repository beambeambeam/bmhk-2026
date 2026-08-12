import { describe, expect, it } from "vitest";

import { getHealthCheckQueryOptions, getPrivateDataQueryOptions } from "../query-options";

describe("shared query options", () => {
  it("polls health checks without treating them as immediately stale", () => {
    const options = getHealthCheckQueryOptions();

    expect(options.staleTime).toBe(10_000);
    expect(options.refetchInterval).toBe(30_000);
  });

  it("isolates protected cache entries by user", () => {
    const firstUserOptions = getPrivateDataQueryOptions("user-1");
    const secondUserOptions = getPrivateDataQueryOptions("user-2");

    expect(firstUserOptions.queryKey).not.toStrictEqual(secondUserOptions.queryKey);
  });

  it("can disable a protected query before authorization is known", () => {
    const options = getPrivateDataQueryOptions("user-1", false);

    expect(options.enabled).toBeFalsy();
  });
});
