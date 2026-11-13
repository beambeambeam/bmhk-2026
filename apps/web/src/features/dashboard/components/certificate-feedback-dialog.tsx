import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Dialog } from "@base-ui/react/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, X } from "lucide-react";

import { orpc } from "@bmhk-2026/client/orpc";

import {
  CHANNEL_LABEL,
  CHANNELS,
  CHOICE_MAX_LENGTH,
  COMMENT_MAX_LENGTH,
  DECISION_FACTORS,
  EVENT_RATINGS,
  FACULTIES,
  OTHER_CHOICE,
  RATINGS,
  UNDECIDED_CHOICE,
  UNIVERSITIES,
} from "../certificate-feedback-data";
import type {
  DecisionFactorKey,
  EventRatingKey,
  FeedbackChannel,
} from "../certificate-feedback-data";
import { EMPTY_FEEDBACK_DRAFT, buildFeedbackInput } from "../certificate-feedback-input";
import type {
  FeedbackDraft,
  FeedbackErrors,
  FeedbackFieldId,
  Rating,
} from "../certificate-feedback-input";
import { mergeUniversityNames, tcasUniversitiesQueryOptions } from "../tcas-universities";

const TITLE = "แบบสอบถามก่อนดาวน์โหลดเกียรติบัตร";
const DESCRIPTION = "ตอบแบบสอบถามครั้งเดียวต่อทีม แล้วดาวน์โหลดเกียรติบัตรของทุกคนในทีมได้ทันที คำถามที่มี * ต้องตอบ";
const SUBMIT_ERROR = "ส่งแบบสอบถามไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
const FIX_ERRORS = "ยังตอบไม่ครบ กรุณาตรวจคำถามที่มีข้อความสีแดง";

const CONTROL =
  "w-full rounded-[10px] border border-[#dcdcdc] bg-white px-3 py-2 fl-14 leading-normal outline-none transition-colors focus-visible:border-brand-red aria-invalid:border-brand-red";
const SECTION_TITLE = "fl-16 font-semibold leading-normal text-ink";

function errorId(field: FeedbackFieldId): string {
  return `certificate-feedback-${field.replace(".", "-")}-error`;
}

function inputId(field: FeedbackFieldId): string {
  return `certificate-feedback-${field.replace(".", "-")}`;
}

function FieldError({ field, errors }: { field: FeedbackFieldId; errors: FeedbackErrors }) {
  const message = errors[field];
  if (message === undefined) {
    return null;
  }
  return (
    <p id={errorId(field)} className="fl-12 leading-normal text-brand-red">
      {message}
    </p>
  );
}

function invalidProps(field: FeedbackFieldId, errors: FeedbackErrors) {
  const invalid = errors[field] !== undefined;
  return {
    "aria-describedby": invalid ? errorId(field) : undefined,
    "aria-invalid": invalid || undefined,
  };
}

function OtherInput({
  field,
  label,
  value,
  errors,
  onChange,
}: {
  field: FeedbackFieldId;
  label: string;
  value: string;
  errors: FeedbackErrors;
  onChange: (value: string) => void;
}) {
  return (
    <div data-field={field} className="flex flex-col gap-1">
      <label htmlFor={inputId(field)} className="fl-12 leading-normal text-gray-2">
        {label}
      </label>
      <input
        id={inputId(field)}
        type="text"
        value={value}
        maxLength={CHOICE_MAX_LENGTH}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className={CONTROL}
        {...invalidProps(field, errors)}
      />
      <FieldError field={field} errors={errors} />
    </div>
  );
}

function RatingQuestion({
  field,
  label,
  value,
  errors,
  onChange,
}: {
  field: FeedbackFieldId;
  label: string;
  value: Rating | undefined;
  errors: FeedbackErrors;
  onChange: (rating: Rating) => void;
}) {
  const name = inputId(field);
  return (
    <fieldset
      data-field={field}
      className="flex flex-col gap-2 border-0 p-0"
      {...invalidProps(field, errors)}
    >
      <legend className="mb-2 fl-14 leading-normal">
        {label} <span className="text-brand-red">*</span>
      </legend>
      <div className="flex items-center gap-2">
        <span aria-hidden className="fl-12 text-gray-2">
          น้อยที่สุด
        </span>
        {RATINGS.map((rating) => (
          <label key={rating} className="flex flex-col items-center">
            <input
              type="radio"
              name={name}
              value={rating}
              checked={value === rating}
              onChange={() => {
                onChange(rating);
              }}
              className="peer sr-only"
            />
            <span className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-[#dcdcdc] fl-14 transition-colors peer-checked:border-brand-red peer-checked:bg-brand-red peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-red">
              {rating}
            </span>
          </label>
        ))}
        <span aria-hidden className="fl-12 text-gray-2">
          มากที่สุด
        </span>
      </div>
      <FieldError field={field} errors={errors} />
    </fieldset>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className={SECTION_TITLE}>{title}</h3>
      {children}
    </section>
  );
}

function filterUniversity(item: string, query: string): boolean {
  if (item === OTHER_CHOICE || item === UNDECIDED_CHOICE) {
    return true;
  }
  return item.toLowerCase().includes(query.trim().toLowerCase());
}

/**
 * The team questionnaire that unlocks certificate downloads. The draft lives here, outside
 * the dialog popup, so closing the dialog by mistake does not lose the answers.
 */
export default function CertificateFeedbackDialog({
  open,
  onOpenChange,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
}) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<FeedbackDraft>(EMPTY_FEEDBACK_DRAFT);
  const [errors, setErrors] = useState<FeedbackErrors>({});
  // The built-in list shows at once; the live myTCAS names join it when they load.
  const { data: liveUniversities } = useQuery({ ...tcasUniversitiesQueryOptions, enabled: open });
  const universityItems = useMemo(
    () => [
      ...mergeUniversityNames(UNIVERSITIES, liveUniversities ?? []),
      OTHER_CHOICE,
      UNDECIDED_CHOICE,
    ],
    [liveUniversities],
  );

  const submit = useMutation({
    ...orpc.certificates.mineFeedback.mutationOptions(),
    onSuccess: () => {
      queryClient.setQueryData(orpc.certificates.mine.queryOptions().queryKey, (old) =>
        old === undefined ? old : { ...old, feedbackSubmitted: true },
      );
      onOpenChange(false);
      onSubmitted();
    },
  });

  function update(fields: FeedbackFieldId[], next: Partial<FeedbackDraft>) {
    setDraft((current) => ({ ...current, ...next }));
    setErrors((current) => {
      const cleared: FeedbackErrors = { ...current };
      for (const field of fields) {
        cleared[field] = undefined;
      }
      return cleared;
    });
  }

  function setDecisionFactor(key: DecisionFactorKey, rating: Rating) {
    update([`decisionFactors.${key}`], {
      decisionFactors: { ...draft.decisionFactors, [key]: rating },
    });
  }

  function setEventRating(key: EventRatingKey, rating: Rating) {
    update([`event.${key}`], { event: { ...draft.event, [key]: rating } });
  }

  function toggleChannel(channel: FeedbackChannel, checked: boolean) {
    const channels = checked
      ? [...draft.channels, channel]
      : draft.channels.filter((item) => item !== channel);
    update(["channels", "channelOther"], { channels });
  }

  function focusFirstError(found: FeedbackErrors) {
    const [first] = Object.keys(found);
    const target = formRef.current?.querySelector<HTMLElement>(
      `[data-field="${first}"] input, [data-field="${first}"] select`,
    );
    target?.focus();
  }

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submit.isPending) {
      return;
    }
    const result = buildFeedbackInput(draft);
    if (result.errors) {
      setErrors(result.errors);
      focusFirstError(result.errors);
      return;
    }
    submit.mutate(result.input);
  }

  const hasErrors = Object.values(errors).some((message) => message !== undefined);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-[rgba(194,194,194,0.3)] backdrop-blur-[5px]" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex justify-center overflow-y-auto px-4 py-8">
          <Dialog.Popup className="relative h-fit w-full max-w-[760px] rounded-[28px] border border-[#dcdcdc] bg-white p-6 outline-none sm:p-8">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex flex-1 flex-col gap-1">
                <Dialog.Title className="fl-20 font-display font-semibold text-ink">
                  {TITLE}
                </Dialog.Title>
                <Dialog.Description className="fl-14 leading-normal text-gray-2">
                  {DESCRIPTION}
                </Dialog.Description>
              </div>
              <Dialog.Close
                aria-label="ปิดแบบสอบถาม"
                className="mm-press flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f6f6f6] hover:bg-[#ececec]"
              >
                <X aria-hidden className="size-4" />
              </Dialog.Close>
            </div>

            <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex flex-col gap-8">
              <Section title="ส่วนที่ 1 ข้อมูลการศึกษาต่อ">
                <div data-field="faculty" className="flex flex-col gap-1">
                  <label htmlFor={inputId("faculty")} className="fl-14 leading-normal">
                    คณะที่สนใจศึกษาต่อ <span className="text-brand-red">*</span>
                  </label>
                  <select
                    id={inputId("faculty")}
                    value={draft.faculty}
                    onChange={(event) => {
                      update(["faculty", "facultyOther"], { faculty: event.target.value });
                    }}
                    className={CONTROL}
                    {...invalidProps("faculty", errors)}
                  >
                    <option value="" disabled>
                      เลือกคณะ
                    </option>
                    {[...FACULTIES, OTHER_CHOICE, UNDECIDED_CHOICE].map((faculty) => (
                      <option key={faculty} value={faculty}>
                        {faculty}
                      </option>
                    ))}
                  </select>
                  <FieldError field="faculty" errors={errors} />
                </div>
                {draft.faculty === OTHER_CHOICE ? (
                  <OtherInput
                    field="facultyOther"
                    label="ระบุคณะ"
                    value={draft.facultyOther}
                    errors={errors}
                    onChange={(facultyOther) => {
                      update(["facultyOther"], { facultyOther });
                    }}
                  />
                ) : null}

                <div data-field="university" className="flex flex-col gap-1">
                  <label htmlFor={inputId("university")} className="fl-14 leading-normal">
                    มหาวิทยาลัยที่สนใจศึกษาต่อ <span className="text-brand-red">*</span>
                  </label>
                  <Combobox.Root
                    items={universityItems}
                    filter={filterUniversity}
                    value={draft.university === "" ? null : draft.university}
                    onValueChange={(university) => {
                      update(["university", "universityOther"], { university: university ?? "" });
                    }}
                  >
                    <Combobox.InputGroup className="relative">
                      <Combobox.Input
                        id={inputId("university")}
                        placeholder="พิมพ์เพื่อค้นหามหาวิทยาลัย"
                        className={`${CONTROL} pr-10`}
                        {...invalidProps("university", errors)}
                      />
                      <Combobox.Trigger
                        aria-label="แสดงรายชื่อมหาวิทยาลัย"
                        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-2"
                      >
                        <ChevronDown aria-hidden className="size-4" />
                      </Combobox.Trigger>
                    </Combobox.InputGroup>
                    <Combobox.Portal>
                      <Combobox.Positioner sideOffset={4} className="z-50">
                        <Combobox.Popup className="max-h-[min(320px,var(--available-height))] w-(--anchor-width) overflow-y-auto rounded-[12px] border border-[#dcdcdc] bg-white p-1 shadow-soft">
                          <Combobox.Empty className="px-3 py-2 fl-14 text-gray-2 empty:hidden">
                            ไม่พบมหาวิทยาลัย
                          </Combobox.Empty>
                          <Combobox.List>
                            {(university: string) => (
                              <Combobox.Item
                                key={university}
                                value={university}
                                className="cursor-pointer rounded-[8px] px-3 py-2 fl-14 leading-normal data-highlighted:bg-[#f6f6f6] data-selected:font-medium"
                              >
                                {university}
                              </Combobox.Item>
                            )}
                          </Combobox.List>
                        </Combobox.Popup>
                      </Combobox.Positioner>
                    </Combobox.Portal>
                  </Combobox.Root>
                  <FieldError field="university" errors={errors} />
                </div>
                {draft.university === OTHER_CHOICE ? (
                  <OtherInput
                    field="universityOther"
                    label="ระบุมหาวิทยาลัย"
                    value={draft.universityOther}
                    errors={errors}
                    onChange={(universityOther) => {
                      update(["universityOther"], { universityOther });
                    }}
                  />
                ) : null}

                <p className="fl-14 leading-normal text-gray-2">
                  ปัจจัยต่อไปนี้มีผลต่อการตัดสินใจเลือกคณะและมหาวิทยาลัยมากน้อยเพียงใด
                </p>
                {DECISION_FACTORS.map(([key, label]) => (
                  <RatingQuestion
                    key={key}
                    field={`decisionFactors.${key}`}
                    label={label}
                    value={draft.decisionFactors[key]}
                    errors={errors}
                    onChange={(rating) => {
                      setDecisionFactor(key, rating);
                    }}
                  />
                ))}
              </Section>

              <Section title="ส่วนที่ 2 ความคิดเห็นต่อการแข่งขัน">
                <fieldset
                  data-field="channels"
                  className="flex flex-col gap-2 border-0 p-0"
                  {...invalidProps("channels", errors)}
                >
                  <legend className="mb-2 fl-14 leading-normal">
                    รู้จักการแข่งขันจากช่องทางใด (เลือกได้มากกว่า 1 ข้อ){" "}
                    <span className="text-brand-red">*</span>
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CHANNELS.map((channel) => (
                      <label key={channel} className="flex items-center gap-2 fl-14 leading-normal">
                        <input
                          type="checkbox"
                          checked={draft.channels.includes(channel)}
                          onChange={(event) => {
                            toggleChannel(channel, event.target.checked);
                          }}
                          className="size-4 accent-brand-red"
                        />
                        {CHANNEL_LABEL[channel]}
                      </label>
                    ))}
                  </div>
                  <FieldError field="channels" errors={errors} />
                </fieldset>
                {draft.channels.includes("OTHER") ? (
                  <OtherInput
                    field="channelOther"
                    label="ระบุช่องทาง"
                    value={draft.channelOther}
                    errors={errors}
                    onChange={(channelOther) => {
                      update(["channelOther"], { channelOther });
                    }}
                  />
                ) : null}

                {EVENT_RATINGS.map(([key, label]) => (
                  <RatingQuestion
                    key={key}
                    field={`event.${key}`}
                    label={label}
                    value={draft.event[key]}
                    errors={errors}
                    onChange={(rating) => {
                      setEventRating(key, rating);
                    }}
                  />
                ))}

                <div className="flex flex-col gap-1">
                  <label htmlFor="certificate-feedback-comment" className="fl-14 leading-normal">
                    ข้อเสนอแนะเพิ่มเติม
                  </label>
                  <textarea
                    id="certificate-feedback-comment"
                    rows={4}
                    value={draft.comment}
                    maxLength={COMMENT_MAX_LENGTH}
                    onChange={(event) => {
                      update([], { comment: event.target.value });
                    }}
                    className={`${CONTROL} resize-y`}
                  />
                </div>
              </Section>

              <div className="flex flex-col gap-2">
                {hasErrors ? (
                  <p role="alert" className="fl-12 leading-normal text-brand-red">
                    {FIX_ERRORS}
                  </p>
                ) : null}
                {submit.isError ? (
                  <p role="alert" className="fl-12 leading-normal text-brand-red">
                    {SUBMIT_ERROR}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={submit.isPending}
                  className="mm-press flex w-full items-center justify-center gap-2 rounded-[12px] bg-brand-red px-4 py-3 fl-14 font-medium text-white disabled:opacity-60"
                >
                  {submit.isPending ? (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                  ) : null}
                  ส่งแบบสอบถามและปลดล็อกการดาวน์โหลด
                </button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
