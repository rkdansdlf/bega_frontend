import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { AdminUsersIcon } from './AdminPanelIcons';
import { StatCard } from './StatCard';

test('admin stat card can render the complete maximum value deterministically', () => {
  const markup = renderToStaticMarkup(
    <StatCard
      animate={false}
      color="amber"
      icon={AdminUsersIcon}
      label="전체 사용자"
      testId="admin-stat-users"
      value={Number.MAX_SAFE_INTEGER}
    />,
  );

  assert.match(markup, /data-testid="admin-stat-users"/);
  assert.match(markup, /9,007,199,254,740,991/);
  assert.match(markup, /break-all/);
});

test('admin stat card contains unbroken labels and deterministic animated frames on mobile', () => {
  const label = `LABEL-${'L'.repeat(260)}`;
  const markup = renderToStaticMarkup(
    <StatCard
      animate
      color="sky"
      icon={AdminUsersIcon}
      label={label}
      testId="admin-stat-pressure"
      value={1_000}
      visualQaDisplayValueOverride={937}
    />,
  );

  assert.match(markup, /data-testid="admin-stat-pressure"/);
  assert.match(markup, /data-testid="admin-stat-label"[^>]+title="LABEL-/);
  assert.match(markup, /data-testid="admin-stat-label"[^>]+line-clamp-3/);
  assert.match(markup, /data-testid="admin-stat-label"[^>]+overflow-wrap:anywhere/);
  assert.match(markup, new RegExp(label));
  assert.match(markup, />937</);
});

test('admin stat card separates mobile icon and full-width text while restoring desktop layout', () => {
  const markup = renderToStaticMarkup(
    <StatCard animate={false} color="amber" icon={AdminUsersIcon} label="전체 사용자" value={123456} />,
  );
  assert.match(markup, /p-3 shadow-lg sm:p-6/);
  assert.match(markup, /flex-col-reverse[^\"]*sm:flex-row/);
  assert.match(markup, /w-full min-w-0 flex-1 sm:w-auto/);
  assert.match(markup, /전체 사용자/);
  assert.match(markup, /123,456/);
});
