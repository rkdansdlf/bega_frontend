import { useEffect, useRef, useState } from 'react';

import type { MateStatusTabKey } from '../../utils/mateListUrlState';
import type { MateSortOptionKey } from '../../utils/mateSortOptions';
import MateSeatFilterButtons from '../MateSeatFilterButtons';
import MateSortDropdown from '../MateSortDropdown';
import MateStatusTabs from '../MateStatusTabs';

export function mateStatusTabsVisualQaHarness({
  initialActiveTab,
  scenarioKey,
}: {
  initialActiveTab: MateStatusTabKey;
  scenarioKey: string;
}) {
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const [callbackCount, setCallbackCount] = useState(0);
  const [lastCallbackValue, setLastCallbackValue] = useState('');

  return (
    <div
      data-testid="mate-status-tabs-stateful-host"
      data-vqa-callback-count={callbackCount}
      data-vqa-last-callback-value={lastCallbackValue}
      data-vqa-effective-value={activeTab}
      data-vqa-scenario-key={scenarioKey}
    >
      <MateStatusTabs
        activeTab={activeTab}
        onTabChange={(nextTab) => {
          setCallbackCount((current) => current + 1);
          setLastCallbackValue(nextTab);
          setActiveTab(nextTab);
        }}
      />
    </div>
  );
}

export function mateSortDropdownVisualQaHarness({
  initialActiveSortKey,
  initialOpen,
  scenarioKey,
}: {
  initialActiveSortKey: MateSortOptionKey;
  initialOpen: boolean;
  scenarioKey: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [activeSortKey, setActiveSortKey] = useState(initialActiveSortKey);
  const [callbackCount, setCallbackCount] = useState(0);
  const [lastCallbackValue, setLastCallbackValue] = useState('');

  useEffect(() => {
    if (!initialOpen) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const trigger = rootRef.current?.querySelector<HTMLButtonElement>('[data-testid="mate-sort-trigger"]');
      if (trigger?.getAttribute('aria-expanded') === 'false') trigger.click();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialOpen]);

  return (
    <div
      ref={rootRef}
      data-testid="mate-sort-dropdown-stateful-host"
      data-vqa-callback-count={callbackCount}
      data-vqa-last-callback-value={lastCallbackValue}
      data-vqa-effective-value={activeSortKey}
      data-vqa-scenario-key={scenarioKey}
    >
      <MateSortDropdown
        activeSortKey={activeSortKey}
        onSortChange={(nextSortKey) => {
          setCallbackCount((current) => current + 1);
          setLastCallbackValue(nextSortKey);
          setActiveSortKey(nextSortKey);
        }}
      />
    </div>
  );
}

export function mateSeatFilterButtonsVisualQaHarness({
  initialInputValue,
  layout,
  scenarioKey,
}: {
  initialInputValue: string;
  layout: 'rail' | 'toolbar';
  scenarioKey: string;
}) {
  const [inputValue, setInputValue] = useState(initialInputValue);
  const [callbackCount, setCallbackCount] = useState(0);
  const [lastCallbackValue, setLastCallbackValue] = useState('');

  return (
    <div
      data-testid="mate-seat-filter-buttons-stateful-host"
      data-vqa-callback-count={callbackCount}
      data-vqa-last-callback-value={lastCallbackValue}
      data-vqa-effective-value={inputValue}
      data-vqa-scenario-key={scenarioKey}
    >
      <MateSeatFilterButtons
        layout={layout}
        inputValue={inputValue}
        onToggleSeat={(keyword) => {
          setCallbackCount((current) => current + 1);
          setLastCallbackValue(keyword);
          setInputValue((current) => (
            current.includes(keyword)
              ? current.replace(keyword, '').replace(/\s+/g, ' ').trim()
              : `${current} ${keyword}`.trim()
          ));
        }}
      />
    </div>
  );
}
