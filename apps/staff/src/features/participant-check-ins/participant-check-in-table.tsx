import { Button } from "@/components/button";
import { Field, FieldGroup, FieldLabel } from "@/components/field";
import { Input } from "@/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import type {
  ParticipantCheckInColumnFilter,
  ParticipantCheckInFlag,
  ParticipantCheckInListQuery,
  ParticipantCheckInSort,
} from "@bmhk-2026/api";
import { orpc } from "@bmhk-2026/client/orpc";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { formatCheckInDate } from "../staff-check-ins/staff-check-in-utils";
import { ParticipantCheckInCancel } from "./participant-check-in-cancel";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;
const noFlagValue = "none";
const participantCheckInFlagValues = ["feeling_unwell", "bad_behavior"] as const;
const flagLabels: Record<ParticipantCheckInFlag, string> = {
  bad_behavior: "พฤติกรรมไม่เหมาะสม",
  feeling_unwell: "ไม่สบาย",
};

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
}
interface SearchValues {
  readonly email: string;
  readonly name: string;
  readonly teamName: string;
}

interface SortableColumn {
  readonly id: ParticipantCheckInSort["id"];
  readonly label: string;
}

const sortableColumns: readonly SortableColumn[] = [
  { id: "name", label: "ชื่อ" },
  { id: "teamName", label: "ทีม" },
  { id: "email", label: "อีเมล" },
  { id: "checkedInAt", label: "สถานะการเข้างาน" },
  { id: "flag", label: "หมายเหตุ" },
];

function ParticipantCheckInTable({ actorId }: ParticipantCheckInTableProps) {
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
      sorting: [sorting],
    }),
    [columnFilters, pageIndex, sorting],
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
  const participants = participantQuery.data?.rows ?? [];
  const rowCount = participantQuery.data?.rowCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(rowCount / PAGE_SIZE));
  async function checkIn(participantId: string, name: string): Promise<void> {
    try {
      await checkInMutation.mutateAsync({ participantId });
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
      await flagMutation.mutateAsync({ flag, participantId });
    } catch {
      toast.error("ไม่สามารถบันทึกหมายเหตุได้ กรุณาลองใหม่อีกครั้ง");
    }
  }
  function toggleSorting(id: ParticipantCheckInSort["id"]): void {
    setSorting((current) => ({ desc: current.id === id ? !current.desc : false, id }));
    setPageIndex(0);
  }
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
                      className={
                        sorting.id === column.id ? "text-foreground" : "text-muted-foreground"
                      }
                    />
                  </Button>
                </TableHead>
              ))}
              <TableHead className="text-right">การดำเนินการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participantQuery.isLoading || participantQuery.isError || participants.length === 0 ? (
              <TableRow>
                <TableCell
                  className={
                    participantQuery.isError
                      ? "h-24 text-center text-destructive"
                      : "h-24 text-center text-muted-foreground"
                  }
                  colSpan={6}
                >
                  {getTableMessage(participantQuery.isError, participantQuery.isLoading)}
                </TableCell>
              </TableRow>
            ) : (
              participants.map((participant) => {
                const isCheckingIn =
                  checkInMutation.isPending &&
                  checkInMutation.variables?.participantId === participant.id;
                const isUpdatingFlag =
                  flagMutation.isPending &&
                  flagMutation.variables?.participantId === participant.id;
                return (
                  <TableRow key={participant.id}>
                    <TableCell className="font-medium">{participant.name}</TableCell>
                    <TableCell>{participant.teamName}</TableCell>
                    <TableCell>{participant.email}</TableCell>
                    <TableCell>
                      {participant.checkIn ? (
                        <span className="flex flex-col gap-0.5">
                          <span>{formatCheckInDate(participant.checkIn.checkedInAt)}</span>
                          <span className="text-muted-foreground text-xs">
                            ยืนยันโดย {participant.checkIn.checkedInByName}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">ยังไม่เข้างาน</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {participant.checkIn ? (
                        <Select
                          disabled={isUpdatingFlag}
                          value={participant.checkIn.flag ?? noFlagValue}
                          onValueChange={(value) => void updateFlag(participant.id, value)}
                        >
                          <SelectTrigger
                            aria-label={`หมายเหตุสำหรับ ${participant.name}`}
                            className="min-w-36"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={noFlagValue}>ไม่มี</SelectItem>
                            {Object.entries(flagLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {participant.checkIn ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <Check aria-hidden="true" className="size-4 text-emerald-600" />
                            เข้างานแล้ว
                          </span>
                          <ParticipantCheckInCancel
                            participantId={participant.id}
                            participantName={participant.name}
                          />
                        </span>
                      ) : (
                        <Button
                          disabled={isCheckingIn}
                          size="sm"
                          type="button"
                          onClick={() => void checkIn(participant.id, participant.name)}
                        >
                          {isCheckingIn ? (
                            <Loader2 aria-hidden="true" className="animate-spin" />
                          ) : null}
                          ลงทะเบียนเข้างาน
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">ทั้งหมด {rowCount} คน</p>
        <div className="flex items-center justify-end gap-2">
          <Button
            disabled={pageIndex === 0}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              setPageIndex((page) => page - 1);
            }}
          >
            <ChevronLeft aria-hidden="true" data-icon="inline-start" /> ก่อนหน้า
          </Button>
          <span className="min-w-20 text-center text-muted-foreground">
            หน้า {pageIndex + 1} จาก {pageCount}
          </span>
          <Button
            disabled={pageIndex + 1 >= pageCount}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              setPageIndex((page) => page + 1);
            }}
          >
            ถัดไป <ChevronRight aria-hidden="true" data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export { ParticipantCheckInTable };
