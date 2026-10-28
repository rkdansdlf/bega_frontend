#!/usr/bin/env node
// Pre-transforms the Vite dev server's module graph before Cypress starts.
//
// start-server-and-test only waits for the root URL, so the first browser visit pays for transforming
// every route module (~880 modules, ~6 s cold vs ~0.3 s warm on an idle host). On a loaded CI host that
// cold start exceeded Cypress' per-command waits (cy.wait on the first request, cy.get on first render).
// Warming is best-effort: it never fails the run, and it is opt-in (KBO_VITE_WARMUP=1) via test-e2e.mjs.
import { pathToFileURL } from 'node:url';

const DEFAULT_ENTRIES = ['/src/main.tsx', '/@vite/client'];
const DEFAULT_CONCURRENCY = 6;
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;
const DEFAULT_BUDGET_MS = 180_000;
// Absolute-path specifiers in Vite-transformed output: `from "/src/x.tsx"`, `import("/src/y.tsx")`, `import "/z.css"`.
const IMPORT_SPECIFIER_PATTERN = /(?:from\s*|import\s*\(\s*|import\s*)["'](\/[^"'\s]+)["']/g;

export const extractImportSpecifiers = (source) => (
  [...source.matchAll(IMPORT_SPECIFIER_PATTERN)]
    .map((match) => match[1])
    .filter((specifier) => !specifier.startsWith('//'))
);

export const warmUpViteServer = async (baseUrl, options = {}) => {
  const {
    entries = DEFAULT_ENTRIES,
    concurrency = DEFAULT_CONCURRENCY,
    requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    budgetMs = DEFAULT_BUDGET_MS,
    fetchImpl = fetch,
  } = options;
  const origin = baseUrl.replace(/\/+$/, '');
  const seen = new Set();
  const queue = [];
  const enqueue = (path) => {
    if (!seen.has(path)) {
      seen.add(path);
      queue.push(path);
    }
  };
  const startedAt = Date.now();
  let failed = 0;
  let budgetExceeded = false;

  const warmOne = async (path) => {
    try {
      const response = await fetchImpl(`${origin}${path}`, { signal: AbortSignal.timeout(requestTimeoutMs) });
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        failed += 1;
        await response.body?.cancel();
        return;
      }
      if (!contentType.includes('javascript')) {
        await response.body?.cancel();
        return;
      }
      for (const specifier of extractImportSpecifiers(await response.text())) {
        enqueue(specifier);
      }
    } catch {
      failed += 1;
    }
  };

  // The root document first: it is what Cypress navigates to and it proves the server answers at all.
  seen.add('/');
  await warmOne('/');
  entries.forEach(enqueue);

  await new Promise((resolve) => {
    let active = 0;
    const pump = () => {
      if (!budgetExceeded && Date.now() - startedAt > budgetMs) {
        budgetExceeded = true;
      }
      while (!budgetExceeded && active < concurrency && queue.length > 0) {
        const path = queue.shift();
        active += 1;
        warmOne(path).finally(() => {
          active -= 1;
          pump();
        });
      }
      if (active === 0 && (queue.length === 0 || budgetExceeded)) {
        resolve();
      }
    };
    pump();
  });

  return { modules: seen.size, failed, elapsedMs: Date.now() - startedAt, budgetExceeded };
};

const main = async () => {
  const baseUrl = process.argv[2];
  if (!baseUrl) {
    console.log('[vite-warmup] skipped: no base URL given');
    return;
  }
  const summary = await warmUpViteServer(baseUrl);
  console.log(
    `[vite-warmup] ${baseUrl} modules=${summary.modules} failed=${summary.failed} `
    + `elapsed=${(summary.elapsedMs / 1000).toFixed(1)}s${summary.budgetExceeded ? ' budget-exceeded' : ''}`,
  );
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Best-effort by design: warming must never be the reason a QA run fails.
  main().catch((error) => {
    console.log(`[vite-warmup] skipped: ${error?.message ?? error}`);
  }).finally(() => process.exit(0));
}
