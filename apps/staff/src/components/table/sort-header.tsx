import { Button } from "@/components/button";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

interface DataTableSortHeaderProps {
  readonly label: string;
  readonly direction: false | "asc" | "desc";
  readonly onClick: () => void;
}

function DataTableSortHeader({ label, direction, onClick }: DataTableSortHeaderProps) {
  const DirectionIcon = direction === "desc" ? ArrowDown : ArrowUp;
  const SortIcon = direction === false ? ArrowUpDown : DirectionIcon;
  return (
    <Button
      className="-ml-3 h-auto min-h-7 min-w-0 max-w-full justify-start whitespace-normal"
      size="sm"
      type="button"
      variant="ghost"
      onClick={onClick}
    >
      <span className="min-w-0 whitespace-normal break-words text-left">{label}</span>
      <SortIcon aria-hidden="true" data-icon="inline-end" />
    </Button>
  );
}

export { DataTableSortHeader };
