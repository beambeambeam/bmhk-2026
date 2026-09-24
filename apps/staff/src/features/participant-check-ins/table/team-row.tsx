import { Button } from "@/components/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/collapsible";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { DataTableSortHeader } from "@/components/table/sort-header";
import { cn } from "@/lib/utils";
import type {
  CheckInRound,
  ParticipantCheckInFlag,
  ParticipantCheckInListResult,
  ParticipantCheckInSort,
} from "@bmhk-2026/api";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";

import { formatCheckInDate } from "../../staff-check-ins/staff-check-in-utils";
import { ParticipantCheckInCancel } from "../participant-check-in-cancel";

const noFlagValue = "none";
export const participantCheckInFlagValues = ["feeling_unwell", "bad_behavior"] as const;
const flagLabels: Record<ParticipantCheckInFlag, string> = {
  bad_behavior: "พฤติกรรมไม่เหมาะสม",
  feeling_unwell: "ไม่สบาย",
};
const flagOptions = [
  { label: "ไม่มี", value: noFlagValue },
  ...Object.entries(flagLabels).map(([value, label]) => ({ label, value })),
];

type Team = ParticipantCheckInListResult["rows"][number];
type Participant = Team["members"][number];

export interface ParticipantCheckInTableMeta {
  readonly sortBy: ParticipantCheckInSort["id"];
  readonly sortDesc: boolean;
  readonly onSort: (id: ParticipantCheckInSort["id"]) => void;
  readonly checkingInId: string | undefined;
  readonly updatingFlagId: string | undefined;
  readonly updatingTeamAwardId: string | undefined;
  readonly isSettingTeamAward: boolean;
  readonly round: CheckInRound;
  readonly onCheckIn: (id: string, name: string) => Promise<void>;
  readonly onUpdateFlag: (id: string, value: string | null) => Promise<void>;
  readonly onRegisterTeam: (id: string, name: string) => Promise<void>;
}

interface SortableTableHeadProps {
  readonly id: ParticipantCheckInSort["id"];
  readonly label: string;
  readonly meta: ParticipantCheckInTableMeta;
}

export function SortableTableHead({ id, label, meta }: SortableTableHeadProps) {
  let direction: "ascending" | "descending" | "none" = "none";
  let sortDirection: false | "asc" | "desc" = false;
  if (meta.sortBy === id) {
    direction = meta.sortDesc ? "descending" : "ascending";
    sortDirection = meta.sortDesc ? "desc" : "asc";
  }

  return (
    <TableHead aria-sort={direction} className="whitespace-normal">
      <DataTableSortHeader
        label={label}
        direction={sortDirection}
        onClick={() => {
          meta.onSort(id);
        }}
      />
    </TableHead>
  );
}

function ParticipantCheckInMembersTable({
  members,
  meta,
}: {
  readonly members: readonly Participant[];
  readonly meta: ParticipantCheckInTableMeta;
}) {
  return (
    <Table className="min-w-[74rem] table-fixed">
      <colgroup>
        <col className="w-48" />
        <col className="w-56" />
        <col className="w-72" />
        <col className="w-48" />
        <col />
      </colgroup>
      <TableHeader>
        <TableRow>
          <SortableTableHead id="name" label="ชื่อ" meta={meta} />
          <SortableTableHead id="email" label="อีเมล" meta={meta} />
          <SortableTableHead id="checkedInAt" label="สถานะการเข้างาน" meta={meta} />
          <SortableTableHead id="flag" label="หมายเหตุ" meta={meta} />
          <TableHead className="whitespace-normal text-right">การดำเนินการ</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((participant) => {
          const isUpdatingFlag = meta.updatingFlagId === participant.id;
          const isCheckingIn = meta.checkingInId === participant.id;

          return (
            <TableRow key={participant.id}>
              <TableCell className="font-medium whitespace-normal wrap-anywhere">
                {participant.name}
              </TableCell>
              <TableCell className="whitespace-normal wrap-anywhere">{participant.email}</TableCell>
              <TableCell className="whitespace-normal wrap-anywhere">
                {participant.checkIn ? (
                  <span className="flex flex-col gap-0.5">
                    <span>{formatCheckInDate(participant.checkIn.checkedInAt)}</span>
                    <span className="text-muted-foreground text-xs">
                      ยืนยันโดย {participant.checkIn.checkedInByName}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">ยังไม่เข้างาน</span>
                )}
              </TableCell>
              <TableCell className="whitespace-normal wrap-anywhere">
                {participant.checkIn ? (
                  <Select
                    disabled={isUpdatingFlag}
                    items={flagOptions}
                    value={participant.checkIn.flag ?? noFlagValue}
                    onValueChange={(value) => void meta.onUpdateFlag(participant.id, value)}
                  >
                    <SelectTrigger
                      aria-label={`หมายเหตุสำหรับ ${participant.name}`}
                      className="min-w-36"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {flagOptions.map(({ label, value }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="whitespace-normal wrap-anywhere">
                <div className="flex flex-wrap justify-end gap-2">
                  {participant.checkIn ? (
                    <>
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Check aria-hidden="true" className="size-4 text-emerald-600" />
                        เข้างานแล้ว
                      </span>
                      <ParticipantCheckInCancel
                        participantId={participant.id}
                        participantName={participant.name}
                        round={meta.round}
                      />
                    </>
                  ) : (
                    <Button
                      disabled={isCheckingIn}
                      size="sm"
                      type="button"
                      onClick={() => void meta.onCheckIn(participant.id, participant.name)}
                    >
                      {isCheckingIn ? (
                        <Loader2 aria-hidden="true" className="animate-spin" />
                      ) : null}
                      ลงทะเบียนเข้างาน
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function ParticipantCheckInTeamRow({
  team,
  meta,
}: {
  readonly team: Team;
  readonly meta: ParticipantCheckInTableMeta;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isRegistrationComplete = team.award === "REGISTRATION_COMPLETE";
  const canRegisterTeam = isRegistrationComplete && meta.round === "ROUND_1";
  const isRegisteringTeam = meta.updatingTeamAwardId === team.id;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} render={<TableBody />}>
      <CollapsibleTrigger
        nativeButton={false}
        render={
          <TableRow
            aria-label={`${isOpen ? "ซ่อน" : "แสดง"}สมาชิกทีม ${team.name}`}
            className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          />
        }
      >
        <TableCell className="font-medium">{formatTeamCode(team.index)}</TableCell>
        <TableCell className="whitespace-normal wrap-anywhere">{team.name}</TableCell>
        <TableCell className="font-medium">
          <span className="inline-flex items-center gap-2">
            <span>{team.members.length} คน</span>
            <ChevronDown
              aria-hidden="true"
              className={cn("transition-transform", isOpen && "rotate-180")}
            />
          </span>
        </TableCell>
      </CollapsibleTrigger>
      <CollapsibleContent render={<TableRow />}>
        <TableCell className="p-3 sm:p-4" colSpan={3}>
          <div className="rounded-lg border bg-muted/30 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <p className="text-sm font-medium text-muted-foreground">สมาชิกทีม {team.name}</p>
              {canRegisterTeam ? (
                <Button
                  disabled={meta.isSettingTeamAward}
                  size="sm"
                  type="button"
                  onClick={() => void meta.onRegisterTeam(team.id, team.name)}
                >
                  {isRegisteringTeam ? (
                    <Loader2 aria-hidden="true" className="animate-spin" data-icon="inline-start" />
                  ) : null}
                  ลงทะเบียนทีมเข้าร่วมงาน
                </Button>
              ) : null}
            </div>
            <fieldset
              aria-disabled={isRegistrationComplete}
              className={cn(
                "min-w-0 border-0 p-0",
                isRegistrationComplete && "pointer-events-none opacity-50",
              )}
              disabled={isRegistrationComplete}
            >
              <ParticipantCheckInMembersTable members={team.members} meta={meta} />
            </fieldset>
          </div>
        </TableCell>
      </CollapsibleContent>
    </Collapsible>
  );
}

function formatTeamCode(index: number): string {
  return `BH${String(index).padStart(3, "0")}/26`;
}
