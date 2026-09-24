import { DataTable } from "@/components/table/index";
import type { DataTableColumn } from "@/components/table/index";
import type { ApiKey } from "@bmhk-2026/api";
import { orpc } from "@bmhk-2026/client/orpc";
import { useQuery } from "@tanstack/react-query";

import { ApiKeyCreate } from "./api-key-create";
import { ApiKeyRevoke } from "./api-key-revoke";
import { formatApiKeyDate, getApiKeyErrorMessage } from "./api-key-utils";

const columnDefinitions: DataTableColumn<ApiKey>[] = [
  {
    cell: ({ row }) => {
      const apiKey = row.original;
      return apiKey.name ?? "ไม่ระบุชื่อ";
    },
    header: "ชื่อ",
    id: "name",
    meta: { cellClassName: "font-medium" },
    size: 200,
  },
  {
    cell: ({ row }) => {
      const apiKey = row.original;
      return (
        <>
          {apiKey.ownerName ?? apiKey.ownerEmail ?? "-"}
          {apiKey.ownerName !== null && apiKey.ownerEmail !== null ? (
            <div className="text-muted-foreground text-xs">{apiKey.ownerEmail}</div>
          ) : null}
        </>
      );
    },
    header: "เจ้าของ",
    id: "owner",
    size: 300,
  },
  {
    cell: ({ row }) => {
      const apiKey = row.original;
      return apiKey.start ?? "-";
    },
    header: "คีย์",
    id: "key",
    meta: { cellClassName: "font-mono text-muted-foreground text-xs" },
    size: 180,
  },
  {
    cell: ({ row }) => {
      const apiKey = row.original;
      return apiKey.enabled ? (
        <span className="text-emerald-600">กำลังใช้งาน</span>
      ) : (
        <span className="text-muted-foreground">เพิกถอนแล้ว</span>
      );
    },
    header: "สถานะ",
    id: "status",
    size: 140,
  },
  {
    cell: ({ row }) => {
      const apiKey = row.original;
      return formatApiKeyDate(apiKey.expiresAt);
    },
    header: "วันหมดอายุ",
    id: "expiresAt",
    size: 200,
  },
  {
    cell: ({ row }) => {
      const apiKey = row.original;
      return formatApiKeyDate(apiKey.lastRequest);
    },
    header: "ใช้งานล่าสุด",
    id: "lastRequest",
    size: 200,
  },
  {
    cell: ({ row }) => {
      const apiKey = row.original;
      return apiKey.enabled ? (
        <ApiKeyRevoke id={apiKey.id} name={apiKey.name ?? apiKey.id} />
      ) : null;
    },
    header: "การดำเนินการ",
    id: "actions",
    meta: { cellClassName: "text-right", headerClassName: "text-right" },
    size: 160,
  },
];

function ApiKeyTable() {
  const apiKeysQuery = useQuery(orpc.apiKeys.list.queryOptions());
  const apiKeys = apiKeysQuery.data?.apiKeys ?? [];
  const { isLoading } = apiKeysQuery;
  const errorMessage = apiKeysQuery.isError
    ? getApiKeyErrorMessage(apiKeysQuery.error, "เกิดข้อผิดพลาดระหว่างโหลดรายการ API key")
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <ApiKeyCreate />
      </div>
      <DataTable
        columns={columnDefinitions}
        data={apiKeys}
        getRowId={(apiKey) => apiKey.id}
        emptyMessage="ยังไม่มี API key"
        isError={apiKeysQuery.isError}
        statusMessage={errorMessage ?? (isLoading ? "กำลังโหลดรายการ API key..." : undefined)}
      />
    </div>
  );
}

export { ApiKeyTable };
