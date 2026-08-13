import { z } from "zod";

const DEFAULT_MAX_PAGE_SIZE = 100;

interface IdentifiedTableState {
  readonly id: string;
}

export interface TablePagination {
  readonly pageIndex: number;
  readonly pageSize: number;
}

export interface TableSort<ColumnId extends string = string> {
  readonly desc: boolean;
  readonly id: ColumnId;
}

interface CreateTableQuerySchemaOptions<
  ColumnFilterSchema extends z.ZodType<IdentifiedTableState>,
  SortableColumnIds extends readonly [string, ...string[]],
> {
  readonly columnFilterSchema: ColumnFilterSchema;
  readonly defaultPageSize: number;
  readonly defaultSorting?: readonly TableSort<SortableColumnIds[number]>[];
  readonly maxColumnFilters: number;
  readonly maxPageSize?: number;
  readonly maxSorting?: number;
  readonly sortableColumnIds: SortableColumnIds;
}

function hasUniqueIds(values: readonly IdentifiedTableState[]): boolean {
  return new Set(values.map(({ id }) => id)).size === values.length;
}

export function createTableQuerySchema<
  ColumnFilterSchema extends z.ZodType<IdentifiedTableState>,
  const SortableColumnIds extends readonly [string, ...string[]],
>({
  columnFilterSchema,
  defaultPageSize,
  defaultSorting = [],
  maxColumnFilters,
  maxPageSize = DEFAULT_MAX_PAGE_SIZE,
  sortableColumnIds,
  maxSorting = sortableColumnIds.length,
}: CreateTableQuerySchemaOptions<ColumnFilterSchema, SortableColumnIds>) {
  const paginationSchema = z
    .object({
      pageIndex: z.int().nonnegative().default(0),
      pageSize: z.int().min(1).max(maxPageSize).default(defaultPageSize),
    })
    .strict();
  const sortSchema = z
    .object({
      desc: z.boolean(),
      id: z.enum(sortableColumnIds),
    })
    .strict();

  return z
    .object({
      columnFilters: z
        .array(columnFilterSchema)
        .max(maxColumnFilters)
        .refine(hasUniqueIds, { message: "Column filter IDs must be unique" })
        .default([]),
      pagination: paginationSchema.default({ pageIndex: 0, pageSize: defaultPageSize }),
      sorting: z
        .array(sortSchema)
        .max(maxSorting)
        .refine(hasUniqueIds, { message: "Sort IDs must be unique" })
        .default([...defaultSorting]),
    })
    .strict();
}

export function createTableListResultSchema<RowSchema extends z.ZodType>(rowSchema: RowSchema) {
  return z
    .object({
      rowCount: z.int().nonnegative(),
      rows: z.array(rowSchema),
    })
    .strict();
}

export function getTableOffset({ pageIndex, pageSize }: TablePagination): number {
  return pageIndex * pageSize;
}
