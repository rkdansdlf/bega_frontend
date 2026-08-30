import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';
import { createServer, type Plugin } from 'vite';

const packageManifest = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { scripts: Record<string, string> };
const frontendRoot = fileURLToPath(new URL('../../', import.meta.url));
const pagePath = '/__ranking-prediction-completion-panel-test.html';
const entryPath = '/__ranking-prediction-completion-panel-test.tsx';
const moduleId = '\0virtual:ranking-prediction-completion-panel-test';

const callbackSwapMutation = process.env.RANKING_COMPLETION_MUTATE_CALLBACK_SWAP === '1';
const callbackDuplicateMutation = process.env.RANKING_COMPLETION_MUTATE_CALLBACK_DUPLICATE === '1';
const transitionRemovalMutation = process.env.RANKING_COMPLETION_MUTATE_TRANSITION_REMOVAL === '1';
const phaseMappingMutation = process.env.RANKING_COMPLETION_MUTATE_PHASE_MAPPING === '1';
const savedPrecedenceMutation = process.env.RANKING_COMPLETION_MUTATE_SAVED_PRECEDENCE === '1';
const selectorRemovalMutation = process.env.RANKING_COMPLETION_MUTATE_SELECTOR_REMOVAL === '1';
const overflowRemovalMutation = process.env.RANKING_COMPLETION_MUTATE_OVERFLOW_REMOVAL === '1';
const reducedMotionRemovalMutation = process.env.RANKING_COMPLETION_MUTATE_REDUCED_MOTION === '1';
const nonActionMutation = process.env.RANKING_COMPLETION_MUTATE_NON_ACTION_LEDGER === '1';
const packageMutation = process.env.RANKING_COMPLETION_MUTATE_PACKAGE ?? '';

const replaceRequired = (source: string, needle: string, replacement: string, label: string) => {
  if (!source.includes(needle)) {
    throw new Error(`${label} mutation target missing`);
  }
  return source.replace(needle, replacement);
};

const replacePatternRequired = (
  source: string,
  pattern: RegExp,
  replacement: string,
  label: string,
) => {
  if (!pattern.test(source)) {
    throw new Error(`${label} mutation target missing`);
  }
  return source.replace(pattern, replacement);
};

const replaceAllRequired = (source: string, needle: string, replacement: string, label: string) => {
  if (!source.includes(needle)) {
    throw new Error(`${label} mutation target missing`);
  }
  return source.split(needle).join(replacement);
};

const createCompletionPanelPlugin = (): Plugin => ({
  name: 'ranking-prediction-completion-panel-actual-mount-test',
  enforce: 'pre',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if (request.url?.split('?')[0] !== pagePath) {
        next();
        return;
      }
      try {
        const html = await server.transformIndexHtml(
          pagePath,
          `<!doctype html><html><body><div id="root"></div><script type="module" src="${entryPath}"></script></body></html>`,
        );
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(html);
      } catch (error) {
        next(error);
      }
    });
  },
  resolveId(id) {
    return id === entryPath ? moduleId : undefined;
  },
  transform(code, id) {
    if (!id.split('?')[0].endsWith('/src/components/RankingPredictionCompletionPanel.tsx')) {
      return undefined;
    }
    let transformed = code;
    if (phaseMappingMutation) {
      transformed = replaceRequired(
        transformed,
        '!isPredictionSaved && !alreadySaved',
        'isPredictionSaved && !alreadySaved',
        'phase mapping',
      );
    }
    if (savedPrecedenceMutation) {
      transformed = replacePatternRequired(
        transformed,
        /:\s*alreadySaved\s*\?/,
        ': false ?',
        'saved precedence',
      );
    }
    if (selectorRemovalMutation) {
      transformed = replaceRequired(
        transformed,
        'ranking-share-btn',
        'ranking-share-btn-removed',
        'stable selector',
      );
    }
    if (overflowRemovalMutation) {
      transformed = replaceAllRequired(
        transformed,
        'overflow-hidden',
        '',
        'overflow containment',
      );
      transformed = replaceAllRequired(
        transformed,
        'break-all',
        '',
        'fallback text overflow containment',
      );
    }
    if (reducedMotionRemovalMutation) {
      transformed = replaceRequired(
        transformed,
        'motion-reduce:animate-none',
        '',
        'reduced motion',
      );
    }
    return transformed === code ? undefined : transformed;
  },
  load(id) {
    if (id !== moduleId) return undefined;
    return `
      import React, { StrictMode, createElement, useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import CompletionPanel from '/src/components/RankingPredictionCompletionPanel.tsx';
      import '/src/index.css';

      const mutations = {
        callbackSwap: ${callbackSwapMutation ? 'true' : 'false'},
        callbackDuplicate: ${callbackDuplicateMutation ? 'true' : 'false'},
        transitionRemoval: ${transitionRemovalMutation ? 'true' : 'false'},
        nonAction: ${nonActionMutation ? 'true' : 'false'},
      };
      const calls = { complete: 0, save: 0, share: 0, unrelated: 0 };

      function Host({ initialPhase = 'complete', team = 'HH' }) {
        const [phase, setPhase] = useState(initialPhase);
        const record = (key) => {
          calls[key] += 1;
          if (mutations.callbackDuplicate) calls[key] += 1;
        };
        const complete = () => {
          record(mutations.callbackSwap ? 'save' : 'complete');
          if (!mutations.transitionRemoval) setPhase('ready-to-save');
        };
        const save = () => record(mutations.callbackSwap ? 'share' : 'save');
        const share = () => record(mutations.callbackSwap ? 'complete' : 'share');
        const booleans = phase === 'complete'
          ? { isPredictionSaved: false, alreadySaved: false }
          : phase === 'ready-to-save'
            ? { isPredictionSaved: true, alreadySaved: false }
            : { isPredictionSaved: true, alreadySaved: true };
        return createElement('div', {
          className: 'mx-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-border dark:bg-card',
          'data-testid': 'ranking-completion-test-surface',
          onMouseEnter: mutations.nonAction ? complete : undefined,
        }, createElement(CompletionPanel, {
          topTeamShortName: team === 'null-optional' ? undefined : team,
          ...booleans,
          onCompletePrediction: complete,
          onSave: save,
          onShare: share,
        }));
      }

      const root = createRoot(document.getElementById('root'));
      let generation = 0;
      const mount = (phase = 'complete', team = 'HH') => {
        generation += 1;
        root.render(createElement(StrictMode, null, createElement(Host, {
          key: generation,
          initialPhase: phase,
          team,
        })));
      };
      const reset = () => {
        calls.complete = 0;
        calls.save = 0;
        calls.share = 0;
        calls.unrelated = 0;
      };
      window.__RANKING_COMPLETION_PANEL_TEST__ = { calls, mount, reset };
      mount('complete', 'HH');
    `;
  },
});

type Calls = { complete: number; save: number; share: number; unrelated: number };
type Phase = 'complete' | 'ready-to-save' | 'saved';

test('ranking and pre-harness gates include the completion panel actual test exactly once', () => {
  const testPath = 'src/components/RankingPredictionCompletionPanel.mobile.test.tsx';
  for (const scriptName of ['test:ranking:unit', 'previsual-qa:harness:test']) {
    const originalCommand = packageManifest.scripts[scriptName] ?? '';
    const command = packageMutation === 'missing'
      ? originalCommand.replace(testPath, '')
      : packageMutation === 'duplicate'
        ? `${originalCommand} ${testPath}`
        : originalCommand;
    assert.equal(
      command.split(testPath).length - 1,
      1,
      `${scriptName} must include ${testPath} exactly once`,
    );
  }
});

test('actual completion panel is mobile-contained, accessible, and callback-exact', {
  timeout: 120_000,
}, async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'ranking-completion-vite-'));
  const server = await createServer({
    cacheDir,
    configFile: fileURLToPath(new URL('../../vite.visual-qa.config.ts', import.meta.url)),
    logLevel: process.env.RANKING_COMPLETION_DEBUG === '1' ? 'info' : 'silent',
    plugins: [createCompletionPanelPlugin()],
    root: frontendRoot,
    server: { host: '127.0.0.1', port: 0, strictPort: false },
  });
  let browser;
  try {
    await server.listen();
    const address = server.httpServer?.address();
    assert.ok(address && typeof address !== 'string');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width: 320, height: 844 },
    });
    const page = await context.newPage();
    const diagnostics: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') diagnostics.push(message.text());
    });
    page.on('pageerror', (error) => diagnostics.push(error.message));
    const response = await page.goto(`http://127.0.0.1:${address.port}${pagePath}`);
    assert.equal(response?.status(), 200);

    const readCalls = () => page.evaluate(() => JSON.parse(JSON.stringify((
      window as unknown as { __RANKING_COMPLETION_PANEL_TEST__: { calls: Calls } }
    ).__RANKING_COMPLETION_PANEL_TEST__.calls)) as Calls);
    const reset = () => page.evaluate(() => (
      window as unknown as { __RANKING_COMPLETION_PANEL_TEST__: { reset: () => void } }
    ).__RANKING_COMPLETION_PANEL_TEST__.reset());
    const mount = (phase: Phase, team = 'HH') => page.evaluate(({ nextPhase, nextTeam }) => (
      window as unknown as { __RANKING_COMPLETION_PANEL_TEST__: {
        mount: (phase: Phase, team: string) => void;
      } }
    ).__RANKING_COMPLETION_PANEL_TEST__.mount(nextPhase, nextTeam), {
      nextPhase: phase,
      nextTeam: team,
    });
    const settle = () => page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    const zero = { complete: 0, save: 0, share: 0, unrelated: 0 };
    const assertZero = async (label: string) => assert.deepEqual(await readCalls(), zero, label);
    const mountFresh = async (phase: Phase, team = 'HH') => {
      await assertZero(`before ${phase}/${team} keyed remount`);
      await mount(phase, team);
      await page.getByTestId('ranking-completion-panel').waitFor();
      await settle();
      await assertZero(`${phase}/${team} keyed remount`);
      await reset();
    };

    await page.getByTestId('ranking-completion-panel').waitFor({ timeout: 15_000 }).catch((error: unknown) => {
      throw new Error(`${String(error)}\n${diagnostics.join('\n')}`);
    });
    await settle();
    await assertZero('StrictMode mount callback ledger');
    await mountFresh('complete');

    const fixtures = ['null-optional', 'HH', '모바일폭에서여러줄로자연스럽게줄바꿈되어야하는긴한글팀이름', `UNBROKEN_${'TOKEN'.repeat(36)}`];
    for (const viewport of [
      { width: 320, height: 844 },
      { width: 390, height: 1000 },
    ] as const) {
      await page.setViewportSize(viewport);
      await settle();
      await assertZero(`${viewport.width}px resize callback ledger`);
      for (const team of fixtures) {
        for (const phase of ['complete', 'ready-to-save', 'saved'] as const) {
          await mountFresh(phase, team);
          const metrics = await page.evaluate(() => {
            const root = document.querySelector('[data-testid="ranking-completion-panel"]');
            const surface = document.querySelector('[data-testid="ranking-completion-test-surface"]');
            const rootRect = root?.getBoundingClientRect();
            const surfaceRect = surface?.getBoundingClientRect();
            const logo = root?.querySelector('[style*="width: 140px"]');
            const logoFrame = logo?.parentElement;
            const children = root ? Array.from(root.querySelectorAll('*')).map((node) => {
              const rect = node.getBoundingClientRect();
              return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
            }) : [];
            const buttons = root ? Array.from(root.querySelectorAll('button')).map((node) => {
              const rect = node.getBoundingClientRect();
              return {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                right: rect.right,
                bottom: rect.bottom,
                text: node.textContent,
              };
            }) : [];
            const trophy = root?.querySelector('img');
            return {
              animationName: root ? getComputedStyle(root).animationName : null,
              buttons,
              children,
              containment: root ? {
                logoFrameOverflowX: logoFrame ? getComputedStyle(logoFrame).overflowX : null,
                logoOverflowX: logo ? getComputedStyle(logo).overflowX : null,
                logoWordBreak: logo ? getComputedStyle(logo).wordBreak : null,
                rootOverflowX: getComputedStyle(root).overflowX,
              } : null,
              documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              root: rootRect ? { x: rootRect.x, y: rootRect.y, width: rootRect.width, height: rootRect.height, right: rootRect.right, bottom: rootRect.bottom } : null,
              surface: surfaceRect ? { x: surfaceRect.x, y: surfaceRect.y, width: surfaceRect.width, height: surfaceRect.height, right: surfaceRect.right, bottom: surfaceRect.bottom } : null,
              trophy: trophy ? {
                alt: trophy.getAttribute('alt'),
                complete: (trophy as HTMLImageElement).complete,
                naturalWidth: (trophy as HTMLImageElement).naturalWidth,
                src: (trophy as HTMLImageElement).src,
              } : null,
              viewport: { width: window.innerWidth, height: window.innerHeight },
            };
          });
          assert.ok(metrics.root && metrics.surface, 'root and surface rects');
          assert.ok(metrics.root.x >= metrics.surface.x - 0.5 && metrics.root.right <= metrics.surface.right + 0.5, `root containment ${viewport.width}/${team}/${phase}`);
          for (const child of metrics.children) {
            assert.ok(child && child.x >= metrics.root.x - 0.5 && child.right <= metrics.root.right + 0.5, `child containment ${viewport.width}/${team}/${phase}: ${JSON.stringify(child)}`);
          }
          assert.equal(metrics.documentOverflow, 0, `${viewport.width}/${team}/${phase} horizontal overflow`);
          assert.equal(metrics.containment?.rootOverflowX, 'hidden', 'root clips painted overflow at its own boundary');
          if (team !== 'null-optional') {
            assert.equal(metrics.containment?.logoFrameOverflowX, 'hidden', '140px logo frame contains painted overflow');
            assert.equal(metrics.containment?.logoOverflowX, 'hidden', 'logo fallback contains painted overflow');
            assert.equal(metrics.containment?.logoWordBreak, 'break-all', 'unbroken fallback text can wrap');
          }
          assert.ok(metrics.trophy?.complete && metrics.trophy.naturalWidth > 0, 'local trophy asset loaded');
          assert.match(metrics.trophy?.src ?? '', /^http:\/\/127\.0\.0\.1:\d+\/src\/assets\//);
          assert.match(metrics.trophy?.alt ?? '', /1위.*트로피|트로피.*1위/, 'useful Korean trophy alt');
          assert.equal(metrics.animationName, 'none', 'reduced motion disables root animation');
          const expectedActionCount = phase === 'ready-to-save' ? 2 : 1;
          assert.equal(metrics.buttons.length, expectedActionCount, `${phase} action count`);
          for (const action of metrics.buttons) {
            assert.ok(action && action.width >= (metrics.root.width - 1), `${phase} action full width`);
            assert.ok(action && action.height >= 44, `${phase} action touch height`);
          }
          await assertZero(`${viewport.width}/${team}/${phase} visual callback ledger`);
        }
      }
    }

    await page.setViewportSize({ width: 320, height: 844 });
    await settle();
    await assertZero('viewport restore callback ledger');
    await mountFresh('ready-to-save');
    const save = page.getByTestId('ranking-save-btn');
    const share = page.getByTestId('ranking-share-btn');

    await save.focus();
    await settle();
    await assertZero('save focus-visible callback ledger');
    const focusStyles = await save.evaluate((node) => ({
      background: getComputedStyle(node).backgroundColor,
      boxShadow: getComputedStyle(node).boxShadow,
      outline: getComputedStyle(node).outlineColor,
    }));
    assert.notEqual(focusStyles.boxShadow, 'none', 'focus ring visible');
    await page.keyboard.press('Tab');
    await settle();
    await assertZero('Tab save-to-share callback ledger');
    assert.equal(await share.evaluate((node) => node === document.activeElement), true);
    await page.keyboard.press('Shift+Tab');
    await settle();
    await assertZero('Shift+Tab share-to-save callback ledger');
    assert.equal(await save.evaluate((node) => node === document.activeElement), true);

    for (const theme of ['dark', 'light'] as const) {
      await page.evaluate((nextTheme) => document.documentElement.classList.toggle('dark', nextTheme === 'dark'), theme);
      await settle();
      await assertZero(`${theme} theme callback ledger`);
    }

    const nonActions = [
      { id: 'complete', phase: 'complete' as const, testId: 'ranking-complete-btn' },
      { id: 'save', phase: 'ready-to-save' as const, testId: 'ranking-save-btn' },
      { id: 'share', phase: 'saved' as const, testId: 'ranking-share-btn' },
    ];
    for (const target of nonActions) {
      await mountFresh(target.phase);
      const action = page.getByTestId(target.testId);
      await action.hover();
      await settle();
      await assertZero(`${target.id} hover callback ledger`);
      await action.focus();
      await settle();
      await assertZero(`${target.id} focus callback ledger`);
      await action.hover();
      await page.mouse.down();
      await settle();
      await assertZero(`${target.id} pressed callback ledger`);
      await page.mouse.up();
      await settle();
      assert.deepEqual(await readCalls(), {
        ...zero,
        [target.id]: 1,
      }, `${target.id} pointer release exact one`);
      await reset();
    }

    const activationCases = [
      { action: 'complete', phase: 'complete' as const, testId: 'ranking-complete-btn' },
      { action: 'save', phase: 'ready-to-save' as const, testId: 'ranking-save-btn' },
      { action: 'share', phase: 'saved' as const, testId: 'ranking-share-btn' },
    ] as const;
    for (const activation of activationCases) {
      for (const mode of ['click', 'Enter', 'Space'] as const) {
        await mountFresh(activation.phase);
        const action = page.getByTestId(activation.testId);
        if (mode === 'click') await action.click();
        else {
          await action.focus();
          await page.keyboard.press(mode);
        }
        await settle();
        assert.deepEqual(await readCalls(), {
          ...zero,
          [activation.action]: 1,
        }, `${activation.action}/${mode} exact callback ledger`);
        await reset();
        await assertZero(`${activation.action}/${mode} post-assert reset`);
      }
    }

    await mountFresh('complete');
    await page.getByTestId('ranking-complete-btn').dblclick({ delay: 0 });
    await settle();
    assert.deepEqual(await readCalls(), { ...zero, complete: 1 }, 'fast double complete exact one');
    assert.equal(await page.getByTestId('ranking-complete-btn').count(), 0);
    assert.equal(await page.getByTestId('ranking-save-btn').count(), 1);
    await reset();
    await assertZero('fast double complete post-assert reset');

    await mountFresh('saved');
    assert.equal(await page.getByTestId('ranking-save-btn').count(), 0, 'alreadySaved takes precedence');
    assert.equal(await page.getByTestId('ranking-share-btn').count(), 1);
    assert.deepEqual(diagnostics, []);
    await context.close();
  } finally {
    await browser?.close();
    await server.close();
    await rm(cacheDir, { recursive: true, force: true });
  }
});
