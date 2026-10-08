import { Round2ConfirmationsTable } from "./round2-confirmations-table";

interface Round2ConfirmationsPageProps {
  readonly actorId: string | undefined;
}

function Round2ConfirmationsPage({ actorId }: Round2ConfirmationsPageProps) {
  return (
    <section className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-base leading-snug font-medium">ยืนยันสิทธิ์เข้าแข่งขัน รอบที่ 2</h1>
        <p className="text-sm text-muted-foreground">
          ตรวจสอบสถานะการยืนยันและเอกสารของทีมที่ได้สิทธิ์เข้าแข่งขันรอบที่ 2
        </p>
      </div>
      <Round2ConfirmationsTable actorId={actorId} />
    </section>
  );
}

export { Round2ConfirmationsPage };
