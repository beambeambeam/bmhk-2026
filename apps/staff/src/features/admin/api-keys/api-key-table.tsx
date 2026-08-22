import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { orpc } from "@bmhk-2026/client/orpc";
import { useQuery } from "@tanstack/react-query";

import { ApiKeyCreate } from "./api-key-create";
import { ApiKeyRevoke } from "./api-key-revoke";
import { formatApiKeyDate, getApiKeyErrorMessage } from "./api-key-utils";

const TABLE_COLUMN_COUNT = 7;

function ApiKeyTable() {
  const apiKeysQuery = useQuery(orpc.apiKeys.list.queryOptions());
  const apiKeys = apiKeysQuery.data?.apiKeys ?? [];
  const { isLoading } = apiKeysQuery;
  const errorMessage = apiKeysQuery.isError
    ? getApiKeyErrorMessage(apiKeysQuery.error, "An error occurred while fetching API keys.")
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <ApiKeyCreate />
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expiration date</TableHead>
              <TableHead>Last use</TableHead>
              <TableHead className="text-right">Ops</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || errorMessage !== undefined || apiKeys.length === 0 ? (
              <TableRow>
                <TableCell
                  className={
                    errorMessage === undefined
                      ? "h-24 text-center text-muted-foreground"
                      : "h-24 text-center text-destructive"
                  }
                  colSpan={TABLE_COLUMN_COUNT}
                >
                  {errorMessage ?? (isLoading ? "กำลังโหลดรายการ API key..." : "ยังไม่มี API key")}
                </TableCell>
              </TableRow>
            ) : (
              apiKeys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell className="font-medium">{apiKey.name ?? "ไม่ระบุชื่อ"}</TableCell>
                  <TableCell>
                    {apiKey.ownerName ?? apiKey.ownerEmail ?? "-"}
                    {apiKey.ownerName !== null && apiKey.ownerEmail !== null ? (
                      <div className="text-muted-foreground text-xs">{apiKey.ownerEmail}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground text-xs">
                    {apiKey.start ?? "-"}
                  </TableCell>
                  <TableCell>
                    {apiKey.enabled ? (
                      <span className="text-emerald-600">In use</span>
                    ) : (
                      <span className="text-muted-foreground">Revoked</span>
                    )}
                  </TableCell>
                  <TableCell>{formatApiKeyDate(apiKey.expiresAt)}</TableCell>
                  <TableCell>{formatApiKeyDate(apiKey.lastRequest)}</TableCell>
                  <TableCell className="text-right">
                    {apiKey.enabled ? (
                      <ApiKeyRevoke id={apiKey.id} name={apiKey.name ?? apiKey.id} />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export { ApiKeyTable };
