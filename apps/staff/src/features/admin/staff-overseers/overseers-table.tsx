import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import type { StaffOverseer } from "@bmhk-2026/api";

interface StaffOverseersTableProps {
  readonly overseers: readonly StaffOverseer[];
}

function StaffOverseersTable({ overseers }: StaffOverseersTableProps) {
  if (overseers.length === 0) {
    return <p className="text-muted-foreground text-sm">No overseers assigned yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Group</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {overseers.map((overseer) => (
          <TableRow key={overseer.userId}>
            <TableCell>{overseer.userName}</TableCell>
            <TableCell>{overseer.email}</TableCell>
            <TableCell>{`[${overseer.groupIndex}] ${overseer.groupName}`}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export { StaffOverseersTable };
