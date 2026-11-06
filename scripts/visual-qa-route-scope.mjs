import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { matchRoutes } from 'react-router-dom';

import { AUTHED_ROUTES, DEFAULT_ROUTES, LOGGED_OUT_ROUTES } from './reflow-320-audit.mjs';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const exclusions = new Map([
  ['/test/error', 'development-only error harness'],
  ['/internal/sajik-seatmap-editor', 'development-only internal editor'],
  ['/internal/gwangju-seatmap-editor', 'development-only internal editor'],
  ['/internal/module-federation-design-system', 'conditional internal probe; may exist in a production build with explicit federation entry'],
]);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const pathname = (value) => new URL(value, 'https://visual-qa.invalid').pathname;
const opening = (node) => ts.isJsxElement(node) ? node.openingElement : node;
const isRoute = (node) => (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node))
  && opening(node).tagName.getText() === 'Route';
const attribute = (node, name) => opening(node).attributes.properties.find((entry) => (
  ts.isJsxAttribute(entry) && entry.name.getText() === name
));
const literalPath = (node) => {
  const value = attribute(node, 'path')?.initializer;
  if (!value) return null;
  if (ts.isStringLiteral(value)) return value.text;
  if (ts.isJsxExpression(value) && value.expression
    && (ts.isStringLiteral(value.expression) || ts.isNoSubstitutionTemplateLiteral(value.expression))) return value.expression.text;
  throw new Error('non-literal route path requires explicit scope review');
};
const elementName = (node) => {
  const value = attribute(node, 'element')?.initializer;
  const expression = value && ts.isJsxExpression(value) ? value.expression : null;
  return expression && (ts.isJsxElement(expression) || ts.isJsxSelfClosingElement(expression))
    ? opening(expression).tagName.getText() : null;
};

export const extractRouteDeclarations = (source) => {
  const file = ts.createSourceFile('AppRoutes.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (file.parseDiagnostics.length) throw new Error('route source has syntax diagnostics');
  const routes = [];
  const visit = (node) => {
    if (isRoute(node)) {
      if (attribute(node, 'index')) throw new Error('index route requires explicit scope review');
      const ownPath = literalPath(node);
      if (ownPath !== null) {
        const parents = [];
        const conditions = [];
        for (let parent = node.parent; parent; parent = parent.parent) {
          if (isRoute(parent)) parents.unshift(parent);
          if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
            conditions.unshift(parent.left.getText(file));
          }
        }
        let routePath = '';
        for (const part of [...parents, node].map(literalPath).filter((value) => value !== null)) {
          routePath = part.startsWith('/') || part === '*' ? part : `${routePath.replace(/\/$/, '')}/${part}`;
        }
        const wrappers = parents.map(elementName).filter(Boolean);
        const access = wrappers.includes('AdminRoute') ? 'admin'
          : wrappers.includes('ProtectedRoute') ? 'protected'
            : wrappers.includes('PublicOnlyAuthRoute') ? 'public-only-auth' : 'public';
        routes.push({ path: routePath, access, component: elementName(node), wrappers, conditions,
          line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1 });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return routes;
};

export const buildRouteScopeReport = ({ declarations, samples = DEFAULT_ROUTES,
  authedSamples = AUTHED_ROUTES, loggedOutSamples = LOGGED_OUT_ROUTES }) => {
  const routes = declarations.filter((route) => !exclusions.has(route.path));
  const excluded = declarations.filter((route) => exclusions.has(route.path))
    .map((route) => ({ ...route, reason: exclusions.get(route.path) }));
  const patterns = routes.map((route) => ({ path: route.path }));
  const inputs = samples.map((url) => {
    const path = pathname(url);
    const match = matchRoutes(patterns, path)?.at(-1)?.route.path ?? null;
    const access = routes.find((route) => route.path === match)?.access ?? null;
    // These are the current default source formulas, NOT browser observations.
    const reflowGuest = loggedOutSamples.includes(url);
    const visualGuest = path === '/' || loggedOutSamples.includes(path);
    return { url, pathname: path, routePattern: match, access,
      inputCohort: authedSamples.includes(url) ? 'AUTHED_ROUTES' : 'PUBLIC_ROUTES',
      reflowSession: reflowGuest ? 'guest' : 'synthetic-authenticated',
      visualQaSession: visualGuest ? 'guest' : 'synthetic-authenticated' };
  });
  const represented = new Set(inputs.map((sample) => sample.routePattern));
  const guestRepresented = new Set(inputs.filter((sample) => sample.visualQaSession === 'guest').map((sample) => sample.routePattern));
  return {
    kind: 'static-route-scope-not-visual-acceptance', visualAcceptance: 'UNVERIFIED',
    sessionEvidence: 'current default source formulas only; not browser/session execution evidence',
    counts: { declarations: declarations.length, scopedPatterns: routes.length, excluded: excluded.length, samples: inputs.length },
    accessCounts: Object.fromEntries(['public', 'public-only-auth', 'protected', 'admin'].map((access) => [access, routes.filter((route) => route.access === access).length])),
    routes: routes.map((route) => ({ ...route, representatives: inputs.filter((sample) => sample.routePattern === route.path).map((sample) => sample.url) })),
    excluded, samples: inputs,
    missingPatterns: routes.filter((route) => !represented.has(route.path)).map((route) => route.path),
    unmatchedSamples: inputs.filter((sample) => sample.routePattern === null).map((sample) => sample.url),
    publicInAuthedCohort: inputs.filter((sample) => sample.inputCohort === 'AUTHED_ROUTES' && sample.access === 'public'),
    guestSelectionMismatches: inputs.filter((sample) => loggedOutSamples.includes(sample.url) && sample.visualQaSession !== 'guest'),
    genericGuestMissingPatterns: routes.filter((route) => ['public', 'public-only-auth'].includes(route.access)
      && !guestRepresented.has(route.path)).map((route) => route.path),
  };
};

export const assertCurrentSessionModels = ({ reflowSource, visualSource }) => {
  if (!reflowSource.includes('const needsLoggedOut = !allowApi && LOGGED_OUT_ROUTES.includes(route)')
    || !visualSource.includes("const loggedOut = state?.session === 'logged-out'\n          || (!state && (pathname === '/' || LOGGED_OUT_ROUTES.includes(pathname)))")) {
    throw new Error('runner session selector changed; review the static session model before reporting');
  }
};

const markdown = (report) => [
  '# Static route scope (not visual acceptance)', '',
  `Declarations: ${report.counts.declarations}; scoped patterns: ${report.counts.scopedPatterns}; excluded: ${report.counts.excluded}; representative inputs: ${report.counts.samples}.`, '',
  `Missing representatives: ${report.missingPatterns.length}. Visual acceptance: **UNVERIFIED**.`, '',
  'A representative URL is not proof that its states/themes/data/keyboard pass. Input cohort names are not access policy.', '',
  '| Route pattern | Source access | Representative |', '| --- | --- | --- |',
  ...report.routes.map((route) => `| \`${route.path}\` | ${route.access} | ${route.representatives.map((url) => `\`${url}\``).join(', ') || 'MISSING'} |`), '',
  '## Default runner session limitations', '',
  `Public routes in AUTHED_ROUTES input cohort: ${report.publicInAuthedCohort.length}.`,
  `Guest-selection mismatches in generic visual-QA runner: ${report.guestSelectionMismatches.map((sample) => sample.url).join(', ') || 'none'}.`,
  `Public patterns without a guest input in that generic runner: ${report.genericGuestMissingPatterns.length}. This is NOT a claim that dedicated Cypress tests do not cover them.`, '',
  'Reflow visits root with a synthetic authenticated profile and accepts landing at /home; this cannot prove guest landing layout. Generic visual-QA separately selects guest for root.', '',
  'Conditional internal probe exclusions describe scope, not proof they are absent from every production build. No environment files, network, backend or browser were accessed by this report.', '',
].join('\n');

export const runRouteScopeInventory = async (outputDir) => {
  const sources = ['src/components/AppRoutes.tsx', 'scripts/reflow-320-audit.mjs', 'scripts/visual-qa-audit.mjs'];
  const texts = await Promise.all(sources.map((path) => readFile(resolve(frontendRoot, path), 'utf8')));
  assertCurrentSessionModels({ reflowSource: texts[1], visualSource: texts[2] });
  const report = { generatedAt: new Date().toISOString(),
    sources: sources.map((path, index) => ({ path, sha256: sha256(texts[index]) })),
    ...buildRouteScopeReport({ declarations: extractRouteDeclarations(texts[0]) }) };
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, 'route-scope.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(resolve(outputDir, 'route-scope.md'), markdown(report));
  return report;
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const outputDir = resolve(frontendRoot, process.argv[2] ?? 'reports/route-scope');
  const report = await runRouteScopeInventory(outputDir);
  console.log(JSON.stringify({ ...report.counts, accessCounts: report.accessCounts,
    missingPatterns: report.missingPatterns, guestSelectionMismatches: report.guestSelectionMismatches.map((sample) => sample.url),
    genericGuestMissingPatterns: report.genericGuestMissingPatterns.length, visualAcceptance: report.visualAcceptance }));
  if (report.missingPatterns.length || report.unmatchedSamples.length) process.exitCode = 1;
}
