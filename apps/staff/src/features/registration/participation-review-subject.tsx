import { Button } from "@/components/button";
import type {
  TeamAdvisorDetails,
  TeamParticipantDetails,
  TeamRegistrationReview,
} from "@bmhk-2026/api";
import { CircleAlert, ExternalLink, FileImage, FileText } from "lucide-react";
import type { KeyboardEvent } from "react";

import { DetailFields } from "./detail-fields";
import { StatusChip } from "./participation-review-status";
import type { RegistrationStatus } from "./participation-review-status";
import { formatStaffDateTime, personName } from "./review-utils";

export type ReviewSubject = "advisor" | number;

interface SubjectDecision {
  readonly note: string | null;
  readonly reviewedAt: Date | null;
  readonly status: RegistrationStatus;
}

function toReviewSubject(
  subject: ReviewSubject,
): "advisor" | "participant1" | "participant2" | "participant3" {
  if (subject === "advisor") {
    return subject;
  }
  if (subject === 1) {
    return "participant1";
  }
  if (subject === 2) {
    return "participant2";
  }
  return "participant3";
}

function subjectDecision(
  review: TeamRegistrationReview | null | undefined,
  subject: ReviewSubject,
): SubjectDecision {
  if (review === null || review === undefined) {
    return { note: null, reviewedAt: null, status: "PENDING_REVIEW" };
  }

  const reviewSubject = toReviewSubject(subject);
  const hasIndividualDecisions = [
    review.advisorReviewedAt,
    review.participant1ReviewedAt,
    review.participant2ReviewedAt,
    review.participant3ReviewedAt,
  ].some((reviewedAt) => reviewedAt !== null);
  const issueCodes = review[`${reviewSubject}IssueCodes`];

  if (!hasIndividualDecisions) {
    const status =
      review.status === "CHANGES_REQUESTED" && issueCodes.length === 0 ? "APPROVED" : review.status;
    return {
      note: issueCodes.length > 0 ? review.internalNotes : null,
      reviewedAt: review.reviewedAt,
      status,
    };
  }

  const reviewedAt = review[`${reviewSubject}ReviewedAt`];
  if (reviewedAt === null) {
    return { note: null, reviewedAt, status: "PENDING_REVIEW" };
  }

  return {
    note: review[`${reviewSubject}Notes`],
    reviewedAt,
    status: issueCodes.length > 0 ? "CHANGES_REQUESTED" : "APPROVED",
  };
}

interface DocumentLinkProps {
  readonly kind: "document" | "image";
  readonly label: string;
  readonly url: string | null;
}

function DocumentLink({ kind, label, url }: DocumentLinkProps) {
  if (url === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <CircleAlert aria-hidden="true" className="size-4" />
        {label}: ยังไม่ได้ส่ง
      </span>
    );
  }

  const Icon = kind === "image" ? FileImage : FileText;
  return (
    <Button
      render={<a aria-label={`ดู ${label}`} href={url} rel="noopener noreferrer" target="_blank" />}
      size="sm"
      variant="outline"
    >
      <Icon aria-hidden="true" />
      ดู {label}
      <ExternalLink aria-hidden="true" data-icon="inline-end" />
    </Button>
  );
}

interface SubjectTabsProps {
  readonly advisor: TeamAdvisorDetails | undefined;
  readonly onSubjectChange: (subject: ReviewSubject) => void;
  readonly participants: readonly TeamParticipantDetails[];
  readonly selectedSubject: ReviewSubject;
}

function SubjectTabs({
  advisor,
  onSubjectChange,
  participants,
  selectedSubject,
}: SubjectTabsProps) {
  const subjects: ReviewSubject[] = [
    ...participants.map((participant) => participant.index),
    ...(advisor ? ["advisor" as const] : []),
  ];

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, subject: ReviewSubject): void {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    const currentIndex = subjects.indexOf(subject);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + direction + subjects.length) % subjects.length;
    const nextSubject = subjects[nextIndex];
    if (nextSubject !== undefined) {
      event.preventDefault();
      onSubjectChange(nextSubject);
    }
  }

  return (
    <div aria-label="รายการข้อมูลการสมัคร" className="flex flex-wrap gap-2" role="tablist">
      {participants.map((participant) => (
        <Button
          key={participant.id}
          aria-selected={selectedSubject === participant.index}
          role="tab"
          size="sm"
          tabIndex={selectedSubject === participant.index ? 0 : -1}
          variant={selectedSubject === participant.index ? "default" : "outline"}
          onClick={() => {
            onSubjectChange(participant.index);
          }}
          onKeyDown={(event) => {
            handleKeyDown(event, participant.index);
          }}
        >
          สมาชิก {participant.index}
        </Button>
      ))}
      {advisor ? (
        <Button
          aria-selected={selectedSubject === "advisor"}
          role="tab"
          size="sm"
          tabIndex={selectedSubject === "advisor" ? 0 : -1}
          variant={selectedSubject === "advisor" ? "default" : "outline"}
          onClick={() => {
            onSubjectChange("advisor");
          }}
          onKeyDown={(event) => {
            handleKeyDown(event, "advisor");
          }}
        >
          อาจารย์ที่ปรึกษา
        </Button>
      ) : null}
    </div>
  );
}

interface SubjectDetailsProps {
  readonly advisor: TeamAdvisorDetails | undefined;
  readonly participant: TeamParticipantDetails | undefined;
}

function SubjectDetails({ advisor, participant }: SubjectDetailsProps) {
  if (participant) {
    return (
      <div className="flex flex-col gap-3">
        <DetailFields
          title={`สมาชิก ${participant.index}: ${personName(participant)}`}
          fields={[
            { label: "อีเมล", value: participant.email },
            { label: "เบอร์โทรศัพท์", value: participant.phone },
            { label: "วันเกิด", value: participant.dateOfBirth },
          ]}
        />
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">เอกสารของสมาชิก</h2>
          <div className="flex flex-col gap-2 text-sm">
            <DocumentLink
              kind="document"
              label="บัตรประชาชน"
              url={participant.identityDocument?.url ?? null}
            />
            <DocumentLink
              kind="document"
              label="ปพ.7"
              url={participant.academicRecordDocument?.url ?? null}
            />
            <DocumentLink kind="image" label="รูปถ่าย" url={participant.portraitPhoto?.url ?? null} />
          </div>
        </section>
      </div>
    );
  }

  if (advisor) {
    return (
      <div className="flex flex-col gap-3">
        <DetailFields
          title={`อาจารย์ที่ปรึกษา: ${personName(advisor)}`}
          fields={[
            { label: "อีเมล", value: advisor.email },
            { label: "เบอร์โทรศัพท์", value: advisor.phone },
          ]}
        />
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">เอกสารอาจารย์ที่ปรึกษา</h2>
          <div className="flex flex-col gap-2 text-sm">
            <DocumentLink
              kind="document"
              label="บัตรประชาชน"
              url={advisor.identityDocument?.url ?? null}
            />
            <DocumentLink
              kind="document"
              label="เอกสารยืนยันสถานะอาจารย์"
              url={advisor.teacherStatusDocument?.url ?? null}
            />
          </div>
        </section>
      </div>
    );
  }

  return <p className="text-muted-foreground">ไม่มีข้อมูลการสมัครสำหรับรายการนี้</p>;
}

function SubjectDecisionDetails({ decision }: { readonly decision: SubjectDecision }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">ผลการตรวจสอบรายบุคคล</h2>
        <StatusChip value={decision.status} />
      </div>
      {decision.reviewedAt ? (
        <p className="text-muted-foreground text-sm">
          ตรวจสอบเมื่อ {formatStaffDateTime(decision.reviewedAt)}
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">ยังไม่มีการบันทึกผลการตรวจสอบ</p>
      )}
      {decision.status === "CHANGES_REQUESTED" && decision.note !== null ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-foreground">{decision.note}</p>
      ) : null}
    </section>
  );
}

export { SubjectDecisionDetails, SubjectDetails, SubjectTabs, subjectDecision, toReviewSubject };
