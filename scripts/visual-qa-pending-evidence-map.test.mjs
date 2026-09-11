import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPendingEvidenceMap } from './visual-qa-pending-evidence-map.mjs';

test('maps real route-flow evidence without promoting pending entries', () => {
  const links = buildPendingEvidenceMap({
    classification: {
      entries: [
        {
          id: 'src/components/MyPageRuntime.tsx#TicketUploadModal',
          reason: 'hosted-parent-or-route-resolution-required',
          source: { path: 'src/components/MyPageRuntime.tsx', symbol: 'TicketUploadModal' },
        },
      ],
    },
    routeFlow: {
      results: [{
        browser: 'chromium',
        width: 320,
        zoom: 2,
        status: 'PASS',
        flows: {
          mypage: {
            dialog: {
              flow: 'ticket-dialog-keyboard',
              route: '/mypage',
              focus: { selector: 'ticket-upload-cancel' },
              issues: [],
              focusObscured: [],
              focusPartiallyObscured: [],
              myPageEvidence: {
                source: {
                  source: 'src/components/MyPageRuntime.tsx',
                  symbol: 'MyPageRuntime',
                  route: '/mypage',
                },
              },
              myPageAssertionIds: ['mypage-ticket-flow-missing'],
              myPageAssertionFailures: [],
              productEvidence: {
                assertionFailures: [],
                screenshot: { path: '/tmp/ticket.png', sha256: 'abc' },
              },
            },
          },
        },
      }],
    },
  });
  assert.equal(links.length, 1);
  assert.equal(links[0].status, 'evidence-only-not-registered');
  assert.equal(links[0].zoomMethod, 'document.documentElement.style.fontSize');
  assert.equal(links[0].evidence[0].source.symbol, 'MyPageRuntime');
  assert.deepEqual(links[0].evidence[0].assertionIds, ['mypage-ticket-flow-missing']);
  assert.deepEqual(links[0].evidence[0].assertionFailures, []);
  assert.equal(links[0].evidence[0].screenshot.sha256, 'abc');
});

test('preserves multiple source identities and assertion IDs for a shared route flow', () => {
  const links = buildPendingEvidenceMap({
    classification: {
      entries: [{
        id: 'src/components/AppRoutes.tsx#StadiumGuide',
        reason: 'hosted-route-evidence-required',
        source: { path: 'src/components/AppRoutes.tsx', symbol: 'StadiumGuide' },
      }],
    },
    routeFlow: {
      results: [{
        browser: 'webkit',
        width: 390,
        zoom: 2,
        status: 'PASS',
        flows: {
          stadium: {
            normal: {
              flow: 'seat-map-render-focus',
              route: '/stadium',
              issues: [],
              focusObscured: [],
              focusPartiallyObscured: [],
              stadiumEvidence: {
                sourceIdentities: [
                  { source: 'src/components/AppRoutes.tsx', symbol: 'StadiumGuide' },
                  { source: 'src/components/StadiumGuide.tsx', symbol: 'StadiumGuideRuntime' },
                ],
              },
              stadiumAssertionIds: ['stadium-seat-map-missing'],
              stadiumAssertionFailures: [],
              productEvidence: { assertionFailures: [], screenshot: null },
            },
          },
        },
      }],
    },
  });
  assert.equal(links.length, 1);
  assert.deepEqual(links[0].evidence[0].sourceIdentities, [
    { source: 'src/components/AppRoutes.tsx', symbol: 'StadiumGuide' },
    { source: 'src/components/StadiumGuide.tsx', symbol: 'StadiumGuideRuntime' },
  ]);
  assert.deepEqual(links[0].evidence[0].assertionIds, ['stadium-seat-map-missing']);
});
