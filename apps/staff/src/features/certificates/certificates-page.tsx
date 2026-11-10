import { orpc } from "@bmhk-2026/client/orpc";
import { useQuery } from "@tanstack/react-query";

import { CertificateUploadCard } from "./certificate-upload-card";
import { CertificatesTable } from "./certificates-table";

function CertificatesPage() {
  const overviewQuery = useQuery(orpc.certificates.overview.queryOptions());

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-base leading-snug font-medium">เกียรติบัตร</h1>
        <p className="text-sm text-muted-foreground">
          อัปโหลดไฟล์เกียรติบัตรและตรวจสอบว่าผู้ได้รับทุกคนมีไฟล์ที่ตรงกับข้อมูลล่าสุด
        </p>
      </div>
      <CertificateUploadCard set={overviewQuery.data?.set ?? null} />
      <CertificatesTable
        isError={overviewQuery.isError}
        isLoading={overviewQuery.isLoading}
        overview={overviewQuery.data}
      />
    </section>
  );
}

export { CertificatesPage };
