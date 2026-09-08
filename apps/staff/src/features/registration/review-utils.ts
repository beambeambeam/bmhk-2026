const thaiDateFormatter = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" });
const thaiDateTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function displayValue(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

export function formatStaffDate(date: Date | null | undefined): string {
  return date === null || date === undefined ? "—" : thaiDateFormatter.format(date);
}

export function formatStaffDateTime(date: Date | null | undefined): string {
  return date === null || date === undefined ? "—" : thaiDateTimeFormatter.format(date);
}

export function personName(person: {
  readonly firstNameEn: string;
  readonly lastNameEn: string;
  readonly middleNameEn: string | null;
  readonly titleEn: string;
}): string {
  return [person.titleEn, person.firstNameEn, person.middleNameEn, person.lastNameEn]
    .filter((part) => part !== null && part.length > 0)
    .join(" ");
}
