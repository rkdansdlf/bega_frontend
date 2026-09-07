import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as moduleApi from 'node:module';
import test from 'node:test';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

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
        source: 'export default "/visual-qa-landing-legacy-asset.webp";',
      };
    }

    if (url.endsWith('.css')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export default "";',
      };
    }

    return nextLoad(url, context);
  },
});

const [
  { default: LandingCapabilityShowcase },
  { default: LandingFeaturesRuntime },
] = await Promise.all([
  import('./LandingCapabilityShowcase'),
  import('./LandingFeaturesRuntime'),
]);

test('capability showcase renders pressure copy and an accessible terminal image fallback', () => {
  const token = `CAPABILITY-${'UNBROKEN'.repeat(18)}`;
  const markup = renderToStaticMarkup(createElement(
    LandingCapabilityShowcase as ComponentType<Record<string, unknown>>,
    {
      visualQaStateOverride: {
        description: `${token}-DESCRIPTION`,
        heading: token,
        imageSrc: '/__visual-qa__/missing-capability.webp',
        storyDescriptionSuffix: ` ${token}-STORY-DESCRIPTION`,
        storyTitleSuffix: ` ${token}-STORY-TITLE`,
      },
    },
  ));

  assert.match(markup, /data-testid="landing-capability-showcase"/);
  assert.equal(markup.match(/data-testid="landing-capability-tile-/g)?.length, 6);
  assert.equal(markup.match(/data-testid="landing-capability-image-fallback-/g)?.length, 6);
  assert.equal(markup.match(/src="\/__visual-qa__\/missing-capability\.webp"/g)?.length, 6);
  assert.ok((markup.match(new RegExp(token, 'g')) ?? []).length >= 14);
  assert.match(markup, /role="status"/);
});

test('features runtime exposes every production card as a mobile touch and expansion target', () => {
  const markup = renderToStaticMarkup(createElement(LandingFeaturesRuntime as ComponentType));

  assert.match(markup, /data-testid="landing-features"/);
  assert.equal(markup.match(/data-testid="landing-feature-card-[0-5]"/g)?.length, 6);
  assert.equal(markup.match(/data-vqa-min-touch="44"/g)?.length, 6);
  assert.equal(markup.match(/aria-expanded="false"/g)?.length, 6);
  assert.equal(markup.match(/landing-feature-card-active/g)?.length, 1);
});

test('legacy landing showcase styles keep failed images hidden and dark copy readable', async () => {
  const [capabilityStyles, featureStyles] = await Promise.all([
    readFile(new URL('./LandingCapabilityShowcase.css', import.meta.url), 'utf8'),
    readFile(new URL('./LandingFeaturesRuntime.css', import.meta.url), 'utf8'),
  ]);

  assert.match(capabilityStyles, /\.landing-capability-image\[hidden\]\s*{[^}]*display:\s*none/s);
  assert.match(featureStyles, /\.landing-feature-header \.ds-section-copy\s*{[^}]*color:\s*hsl\(var\(--muted-foreground\)\)/s);
});
