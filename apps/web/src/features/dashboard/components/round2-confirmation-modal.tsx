import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@bmhk-2026/client/orpc";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { AlertCircle, Check, ExternalLink, FileText, Info, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { UploadBox } from "@/components/form/field";
import useDialogFocus, { useScrollLock } from "./use-dialog-focus";
import { formatPersonName } from "../team-data";

const CLOSE = "/assets/figma/36f13a184206ab27dedb4992d9d5b63a3a3f8cb6.svg";
const EXIT_MS = 220;

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || bytes === 0) {
    return "-";
  }
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${mb.toFixed(1)} MB`;
}

export function formatConfirmedDate(date: Date | string | null | undefined): string {
  if (date === null || date === undefined) {
    return "-";
  }
  const dateObj = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(dateObj.getTime())) {
    return "-";
  }
  const dayMonthYear = format(dateObj, "dd MMM", { locale: th });
  const yearBe = (dateObj.getFullYear() + 543).toString();
  const time = format(dateObj, "HH:mm");
  return `${dayMonthYear} ${yearBe} เวลา ${time} น.`;
}

interface ParticipantInfo {
  id: string;
  index: number;
  titleTh?: string | null;
  firstNameTh?: string | null;
  middleNameTh?: string | null;
  lastNameTh?: string | null;
}

export interface Round2ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  teamId: string;
  participants: ParticipantInfo[];
  onConfirmed?: () => void;
}

interface DocumentSlotProps {
  teamId: string;
  participantId: string;
  documentType: "identityDocument" | "studentIdDocument";
  fileId: string | null;
  label: string;
  requirementNumber: number;
  readOnly: boolean;
  isOpen: boolean;
  onUploadSuccess: () => void;
}

interface DocumentAttachmentCardProps {
  originalName?: string;
  sizeBytes?: number;
  url?: string;
  readOnly: boolean;
  isOpen: boolean;
  onReplace: () => void;
}

function DocumentAttachmentCard({
  originalName,
  sizeBytes,
  url,
  readOnly,
  isOpen,
  onReplace,
}: DocumentAttachmentCardProps) {
  const hasUrl = typeof url === "string" && url.length > 0;
  const canReplace = !readOnly && isOpen;

  return (
    <div className="mt-2 flex flex-col gap-3 rounded-[12px] border border-[#ececec] bg-[#f9f9f9] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-red/10 text-brand-red">
          <FileText className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{originalName ?? "เอกสารที่อัปโหลด"}</p>
          <p className="text-xs text-gray-2">{formatFileSize(sizeBytes)}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {hasUrl ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mm-press flex items-center gap-1.5 rounded-lg border border-[#dcdcdc] bg-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-black/[0.04]"
          >
            <span>ดูเอกสาร</span>
            <ExternalLink className="size-3.5" />
          </a>
        ) : null}

        {canReplace ? (
          <button
            type="button"
            onClick={onReplace}
            className="mm-press rounded-lg border border-transparent bg-black/[0.04] px-3 py-1.5 text-xs font-medium text-gray-2 transition-colors hover:bg-black/[0.08] hover:text-ink"
          >
            เปลี่ยนไฟล์
          </button>
        ) : null}
      </div>
    </div>
  );
}

function DocumentSlot({
  teamId,
  participantId,
  documentType,
  fileId,
  label,
  requirementNumber,
  readOnly,
  isOpen,
  onUploadSuccess,
}: DocumentSlotProps) {
  const [replacing, setReplacing] = useState(false);
  const queryClient = useQueryClient();

  const { data: documentData, isPending: isDocPending } = useQuery({
    ...orpc.round2Confirmation.document.queryOptions({
      input: {
        documentType,
        participantId,
        teamId,
      },
    }),
    enabled: fileId !== null,
    staleTime: 60_000,
  });

  const uploadMutation = useMutation({
    ...orpc.round2Confirmation.uploadDocument.mutationOptions(),
    onError: (error) => {
      const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปโหลดเอกสาร";
      toast.error(message);
    },
    onSuccess: async () => {
      toast.success("อัปโหลดเอกสารสำเร็จ");
      setReplacing(false);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orpc.round2Confirmation.get.key({ input: {} }),
        }),
        queryClient.invalidateQueries({
          queryKey: orpc.round2Confirmation.document.key({
            input: { documentType, participantId, teamId },
          }),
        }),
      ]);
      onUploadSuccess();
    },
  });

  const hasFile = fileId !== null;
  const showUploadBox = (!hasFile || replacing) && !readOnly && isOpen;

  function handleFileChange(file: File | null): void {
    if (file === null) {
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("กรุณาเลือกไฟล์ PDF เท่านั้น");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("ขนาดไฟล์เกิน 10 MB");
      return;
    }

    uploadMutation.mutate({
      documentType,
      file,
      participantId,
      teamId,
    });
  }

  function handleStartReplace(): void {
    setReplacing(true);
  }

  function handleCancelReplace(): void {
    setReplacing(false);
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-[16px] border border-[#dcdcdc] bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-ink sm:text-base">
          {requirementNumber}. {label}
        </p>
      </div>

      {isDocPending && hasFile && !replacing ? (
        <div className="flex items-center gap-2 py-4 text-sm text-gray-2">
          <Loader2 className="size-4 animate-spin text-brand-red" />
          <span>กำลังโหลดข้อมูลเอกสาร...</span>
        </div>
      ) : null}

      {hasFile && !replacing ? (
        <DocumentAttachmentCard
          originalName={documentData?.originalName}
          sizeBytes={documentData?.sizeBytes}
          url={documentData?.url}
          readOnly={readOnly}
          isOpen={isOpen}
          onReplace={handleStartReplace}
        />
      ) : null}

      {showUploadBox ? (
        <div className="mt-2 flex flex-col gap-2">
          {uploadMutation.isPending ? (
            <div className="flex h-[100px] w-full flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-brand-red bg-brand-red/[0.02]">
              <Loader2 className="size-6 animate-spin text-brand-red" />
              <p className="text-xs text-gray-2">กำลังอัปโหลดเอกสาร...</p>
            </div>
          ) : (
            <UploadBox
              kind="pdf"
              maxMB={10}
              hint="จำกัดขนาดเอกสารไม่เกิน 10 MB (PDF เท่านั้น)"
              onChange={handleFileChange}
            />
          )}

          {replacing ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCancelReplace}
                className="text-xs font-medium text-gray-2 underline hover:text-ink"
              >
                ยกเลิกการเปลี่ยนไฟล์
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {readOnly && !hasFile ? (
        <div className="mt-1 text-xs text-[#ea4335]">ไม่มีไฟล์เอกสารแนบ</div>
      ) : null}
    </div>
  );
}

interface ParticipantTabsProps {
  participants: {
    id: string;
    index: number;
    identityDocumentFileId: string | null;
    studentIdDocumentFileId: string | null;
  }[];
  participantDetails: ParticipantInfo[];
  activeTab: number;
  onSelectTab: (index: number) => void;
}

function ParticipantTabs({
  participants,
  participantDetails,
  activeTab,
  onSelectTab,
}: ParticipantTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-[#ececec] pb-3">
      {participants.map((p, index) => {
        const isSlotComplete =
          p.identityDocumentFileId !== null && p.studentIdDocumentFileId !== null;
        const isActive = index === activeTab;
        const detail = participantDetails.find((item) => item.id === p.id);
        const name =
          detail === undefined
            ? ""
            : `${detail.firstNameTh ?? ""} ${detail.lastNameTh ?? ""}`.trim();

        return (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              onSelectTab(index);
            }}
            className={`mm-press flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all sm:text-sm ${
              isActive
                ? "bg-ink text-white shadow-sm"
                : "bg-[#f5f5f5] text-gray-2 hover:bg-[#ececec] hover:text-ink"
            }`}
          >
            <span
              className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                isSlotComplete ? "bg-[#94B45E] text-white" : "bg-black/15 text-ink"
              }`}
            >
              {isSlotComplete ? <Check className="size-3 stroke-[3]" /> : (index + 1).toString()}
            </span>
            <span>
              ผู้เข้าแข่งขันคนที่ {p.index}
              {name.length > 0 ? ` (${name})` : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface ConfirmAlertDialogProps {
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmAlertDialog({ isSubmitting, onCancel, onConfirm }: ConfirmAlertDialogProps) {
  return (
    <div
      // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
    >
      <div className="relative flex w-full max-w-[440px] flex-col gap-4 rounded-[24px] border border-[#dcdcdc] bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-red/10 text-brand-red">
            <AlertCircle className="size-5" />
          </span>
          <div className="flex-1">
            <h3 id="alert-dialog-title" className="text-base font-semibold text-ink sm:text-lg">
              ยืนยันสิทธิ์การเข้าแข่งขันรอบรองชนะเลิศ
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-2 sm:text-sm">
              เมื่อยืนยันแล้วจะไม่สามารถแก้ไขหรืออัปโหลดเอกสารใหม่ได้อีก คุณแน่ใจหรือไม่ว่าต้องการยืนยันสิทธิ์สำหรับทีมของคุณ?
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="mm-press rounded-xl border border-[#dcdcdc] bg-white px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-black/[0.03] sm:text-sm"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="mm-press flex items-center gap-2 rounded-xl bg-brand-red px-5 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:text-sm"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            <span>ยืนยันสิทธิ์</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalHeader({ isConfirmed }: { isConfirmed: boolean }) {
  return (
    <div className="flex flex-col gap-2 border-b border-[#ececec] p-5 sm:p-6 sm:pr-14">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
          <Upload className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink sm:text-xl">
            ยืนยันสิทธิ์การเข้าแข่งขันรอบรองชนะเลิศ
          </h2>
          <p className="text-xs text-gray-2 sm:text-sm">
            {isConfirmed
              ? "ตรวจสอบเอกสารยืนยันสิทธิ์ที่ส่งเรียบร้อยแล้ว"
              : "กรุณาอัปโหลดเอกสารยืนยันตัวตนของผู้เข้าแข่งขันทุกคนเพื่อยืนยันสิทธิ์ On-site"}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#f5f5f5] px-3.5 py-2 text-xs text-gray-2">
        <Info className="size-4 shrink-0 text-gray-2" />
        <span>*อาจารย์ที่ปรึกษาไม่ต้องอัปโหลดเอกสารยืนยันสิทธิ์ใหม่</span>
      </div>
    </div>
  );
}

interface ModalFooterProps {
  isConfirmed: boolean;
  confirmedAt?: Date | null;
  isOpen: boolean;
  agreed: boolean;
  canSubmit: boolean;
  isSubmitting: boolean;
  onAgreeChange: (agreed: boolean) => void;
  onClose: () => void;
  onSubmitClick: () => void;
}

function ModalFooter({
  isConfirmed,
  confirmedAt,
  isOpen,
  agreed,
  canSubmit,
  isSubmitting,
  onAgreeChange,
  onClose,
  onSubmitClick,
}: ModalFooterProps) {
  if (isConfirmed) {
    return (
      <div className="flex flex-col gap-3 border-t border-[#ececec] bg-[#fbfbfb] p-4 sm:p-6">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2 text-xs font-medium text-[#739241] sm:text-sm">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#94B45E] text-white">
              <Check className="size-3.5 stroke-[3]" />
            </span>
            <span>
              ยืนยันสิทธิ์การเข้าแข่งขันรอบรองชนะเลิศเรียบร้อยแล้วเมื่อ {formatConfirmedDate(confirmedAt)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mm-press w-full rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:w-auto"
          >
            ปิด
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t border-[#ececec] bg-[#fbfbfb] p-4 sm:p-6">
      {isOpen ? (
        <div className="flex items-start gap-2.5">
          <input
            type="checkbox"
            id="round2-agreed"
            checked={agreed}
            onChange={(e) => {
              onAgreeChange(e.target.checked);
            }}
            className="mt-1 size-4 cursor-pointer rounded border-[#dcdcdc] text-brand-red focus:ring-brand-red"
          />
          <label
            htmlFor="round2-agreed"
            className="cursor-pointer text-xs leading-relaxed text-gray-2 sm:text-sm"
          >
            ข้าพเจ้ายืนยันว่าเอกสารและรายชื่อผู้เข้าแข่งขันถูกต้องครบถ้วน และรับทราบว่าจะไม่สามารถแก้ไขได้อีก
          </label>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-800">
          <AlertCircle className="size-4 shrink-0" />
          <span>หมดเวลาการยืนยันสิทธิ์การเข้าแข่งขันรอบรองชนะเลิศแล้ว</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="mm-press rounded-xl border border-[#dcdcdc] bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-black/[0.03]"
        >
          ยกเลิก
        </button>
        {isOpen ? (
          <button
            type="button"
            onClick={onSubmitClick}
            disabled={!canSubmit}
            className="mm-press flex items-center justify-center gap-2 rounded-xl bg-brand-red px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            <span>ยืนยันสิทธิ์</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface ParticipantSectionProps {
  currentParticipant?: {
    id: string;
    index: number;
    identityDocumentFileId: string | null;
    studentIdDocumentFileId: string | null;
  };
  currentParticipantName?: string;
  teamId: string;
  isConfirmed: boolean;
  isOpen: boolean;
  onRefresh: () => void;
}

function ParticipantSection({
  currentParticipant,
  currentParticipantName,
  teamId,
  isConfirmed,
  isOpen,
  onRefresh,
}: ParticipantSectionProps) {
  if (currentParticipant === undefined) {
    return null;
  }

  const isSlotComplete =
    currentParticipant.identityDocumentFileId !== null &&
    currentParticipant.studentIdDocumentFileId !== null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink sm:text-base">
          เอกสารผู้เข้าแข่งขันคนที่ {currentParticipant.index}
          {typeof currentParticipantName === "string" && currentParticipantName.length > 0
            ? ` : ${currentParticipantName}`
            : ""}
        </h3>
        {isSlotComplete ? (
          <span className="flex items-center gap-1 rounded-full bg-[#94B45E]/15 px-2.5 py-0.5 text-xs font-medium text-[#739241]">
            <Check className="size-3" />
            <span>เอกสารครบถ้วน</span>
          </span>
        ) : (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            รออัปโหลดเอกสาร
          </span>
        )}
      </div>

      <DocumentSlot
        teamId={teamId}
        participantId={currentParticipant.id}
        documentType="identityDocument"
        fileId={currentParticipant.identityDocumentFileId}
        label="สำเนาบัตรประจำตัวประชาชน หรือบัตรประจำตัวสำหรับบุคคลที่ไม่ใช่สัญชาติไทย พร้อมเซ็นสำเนาถูกต้อง (เฉพาะด้านหน้า)"
        requirementNumber={1}
        readOnly={isConfirmed}
        isOpen={isOpen}
        onUploadSuccess={onRefresh}
      />

      <DocumentSlot
        teamId={teamId}
        participantId={currentParticipant.id}
        documentType="studentIdDocument"
        fileId={currentParticipant.studentIdDocumentFileId}
        label="สำเนาบัตรประจำตัวนักเรียน หรือหนังสือรับรองสถานภาพนักเรียน พร้อมเซ็นสำเนาถูกต้อง"
        requirementNumber={2}
        readOnly={isConfirmed}
        isOpen={isOpen}
        onUploadSuccess={onRefresh}
      />
    </div>
  );
}

interface ModalBodyProps {
  isPending: boolean;
  error: unknown;
  hasStatus: boolean;
  activeParticipants: {
    id: string;
    index: number;
    identityDocumentFileId: string | null;
    studentIdDocumentFileId: string | null;
  }[];
  participants: ParticipantInfo[];
  activeTab: number;
  onSelectTab: (index: number) => void;
  currentParticipant?: {
    id: string;
    index: number;
    identityDocumentFileId: string | null;
    studentIdDocumentFileId: string | null;
  };
  currentParticipantName?: string;
  teamId: string;
  isConfirmed: boolean;
  isOpen: boolean;
  onRefresh: () => void;
}

function ModalBody({
  isPending,
  error,
  hasStatus,
  activeParticipants,
  participants,
  activeTab,
  onSelectTab,
  currentParticipant,
  currentParticipantName,
  teamId,
  isConfirmed,
  isOpen,
  onRefresh,
}: ModalBodyProps) {
  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-6">
      {isPending ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="size-8 animate-spin text-brand-red" />
          <p className="text-sm text-gray-2">กำลังโหลดข้อมูลการยืนยันสิทธิ์...</p>
        </div>
      ) : null}

      {error === null ? null : (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <AlertCircle className="size-8 text-[#ea4335]" />
          <p className="text-sm text-[#ea4335]">ไม่สามารถโหลดข้อมูลการยืนยันสิทธิ์ได้</p>
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs font-medium text-brand-red underline"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      )}

      {hasStatus ? (
        <div className="flex flex-col gap-6">
          <ParticipantTabs
            participants={activeParticipants}
            participantDetails={participants}
            activeTab={activeTab}
            onSelectTab={onSelectTab}
          />

          <ParticipantSection
            currentParticipant={currentParticipant}
            currentParticipantName={currentParticipantName}
            teamId={teamId}
            isConfirmed={isConfirmed}
            isOpen={isOpen}
            onRefresh={onRefresh}
          />
        </div>
      ) : null}
    </div>
  );
}

function useModalMount(open: boolean) {
  const [mounted, setMounted] = useState(open);
  const [state, setState] = useState<"open" | "closed">(open ? "open" : "closed");

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setMounted(true);
      });
      const frame = requestAnimationFrame(() => {
        setState("open");
      });
      return () => {
        cancelAnimationFrame(frame);
      };
    }
    queueMicrotask(() => {
      setState("closed");
    });
    const timer = window.setTimeout(() => {
      setMounted(false);
    }, EXIT_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [open]);

  return { mounted, state };
}

export default function Round2ConfirmationModal({
  open,
  onClose,
  teamId,
  participants,
  onConfirmed,
}: Round2ConfirmationModalProps) {
  const { mounted, state } = useModalMount(open);
  const sheetRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [showConfirmAlert, setShowConfirmAlert] = useState(false);

  useDialogFocus(open && mounted, sheetRef);
  useScrollLock(open);

  const {
    data: confirmationStatus,
    isPending,
    error,
    refetch,
  } = useQuery({
    ...orpc.round2Confirmation.get.queryOptions({ input: {} }),
    enabled: open,
  });

  const submitMutation = useMutation({
    ...orpc.round2Confirmation.submit.mutationOptions(),
    onError: (err) => {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการยืนยันสิทธิ์";
      toast.error(message);
    },
    onSuccess: async () => {
      toast.success("ยืนยันสิทธิ์การเข้าแข่งขันรอบรองชนะเลิศสำเร็จ");
      setShowConfirmAlert(false);
      await queryClient.invalidateQueries({
        queryKey: orpc.round2Confirmation.get.key({ input: {} }),
      });
      onConfirmed?.();
    },
  });

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showConfirmAlert) {
          setShowConfirmAlert(false);
        } else {
          onClose();
        }
      }
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      cleanup = () => {
        document.removeEventListener("keydown", onKey);
      };
    }
    return cleanup;
  }, [open, onClose, showConfirmAlert]);

  if (!mounted) {
    return null;
  }

  const isConfirmed =
    confirmationStatus?.state === "CONFIRMED" ||
    (confirmationStatus?.confirmedAt !== null && confirmationStatus?.confirmedAt !== undefined);
  const isOpen = confirmationStatus?.isOpen === true;
  const isComplete = confirmationStatus?.isComplete === true;

  const activeParticipants = confirmationStatus?.participants ?? [];
  const currentParticipant = activeParticipants[activeTab] ?? activeParticipants[0];

  const participantDetail = participants.find((p) => p.id === currentParticipant?.id);
  const currentParticipantName =
    participantDetail === undefined
      ? undefined
      : formatPersonName(
          participantDetail.titleTh,
          participantDetail.firstNameTh,
          participantDetail.middleNameTh,
          participantDetail.lastNameTh,
        );

  const canSubmit = isComplete && agreed && isOpen && !isConfirmed && !submitMutation.isPending;

  function handleFinalSubmit(): void {
    submitMutation.mutate({ teamId });
  }

  function handleOpenConfirmAlert(): void {
    setShowConfirmAlert(true);
  }

  function handleCloseConfirmAlert(): void {
    setShowConfirmAlert(false);
  }

  function handleScrimClick(e: React.MouseEvent<HTMLDivElement>): void {
    if (sheetRef.current && e.target instanceof Node && sheetRef.current.contains(e.target)) {
      return;
    }
    onClose();
  }

  function handleScrimKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
    if (e.key === "Enter" || e.key === " ") {
      if (sheetRef.current && e.target instanceof Node && sheetRef.current.contains(e.target)) {
        return;
      }
      onClose();
    }
  }

  return (
    <>
      <div
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="button"
        tabIndex={0}
        data-state={state}
        className="auth-modal-scrim fixed inset-0 z-50 overflow-y-auto bg-[rgba(194,194,194,0.3)] backdrop-blur-[5px]"
        onClick={handleScrimClick}
        onKeyDown={handleScrimKeyDown}
      >
        <div className="flex min-h-full flex-col items-center justify-center p-2 sm:p-4 md:py-8">
          <div
            ref={sheetRef}
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
            role="dialog"
            aria-modal="true"
            aria-label="ยืนยันสิทธิ์การเข้าแข่งขันรอบรองชนะเลิศ"
            tabIndex={-1}
            data-state={state}
            className="auth-modal-sheet relative flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[24px] border border-[#dcdcdc] bg-white shadow-2xl outline-none sm:rounded-[28px]"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิด"
              className="mm-press-icon absolute top-5 right-5 z-10 size-[32px] overflow-clip transition-opacity hover:opacity-70"
            >
              <img src={CLOSE} alt="" aria-hidden className="block size-full" />
            </button>

            <ModalHeader isConfirmed={isConfirmed} />

            <ModalBody
              isPending={isPending}
              error={error}
              hasStatus={confirmationStatus !== undefined}
              activeParticipants={activeParticipants}
              participants={participants}
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              currentParticipant={currentParticipant}
              currentParticipantName={currentParticipantName}
              teamId={teamId}
              isConfirmed={isConfirmed}
              isOpen={isOpen}
              onRefresh={() => {
                void refetch();
              }}
            />

            <ModalFooter
              isConfirmed={isConfirmed}
              confirmedAt={confirmationStatus?.confirmedAt}
              isOpen={isOpen}
              agreed={agreed}
              canSubmit={canSubmit}
              isSubmitting={submitMutation.isPending}
              onAgreeChange={setAgreed}
              onClose={onClose}
              onSubmitClick={handleOpenConfirmAlert}
            />
          </div>
        </div>
      </div>

      {showConfirmAlert ? (
        <ConfirmAlertDialog
          isSubmitting={submitMutation.isPending}
          onCancel={handleCloseConfirmAlert}
          onConfirm={handleFinalSubmit}
        />
      ) : null}
    </>
  );
}
