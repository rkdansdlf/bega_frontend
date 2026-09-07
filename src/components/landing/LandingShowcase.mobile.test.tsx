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
] = await Promise.all([
  import('./LandingFeatureSection'),
  import('./LandingHero'),
  import('./LandingTicker'),
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
