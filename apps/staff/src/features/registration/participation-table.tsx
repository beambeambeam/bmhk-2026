import { Input } from "@/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { Card, CardContent } from "@/components/card";
import { Button } from "@/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import type {
  TeamRegistrationReviewListFilter,
  TeamRegistrationReviewListSort,
} from "@bmhk-2026/api";
import { getTeamRegistrationReviewListQueryOptions } from "@bmhk-2026/client/query-options";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowUpDown } from "lucide-react";
import { useEffect, useState } from "react";

import { ParticipationPagination } from "./participation-pagination";
import { ParticipationReviewDialog } from "./participation-review-dialog";
import { StatusChip } from "./participation-review-status";

const SEARCH_DEBOUNCE_MS = 300;
const PARTICIPATIONS_PAGE_SIZE = 20;
const reviewFilters = [
  { label: "ทุกสถานะ", value: "ALL" },
  { label: "รอตรวจสอบ", value: "PENDING_REVIEW" },
  { label: "ขอให้แก้ไข", value: "CHANGES_REQUESTED" },
  { label: "อนุมัติแล้ว", value: "APPROVED" },
] as const satisfies readonly { label: string; value: TeamRegistrationReviewListFilter }[];

interface ParticipationTableProps {
  readonly canReview: boolean;
}

const sortableColumns = [
  { id: "name", label: "ทีม" },
  { id: "school", label: "โรงเรียน" },
  { id: "memberCount", label: "สมาชิก" },
  { id: "registrationSubmittedAt", label: "การส่งสมัคร" },
  { id: "registrationSubmittedAt", label: "วันที่ส่ง" },
  { id: "reviewStatus", label: "ตรวจสอบ" },
  { id: "reviewedByName", label: "อัปเดตโดย" },
  { id: "lastUpdatedAt", label: "อัปเดตล่าสุด" },
] as const satisfies readonly { id: TeamRegistrationReviewListSort; label: string }[];

function formatSubmitDate(submittedAt: Date | null): string {
  return submittedAt?.toLocaleDateString() ?? "—";
}

function formatLastUpdated(updatedAt: Date | null): string {
  return updatedAt?.toLocaleString() ?? "—";
}

function ParticipationTable({ canReview }: ParticipationTableProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [reviewStatus, setReviewStatus] = useState<TeamRegistrationReviewListFilter>("ALL");
  const [sortBy, setSortBy] = useState<TeamRegistrationReviewListSort>("name");
  const [sortDesc, setSortDesc] = useState(false);
  const query = useQuery({
    ...getTeamRegistrationReviewListQueryOptions({
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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setOffset(0);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  function toggleSorting(column: TeamRegistrationReviewListSort): void {
    if (sortBy === column) {
      setSortDesc((current) => !current);
    } else {
      setSortBy(column);
      setSortDesc(false);
    }
    setOffset(0);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <div>
            <label className="sr-only" htmlFor="participation-search">
              ค้นหาทีมที่สมัคร
            </label>
            <Input
              id="participation-search"
              placeholder="ค้นหาชื่อทีม โรงเรียน สมาชิก หรืออาจารย์"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
            />
          </div>
          <Select
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
        </div>
        <div className="[&_[data-slot=table-container]]:overflow-x-visible">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                {sortableColumns.map((column, index) => (
                  <TableHead
                    className={`${
                      [
                        "w-[14%]",
                        "w-[12%]",
                        "w-[8%]",
                        "w-[9%]",
                        "w-[10%]",
                        "w-[10%]",
                        "w-[11%]",
                        "w-[14%]",
                      ][index]
                    } whitespace-normal`}
                    key={`${column.id}-${column.label}`}
                  >
                    <Button
                      className="-ml-3 h-auto whitespace-normal text-left"
                      size="sm"
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        toggleSorting(column.id);
                      }}
                    >
                      {column.label}
                      <ArrowUpDown
                        aria-hidden="true"
                        className={
                          sortBy === column.id ? "text-foreground" : "text-muted-foreground"
                        }
                      />
                    </Button>
                  </TableHead>
                ))}
                <TableHead className="w-[12%] whitespace-normal">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                <TableRow>
                  <TableCell colSpan={9}>กำลังโหลดข้อมูลการสมัคร...</TableCell>
                </TableRow>
              ) : null}
              {query.isError ? (
                <TableRow>
                  <TableCell className="text-destructive" colSpan={9}>
                    ไม่สามารถโหลดข้อมูลการสมัครได้
                  </TableCell>
                </TableRow>
              ) : null}
              {!query.isLoading && !query.isError && teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>ไม่พบข้อมูลการสมัคร</TableCell>
                </TableRow>
              ) : null}
              {teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="whitespace-normal">
                    <p className="font-medium">{team.name}</p>
                  </TableCell>
                  <TableCell className="whitespace-normal">{team.school}</TableCell>
                  <TableCell>{team.memberCount}</TableCell>
                  <TableCell>
                    <StatusChip value={team.registrationSubmittedAt ? "SUBMITTED" : "DRAFT"} />
                  </TableCell>
                  <TableCell>{formatSubmitDate(team.registrationSubmittedAt)}</TableCell>
                  <TableCell>
                    <StatusChip value={team.reviewStatus} />
                  </TableCell>
                  <TableCell className="whitespace-normal">{team.reviewedByName ?? "—"}</TableCell>
                  <TableCell className="whitespace-normal">
                    {formatLastUpdated(team.lastUpdatedAt)}
                  </TableCell>
                  <TableCell>
                    <ParticipationReviewDialog
                      canReview={canReview}
                      lastUpdatedAt={team.lastUpdatedAt}
                      reviewedByName={team.reviewedByName}
                      teamId={team.id}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {pagination ? (
          <ParticipationPagination
            isFetching={query.isFetching}
            pageSize={PARTICIPATIONS_PAGE_SIZE}
            pagination={pagination}
            visibleRowCount={teams.length}
            onOffsetChange={setOffset}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

export { ParticipationTable };
