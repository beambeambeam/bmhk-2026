import { describe, expect, it } from "vitest";

import { EMPTY_FEEDBACK_DRAFT, buildFeedbackInput } from "../certificate-feedback-input";
import type { FeedbackDraft } from "../certificate-feedback-input";

const ALL_THREE = {
  admissionQuota: 3,
  camp: 3,
  campusEnvironment: 3,
  educationGuidance: 3,
  familyAdvice: 3,
  internationalOpportunity: 3,
  jobMarket: 3,
  modernEquipment: 3,
  openHouse: 3,
  reputation: 3,
  scholarship: 3,
  seniorAdvice: 3,
  teacherAdvice: 3,
} as const;

const EVENT_FIVE = {
  overallSatisfaction: 5,
  publicity: 5,
  schedule: 5,
  usefulness: 5,
  websiteDesign: 5,
  websiteUsability: 5,
} as const;

const answered: FeedbackDraft = {
  ...EMPTY_FEEDBACK_DRAFT,
  channelOther: "  ป้ายหน้าโรงเรียน ",
  channels: ["FRIEND", "OTHER"],
  decisionFactors: ALL_THREE,
  event: EVENT_FIVE,
  faculty: "อื่น ๆ โปรดระบุ",
  facultyOther: " คณะสัตวแพทยศาสตร์ ",
  university: "อื่น ๆ โปรดระบุ",
  universityOther: "University of Tokyo",
};

describe(buildFeedbackInput, () => {
  it("sends the typed text for other answers", () => {
    expect(buildFeedbackInput(answered)).toStrictEqual({
      errors: null,
      input: {
        channelOther: "ป้ายหน้าโรงเรียน",
        channels: ["FRIEND", "OTHER"],
        comment: null,
        decisionFactors: ALL_THREE,
        event: EVENT_FIVE,
        intendedFaculty: "คณะสัตวแพทยศาสตร์",
        intendedUniversity: "University of Tokyo",
      },
    });
  });

  it("drops other channel text once other is unticked", () => {
    const result = buildFeedbackInput({ ...answered, channels: ["FRIEND"] });

    expect(result.input?.channelOther).toBeNull();
  });

  it("asks for the other text when it is blank", () => {
    const result = buildFeedbackInput({
      ...answered,
      channelOther: " ",
      facultyOther: "",
      universityOther: "",
    });

    expect(result.errors).toStrictEqual({
      channelOther: "กรุณาระบุคำตอบ",
      facultyOther: "กรุณาระบุคำตอบ",
      universityOther: "กรุณาระบุคำตอบ",
    });
  });

  it("lists every missing answer of an empty form", () => {
    const { errors } = buildFeedbackInput(EMPTY_FEEDBACK_DRAFT);

    expect(Object.keys(errors ?? {})).toHaveLength(2 + 13 + 1 + 6);
    expect(errors?.channels).toBe("กรุณาเลือกอย่างน้อย 1 ช่องทาง");
    expect(errors?.["event.schedule"]).toBe("กรุณาตอบคำถามนี้");
  });
});
