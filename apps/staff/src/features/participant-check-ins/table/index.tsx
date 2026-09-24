import { Field, FieldGroup } from "@/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
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
import type { ParticipantCheckInTableMeta } from "./team-row";

const teamRegistrationOptions = [
  { label: "สถานะการลงทะเบียนทีม: ทั้งหมด", value: "all" },
  { label: "ลงทะเบียนทีมแล้ว", value: "registered" },
  { label: "ยังไม่ลงทะเบียนทีม", value: "unregistered" },
] as const;
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
  const [registrationStatus, setRegistrationStatus] = useState<
    "all" | "registered" | "unregistered"
  >("all");
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
    const filters: ParticipantCheckInColumnFilter[] = [];
    if (debouncedSearches.team.length > 0) {
      filters.push({ id: "team", value: debouncedSearches.team });
    }
    if (registrationStatus !== "all") {
      filters.push({ id: "teamCheckIn", value: registrationStatus });
    }
    return filters;
  }, [debouncedSearches, registrationStatus]);
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
  const registerTeamMutation = useMutation(
    orpc.participantCheckIns.registerTeam.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.participantCheckIns.list.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.teams.list.key() }),
        ]);
      },
    }),
  );
  const cancelTeamMutation = useMutation(
    orpc.participantCheckIns.cancelTeam.mutationOptions({
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

  async function updateTeamRegistration(
    teamId: string,
    teamName: string,
    register: boolean,
  ): Promise<boolean> {
    try {
      if (register) {
        await registerTeamMutation.mutateAsync({ round, teamId });
        toast.success(`ลงทะเบียนทีม ${teamName} เข้าร่วมงานแล้ว`);
      } else {
        await cancelTeamMutation.mutateAsync({ round, teamId });
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
    isSettingTeamAward: registerTeamMutation.isPending || cancelTeamMutation.isPending,
    onCheckIn: checkIn,
    onSort: toggleSorting,
    onUpdateFlag: updateFlag,
    onUpdateTeamRegistration: updateTeamRegistration,
    round,
    sortBy: sorting.id,
    sortDesc: sorting.desc,
    updatingFlagId: flagMutation.isPending ? flagMutation.variables?.participantId : undefined,
    updatingTeamAwardId:
      (registerTeamMutation.isPending ? registerTeamMutation.variables?.teamId : undefined) ??
      (cancelTeamMutation.isPending ? cancelTeamMutation.variables?.teamId : undefined),
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
      <FieldGroup className="grid w-full grid-cols-1 gap-3 sm:max-w-4xl sm:grid-cols-[minmax(0,1fr)_18rem]">
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
        <Field>
          <Select
            items={teamRegistrationOptions}
            value={registrationStatus}
            onValueChange={(value) => {
              if (value === "all" || value === "registered" || value === "unregistered") {
                setRegistrationStatus(value);
                setPageIndex(0);
              }
            }}
          >
            <SelectTrigger aria-label="สถานะการลงทะเบียนทีม" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {teamRegistrationOptions.map(({ label, value }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
      <Table className="min-w-[74rem] table-fixed">
        <colgroup>
          <col className="w-36" />
          <col className="w-72" />
          <col className="w-80" />
          <col />
        </colgroup>
        <TableHeader>
          <TableRow>
            <SortableTableHead id="teamCode" label="รหัสทีม" meta={meta} />
            <SortableTableHead id="teamName" label="ทีม" meta={meta} />
            <TableHead className="whitespace-normal">สถานะการลงทะเบียนทีม</TableHead>
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
                colSpan={4}
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
