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
import type { TeamListRow, TeamAwardFilter, TeamListSort } from "@bmhk-2026/api";
import { orpc } from "@bmhk-2026/client/orpc";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AchievementsAward } from "./achievements-award";
import { awardFilters } from "./achievements-labels";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

const sortableColumns = [
  { id: "name", label: "ชื่อทีม" },
  { id: "school", label: "โรงเรียน" },
  { id: "memberCount", label: "จำนวนสมาชิก" },
  { id: "award", label: "ผลงาน" },
] as const satisfies readonly { id: TeamListSort; label: string }[];

interface AchievementsTableMeta {
  readonly sortBy: TeamListSort;
  readonly sortDesc: boolean;
  readonly onSort: (id: TeamListSort) => void;
}
const columnDefinitions: DataTableColumn<TeamListRow, AchievementsTableMeta>[] = [
  {
    cell: ({ row }) => {
      const team = row.original;
      return team.name;
    },
    header: "ชื่อทีม",
    id: "name",
    meta: { cellClassName: "font-medium" },
    size: 260,
  },
  {
    cell: ({ row }) => {
      const team = row.original;
      return team.school;
    },
    header: "โรงเรียน",
    id: "school",
    size: 320,
  },
  {
    cell: ({ row }) => {
      const team = row.original;
      return team.memberCount;
    },
    header: "จำนวนสมาชิก",
    id: "memberCount",
    size: 150,
  },
  {
    cell: ({ row }) => {
      const team = row.original;
      return <AchievementsAward team={team} />;
    },
    header: "ผลงาน",
    id: "award",
    size: 320,
  },
];
const columns = columnDefinitions.map(
  (column): DataTableColumn<TeamListRow, AchievementsTableMeta> => {
    const sortableColumn = sortableColumns.find((item) => item.id === column.id);
    if (!sortableColumn) {
      return column;
    }
    return {
      ...column,
      header: ({ table }) => {
        const { meta } = table.options;
        const direction = meta?.sortDesc === true ? "desc" : "asc";
        return (
          <DataTableSortHeader
            label={sortableColumn.label}
            direction={meta?.sortBy === column.id ? direction : false}
            onClick={() => meta?.onSort(sortableColumn.id)}
          />
        );
      },
      id: sortableColumn.id,
      meta: { ...column.meta, sortable: true },
    };
  },
);

function getTableMessage(isError: boolean, isLoading: boolean): string {
  if (isError) {
    return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
  }
  if (isLoading) {
    return "กำลังโหลดรายชื่อทีม...";
  }
  return "ไม่พบทีมที่สมัครแข่งขัน";
}

function AchievementsTable() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [award, setAward] = useState<TeamAwardFilter>("ALL");
  const [sortBy, setSortBy] = useState<TeamListSort>("name");
  const [sortDesc, setSortDesc] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setOffset(0);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  const teamsQuery = useQuery({
    ...orpc.teams.list.queryOptions({
      input: { award, limit: PAGE_SIZE, offset, search: debouncedSearch, sortBy, sortDesc },
    }),
    placeholderData: keepPreviousData,
  });
  const teams = teamsQuery.data?.data ?? [];
  const pagination = teamsQuery.data?.pagination;
  function toggleSorting(id: TeamListSort): void {
    if (id === sortBy) {
      setSortDesc((current) => !current);
    } else {
      setSortBy(id);
      setSortDesc(false);
    }
    setOffset(0);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:max-w-[33rem]">
        <div className="flex flex-col gap-2">
          <label className="sr-only" htmlFor="achievements-search">
            ค้นหาทีม
          </label>
          <Input
            id="achievements-search"
            placeholder="ค้นหาชื่อทีมหรือโรงเรียน"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
          />
        </div>
        <Select
          items={awardFilters}
          value={award}
          onValueChange={(value) => {
            if (value !== null && awardFilters.some((filter) => filter.value === value)) {
              setAward(value);
              setOffset(0);
            }
          }}
        >
          <SelectTrigger aria-label="กรองตามผลงาน" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {awardFilters.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={teams}
        getRowId={(team) => team.id}
        meta={{ onSort: toggleSorting, sortBy, sortDesc }}
        sorting={{ desc: sortDesc, id: sortBy }}
        isError={teamsQuery.isError}
        emptyMessage="ไม่พบทีมที่สมัครแข่งขัน"
        statusMessage={
          teamsQuery.isLoading || teamsQuery.isError
            ? getTableMessage(teamsQuery.isError, teamsQuery.isLoading)
            : undefined
        }
      />

      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">ทั้งหมด {pagination?.total ?? 0} ทีม</p>
        <DataTablePagination
          disabled={teamsQuery.isFetching}
          pageIndex={Math.floor(offset / PAGE_SIZE)}
          pageCount={pagination?.totalPages ?? 1}
          onPageChange={(page) => {
            setOffset(page * PAGE_SIZE);
          }}
        />
      </div>
    </div>
  );
}

export { AchievementsTable };
