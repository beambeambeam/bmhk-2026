export function displayValue(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === "" ? "—" : String(value);
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
