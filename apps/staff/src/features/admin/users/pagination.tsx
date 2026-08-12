import { Button } from "@/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  readonly firstVisibleUserNumber: number;
  readonly lastVisibleUserNumber: number;
  readonly page: number;
  readonly pageCount: number;
  readonly totalUsers: number;
  readonly onPageChange: (page: number) => void;
}

function Pagination({
  firstVisibleUserNumber,
  lastVisibleUserNumber,
  page,
  pageCount,
  totalUsers,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground">
        Showing {firstVisibleUserNumber}-{lastVisibleUserNumber} of {totalUsers} users
      </p>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => {
            onPageChange(Math.max(1, page - 1));
          }}
        >
          <ChevronLeft aria-hidden="true" data-icon="inline-start" />
          Previous
        </Button>
        <span className="min-w-20 text-center text-muted-foreground">
          Page {page} of {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page === pageCount}
          onClick={() => {
            onPageChange(Math.min(pageCount, page + 1));
          }}
        >
          Next
          <ChevronRight aria-hidden="true" data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

export { Pagination };
