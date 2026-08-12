import { describe, expect, it } from "vitest";

import {
  getAdminUserFilterQueryOptions,
  getAdminUserListQueryOptions,
  getHealthCheckQueryOptions,
  getPrivateDataQueryOptions,
} from "../query-options";

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

  it("isolates admin user queries by actor and controlled table state", () => {
    const input = {
      columnFilters: [{ id: "email" as const, value: "@kmutt.ac.th" }],
      pagination: { pageIndex: 0, pageSize: 10 },
      sorting: [{ desc: false, id: "email" as const }],
    };
    const firstAdminList = getAdminUserListQueryOptions("admin-1", input);
    const secondAdminList = getAdminUserListQueryOptions("admin-2", input);
    const nextPage = getAdminUserListQueryOptions("admin-1", {
      ...input,
      pagination: { pageIndex: 1, pageSize: 10 },
    });
    const filterOptions = getAdminUserFilterQueryOptions();

    expect(firstAdminList.queryKey).not.toStrictEqual(secondAdminList.queryKey);
    expect(firstAdminList.queryKey).not.toStrictEqual(nextPage.queryKey);
    expect(filterOptions.enabled).toBeFalsy();
  });
});
