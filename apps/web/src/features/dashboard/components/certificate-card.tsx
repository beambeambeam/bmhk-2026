import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ClipboardList, Download, FileText, Loader2, Lock } from "lucide-react";

import { orpc } from "@bmhk-2026/client/orpc";
import type { client } from "@bmhk-2026/client/orpc";

import CertificateFeedbackDialog from "./certificate-feedback-dialog";

type Recipient = Awaited<ReturnType<typeof client.certificates.mine>>["recipients"][number];

const TITLE = "ดาวน์โหลดเกียรติบัตร";
const NOT_READY = "ยังไม่พร้อม";
const FEEDBACK_NOTICE = "ตอบแบบสอบถามของทีมก่อน แล้วปุ่มดาวน์โหลดจะปลดล็อก";
const FEEDBACK_THANKS = "ขอบคุณที่ตอบแบบสอบถาม ดาวน์โหลดเกียรติบัตรได้แล้ว";
const DOWNLOAD_ERROR = "ดาวน์โหลดเกียรติบัตรไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
const SUBTITLE_12_14 = "text-[calc(11.948px_+_2.052*var(--fl))] text-balance";
const PLATE = "rounded-[20px] bg-white p-4 shadow-soft";

const TEMPLATE_LABEL = {
  appreciation: "เกียรติบัตรขอบคุณอาจารย์ที่ปรึกษา",
  final: "เกียรติบัตรรอบชิงชนะเลิศ",
  first: "เกียรติบัตรรางวัลชนะเลิศ",
  "honorable-mention": "เกียรติบัตรรางวัลชมเชย",
  participate: "เกียรติบัตรเข้าร่วมการแข่งขัน",
  second: "เกียรติบัตรรางวัลรองชนะเลิศอันดับ 1",
  "semi-final": "เกียรติบัตรรอบรองชนะเลิศ",
  third: "เกียรติบัตรรางวัลรองชนะเลิศอันดับ 2",
} as const satisfies Record<Recipient["template"], string>;

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function RowIcon({ locked, isDownloading }: { locked: boolean; isDownloading: boolean }) {
  if (locked) {
    return <Lock aria-hidden className="size-4" />;
  }
  if (isDownloading) {
    return <Loader2 aria-hidden className="size-4 animate-spin" />;
  }
  return <Download aria-hidden className="size-4" />;
}

function CertificateRow({
  recipient,
  locked,
  isDownloading,
  onDownload,
}: {
  recipient: Recipient;
  locked: boolean;
  isDownloading: boolean;
  onDownload: (id: string) => void;
}) {
  const { certificate } = recipient;
  const ready = certificate !== null;
  const subtitle = ready
    ? `${TEMPLATE_LABEL[recipient.template]} · ${formatSize(certificate.sizeBytes)}`
    : TEMPLATE_LABEL[recipient.template];

  return (
    <li className="flex w-full items-center gap-[12px] rounded-[12px] p-[10px] shadow-[inset_0_0_0_0.5px_#dcdcdc]">
      <span className="flex size-[32px] shrink-0 items-center justify-center">
        <span
          className={`flex shrink-0 items-center justify-center rounded-full p-[6px] ${
            ready
              ? "bg-[rgba(192,86,62,0.1)] text-brand-red shadow-[inset_0_0_0_1px_rgba(192,86,62,0.2)]"
              : "bg-[#f6f6f6] text-gray-2 shadow-[inset_0_0_0_1px_#dcdcdc]"
          }`}
        >
          <FileText aria-hidden className="size-5" strokeWidth={1.75} />
        </span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="fl-14 leading-normal font-medium text-balance">{recipient.fullName}</p>
        <p className="fl-12 leading-normal text-gray-2 text-balance">{subtitle}</p>
      </div>
      {ready ? (
        <button
          type="button"
          disabled={locked || isDownloading}
          aria-describedby={locked ? "certificate-feedback-notice" : undefined}
          aria-label={`ดาวน์โหลดเกียรติบัตรของ ${recipient.fullName}`}
          onClick={() => {
            onDownload(certificate.id);
          }}
          className="mm-press flex shrink-0 items-center gap-[6px] rounded-[10px] bg-[#f6f6f6] px-[14px] py-[8px] fl-14 leading-normal transition-colors hover:bg-[#ececec] disabled:opacity-60"
        >
          <RowIcon locked={locked} isDownloading={isDownloading} />
          ดาวน์โหลด
        </button>
      ) : (
        <p className="shrink-0 fl-14 leading-normal text-gray-2">{NOT_READY}</p>
      )}
    </li>
  );
}

/**
 * The team's certificates, one row per participant and the advisor. The card stays hidden
 * until the `certificateDownload` flag opens. The download URL is signed on each click and
 * expires in minutes, so it is never cached or put in the page.
 */
export default function CertificateCard({ card = true }: { card?: boolean }) {
  const { data: featureFlags } = useQuery(orpc.featureFlags.getAll.queryOptions());
  const isOpen = featureFlags?.certificateDownload === true;
  const { data } = useQuery({ ...orpc.certificates.mine.queryOptions(), enabled: isOpen });
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const download = useMutation({
    ...orpc.certificates.mineDownloadUrl.mutationOptions(),
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
  });

  const recipients = data?.recipients ?? [];
  if (!isOpen || recipients.length === 0) {
    return null;
  }

  const locked = data?.feedbackSubmitted !== true;
  const anyReady = recipients.some((recipient) => recipient.certificate !== null);
  const subtitle = anyReady ? "เกียรติบัตรของสมาชิกและอาจารย์ที่ปรึกษาในทีม" : "เกียรติบัตรยังไม่พร้อมให้ดาวน์โหลด";

  return (
    <section
      aria-labelledby="certificate-card-title"
      className={`mm-card-in flex w-full flex-col items-start ${card ? PLATE : ""}`}
    >
      <div className="flex w-full flex-col items-start gap-4">
        <div className="flex w-full flex-col items-start">
          <h2
            id="certificate-card-title"
            className="w-full text-[20px] leading-[1.4] font-medium text-balance"
          >
            {TITLE}
          </h2>
          <p className={`${SUBTITLE_12_14} leading-normal text-gray-2`}>{subtitle}</p>
        </div>

        {locked ? (
          <div className="flex w-full flex-col items-start gap-3 rounded-[12px] bg-[rgba(192,86,62,0.06)] p-[12px] shadow-[inset_0_0_0_1px_rgba(192,86,62,0.2)] sm:flex-row sm:items-center">
            <p
              id="certificate-feedback-notice"
              className="flex-1 fl-14 leading-normal text-balance"
            >
              {FEEDBACK_NOTICE}
            </p>
            <button
              type="button"
              onClick={() => {
                setFeedbackOpen(true);
              }}
              className="mm-press flex shrink-0 items-center gap-[6px] rounded-[10px] bg-brand-red px-[14px] py-[8px] fl-14 leading-normal font-medium text-white"
            >
              <ClipboardList aria-hidden className="size-4" />
              ทำแบบสอบถาม
            </button>
          </div>
        ) : null}
        {justSubmitted && !locked ? (
          <output className="fl-14 leading-normal text-brand-green">{FEEDBACK_THANKS}</output>
        ) : null}

        <ul className="flex w-full flex-col gap-[8px]">
          {recipients.map((recipient) => (
            <CertificateRow
              key={`${recipient.role}:${recipient.personId}`}
              recipient={recipient}
              locked={locked}
              isDownloading={
                download.isPending && download.variables.id === recipient.certificate?.id
              }
              onDownload={(id) => {
                download.mutate({ disposition: "attachment", id });
              }}
            />
          ))}
        </ul>

        {download.isError ? (
          <p role="alert" className="fl-12 leading-normal text-brand-red">
            {DOWNLOAD_ERROR}
          </p>
        ) : null}
      </div>
      {locked ? (
        <CertificateFeedbackDialog
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          onSubmitted={() => {
            setJustSubmitted(true);
          }}
        />
      ) : null}
    </section>
  );
}
