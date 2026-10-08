import { Button } from "@/components/button";
import { Field, FieldGroup, FieldLabel } from "@/components/field";
import { Input } from "@/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { DataTable } from "@/components/table/index";
import type { DataTableColumn } from "@/components/table/index";
import { DataTablePagination } from "@/components/table/pagination";
import { DataTableSortHeader } from "@/components/table/sort-header";
import type {
  Round2ConfirmationColumnFilter,
  Round2ConfirmationList,
  Round2ConfirmationListQuery,
  Round2ConfirmationState,
} from "@bmhk-2026/api";
import { orpc } from "@bmhk-2026/client/orpc";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { formatBangkokDateTime } from "@/features/team-round-results/round-result-datetime";
import { formatTeamCode } from "@/lib/team-code";

type ConfirmationRow = Round2ConfirmationList["rows"][number];
type ConfirmationSort = Round2ConfirmationListQuery["sorting"][number];
type StateFilter = Round2ConfirmationState | "ALL";
interface SearchState {
  teamCode: string;
  teamName: string;
}

interface ConfirmationsTableMeta {
  readonly onSort: (id: ConfirmationSort["id"]) => void;
  readonly sorting: ConfirmationSort;
}

interface Round2ConfirmationsTableProps {
  readonly actorId: string | undefined;
}

const SEARCH_DEBOUNCE_MS = 300;
const REQUIRED_DOCUMENTS_PER_PARTICIPANT = 2;
const stateFilters: readonly { label: string; value: StateFilter }[] = [
  { label: "ทุกสถานะ", value: "ALL" },
  { label: "ยืนยันแล้ว", value: "CONFIRMED" },
  { label: "ยังไม่ยืนยัน", value: "DRAFT" },
];

const sortableColumnDefinitions: (DataTableColumn<ConfirmationRow, ConfirmationsTableMeta> & {
  header: string;
  id: ConfirmationSort["id"];
})[] = [
  {
    cell: ({ row }) => formatTeamCode(row.original.team.index),
    header: "รหัสทีม",
    id: "teamCode",
    size: 130,
  },
  {
    cell: ({ row }) => row.original.team.name,
    header: "ชื่อทีม",
    id: "teamName",
    size: 200,
  },
  {
    cell: ({ row }) => formatBangkokDateTime(row.original.confirmedAt),
    header: "ยืนยันเมื่อ",
    id: "confirmedAt",
    size: 180,
  },
];

const sortableColumns: DataTableColumn<ConfirmationRow, ConfirmationsTableMeta>[] =
  sortableColumnDefinitions.map((column) => ({
    ...column,
    header: ({ table }) => {
      const { meta } = table.options;
      let direction: "asc" | "desc" | false = false;
      if (meta?.sorting.id === column.id) {
        direction = meta.sorting.desc ? "desc" : "asc";
      }
      return (
        <DataTableSortHeader
          direction={direction}
          label={column.header}
          onClick={() => meta?.onSort(column.id)}
        />
      );
    },
    meta: { ...column.meta, sortable: true },
  }));

function getUploadedDocumentCount(row: ConfirmationRow): number {
  let count = 0;
  for (const participant of row.participants) {
    if (participant.hasIdentityDocument) {
      count += 1;
    }
    if (participant.hasStudentIdDocument) {
      count += 1;
    }
  }
  return count;
}

function isStateFilter(value: string): value is StateFilter {
  return stateFilters.some((filter) => filter.value === value);
}

const columns: DataTableColumn<ConfirmationRow, ConfirmationsTableMeta>[] = [
  ...sortableColumns.slice(0, 2),
  {
    cell: ({ row }) => row.original.team.memberCount,
    header: "จำนวนสมาชิก",
    id: "memberCount",
    size: 120,
  },
  {
    cell: ({ row }) => (
      <div className="flex flex-col">
        {row.original.participants.map((participant) => (
          <span key={participant.id}>{participant.name}</span>
        ))}
      </div>
    ),
    header: "สมาชิก",
    id: "participants",
    size: 200,
  },
  {
    cell: ({ row }) =>
      `${getUploadedDocumentCount(row.original)} / ${row.original.team.memberCount * REQUIRED_DOCUMENTS_PER_PARTICIPANT}`,
    header: "เอกสาร",
    id: "documents",
    size: 110,
  },
  {
    cell: ({ row }) => (row.original.state === "CONFIRMED" ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน"),
    header: "สถานะ",
    id: "state",
    size: 140,
  },
  ...sortableColumns.slice(2),
];

function Round2ConfirmationsTableContent({ actorId }: Round2ConfirmationsTableProps) {
  const [searches, setSearches] = useState<SearchState>({ teamCode: "", teamName: "" });
  const [debouncedSearches, setDebouncedSearches] = useState(searches);
  const [stateFilter, setStateFilter] = useState<StateFilter>("ALL");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState<ConfirmationSort>({ desc: false, id: "teamCode" });

  useEffect((): (() => void) | undefined => {
    const teamCode = searches.teamCode.trim();
    const teamName = searches.teamName.trim();
    const timer = window.setTimeout(() => {
      if (teamCode === debouncedSearches.teamCode && teamName === debouncedSearches.teamName) {
        return;
      }
      setDebouncedSearches({ teamCode, teamName });
      setPageIndex(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [searches, debouncedSearches]);

  const columnFilters: Round2ConfirmationColumnFilter[] = [];
  if (debouncedSearches.teamCode) {
    columnFilters.push({ id: "teamCode", value: debouncedSearches.teamCode });
  }
  if (debouncedSearches.teamName) {
    columnFilters.push({ id: "teamName", value: debouncedSearches.teamName });
  }
  if (stateFilter !== "ALL") {
    columnFilters.push({ id: "state", value: stateFilter });
  }

  const input: Round2ConfirmationListQuery = {
    columnFilters,
    pagination: { pageIndex, pageSize },
    sorting: [sorting],
  };
  const confirmationsQuery = useQuery(
    orpc.round2Confirmation.list.queryOptions({
      enabled: actorId !== undefined,
      input,
      queryKey: [...orpc.round2Confirmation.list.queryKey({ input }), { userId: actorId }],
    }),
  );
  const rowCount = confirmationsQuery.data?.rowCount ?? 0;
  let statusMessage: string | undefined;
  if (confirmationsQuery.isError) {
    statusMessage = "ไม่สามารถโหลดสถานะการยืนยันได้ กรุณาลองใหม่อีกครั้ง";
  } else if (confirmationsQuery.isPending) {
    statusMessage = "กำลังโหลดสถานะการยืนยัน...";
  }

  function onSort(id: ConfirmationSort["id"]): void {
    setSorting((current) => ({ desc: current.id === id ? !current.desc : false, id }));
    setPageIndex(0);
  }

  function onStateFilterChange(value: string | null): void {
    if (value !== null && isStateFilter(value)) {
      setStateFilter(value);
      setPageIndex(0);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="round2-confirmations-code">รหัสทีม</FieldLabel>
          <Input
            id="round2-confirmations-code"
            placeholder="ค้นหารหัสทีม"
            type="search"
            value={searches.teamCode}
            onChange={(event) => {
              setSearches((current) => ({ ...current, teamCode: event.target.value }));
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="round2-confirmations-name">ชื่อทีม</FieldLabel>
          <Input
            id="round2-confirmations-name"
            placeholder="ค้นหาชื่อทีม"
            type="search"
            value={searches.teamName}
            onChange={(event) => {
              setSearches((current) => ({ ...current, teamName: event.target.value }));
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="round2-confirmations-state">สถานะการยืนยัน</FieldLabel>
          <Select items={stateFilters} onValueChange={onStateFilterChange} value={stateFilter}>
            <SelectTrigger
              aria-label="สถานะการยืนยัน"
              className="w-full"
              id="round2-confirmations-state"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {stateFilters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
      <DataTable
        columns={columns}
        data={confirmationsQuery.data?.rows ?? []}
        emptyMessage="ไม่พบทีม"
        getRowId={(row) => row.team.id}
        isError={confirmationsQuery.isError}
        meta={{ onSort, sorting }}
        sorting={sorting}
        statusMessage={statusMessage}
      />
      {confirmationsQuery.isError ? (
        <Button
          className="self-start"
          disabled={confirmationsQuery.isFetching}
          onClick={() => {
            void confirmationsQuery.refetch();
          }}
          type="button"
          variant="outline"
        >
          ลองใหม่
        </Button>
      ) : null}
      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">ทั้งหมด {rowCount} ทีม</p>
        <DataTablePagination
          disabled={confirmationsQuery.isFetching}
          pageIndex={pageIndex}
          pageCount={Math.max(1, Math.ceil(rowCount / pageSize))}
          pageSize={pageSize}
          onPageChange={setPageIndex}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageIndex(0);
          }}
        />
      </div>
    </div>
  );
}

function Round2ConfirmationsTable(props: Round2ConfirmationsTableProps) {
  return <Round2ConfirmationsTableContent key={props.actorId} {...props} />;
}

export { Round2ConfirmationsTable };
