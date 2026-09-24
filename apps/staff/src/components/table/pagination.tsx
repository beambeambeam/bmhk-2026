import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/pagination";

interface DataTablePaginationProps {
  readonly disabled?: boolean;
  readonly pageIndex: number;
  readonly pageCount: number;
  readonly onPageChange: (pageIndex: number) => void;
}

function DataTablePagination({
  disabled = false,
  pageIndex,
  pageCount,
  onPageChange,
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, pageCount);
  const currentPage = Math.min(pageIndex + 1, totalPages);
  const visiblePages = [1];
  const firstPage = Math.max(1, Math.min(currentPage - 1, totalPages - 2));
  const lastPage = Math.min(totalPages, Math.max(currentPage + 1, 3));
  for (let page = firstPage; page <= lastPage; page += 1) {
    if (page > 1 && page < totalPages) {
      visiblePages.push(page);
    }
  }
  if (totalPages > 1) {
    visiblePages.push(totalPages);
  }

  return (
    <Pagination className="mx-0 w-auto" aria-label="Table pagination">
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
              aria-label={`Page ${page}`}
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
  );
}

export { DataTablePagination };
