import { describe, expect, it } from "vitest";

import { isPostgresUniqueViolation } from "../errors";

describe("PostgreSQL errors", () => {
  it("matches unique violations by constraint", () => {
    expect(
      isPostgresUniqueViolation(
        { code: "23505", constraint: "teams_user_id_unique" },
        "teams_user_id_unique",
      ),
    ).toBeTruthy();
    expect(
      isPostgresUniqueViolation(
        { code: "23505", constraint: "another_constraint" },
        "teams_user_id_unique",
      ),
    ).toBeFalsy();
  });

  it("rejects unrelated and malformed errors", () => {
    expect(
      isPostgresUniqueViolation(
        { code: "23503", constraint: "teams_user_id_unique" },
        "teams_user_id_unique",
      ),
    ).toBeFalsy();
    expect(isPostgresUniqueViolation(new Error("database failed"), "constraint")).toBeFalsy();
    expect(isPostgresUniqueViolation(null, "constraint")).toBeFalsy();
  });
});
