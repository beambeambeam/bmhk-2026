import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/wait-access")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <section className="space-y-3">
      <h1 className="font-semibold text-2xl">แดชบอร์ด</h1>
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <p className="font-medium">กำลังรอสิทธิ์ทีมงาน</p>
        <p className="mt-1 text-muted-foreground text-sm">
          คุณเข้าสู่ระบบแล้ว แต่ผู้ดูแลระบบต้องกำหนดบทบาททีมงานให้คุณก่อน จึงจะใช้เครื่องมือทีมงานได้
        </p>
      </div>
    </section>
  );
}
