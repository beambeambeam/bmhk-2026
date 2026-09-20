import { Button } from "@/components/button";
import { Separator } from "@/components/separator";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { Textarea } from "@/components/textarea";
import type {
  PublicFileWithUrl,
  TeamAdvisorDetails,
  TeamConsent,
  TeamDetails,
  TeamParticipantDetails,
  TeamRegistrationReviewListResult,
  TeamRegistrationReview,
} from "@bmhk-2026/api";
import {
  ArrowUp,
  CircleAlert,
  ExternalLink,
  ImageOff,
  Quote,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DetailFields } from "./detail-fields";
import { StatusChip } from "./participation-review-status";
import { formatStaffDateTime } from "./review-utils";

const ADVISOR_ISSUE_OPTIONS = ["ข้อมูลไม่ตรง", "บัตรประชาชนมีปัญหา", "บัตรอาจารย์มีปัญหา"] as const;
const MEMBER_ISSUE_OPTIONS = ["ข้อมูลไม่ตรง", "บัตรประชาชนมีปัญหา", "ปพ.7 มีปัญหา", "รูปมีปัญหา"] as const;
const MEMBER_INDEXES = [1, 2, 3] as const;

type ReviewStatus = "APPROVED" | "CHANGES_REQUESTED";

export interface ReviewSubmissionData {
  readonly advisorIssueCodes: string[];
  readonly internalNotes: string | null;
  readonly participant1IssueCodes: string[];
  readonly participant2IssueCodes: string[];
  readonly participant3IssueCodes: string[];
}

interface IssueCodeFieldProps {
  readonly canReview: boolean;
  readonly id: string;
  readonly label: string;
  readonly options: readonly string[];
  readonly value: readonly string[];
  readonly onChange: (value: string[]) => void;
}

interface ParticipationReviewContentProps {
  readonly advisor: TeamAdvisorDetails | undefined;
  readonly canReview: boolean;
  readonly consent: TeamConsent | undefined;
  readonly hasDetailsError: boolean;
  readonly isLoading: boolean;
  readonly lastUpdatedAt: Date | null;
  readonly review: TeamRegistrationReview | null | undefined;
  readonly participants: readonly TeamParticipantDetails[];
  readonly schoolTeams: TeamRegistrationReviewListResult["rows"];
  readonly schoolTeamsError: boolean;
  readonly schoolTeamsLoading: boolean;
  readonly reviewedByName: string | null;
  readonly savePending: boolean;
  readonly team: TeamDetails | undefined;
  readonly teamId: string;
  readonly onSave: (data: ReviewSubmissionData, status: ReviewStatus) => void;
}

interface TeamSummaryProps {
  readonly advisor: TeamAdvisorDetails | undefined;
  readonly consent: TeamConsent | undefined;
  readonly imageUrl: string | null;
  readonly lastUpdatedAt: Date | null;
  readonly participants: readonly TeamParticipantDetails[];
  readonly review: TeamRegistrationReview | null | undefined;
  readonly reviewedByName: string | null;
  readonly team: TeamDetails;
}

type PreviewSubject = "advisor" | "team" | 1 | 2 | 3;

const CONSENT_FIELDS = [
  { key: "competitionRulesAccepted", label: "ยอมรับกติกาการแข่งขัน" },
  { key: "codernTermsAccepted", label: "ยอมรับข้อกำหนด CoderN" },
  { key: "guardianConsentObtained", label: "ได้รับความยินยอมจากผู้ปกครอง" },
  { key: "healthDataConsent", label: "ยินยอมให้ใช้ข้อมูลสุขภาพ" },
  { key: "privacyPolicyAccepted", label: "ยอมรับนโยบายความเป็นส่วนตัว" },
  { key: "publicityMediaConsent", label: "ยินยอมใช้สื่อประชาสัมพันธ์" },
] as const satisfies readonly { readonly key: keyof TeamConsent; readonly label: string }[];

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
      <Select
        disabled={!canReview}
        items={options.map((option) => ({ label: option, value: option }))}
        onValueChange={addIssueCode}
      >
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

function DocumentPreview({
  document,
  label,
}: {
  readonly document: PublicFileWithUrl | null;
  readonly label: string;
}) {
  if (document === null) {
    return (
      <output className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 font-medium text-destructive text-sm">
        <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
        {label}: ไม่ได้ส่งเอกสาร
      </output>
    );
  }

  const isImage = document.contentType !== "application/pdf";
  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-medium text-sm">{label}</h4>
        <Button
          render={
            <a
              aria-label={`เปิด${label}ในหน้าต่างใหม่`}
              href={document.url}
              rel="noopener noreferrer"
              target="_blank"
            />
          }
          size="sm"
          variant="outline"
        >
          เปิดไฟล์
          <ExternalLink aria-hidden="true" data-icon="inline-end" />
        </Button>
      </div>
      {isImage ? (
        <img alt={label} className="max-h-40 w-full rounded-md object-contain" src={document.url} />
      ) : (
        <iframe className="h-40 w-full rounded-md" sandbox="" src={document.url} title={label} />
      )}
    </section>
  );
}

function ProfilePreview({ profilePhoto }: { readonly profilePhoto: PublicFileWithUrl | null }) {
  if (profilePhoto === null) {
    return (
      <div className="flex size-20 shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-destructive/40 bg-destructive/10 p-3 text-center font-medium text-destructive text-xs sm:size-24">
        <UserRound aria-hidden="true" className="size-7" />
        ไม่มีรูปโปรไฟล์
      </div>
    );
  }

  return (
    <img
      alt="รูปโปรไฟล์"
      className="size-20 shrink-0 rounded-lg object-cover sm:size-24"
      src={profilePhoto.url}
    />
  );
}

function PersonPreview({
  advisor,
  participant,
}: {
  readonly advisor: TeamAdvisorDetails | undefined;
  readonly participant: TeamParticipantDetails | undefined;
}) {
  const person = participant ?? advisor;
  if (!person) {
    return <p className="text-muted-foreground">ไม่มีข้อมูลผู้สมัครรายนี้</p>;
  }

  const isParticipant = participant !== undefined;
  const fullName = [person.titleTh, person.firstNameTh, person.middleNameTh, person.lastNameTh]
    .filter((name) => name !== null && name.length > 0)
    .join(" ");
  const fullNameEn = [person.titleEn, person.firstNameEn, person.middleNameEn, person.lastNameEn]
    .filter((name) => name !== null && name.length > 0)
    .join(" ");
  const detailFields = [
    { label: "อีเมล", value: person.email },
    { label: "เบอร์โทรศัพท์", value: person.phone },
    { label: "ไลน์ไอดี", value: person.lineId },
    { label: "การแพ้อาหาร", value: person.foodAllergies },
    { label: "ข้อกำหนดด้านอาหาร", value: person.dietaryRequirements },
    { label: "การแพ้ยา", value: person.drugAllergies },
    { label: "โรคประจำตัวและการปฐมพยาบาล", value: person.chronicConditionsAndFirstAidNotes },
    ...(isParticipant ? [{ label: "วันเกิด", value: participant.dateOfBirth }] : []),
  ];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {isParticipant ? <ProfilePreview profilePhoto={participant.portraitPhoto} /> : null}
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-sm">
            {isParticipant ? "สมาชิกทีม" : "อาจารย์ที่ปรึกษา"}
          </p>
          <h2 className="break-words font-semibold text-xl leading-tight">{fullName}</h2>
          {fullNameEn ? (
            <p className="break-words text-muted-foreground text-sm">{fullNameEn}</p>
          ) : null}
        </div>
      </div>
      <DetailFields fields={detailFields} title="รายละเอียดข้อมูล" />
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">เอกสารที่ส่ง</h3>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-3">
          <DocumentPreview document={person.identityDocument} label="บัตรประชาชน" />
          {isParticipant ? (
            <>
              <DocumentPreview document={participant.academicRecordDocument} label="ปพ.7" />
              <DocumentPreview document={participant.portraitPhoto} label="รูปถ่าย" />
            </>
          ) : (
            <DocumentPreview document={advisor?.teacherStatusDocument ?? null} label="บัตรอาจารย์" />
          )}
        </div>
      </div>
    </div>
  );
}

function ConsentSummary({ consent }: { readonly consent: TeamConsent | undefined }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-medium">การยินยอม</h3>
      {consent === undefined ? (
        <p className="text-muted-foreground text-sm">ไม่มีข้อมูลการยินยอม</p>
      ) : (
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {CONSENT_FIELDS.map(({ key, label }) => (
            <div className="flex min-w-0 items-start gap-3" key={key}>
              <dt className="min-w-0 flex-1 text-muted-foreground">{label}</dt>
              <dd className="shrink-0 font-medium">{consent[key] ? "ยินยอม" : "ยังไม่ยินยอม"}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function TeamSummary({
  advisor,
  consent,
  imageUrl,
  lastUpdatedAt,
  participants,
  review,
  reviewedByName,
  team,
}: TeamSummaryProps) {
  const [selectedSubject, setSelectedSubject] = useState<PreviewSubject>("team");
  const selectedParticipant =
    typeof selectedSubject === "number"
      ? participants.find((participant) => participant.index === selectedSubject)
      : undefined;
  const isTeamSelected = selectedSubject === "team";

  return (
    <aside className="flex min-w-0 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap gap-2" aria-label="หมวดข้อมูลสำหรับตรวจสอบ">
        <Button
          size="sm"
          variant={isTeamSelected ? "secondary" : "outline"}
          onClick={() => {
            setSelectedSubject("team");
          }}
        >
          ทีม
        </Button>
        <Button
          disabled={advisor === undefined}
          size="sm"
          variant={selectedSubject === "advisor" ? "secondary" : "outline"}
          onClick={() => {
            setSelectedSubject("advisor");
          }}
        >
          อาจารย์
        </Button>
        {MEMBER_INDEXES.map((memberIndex) => (
          <Button
            disabled={!participants.some((participant) => participant.index === memberIndex)}
            key={memberIndex}
            size="sm"
            variant={selectedSubject === memberIndex ? "secondary" : "outline"}
            onClick={() => {
              setSelectedSubject(memberIndex);
            }}
          >
            สมาชิก {memberIndex}
          </Button>
        ))}
      </div>
      {isTeamSelected ? (
        <>
          <div className="overflow-hidden rounded-lg">
            {imageUrl === null ? (
              <div className="flex aspect-video max-h-32 items-center justify-center bg-muted text-muted-foreground">
                <ImageOff aria-hidden="true" className="size-8" />
                <span className="sr-only">ไม่มีรูปทีม</span>
              </div>
            ) : (
              <img
                alt={`รูปทีม ${team.name}`}
                className="aspect-video max-h-32 w-full object-cover"
                src={imageUrl}
              />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold text-lg">{team.name}</h2>
            <p className="text-muted-foreground">{team.school}</p>
            <p className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
              <span className="flex items-center gap-1.5">
                <Quote aria-hidden="true" className="size-4 shrink-0" />
                ข้อมูลทีมสำหรับการตรวจสอบการสมัครแข่งขัน
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <UsersRound aria-hidden="true" className="size-4 shrink-0" />
                สมาชิก {team.memberCount} คน
              </span>
            </p>
          </div>
          <dl className="text-sm">
            <div>
              <dt className="text-muted-foreground">วันที่ส่งใบสมัคร</dt>
              <dd className="font-medium">{formatStaffDateTime(team.registrationSubmittedAt)}</dd>
            </div>
          </dl>
          <Separator />
          <ConsentSummary consent={consent} />
        </>
      ) : (
        <PersonPreview
          advisor={selectedSubject === "advisor" ? advisor : undefined}
          participant={selectedParticipant}
        />
      )}
      <Separator />
      <div className="grid shrink-0 gap-3 text-sm sm:grid-cols-3">
        <div className="flex flex-col items-start gap-1">
          <span className="text-muted-foreground">สถานะการยืนยัน</span>
          <StatusChip value={review?.status ?? "PENDING_REVIEW"} />
        </div>
        <dl>
          <dt className="text-muted-foreground">อัปเดตโดย</dt>
          <dd className="font-medium">{reviewedByName ?? "—"}</dd>
        </dl>
        <dl>
          <dt className="text-muted-foreground">อัปเดตล่าสุด</dt>
          <dd className="font-medium">{formatStaffDateTime(lastUpdatedAt)}</dd>
        </dl>
      </div>
    </aside>
  );
}

interface SchoolTeamsSummaryProps {
  readonly currentTeamId: string;
  readonly schoolTeams: TeamRegistrationReviewListResult["rows"];
  readonly schoolTeamsError: boolean;
  readonly schoolTeamsLoading: boolean;
}

function SchoolTeamsSummary({
  currentTeamId,
  schoolTeams,
  schoolTeamsError,
  schoolTeamsLoading,
}: SchoolTeamsSummaryProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold text-lg">ข้อมูลเพิ่มเติม</h2>
      {schoolTeamsLoading ? (
        <p className="text-muted-foreground text-sm">กำลังโหลดทีมจากโรงเรียนเดียวกัน...</p>
      ) : null}
      {schoolTeamsError ? (
        <p className="text-destructive text-sm">ไม่สามารถโหลดทีมจากโรงเรียนเดียวกันได้</p>
      ) : null}
      {!schoolTeamsLoading && !schoolTeamsError ? (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">#</TableHead>
              <TableHead>ทีม</TableHead>
              <TableHead className="w-40 whitespace-normal">
                <span className="inline-flex items-center gap-1">
                  วันที่ส่ง
                  <ArrowUp aria-hidden="true" className="size-4" />
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schoolTeams.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={3}>
                  ไม่พบทีมจากโรงเรียนเดียวกัน
                </TableCell>
              </TableRow>
            ) : (
              schoolTeams.map((schoolTeam) => (
                <TableRow
                  key={schoolTeam.id}
                  data-state={schoolTeam.id === currentTeamId ? "selected" : undefined}
                >
                  <TableCell>{schoolTeam.index}</TableCell>
                  <TableCell className="whitespace-normal font-medium">{schoolTeam.name}</TableCell>
                  <TableCell>{formatStaffDateTime(schoolTeam.registrationSubmittedAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      ) : null}
    </section>
  );
}

interface ReviewFormProps {
  readonly advisorIssueCodes: readonly string[];
  readonly canReview: boolean;
  readonly member1IssueCodes: readonly string[];
  readonly member2IssueCodes: readonly string[];
  readonly member3IssueCodes: readonly string[];
  readonly notes: string;
  readonly teamId: string;
  readonly onAdvisorIssueCodesChange: (value: string[]) => void;
  readonly onMember1IssueCodesChange: (value: string[]) => void;
  readonly onMember2IssueCodesChange: (value: string[]) => void;
  readonly onMember3IssueCodesChange: (value: string[]) => void;
  readonly onNotesChange: (value: string) => void;
}

function ReviewForm({
  advisorIssueCodes,
  canReview,
  member1IssueCodes,
  member2IssueCodes,
  member3IssueCodes,
  notes,
  teamId,
  onAdvisorIssueCodesChange,
  onMember1IssueCodesChange,
  onMember2IssueCodesChange,
  onMember3IssueCodesChange,
  onNotesChange,
}: ReviewFormProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-semibold text-lg">แบบฟอร์มตรวจสอบ</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <IssueCodeField
          canReview={canReview}
          id={`advisor-issues-${teamId}`}
          label="อาจารย์ที่ปรึกษา"
          options={ADVISOR_ISSUE_OPTIONS}
          value={advisorIssueCodes}
          onChange={onAdvisorIssueCodesChange}
        />
        <IssueCodeField
          canReview={canReview}
          id={`member-1-issues-${teamId}`}
          label="สมาชิก 1"
          options={MEMBER_ISSUE_OPTIONS}
          value={member1IssueCodes}
          onChange={onMember1IssueCodesChange}
        />
        <IssueCodeField
          canReview={canReview}
          id={`member-2-issues-${teamId}`}
          label="สมาชิก 2"
          options={MEMBER_ISSUE_OPTIONS}
          value={member2IssueCodes}
          onChange={onMember2IssueCodesChange}
        />
        <IssueCodeField
          canReview={canReview}
          id={`member-3-issues-${teamId}`}
          label="สมาชิก 3"
          options={MEMBER_ISSUE_OPTIONS}
          value={member3IssueCodes}
          onChange={onMember3IssueCodesChange}
        />
      </div>
      <label className="flex flex-col gap-2 font-medium text-sm" htmlFor={`review-notes-${teamId}`}>
        หมายเหตุเพิ่มเติมสำหรับทีม
        <Textarea
          disabled={!canReview}
          id={`review-notes-${teamId}`}
          placeholder="ระบุรายละเอียดเพิ่มเติมสำหรับทีม"
          value={notes}
          onChange={(event) => {
            onNotesChange(event.target.value);
          }}
        />
      </label>
    </section>
  );
}

interface ReviewActionsProps {
  readonly canApprove: boolean;
  readonly canRequestChanges: boolean;
  readonly canReview: boolean;
  readonly savePending: boolean;
  readonly onSave: (status: ReviewStatus) => void;
}

function ReviewActions({
  canApprove,
  canRequestChanges,
  canReview,
  savePending,
  onSave,
}: ReviewActionsProps) {
  if (!canReview) {
    return null;
  }

  return (
    <DialogFooter>
      <Button
        disabled={savePending || !canRequestChanges}
        variant="destructive"
        onClick={() => {
          onSave("CHANGES_REQUESTED");
        }}
      >
        ขอให้แก้ไข
      </Button>
      <Button
        disabled={savePending || !canApprove}
        onClick={() => {
          onSave("APPROVED");
        }}
      >
        อนุมัติ
      </Button>
    </DialogFooter>
  );
}

function ParticipationReviewContent({
  advisor,
  canReview,
  consent,
  hasDetailsError,
  isLoading,
  lastUpdatedAt,
  review,
  participants,
  schoolTeams,
  schoolTeamsError,
  schoolTeamsLoading,
  reviewedByName,
  savePending,
  team,
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
  const hasIssues = [
    advisorIssueCodes,
    member1IssueCodes,
    member2IssueCodes,
    member3IssueCodes,
  ].some((issueCodes) => issueCodes.length > 0);
  const hasNotes = notes.trim().length > 0;

  function save(status: ReviewStatus): void {
    if (status === "CHANGES_REQUESTED" && !hasIssues) {
      toast.error("กรุณาเลือกปัญหาอย่างน้อยหนึ่งรายการก่อนขอให้แก้ไข");
      return;
    }

    if (status === "CHANGES_REQUESTED" && !hasNotes) {
      toast.error("กรุณาระบุหมายเหตุเพิ่มเติมก่อนขอให้แก้ไข");
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
    <DialogContent className="h-[90dvh] max-h-[90dvh] w-[calc(100%-2rem)] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:w-[90vw] sm:max-w-none">
      <DialogHeader>
        <DialogTitle>ตรวจสอบข้อมูลทีม</DialogTitle>
        <DialogDescription>ตรวจสอบเอกสารและบันทึกผลการยืนยันข้อมูลทีม</DialogDescription>
      </DialogHeader>

      <div className="min-h-0">
        {isLoading ? <p>กำลังโหลดข้อมูลทีม...</p> : null}
        {hasDetailsError ? (
          <p className="text-destructive">ไม่สามารถโหลดข้อมูลการสมัครทั้งหมดได้</p>
        ) : null}
        {team ? (
          <div className="grid h-full min-h-0 gap-6 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <div className="min-h-0 overflow-y-auto">
              <TeamSummary
                advisor={advisor}
                consent={consent}
                imageUrl={imageUrl}
                lastUpdatedAt={lastUpdatedAt}
                participants={participants}
                review={review}
                reviewedByName={reviewedByName}
                team={team}
              />
            </div>
            <div className="flex min-h-0 flex-col gap-6 overflow-y-auto">
              <SchoolTeamsSummary
                currentTeamId={teamId}
                schoolTeams={schoolTeams}
                schoolTeamsError={schoolTeamsError}
                schoolTeamsLoading={schoolTeamsLoading}
              />
              <Separator />
              <ReviewForm
                advisorIssueCodes={advisorIssueCodes}
                canReview={canReview}
                member1IssueCodes={member1IssueCodes}
                member2IssueCodes={member2IssueCodes}
                member3IssueCodes={member3IssueCodes}
                notes={notes}
                teamId={teamId}
                onAdvisorIssueCodesChange={setAdvisorIssueCodes}
                onMember1IssueCodesChange={setMember1IssueCodes}
                onMember2IssueCodesChange={setMember2IssueCodes}
                onMember3IssueCodesChange={setMember3IssueCodes}
                onNotesChange={setNotes}
              />
            </div>
          </div>
        ) : null}
      </div>
      <ReviewActions
        canApprove={team !== undefined && !hasIssues}
        canRequestChanges={team !== undefined && hasIssues && hasNotes}
        canReview={canReview}
        savePending={savePending}
        onSave={save}
      />
    </DialogContent>
  );
}

export { ParticipationReviewContent };
