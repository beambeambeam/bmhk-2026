import { Button } from "@/components/button";
import type { ReactTable } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { AdminUsersTableFeatures } from "./table-features";
import type { StaffUser } from "./types";

interface AdminUsersPaginationProps {
  readonly table: ReactTable<AdminUsersTableFeatures, StaffUser>;
  readonly visibleRowCount: number;
}

function AdminUsersPagination({ table, visibleRowCount }: AdminUsersPaginationProps) {
  const { pageIndex, pageSize } = table.state.pagination;
  const pageCount = Math.max(1, table.getPageCount());
  const page = Math.min(pageIndex + 1, pageCount);
  const totalUsers = table.getRowCount();
  const firstVisibleUserNumber = totalUsers === 0 ? 0 : pageIndex * pageSize + 1;
  const lastVisibleUserNumber = Math.min(pageIndex * pageSize + visibleRowCount, totalUsers);

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
          disabled={!table.getCanPreviousPage()}
          onClick={() => {
            table.previousPage();
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
          disabled={!table.getCanNextPage()}
          onClick={() => {
            table.nextPage();
          }}
        >
          Next
          <ChevronRight aria-hidden="true" data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

export { AdminUsersPagination };
