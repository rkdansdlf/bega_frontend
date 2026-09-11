import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDir, '..');
const manifestPath = resolve(frontendRoot, 'contracts/visual-qa-component-states-v1.json');
const classificationPath = resolve(frontendRoot, 'contracts/visual-qa-component-classifications-v1.json');
const routesPath = resolve(frontendRoot, 'src/components/AppRoutes.tsx');
const adaptersPath = resolve(frontendRoot, 'src/visual-qa/stateAdapters.ts');
const harnessCatalogPath = resolve(frontendRoot, 'src/visual-qa/harnessCatalog.ts');
const reportPath = resolve(frontendRoot, 'reports/visual-qa-pending-classification.json');

const COMMON_SURFACE_PATTERN = /AppRoutes|Navbar|Dialog|Modal|ChatBot|MyPage|Home|Mate|Prediction|Stadium|SeatMap|Cheer|DirectMessage|DmInbox/i;
const TEST_FILE_PATTERN = /(?:\.test\.|\.spec\.|\.cy\.)/;

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const componentParts = (id) => {
  const separator = id.indexOf('#');
  return {
    source: separator >= 0 ? id.slice(0, separator) : id,
    symbol: separator >= 0 ? id.slice(separator + 1) : '',
  };
};

const hasSymbol = (source, symbol) => {
  if (symbol === '$default') return /\bexport\s+default\b/.test(source);
  return symbol.length > 0 && new RegExp(`\\b${escapeRegExp(symbol)}\\b`).test(source);
};

const hasExport = (source, symbol) => symbol === '$default'
  ? /\bexport\s+default\b/.test(source)
  : symbol.length > 0 && (
  new RegExp(`\\bexport\\s+(?:default\\s+)?(?:async\\s+)?(?:function|class|const|let|var)\\s+${escapeRegExp(symbol)}\\b`).test(source)
  || new RegExp(`\\bexport\\s*\\{[^}]*\\b${escapeRegExp(symbol)}\\b[^}]*\\}`).test(source)
  || new RegExp(`\\bexport\\s+default\\s+${escapeRegExp(symbol)}\\b`).test(source)
  );

const sourceReference = (source, symbol, sourcePath) => {
  const lines = source.split(/\r?\n/);
  const symbolPattern = symbol && symbol !== '$default'
    ? new RegExp(`\\b${escapeRegExp(symbol)}\\b`)
    : null;
  const sourceName = basename(sourcePath, extname(sourcePath));
  const matches = lines
    .map((line, index) => ({ line: index + 1, text: line.trim() }))
    .filter(({ text }) => (symbolPattern?.test(text) ?? false)
      || (symbol === '$default' && /\bexport\s+default\b/.test(text))
      || text.includes(sourceName))
    .slice(0, 8);
  return matches;
};

const walk = async (root) => {
  const result = [];
  const visit = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'reports') continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) result.push(path);
    }
  };
  await visit(root);
  return result;
};

const collectTestEvidence = async ({ files, source, symbol }) => {
  const sourceName = basename(source, extname(source));
  const evidence = [];
  for (const file of files) {
    if (!TEST_FILE_PATTERN.test(file)) continue;
    const fileName = basename(file);
    if (!fileName.includes(sourceName) && !fileName.includes(symbol)) continue;
    const content = await readFile(file, 'utf8');
    if (hasSymbol(content, symbol) || content.includes(source)) {
      evidence.push(relative(frontendRoot, file));
    }
  }
  return evidence.sort();
};

const classifyReason = ({ renderAccess, sourceExists, symbolPresent, routeReferences, adapterEvidence }) => {
  if (!sourceExists) return 'source-missing';
  if (!symbolPresent) return 'symbol-not-found';
  if (renderAccess === 'module-export') {
    return adapterEvidence.length > 0
      ? 'module-export-state-registration-required'
      : 'module-export-adapter-required';
  }
  return routeReferences.length > 0
    ? 'hosted-route-evidence-required'
    : 'hosted-parent-or-route-resolution-required';
};

export const classifyPendingEntry = ({
  entry,
  sourceExists,
  sourceText = '',
  routeText = '',
  adapterText = '',
  harnessText = '',
  testEvidence = [],
}) => {
  const { source, symbol } = componentParts(entry.id);
  const symbolPresent = hasSymbol(sourceText, symbol);
  const exported = hasExport(sourceText, symbol);
  const routeReferences = sourceReference(routeText, symbol, source);
  // A symbol name alone is not adapter evidence: generic names such as Home,
  // Cheer, or ChatBot occur in unrelated fixture helpers. Require the exact
  // stable component id before treating an adapter/harness reference as real.
  const adapterEvidence = `${adapterText}\n${harnessText}`.includes(entry.id)
    ? [{ reference: 'exact-component-id', componentId: entry.id }]
    : [];
  const reason = classifyReason({
    renderAccess: entry.renderAccess,
    sourceExists,
    symbolPresent,
    routeReferences,
    adapterEvidence,
  });
  const nextAction = {
    'source-missing': 'Confirm whether the inventory points to a deleted or moved product source before creating any adapter.',
    'symbol-not-found': 'Resolve the current product export or wrapper symbol; do not register a QA-only substitute.',
    'module-export-adapter-required': 'Create a deterministic direct-render adapter, declare axes, and attach executable assertions.',
    'module-export-state-registration-required': 'Review the existing adapter and register the missing state contract with evidence.',
    'hosted-route-evidence-required': 'Execute the real route/state and record its host scenario, focus, interaction, and screenshot evidence.',
    'hosted-parent-or-route-resolution-required': 'Identify the real parent route or runtime boundary before assigning a host scenario.',
  }[reason];
  return {
    id: entry.id,
    renderAccess: entry.renderAccess,
    priority: COMMON_SURFACE_PATTERN.test(`${source}#${symbol}`) ? 'P1-common-surface' : 'P2-component-surface',
    source: {
      path: source,
      symbol,
      exists: sourceExists,
      symbolPresent,
      exported,
    },
    evidence: {
      routeReferences,
      adapterReferences: adapterEvidence,
      testFiles: [...testEvidence],
    },
    reason,
    nextAction,
  };
};

const buildReport = async () => {
  const [manifest, classificationManifest, routeText, adapterText, harnessText] = await Promise.all([
    readJson(manifestPath),
    readJson(classificationPath),
    readFile(routesPath, 'utf8'),
    readFile(adaptersPath, 'utf8'),
    readFile(harnessCatalogPath, 'utf8'),
  ]);
  const pending = manifest.components.filter((entry) => entry.status === 'pending');
  const files = await walk(resolve(frontendRoot, 'src'));
  const entries = [];
  for (const entry of pending) {
    const { source } = componentParts(entry.id);
    const sourcePath = resolve(frontendRoot, source);
    let sourceExists = false;
    let sourceText = '';
    try {
      sourceText = await readFile(sourcePath, 'utf8');
      sourceExists = true;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    const testEvidence = await collectTestEvidence({ files, source, symbol: componentParts(entry.id).symbol });
    entries.push(classifyPendingEntry({
      entry,
      sourceExists,
      sourceText,
      routeText,
      adapterText,
      harnessText,
      testEvidence,
    }));
  }
  entries.sort((left, right) => left.priority.localeCompare(right.priority) || left.id.localeCompare(right.id));
  const byReason = {};
  const byPriority = {};
  const byRenderAccess = {};
  for (const entry of entries) {
    byReason[entry.reason] = (byReason[entry.reason] ?? 0) + 1;
    byPriority[entry.priority] = (byPriority[entry.priority] ?? 0) + 1;
    byRenderAccess[entry.renderAccess] = (byRenderAccess[entry.renderAccess] ?? 0) + 1;
  }
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    basis: {
      manifest: relative(frontendRoot, manifestPath),
      classificationManifest: relative(frontendRoot, classificationPath),
      sourceIdentityPolicy: 'pending entries are classified from the current product source, route reference, adapter/harness reference, and existing test filename evidence; no manifest status is changed',
      stateRegistry: {
        total: classificationManifest.components.filter(({ classification }) => classification === 'visual').length,
        registered: manifest.components.filter(({ status }) => status === 'registered').length,
        pending: pending.length,
      },
    },
    snapshotSha256: {
      stateManifest: sha256(await readFile(manifestPath)),
      classificationManifest: sha256(await readFile(classificationPath)),
      appRoutes: sha256(routeText),
      stateAdapters: sha256(adapterText),
      harnessCatalog: sha256(harnessText),
    },
    summary: {
      pending: entries.length,
      byReason,
      byPriority,
      byRenderAccess,
      sourceMissing: entries.filter((entry) => !entry.source.exists).length,
      symbolMissing: entries.filter((entry) => entry.source.exists && !entry.source.symbolPresent).length,
      withTestEvidence: entries.filter((entry) => entry.evidence.testFiles.length > 0).length,
    },
    entries,
  };
};

const main = async () => {
  const report = await buildReport();
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[visual-qa:pending] ${report.summary.pending} pending classified`);
  console.log(JSON.stringify(report.summary, null, 2));
  console.log('report=reports/visual-qa-pending-classification.json');
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
