import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { ApiKeyTable } from "@/features/admin/api-keys/api-key-table";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/admin/api-keys")({
  component: ApiKeysPage,
});

function ApiKeysPage() {
  return (
    <section className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            API Key management for programmatical access to BMHK services.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <Card>
            <CardContent className="px-4">
              <ApiKeyTable />
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </section>
  );
}
