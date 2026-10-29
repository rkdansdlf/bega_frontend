import assert from 'node:assert/strict';
import test from 'node:test';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

import config from '../../../tailwind.config.js';
import { buttonVariantClasses } from './button-styles';

/**
 * Every dark surface token is pure black (`--surface-*-dark: 0 0% 0%` in index.css), so `secondary`,
 * `accent`, `background`, `muted`, `card` and `popover` all resolve to the page colour in dark mode.
 * A dark hover state built from them paints black on black: no feedback. `ghost` and `secondary`
 * used exactly that, and `destructive`'s `dark:bg-destructive/60` outranked its own
 * `hover:bg-destructive/90`, so none of the three reacted to the pointer in dark.
 */
const BLACK_IN_DARK = new Set(['background', 'card', 'popover', 'secondary', 'accent', 'muted']);
const HOVER_VARIANTS = ['secondary', 'ghost', 'destructive'] as const;

const darkHoverBackgrounds = (classes: string) =>
  classes
    .split(/\s+/)
    .filter((token) => token.startsWith('dark:hover:bg-'))
    .map((token) => token.slice('dark:hover:bg-'.length).split('/')[0]);

for (const variant of HOVER_VARIANTS) {
  test(`${variant} Button has a dark hover background that differs from the black surfaces`, async () => {
    const classes = buttonVariantClasses[variant];
    const colours = darkHoverBackgrounds(classes);
    assert.ok(colours.length > 0, `${variant} has no dark:hover:bg-* utility`);
    assert.ok(
      colours.every((colour) => !BLACK_IN_DARK.has(colour)),
      `${variant} dark hover uses a token that is black in dark: ${colours.join(', ')}`,
    );

    const tokens = classes.split(/\s+/).filter((token) => token.startsWith('dark:hover:bg-'));
    const { css } = await postcss([tailwindcss({ ...config, content: [{ raw: tokens.join(' ') }] })]).process(
      '@tailwind utilities;',
      { from: undefined },
    );
    assert.match(css, /:hover/, `${variant} dark hover utility generated no CSS`);
  });
}

test('secondary Button has a resting fill in dark that differs from the black surfaces', async () => {
  // `bg-secondary` is black in dark, so a secondary Button looked exactly like `ghost`: label text
  // on the page. It needs its own dark fill; the hover tint (input/50) must stay stronger than it.
  const tokens = buttonVariantClasses.secondary.split(/\s+/);
  const fills = tokens.filter((token) => token.startsWith('dark:bg-'));
  assert.ok(fills.length > 0, 'secondary has no dark:bg-* resting fill');
  for (const fill of fills) {
    const [colour, alpha] = fill.slice('dark:bg-'.length).split('/');
    assert.ok(!BLACK_IN_DARK.has(colour), `secondary dark fill uses a token that is black in dark: ${fill}`);
    const hover = tokens.find((token) => token.startsWith('dark:hover:bg-'));
    const hoverAlpha = Number(hover?.split('/')[1] ?? 0);
    assert.ok(Number(alpha ?? 100) < hoverAlpha, `${fill} must stay weaker than ${hover} so hover still shows`);
  }
  const { css } = await postcss([tailwindcss({ ...config, content: [{ raw: fills.join(' ') }] })]).process(
    '@tailwind utilities;',
    { from: undefined },
  );
  assert.match(css, /background-color/, 'secondary dark fill generated no CSS');
});
