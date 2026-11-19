import assert from 'node:assert/strict';
import * as moduleApi from 'node:module';
import test from 'node:test';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

type ModuleNextLoad = (url: string, context: unknown) => unknown;
type ModuleLoadHook = (url: string, context: unknown, nextLoad: ModuleNextLoad) => unknown;

const { registerHooks } = moduleApi as unknown as {
  registerHooks: (hooks: { load: ModuleLoadHook }) => void;
};

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.png') || url.endsWith('.webp') || url.endsWith('.svg')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export default "/visual-qa-landing-asset.png";',
      };
    }

    return nextLoad(url, context);
  },
});

const [
  { default: LandingFeatureSection },
  { default: LandingHero },
  { default: LandingTicker },
  { default: LandingPhonePreview },
  { default: LandingAppPreview },
] = await Promise.all([
  import('./LandingFeatureSection'),
  import('./LandingHero'),
  import('./LandingTicker'),
  import('./LandingPhonePreview'),
  import('./LandingAppPreview'),
]);

test('landing public controls declare a 44px mobile touch contract', () => {
  const hero = renderToStaticMarkup(createElement(
    StaticRouter,
    { location: '/' },
    createElement(LandingHero as ComponentType),
  ));
  const ticker = renderToStaticMarkup(createElement(LandingTicker as ComponentType));

  assert.match(hero, /data-testid="landing-home-cta"[^>]*data-vqa-min-touch="44"/);
  assert.match(ticker, /data-testid="landing-ticker-toggle"[^>]*data-vqa-min-touch="44"/);
});

test('landing feature section preserves pressure copy and its accessible name', () => {
  const token = `LANDING-${'UNBROKEN'.repeat(18)}`;
  const markup = renderToStaticMarkup(createElement(LandingFeatureSection, {
    number: '05',
    title: token,
    description: `${token}-DESCRIPTION`,
    copySupplement: createElement('p', { 'data-testid': 'landing-copy-supplement' }, token),
    visual: createElement('article', { 'data-testid': 'landing-visual' }, token),
    visualFirst: true,
    tone: 'muted',
  }));

  assert.match(markup, /aria-labelledby="landing-feature-05-title"/);
  assert.match(markup, /data-visual-first="true"/);
  assert.equal(markup.match(new RegExp(token, 'g'))?.length, 4);
});

test('landing ticker visibly labels its scores as sample data', () => {
  const ticker = renderToStaticMarkup(createElement(LandingTicker as ComponentType));

  assert.match(ticker, /data-testid="landing-ticker-demo-badge"[^>]*>예시 화면 · 실제 경기 아님</);
});

test('landing phone preview hides inactive screens from assistive technology', () => {
  const markup = renderToStaticMarkup(createElement(LandingPhonePreview as ComponentType<{ activeScreen: number }>, { activeScreen: 1 }));
  const panel = (index: number) => markup.match(new RegExp(`<div[^>]*data-phone-screen="${index}"[^>]*>`))?.[0] ?? '';

  for (const inactive of [0, 2]) {
    assert.match(panel(inactive), /aria-hidden="true"/);
    assert.match(panel(inactive), /inert=""/);
  }
  assert.doesNotMatch(panel(1), /aria-hidden/);
  assert.doesNotMatch(panel(1), /inert/);
});

test('landing app preview exposes an autoplay pause control and a visible sample-data note', () => {
  const markup = renderToStaticMarkup(createElement(LandingAppPreview as ComponentType));

  assert.match(markup, /data-testid="landing-app-preview-autoplay-toggle"[^>]*aria-pressed="false"[^>]*>자동 전환 일시정지</);
  assert.match(markup, /data-testid="landing-app-preview-demo-note"/);
});
