import { Field, FieldGroup } from "@/components/field";
import { Input } from "@/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { DataTablePagination } from "@/components/table/pagination";
import { cn } from "@/lib/utils";
import type {
  CheckInRound,
  ParticipantCheckInColumnFilter,
  ParticipantCheckInListQuery,
  ParticipantCheckInSort,
} from "@bmhk-2026/api";
import { orpc } from "@bmhk-2026/client/orpc";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  ParticipantCheckInTeamRow,
  SortableTableHead,
  participantCheckInFlagValues,
} from "./team-row";
import type { ParticipantCheckInTableMeta, ParticipantCheckInTeamAward } from "./team-row";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

function noop(): undefined {
  return undefined;
}

function getTableMessage(isError: boolean, isLoading: boolean): string {
  if (isError) {
    return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
  }
  if (isLoading) {
    return "กำลังโหลดรายชื่อผู้เข้าร่วม...";
  }
  return "ไม่พบรายชื่อผู้เข้าร่วม";
}

interface ParticipantCheckInTableProps {
  readonly actorId: string | undefined;
  readonly round: CheckInRound;
}

interface SearchValues {
  readonly team: string;
}

function ParticipantCheckInTable({ actorId, round }: ParticipantCheckInTableProps) {
  const queryClient = useQueryClient();
  const [searches, setSearches] = useState<SearchValues>({ team: "" });
  const [debouncedSearches, setDebouncedSearches] = useState<SearchValues>(searches);
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<ParticipantCheckInSort>({ desc: false, id: "name" });
  const hasInitializedSearch = useRef(false);
  useEffect(() => {
    if (!hasInitializedSearch.current) {
      hasInitializedSearch.current = true;
      return noop;
    }
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearches({
        team: searches.team.trim(),
      });
      setPageIndex(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searches]);
  const columnFilters = useMemo<ParticipantCheckInColumnFilter[]>(() => {
    if (debouncedSearches.team.length === 0) {
      return [];
    }
    return [{ id: "team", value: debouncedSearches.team }];
  }, [debouncedSearches]);
  const input = useMemo<ParticipantCheckInListQuery>(
    () => ({
      columnFilters,
      pagination: { pageIndex, pageSize: PAGE_SIZE },
      round,
      sorting: [sorting],
    }),
    [columnFilters, pageIndex, round, sorting],
  );
  const participantQuery = useQuery({
    ...orpc.participantCheckIns.list.queryOptions({
      enabled: actorId !== undefined,
      input,
      queryKey: [...orpc.participantCheckIns.list.queryKey({ input }), { userId: actorId }],
    }),
    placeholderData: keepPreviousData,
  });
  const checkInMutation = useMutation(
    orpc.participantCheckIns.checkIn.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.participantCheckIns.list.key() });
      },
    }),
  );
  const flagMutation = useMutation(
    orpc.participantCheckIns.updateFlag.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.participantCheckIns.list.key() });
      },
    }),
  );
  const setTeamAwardMutation = useMutation(
    orpc.teams.setAward.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.participantCheckIns.list.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.teams.list.key() }),
        ]);
      },
    }),
  );
  const teams = participantQuery.data?.rows ?? [];
  const rowCount = participantQuery.data?.rowCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(rowCount / PAGE_SIZE));

  async function checkIn(participantId: string, name: string): Promise<void> {
    try {
      await checkInMutation.mutateAsync({ participantId, round });
      toast.success(`ลงทะเบียนเข้างานสำหรับ ${name} แล้ว`);
    } catch {
      toast.error("ไม่สามารถลงทะเบียนเข้างานได้ กรุณาลองใหม่อีกครั้ง");
    }
  }

  async function updateFlag(participantId: string, value: string | null): Promise<void> {
    try {
      if (value === null) {
        return;
      }
      const flag = participantCheckInFlagValues.find((flagValue) => flagValue === value) ?? null;
      await flagMutation.mutateAsync({ flag, participantId, round });
    } catch {
      toast.error("ไม่สามารถบันทึกหมายเหตุได้ กรุณาลองใหม่อีกครั้ง");
    }
  }

  async function updateTeamAward(
    teamId: string,
    teamName: string,
    award: ParticipantCheckInTeamAward,
  ): Promise<boolean> {
    try {
      await setTeamAwardMutation.mutateAsync({ award, id: teamId });
      if (award === "ROUND_1_PARTICIPATED") {
        toast.success(`ลงทะเบียนทีม ${teamName} เข้าร่วมงานแล้ว`);
      } else {
        toast.success(`ยกเลิกการลงทะเบียนทีม ${teamName} แล้ว`);
      }
      return true;
    } catch {
      toast.error("ไม่สามารถอัปเดตการลงทะเบียนทีมได้ กรุณาลองใหม่อีกครั้ง");
      return false;
    }
  }

  function toggleSorting(id: ParticipantCheckInSort["id"]): void {
    setSorting((current) => ({ desc: current.id === id ? !current.desc : false, id }));
    setPageIndex(0);
  }

  const meta: ParticipantCheckInTableMeta = {
    checkingInId: checkInMutation.isPending ? checkInMutation.variables?.participantId : undefined,
    isSettingTeamAward: setTeamAwardMutation.isPending,
    onCheckIn: checkIn,
    onSort: toggleSorting,
    onUpdateFlag: updateFlag,
    onUpdateTeamAward: updateTeamAward,
    round,
    sortBy: sorting.id,
    sortDesc: sorting.desc,
    updatingFlagId: flagMutation.isPending ? flagMutation.variables?.participantId : undefined,
    updatingTeamAwardId: setTeamAwardMutation.isPending
      ? setTeamAwardMutation.variables?.id
      : undefined,
  };
  let tableMessage: string | undefined;
  if (participantQuery.isLoading || participantQuery.isError) {
    tableMessage = getTableMessage(participantQuery.isError, participantQuery.isLoading);
  } else if (teams.length === 0) {
    tableMessage = getTableMessage(false, false);
  }
  const hasTableMessage = tableMessage !== undefined;

  return (
    <div className="flex flex-col gap-5">
      <FieldGroup className="grid w-full grid-cols-1 gap-3 sm:max-w-2xl">
        <Field>
          <Input
            id="participant-check-in-team"
            placeholder="ค้นหาชื่อทีมหรือรหัสทีม"
            type="search"
            value={searches.team}
            onChange={(event) => {
              setSearches((current) => ({ ...current, team: event.target.value }));
            }}
          />
        </Field>
      </FieldGroup>
      <Table className="min-w-[74rem] table-fixed">
        <colgroup>
          <col className="w-36" />
          <col className="w-72" />
          <col />
        </colgroup>
        <TableHeader>
          <TableRow>
            <SortableTableHead id="teamCode" label="รหัสทีม" meta={meta} />
            <SortableTableHead id="teamName" label="ทีม" meta={meta} />
            <TableHead className="whitespace-normal">สมาชิก</TableHead>
          </TableRow>
        </TableHeader>
        {hasTableMessage ? (
          <TableBody>
            <TableRow>
              <TableCell
                className={cn(
                  "h-24 text-center whitespace-normal wrap-anywhere",
                  participantQuery.isError ? "text-destructive" : "text-muted-foreground",
                )}
                colSpan={3}
              >
                {tableMessage}
              </TableCell>
            </TableRow>
          </TableBody>
        ) : (
          teams.map((team) => <ParticipantCheckInTeamRow key={team.id} meta={meta} team={team} />)
        )}
      </Table>
      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">ทั้งหมด {rowCount} ทีม</p>
        <DataTablePagination
          disabled={participantQuery.isFetching}
          pageIndex={pageIndex}
          pageCount={pageCount}
          onPageChange={setPageIndex}
        />
      </div>
    </div>
  );
}

export { ParticipantCheckInTable };
