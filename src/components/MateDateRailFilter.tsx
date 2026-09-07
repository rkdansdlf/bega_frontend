import { useEffect, useState } from 'react';

import { getDayOfWeek } from '../utils/mate';

interface MateDateRailFilterProps {
  dateItems: Date[];
  selectedDate: Date | null;
  onDateSelect: (date: Date | null) => void;
  visualQaStateOverride?: MateDateRailFilterVisualQaStateOverride;
}

export type MateDateRailFilterVisualQaStateOverride = {
  expanded: boolean;
  interactive: boolean;
};

const FILTER_ACTIVE_CLASS = 'border-primary bg-primary text-primary-foreground dark:border-primary dark:bg-primary dark:text-primary-foreground';
const FILTER_IDLE_CLASS = 'border-gray-200/80 bg-white text-gray-700 hover:border-primary/40 hover:bg-primary/10 hover:text-primary dark:border-white/15 dark:bg-[#000000] dark:text-white dark:hover:bg-primary/20 dark:hover:text-primary';

const toDateString = (date: Date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return [year, month, day].join('-');
};

const formatDateLabel = (date: Date) => {
  const dateString = toDateString(date);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${getDayOfWeek(dateString)}요일`;
};

export default function MateDateRailFilter({
  dateItems,
  selectedDate,
  onDateSelect,
  visualQaStateOverride,
}: MateDateRailFilterProps) {
  const visualQaEnabled = import.meta.env?.PROD !== true && visualQaStateOverride !== undefined;
  const visualQaInteractive = visualQaEnabled && visualQaStateOverride.interactive;
  const [visualQaSelectedDate, setVisualQaSelectedDate] = useState(selectedDate);
  const [showAllDates, setShowAllDates] = useState(
    visualQaEnabled && visualQaStateOverride.expanded,
  );
  const effectiveSelectedDate = visualQaInteractive ? visualQaSelectedDate : selectedDate;
  const visibleDates = showAllDates ? dateItems : dateItems.slice(0, 8);
  const hiddenDateCount = Math.max(0, dateItems.length - visibleDates.length);
  const selectedDateString = effectiveSelectedDate ? toDateString(effectiveSelectedDate) : null;
  const selectedDateIndex = selectedDateString
    ? dateItems.findIndex((date) => toDateString(date) === selectedDateString)
    : -1;
  const selectedDateIsOutsideRange = selectedDateString !== null && selectedDateIndex === -1;
  const selectedDateIsHidden = selectedDateIndex >= visibleDates.length && selectedDateIndex >= 0;

  useEffect(() => {
    if (visualQaInteractive) setVisualQaSelectedDate(selectedDate);
  }, [selectedDate, visualQaInteractive]);

  const handleDateSelect = (date: Date | null) => {
    if (visualQaInteractive) {
      setVisualQaSelectedDate((current) => {
        if (date === null) return null;
        return current && toDateString(current) === toDateString(date) ? null : date;
      });
    }
    onDateSelect(date);
  };

  return (
    <div
      role="group"
      aria-label="경기 날짜 필터"
      data-testid="mate-date-rail-filter"
      data-date-count={dateItems.length}
      data-expanded={showAllDates}
      data-selected-date={selectedDateString ?? 'all'}
      className="min-w-0 p-1 [overflow-wrap:anywhere]"
    >
      <div id="mate-date-rail-grid" className="grid min-w-0 grid-cols-2 gap-2">
        <button
          type="button"
          data-testid="mate-date-rail-all"
          aria-pressed={effectiveSelectedDate === null}
          aria-label={`전체 날짜 필터${effectiveSelectedDate === null ? ', 선택됨' : ''}`}
          onClick={() => handleDateSelect(null)}
          className={`col-span-2 min-h-11 rounded-10 border px-3 py-2 text-13 font-extrabold transition-colors active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#000000] ${
            effectiveSelectedDate === null
              ? FILTER_ACTIVE_CLASS
              : FILTER_IDLE_CLASS
          }`}
        >
          전체 {dateItems.length}일
        </button>
        {visibleDates.map((date, idx) => {
          const dateString = toDateString(date);
          const isSelected = selectedDateString === dateString;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const quickLabel = idx === 0 ? '오늘' : idx === 1 ? '내일' : getDayOfWeek(dateString);
          const dateButtonLabel = formatDateLabel(date);
          const dateFilterLabel = `${dateButtonLabel} 날짜 필터${isSelected ? ', 선택됨' : ''}`;

          return (
            <button
              key={dateString}
              type="button"
              data-testid={`mate-date-rail-date-${dateString}`}
              data-selected={isSelected}
              onClick={() => handleDateSelect(date)}
              aria-label={dateFilterLabel}
              aria-pressed={isSelected}
              className={`flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-10 border px-2.5 py-2 transition-colors active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#000000] ${
                isSelected
                  ? FILTER_ACTIVE_CLASS
                  : FILTER_IDLE_CLASS
              }`}
            >
              <span className={`text-11 font-bold leading-4 ${
                isSelected
                  ? 'text-primary-foreground'
                  : isWeekend
                    ? 'text-primary/80'
                    : 'text-gray-600 dark:text-white'
              }`}
              >
                {quickLabel}
              </span>
              <span className={`text-13 font-black leading-5 ${
                isSelected ? 'text-primary-foreground' : 'text-gray-800 dark:text-white'
              }`}
              >
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {effectiveSelectedDate && (selectedDateIsHidden || selectedDateIsOutsideRange) ? (
        <div
          role="status"
          data-testid="mate-date-rail-selection-summary"
          className="mt-2 min-w-0 rounded-10 border border-primary/20 bg-primary/5 px-3 py-2.5 text-11 font-bold leading-5 text-gray-700 dark:border-primary/30 dark:bg-primary/10 dark:text-white"
        >
          <p className="min-w-0">
            선택 날짜 <span className="text-primary dark:text-primary-light">{formatDateLabel(effectiveSelectedDate)}</span>
          </p>
          {selectedDateIsOutsideRange ? (
            <div className="mt-1 flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 text-gray-500 dark:text-white/70">현재 {dateItems.length}일 범위 밖</span>
              <button
                type="button"
                data-testid="mate-date-rail-clear-outside"
                onClick={() => handleDateSelect(null)}
                className="min-h-11 shrink-0 rounded-10 px-3 text-primary transition-colors hover:bg-primary/10 hover:text-primary-hover active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 dark:text-primary-light dark:hover:bg-primary/20 dark:focus-visible:ring-offset-[#000000]"
              >
                선택 해제
              </button>
            </div>
          ) : (
            <p className="mt-0.5 text-gray-500 dark:text-white/70">
              더 보기를 열면 선택한 날짜를 확인할 수 있습니다.
            </p>
          )}
        </div>
      ) : null}

      {hiddenDateCount > 0 || showAllDates ? (
        <button
          type="button"
          data-testid="mate-date-rail-more"
          aria-expanded={showAllDates}
          aria-controls="mate-date-rail-grid"
          onClick={() => setShowAllDates((current) => !current)}
          className="mt-2 min-h-11 w-full rounded-10 px-3 py-2 text-11 font-bold text-primary transition-colors hover:bg-primary/10 hover:text-primary-hover active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 dark:hover:bg-primary/20 dark:focus-visible:ring-offset-[#000000]"
        >
          {showAllDates ? '접기' : `+ ${hiddenDateCount}일 더 보기`}
        </button>
      ) : null}
    </div>
  );
}
