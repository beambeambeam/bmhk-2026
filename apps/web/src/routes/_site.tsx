import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_site")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="font-thai relative">
      <main>
        <Outlet />
      </main>
    </div>
  );
}
