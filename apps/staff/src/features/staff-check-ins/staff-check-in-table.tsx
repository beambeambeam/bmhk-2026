import { Button } from "@/components/button";
import { Field, FieldGroup, FieldLabel } from "@/components/field";
import { Input } from "@/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { orpc } from "@bmhk-2026/client/orpc";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { StaffCheckInColumnFilter, StaffCheckInListQuery } from "@bmhk-2026/api";

import { StaffCheckInCancel } from "./staff-check-in-cancel";
import { formatCheckInDate, getStaffCheckInErrorMessage } from "./staff-check-in-utils";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

function noop(): undefined {
  return undefined;
}

interface StaffCheckInTableProps {
  readonly actorId: string | undefined;
}

interface SearchValues {
  readonly email: string;
  readonly name: string;
}

function StaffCheckInTable({ actorId }: StaffCheckInTableProps) {
  const queryClient = useQueryClient();
  const [searches, setSearches] = useState<SearchValues>({ email: "", name: "" });
  const [debouncedSearches, setDebouncedSearches] = useState<SearchValues>(searches);
  const [pageIndex, setPageIndex] = useState(0);
  const hasInitializedSearch = useRef(false);

  useEffect(() => {
    if (!hasInitializedSearch.current) {
      hasInitializedSearch.current = true;
      return noop;
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedSearches({ email: searches.email.trim(), name: searches.name.trim() });
      setPageIndex(0);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searches]);

  const columnFilters = useMemo<StaffCheckInColumnFilter[]>(() => {
    const filters: StaffCheckInColumnFilter[] = [];
    if (debouncedSearches.email) {
      filters.push({ id: "email", value: debouncedSearches.email });
    }
    if (debouncedSearches.name) {
      filters.push({ id: "name", value: debouncedSearches.name });
    }
    return filters;
  }, [debouncedSearches]);
  const input = useMemo<StaffCheckInListQuery>(
    () => ({
      columnFilters,
      pagination: { pageIndex, pageSize: PAGE_SIZE },
      sorting: [{ desc: false, id: "name" }],
    }),
    [columnFilters, pageIndex],
  );
  const staffQuery = useQuery({
    ...orpc.staffCheckIns.list.queryOptions({
      enabled: actorId !== undefined,
      input,
      queryKey: [...orpc.staffCheckIns.list.queryKey({ input }), { userId: actorId }],
    }),
    placeholderData: keepPreviousData,
  });
  const checkInMutation = useMutation(
    orpc.staffCheckIns.checkIn.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: orpc.staffCheckIns.list.key() });
      },
    }),
  );
  const staffMembers = staffQuery.data?.rows ?? [];
  const rowCount = staffQuery.data?.rowCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(rowCount / PAGE_SIZE));
  const { isLoading } = staffQuery;
  const errorMessage = staffQuery.isError
    ? getStaffCheckInErrorMessage(staffQuery.error, "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง")
    : undefined;

  function handleCheckInCancelled(): void {
    if (staffMembers.length === 1 && pageIndex > 0) {
      setPageIndex((currentPageIndex) => currentPageIndex - 1);
    }
  }

  async function checkIn(staffUserId: string, staffName: string): Promise<void> {
    try {
      await checkInMutation.mutateAsync({ staffUserId });
      toast.success(`ลงทะเบียนเข้างานสำหรับ ${staffName} แล้ว`);
    } catch (error) {
      toast.error(getStaffCheckInErrorMessage(error, "ไม่สามารถลงทะเบียนเข้างานได้ กรุณาลองใหม่อีกครั้ง"));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <FieldGroup className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:max-w-[33rem]">
        <Field>
          <FieldLabel htmlFor="staff-check-in-email">อีเมล</FieldLabel>
          <Input
            id="staff-check-in-email"
            placeholder="ค้นหาอีเมล"
            type="search"
            value={searches.email}
            onChange={(event) => {
              setSearches((current) => ({ ...current, email: event.target.value }));
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="staff-check-in-name">ชื่อ</FieldLabel>
          <Input
            id="staff-check-in-name"
            placeholder="ค้นหาชื่อ"
            type="search"
            value={searches.name}
            onChange={(event) => {
              setSearches((current) => ({ ...current, name: event.target.value }));
            }}
          />
        </Field>
      </FieldGroup>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ</TableHead>
              <TableHead>อีเมล</TableHead>
              <TableHead>สถานะการเข้างาน</TableHead>
              <TableHead className="text-right">การดำเนินการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || errorMessage !== undefined || staffMembers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className={
                    errorMessage === undefined
                      ? "h-24 text-center text-muted-foreground"
                      : "h-24 text-center text-destructive"
                  }
                >
                  {errorMessage ?? (isLoading ? "กำลังโหลดรายชื่อทีมงาน..." : "ไม่พบรายชื่อทีมงาน")}
                </TableCell>
              </TableRow>
            ) : (
              staffMembers.map((staffMember) => {
                const isCheckingIn =
                  checkInMutation.isPending &&
                  checkInMutation.variables?.staffUserId === staffMember.id;

                return (
                  <TableRow key={staffMember.id}>
                    <TableCell className="font-medium">{staffMember.name || "ไม่ระบุชื่อ"}</TableCell>
                    <TableCell>{staffMember.email}</TableCell>
                    <TableCell>
                      {staffMember.checkIn ? (
                        <span className="flex flex-col gap-0.5">
                          <span>{formatCheckInDate(staffMember.checkIn.checkedInAt)}</span>
                          <span className="text-muted-foreground text-xs">
                            ยืนยันโดย {staffMember.checkIn.checkedInByName}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">ยังไม่เข้างาน</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {staffMember.checkIn ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <Check aria-hidden="true" className="size-4 text-emerald-600" />
                            เข้างานแล้ว
                          </span>
                          <StaffCheckInCancel
                            onCancelled={handleCheckInCancelled}
                            staffName={staffMember.name || staffMember.email}
                            staffUserId={staffMember.id}
                          />
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={isCheckingIn}
                          onClick={() => {
                            void checkIn(staffMember.id, staffMember.name || staffMember.email);
                          }}
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
            type="button"
            variant="outline"
            size="sm"
            disabled={pageIndex === 0}
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
            type="button"
            variant="outline"
            size="sm"
            disabled={pageIndex + 1 >= pageCount}
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

export { StaffCheckInTable };
