import { Button } from "@/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import type { StaffOverseerBacklogEntry } from "@bmhk-2026/api";
import { orpc } from "@bmhk-2026/client/orpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface StaffOverseersBacklogTableProps {
  readonly entries: readonly StaffOverseerBacklogEntry[];
}

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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Group</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{entry.email}</TableCell>
              <TableCell>{`[${entry.groupIndex}] ${entry.groupName}`}</TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={retryOneMutation.isPending}
                  onClick={() => {
                    retryOneMutation.mutate({ id: entry.id });
                  }}
                >
                  Retry
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export { StaffOverseersBacklogTable };
