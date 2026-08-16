import { Button } from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog";
import { getStaffRegistrationQueryOptions } from "@bmhk-2026/client/query-options";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { DetailFields } from "./detail-fields";

interface StaffReviewDialogProps {
  readonly staffId: string;
}

function StaffReviewDialog({ staffId }: StaffReviewDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const query = useQuery({ ...getStaffRegistrationQueryOptions(staffId), enabled: isOpen });
  const staff = query.data;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>View</DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Staff registration</DialogTitle>
          <DialogDescription>
            Review this staff member&apos;s account information.
          </DialogDescription>
        </DialogHeader>
        {query.isLoading ? <p>Loading staff...</p> : null}
        {query.isError ? (
          <p className="text-destructive">Unable to load this staff registration.</p>
        ) : null}
        {staff ? (
          <DetailFields
            title={staff.name || "Staff profile"}
            fields={[
              { label: "Name", value: staff.name },
              { label: "Email", value: staff.email },
              { label: "Role", value: staff.role },
              {
                label: "Profile image",
                value: staff.image === null ? "Not provided" : "Available",
              },
            ]}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export { StaffReviewDialog };
