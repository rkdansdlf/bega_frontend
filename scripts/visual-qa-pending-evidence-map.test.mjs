import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPendingEvidenceMap,
  requireRouteFlowForActiveCandidates,
  validateRouteFlowReference,
} from './visual-qa-pending-evidence-map.mjs';

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

const homeClassification = {
  entries: [{
    id: 'src/components/AppRoutes.tsx#Home',
    reason: 'hosted-route-evidence-required',
    source: { path: 'src/components/AppRoutes.tsx', symbol: 'Home' },
  }],
};

const homeResult = (overrides = {}) => ({
  browser: 'chromium',
  width: 320,
  zoom: 2,
  status: 'PASS',
  flows: {
    home: {
      normal: {
        flow: 'home-content-and-navigation',
        route: '/home',
        issues: [],
        focusObscured: [],
        focusPartiallyObscured: [],
        homeEvidence: {
          source: { source: 'src/components/HomeRuntime.tsx', symbol: 'HomeRuntime', route: '/home' },
        },
        homeAssertionIds: ['home-priority-panel-missing'],
        homeAssertionFailures: [],
        productEvidence: { assertionFailures: [], screenshot: null },
      },
    },
  },
  ...overrides,
});

test('rejects evidence with missing assertions, wrong scope, browser, or phase', () => {
  const cases = [
    homeResult({ flows: { home: { normal: { ...homeResult().flows.home.normal, homeAssertionIds: [] } } } }),
    homeResult({ flows: { home: { normal: { ...homeResult().flows.home.normal, route: '/mypage' } } } }),
    homeResult({ browser: 'firefox' }),
    homeResult({ flows: { home: { fallback: homeResult().flows.home.normal } } }),
    homeResult({ status: 'FAIL' }),
  ];
  for (const routeFlowResult of cases) {
    assert.deepEqual(
      buildPendingEvidenceMap({ classification: homeClassification, routeFlow: { results: [routeFlowResult] } }),
      [],
    );
  }
});

test('rejects evidence whose embedded source or validator hashes do not match the current context', () => {
  const routeFlowResult = homeResult({
    evidenceManifest: [{
      contractComponentIds: ['src/components/AppRoutes.tsx#Home'],
      sources: [{ source: 'src/components/HomeRuntime.tsx', sourceSnapshotSha256: '1'.repeat(64) }],
      validator: 'homeAssertions',
      validatorScriptSha256: '2'.repeat(64),
      fixtureRegistrySha256: '3'.repeat(64),
      execution: {
        browser: 'chromium',
        viewport: { width: 320, height: 844 },
        requestedZoom: 2,
        zoomMethod: 'document.documentElement.style.fontSize',
      },
    }],
  });
  assert.deepEqual(
    buildPendingEvidenceMap({
      classification: homeClassification,
      routeFlow: { results: [routeFlowResult] },
      evidenceContext: {
        validatorScriptSha256: '4'.repeat(64),
        fixtureRegistrySha256: '5'.repeat(64),
        sourceSnapshots: { 'src/components/HomeRuntime.tsx': '6'.repeat(64) },
      },
    }),
    [],
  );
});

test('requires route-flow output when an active candidate exists', () => {
  assert.throws(
    () => requireRouteFlowForActiveCandidates({
      activeCandidateCount: 1,
      routeFlowExists: false,
      routeFlowPath: '/private/tmp/kbo-visual-qa-route-flow/final.json',
    }),
    /active evidence-map candidates require route-flow output/,
  );
  assert.doesNotThrow(() => requireRouteFlowForActiveCandidates({
    activeCandidateCount: 0,
    routeFlowExists: false,
    routeFlowPath: '/private/tmp/kbo-visual-qa-route-flow/final.json',
  }));
});

test('does not treat malformed route-flow references as valid evidence', () => {
  const baseResult = homeResult({
    evidenceManifest: [{
      contractComponentIds: ['src/components/AppRoutes.tsx#Home'],
      sources: [{ source: 'src/components/HomeRuntime.tsx', sourceSnapshotSha256: '1'.repeat(64) }],
      validator: 'homeAssertions',
      validatorScriptSha256: '2'.repeat(64),
      fixtureRegistrySha256: '3'.repeat(64),
      assertionIds: ['home-priority-panel-missing'],
      execution: {
        browser: 'chromium',
        viewport: { width: 320, height: 844 },
        requestedZoom: 2,
        zoomMethod: 'document.documentElement.style.fontSize',
      },
    }],
  });
  const context = {
    validatorScriptSha256: '2'.repeat(64),
    fixtureRegistrySha256: '3'.repeat(64),
    sourceSnapshots: { 'src/components/HomeRuntime.tsx': '1'.repeat(64) },
  };
  assert.deepEqual(validateRouteFlowReference({
    routeFlow: { results: [baseResult] },
    evidenceContext: context,
  }), {
    valid: true,
    caseCount: 1,
    passCaseCount: 1,
    manifestEntryCount: 1,
    invalidCaseCount: 0,
    matrixComplete: false,
  });
  assert.equal(validateRouteFlowReference({
    routeFlow: { results: [{ ...baseResult, status: 'FAIL' }] },
    evidenceContext: context,
  }).valid, false);
  assert.equal(validateRouteFlowReference({
    routeFlow: { results: [baseResult] },
    evidenceContext: context,
    requireCompleteMatrix: true,
  }).valid, false);
});
