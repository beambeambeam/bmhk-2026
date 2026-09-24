import { Button } from "@/components/button";
import { DataTable } from "@/components/table/index";
import type { DataTableColumn } from "@/components/table/index";
import type { StaffOverseerBacklogEntry } from "@bmhk-2026/api";
import { orpc } from "@bmhk-2026/client/orpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface StaffOverseersBacklogTableProps {
  readonly entries: readonly StaffOverseerBacklogEntry[];
}

interface BacklogTableMeta {
  readonly isRetrying: boolean;
  readonly handleRetry: (id: string) => void;
}

const columns: DataTableColumn<StaffOverseerBacklogEntry, BacklogTableMeta>[] = [
  { accessorKey: "email", header: "Email", size: 320 },
  {
    cell: ({ row }) => `[${row.original.groupIndex}] ${row.original.groupName}`,
    header: "Group",
    id: "group",
    size: 240,
  },
  {
    cell: ({ row, table }) => {
      const { meta } = table.options;
      if (!meta) {
        return null;
      }
      return (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={meta.isRetrying}
          onClick={() => {
            meta.handleRetry(row.original.id);
          }}
        >
          Retry
        </Button>
      );
    },
    header: () => <span className="sr-only">Actions</span>,
    id: "actions",
    size: 120,
  },
];

function StaffOverseersBacklogTable({ entries }: StaffOverseersBacklogTableProps) {
  const queryClient = useQueryClient();

  async function invalidate(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: orpc.staffOverseers.listBacklog.key() });
    await queryClient.invalidateQueries({ queryKey: orpc.staffOverseers.listOverseers.key() });
  }

  const retryOneMutation = useMutation(
    orpc.staffOverseers.retryBacklogEntry.mutationOptions({
      onError: (error) => toast.error(error instanceof Error ? error.message : "Retry failed"),
      onSuccess: async () => {
        await invalidate();
      },
    }),
  );
  const retryAllMutation = useMutation(
    orpc.staffOverseers.retryAllBacklog.mutationOptions({
      onError: (error) => toast.error(error instanceof Error ? error.message : "Retry failed"),
      onSuccess: async () => {
        await invalidate();
        toast.success("Backlog retried");
      },
    }),
  );

  if (entries.length === 0) {
    return <p className="text-muted-foreground text-sm">Backlog is empty.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={retryAllMutation.isPending}
          onClick={() => {
            // oxlint-disable-next-line unicorn/no-useless-undefined -- retryAllBacklog has no input schema; TanStack Query's mutate() still requires this argument
            retryAllMutation.mutate(undefined);
          }}
        >
          Retry all
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={entries}
        getRowId={(entry) => entry.id}
        emptyMessage="Backlog is empty."
        meta={{
          handleRetry: (id) => {
            retryOneMutation.mutate({ id });
          },
          isRetrying: retryOneMutation.isPending,
        }}
      />
    </div>
  );
}

export { StaffOverseersBacklogTable };
