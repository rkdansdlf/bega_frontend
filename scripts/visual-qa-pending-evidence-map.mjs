import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDir, '..');
const classificationPath = resolve(frontendRoot, 'reports/visual-qa-pending-classification.json');
const defaultRouteFlowPath = '/private/tmp/kbo-visual-qa-route-flow/final.json';
const reportPath = resolve(frontendRoot, 'reports/visual-qa-pending-evidence-map.json');

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

export const buildPendingEvidenceMap = ({ classification, routeFlow }) => {
  const pendingById = new Map(classification.entries.map((entry) => [entry.id, entry]));
  const links = [];
  for (const candidate of EVIDENCE_CANDIDATES) {
    const classificationEntry = pendingById.get(candidate.pendingId);
    if (!classificationEntry) continue;
    for (const result of routeFlow.results ?? []) {
      const evidence = extractEvidence(result, candidate);
      if (evidence.length === 0) continue;
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
        evidence,
      });
    }
  }
  return links;
};

const main = async () => {
  const routeFlowPath = process.env.VISUAL_QA_ROUTE_FLOW_REPORT ?? defaultRouteFlowPath;
  const [classification, routeFlow, routeFlowRaw] = await Promise.all([
    readJson(classificationPath),
    readJson(routeFlowPath),
    readFile(routeFlowPath),
  ]);
  const links = buildPendingEvidenceMap({ classification, routeFlow });
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
    },
    summary: {
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
