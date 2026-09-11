import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyPendingEntry } from './visual-qa-pending-classification.mjs';

test('classifies a hosted entry with source and route evidence as route evidence work', () => {
  const result = classifyPendingEntry({
    entry: { id: 'src/components/Home.tsx#Home', renderAccess: 'hosted' },
    sourceExists: true,
    sourceText: 'export default function Home() { return null; }',
    routeText: 'const Home = lazy(() => import("./Home"));\n<Route path="/home" element={<Home />} />',
    adapterText: '',
    harnessText: '',
    testEvidence: ['src/components/Home.mobile.test.tsx'],
  });
  assert.equal(result.reason, 'hosted-route-evidence-required');
  assert.equal(result.priority, 'P1-common-surface');
  assert.equal(result.source.exported, true);
  assert.deepEqual(result.evidence.testFiles, ['src/components/Home.mobile.test.tsx']);
});

test('classifies a module export without a deterministic adapter separately', () => {
  const result = classifyPendingEntry({
    entry: { id: 'src/components/CheerCard.tsx#CheerCard', renderAccess: 'module-export' },
    sourceExists: true,
    sourceText: 'export function CheerCard() { return null; }',
    routeText: '',
    adapterText: 'const CheerCardPreview = () => null;',
    harnessText: '',
  });
  assert.equal(result.reason, 'module-export-adapter-required');
  assert.equal(result.source.symbolPresent, true);
});

test('does not turn a missing source or symbol into a registration candidate', () => {
  const missingSource = classifyPendingEntry({
    entry: { id: 'src/components/Missing.tsx#Missing', renderAccess: 'hosted' },
    sourceExists: false,
  });
  const missingSymbol = classifyPendingEntry({
    entry: { id: 'src/components/Home.tsx#OldHome', renderAccess: 'hosted' },
    sourceExists: true,
    sourceText: 'export default function Home() { return null; }',
  });
  assert.equal(missingSource.reason, 'source-missing');
  assert.equal(missingSymbol.reason, 'symbol-not-found');
});
