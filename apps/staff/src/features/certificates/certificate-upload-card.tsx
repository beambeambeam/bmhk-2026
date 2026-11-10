import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { Input } from "@/components/input";
import type { CertificateSet } from "@bmhk-2026/api";
import { client, orpc } from "@bmhk-2026/client/orpc";
import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { uploadCertificateZip } from "./certificate-zip";
import type { CertificateUploadProgress } from "./certificate-zip";

const dateFormat = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" });
const BYTES_PER_MEGABYTE = 1024 * 1024;

function getUploadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return "อัปโหลดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

interface CertificateUploadCardProps {
  readonly set: CertificateSet | null;
}

function CertificateUploadCard({ set }: CertificateUploadCardProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<CertificateUploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isUploading = progress !== null;

  async function upload(selected: File): Promise<void> {
    setError(null);
    setProgress({ stored: 0, total: 0 });
    try {
      const uploaded = await uploadCertificateZip({
        client: client.certificates,
        file: selected,
        onProgress: setProgress,
      });
      toast.success(`อัปโหลดเกียรติบัตร ${uploaded.certificateCount} ไฟล์แล้ว`);
      setFile(null);
    } catch (uploadError) {
      setError(getUploadErrorMessage(uploadError));
    } finally {
      setProgress(null);
      await queryClient.invalidateQueries({ queryKey: orpc.certificates.overview.key() });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ไฟล์เกียรติบัตร</CardTitle>
        <CardDescription>
          อัปโหลด certificates.zip จากตัวสร้างเกียรติบัตร
          การอัปโหลดใหม่จะแทนที่ไฟล์ชุดเดิมทั้งหมดเมื่ออัปโหลดครบทุกไฟล์แล้วเท่านั้น
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {set ? (
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">ไฟล์ต้นทาง</dt>
              <dd className="font-medium break-all">{set.sourceName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">อัปโหลดเมื่อ</dt>
              <dd className="font-medium">{dateFormat.format(set.uploadedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">อัปโหลดโดย</dt>
              <dd className="font-medium">{set.uploadedBy?.name ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">จำนวนไฟล์</dt>
              <dd className="font-medium">
                {set.certificateCount} ไฟล์ ({(set.sourceSizeBytes / BYTES_PER_MEGABYTE).toFixed(1)}{" "}
                MB)
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">ยังไม่มีไฟล์เกียรติบัตรที่อัปโหลด</p>
        )}
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            if (file) {
              void upload(file);
            }
          }}
        >
          <label className="sr-only" htmlFor="certificate-zip">
            เลือกไฟล์ zip เกียรติบัตร
          </label>
          <Input
            id="certificate-zip"
            accept=".zip,application/zip"
            className="sm:max-w-sm"
            disabled={isUploading}
            type="file"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError(null);
            }}
          />
          <Button type="submit" disabled={file === null || isUploading}>
            <Upload data-icon="inline-start" />
            {set ? "อัปโหลดชุดใหม่" : "อัปโหลด"}
          </Button>
        </form>
        {progress ? (
          <output className="block text-sm text-muted-foreground">
            {progress.total === 0
              ? "กำลังตรวจสอบไฟล์ zip..."
              : `กำลังอัปโหลด ${progress.stored}/${progress.total} ไฟล์...`}
          </output>
        ) : null}
        {error === null ? null : (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export { CertificateUploadCard };
