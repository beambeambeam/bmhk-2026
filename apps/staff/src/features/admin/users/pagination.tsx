import { DataTablePagination } from "@/components/table/pagination";
import type { ReactTable } from "@tanstack/react-table";

import type { AdminUsersTableFeatures } from "./table-features";
import type { AdminUser } from "./types";

interface AdminUsersPaginationProps {
  readonly table: ReactTable<AdminUsersTableFeatures, AdminUser>;
  readonly visibleRowCount: number;
}

function AdminUsersPagination({ table, visibleRowCount }: AdminUsersPaginationProps) {
  const { pageIndex, pageSize } = table.state.pagination;
  const pageCount = Math.max(1, table.getPageCount());
  const totalUsers = table.getRowCount();
  const firstVisibleUserNumber = totalUsers === 0 ? 0 : pageIndex * pageSize + 1;
  const lastVisibleUserNumber = Math.min(pageIndex * pageSize + visibleRowCount, totalUsers);

  return (
    <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground">
        แสดง {firstVisibleUserNumber}-{lastVisibleUserNumber} จากทั้งหมด {totalUsers} คน
      </p>
      <DataTablePagination
        pageIndex={pageIndex}
        pageCount={pageCount}
        onPageChange={(page) => {
          table.setPageIndex(page);
        }}
      />
    </div>
  );
}

export { AdminUsersPagination };
