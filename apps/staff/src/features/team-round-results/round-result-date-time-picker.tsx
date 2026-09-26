import { TZDate } from "react-day-picker";
import { th } from "react-day-picker/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/button";
import { Calendar } from "@/components/calendar";
import { Field, FieldGroup, FieldLabel } from "@/components/field";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";

import {
  bangkokDateTimeInputError,
  bangkokDateTimeInputToIso,
  dateToBangkokInputValue,
  formatBangkokDateTime,
} from "./round-result-datetime";

const BANGKOK_TIME_ZONE = "Asia/Bangkok";
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;
const DATE_END_OFFSET = 10;
const HOUR_START_OFFSET = 11;
const MINUTE_START_OFFSET = 14;

const hourValues = Array.from({ length: HOURS_IN_DAY }, (_, hour) => String(hour).padStart(2, "0"));
const minuteValues = Array.from({ length: MINUTES_IN_HOUR }, (_, minute) =>
  String(minute).padStart(2, "0"),
);

interface RoundResultDateTimePickerProps {
  readonly id: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onBlur: () => void;
  readonly disabled?: boolean;
  readonly ariaInvalid?: boolean;
}

function getSelectedDate(value: string): Date | undefined {
  if (value === "" || bangkokDateTimeInputError(value) !== undefined) {
    return undefined;
  }

  const isoDate = bangkokDateTimeInputToIso(value);
  return isoDate === null ? undefined : new TZDate(isoDate, BANGKOK_TIME_ZONE);
}

function getTimePart(value: string, start: number): string | null {
  if (getSelectedDate(value) === undefined) {
    return null;
  }

  return value.slice(start, start + 2);
}

function RoundResultDateTimePicker({
  id,
  value,
  onValueChange,
  onBlur,
  disabled = false,
  ariaInvalid = false,
}: RoundResultDateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = getSelectedDate(value);
  const hour = getTimePart(value, HOUR_START_OFFSET);
  const minute = getTimePart(value, MINUTE_START_OFFSET);

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      onBlur();
    }

    setIsOpen(nextOpen);
  }

  function handleSelectDate(date: Date | undefined): void {
    if (date === undefined) {
      return;
    }

    const selectedDateValue = dateToBangkokInputValue(date).slice(0, DATE_END_OFFSET);
    const nextHour = hour ?? "00";
    const nextMinute = minute ?? "00";
    onValueChange(`${selectedDateValue}T${nextHour}:${nextMinute}`);
  }

  function handleTimeChange(part: "hour" | "minute", nextValue: string | null): void {
    if (selectedDate === undefined || nextValue === null) {
      return;
    }

    const nextHour = part === "hour" ? nextValue : (hour ?? "00");
    const nextMinute = part === "minute" ? nextValue : (minute ?? "00");
    const selectedDateValue = dateToBangkokInputValue(selectedDate).slice(0, DATE_END_OFFSET);
    onValueChange(`${selectedDateValue}T${nextHour}:${nextMinute}`);
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            aria-invalid={ariaInvalid || undefined}
            className="w-full justify-start font-normal"
            disabled={disabled}
            type="button"
            variant="outline"
          />
        }
      >
        <CalendarIcon aria-hidden="true" data-icon="inline-start" />
        {selectedDate === undefined ? "เลือกวันที่และเวลา" : formatBangkokDateTime(selectedDate)}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <PopoverTitle className="sr-only">เลือกวันและเวลาที่ส่งงานล่าสุด</PopoverTitle>
        <Calendar
          defaultMonth={selectedDate}
          disabled={disabled}
          mode="single"
          locale={th}
          selected={selectedDate}
          onSelect={handleSelectDate}
          timeZone={BANGKOK_TIME_ZONE}
        />
        <FieldGroup className="grid grid-cols-2 gap-3">
          <Field data-disabled={disabled || selectedDate === undefined}>
            <FieldLabel htmlFor={`${id}-hour`}>ชั่วโมง</FieldLabel>
            <Select
              disabled={disabled || selectedDate === undefined}
              value={hour}
              onValueChange={(nextValue) => {
                handleTimeChange("hour", nextValue);
              }}
            >
              <SelectTrigger id={`${id}-hour`} className="w-full">
                <SelectValue placeholder="--" />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                <SelectGroup>
                  {hourValues.map((timeValue) => (
                    <SelectItem key={timeValue} value={timeValue}>
                      {timeValue}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field data-disabled={disabled || selectedDate === undefined}>
            <FieldLabel htmlFor={`${id}-minute`}>นาที</FieldLabel>
            <Select
              disabled={disabled || selectedDate === undefined}
              value={minute}
              onValueChange={(nextValue) => {
                handleTimeChange("minute", nextValue);
              }}
            >
              <SelectTrigger id={`${id}-minute`} className="w-full">
                <SelectValue placeholder="--" />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                <SelectGroup>
                  {minuteValues.map((timeValue) => (
                    <SelectItem key={timeValue} value={timeValue}>
                      {timeValue}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
        <div className="flex justify-between gap-2">
          <Button
            disabled={disabled || value === ""}
            onClick={() => {
              onValueChange("");
            }}
            type="button"
            variant="ghost"
          >
            ล้างวันที่และเวลา
          </Button>
          <Button
            onClick={() => {
              setIsOpen(false);
            }}
            type="button"
            variant="outline"
          >
            เสร็จสิ้น
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { RoundResultDateTimePicker };
