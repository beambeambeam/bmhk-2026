import { Button } from "@/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { orpc } from "@bmhk-2026/client/orpc";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { AchievementsAward } from "./achievements-award";
import { registrationStatusLabels } from "./achievements-labels";

const PAGE_SIZE = 50;

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
  const [offset, setOffset] = useState(0);
  const teamsQuery = useQuery({
    ...orpc.teams.list.queryOptions({
      input: { limit: PAGE_SIZE, offset },
    }),
    placeholderData: keepPreviousData,
  });
  const teams = teamsQuery.data?.data ?? [];
  const pagination = teamsQuery.data?.pagination;
  // The API sends null for "no adjacent page"; normalise both that and a not-yet-loaded
  // page to undefined so the buttons have a single disabled condition.
  const previousOffset = pagination?.previousOffset ?? undefined;
  const nextOffset = pagination?.nextOffset ?? undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อทีม</TableHead>
              <TableHead>โรงเรียน</TableHead>
              <TableHead>จำนวนสมาชิก</TableHead>
              <TableHead>สถานะการสมัคร</TableHead>
              <TableHead>ผลงาน</TableHead>
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
