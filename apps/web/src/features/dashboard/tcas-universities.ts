import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { CHOICE_MAX_LENGTH } from "./certificate-feedback-data";

// The public file that course.mytcas.com reads. It has no documented contract, so the
// response is checked before use. When it fails, the dialog keeps the built-in list.
const TCAS_UNIVERSITIES_URL =
  "https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/universities.json";
const ONE_DAY_MS = 86_400_000;
const WHITESPACE = /\s+/gu;

const tcasUniversitiesSchema = z.array(z.object({ university_name: z.string() }));

function cleanName(name: string): string {
  return name.replace(WHITESPACE, " ").trim();
}

async function fetchTcasUniversityNames({ signal }: { signal: AbortSignal }): Promise<string[]> {
  const response = await fetch(TCAS_UNIVERSITIES_URL, { signal });
  if (!response.ok) {
    throw new Error(`myTCAS university list failed with HTTP ${response.status}`);
  }
  const universities = tcasUniversitiesSchema.parse(await response.json());
  return universities
    .map((university) => cleanName(university.university_name))
    .filter((name) => name !== "" && name.length <= CHOICE_MAX_LENGTH);
}

export const tcasUniversitiesQueryOptions = queryOptions({
  queryFn: fetchTcasUniversityNames,
  queryKey: ["tcas", "universities"],
  retry: 1,
  staleTime: ONE_DAY_MS,
});

/** The built-in names first, in their order, then each live name the built-in list lacks. */
export function mergeUniversityNames(
  builtIn: readonly string[],
  live: readonly string[],
): string[] {
  return [...new Set([...builtIn, ...live])];
}
