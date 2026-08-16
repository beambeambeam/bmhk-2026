import { Button } from "@/components/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { Textarea } from "@/components/textarea";
import type { TeamDetails, TeamRegistrationReview } from "@bmhk-2026/api";
import { ImageOff, Quote, UsersRound, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StatusChip } from "./participation-review-status";

const ADVISOR_ISSUE_OPTIONS = ["ข้อมูลไม่ตรง", "บัตรประชาชนมีปัญหา", "บัตรอาจารย์มีปัญหา"] as const;
const MEMBER_ISSUE_OPTIONS = ["ข้อมูลไม่ตรง", "บัตรประชาชนมีปัญหา", "ปพ.7 มีปัญหา", "รูปมีปัญหา"] as const;

type ReviewStatus = "APPROVED" | "CHANGES_REQUESTED";

interface IssueCodeFieldProps {
  readonly canReview: boolean;
  readonly id: string;
  readonly label: string;
  readonly options: readonly string[];
  readonly value: readonly string[];
  readonly onChange: (value: string[]) => void;
}

interface ParticipationReviewContentProps {
  readonly canReview: boolean;
  readonly isLoading: boolean;
  readonly review: TeamRegistrationReview | null | undefined;
  readonly savePending: boolean;
  readonly team: TeamDetails | undefined;
  readonly teamError: boolean;
  readonly teamId: string;
  readonly onSave: (
    data: {
      advisorIssueCodes: string[];
      internalNotes: string | null;
      participant1IssueCodes: string[];
      participant2IssueCodes: string[];
      participant3IssueCodes: string[];
    },
    status: ReviewStatus,
  ) => void;
}

interface TeamSummaryProps {
  readonly imageUrl: string | null;
  readonly review: TeamRegistrationReview | null | undefined;
  readonly team: TeamDetails;
}

function IssueCodeField({ canReview, id, label, options, value, onChange }: IssueCodeFieldProps) {
  function addIssueCode(issueCode: string | null): void {
    if (issueCode === null || value.includes(issueCode)) {
      return;
    }

    onChange([...value, issueCode]);
  }

  function removeIssueCode(issueCode: string): void {
    onChange(value.filter((selectedCode) => selectedCode !== issueCode));
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="font-medium text-sm" htmlFor={id}>
        {label}
      </label>
      <Select disabled={!canReview} onValueChange={addIssueCode}>
        <SelectTrigger aria-label={`เลือกปัญหาของ${label}`} className="w-full" id={id}>
          <SelectValue>เลือกปัญหา</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((issueCode) => (
            <SelectItem disabled={value.includes(issueCode)} key={issueCode} value={issueCode}>
              {issueCode}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label={`ปัญหาที่เลือกของ${label}`}>
          {value.map((issueCode) => (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-destructive/10 py-1 pr-1 pl-2 text-destructive text-xs"
              key={issueCode}
            >
              {issueCode}
              {canReview ? (
                <Button
                  aria-label={`ลบ ${issueCode}`}
                  className="size-5 rounded-full p-0"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    removeIssueCode(issueCode);
                  }}
                >
                  <X aria-hidden="true" className="size-3" />
                </Button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TeamSummary({ imageUrl, review, team }: TeamSummaryProps) {
  return (
    <aside className="flex flex-col gap-5 rounded-xl border bg-muted/30 p-5">
      <div className="flex flex-wrap gap-2" aria-label="หมวดข้อมูลสำหรับตรวจสอบ">
        <Button size="sm" variant="secondary">
          ทีม
        </Button>
        <Button size="sm" variant="outline">
          อาจารย์
        </Button>
        <Button size="sm" variant="outline">
          สมาชิก 1
        </Button>
        <Button size="sm" variant="outline">
          สมาชิก 2
        </Button>
        <Button size="sm" variant="outline">
          สมาชิก 3
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border bg-background">
        {imageUrl === null ? (
          <div className="flex aspect-video items-center justify-center text-muted-foreground">
            <ImageOff aria-hidden="true" className="size-8" />
            <span className="sr-only">ไม่มีรูปทีม</span>
          </div>
        ) : (
          <img
            alt={`รูปทีม ${team.name}`}
            className="aspect-video w-full object-cover"
            src={imageUrl}
          />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold text-xl">{team.name}</h2>
        <p className="text-muted-foreground">{team.school}</p>
        <p className="flex items-start gap-2 text-muted-foreground text-sm">
          <Quote aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          ข้อมูลทีมสำหรับการตรวจสอบการสมัครแข่งขัน
        </p>
        <p className="flex items-center gap-2 font-medium text-sm">
          <UsersRound aria-hidden="true" className="size-4" />
          สมาชิก {team.memberCount} คน
        </p>
      </div>
      <div className="flex items-center justify-between rounded-lg border bg-background p-3">
        <span className="text-muted-foreground text-sm">สถานะการยืนยัน</span>
        <StatusChip value={review?.status ?? "PENDING_REVIEW"} />
      </div>
    </aside>
  );
}

function ParticipationReviewContent({
  canReview,
  isLoading,
  review,
  savePending,
  team,
  teamError,
  teamId,
  onSave,
}: ParticipationReviewContentProps) {
  const [advisorIssueCodes, setAdvisorIssueCodes] = useState<string[]>(
    review?.advisorIssueCodes ?? [],
  );
  const [member1IssueCodes, setMember1IssueCodes] = useState<string[]>(
    review?.participant1IssueCodes ?? [],
  );
  const [member2IssueCodes, setMember2IssueCodes] = useState<string[]>(
    review?.participant2IssueCodes ?? [],
  );
  const [member3IssueCodes, setMember3IssueCodes] = useState<string[]>(
    review?.participant3IssueCodes ?? [],
  );
  const [notes, setNotes] = useState(review?.internalNotes ?? "");
  const imageUrl = team?.image?.url ?? null;

  function save(status: ReviewStatus): void {
    const hasIssues = [
      advisorIssueCodes,
      member1IssueCodes,
      member2IssueCodes,
      member3IssueCodes,
    ].some((issueCodes) => issueCodes.length > 0);

    if (status === "CHANGES_REQUESTED" && !hasIssues) {
      toast.error("กรุณาเลือกปัญหาอย่างน้อยหนึ่งรายการก่อนขอให้แก้ไข");
      return;
    }

    if (status === "APPROVED" && hasIssues) {
      toast.error("กรุณาลบรายการปัญหาทั้งหมดก่อนอนุมัติ");
      return;
    }

    const trimmedNotes = notes.trim();
    onSave(
      {
        advisorIssueCodes,
        internalNotes: trimmedNotes.length > 0 ? trimmedNotes : null,
        participant1IssueCodes: member1IssueCodes,
        participant2IssueCodes: member2IssueCodes,
        participant3IssueCodes: member3IssueCodes,
      },
      status,
    );
  }

  return (
    <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-6xl">
      <DialogHeader>
        <DialogTitle>ตรวจสอบข้อมูลทีม</DialogTitle>
        <DialogDescription>ตรวจสอบเอกสารและบันทึกผลการยืนยันข้อมูลทีม</DialogDescription>
      </DialogHeader>
      {isLoading ? <p>กำลังโหลดข้อมูลทีม...</p> : null}
      {teamError ? <p className="text-destructive">ไม่สามารถโหลดข้อมูลทีมได้</p> : null}
      {team ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.2fr)]">
          <TeamSummary imageUrl={imageUrl} review={review} team={team} />
          <section className="flex flex-col gap-5">
            <h2 className="font-semibold text-lg">แบบฟอร์มตรวจสอบ</h2>
            <IssueCodeField
              canReview={canReview}
              id={`advisor-issues-${teamId}`}
              label="อาจารย์ที่ปรึกษา"
              options={ADVISOR_ISSUE_OPTIONS}
              value={advisorIssueCodes}
              onChange={setAdvisorIssueCodes}
            />
            <IssueCodeField
              canReview={canReview}
              id={`member-1-issues-${teamId}`}
              label="สมาชิก 1"
              options={MEMBER_ISSUE_OPTIONS}
              value={member1IssueCodes}
              onChange={setMember1IssueCodes}
            />
            <IssueCodeField
              canReview={canReview}
              id={`member-2-issues-${teamId}`}
              label="สมาชิก 2"
              options={MEMBER_ISSUE_OPTIONS}
              value={member2IssueCodes}
              onChange={setMember2IssueCodes}
            />
            <IssueCodeField
              canReview={canReview}
              id={`member-3-issues-${teamId}`}
              label="สมาชิก 3"
              options={MEMBER_ISSUE_OPTIONS}
              value={member3IssueCodes}
              onChange={setMember3IssueCodes}
            />
            <label
              className="flex flex-col gap-2 font-medium text-sm"
              htmlFor={`review-notes-${teamId}`}
            >
              หมายเหตุเพิ่มเติมสำหรับทีม
              <Textarea
                disabled={!canReview}
                id={`review-notes-${teamId}`}
                placeholder="ระบุรายละเอียดเพิ่มเติมสำหรับทีม (ถ้ามี)"
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                }}
              />
            </label>
          </section>
        </div>
      ) : null}
      {canReview ? (
        <DialogFooter>
          <Button
            disabled={savePending || !team}
            variant="destructive"
            onClick={() => {
              save("CHANGES_REQUESTED");
            }}
          >
            ขอให้แก้ไข
          </Button>
          <Button
            disabled={savePending || !team}
            onClick={() => {
              save("APPROVED");
            }}
          >
            อนุมัติ
          </Button>
        </DialogFooter>
      ) : null}
    </DialogContent>
  );
}

export { ParticipationReviewContent };
