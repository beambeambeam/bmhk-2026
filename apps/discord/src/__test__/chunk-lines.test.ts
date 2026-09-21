import { describe, expect, it } from "vitest";

import { chunkLines } from "../lib/chunk-lines";

describe(chunkLines, () => {
  it("keeps everything in one chunk when it fits", () => {
    expect(chunkLines(["a", "b", "c"], 10)).toStrictEqual(["a\nb\nc"]);
  });

  it("starts a new chunk before a line would push it past the limit", () => {
    expect(chunkLines(["aaaa", "bbbb", "cc"], 9)).toStrictEqual(["aaaa\nbbbb", "cc"]);
  });

  it("returns no chunks for no lines", () => {
    expect(chunkLines([], 10)).toStrictEqual([]);
  });

  it("truncates a single line longer than the limit rather than dropping it", () => {
    expect(chunkLines(["abcdefghij", "z"], 5)).toStrictEqual(["abcde", "z"]);
  });
});
