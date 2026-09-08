"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { CalendarChevronLeftIcon, CalendarChevronRightIcon } from "../icons/CalendarIcons";
import { buttonVariants } from "./button";

type CalendarProps = {
  ariaLabel?: string;
  className?: string;
  classNames?: {
    months?: string;
    month?: string;
    caption?: string;
    caption_label?: string;
    nav?: string;
    nav_button?: string;
    nav_button_previous?: string;
    nav_button_next?: string;
    table?: string;
    head_row?: string;
    head_cell?: string;
    row?: string;
    cell?: string;
    day?: string;
    day_selected?: string;
    day_today?: string;
    day_outside?: string;
    day_disabled?: string;
    day_hidden?: string;
  };
  defaultMonth?: Date;
  showOutsideDays?: boolean;
  selected?: Date;
  today?: Date;
  onSelect?: (date: Date | undefined) => void;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  disabled?: (date: Date) => boolean;
};

const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const WEEK_DAY_LABELS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

const startOfDay = (date: Date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const isSameMonth = (left: Date, right: Date) => (
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth()
);

const formatDateLabel = (date: Date) => (
  `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEK_DAY_LABELS[date.getDay()]}`
);

const getAdjacentMonthDate = (date: Date, offset: number) => {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + offset + 1, 0).getDate();
  return new Date(
    date.getFullYear(),
    date.getMonth() + offset,
    Math.min(date.getDate(), lastDay),
  );
};

const isSameDay = (left?: Date, right?: Date) => {
  if (!left || !right) {
    return false;
  }

  return startOfDay(left).getTime() === startOfDay(right).getTime();
};

const getMonthGrid = (currentMonth: Date, showOutsideDays: boolean) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const firstWeekday = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();
  const weeks: Date[][] = [];
  let cursor = 1 - firstWeekday;

  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const week: Date[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      let date: Date;

      if (cursor < 1) {
        date = new Date(year, month - 1, daysInPreviousMonth + cursor);
      } else if (cursor > daysInMonth) {
        date = new Date(year, month + 1, cursor - daysInMonth);
      } else {
        date = new Date(year, month, cursor);
      }

      week.push(date);
      cursor += 1;
    }

    if (
      !showOutsideDays
      && week.every((date) => date.getMonth() !== month)
    ) {
      continue;
    }

    weeks.push(week);
  }

  return weeks;
};

function Calendar({
  ariaLabel = "날짜 선택",
  className,
  classNames,
  defaultMonth,
  showOutsideDays = true,
  selected,
  today: todayProp,
  onSelect,
  month,
  onMonthChange,
  disabled,
}: CalendarProps) {
  const [internalMonth, setInternalMonth] = React.useState(
    () => startOfMonth(month ?? defaultMonth ?? selected ?? todayProp ?? new Date()),
  );
  const displayedMonth = React.useMemo(
    () => startOfMonth(month ?? internalMonth),
    [internalMonth, month],
  );

  const weeks = React.useMemo(
    () => getMonthGrid(displayedMonth, showOutsideDays),
    [displayedMonth, showOutsideDays],
  );
  const today = React.useMemo(() => startOfDay(todayProp ?? new Date()), [todayProp]);
  const captionId = React.useId();
  const dayButtonRefs = React.useRef(new Map<number, HTMLButtonElement>());
  const pendingFocusRef = React.useRef<number | null>(null);
  const [focusedDate, setFocusedDate] = React.useState(
    () => startOfDay(selected ?? month ?? defaultMonth ?? todayProp ?? new Date()),
  );

  React.useEffect(() => {
    setFocusedDate((current) => {
      if (selected && isSameMonth(selected, displayedMonth)) {
        return startOfDay(selected);
      }
      return isSameMonth(current, displayedMonth) ? current : displayedMonth;
    });
  }, [displayedMonth, selected]);

  React.useEffect(() => {
    const pendingFocus = pendingFocusRef.current;
    if (pendingFocus === null) {
      return;
    }
    const target = dayButtonRefs.current.get(pendingFocus);
    if (target) {
      target.focus();
      pendingFocusRef.current = null;
    }
  }, [displayedMonth, focusedDate]);

  const updateMonth = (offset: number) => {
    const nextMonth = new Date(
      displayedMonth.getFullYear(),
      displayedMonth.getMonth() + offset,
      1,
    );
    if (!month) {
      setInternalMonth(nextMonth);
    }
    onMonthChange?.(nextMonth);
  };

  const focusDate = (date: Date) => {
    const nextDate = startOfDay(date);
    let enabledDate = nextDate;
    const direction = nextDate.getTime() < focusedDate.getTime() ? -1 : 1;

    for (let attempt = 0; attempt < 366 && disabled?.(enabledDate); attempt += 1) {
      enabledDate = new Date(
        enabledDate.getFullYear(),
        enabledDate.getMonth(),
        enabledDate.getDate() + direction,
      );
    }

    if (disabled?.(enabledDate)) {
      return;
    }

    pendingFocusRef.current = enabledDate.getTime();
    setFocusedDate(enabledDate);
    if (!isSameMonth(enabledDate, displayedMonth)) {
      const nextMonth = startOfMonth(enabledDate);
      if (!month) {
        setInternalMonth(nextMonth);
      }
      onMonthChange?.(nextMonth);
    }
  };

  const handleDayKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, date: Date) => {
    let nextDate: Date | undefined;

    if (event.key === 'ArrowLeft') nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
    if (event.key === 'ArrowRight') nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    if (event.key === 'ArrowUp') nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7);
    if (event.key === 'ArrowDown') nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
    if (event.key === 'PageUp') nextDate = getAdjacentMonthDate(date, -1);
    if (event.key === 'PageDown') nextDate = getAdjacentMonthDate(date, 1);
    if (event.key === 'Home') nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
    if (event.key === 'End') nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 6 - date.getDay());

    if (nextDate) {
      event.preventDefault();
      focusDate(nextDate);
    }
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("w-full max-w-full p-1 sm:p-3", classNames?.months, className)}
    >
      <div className={cn("flex flex-col gap-4", classNames?.month)}>
        <div className={cn("relative flex min-h-11 w-full items-center justify-center sm:min-h-7", classNames?.caption)}>
          <div
            id={captionId}
            aria-live="polite"
            className={cn("text-15 font-semibold", classNames?.caption_label)}
          >
            {displayedMonth.getFullYear()}년 {displayedMonth.getMonth() + 1}월
          </div>
          <div className={cn("absolute inset-x-0 top-0 flex items-center justify-between", classNames?.nav)}>
            <button
              type="button"
              onClick={() => updateMonth(-1)}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "size-11 sm:size-7 bg-transparent p-0 opacity-70 hover:opacity-100",
                classNames?.nav_button,
                classNames?.nav_button_previous,
              )}
              aria-label="이전 달"
            >
              <CalendarChevronLeftIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => updateMonth(1)}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "size-11 sm:size-7 bg-transparent p-0 opacity-70 hover:opacity-100",
                classNames?.nav_button,
                classNames?.nav_button_next,
              )}
              aria-label="다음 달"
            >
              <CalendarChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>

        <div
          role="grid"
          aria-labelledby={captionId}
          className={cn("w-full border-collapse space-y-1", classNames?.table)}
        >
          <div role="row" className={cn("grid grid-cols-7", classNames?.head_row)}>
            {WEEK_DAYS.map((day, dayIndex) => (
              <div
                key={day}
                role="columnheader"
                aria-label={WEEK_DAY_LABELS[dayIndex]}
                className={cn(
                  "text-muted-foreground mx-auto w-full rounded-md text-center text-caption font-semibold",
                  classNames?.head_cell,
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {weeks.map((week, weekIndex) => (
            <div
              key={`${displayedMonth.toISOString()}-${weekIndex}`}
              role="row"
              className={cn("mt-2 grid grid-cols-7", classNames?.row)}
            >
              {week.map((date) => {
                const isOutside = date.getMonth() !== displayedMonth.getMonth();
                const isSelected = isSameDay(selected, date);
                const isToday = isSameDay(today, date);
                const isDisabled = disabled?.(date) ?? false;
                const isFocusedDate = isSameDay(focusedDate, date);

                if (isOutside && !showOutsideDays) {
                  return (
                    <div
                      key={date.toISOString()}
                      role="gridcell"
                      aria-hidden="true"
                      className={cn("relative p-0 text-center text-15", classNames?.cell)}
                    >
                      <span className={cn("invisible mx-auto block h-11 w-full sm:size-8", classNames?.day_hidden)} />
                    </div>
                  );
                }

                return (
                  <div
                    key={date.toISOString()}
                    role="gridcell"
                    aria-selected={isSelected}
                    className={cn(
                      "relative p-0 text-center text-15",
                      classNames?.cell,
                    )}
                  >
                    <button
                      ref={(node) => {
                        const dateKey = startOfDay(date).getTime();
                        if (node) dayButtonRefs.current.set(dateKey, node);
                        else dayButtonRefs.current.delete(dateKey);
                      }}
                      type="button"
                      data-calendar-date={`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`}
                      aria-current={isToday ? 'date' : undefined}
                      aria-label={formatDateLabel(date)}
                      tabIndex={isFocusedDate ? 0 : -1}
                      onClick={() => {
                        if (!isDisabled) {
                          onSelect?.(date);
                        }
                      }}
                      onFocus={() => setFocusedDate(startOfDay(date))}
                      onKeyDown={(event) => handleDayKeyDown(event, date)}
                      disabled={isDisabled}
                      className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "mx-auto h-11 w-full sm:size-8 p-0 font-semibold",
                        isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                        isToday && !isSelected && "bg-accent text-accent-foreground",
                        isOutside && "text-muted-foreground",
                        isDisabled && "text-muted-foreground opacity-50",
                        classNames?.day,
                        isSelected && classNames?.day_selected,
                        isToday && classNames?.day_today,
                        isOutside && classNames?.day_outside,
                        isDisabled && classNames?.day_disabled,
                      )}
                    >
                      {date.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { Calendar };
