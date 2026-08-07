import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_site")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
