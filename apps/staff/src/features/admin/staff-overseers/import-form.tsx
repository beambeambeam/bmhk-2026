import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import type { StaffOverseerImportResult } from "@bmhk-2026/api";
import { orpc } from "@bmhk-2026/client/orpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { parseStaffOverseerCsv } from "./parse-csv";

function StaffOverseerImportForm() {
  const queryClient = useQueryClient();
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<StaffOverseerImportResult | null>(null);

  const importMutation = useMutation(
    orpc.staffOverseers.importRows.mutationOptions({
      onError: (error) => toast.error(error instanceof Error ? error.message : "Import failed"),
      onSuccess: async (result) => {
        setLastResult(result);
        await queryClient.invalidateQueries({ queryKey: orpc.staffOverseers.listOverseers.key() });
        await queryClient.invalidateQueries({ queryKey: orpc.staffOverseers.listBacklog.key() });
        toast.success("Import complete");
      },
    }),
  );

  async function readAndImport(file: File): Promise<void> {
    const text = await file.text();
    const { errors, rows } = parseStaffOverseerCsv(text);
    setParseErrors(errors);
    setLastResult(null);

    if (rows.length > 0) {
      importMutation.mutate({ rows });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import staff overseers</CardTitle>
        <CardDescription>Upload a CSV with columns kmutt_email, teams_group_idx.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={importMutation.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                void readAndImport(file);
              }
            }}
          />
        </label>

        {parseErrors.length > 0 ? (
          <div className="text-destructive text-sm">
            <p>Some rows could not be read:</p>
            <ul className="list-inside list-disc">
              {parseErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {lastResult ? (
          <ul className="text-sm">
            {lastResult.map((row) => (
              <li key={`${row.email}-${row.teamsGroupIndex}`}>
                {row.email}: {row.outcome}
                {row.error !== undefined && row.error.length > 0 ? ` (${row.error})` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { StaffOverseerImportForm };
