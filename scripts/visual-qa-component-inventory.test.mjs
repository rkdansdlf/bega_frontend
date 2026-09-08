import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  applyClassifications,
  buildInitialClassificationManifest,
  countProvisionalVisualClassifications,
  DEFAULT_CLASSIFICATION_PATH,
  discoverComponentSourceFiles,
  extractComponentParseErrors,
  extractComponentSymbols,
  refreshClassificationManifest,
  scanComponentInventory,
  validateClassificationManifest,
} from './visual-qa-component-inventory.mjs';
import {
  COVERAGE_CONTRACT_PATH,
  loadCoverageContract,
} from './visual-qa-coverage-contract.mjs';

const fixtureSource = `
  import React, { Component, forwardRef, lazy, memo } from 'react';

  export function PageHeader() {
    return <header>Header</header>;
  }

  function InternalPanel() {
    return <section>Internal</section>;
  }

  const MemoCard = memo(() => <article>Memo</article>);
  export const InputField = forwardRef<HTMLInputElement>((props, ref) => (
    <input ref={ref} {...props} />
  ));
  export const LazyPanel = lazy(() => import('./LazyPanel'));
  const ConditionalLazyPanel = import.meta.env.DEV
    ? lazy(() => import('./ConditionalLazyPanel'))
    : null;

  class LegacyPanel extends Component {
    render() {
      return <aside>Legacy</aside>;
    }
  }

  const PascalCaseUtility = () => 42;
  const PascalConfig = { value: 42 };
  const ComponentAlias = PageHeader;
  const CustomWrappedPanel = withFeature(InternalPanel);
  const lowerCaseRenderer = () => <div>not a component symbol</div>;

  export default () => <main>Anonymous default</main>;
`;

test('extracts visual component symbols across supported declaration forms', () => {
  const symbols = extractComponentSymbols(fixtureSource, 'src/components/Fixture.tsx');
  assert.deepEqual(symbols.map(({ name }) => name).sort(), [
    '$default',
    'ComponentAlias',
    'ConditionalLazyPanel',
    'CustomWrappedPanel',
    'InputField',
    'InternalPanel',
    'LazyPanel',
    'LegacyPanel',
    'MemoCard',
    'PageHeader',
    'PascalCaseUtility',
    'PascalConfig',
  ]);
  assert.equal(symbols.find(({ name }) => name === 'PageHeader')?.exported, true);
  assert.equal(symbols.find(({ name }) => name === 'InternalPanel')?.exported, false);
  assert.equal(symbols.find(({ name }) => name === '$default')?.defaultExport, true);
  assert.equal(symbols.find(({ name }) => name === 'LazyPanel')?.wrapper, 'lazy');
  assert.equal(symbols.find(({ name }) => name === 'ConditionalLazyPanel')?.wrapper, 'lazy');
  assert.equal(symbols.find(({ name }) => name === 'ConditionalLazyPanel')?.runtimeShape, 'react-wrapper');
  assert.equal(symbols.find(({ name }) => name === 'PageHeader')?.containsJsx, true);
  assert.equal(symbols.find(({ name }) => name === 'PascalCaseUtility')?.containsJsx, false);
  assert.equal(symbols.find(({ name }) => name === 'PascalConfig')?.runtimeShape, 'object-literal');
});

test('same-named internal symbols keep distinct lexical ids', () => {
  const symbols = extractComponentSymbols(`
    function OuterA() {
      function Item() { return <span>A</span>; }
      return <Item />;
    }
    function OuterB() {
      function Item() { return <span>B</span>; }
      return <Item />;
    }
  `, 'src/components/Nested.tsx');
  assert.ok(symbols.some(({ id }) => id === 'src/components/Nested.tsx#OuterA.Item'));
  assert.ok(symbols.some(({ id }) => id === 'src/components/Nested.tsx#OuterB.Item'));
  assert.equal(symbols.filter(({ name }) => name === 'Item').length, 2);
});

test('same-named declarations in one lexical scope receive deterministic occurrence suffixes', () => {
  const symbols = extractComponentSymbols(`
    function RepeatedPanel() { return <span>first</span>; }
    function RepeatedPanel() { return <span>second</span>; }
  `, 'src/components/Repeated.tsx');

  assert.deepEqual(symbols.map(({ id }) => id), [
    'src/components/Repeated.tsx#RepeatedPanel',
    'src/components/Repeated.tsx#RepeatedPanel~2',
  ]);
});

test('malformed TSX produces positioned parse errors instead of a partial trusted inventory', () => {
  const errors = extractComponentParseErrors(
    'export function BrokenPanel( { return <div />; }',
    'src/components/BrokenPanel.tsx',
  );

  assert.ok(errors.length > 0);
  assert.equal(errors[0].file, 'src/components/BrokenPanel.tsx');
  assert.ok(errors[0].line > 0);
  assert.ok(errors[0].column > 0);
  assert.ok(errors[0].code > 0);
  assert.ok(errors[0].message.length > 0);
});

test('classifications must be exact: missing symbols and stale entries are reported', () => {
  const symbols = extractComponentSymbols(fixtureSource, 'src/components/Fixture.tsx');
  const manifest = {
    schemaVersion: 1,
    components: [
      { id: 'src/components/Fixture.tsx#PageHeader', classification: 'visual' },
      { id: 'src/components/Removed.tsx#OldPanel', classification: 'visual' },
    ],
  };
  const result = applyClassifications(symbols, manifest, ['visual', 'nonvisual']);
  assert.ok(result.unclassified.some(({ name }) => name === 'InternalPanel'));
  assert.deepEqual(result.staleManifestIds, ['src/components/Removed.tsx#OldPanel']);
  assert.equal(
    result.symbols.find(({ name }) => name === 'PageHeader')?.classification,
    'visual',
  );
});

test('source discovery follows the checked-in contract and excludes tests', async () => {
  const contract = await loadCoverageContract(COVERAGE_CONTRACT_PATH);
  const files = await discoverComponentSourceFiles(contract);
  assert.ok(files.some((file) => file.endsWith('/src/components/AppRoutes.tsx')));
  assert.ok(files.some((file) => file.endsWith('/src/pages/LeaderboardPage.tsx')));
  assert.ok(files.every((file) => !/\.(?:test|spec)\.tsx$/.test(file)));
});

test('inventory reports source parse errors so strict checks can fail closed', async (t) => {
  const projectRoot = await mkdtemp(join(tmpdir(), 'bega-vqa-inventory-'));
  t.after(() => rm(projectRoot, { force: true, recursive: true }));
  const componentsRoot = join(projectRoot, 'src/components');
  await mkdir(componentsRoot, { recursive: true });
  await writeFile(
    join(componentsRoot, 'BrokenPanel.tsx'),
    'export function BrokenPanel( { return <div />; }',
    'utf8',
  );
  const contract = await loadCoverageContract(COVERAGE_CONTRACT_PATH);
  const report = await scanComponentInventory({ contract, projectRoot });

  assert.ok(report.summary.parseErrors > 0);
  assert.equal(report.parseErrors[0].file, 'src/components/BrokenPanel.tsx');
});

test('the real inventory includes exported and internal symbols with stable unique ids', async () => {
  const contract = await loadCoverageContract(COVERAGE_CONTRACT_PATH);
  const report = await scanComponentInventory({ contract });
  assert.ok(report.symbols.length > 0);
  assert.ok(report.symbols.some(({ id }) => id === 'src/components/AppRoutes.tsx#AppRoutes'));
  assert.ok(report.symbols.some(({ id }) => id === 'src/components/prediction/PredictionShellIcons.tsx#BaseIcon'));
  assert.equal(new Set(report.symbols.map(({ id }) => id)).size, report.symbols.length);
  assert.equal(report.summary.symbols, report.symbols.length);
});

test('initial classification is conservative and never auto-excludes a candidate', () => {
  const symbols = [
    { id: 'src/components/Card.tsx#Card', file: 'src/components/Card.tsx', name: 'Card', qualifiedName: 'Card', exported: true, defaultExport: false },
    { id: 'src/components/icons/AppIcons.tsx#CloseIcon', file: 'src/components/icons/AppIcons.tsx', name: 'CloseIcon', qualifiedName: 'CloseIcon', exported: true, defaultExport: false },
    { id: 'src/components/MaybeUtility.tsx#MaybeUtility', file: 'src/components/MaybeUtility.tsx', name: 'MaybeUtility', qualifiedName: 'MaybeUtility', exported: false, defaultExport: false },
    { id: 'src/components/StaticConfig.tsx#StaticConfig', file: 'src/components/StaticConfig.tsx', name: 'StaticConfig', qualifiedName: 'StaticConfig', exported: true, defaultExport: false, runtimeShape: 'object-literal' },
  ];
  const manifest = buildInitialClassificationManifest(symbols, 'contract-v1');
  assert.equal(manifest.components.find(({ id }) => id.endsWith('#CloseIcon'))?.classification, 'grouped-gallery');
  assert.equal(manifest.components.find(({ id }) => id.endsWith('#MaybeUtility'))?.classification, 'visual');
  assert.equal(manifest.components.find(({ id }) => id.endsWith('#Card'))?.renderAccess, 'module-export');
  assert.equal(manifest.components.find(({ id }) => id.endsWith('#Card'))?.exportName, 'Card');
  assert.equal(manifest.components.find(({ id }) => id.endsWith('#MaybeUtility'))?.renderAccess, 'hosted');
  assert.equal(manifest.components.find(({ id }) => id.endsWith('#StaticConfig'))?.classification, 'nonvisual');
  assert.match(manifest.components.find(({ id }) => id.endsWith('#StaticConfig'))?.testEvidence ?? '', /object-literal/);
  assert.ok(manifest.components.every(({ classification }) => classification !== 'excluded'));
});

test('classification keeps conditional React wrappers visual and excludes proven static runtime values', () => {
  const symbols = extractComponentSymbols(`
    import React, { lazy } from 'react';
    function Panel() { return <div />; }
    const ConditionalPanel = import.meta.env.DEV ? lazy(() => import('./Panel')) : null;
    const RuntimeContext = React.createContext(null);
    const TeamOptions = ['A', 'B'].map((value) => ({ value }));
    const MatcherTokens = TeamOptions.flatMap(({ value }) => value.split(''));
    const TeamTieBreakRank = TeamOptions.reduce((result, { value }, index) => ({ ...result, [value]: index }), {});
    const FacilityImageUrls = import.meta.glob('./*.jpg');
    const DefaultDate = toDateInputValue(new Date());
    const Lookup = new Map();
    const PatternAlias = OTHER_PATTERN;
    const CssClass = condition ? 'a' : 'b';
    const NumericUtility = () => 42;
    const WrappedPanel = withFeature(Panel);
  `, 'src/components/RuntimeValues.tsx');
  const manifest = buildInitialClassificationManifest(symbols, 'contract-v1');
  const byName = new Map(symbols.map((symbol) => [
    symbol.name,
    manifest.components.find(({ id }) => id === symbol.id),
  ]));

  assert.equal(byName.get('ConditionalPanel')?.classification, 'visual');
  assert.equal(byName.get('ConditionalPanel')?.basis, 'reviewed-react-wrapper');
  assert.equal(byName.get('Panel')?.basis, 'reviewed-jsx-callable');
  for (const name of [
    'RuntimeContext',
    'TeamOptions',
    'MatcherTokens',
    'TeamTieBreakRank',
    'FacilityImageUrls',
    'DefaultDate',
    'Lookup',
    'PatternAlias',
    'CssClass',
  ]) {
    assert.equal(byName.get(name)?.classification, 'nonvisual', name);
    assert.match(byName.get(name)?.testEvidence ?? '', /runtimeShape|callee/);
  }
  assert.equal(byName.get('NumericUtility')?.basis, 'conservative-visual-default');
  assert.equal(byName.get('WrappedPanel')?.classification, 'visual');
});

test('classification manifest rejects duplicates and incomplete grouped or excluded entries', () => {
  const contract = validContractForManifest();
  const manifest = {
    schemaVersion: 1,
    contractId: contract.id,
    components: [
      { id: 'src/components/Card.tsx#Card', classification: 'visual' },
      { id: 'src/components/Card.tsx#Card', classification: 'visual' },
      { id: 'src/components/icons/AppIcons.tsx#CloseIcon', classification: 'grouped-gallery' },
      { id: 'src/components/Legacy.tsx#Legacy', classification: 'excluded' },
      { id: 'src/components/Static.tsx#Static', classification: 'nonvisual', renderAccess: 'module-export', exportName: 'Static' },
    ],
  };
  const errors = validateClassificationManifest(manifest, contract);
  assert.ok(errors.some((error) => error.includes('duplicate component id')));
  assert.ok(errors.some((error) => error.includes('galleryId')));
  assert.ok(errors.some((error) => error.includes('expiresOn')));
  assert.ok(errors.some((error) => error.includes('testEvidence')));
});

test('classification manifest enforces evidence for every non-excluded class and file-local galleries', () => {
  const contract = validContractForManifest();
  contract.classificationEvidencePolicy.appliesTo = [
    'visual',
    'behavior-only',
    'grouped-gallery',
    'nonvisual',
  ];
  const manifest = {
    schemaVersion: 1,
    contractId: contract.id,
    components: [
      {
        id: 'src/components/Card.tsx#Card',
        classification: 'visual',
        renderAccess: 'module-export',
        exportName: 'Card',
      },
      {
        id: 'src/components/icons/AppIcons.tsx#CloseIcon',
        classification: 'grouped-gallery',
        galleryId: 'src/components/icons/OtherIcons.tsx#icon-gallery',
        renderAccess: 'module-export',
        exportName: 'CloseIcon',
        owner: 'frontend-platform',
        reason: 'Icon gallery coverage.',
        testEvidence: 'icon harness',
      },
    ],
  };

  const errors = validateClassificationManifest(manifest, contract);
  assert.ok(errors.some((error) => error.includes('components[0].owner')));
  assert.ok(errors.some((error) => error.includes('components[0].reason')));
  assert.ok(errors.some((error) => error.includes('components[0].testEvidence')));
  assert.ok(errors.some((error) => error.includes('galleryId must equal')));
});

test('expired or malformed exclusions fail deterministically at the supplied audit date', () => {
  const contract = validContractForManifest();
  const baseEntry = {
    classification: 'excluded',
    issue: 'VQA-123',
    owner: 'frontend-platform',
    reason: 'Temporary migration boundary.',
    renderAccess: 'hosted',
  };
  const manifest = {
    schemaVersion: 1,
    contractId: contract.id,
    components: [
      { ...baseEntry, id: 'src/components/Expired.tsx#Expired', expiresOn: '2026-08-22' },
      { ...baseEntry, id: 'src/components/Malformed.tsx#Malformed', expiresOn: 'not-a-date' },
      { ...baseEntry, id: 'src/components/Current.tsx#Current', expiresOn: '2026-08-23' },
    ],
  };

  const errors = validateClassificationManifest(manifest, contract, { today: '2026-08-23' });
  assert.ok(errors.some((error) => error.includes('Expired') && error.includes('expired')));
  assert.ok(errors.some((error) => error.includes('Malformed') && error.includes('ISO date')));
  assert.ok(!errors.some((error) => error.includes('Current') && error.includes('expired')));
});

test('the checked-in classification registry is a complete owned evidence ledger', async () => {
  const [contract, manifest] = await Promise.all([
    loadCoverageContract(COVERAGE_CONTRACT_PATH),
    JSON.parse(await readFile(DEFAULT_CLASSIFICATION_PATH, 'utf8')),
  ]);
  assert.deepEqual(validateClassificationManifest(manifest, contract), []);
  assert.ok(manifest.components.every(({ owner }) => typeof owner === 'string' && owner.length > 0));
});

test('review completeness counts only conservative visual defaults', () => {
  assert.equal(countProvisionalVisualClassifications({
    components: [
      { id: 'a#Reviewed', classification: 'visual', basis: 'reviewed-react-component' },
      { id: 'b#Pending', classification: 'visual', basis: 'conservative-visual-default' },
      { id: 'c#Static', classification: 'nonvisual', basis: 'proven-static-runtime-value' },
    ],
  }), 1);
  assert.equal(countProvisionalVisualClassifications(null), 0);
});

test('reviewed zero-DOM runtime components stay behavior-only', async () => {
  const manifest = JSON.parse(await readFile(DEFAULT_CLASSIFICATION_PATH, 'utf8'));
  const byId = new Map(manifest.components.map((entry) => [entry.id, entry]));
  const zeroDomRuntimeIds = [
    'src/components/AuthBootstrap.tsx#AuthBootstrap',
    'src/components/AuthenticatedNotificationSocketBridge.tsx#AuthenticatedNotificationSocketBridge',
    'src/components/CoachBriefingAutoRuntime.tsx#CoachBriefingAutoRuntime',
    'src/components/debug/ChaosRenderProbe.tsx#ChaosRenderProbe',
    'src/components/home/HomeAuthBridge.tsx#HomeAuthBridge',
    'src/components/prediction/PredictionMatchVoteControllerRuntime.tsx#PredictionMatchVoteControllerRuntime',
    'src/components/PredictionQueryGuard.tsx#PredictionQueryGuard',
    'src/components/ScrollToTop.tsx#ScrollToTop',
    'src/components/TestError.tsx#RenderCrash',
  ];
  for (const id of zeroDomRuntimeIds) {
    assert.equal(byId.get(id)?.classification, 'behavior-only', id);
    assert.match(byId.get(id)?.testEvidence ?? '', /zero-DOM behavior-only classification/);
  }
});

test('manifest refresh preserves reviewed entries and only proposes newly discovered symbols', () => {
  const symbols = [
    { id: 'src/components/Provider.tsx#Provider', file: 'src/components/Provider.tsx', name: 'Provider', qualifiedName: 'Provider', exported: true, defaultExport: false },
    { id: 'src/components/NewCard.tsx#NewCard', file: 'src/components/NewCard.tsx', name: 'NewCard', qualifiedName: 'NewCard', exported: true, defaultExport: false },
  ];
  const existing = {
    schemaVersion: 1,
    contractId: 'contract-v1',
    components: [
      {
        id: 'src/components/Provider.tsx#Provider',
        classification: 'behavior-only',
        basis: 'reviewed-provider',
      },
      { id: 'src/components/Removed.tsx#Removed', classification: 'visual' },
    ],
  };
  const refreshed = refreshClassificationManifest(symbols, existing, 'contract-v1');
  assert.equal(refreshed.components.find(({ id }) => id.endsWith('#Provider'))?.classification, 'behavior-only');
  assert.equal(refreshed.components.find(({ id }) => id.endsWith('#NewCard'))?.classification, 'visual');
  assert.equal(refreshed.components.find(({ id }) => id.endsWith('#Provider'))?.renderAccess, 'module-export');
  assert.ok(!refreshed.components.some(({ id }) => id.includes('Removed')));
});

function validContractForManifest() {
  return {
    id: 'contract-v1',
    sourceScope: {
      classifications: ['visual', 'behavior-only', 'grouped-gallery', 'nonvisual', 'excluded'],
    },
    exclusionPolicy: {
      requiredFields: ['reason', 'owner', 'expiresOn', 'issue'],
    },
    classificationEvidencePolicy: {
      appliesTo: ['behavior-only', 'nonvisual'],
      requiredFields: ['reason', 'owner', 'testEvidence'],
    },
  };
}
