import { Button } from "@/components/button";
import type { TeamRegistrationReviewListResult } from "@bmhk-2026/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ParticipationPaginationProps {
  readonly isFetching: boolean;
  readonly onOffsetChange: (offset: number) => void;
  readonly pageSize: number;
  readonly pagination: TeamRegistrationReviewListResult["pagination"];
  readonly visibleRowCount: number;
}

function ParticipationPagination({
  isFetching,
  onOffsetChange,
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
      <div className="flex items-center justify-end gap-2">
        <Button
          disabled={pagination.offset === 0 || isFetching}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => {
            onOffsetChange(Math.max(0, pagination.offset - pageSize));
          }}
        >
          <ChevronLeft aria-hidden="true" data-icon="inline-start" />
          ก่อนหน้า
        </Button>
        <Button
          disabled={pagination.nextOffset === null || isFetching}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => {
            if (pagination.nextOffset !== null) {
              onOffsetChange(pagination.nextOffset);
            }
          }}
        >
          ถัดไป
          <ChevronRight aria-hidden="true" data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

export { ParticipationPagination };
