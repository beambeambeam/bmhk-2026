import { ApiKeyTable } from "@/features/admin/api-keys/api-key-table";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/admin/api-keys")({
  component: ApiKeysPage,
});

function ApiKeysPage() {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-base leading-snug font-medium">คีย์ API</h1>
        <p className="text-sm text-muted-foreground">
          จัดการคีย์ API สำหรับการเข้าถึงบริการของ BMHK ด้วยโปรแกรม
        </p>
      </div>
      <ApiKeyTable />
    </section>
  );
}
