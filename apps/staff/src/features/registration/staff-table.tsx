import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { getStaffRegistrationListQueryOptions } from "@bmhk-2026/client/query-options";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

function StaffTable() {
  const query = useQuery(getStaffRegistrationListQueryOptions());
  const staff = query.data ?? [];

  return (
    <Card>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-28">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={3}>Loading staff...</TableCell>
              </TableRow>
            ) : null}
            {query.isError ? (
              <TableRow>
                <TableCell className="text-destructive" colSpan={3}>
                  Unable to load staff registrations.
                </TableCell>
              </TableRow>
            ) : null}
            {!query.isLoading && !query.isError && staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>No staff registrations found.</TableCell>
              </TableRow>
            ) : null}
            {staff.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.name || "Unnamed staff"}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  <Button
                    render={<Link to="/staff/$staffId" params={{ staffId: member.id }} />}
                    size="sm"
                    variant="outline"
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export { StaffTable };
