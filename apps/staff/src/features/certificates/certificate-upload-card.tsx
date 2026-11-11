import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/field";
import { Input } from "@/components/input";
import { RadioGroup, RadioGroupItem } from "@/components/radio-group";
import type { CertificateSet, CertificateUploadMode } from "@bmhk-2026/api";
import { client, orpc } from "@bmhk-2026/client/orpc";
import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { uploadCertificateZip } from "./certificate-zip";
import type { CertificateUploadProgress } from "./certificate-zip";

const dateFormat = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" });
const BYTES_PER_MEGABYTE = 1024 * 1024;

const uploadModeOptions = [
  {
    description: "zip มีเฉพาะผู้ได้รับที่ต้องการแก้ไขหรือเพิ่ม เกียรติบัตรของคนอื่นในชุดเดิมยังอยู่ครบ",
    title: "อัปเดตบางรายการ",
    value: "MERGE",
  },
  {
    description: "zip ต้องมีเกียรติบัตรของทุกคน ไฟล์ในชุดเดิมที่ไม่อยู่ใน zip จะถูกลบ",
    title: "แทนที่ทั้งชุด",
    value: "REPLACE",
  },
] as const satisfies readonly {
  description: string;
  title: string;
  value: CertificateUploadMode;
}[];

function isUploadMode(value: unknown): value is CertificateUploadMode {
  return uploadModeOptions.some((option) => option.value === value);
}

function getUploadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return "อัปโหลดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

function getUploadSuccessMessage(uploaded: CertificateSet): string {
  if (uploaded.mode === "MERGE") {
    return `อัปเดตเกียรติบัตร ${uploaded.uploadedCount} ไฟล์แล้ว (รวม ${uploaded.certificateCount} ไฟล์)`;
  }
  return `อัปโหลดเกียรติบัตร ${uploaded.certificateCount} ไฟล์แล้ว`;
}

function getSubmitLabel(set: CertificateSet | null, mode: CertificateUploadMode): string {
  if (!set) {
    return "อัปโหลด";
  }
  return mode === "MERGE" ? "อัปเดตบางรายการ" : "อัปโหลดชุดใหม่";
}

function formatMegabytes(bytes: number): string {
  return `${(bytes / BYTES_PER_MEGABYTE).toFixed(1)} MB`;
}

interface CertificateSetDetailsProps {
  readonly set: CertificateSet;
}

function CertificateSetDetails({ set }: CertificateSetDetailsProps) {
  const isPartial = set.mode === "MERGE";
  return (
    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <dt className="text-muted-foreground">{isPartial ? "ไฟล์ที่อัปเดตล่าสุด" : "ไฟล์ต้นทาง"}</dt>
        <dd className="font-medium break-all">
          <span>{set.sourceName}</span>{" "}
          <span className="font-normal text-muted-foreground">
            ({formatMegabytes(set.sourceSizeBytes)})
          </span>
        </dd>
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
          {set.certificateCount} ไฟล์
          {isPartial ? ` (อัปเดต ${set.uploadedCount} ไฟล์)` : null}
        </dd>
      </div>
    </dl>
  );
}

interface CertificateUploadCardProps {
  readonly set: CertificateSet | null;
}

function CertificateUploadCard({ set }: CertificateUploadCardProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [selectedMode, setSelectedMode] = useState<CertificateUploadMode>("MERGE");
  const [progress, setProgress] = useState<CertificateUploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isUploading = progress !== null;
  // A partial update needs an active set to update.
  const mode: CertificateUploadMode = set ? selectedMode : "REPLACE";

  async function upload(selected: File, form: HTMLFormElement): Promise<void> {
    setError(null);
    setProgress({ stored: 0, total: 0 });
    try {
      const uploaded = await uploadCertificateZip({
        client: client.certificates,
        file: selected,
        mode,
        onProgress: setProgress,
      });
      toast.success(getUploadSuccessMessage(uploaded));
      setFile(null);
      // Clear the file input so it does not show the uploaded zip.
      form.reset();
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
          อัปโหลด certificates.zip จากตัวสร้างเกียรติบัตร ไฟล์ชุดใหม่จะใช้งานได้เมื่ออัปโหลดครบทุกไฟล์แล้วเท่านั้น
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {set ? (
          <CertificateSetDetails set={set} />
        ) : (
          <p className="text-sm text-muted-foreground">ยังไม่มีไฟล์เกียรติบัตรที่อัปโหลด</p>
        )}
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (file) {
              void upload(file, event.currentTarget);
            }
          }}
        >
          {set ? (
            <FieldSet>
              <FieldLegend variant="label">วิธีอัปโหลด</FieldLegend>
              <RadioGroup
                className="grid-cols-1 sm:grid-cols-2"
                disabled={isUploading}
                value={selectedMode}
                onValueChange={(value) => {
                  if (isUploadMode(value)) {
                    setSelectedMode(value);
                  }
                }}
              >
                {uploadModeOptions.map((option) => {
                  const id = `certificate-mode-${option.value}`;
                  return (
                    <FieldLabel key={option.value} htmlFor={id}>
                      <Field orientation="horizontal">
                        {/* The card label wraps the radio, so name it from the title alone. */}
                        <RadioGroupItem
                          aria-describedby={`${id}-description`}
                          aria-labelledby={`${id}-title`}
                          id={id}
                          value={option.value}
                        />
                        <FieldContent>
                          <FieldTitle id={`${id}-title`}>{option.title}</FieldTitle>
                          <FieldDescription id={`${id}-description`}>
                            {option.description}
                          </FieldDescription>
                        </FieldContent>
                      </Field>
                    </FieldLabel>
                  );
                })}
              </RadioGroup>
            </FieldSet>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
              {getSubmitLabel(set, mode)}
            </Button>
          </div>
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
