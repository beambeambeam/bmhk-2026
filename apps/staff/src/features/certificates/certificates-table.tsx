import { Button } from "@/components/button";
import { Input } from "@/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { DataTable } from "@/components/table/index";
import type { DataTableColumn } from "@/components/table/index";
import { DataTablePagination } from "@/components/table/pagination";
import { certificateStatusValues } from "@bmhk-2026/api/certificates/rules";
import type { CertificateOverview, CertificateOverviewRow } from "@bmhk-2026/api";
import { client } from "@bmhk-2026/client/orpc";
import { cn } from "@/lib/utils";
import { Download, Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  certificateMismatchLabels,
  certificateStatusClasses,
  certificateStatusLabels,
  certificateTemplateLabels,
} from "./certificates-labels";

const DEFAULT_PAGE_SIZE = 25;
const ALL = "ALL";
const OPEN_ERROR_MESSAGE = "ไม่สามารถเปิดเกียรติบัตรได้ กรุณาลองใหม่อีกครั้ง";

const statusFilters = [
  { label: "ทุกสถานะ", value: ALL },
  ...certificateStatusValues.map((status) => ({
    label: certificateStatusLabels[status],
    value: status,
  })),
];
const templateFilters = [
  { label: "ทุกแบบเกียรติบัตร", value: ALL },
  ...Object.entries(certificateTemplateLabels).map(([value, label]) => ({ label, value })),
];

async function signedUrl(id: string, disposition: "attachment" | "inline"): Promise<string> {
  const { url } = await client.certificates.downloadUrl({ disposition, id });
  return url;
}

// The blank window opens inside the click handler so pop-up blockers allow it.
async function viewCertificate(id: string): Promise<void> {
  const viewer = window.open("", "_blank");
  try {
    const url = await signedUrl(id, "inline");
    if (viewer) {
      viewer.opener = null;
      viewer.location.href = url;
    } else {
      window.location.assign(url);
    }
  } catch {
    viewer?.close();
    toast.error(OPEN_ERROR_MESSAGE);
  }
}

async function downloadCertificate(id: string): Promise<void> {
  try {
    window.location.assign(await signedUrl(id, "attachment"));
  } catch {
    toast.error(OPEN_ERROR_MESSAGE);
  }
}

function CertificateActions({ row }: { readonly row: CertificateOverviewRow }) {
  if (!row.certificate) {
    return <span className="text-muted-foreground">-</span>;
  }
  const { id } = row.certificate;
  return (
    <div className="flex gap-1">
      <Button
        aria-label={`ดูเกียรติบัตรของ ${row.fullName}`}
        size="icon-sm"
        type="button"
        variant="ghost"
        onClick={() => {
          void viewCertificate(id);
        }}
      >
        <Eye />
      </Button>
      <Button
        aria-label={`ดาวน์โหลดเกียรติบัตรของ ${row.fullName}`}
        size="icon-sm"
        type="button"
        variant="ghost"
        onClick={() => {
          void downloadCertificate(id);
        }}
      >
        <Download />
      </Button>
    </div>
  );
}

const columns: DataTableColumn<CertificateOverviewRow, object>[] = [
  {
    cell: ({ row }) => row.original.teamCode,
    header: "รหัสทีม",
    id: "teamCode",
    meta: { cellClassName: "font-medium whitespace-nowrap" },
    size: 110,
  },
  { cell: ({ row }) => row.original.teamName, header: "ทีม", id: "teamName", size: 200 },
  {
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span>{row.original.fullName}</span>
        <span className="text-xs text-muted-foreground">{row.original.fullNameEn}</span>
      </div>
    ),
    header: "ชื่อ",
    id: "name",
    size: 240,
  },
  {
    cell: ({ row }) =>
      row.original.role === "ADVISOR" ? "อาจารย์ที่ปรึกษา" : `สมาชิกคนที่ ${row.original.memberIndex}`,
    header: "บทบาท",
    id: "role",
    size: 150,
  },
  {
    cell: ({ row }) => certificateTemplateLabels[row.original.template],
    header: "แบบเกียรติบัตร",
    id: "template",
    size: 180,
  },
  {
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span
          className={cn(
            "w-fit rounded-md px-2 py-0.5 text-xs font-medium",
            certificateStatusClasses[row.original.status],
          )}
        >
          {certificateStatusLabels[row.original.status]}
        </span>
        {row.original.mismatchReasons.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {row.original.mismatchReasons
              .map((reason) => certificateMismatchLabels[reason])
              .join(", ")}
          </span>
        ) : null}
      </div>
    ),
    header: "สถานะ",
    id: "status",
    size: 170,
  },
  {
    cell: ({ row }) => <CertificateActions row={row.original} />,
    header: "ไฟล์",
    id: "actions",
    size: 100,
  },
];

function matchesSearch(row: CertificateOverviewRow, search: string): boolean {
  if (search.length === 0) {
    return true;
  }
  return [row.fullName, row.fullNameEn, row.teamName, row.teamCode].some((value) =>
    value.toLocaleLowerCase("th").includes(search),
  );
}

interface CertificatesTableProps {
  readonly isError: boolean;
  readonly isLoading: boolean;
  readonly overview: CertificateOverview | undefined;
}

function CertificatesTable({ isError, isLoading, overview }: CertificatesTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [template, setTemplate] = useState<string>(ALL);
  const [team, setTeam] = useState<string>(ALL);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const rows = useMemo(() => overview?.rows ?? [], [overview]);

  const teamFilters = useMemo(() => {
    const teams = new Map<string, string>();
    for (const row of rows) {
      teams.set(row.teamId, `${row.teamCode} ${row.teamName}`);
    }
    return [
      { label: "ทุกทีม", value: ALL },
      ...[...teams].map(([value, label]) => ({ label, value })),
    ];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("th");
    return rows.filter(
      (row) =>
        (status === ALL || row.status === status) &&
        (template === ALL || row.template === template) &&
        (team === ALL || row.teamId === team) &&
        matchesSearch(row, query),
    );
  }, [rows, search, status, team, template]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const pageRows = filteredRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const summary = overview?.summary;
  const summaryItems = [
    { label: "ผู้ที่ควรได้รับ", value: summary?.expected ?? 0 },
    { label: certificateStatusLabels.AVAILABLE, value: summary?.available ?? 0 },
    { label: certificateStatusLabels.MISSING, value: summary?.missing ?? 0 },
    { label: certificateStatusLabels.MISMATCHED, value: summary?.mismatched ?? 0 },
    { label: certificateStatusLabels.EXTRA, value: summary?.extra ?? 0 },
  ];

  function filterSelect(
    label: string,
    items: readonly { label: string; value: string }[],
    value: string,
    onChange: (value: string) => void,
  ) {
    return (
      <Select
        items={items}
        value={value}
        onValueChange={(next) => {
          if (typeof next === "string") {
            onChange(next);
            setPageIndex(0);
          }
        }}
      >
        <SelectTrigger aria-label={label} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    );
  }

  let statusMessage: string | undefined;
  if (isError) {
    statusMessage = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
  } else if (isLoading) {
    statusMessage = "กำลังโหลดรายชื่อผู้ได้รับเกียรติบัตร...";
  }

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {summaryItems.map((item) => (
          <div key={item.label} className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="text-lg font-medium">{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="sr-only" htmlFor="certificates-search">
            ค้นหาผู้ได้รับเกียรติบัตร
          </label>
          <Input
            id="certificates-search"
            placeholder="ค้นหาชื่อ ทีม หรือรหัสทีม"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPageIndex(0);
            }}
          />
        </div>
        {filterSelect("กรองตามสถานะ", statusFilters, status, setStatus)}
        {filterSelect("กรองตามแบบเกียรติบัตร", templateFilters, template, setTemplate)}
        {filterSelect("กรองตามทีม", teamFilters, team, setTeam)}
      </div>

      <DataTable
        columns={columns}
        data={pageRows}
        getRowId={(row) => row.id}
        isError={isError}
        emptyMessage="ไม่พบผู้ได้รับเกียรติบัตร"
        statusMessage={statusMessage}
      />

      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">แสดง {filteredRows.length} รายการ</p>
        <DataTablePagination
          pageIndex={currentPage}
          pageCount={pageCount}
          pageSize={pageSize}
          onPageChange={setPageIndex}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPageIndex(0);
          }}
        />
      </div>
    </div>
  );
}

export { CertificatesTable };
