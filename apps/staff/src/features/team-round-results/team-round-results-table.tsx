import { formatTeamCode } from "@/lib/team-code";
import { TeamRoundResultDialog } from "./team-round-result-dialog";
import { formatBangkokDateTime } from "./round-result-datetime";
import { Field, FieldGroup, FieldLabel } from "@/components/field";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { DataTable } from "@/components/table/index";
import type { DataTableColumn } from "@/components/table/index";
import { DataTableSortHeader } from "@/components/table/sort-header";
import { DataTablePagination } from "@/components/table/pagination";
import type {
  CheckInRound,
  TeamRoundResultColumnFilter,
  TeamRoundResultList,
  TeamRoundResultListQuery,
} from "@bmhk-2026/api";
import { orpc } from "@bmhk-2026/client/orpc";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type ResultRow = TeamRoundResultList["rows"][number];
type ResultSort = TeamRoundResultListQuery["sorting"][number];
const SEARCH_DEBOUNCE_MS = 300;

interface ResultsTableMeta {
  readonly round: CheckInRound;
  readonly sorting: ResultSort;
  readonly onSort: (id: ResultSort["id"]) => void;
}

interface TeamRoundResultsTableProps {
  readonly actorId: string | undefined;
  readonly round: CheckInRound;
}

const columnDefinitions: (DataTableColumn<ResultRow, ResultsTableMeta> & {
  id: ResultSort["id"];
  header: string;
})[] = [
  {
    cell: ({ row }) => formatTeamCode(row.original.team.index),
    header: "รหัสทีม",
    id: "teamCode",
    size: 140,
  },
  { cell: ({ row }) => row.original.team.name, header: "ชื่อทีม", id: "teamName", size: 240 },
  { cell: ({ row }) => row.original.result?.score ?? "—", header: "คะแนน", id: "score", size: 110 },
  {
    cell: ({ row }) => row.original.result?.totalSubmission ?? "—",
    header: "จำนวน submission",
    id: "totalSubmission",
    size: 150,
  },
  {
    cell: ({ row }) => row.original.result?.completedAssignment ?? "—",
    header: "จำนวน completed assignment",
    id: "completedAssignment",
    size: 150,
  },
  {
    cell: ({ row }) => formatBangkokDateTime(row.original.result?.lastSubmittedAt ?? null),
    header: "last submitted at",
    id: "lastSubmittedAt",
    size: 190,
  },
  {
    cell: ({ row }) => formatBangkokDateTime(row.original.result?.createdAt ?? null),
    header: "สร้างเมื่อ",
    id: "createdAt",
    size: 190,
  },
  {
    cell: ({ row }) => formatBangkokDateTime(row.original.result?.updatedAt ?? null),
    header: "แก้ไขล่าสุด",
    id: "updatedAt",
    size: 190,
  },
];
const columns: DataTableColumn<ResultRow, ResultsTableMeta>[] = [
  ...columnDefinitions.map(
    (column): DataTableColumn<ResultRow, ResultsTableMeta> => ({
      ...column,
      header: ({ table }) => {
        const { meta } = table.options;
        let direction: "asc" | "desc" | false = false;
        if (meta?.sorting.id === column.id) {
          direction = meta.sorting.desc ? "desc" : "asc";
        }
        return (
          <DataTableSortHeader
            label={column.header}
            direction={direction}
            onClick={() => meta?.onSort(column.id)}
          />
        );
      },
      meta: { ...column.meta, sortable: true },
    }),
  ),
  {
    cell: ({ row, table }) =>
      table.options.meta ? (
        <TeamRoundResultDialog
          team={row.original.team}
          round={table.options.meta.round}
          result={row.original.result}
        />
      ) : null,
    header: "จัดการผล",
    id: "actions",
    size: 120,
  },
];

function RoundResultsTable({ actorId, round }: TeamRoundResultsTableProps) {
  const [searches, setSearches] = useState({ teamCode: "", teamName: "" });
  const [debouncedSearches, setDebouncedSearches] = useState(searches);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState<ResultSort>({ desc: false, id: "teamCode" });
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

  const columnFilters: TeamRoundResultColumnFilter[] = [];
  if (debouncedSearches.teamCode) {
    columnFilters.push({ id: "teamCode", value: debouncedSearches.teamCode });
  }
  if (debouncedSearches.teamName) {
    columnFilters.push({ id: "teamName", value: debouncedSearches.teamName });
  }
  columnFilters.push({ id: "teamCheckIn", value: "registered" });
  const input: TeamRoundResultListQuery = {
    columnFilters,
    pagination: { pageIndex, pageSize },
    round,
    sorting: [sorting],
  };
  const resultsQuery = useQuery(
    orpc.teamRoundResults.list.queryOptions({
      enabled: actorId !== undefined,
      input,
      queryKey: [...orpc.teamRoundResults.list.queryKey({ input }), { userId: actorId }],
    }),
  );
  const rowCount = resultsQuery.data?.rowCount ?? 0;
  let statusMessage: string | undefined;
  if (resultsQuery.isError) {
    statusMessage = "ไม่สามารถโหลดผลการแข่งขันได้ กรุณาลองใหม่อีกครั้ง";
  } else if (resultsQuery.isPending) {
    statusMessage = "กำลังโหลดผลการแข่งขัน...";
  }

  function onSort(id: ResultSort["id"]): void {
    setSorting((current) => ({ desc: current.id === id ? !current.desc : false, id }));
    setPageIndex(0);
  }

  return (
    <div className="flex flex-col gap-5">
      <FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <Field>
          <FieldLabel htmlFor="round-results-code">รหัสทีม</FieldLabel>
          <Input
            id="round-results-code"
            type="search"
            placeholder="ค้นหารหัสทีม"
            value={searches.teamCode}
            onChange={(event) => {
              setSearches((current) => ({ ...current, teamCode: event.target.value }));
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="round-results-name">ชื่อทีม</FieldLabel>
          <Input
            id="round-results-name"
            type="search"
            placeholder="ค้นหาชื่อทีม"
            value={searches.teamName}
            onChange={(event) => {
              setSearches((current) => ({ ...current, teamName: event.target.value }));
            }}
          />
        </Field>
      </FieldGroup>
      <DataTable
        columns={columns}
        data={resultsQuery.data?.rows ?? []}
        getRowId={(row) => row.team.id}
        emptyMessage="ไม่พบทีม"
        isError={resultsQuery.isError}
        meta={{ onSort, round, sorting }}
        sorting={sorting}
        statusMessage={statusMessage}
      />
      {resultsQuery.isError ? (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={resultsQuery.isFetching}
          onClick={() => {
            void resultsQuery.refetch();
          }}
        >
          ลองใหม่
        </Button>
      ) : null}
      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">ทั้งหมด {rowCount} ทีม</p>
        <DataTablePagination
          disabled={resultsQuery.isFetching}
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

function TeamRoundResultsTable(props: TeamRoundResultsTableProps) {
  return <RoundResultsTable key={`${props.actorId}-${props.round}`} {...props} />;
}

export { TeamRoundResultsTable };
