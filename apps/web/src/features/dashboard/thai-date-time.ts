import { format } from "date-fns";
import { th } from "date-fns/locale";

export interface ThaiDateTimeParts {
  dayMonth: string;
  time: string;
  yearBe: string;
}

export function getThaiDateTimeParts(
  date: Date | string | null | undefined,
): ThaiDateTimeParts | null {
  if (date === null || date === undefined) {
    return null;
  }

  const dateObj = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(dateObj.getTime())) {
    return null;
  }

  return {
    dayMonth: format(dateObj, "dd MMM", { locale: th }),
    time: format(dateObj, "HH:mm"),
    yearBe: (dateObj.getFullYear() + 543).toString(),
  };
}
