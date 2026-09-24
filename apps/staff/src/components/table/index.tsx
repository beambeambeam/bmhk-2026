import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { cn } from "@/lib/utils";
import { columnSizingFeature, metaHelper, tableFeatures, useTable } from "@tanstack/react-table";
import type { ColumnDef, RowData } from "@tanstack/react-table";
import { useMemo } from "react";

interface DataTableColumnMeta {
  readonly cellClassName?: string;
  readonly headerClassName?: string;
  readonly sortable?: boolean;
}

const dataTableFeatures = tableFeatures({
  columnMeta: metaHelper<DataTableColumnMeta>(),
  columnSizingFeature,
});

type DataTableFeatures<TMeta extends object> = typeof dataTableFeatures & { tableMeta: TMeta };
type DataTableColumn<
  TData extends RowData,
  TMeta extends object = Record<string, never>,
> = ColumnDef<DataTableFeatures<TMeta>, TData> & { size: number };

interface DataTableProps<TData extends RowData, TMeta extends object> {
  readonly columns: DataTableColumn<TData, TMeta>[];
  readonly data: readonly TData[];
  readonly getRowId: (row: TData) => string;
  readonly emptyMessage: string;
  readonly statusMessage?: string;
  readonly isError?: boolean;
  readonly meta?: TMeta;
  readonly sorting?: { id: string; desc: boolean };
}

function DataTable<TData extends RowData, TMeta extends object = Record<string, never>>({
  columns,
  data,
  getRowId,
  emptyMessage,
  statusMessage,
  isError = false,
  meta,
  sorting,
}: DataTableProps<TData, TMeta>) {
  const features = useMemo(
    () => tableFeatures({ ...dataTableFeatures, tableMeta: metaHelper<TMeta>() }),
    [],
  );
  const table = useTable({ columns, data, features, getRowId, meta });
  const { rows } = table.getRowModel();
  const message = statusMessage ?? (rows.length === 0 ? emptyMessage : undefined);

  return (
    <Table className="table-fixed" style={{ minWidth: table.getTotalSize() }}>
      <colgroup>
        {table.getAllLeafColumns().map((column) => (
          <col key={column.id} style={{ width: column.getSize() }} />
        ))}
      </colgroup>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => {
              const direction = sorting?.desc === true ? "descending" : "ascending";
              const ariaSort = sorting?.id === header.column.id ? direction : "none";
              return (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  aria-sort={header.column.columnDef.meta?.sortable === true ? ariaSort : undefined}
                  className={cn("whitespace-normal", header.column.columnDef.meta?.headerClassName)}
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {message === undefined ? (
          rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cn(
                    "whitespace-normal wrap-anywhere",
                    cell.column.columnDef.meta?.cellClassName,
                  )}
                >
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={table.getAllLeafColumns().length}
              className={cn(
                "h-24 text-center whitespace-normal wrap-anywhere",
                isError ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {message}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export { DataTable, type DataTableColumn };
