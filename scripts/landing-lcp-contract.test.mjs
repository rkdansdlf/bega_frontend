import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import postcss from 'postcss';

const heroSource = fs.readFileSync(
  new URL('../src/components/landing/LandingHero.tsx', import.meta.url),
  'utf8',
);
const landingStyles = fs.readFileSync(
  new URL('../src/components/Landing.css', import.meta.url),
  'utf8',
);

test('decorative landing watermark is excluded from mobile LCP viewports', () => {
  assert.match(
    heroSource,
    /className="landing-hero-watermark"[\s\S]*?aria-hidden="true"\s*>\s*720\s*<\/div>/,
  );

  const hiddenWatermarkRules = [];
  postcss.parse(landingStyles).walkRules('.landing-hero-watermark', (rule) => {
    const hidesWatermark = rule.nodes.some(
      (node) => node.type === 'decl' && node.prop === 'display' && node.value === 'none',
    );
    if (hidesWatermark) {
      hiddenWatermarkRules.push(rule);
    }
  });

  assert.equal(hiddenWatermarkRules.length, 1);
  assert.equal(hiddenWatermarkRules[0].parent?.type, 'atrule');
  assert.equal(hiddenWatermarkRules[0].parent?.name, 'media');
  assert.equal(hiddenWatermarkRules[0].parent?.params, '(max-width: 480px)');
});
