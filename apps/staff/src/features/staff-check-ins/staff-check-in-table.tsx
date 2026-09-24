import { Button } from "@/components/button";
import { Field, FieldGroup, FieldLabel } from "@/components/field";
import { Input } from "@/components/input";
import { DataTable } from "@/components/table/index";
import type { DataTableColumn } from "@/components/table/index";
import { DataTableSortHeader } from "@/components/table/sort-header";
import { orpc } from "@bmhk-2026/client/orpc";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  CheckInRound,
  StaffCheckInColumnFilter,
  StaffCheckInListQuery,
  StaffCheckInSort,
  StaffCheckInStaff,
} from "@bmhk-2026/api";

import { StaffCheckInCancel } from "./staff-check-in-cancel";
import { formatCheckInDate, getStaffCheckInErrorMessage } from "./staff-check-in-utils";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

function noop(): undefined {
  return undefined;
}

interface StaffCheckInTableProps {
  readonly actorId: string | undefined;
  readonly round: CheckInRound;
}

interface SearchValues {
  readonly email: string;
  readonly name: string;
}

interface SortableColumn {
  readonly id: StaffCheckInSort["id"];
  readonly label: string;
}

const sortableColumns: readonly SortableColumn[] = [
  { id: "name", label: "ชื่อ" },
  { id: "email", label: "อีเมล" },
  { id: "checkedInAt", label: "สถานะการเข้างาน" },
];

interface StaffCheckInTableMeta {
  readonly sortBy: StaffCheckInSort["id"];
  readonly sortDesc: boolean;
  readonly onSort: (id: StaffCheckInSort["id"]) => void;
  readonly checkingInId: string | undefined;
  readonly round: CheckInRound;
  readonly onCheckIn: (id: string, name: string) => Promise<void>;
  readonly handleCancelled: () => void;
}
const columnDefinitions: DataTableColumn<StaffCheckInStaff, StaffCheckInTableMeta>[] = [
  {
    cell: ({ row }) => {
      const staffMember = row.original;
      return staffMember.name || "ไม่ระบุชื่อ";
    },
    header: "ชื่อ",
    id: "name",
    meta: { cellClassName: "font-medium" },
    size: 240,
  },
  {
    cell: ({ row }) => {
      const staffMember = row.original;
      return staffMember.email;
    },
    header: "อีเมล",
    id: "email",
    size: 320,
  },
  {
    cell: ({ row }) => {
      const staffMember = row.original;
      return staffMember.checkIn ? (
        <span className="flex flex-col gap-0.5">
          <span>{formatCheckInDate(staffMember.checkIn.checkedInAt)}</span>
          <span className="text-muted-foreground text-xs">
            ยืนยันโดย {staffMember.checkIn.checkedInByName}
          </span>
        </span>
      ) : (
        <span className="text-muted-foreground">ยังไม่เข้างาน</span>
      );
    },
    header: "สถานะการเข้างาน",
    id: "checkedInAt",
    size: 260,
  },
  {
    cell: ({ row, table }) => {
      const staffMember = row.original;
      const { meta } = table.options;
      if (!meta) {
        return null;
      }
      const isCheckingIn = meta.checkingInId === staffMember.id;
      return staffMember.checkIn ? (
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Check aria-hidden="true" className="size-4 text-emerald-600" />
            เข้างานแล้ว
          </span>
          <StaffCheckInCancel
            onCancelled={meta.handleCancelled}
            round={meta.round}
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
            void meta.onCheckIn(staffMember.id, staffMember.name || staffMember.email);
          }}
        >
          {isCheckingIn ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
          ลงทะเบียนเข้างาน
        </Button>
      );
    },
    header: "การดำเนินการ",
    id: "actions",
    meta: { cellClassName: "text-right", headerClassName: "text-right" },
    size: 240,
  },
];
const columns = columnDefinitions.map(
  (column): DataTableColumn<StaffCheckInStaff, StaffCheckInTableMeta> => {
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

function StaffCheckInTable({ actorId, round }: StaffCheckInTableProps) {
  const queryClient = useQueryClient();
  const [searches, setSearches] = useState<SearchValues>({ email: "", name: "" });
  const [debouncedSearches, setDebouncedSearches] = useState<SearchValues>(searches);
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<StaffCheckInSort>({ desc: false, id: "name" });
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
      round,
      sorting: [sorting],
    }),
    [columnFilters, pageIndex, round, sorting],
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

  function toggleSorting(id: StaffCheckInSort["id"]): void {
    setSorting((current) => ({ desc: current.id === id ? !current.desc : false, id }));
    setPageIndex(0);
  }

  async function checkIn(staffUserId: string, staffName: string): Promise<void> {
    try {
      await checkInMutation.mutateAsync({ round, staffUserId });
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

      <DataTable
        columns={columns}
        data={staffMembers}
        getRowId={(staffMember) => staffMember.id}
        meta={{
          checkingInId: checkInMutation.isPending
            ? checkInMutation.variables?.staffUserId
            : undefined,
          handleCancelled: handleCheckInCancelled,
          onCheckIn: checkIn,
          onSort: toggleSorting,
          round,
          sortBy: sorting.id,
          sortDesc: sorting.desc,
        }}
        sorting={sorting}
        isError={staffQuery.isError}
        emptyMessage="ไม่พบรายชื่อทีมงาน"
        statusMessage={errorMessage ?? (isLoading ? "กำลังโหลดรายชื่อทีมงาน..." : undefined)}
      />

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
