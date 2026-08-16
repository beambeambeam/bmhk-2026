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
import type {
  PublicFileWithUrl,
  TeamAdvisorDetails,
  TeamConsent,
  TeamDetails,
  TeamParticipantDetails,
  TeamRegistrationReview,
} from "@bmhk-2026/api";
import { CircleAlert, ExternalLink, ImageOff, Quote, UserRound, UsersRound, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StatusChip } from "./participation-review-status";

const ADVISOR_ISSUE_OPTIONS = ["ข้อมูลไม่ตรง", "บัตรประชาชนมีปัญหา", "บัตรอาจารย์มีปัญหา"] as const;
const MEMBER_ISSUE_OPTIONS = ["ข้อมูลไม่ตรง", "บัตรประชาชนมีปัญหา", "ปพ.7 มีปัญหา", "รูปมีปัญหา"] as const;
const MEMBER_INDEXES = [1, 2, 3] as const;

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
  readonly advisor: TeamAdvisorDetails | undefined;
  readonly canReview: boolean;
  readonly consent: TeamConsent | undefined;
  readonly isLoading: boolean;
  readonly lastUpdatedAt: Date | null;
  readonly review: TeamRegistrationReview | null | undefined;
  readonly participants: readonly TeamParticipantDetails[];
  readonly reviewedByName: string | null;
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
    <section className="flex flex-col gap-2 rounded-lg border bg-background p-2">
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
        <img alt={label} className="max-h-56 w-full rounded-md object-contain" src={document.url} />
      ) : (
        <iframe
          className="h-56 w-full rounded-md border"
          sandbox=""
          src={document.url}
          title={label}
        />
      )}
    </section>
  );
}

function ProfilePreview({ profilePhoto }: { readonly profilePhoto: PublicFileWithUrl | null }) {
  if (profilePhoto === null) {
    return (
      <div className="flex aspect-square w-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-destructive/40 bg-destructive/10 p-3 text-center font-medium text-destructive text-xs">
        <UserRound aria-hidden="true" className="size-7" />
        ไม่มีรูปโปรไฟล์
      </div>
    );
  }

  return (
    <img
      alt="รูปโปรไฟล์"
      className="aspect-square w-32 rounded-lg object-cover"
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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-muted-foreground text-sm">
          {isParticipant ? "สมาชิกทีม" : "อาจารย์ที่ปรึกษา"}
        </p>
        <h2 className="font-semibold text-xl">{fullName}</h2>
        <p className="text-muted-foreground text-sm">{fullNameEn}</p>
      </div>
      {isParticipant ? <ProfilePreview profilePhoto={participant.portraitPhoto} /> : null}
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">อีเมล</dt>
          <dd className="font-medium">{person.email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">เบอร์โทรศัพท์</dt>
          <dd className="font-medium">{person.phone}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">ไลน์ไอดี</dt>
          <dd className="font-medium">{person.lineId ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">การแพ้อาหาร</dt>
          <dd className="font-medium">{person.foodAllergies ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">ข้อกำหนดด้านอาหาร</dt>
          <dd className="font-medium">{person.dietaryRequirements ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">การแพ้ยา</dt>
          <dd className="font-medium">{person.drugAllergies ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">โรคประจำตัวและการปฐมพยาบาล</dt>
          <dd className="font-medium">{person.chronicConditionsAndFirstAidNotes ?? "—"}</dd>
        </div>
        {isParticipant ? (
          <div>
            <dt className="text-muted-foreground">วันเกิด</dt>
            <dd className="font-medium">{participant.dateOfBirth}</dd>
          </div>
        ) : null}
      </dl>
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">เอกสารที่ส่ง</h3>
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
  );
}

function ConsentSummary({ consent }: { readonly consent: TeamConsent | undefined }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-background p-3">
      <h3 className="font-medium">การยินยอม</h3>
      {consent === undefined ? (
        <p className="text-muted-foreground text-sm">ไม่มีข้อมูลการยินยอม</p>
      ) : (
        <dl className="grid gap-2 text-sm">
          {CONSENT_FIELDS.map(({ key, label }) => (
            <div className="flex items-center justify-between gap-3" key={key}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{consent[key] ? "ยินยอม" : "ยังไม่ยินยอม"}</dd>
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
    <aside className="flex flex-col gap-5 rounded-xl border bg-muted/30 p-5">
      <div className="flex flex-wrap gap-2" aria-label="หมวดข้อมูลสำหรับตรวจสอบ">
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
          <dl className="rounded-lg border bg-background p-3 text-sm">
            <div>
              <dt className="text-muted-foreground">วันที่ส่งใบสมัคร</dt>
              <dd className="font-medium">
                {team.registrationSubmittedAt?.toLocaleString() ?? "—"}
              </dd>
            </div>
          </dl>
          <ConsentSummary consent={consent} />
        </>
      ) : (
        <PersonPreview
          advisor={selectedSubject === "advisor" ? advisor : undefined}
          participant={selectedParticipant}
        />
      )}
      <div className="flex items-center justify-between rounded-lg border bg-background p-3">
        <span className="text-muted-foreground text-sm">สถานะการยืนยัน</span>
        <StatusChip value={review?.status ?? "PENDING_REVIEW"} />
      </div>
      <dl className="grid gap-2 rounded-lg border bg-background p-3 text-sm">
        <div>
          <dt className="text-muted-foreground">อัปเดตโดย</dt>
          <dd className="font-medium">{reviewedByName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">อัปเดตล่าสุด</dt>
          <dd className="font-medium">{lastUpdatedAt?.toLocaleString() ?? "—"}</dd>
        </div>
      </dl>
    </aside>
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
    <section className="flex flex-col gap-5">
      <h2 className="font-semibold text-lg">แบบฟอร์มตรวจสอบ</h2>
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
  isLoading,
  lastUpdatedAt,
  review,
  participants,
  reviewedByName,
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
    <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-6xl">
      <DialogHeader>
        <DialogTitle>ตรวจสอบข้อมูลทีม</DialogTitle>
        <DialogDescription>ตรวจสอบเอกสารและบันทึกผลการยืนยันข้อมูลทีม</DialogDescription>
      </DialogHeader>
      {isLoading ? <p>กำลังโหลดข้อมูลทีม...</p> : null}
      {teamError ? <p className="text-destructive">ไม่สามารถโหลดข้อมูลทีมได้</p> : null}
      {team ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.2fr)]">
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
      ) : null}
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
