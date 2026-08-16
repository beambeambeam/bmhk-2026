import { Button } from "@/components/button";
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
import type {
  TeamRegistrationReviewListFilter,
  TeamRegistrationReviewListSubjectStatus,
} from "@bmhk-2026/api";
import { getTeamRegistrationReviewListQueryOptions } from "@bmhk-2026/client/query-options";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { ParticipationReviewDialog, StatusChip } from "./participation-review-dialog";

const SEARCH_DEBOUNCE_MS = 300;
const PARTICIPATIONS_PAGE_SIZE = 20;
const reviewFilters = [
  { label: "All reviews", value: "ALL" },
  { label: "Pending review", value: "PENDING_REVIEW" },
  { label: "Changes requested", value: "CHANGES_REQUESTED" },
  { label: "Approved", value: "APPROVED" },
] as const satisfies readonly { label: string; value: TeamRegistrationReviewListFilter }[];

interface ParticipationTableProps {
  readonly canReview: boolean;
}

interface IndividualReviewStatusProps {
  readonly label: string;
  readonly status: TeamRegistrationReviewListSubjectStatus;
}

function IndividualReviewStatus({ label, status }: IndividualReviewStatusProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <StatusChip value={status} />
    </div>
  );
}

function ParticipationTable({ canReview }: ParticipationTableProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [reviewStatus, setReviewStatus] = useState<TeamRegistrationReviewListFilter>("ALL");
  const query = useQuery(
    getTeamRegistrationReviewListQueryOptions({
      limit: PARTICIPATIONS_PAGE_SIZE,
      offset,
      reviewStatus,
      search: debouncedSearch,
    }),
  );
  const teams = query.data?.rows ?? [];
  const pagination = query.data?.pagination;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setOffset(0);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  const firstVisibleParticipation =
    pagination !== undefined && pagination.total > 0 ? pagination.offset + 1 : 0;
  const lastVisibleParticipation = pagination
    ? Math.min(pagination.offset + teams.length, pagination.total)
    : 0;

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
              placeholder="Search team, school, participant, or advisor"
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
                setOffset(0);
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
        <div className="[&_[data-slot=table-container]]:overflow-x-visible">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[26%] whitespace-normal">Team</TableHead>
                <TableHead className="w-[14%] whitespace-normal">Submission</TableHead>
                <TableHead className="w-[17%] whitespace-normal">Review</TableHead>
                <TableHead className="w-[30%] whitespace-normal">Individual reviews</TableHead>
                <TableHead className="w-[13%] whitespace-normal">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>Loading participations...</TableCell>
                </TableRow>
              ) : null}
              {query.isError ? (
                <TableRow>
                  <TableCell className="text-destructive" colSpan={5}>
                    Unable to load participations.
                  </TableCell>
                </TableRow>
              ) : null}
              {!query.isLoading && !query.isError && teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>No participations found.</TableCell>
                </TableRow>
              ) : null}
              {teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="whitespace-normal">
                    <p className="font-medium">{team.name}</p>
                    <p className="text-muted-foreground text-xs">{team.school}</p>
                  </TableCell>
                  <TableCell>
                    <StatusChip value={team.registrationSubmittedAt ? "SUBMITTED" : "DRAFT"} />
                  </TableCell>
                  <TableCell>
                    <StatusChip value={team.reviewStatus} />
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                      <IndividualReviewStatus label="Participant 1" status={team.participant1} />
                      <IndividualReviewStatus label="Participant 2" status={team.participant2} />
                      <IndividualReviewStatus label="Participant 3" status={team.participant3} />
                      <IndividualReviewStatus label="Advisor" status={team.advisor} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <ParticipationReviewDialog canReview={canReview} teamId={team.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {pagination ? (
          <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">
              Showing {firstVisibleParticipation}-{lastVisibleParticipation} of {pagination.total}{" "}
              participations
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                disabled={pagination.offset === 0 || query.isFetching}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => {
                  setOffset(Math.max(0, pagination.offset - PARTICIPATIONS_PAGE_SIZE));
                }}
              >
                <ChevronLeft aria-hidden="true" data-icon="inline-start" />
                Previous
              </Button>
              <Button
                disabled={pagination.nextOffset === null || query.isFetching}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => {
                  if (pagination.nextOffset !== null) {
                    setOffset(pagination.nextOffset);
                  }
                }}
              >
                Next
                <ChevronRight aria-hidden="true" data-icon="inline-end" />
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { ParticipationTable };
