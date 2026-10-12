import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { loadRouteFlowEvidenceContext } from './visual-qa-route-flow.integration.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDir, '..');
const classificationPath = resolve(frontendRoot, 'reports/visual-qa-pending-classification.json');
const defaultRouteFlowPath = '/private/tmp/kbo-visual-qa-route-flow/final.json';
const reportPath = resolve(frontendRoot, 'reports/visual-qa-pending-evidence-map.json');
const ROUTE_FLOW_BROWSERS = new Set(['chromium', 'webkit']);
const ROUTE_FLOW_WIDTHS = new Set([320, 390]);
const ROUTE_FLOW_ZOOMS = new Set([1, 2]);
const ROUTE_FLOW_EXPECTED_CASES = new Set(
  [...ROUTE_FLOW_BROWSERS].flatMap((browser) => (
    [...ROUTE_FLOW_WIDTHS].flatMap((width) => (
      [...ROUTE_FLOW_ZOOMS].map((zoom) => `${browser}:${width}:${zoom}`)
    ))
  )),
);

const EVIDENCE_CANDIDATES = [
  {
    pendingId: 'src/components/AppRoutes.tsx#Home',
    route: '/home',
    evidenceKind: 'real-home-flow',
    flowGroups: ['home'],
    flow: 'normal',
    note: 'The route-flow asserts fixture-backed home content, a primary action, and next-date navigation on the real /home route.',
  },
  {
    pendingId: 'src/components/AppRoutes.tsx#MyPage',
    route: '/mypage',
    evidenceKind: 'route-with-child-flows',
    flowGroups: ['mypage'],
    note: 'The protected route reaches the real MyPage runtime and then exercises the stats and ticket-dialog flows.',
  },
  {
    pendingId: 'src/components/MyPageRuntime.tsx#TicketUploadModal',
    route: '/mypage',
    evidenceKind: 'real-ticket-modal-flow',
    flow: 'dialog',
    note: 'The route-flow opens the actual ticket upload modal, focuses cancel, and closes it with Escape.',
  },
  {
    pendingId: 'src/components/AppRoutes.tsx#StadiumGuide',
    route: '/stadium',
    evidenceKind: 'real-route-flow',
    flowGroups: ['stadium'],
    note: 'The public stadium route reaches the real seat-map surface and focuses the guide selector.',
  },
  {
    pendingId: 'src/components/StadiumGuide.tsx#StadiumGuide',
    route: '/stadium',
    evidenceKind: 'real-route-flow',
    flow: 'normal',
    note: 'The real StadiumGuide surface is observed through the seat-map focus flow.',
  },
  {
    pendingId: 'src/components/StadiumGuide.tsx#StadiumGuideRuntime',
    route: '/stadium',
    evidenceKind: 'real-route-flow',
    flow: 'normal',
    note: 'The real StadiumGuide runtime is observed through the seat-map focus flow.',
  },
];

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const isSha256 = (value) => typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);

const validManifestEntry = ({ entry, result, evidenceContext }) => {
  const execution = entry.execution ?? {};
  const sourceHashesValid = (entry.sources ?? []).length > 0
    && entry.sources.every((source) => isSha256(source.sourceSnapshotSha256));
  const executionScopeValid = execution.browser === result.browser
    && execution.viewport?.width === result.width
    && execution.requestedZoom === result.zoom
    && execution.zoomMethod === 'document.documentElement.style.fontSize';
  const declaredEvidenceValid = typeof entry.validator === 'string'
    && Array.isArray(entry.assertionIds)
    && entry.assertionIds.length > 0
    && isSha256(entry.validatorScriptSha256)
    && isSha256(entry.fixtureRegistrySha256);
  if (!sourceHashesValid || !executionScopeValid || !declaredEvidenceValid) return false;
  if (!evidenceContext) return true;
  return entry.validatorScriptSha256 === evidenceContext.validatorScriptSha256
    && entry.fixtureRegistrySha256 === evidenceContext.fixtureRegistrySha256
    && entry.sources.every((source) => (
      source.sourceSnapshotSha256 === evidenceContext.sourceSnapshots[source.source]
    ));
};

const flattenFlow = (value) => (value && typeof value === 'object' ? value : {});

const extractEvidence = (result, candidate) => {
  if (candidate.evidenceKind === 'route-entry-only') return [];
  const groups = candidate.flowGroups ?? Object.keys(result.flows ?? {});
  const records = [];
  for (const group of groups) {
    const flowGroup = flattenFlow(result.flows?.[group]);
    const flowNames = candidate.flow ? [candidate.flow] : Object.keys(flowGroup);
    for (const flowName of flowNames) {
      const flow = flowGroup[flowName];
      if (!flow || typeof flow !== 'object' || !Array.isArray(flow.issues)) continue;
      const sourceIdentities = flow.stadiumEvidence?.sourceIdentities
        ?? flow.ticketModalEvidence?.sourceIdentities
        ?? (flow.homeEvidence?.source ? [flow.homeEvidence.source] : null)
        ?? (flow.myPageEvidence?.source ? [flow.myPageEvidence.source] : []);
      records.push({
        flowKey: flowName,
        flow: flow.flow ?? flowName,
        route: flow.route ?? candidate.route,
        source: sourceIdentities[0] ?? null,
        sourceIdentities,
        assertionIds: flow.stadiumAssertionIds
          ?? flow.ticketModalAssertionIds
          ?? flow.homeAssertionIds
          ?? flow.myPageAssertionIds
          ?? [],
        assertionFailures: flow.stadiumAssertionFailures
          ?? flow.ticketModalAssertionFailures
          ?? flow.homeAssertionFailures
          ?? flow.myPageAssertionFailures
          ?? [],
        focus: flow.focus ?? null,
        issues: flow.issues,
        focusObscured: flow.focusObscured ?? [],
        focusPartiallyObscured: flow.focusPartiallyObscured ?? [],
        productFailures: flow.productEvidence?.assertionFailures ?? [],
        screenshot: flow.productEvidence?.screenshot ?? null,
      });
    }
  }
  return records;
};

const validExecutionEvidence = ({ result, candidate, evidenceContext }) => {
  const manifests = (result.evidenceManifest ?? []).filter((entry) => (
    entry.contractComponentIds?.includes(candidate.pendingId)
  ));
  if ((result.evidenceManifest ?? []).length === 0) return true;
  if (manifests.length === 0) return false;
  return manifests.every((entry) => validManifestEntry({ entry, result, evidenceContext }));
};

export const validateRouteFlowReference = ({
  routeFlow,
  evidenceContext,
  requireCompleteMatrix = false,
}) => {
  const results = Array.isArray(routeFlow?.results) ? routeFlow.results : [];
  const manifestEntries = results.flatMap((result) => result.evidenceManifest ?? []);
  const observedCases = new Set(results.map((result) => (
    `${result.browser}:${result.width}:${result.zoom}`
  )));
  const matrixComplete = observedCases.size === ROUTE_FLOW_EXPECTED_CASES.size
    && [...ROUTE_FLOW_EXPECTED_CASES].every((key) => observedCases.has(key));
  const invalidCases = results.filter((result) => (
    result.status !== 'PASS'
      || !ROUTE_FLOW_BROWSERS.has(result.browser)
      || !ROUTE_FLOW_WIDTHS.has(result.width)
      || !ROUTE_FLOW_ZOOMS.has(result.zoom)
      || !Array.isArray(result.evidenceManifest)
      || result.evidenceManifest.length === 0
      || result.evidenceManifest.some((entry) => !validManifestEntry({ entry, result, evidenceContext }))
  ));
  return {
    valid: results.length > 0
      && invalidCases.length === 0
      && (!requireCompleteMatrix || matrixComplete),
    caseCount: results.length,
    passCaseCount: results.filter((result) => result.status === 'PASS').length,
    manifestEntryCount: manifestEntries.length,
    invalidCaseCount: invalidCases.length,
    matrixComplete,
  };
};

export const buildPendingEvidenceMap = ({ classification, routeFlow, evidenceContext }) => {
  const pendingById = new Map(classification.entries.map((entry) => [entry.id, entry]));
  const links = [];
  for (const candidate of EVIDENCE_CANDIDATES) {
    const classificationEntry = pendingById.get(candidate.pendingId);
    if (!classificationEntry) continue;
    for (const result of routeFlow.results ?? []) {
      if (result.status !== 'PASS'
        || !ROUTE_FLOW_BROWSERS.has(result.browser)
        || !ROUTE_FLOW_WIDTHS.has(result.width)
        || !ROUTE_FLOW_ZOOMS.has(result.zoom)) {
        continue;
      }
      const evidence = extractEvidence(result, candidate);
      const validEvidence = evidence.filter((record) => (
        record.route === candidate.route
        && (!candidate.flow || record.flowKey === candidate.flow)
        && record.issues.length === 0
        && record.productFailures.length === 0
        && record.sourceIdentities.length > 0
        && record.assertionIds.length > 0
        && validExecutionEvidence({ result, candidate, evidenceContext })
      ));
      if (validEvidence.length === 0) continue;
      links.push({
        pendingId: candidate.pendingId,
        sourceIdentity: classificationEntry.source,
        classificationReason: classificationEntry.reason,
        evidenceKind: candidate.evidenceKind,
        note: candidate.note,
        status: 'evidence-only-not-registered',
        browser: result.browser,
        browserVersion: result.browserVersion ?? null,
        width: result.width,
        zoom: result.zoom,
        zoomMethod: 'document.documentElement.style.fontSize',
        route: candidate.route,
        routeFlowStatus: result.status,
        executionEvidence: (result.evidenceManifest ?? []).filter((entry) => (
          entry.contractComponentIds?.includes(candidate.pendingId)
        )),
        evidence: validEvidence,
      });
    }
  }
  return links;
};

const candidateState = (classification) => {
  const pendingIds = new Set(classification.entries.map((entry) => entry.id));
  return EVIDENCE_CANDIDATES.map(({ pendingId, evidenceKind, note }) => ({
    pendingId,
    evidenceKind,
    note,
    state: pendingIds.has(pendingId) ? 'active-pending' : 'inactive-registered',
  }));
};

export const requireRouteFlowForActiveCandidates = ({
  activeCandidateCount,
  routeFlowExists,
  routeFlowPath,
}) => {
  if (activeCandidateCount > 0 && !routeFlowExists) {
    throw new Error(`active evidence-map candidates require route-flow output: ${routeFlowPath}`);
  }
};

const writeNoActiveCandidatesReport = async ({
  classification,
  routeFlowPath,
  routeFlowExists,
  routeFlowSha256,
  routeFlowValidation = null,
  evidenceContext = null,
}) => {
  const candidates = candidateState(classification);
  const referenceState = !routeFlowExists
    ? 'inactive-missing'
    : routeFlowValidation?.valid === false
      ? 'inactive-invalid'
      : 'inactive-present';
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: 'no-active-candidates',
    policy: 'Route evidence does not change the state manifest. This map has no active pending candidate; the full pending inventory remains separate.',
    reference: {
      state: referenceState,
      producer: 'scripts/visual-qa-route-flow.integration.mjs',
      consumer: 'scripts/visual-qa-pending-evidence-map.mjs',
      configuredPath: routeFlowPath,
    },
    sourceReports: {
      classification: classificationPath,
      routeFlow: routeFlowExists ? routeFlowPath : null,
      routeFlowSha256: routeFlowSha256 ?? null,
      routeFlowValidation,
      validatorScript: evidenceContext?.validatorScript ?? null,
      validatorScriptSha256: evidenceContext?.validatorScriptSha256 ?? null,
      fixtureRegistry: evidenceContext?.fixtureRegistry ?? null,
      fixtureRegistrySha256: evidenceContext?.fixtureRegistrySha256 ?? null,
    },
    summary: {
      totalPendingEntries: classification.entries.length,
      candidatePendingEntries: 0,
      linkedPendingEntries: 0,
      unlinkedPendingEntries: 0,
      browserCases: 0,
      links: 0,
      routeFlowFailures: 0,
      productFailures: 0,
    },
    candidateStates: candidates,
    unlinked: [],
    links: [],
  };
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log('[visual-qa:pending-evidence] no active map candidates; pending inventory remains separate');
  console.log(JSON.stringify(report.summary, null, 2));
  console.log('report=reports/visual-qa-pending-evidence-map.json');
  return report;
};

const main = async () => {
  const routeFlowPath = process.env.VISUAL_QA_ROUTE_FLOW_REPORT ?? defaultRouteFlowPath;
  const classification = await readJson(classificationPath);
  const activeCandidates = EVIDENCE_CANDIDATES.filter(({ pendingId }) => (
    classification.entries.some((entry) => entry.id === pendingId)
  ));
  let routeFlowExists = true;
  let routeFlowRaw;
  let routeFlow;
  try {
    routeFlowRaw = await readFile(routeFlowPath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      routeFlowExists = false;
    } else {
      throw error;
    }
  }
  if (routeFlowExists) {
    routeFlow = JSON.parse(routeFlowRaw);
  }
  requireRouteFlowForActiveCandidates({
    activeCandidateCount: activeCandidates.length,
    routeFlowExists,
    routeFlowPath,
  });
  if (activeCandidates.length === 0) {
    const evidenceContext = routeFlowExists
      ? await loadRouteFlowEvidenceContext()
      : null;
    const routeFlowValidation = routeFlowExists
      ? validateRouteFlowReference({
        routeFlow,
        evidenceContext,
        requireCompleteMatrix: true,
      })
      : null;
    return writeNoActiveCandidatesReport({
      classification,
      routeFlowPath,
      routeFlowExists,
      routeFlowSha256: routeFlowRaw ? sha256(routeFlowRaw) : null,
      routeFlowValidation,
      evidenceContext,
    });
  }
  const evidenceContext = await loadRouteFlowEvidenceContext();
  const links = buildPendingEvidenceMap({ classification, routeFlow, evidenceContext });
  const pendingIds = new Set(classification.entries.map((entry) => entry.id));
  const pendingCandidates = EVIDENCE_CANDIDATES.filter(({ pendingId }) => pendingIds.has(pendingId));
  const linkedPendingIds = new Set(links.map((link) => link.pendingId));
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: 'evidence-only-not-registered',
    policy: 'Route evidence does not change the state manifest. A pending entry requires an explicit state contract and host/direct registration before it can be marked registered.',
    sourceReports: {
      classification: classificationPath,
      routeFlow: routeFlowPath,
      routeFlowSha256: sha256(routeFlowRaw),
      validatorScript: evidenceContext.validatorScript,
      validatorScriptSha256: evidenceContext.validatorScriptSha256,
      fixtureRegistry: evidenceContext.fixtureRegistry,
      fixtureRegistrySha256: evidenceContext.fixtureRegistrySha256,
    },
    summary: {
      totalPendingEntries: classification.entries.length,
      candidatePendingEntries: pendingCandidates.length,
      linkedPendingEntries: linkedPendingIds.size,
      unlinkedPendingEntries: pendingCandidates.filter((candidate) => (
        !linkedPendingIds.has(candidate.pendingId)
      )).length,
      browserCases: new Set(links.map((link) => `${link.browser}:${link.width}:${link.zoom}`)).size,
      links: links.length,
      routeFlowFailures: links.filter((link) => link.routeFlowStatus !== 'PASS').length,
      productFailures: links.reduce((total, link) => total + link.evidence.reduce((count, evidence) => count + evidence.productFailures.length, 0), 0),
    },
    unlinked: pendingCandidates
      .filter((candidate) => !linkedPendingIds.has(candidate.pendingId))
      .map(({ pendingId, evidenceKind, note }) => ({ pendingId, evidenceKind, note })),
    links,
  };
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[visual-qa:pending-evidence] ${report.summary.linkedPendingEntries}/${report.summary.candidatePendingEntries} candidates linked`);
  console.log(JSON.stringify(report.summary, null, 2));
  console.log('report=reports/visual-qa-pending-evidence-map.json');
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
