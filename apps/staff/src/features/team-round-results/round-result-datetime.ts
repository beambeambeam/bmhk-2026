const BANGKOK_TIME_ZONE = "Asia/Bangkok";
const BANGKOK_UTC_OFFSET_MINUTES = 7 * 60;
const BANGKOK_DATE_TIME_INPUT_PATTERN =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hour>\d{2}):(?<minute>\d{2})$/u;

const bangkokDateTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: BANGKOK_TIME_ZONE,
});

const bangkokInputFormatter = new Intl.DateTimeFormat("en-CA-u-ca-gregory-nu-latn", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  timeZone: BANGKOK_TIME_ZONE,
  year: "numeric",
});

function getBangkokInputParts(date: Date): Record<string, string> {
  return Object.fromEntries(
    bangkokInputFormatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );
}

function getDateFromBangkokInput(value: string): Date | null {
  const match = BANGKOK_DATE_TIME_INPUT_PATTERN.exec(value);
  if (match === null) {
    return null;
  }

  const {
    day: dayValue,
    hour: hourValue,
    minute: minuteValue,
    month: monthValue,
    year: yearValue,
  } = match.groups ?? {};
  if (
    dayValue === undefined ||
    hourValue === undefined ||
    minuteValue === undefined ||
    monthValue === undefined ||
    yearValue === undefined
  ) {
    return null;
  }

  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const localFieldsAsUtc = new Date(0);
  localFieldsAsUtc.setUTCFullYear(year, month - 1, day);
  localFieldsAsUtc.setUTCHours(hour, minute, 0, 0);

  if (
    localFieldsAsUtc.getUTCFullYear() !== year ||
    localFieldsAsUtc.getUTCMonth() !== month - 1 ||
    localFieldsAsUtc.getUTCDate() !== day ||
    localFieldsAsUtc.getUTCHours() !== hour ||
    localFieldsAsUtc.getUTCMinutes() !== minute
  ) {
    return null;
  }

  const instant = new Date(0);
  instant.setUTCFullYear(year, month - 1, day);
  instant.setUTCHours(hour, minute - BANGKOK_UTC_OFFSET_MINUTES, 0, 0);
  return instant;
}

export function dateToBangkokInputValue(value: Date | null): string {
  if (value === null) {
    return "";
  }

  const parts = getBangkokInputParts(value);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function bangkokDateTimeInputError(value: string): string | undefined {
  return value === "" || getDateFromBangkokInput(value) !== null
    ? undefined
    : "กรอกวันและเวลาให้ถูกต้อง";
}

export function bangkokDateTimeInputToIso(value: string): string | null {
  if (value === "") {
    return null;
  }

  const date = getDateFromBangkokInput(value);
  if (date === null) {
    throw new Error("Invalid Asia/Bangkok date and time");
  }

  return date.toISOString();
}

export function formatBangkokDateTime(value: Date | null): string {
  return value === null ? "—" : bangkokDateTimeFormatter.format(value);
}
