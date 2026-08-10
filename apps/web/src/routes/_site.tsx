import Navbar from "@/components/navbar/navbar";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import Footer from "@/components/footer";

export const Route = createFileRoute("/_site")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="font-thai relative">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
