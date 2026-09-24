import { Field, FieldGroup, FieldLabel } from "@/components/field";
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
  readonly email: string;
  readonly name: string;
  readonly teamName: string;
}

function ParticipantCheckInTable({ actorId, round }: ParticipantCheckInTableProps) {
  const queryClient = useQueryClient();
  const [searches, setSearches] = useState<SearchValues>({ email: "", name: "", teamName: "" });
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
        email: searches.email.trim(),
        name: searches.name.trim(),
        teamName: searches.teamName.trim(),
      });
      setPageIndex(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searches]);
  const columnFilters = useMemo<ParticipantCheckInColumnFilter[]>(() => {
    const filters: ParticipantCheckInColumnFilter[] = [];
    if (debouncedSearches.email) {
      filters.push({ id: "email", value: debouncedSearches.email });
    }
    if (debouncedSearches.name) {
      filters.push({ id: "name", value: debouncedSearches.name });
    }
    if (debouncedSearches.teamName) {
      filters.push({ id: "teamName", value: debouncedSearches.teamName });
    }
    return filters;
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

  function toggleSorting(id: ParticipantCheckInSort["id"]): void {
    setSorting((current) => ({ desc: current.id === id ? !current.desc : false, id }));
    setPageIndex(0);
  }

  const meta: ParticipantCheckInTableMeta = {
    checkingInId: checkInMutation.isPending ? checkInMutation.variables?.participantId : undefined,
    onCheckIn: checkIn,
    onSort: toggleSorting,
    onUpdateFlag: updateFlag,
    round,
    sortBy: sorting.id,
    sortDesc: sorting.desc,
    updatingFlagId: flagMutation.isPending ? flagMutation.variables?.participantId : undefined,
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
      <FieldGroup className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        {(
          [
            ["email", "อีเมล", "ค้นหาอีเมล"],
            ["name", "ชื่อ", "ค้นหาชื่อ"],
            ["teamName", "ทีม", "ค้นหาชื่อทีม"],
          ] as const
        ).map(([key, label, placeholder]) => (
          <Field key={key}>
            <FieldLabel htmlFor={`participant-check-in-${key}`}>{label}</FieldLabel>
            <Input
              id={`participant-check-in-${key}`}
              placeholder={placeholder}
              type="search"
              value={searches[key]}
              onChange={(event) => {
                setSearches((current) => ({ ...current, [key]: event.target.value }));
              }}
            />
          </Field>
        ))}
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
