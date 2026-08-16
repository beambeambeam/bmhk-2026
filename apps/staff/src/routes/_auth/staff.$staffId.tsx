import { Button } from "@/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { getStaffRegistrationQueryOptions } from "@bmhk-2026/client/query-options";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { DetailFields } from "@/features/registration/detail-fields";

export const Route = createFileRoute("/_auth/staff/$staffId")({ component: StaffDetailPage });

function StaffDetailPage() {
  const { staffId } = Route.useParams();
  const query = useQuery(getStaffRegistrationQueryOptions(staffId));
  const staff = query.data;

  return <section className="flex flex-col gap-5"><Button className="self-start" render={<Link to="/staff" />} variant="outline">Back to staff</Button><Card><CardHeader><CardTitle>Staff registration details</CardTitle></CardHeader><CardContent>{query.isLoading ? "Loading staff..." : query.isError ? <span className="text-destructive">Unable to load this staff registration.</span> : staff ? <DetailFields title={staff.name || "Staff profile"} fields={[{ label: "Name", value: staff.name }, { label: "Email", value: staff.email }, { label: "Role", value: staff.role }, { label: "Profile image", value: staff.image ? "Available" : "Not provided" }]} /> : null}</CardContent></Card></section>;
}
