import { and, asc, desc } from "drizzle-orm";
import type { SQL, SQLWrapper } from "drizzle-orm";

import type { TableSort } from "./table-query";

const LIKE_PATTERN_CHARACTER = /[\\%_]/gu;

interface CreateTableOrderByOptions<ColumnId extends string> {
  readonly columns: Readonly<Record<ColumnId, SQLWrapper>>;
  readonly fallbackSorting: readonly TableSort<ColumnId>[];
  readonly sorting: readonly TableSort<ColumnId>[];
  readonly stableColumn: SQLWrapper;
}

export function createTableWhere<Filter>(
  filters: readonly Filter[],
  createCondition: (filter: Filter) => SQL | undefined,
): SQL | undefined {
  const conditions: SQL[] = [];

  for (const filter of filters) {
    const condition = createCondition(filter);
    if (condition !== undefined) {
      conditions.push(condition);
    }
  }

  return and(...conditions);
}

export function createTableOrderBy<ColumnId extends string>({
  columns,
  fallbackSorting,
  sorting,
  stableColumn,
}: CreateTableOrderByOptions<ColumnId>): SQL[] {
  const requestedSorting = sorting.length > 0 ? sorting : fallbackSorting;
  const orderBy = requestedSorting.map((sort) => {
    const column = columns[sort.id];
    return sort.desc ? desc(column) : asc(column);
  });

  return [...orderBy, asc(stableColumn)];
}

export function escapeLikePattern(value: string): string {
  return value.replace(LIKE_PATTERN_CHARACTER, "\\$&");
}
