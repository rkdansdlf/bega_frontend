import { createElement, useState, type UIEvent } from 'react';

import MateMobileDateFilter from '../MateMobileDateFilter';

const toDateString = (date: Date | null) => {
  if (date === null) return 'all';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function mateMobileDateFilterStatefulHost({
  dateItems,
  initialSelectedDate,
  scenarioKey,
}: {
  dateItems: Date[];
  initialSelectedDate: Date | null;
  scenarioKey: string;
}) {
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [callbackCount, setCallbackCount] = useState(0);
  const [lastCallbackValue, setLastCallbackValue] = useState('');
  const [scrollPositive, setScrollPositive] = useState(false);

  const handleScrollCapture = (event: UIEvent<HTMLDivElement>) => {
    if (
      event.target instanceof HTMLElement
      && event.target.dataset.testid === 'mate-mobile-date-filter-scroller'
    ) {
      setScrollPositive(event.target.scrollLeft > 0);
    }
  };

  return (
    <div
      data-testid="mate-mobile-date-filter-stateful-host"
      data-vqa-callback-count={callbackCount}
      data-vqa-last-callback-value={lastCallbackValue}
      data-vqa-effective-value={toDateString(selectedDate)}
      data-vqa-scenario-key={scenarioKey}
      data-vqa-scroll-positive={scrollPositive}
      onScrollCapture={handleScrollCapture}
    >
      <MateMobileDateFilter
        dateItems={dateItems}
        selectedDate={selectedDate}
        onDateSelect={(nextDate) => {
          setCallbackCount((current) => current + 1);
          setLastCallbackValue(toDateString(nextDate));
          setSelectedDate((current) => (
            current !== null
            && nextDate !== null
            && toDateString(current) === toDateString(nextDate)
              ? null
              : nextDate
          ));
        }}
      />
    </div>
  );
}

export function mateMobileDateFilterVisualQaHarness(props: {
  dateItems: Date[];
  initialSelectedDate: Date | null;
  scenarioKey: string;
}) {
  return createElement(mateMobileDateFilterStatefulHost, {
    ...props,
    key: props.scenarioKey,
  });
}
