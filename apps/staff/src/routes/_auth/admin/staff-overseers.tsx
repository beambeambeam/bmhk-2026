import { StaffOverseersAdminPage } from "@/features/admin/staff-overseers";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/admin/staff-overseers")({
  component: StaffOverseersAdminPage,
});
