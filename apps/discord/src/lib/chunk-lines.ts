/** Packs lines into newline-joined chunks no longer than `limit`; an over-long line is cut, not dropped. */
export function chunkLines(lines: string[], limit: number): string[] {
  const chunks: string[] = [];
  let current: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.slice(0, limit);
    if (current === null) {
      current = line;
    } else if (current.length + 1 + line.length <= limit) {
      current = `${current}\n${line}`;
    } else {
      chunks.push(current);
      current = line;
    }
  }

  if (current !== null) {
    chunks.push(current);
  }
  return chunks;
}
