import {
  DECISION_FACTORS,
  EVENT_RATINGS,
  OTHER_CHOICE,
  UNDECIDED_CHOICE,
} from "./certificate-feedback-data";
import type {
  CertificateFeedbackInput,
  DecisionFactorKey,
  EventRatingKey,
  FeedbackChannel,
} from "./certificate-feedback-data";

export type Rating = 1 | 2 | 3 | 4 | 5;

export interface FeedbackDraft {
  channelOther: string;
  channels: FeedbackChannel[];
  comment: string;
  decisionFactors: Partial<Record<DecisionFactorKey, Rating>>;
  event: Partial<Record<EventRatingKey, Rating>>;
  faculty: string;
  facultyOther: string;
  university: string;
  universityOther: string;
}

/** A field id for each question, in the order the form shows them. */
export type FeedbackFieldId =
  | "faculty"
  | "facultyOther"
  | "university"
  | "universityOther"
  | `decisionFactors.${DecisionFactorKey}`
  | "channels"
  | "channelOther"
  | `event.${EventRatingKey}`;

export type FeedbackErrors = Partial<Record<FeedbackFieldId, string>>;

export const EMPTY_FEEDBACK_DRAFT: FeedbackDraft = {
  channelOther: "",
  channels: [],
  comment: "",
  decisionFactors: {},
  event: {},
  faculty: "",
  facultyOther: "",
  university: "",
  universityOther: "",
};

const REQUIRED = "กรุณาตอบคำถามนี้";
const REQUIRED_CHOICE = "กรุณาเลือกคำตอบ";
const REQUIRED_OTHER = "กรุณาระบุคำตอบ";
const REQUIRED_CHANNEL = "กรุณาเลือกอย่างน้อย 1 ช่องทาง";

function readChoice(
  choice: string,
  other: string,
  choiceId: FeedbackFieldId,
  otherId: FeedbackFieldId,
  errors: FeedbackErrors,
): string | null {
  if (choice === "") {
    errors[choiceId] = REQUIRED_CHOICE;
    return null;
  }
  if (choice === UNDECIDED_CHOICE) {
    return null;
  }
  if (choice === OTHER_CHOICE) {
    const value = other.trim();
    if (value === "") {
      errors[otherId] = REQUIRED_OTHER;
    }
    return value;
  }
  return choice;
}

function hasEveryRating<Key extends string>(
  questions: readonly (readonly [Key, string])[],
  answers: Partial<Record<Key, Rating>>,
): answers is Record<Key, Rating> {
  return questions.every(([key]) => answers[key] !== undefined);
}

function markMissingRatings<Key extends string>(
  questions: readonly (readonly [Key, string])[],
  answers: Partial<Record<Key, Rating>>,
  toFieldId: (key: Key) => FeedbackFieldId,
  errors: FeedbackErrors,
) {
  for (const [key] of questions) {
    if (answers[key] === undefined) {
      errors[toFieldId(key)] = REQUIRED;
    }
  }
}

/**
 * Turns the draft into the API input. Returns the errors instead when a required answer is
 * missing. The API checks the same rules; these checks only give faster feedback.
 */
export function buildFeedbackInput(
  draft: FeedbackDraft,
): { errors: FeedbackErrors; input: null } | { errors: null; input: CertificateFeedbackInput } {
  const errors: FeedbackErrors = {};
  const intendedFaculty = readChoice(
    draft.faculty,
    draft.facultyOther,
    "faculty",
    "facultyOther",
    errors,
  );
  const intendedUniversity = readChoice(
    draft.university,
    draft.universityOther,
    "university",
    "universityOther",
    errors,
  );
  markMissingRatings(
    DECISION_FACTORS,
    draft.decisionFactors,
    (key) => `decisionFactors.${key}`,
    errors,
  );
  if (draft.channels.length === 0) {
    errors.channels = REQUIRED_CHANNEL;
  }
  const hasOtherChannel = draft.channels.includes("OTHER");
  const channelOther = draft.channelOther.trim();
  if (hasOtherChannel && channelOther === "") {
    errors.channelOther = REQUIRED_OTHER;
  }
  markMissingRatings(EVENT_RATINGS, draft.event, (key) => `event.${key}`, errors);

  const { decisionFactors, event } = draft;
  const ratingsComplete =
    hasEveryRating(DECISION_FACTORS, decisionFactors) && hasEveryRating(EVENT_RATINGS, event);
  if (!ratingsComplete || Object.keys(errors).length > 0) {
    return { errors, input: null };
  }

  const comment = draft.comment.trim();
  return {
    errors: null,
    input: {
      channelOther: hasOtherChannel ? channelOther : null,
      channels: draft.channels,
      comment: comment === "" ? null : comment,
      decisionFactors,
      event,
      intendedFaculty,
      intendedUniversity,
    },
  };
}
