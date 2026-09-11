#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { productDefectAssertions } from './visual-qa-route-flow.integration.mjs';

const CANDIDATES = {
  navbar: 'src/components/PublicNavbar.tsx',
  dialog: 'src/components/ui/plain-dialog.tsx',
  ticketModal: 'src/components/ticket/TicketUploadModal.tsx',
};

const digest = (source) => createHash('sha256').update(source).digest('hex');

const redFixture = {
  navbar: {
    actualInteractiveOverlaps: [{ left: 'navbar-notification-trigger', right: 'navbar-dm-icon' }],
  },
  ticketModal: {
    title: { lineCount: 8 },
    dropzone: { visibleRatio: 0.25 },
    actualInteractiveOverlap: { width: 174, height: 88 },
  },
};

const greenFixture = {
  navbar: { actualInteractiveOverlaps: [] },
  ticketModal: {
    title: { lineCount: 2 },
    dropzone: { visibleRatio: 1 },
    actualInteractiveOverlap: null,
  },
};

const applyMutation = (path, source) => {
  if (path.endsWith('PublicNavbar.tsx')) {
    return source.replace(
      'className="flex min-w-0 flex-wrap items-center justify-self-end"',
      'className="flex min-w-0 items-center justify-self-end"',
    );
  }
  if (path.endsWith('plain-dialog.tsx')) {
    return source
      .replace('className="break-keep text-lg font-semibold', 'className="text-lg font-semibold')
      .replace("style={{ maxHeight: 'calc(35dvh - 32px)', paddingRight: 44 }}", "style={{ maxHeight: 'calc(35dvh - 32px)' }}");
  }
  return source
    .replace('className="break-keep text-body font-semibold"', 'className="text-body font-semibold"')
    .replace('style={{ minHeight: 176, padding: 24 }}', 'style={{ minHeight: 352, padding: 48 }}');
};

const main = async () => {
  const root = process.cwd();
  const isolatedRoot = await mkdtemp(join(tmpdir(), 'bega-vqa-200-mutation-'));
  const original = {};
  const mutated = {};
  try {
    for (const [id, relativePath] of Object.entries(CANDIDATES)) {
      const source = await readFile(join(root, relativePath), 'utf8');
      original[id] = { relativePath, source, sha256: digest(source) };
      const mutatedSource = applyMutation(relativePath, source);
      assert.notEqual(mutatedSource, source, `${id} mutation must change the isolated source copy`);
      mutated[id] = { relativePath, sha256: digest(mutatedSource) };
      await writeFile(join(isolatedRoot, id), mutatedSource, 'utf8');
    }

    const redFailures = productDefectAssertions(redFixture, { zoom: 2 });
    assert.ok(redFailures.length >= 3, 'the original defect assertion must fail against the mutation fixture');

    const greenFailures = productDefectAssertions(greenFixture, { zoom: 2 });
    assert.deepEqual(greenFailures, [], 'the unmutated behavior fixture must remain green');

    const restored = {};
    for (const [id, candidate] of Object.entries(original)) {
      await writeFile(join(isolatedRoot, id), candidate.source, 'utf8');
      const restoredSource = await readFile(join(isolatedRoot, id), 'utf8');
      restored[id] = digest(restoredSource);
      assert.equal(restored[id], candidate.sha256, `${id} source copy must restore exactly`);
    }

    console.log(JSON.stringify({
      status: 'PASS',
      isolatedRoot,
      redFailures: redFailures.map((failure) => failure.id),
      greenFailures: greenFailures.length,
      candidates: Object.fromEntries(Object.keys(original).map((id) => [id, {
        source: original[id].relativePath,
        originalSha256: original[id].sha256,
        mutatedSha256: mutated[id].sha256,
        restoredSha256: restored[id],
      }])),
    }, null, 2));
  } finally {
    await rm(isolatedRoot, { recursive: true, force: true });
  }
};

main().catch((error) => {
  console.error(`[visual-qa:mutation] FAILED ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
