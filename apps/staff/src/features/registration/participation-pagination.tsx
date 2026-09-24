import { DataTablePagination } from "@/components/table/pagination";
import type { TeamRegistrationReviewListResult } from "@bmhk-2026/api";

interface ParticipationPaginationProps {
  readonly isFetching: boolean;
  readonly onOffsetChange: (offset: number) => void;
  readonly onPageSizeChange: (pageSize: number) => void;
  readonly pageSize: number;
  readonly pagination: TeamRegistrationReviewListResult["pagination"];
  readonly visibleRowCount: number;
}

function ParticipationPagination({
  isFetching,
  onOffsetChange,
  onPageSizeChange,
  pageSize,
  pagination,
  visibleRowCount,
}: ParticipationPaginationProps) {
  const firstVisible = visibleRowCount > 0 ? pagination.offset + 1 : 0;
  const lastVisible = Math.min(pagination.offset + visibleRowCount, pagination.total);

  return (
    <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground">
        แสดง {firstVisible}-{lastVisible} จากทั้งหมด {pagination.total} รายการ
      </p>
      <DataTablePagination
        disabled={isFetching}
        pageIndex={Math.floor(pagination.offset / pageSize)}
        pageCount={Math.ceil(pagination.total / pageSize)}
        pageSize={pageSize}
        onPageChange={(page) => {
          onOffsetChange(page * pageSize);
        }}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}

export { ParticipationPagination };
