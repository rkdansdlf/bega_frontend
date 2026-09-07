import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { AdminBadge, AdminStatusBadge } from './AdminPanelPrimitives';

test('admin badge contains unbroken copy inside its mobile parent width', () => {
  const token = `ADMIN-${'A'.repeat(260)}`;
  const markup = renderToStaticMarkup(
    <AdminBadge testId="admin-badge-under-test">{token}</AdminBadge>,
  );

  assert.match(markup, /data-testid="admin-badge-under-test"/);
  assert.match(markup, /max-w-full/);
  assert.match(markup, /min-w-0/);
  assert.match(markup, /data-testid="admin-badge-content"[^>]+truncate/);
  assert.match(markup, new RegExp(`title="${token}"`));
  assert.match(markup, new RegExp(token));
});

test('admin status badge truncates explicit pressure labels at every public size', () => {
  const label = `STATUS-${'S'.repeat(260)}`;

  (['xs', 'sm', 'md'] as const).forEach((size) => {
    const markup = renderToStaticMarkup(
      <AdminStatusBadge
        label={label}
        size={size}
        status="IN_PROGRESS"
        testId={`admin-status-${size}`}
      />,
    );

    assert.match(markup, new RegExp(`data-testid="admin-status-${size}"`));
    assert.match(markup, /max-w-full/);
    assert.match(markup, /text-ellipsis/);
    assert.match(markup, new RegExp(`title="${label}"`));
  });
});

test('admin status badge falls back safely for missing and unknown statuses', () => {
  const missingMarkup = renderToStaticMarkup(
    <AdminStatusBadge status={null} testId="admin-status-missing" />,
  );
  const unknownMarkup = renderToStaticMarkup(
    <AdminStatusBadge status="NOT_A_REAL_STATUS" testId="admin-status-unknown" />,
  );

  assert.match(missingMarkup, /상태 미정/);
  assert.match(unknownMarkup, /상태 미정/);
});
