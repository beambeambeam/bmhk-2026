import { describe, expect, it } from "vitest";

import { cn } from "../utils";

describe("class name utility", () => {
  it("merges conflicting Tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("keeps non-conflicting classes", () => {
    expect(cn("text-sm", "font-medium")).toBe("text-sm font-medium");
  });

  it("ignores falsey class values", () => {
    expect(cn("text-sm", null, undefined, "font-medium")).toBe("text-sm font-medium");
  });
});
