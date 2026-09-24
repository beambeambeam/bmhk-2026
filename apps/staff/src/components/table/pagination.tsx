import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

interface DataTablePaginationProps {
  readonly disabled?: boolean;
  readonly pageIndex: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly onPageChange: (pageIndex: number) => void;
  readonly onPageSizeChange: (pageSize: number) => void;
}

function DataTablePagination({
  disabled = false,
  pageIndex,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, pageCount);
  const currentPage = Math.min(pageIndex + 1, totalPages);
  const visiblePages = [1];
  const firstPage = Math.max(2, Math.min(currentPage - 1, totalPages - 2));
  const lastPage = Math.min(totalPages, Math.max(currentPage + 1, 3));
  for (let page = firstPage; page <= lastPage; page += 1) {
    if (page > 1 && page <= totalPages) {
      visiblePages.push(page);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-sm sm:justify-end">
      <div className="flex items-center gap-3 whitespace-nowrap">
        <span>แถวต่อหน้า</span>
        <Select
          disabled={disabled}
          items={PAGE_SIZE_OPTIONS.map((size) => ({ label: String(size), value: String(size) }))}
          value={String(pageSize)}
          onValueChange={(value) => {
            if (value !== null) {
              onPageSizeChange(Number(value));
            }
          }}
        >
          <SelectTrigger aria-label="จำนวนแถวต่อหน้า" className="min-w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <Pagination className="mx-0 w-auto" aria-label="การแบ่งหน้า">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              disabled={disabled || currentPage === 1}
              onClick={() => {
                onPageChange(currentPage - 2);
              }}
            />
          </PaginationItem>
          {visiblePages.map((page, index) => (
            <PaginationItem className="flex items-center gap-0.5" key={page}>
              {index > 0 && page - visiblePages[index - 1] > 1 ? <PaginationEllipsis /> : null}
              <PaginationLink
                aria-label={`หน้า ${page}`}
                disabled={disabled || page === currentPage}
                isActive={page === currentPage}
                onClick={() => {
                  onPageChange(page - 1);
                }}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
          {lastPage < totalPages ? (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          ) : null}
          <PaginationItem>
            <PaginationNext
              disabled={disabled || currentPage === totalPages}
              onClick={() => {
                onPageChange(currentPage);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

export { DataTablePagination };
