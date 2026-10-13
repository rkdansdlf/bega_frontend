import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AUTOMATIC_COMPONENT_STATE_SCENARIOS, type AutomaticComponentStateScenario } from '../src/visual-qa/harnessCatalog';
import {
  executeHarnessScenarioWithRetry,
  installOfflineRoutes,
  launchBrowser,
  probeIsolatedScenario,
} from './visual-qa-harness-smoke';

const ids = {
  kit: 'src/components/ui/UIKitPreview.tsx#UIKitPreview',
  home: 'src/components/home/HomeSecondaryPanels.tsx#HomeSecondaryPanels',
  cheer: 'src/components/CheerRuntime.tsx#CheerRuntime',
  controls: 'src/components/MateListControlsRuntime.tsx#MateListControlsRuntime',
  row: 'src/components/MatePartyCard.tsx#PartyRow',
  compact: 'src/components/MatePartyCard.tsx#PartyCompact',
  tabs: 'src/components/MateStatusTabs.tsx#MateStatusTabs',
};
const primitives = ['button.tsx#Button', 'plain-button.tsx#Button', 'input.tsx#Input', 'textarea.tsx#Textarea', 'status-badge.tsx#StatusBadge'];
type MatrixCase = { scenario: AutomaticComponentStateScenario; width: number; zoom: number; phase: string; theme: string };

export const selectDesignScenario = (
  componentId: string,
  theme: string,
  state: Record<string, string> = {},
) => {
  const selected = AUTOMATIC_COMPONENT_STATE_SCENARIOS.find((scenario) => (
    scenario.componentId === componentId
    && (!scenario.variants.theme || scenario.variants.theme === theme)
    && Object.entries({ interactions: 'default', ...state }).every(([key, value]) => (
      (key.startsWith('variant.') ? scenario.variants[key.slice(8)] : scenario.states[key as keyof typeof scenario.states]) === value
    ))
    && (!scenario.states.system || state.system || scenario.states.system === 'idle')
    && (!scenario.states.permissions || scenario.states.permissions === 'anonymous')
    && (!scenario.variants.calendar || scenario.variants.calendar === 'closed')
    && (!scenario.variants.recovery || scenario.variants.recovery === 'enabled')
    && (!scenario.variants.surface || scenario.variants.surface === 'feed')
    && (!scenario.variants.tab || scenario.variants.tab === 'all')
    && (!scenario.variants.status || scenario.variants.status === 'recruiting')
    && (!scenario.variants.favorite || scenario.variants.favorite === 'idle')
    && (!scenario.variants.activeTab || scenario.variants.activeTab === 'all')
    && (!scenario.variants.presentation || scenario.variants.presentation === 'default-default')
    && (!scenario.variants.availability || scenario.variants.availability === 'enabled')
    && (!scenario.variants.invalid || scenario.variants.invalid === 'false')
    && (!scenario.variants.type || scenario.variants.type === 'text')
    && (!scenario.variants.visualVariant || scenario.variants.visualVariant === 'filled')
    && (!scenario.variants.tone || scenario.variants.tone === (componentId.includes('status-badge') ? 'neutral' : 'brand'))
    && (!scenario.variants.variant || scenario.variants.variant === 'default')
    && (!scenario.variants.content || scenario.variants.content === 'label-only')
    && (!scenario.variants.element || scenario.variants.element === 'button')
    && (!scenario.variants.size || scenario.variants.size === (componentId.includes('status-badge') ? 'sm' : 'default'))
    && (!scenario.variants.customColors || scenario.variants.customColors === 'default')
    && (!scenario.variants.live || scenario.variants.live === 'off')
  ));
  if (!selected) throw new Error(`No registered design scenario: ${componentId} / ${theme} / ${JSON.stringify(state)}`);
  return selected;
};

export const designEnvironmentCases = (phase: 'before' | 'after'): MatrixCase[] => {
  const cases: MatrixCase[] = [];
  const parents = phase === 'after' ? [ids.kit, ids.home, ids.cheer, ids.controls] : [ids.home, ids.cheer, ids.controls, ids.row];
  for (const componentId of parents) {
    for (const width of phase === 'after' ? [320, 390, 768, 1024, 1440] : [320, 1440]) {
      for (const theme of ['light', 'dark']) {
        for (const zoom of phase === 'after' ? [1, 2] : [1]) {
          const data: Record<string, string> = componentId === ids.kit ? {} : { data: componentId === ids.home ? 'populated' : 'single' };
          if (componentId === ids.controls) data['variant.layout'] = width < 768 ? 'mobile' : 'desktop';
          const responsiveId = componentId === ids.row && width < 768 ? ids.compact : componentId;
          cases.push({ scenario: selectDesignScenario(responsiveId, theme, data), width, zoom, phase, theme });
        }
      }
    }
  }
  if (phase === 'after') {
    for (const componentId of [ids.row, ids.tabs]) for (const width of [320, 1440]) for (const theme of ['light', 'dark']) for (const zoom of [1, 2]) {
      const responsiveId = componentId === ids.row && width < 768 ? ids.compact : componentId;
      cases.push({ scenario: selectDesignScenario(responsiveId, theme, componentId === ids.row ? { data: 'single' } : {}), width, zoom, phase, theme });
    }
    for (const name of primitives) for (const theme of ['light', 'dark']) {
      cases.push({ scenario: selectDesignScenario(`src/components/ui/${name}`, theme, { data: 'single' }), width: 320, zoom: 2, phase, theme });
    }
    for (const componentId of [ids.home, ids.cheer]) for (const system of ['loading', 'error-503']) for (const theme of ['light', 'dark']) {
      cases.push({ scenario: selectDesignScenario(componentId, theme, { data: 'empty', system }), width: 320, zoom: 2, phase, theme });
    }
    for (const interactions of ['open', 'input', 'keyboard-navigation']) for (const zoom of [1, 2]) {
      cases.push({ scenario: selectDesignScenario(ids.kit, 'light', { interactions }), width: 320, zoom, phase, theme: 'light' });
    }
  }
  return cases;
};

const main = async () => {
  const phase = process.env.DESIGN_QA_PHASE === 'before' ? 'before' : 'after';
  const baseUrl = process.env.DESIGN_QA_BASE_URL ?? (phase === 'before' ? 'http://127.0.0.1:5183' : 'http://127.0.0.1:5182');
  const output = resolve(process.env.DESIGN_QA_OUTPUT ?? `artifacts/design-consistency-20261013/${phase}/environment-matrix`);
  const cases = designEnvironmentCases(phase).sort((a, b) => `${a.width}-${a.theme}-${a.zoom}`.localeCompare(`${b.width}-${b.theme}-${b.zoom}`));
  const browser = await launchBrowser();
  const results = [];
  await mkdir(output, { recursive: true });
  let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  let page: Awaited<ReturnType<NonNullable<typeof context>['newPage']>> | undefined;
  let previousEnvironment = '';
  try {
    for (const [index, entry] of cases.entries()) {
      const environment = `${entry.width}-${entry.theme}-${entry.zoom}`;
      const reuseExistingPage = environment === previousEnvironment;
      if (!reuseExistingPage) {
        await context?.close();
        context = await browser.newContext({ viewport: { width: entry.width, height: 900 }, reducedMotion: 'reduce', colorScheme: entry.theme });
        await installOfflineRoutes(context, new URL(baseUrl).origin);
        await context.addInitScript(({ zoom, theme }) => {
          const apply = () => {
            document.documentElement.style.fontSize = `${16 * zoom}px`;
            document.documentElement.classList.toggle('dark', theme === 'dark');
          };
          localStorage.setItem('theme', theme);
          document.addEventListener('DOMContentLoaded', apply, { once: true });
          if (document.documentElement) apply();
        }, { zoom: entry.zoom, theme: entry.theme });
        page = await context.newPage();
        previousEnvironment = environment;
      }
      if (!context || !page) throw new Error('Missing matrix browser context');
      process.env.VISUAL_QA_HARNESS_VIEWPORT = `${entry.width}x900`;
      await page.setViewportSize({ width: entry.width, height: 900 });
      const screenshotDir = resolve(output, `${index + 1}-${entry.width}-${entry.theme}-${entry.zoom * 100}`);
      await mkdir(screenshotDir, { recursive: true });
      const activeContext = context;
      const activePage = page;
      let reuseForAttempt = reuseExistingPage;
      const probe = await executeHarnessScenarioWithRetry(async () => {
        const result = await probeIsolatedScenario({ context: activeContext, page: activePage, reuseExistingPage: reuseForAttempt, baseUrl, scenario: entry.scenario, timeoutMs: 45_000, screenshotDir, captureHeightMode: 'mobile', preparePage: async (readyPage) => {
          await readyPage.evaluate(async (zoom) => {
            document.documentElement.style.fontSize = `${16 * zoom}px`;
            await new Promise<void>((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())));
          }, entry.zoom);
        } });
        reuseForAttempt = false;
        return result;
      });
      if (probe.status === 'fail') previousEnvironment = '';
      const geometry = probe.status === 'pass' ? await page.evaluate(() => {
        const surface = document.querySelector<HTMLElement>('[data-vqa-harness-surface]');
        const bounds = surface?.getBoundingClientRect();
        const root = document.documentElement;
        const controls = [...(surface?.querySelectorAll<HTMLElement>('button,input,textarea') ?? [])].slice(0, 12).map((element) => {
          const style = getComputedStyle(element);
          return { tag: element.tagName, disabled: element.hasAttribute('disabled'), fontSize: style.fontSize, transitionDuration: style.transitionDuration, animationDuration: style.animationDuration };
        });
        return { viewportWidth: window.innerWidth, rootFontSize: getComputedStyle(root).fontSize, darkClass: root.classList.contains('dark'), documentScrollWidth: root.scrollWidth, documentClientWidth: root.clientWidth, surfaceBounds: bounds ? { left: bounds.left, right: bounds.right, width: bounds.width } : null, horizontalOverflowCandidate: root.scrollWidth > root.clientWidth + 1 || Boolean(bounds && (bounds.left < -1 || bounds.right > window.innerWidth + 1)), reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, controls, mobileSafeBottom: getComputedStyle(root).getPropertyValue('--mobile-content-safe-bottom').trim() };
      }) : null;
      const safeArea = probe.status === 'pass' && entry.scenario.componentId === ids.cheer && entry.width === 320 ? await page.evaluate(() => {
        const root = document.documentElement;
        const shell = document.querySelector<HTMLElement>('[data-vqa-harness-surface] .min-h-screen');
        const before = shell ? getComputedStyle(shell).paddingBottom : null;
        const original = root.style.getPropertyValue('--mobile-content-safe-bottom');
        root.style.setProperty('--mobile-content-safe-bottom', 'calc(var(--mobile-chrome-height) + var(--mobile-chrome-bottom-offset) + 32px + 2rem)');
        const after = shell ? getComputedStyle(shell).paddingBottom : null;
        if (original) root.style.setProperty('--mobile-content-safe-bottom', original); else root.style.removeProperty('--mobile-content-safe-bottom');
        return { method: 'simulated 32px bottom inset through existing mobile safe-bottom variable; not native env()', before, after, deltaPx: before && after ? parseFloat(after) - parseFloat(before) : null };
      }) : null;
      const environmentVerified = geometry !== null
        && geometry.viewportWidth === entry.width
        && geometry.rootFontSize === `${16 * entry.zoom}px`
        && geometry.darkClass === (entry.theme === 'dark')
        && geometry.reducedMotion;
      results.push({ index: index + 1, ...entry, probe, geometry, safeArea, environmentVerified });
      if ((index + 1) % 5 === 0 || index === cases.length - 1) console.log(`[design-environment] ${phase} ${index + 1}/${cases.length}; failures=${results.filter((r) => r.probe.status === 'fail').length}`);
      await writeFile(resolve(output, 'report.json'), `${JSON.stringify({ phase, baseUrl, fullCoverage: false, zoomMethod: 'document.documentElement.style.fontSize', zoomLimitation: 'Root font 16/32px tests rem-based text enlargement; pixel font tokens do not automatically scale. This is not native browser zoom.', reducedMotion: 'reduce with computed durations recorded; nonzero durations are observations, not automatically defects', safeAreaMethod: 'Simulated existing CSS variable, not native device safe-area environment', boundsClassification: 'Candidates only; intentional scroll and truncation require human review', total: cases.length, completed: results.length, passed: results.filter((r) => r.probe.status === 'pass' && r.environmentVerified).length, failed: results.filter((r) => r.probe.status === 'fail' || !r.environmentVerified).length, results }, null, 2)}\n`);
    }
  } finally { await context?.close(); await browser.close(); }
  if (results.some((r) => r.probe.status === 'fail' || !r.environmentVerified)) process.exitCode = 1;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error); process.exitCode = 1; });
