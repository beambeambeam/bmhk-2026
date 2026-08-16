import { Input } from "@/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { Card, CardContent } from "@/components/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import type { TeamRegistrationReviewListFilter } from "@bmhk-2026/api";
import { getTeamRegistrationReviewListQueryOptions } from "@bmhk-2026/client/query-options";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { ParticipationReviewDialog, StatusChip } from "./participation-review-dialog";

const SEARCH_DEBOUNCE_MS = 300;
const reviewFilters = [
  { label: "All reviews", value: "ALL" },
  { label: "Pending review", value: "PENDING_REVIEW" },
  { label: "Changes requested", value: "CHANGES_REQUESTED" },
  { label: "Approved", value: "APPROVED" },
] as const satisfies readonly { label: string; value: TeamRegistrationReviewListFilter }[];

interface ParticipationTableProps {
  readonly canReview: boolean;
}

function ParticipationTable({ canReview }: ParticipationTableProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reviewStatus, setReviewStatus] = useState<TeamRegistrationReviewListFilter>("ALL");
  const query = useQuery(
    getTeamRegistrationReviewListQueryOptions({ reviewStatus, search: debouncedSearch }),
  );
  const teams = query.data?.rows ?? [];

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <div>
            <label className="sr-only" htmlFor="participation-search">
              Search participations
            </label>
            <Input
              id="participation-search"
              placeholder="Search team or school"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
            />
          </div>
          <Select
            value={reviewStatus}
            onValueChange={(value) => {
              if (value !== null && reviewFilters.some((filter) => filter.value === value)) {
                setReviewStatus(value);
              }
            }}
          >
            <SelectTrigger aria-label="Review status" className="w-full">
              <SelectValue>
                {reviewFilters.find((filter) => filter.value === reviewStatus)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {reviewFilters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Submission</TableHead>
              <TableHead>Participant 1</TableHead>
              <TableHead>Participant 2</TableHead>
              <TableHead>Participant 3</TableHead>
              <TableHead>Advisor</TableHead>
              <TableHead className="w-28">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={8}>Loading participations...</TableCell>
              </TableRow>
            ) : null}
            {query.isError ? (
              <TableRow>
                <TableCell className="text-destructive" colSpan={8}>
                  Unable to load participations.
                </TableCell>
              </TableRow>
            ) : null}
            {!query.isLoading && !query.isError && teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>No participations found.</TableCell>
              </TableRow>
            ) : null}
            {teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell className="font-medium">{team.name}</TableCell>
                <TableCell>{team.school}</TableCell>
                <TableCell>
                  <StatusChip value={team.registrationSubmittedAt ? "SUBMITTED" : "DRAFT"} />
                </TableCell>
                <TableCell>
                  <StatusChip value={team.participant1} />
                </TableCell>
                <TableCell>
                  <StatusChip value={team.participant2} />
                </TableCell>
                <TableCell>
                  <StatusChip value={team.participant3} />
                </TableCell>
                <TableCell>
                  <StatusChip value={team.advisor} />
                </TableCell>
                <TableCell>
                  <ParticipationReviewDialog canReview={canReview} teamId={team.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export { ParticipationTable };
