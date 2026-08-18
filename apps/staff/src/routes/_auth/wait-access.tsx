import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/wait-access")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <section className="space-y-3">
      <h1 className="font-semibold text-2xl">Dashboard</h1>
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <p className="font-medium">Waiting for staff access</p>
        <p className="mt-1 text-muted-foreground text-sm">
          You are signed in, but an admin needs to assign you a staff role before you can use staff
          tools.
        </p>
      </div>
    </section>
  );
}
