import { Button } from "@/components/button";
import { toast } from "sonner";
import { createParticipationCsv, downloadParticipationCsv } from "./participation-export";
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
import { DataTableSortHeader } from "@/components/table/sort-header";
import type {
  TeamRegistrationEligibilityFilter,
  TeamRegistrationReviewListFilter,
  TeamRegistrationReviewListResult,
} from "@bmhk-2026/api";
import { getTeamRegistrationReviewListQueryOptions } from "@bmhk-2026/client/query-options";
import { Download } from "lucide-react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { EligibilityChip } from "./participation-eligibility";
import { ParticipationPagination } from "./participation-pagination";
import { ParticipationReviewDialog } from "./participation-review-dialog";
import { StatusChip } from "./participation-review-status";
import { formatStaffDate, formatStaffDateTime } from "./review-utils";

const SEARCH_DEBOUNCE_MS = 300;
const PARTICIPATIONS_PAGE_SIZE = 20;
const sortableColumns = [
  { id: "index", label: "รหัสทีม" },
  { id: "registrationSubmittedAt", label: "วันที่ส่ง" },
] as const;
type ParticipationSort = (typeof sortableColumns)[number]["id"];
const eligibilityFilters = [
  { label: "สิทธิ์เข้าแข่งขันทั้งหมด", value: "ALL" },
  { label: "มีสิทธิ์เข้าแข่งขันในรอบแรก", value: "ELIGIBLE" },
  { label: "ไม่มีสิทธิ์เข้าแข่งขันในรอบแรก", value: "REGISTRATION_FAILED" },
  { label: "ยังไม่ได้พิจารณา", value: "NOT_REVIEWED" },
] as const satisfies readonly { label: string; value: TeamRegistrationEligibilityFilter }[];

const reviewFilters = [
  { label: "ทุกสถานะ", value: "ALL" },
  { label: "รอตรวจสอบ", value: "PENDING_REVIEW" },
  { label: "ขอให้แก้ไข", value: "CHANGES_REQUESTED" },
  { label: "อนุมัติแล้ว", value: "APPROVED" },
] as const satisfies readonly { label: string; value: TeamRegistrationReviewListFilter }[];

interface ParticipationTableProps {
  readonly canRemove: boolean;
  readonly canReview: boolean;
}

type Participation = TeamRegistrationReviewListResult["rows"][number];
interface ParticipationTableMeta {
  readonly sortBy: ParticipationSort;
  readonly sortDesc: boolean;
  readonly onSort: (id: ParticipationSort) => void;
  readonly canReview: boolean;
  readonly canRemove: boolean;
}
const columnDefinitions: DataTableColumn<Participation, ParticipationTableMeta>[] = [
  {
    cell: ({ row }) => {
      const team = row.original;
      return `BH${String(team.index).padStart(3, "0")}/26`;
    },
    header: "รหัสทีม",
    id: "index",
    size: 112,
  },
  {
    cell: ({ row }) => {
      const team = row.original;
      return <p className="font-medium">{team.name}</p>;
    },
    header: "ทีม",
    id: "name",
    size: 200,
  },
  {
    cell: ({ row }) => {
      const team = row.original;
      return team.school;
    },
    header: "โรงเรียน",
    id: "school",
    size: 240,
  },
  {
    cell: ({ row }) => {
      const team = row.original;
      return team.memberCount;
    },
    header: "สมาชิก",
    id: "memberCount",
    size: 90,
  },
  {
    cell: ({ row }) => {
      const team = row.original;
      return <StatusChip value={team.registrationSubmittedAt ? "SUBMITTED" : "DRAFT"} />;
    },
    header: "การส่งสมัคร",
    id: "submission",
    size: 140,
  },
  {
    cell: ({ row }) => {
      const team = row.original;
      return formatStaffDate(team.registrationSubmittedAt);
    },
    header: "วันที่ส่ง",
    id: "registrationSubmittedAt",
    size: 140,
  },
  {
    cell: ({ row }) => {
      const team = row.original;
      return <StatusChip value={team.reviewStatus} />;
    },
    header: "ตรวจสอบ",
    id: "reviewStatus",
    size: 150,
  },
  {
    cell: ({ row }) => {
      const team = row.original;
      return <EligibilityChip award={team.award} />;
    },
    header: "สิทธิ์เข้าแข่งขันในรอบแรก",
    id: "eligibility",
    size: 240,
  },
  {
    cell: ({ row }) => {
      const team = row.original;
      return team.reviewedByName ?? "—";
    },
    header: "อัปเดตโดย",
    id: "reviewedByName",
    size: 180,
  },
  {
    cell: ({ row }) => {
      const team = row.original;
      return formatStaffDateTime(team.lastUpdatedAt);
    },
    header: "อัปเดตล่าสุด",
    id: "lastUpdatedAt",
    size: 180,
  },
  {
    cell: ({ row, table }) => {
      const team = row.original;
      const { meta } = table.options;
      if (!meta) {
        return null;
      }
      return (
        <ParticipationReviewDialog
          canRemove={meta.canRemove}
          canReview={meta.canReview}
          lastUpdatedAt={team.lastUpdatedAt}
          reviewedByName={team.reviewedByName}
          teamName={team.name}
          teamId={team.id}
        />
      );
    },
    header: () => <span className="sr-only">จัดการ</span>,
    id: "actions",
    size: 72,
  },
];
const columns = columnDefinitions.map(
  (column): DataTableColumn<Participation, ParticipationTableMeta> => {
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

function ParticipationTable({ canReview, canRemove }: ParticipationTableProps) {
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [eligibility, setEligibility] = useState<TeamRegistrationEligibilityFilter>("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [sortBy, setSortBy] = useState<ParticipationSort>("registrationSubmittedAt");
  const [sortDesc, setSortDesc] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<TeamRegistrationReviewListFilter>("ALL");
  const query = useQuery({
    ...getTeamRegistrationReviewListQueryOptions({
      eligibility,
      limit: PARTICIPATIONS_PAGE_SIZE,
      offset,
      reviewStatus,
      search: debouncedSearch,
      sortBy,
      sortDesc,
    }),
    placeholderData: keepPreviousData,
  });
  const teams = query.data?.rows ?? [];
  const pagination = query.data?.pagination;

  function toggleSorting(id: ParticipationSort): void {
    setSortDesc(id === sortBy ? !sortDesc : false);
    setSortBy(id);
    setOffset(0);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setOffset(0);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  async function exportCsv(): Promise<void> {
    setIsExporting(true);
    try {
      const csv = await createParticipationCsv(
        { eligibility, reviewStatus, search: debouncedSearch },
        async (input) =>
          await queryClient.fetchQuery({
            ...getTeamRegistrationReviewListQueryOptions(input),
            staleTime: 0,
          }),
      );
      downloadParticipationCsv(csv);
    } catch {
      toast.error("ไม่สามารถส่งออก CSV ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsExporting(false);
    }
  }

  let statusMessage: string | undefined;
  if (query.isLoading) {
    statusMessage = "กำลังโหลดข้อมูลการสมัคร...";
  } else if (query.isError) {
    statusMessage = "ไม่สามารถโหลดข้อมูลการสมัครได้";
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_12rem_18rem_auto]">
        <div>
          <label className="sr-only" htmlFor="participation-search">
            ค้นหาทีมที่สมัคร
          </label>
          <Input
            id="participation-search"
            placeholder="ค้นหารหัสทีม ชื่อทีม โรงเรียน สมาชิก หรืออาจารย์"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
          />
        </div>
        <Select
          items={reviewFilters}
          value={reviewStatus}
          onValueChange={(value) => {
            if (value !== null && reviewFilters.some((filter) => filter.value === value)) {
              setReviewStatus(value);
              setOffset(0);
            }
          }}
        >
          <SelectTrigger aria-label="สถานะการตรวจสอบ" className="w-full">
            <SelectValue>
              {reviewFilters.find((filter) => filter.value === reviewStatus)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {reviewFilters.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          items={eligibilityFilters}
          value={eligibility}
          onValueChange={(value) => {
            if (value !== null && eligibilityFilters.some((filter) => filter.value === value)) {
              setEligibility(value);
              setOffset(0);
            }
          }}
        >
          <SelectTrigger aria-label="สิทธิ์เข้าแข่งขันในรอบแรก" className="w-full">
            <SelectValue>
              {eligibilityFilters.find((filter) => filter.value === eligibility)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {eligibilityFilters.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          disabled={
            isExporting ||
            query.isFetching ||
            query.isError ||
            !teams.length ||
            search.trim() !== debouncedSearch
          }
          onClick={() => {
            void exportCsv();
          }}
        >
          <Download data-icon="inline-start" />
          {isExporting ? "กำลังส่งออก..." : "ส่งออก CSV"}
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={teams}
        getRowId={(team) => team.id}
        meta={{ canRemove, canReview, onSort: toggleSorting, sortBy, sortDesc }}
        sorting={{ desc: sortDesc, id: sortBy }}
        isError={query.isError}
        emptyMessage="ไม่พบข้อมูลการสมัคร"
        statusMessage={statusMessage}
      />
      {pagination ? (
        <ParticipationPagination
          isFetching={query.isFetching}
          pageSize={PARTICIPATIONS_PAGE_SIZE}
          pagination={pagination}
          visibleRowCount={teams.length}
          onOffsetChange={setOffset}
        />
      ) : null}
    </div>
  );
}

export { ParticipationTable };
