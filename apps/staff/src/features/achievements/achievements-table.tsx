import { Button } from "@/components/button";
import { Input } from "@/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import type { TeamAwardFilter, TeamListSort } from "@bmhk-2026/api";
import { orpc } from "@bmhk-2026/client/orpc";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { AchievementsAward } from "./achievements-award";
import { awardFilters, registrationStatusLabels } from "./achievements-labels";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

const sortableColumns = [
  { id: "name", label: "ชื่อทีม" },
  { id: "school", label: "โรงเรียน" },
  { id: "memberCount", label: "จำนวนสมาชิก" },
  { id: "registrationStatus", label: "สถานะการสมัคร" },
  { id: "award", label: "ผลงาน" },
] as const satisfies readonly { id: TeamListSort; label: string }[];

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
  // The API sends null for "no adjacent page"; normalise both that and a not-yet-loaded
  // page to undefined so the buttons have a single disabled condition.
  const previousOffset = pagination?.previousOffset ?? undefined;
  const nextOffset = pagination?.nextOffset ?? undefined;

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

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {sortableColumns.map((column) => (
                <TableHead key={column.id}>
                  <Button
                    className="-ml-3"
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
                      className={sortBy === column.id ? "text-foreground" : "text-muted-foreground"}
                    />
                  </Button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamsQuery.isLoading || teamsQuery.isError || teams.length === 0 ? (
              <TableRow>
                <TableCell
                  className={
                    teamsQuery.isError
                      ? "h-24 text-center text-destructive"
                      : "h-24 text-center text-muted-foreground"
                  }
                  colSpan={5}
                >
                  {getTableMessage(teamsQuery.isError, teamsQuery.isLoading)}
                </TableCell>
              </TableRow>
            ) : (
              teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.school}</TableCell>
                  <TableCell>{team.memberCount}</TableCell>
                  <TableCell>
                    <span
                      className={
                        team.registrationStatus === "APPROVED"
                          ? "text-emerald-600"
                          : "text-muted-foreground"
                      }
                    >
                      {registrationStatusLabels[team.registrationStatus]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <AchievementsAward team={team} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">ทั้งหมด {pagination?.total ?? 0} ทีม</p>
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={previousOffset === undefined}
            onClick={() => {
              if (previousOffset !== undefined) {
                setOffset(previousOffset);
              }
            }}
          >
            <ChevronLeft aria-hidden="true" data-icon="inline-start" /> ก่อนหน้า
          </Button>
          <span className="min-w-20 text-center text-muted-foreground">
            หน้า {pagination?.currentPage ?? 1} จาก {pagination?.totalPages ?? 1}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={nextOffset === undefined}
            onClick={() => {
              if (nextOffset !== undefined) {
                setOffset(nextOffset);
              }
            }}
          >
            ถัดไป <ChevronRight aria-hidden="true" data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export { AchievementsTable };
