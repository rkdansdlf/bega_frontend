import assert from 'node:assert/strict';
import test from 'node:test';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import tailwindcss from 'tailwindcss';

import config from '../../../tailwind.config.js';
import { buttonBaseClass, buttonVariantClasses } from './button-styles';

/**
 * The outline Button keeps a visible 1px border and paints it with `dark:border-input`. Tailwind
 * 3.4 emits that as `.dark\:border-input:is(.dark *)` (specificity 0,2,0), exactly the specificity of
 * the generic `aria-[invalid=true]:border-destructive` rule, so the later one in the stylesheet won
 * and an invalid outline Button stayed grey in dark mode. The dark invalid rule must therefore
 * outrank it by specificity, not by CSS order.
 */
type Spec = [number, number, number];
const add = (a: Spec, b: Spec): Spec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const compare = (a: Spec, b: Spec) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const max = (specs: Spec[]) => specs.reduce((best, spec) => (compare(spec, best) > 0 ? spec : best), [0, 0, 0] as Spec);

const specificity = (selector: selectorParser.Selector): Spec => {
  let total: Spec = [0, 0, 0];
  selector.each((node) => {
    if (node.type === 'id') total = add(total, [1, 0, 0]);
    else if (node.type === 'class' || node.type === 'attribute') total = add(total, [0, 1, 0]);
    else if (node.type === 'tag') total = add(total, [0, 0, 1]);
    else if (node.type === 'pseudo') {
      if (node.value === ':where') return;
      if (node.value === ':is' || node.value === ':not') total = add(total, max(node.nodes.map(specificity)));
      else total = add(total, node.value.startsWith('::') ? [0, 0, 1] : [0, 1, 0]);
    }
  });
  return total;
};

const borderColorRules = async (tokens: string[]) => {
  const { root } = await postcss([tailwindcss({ ...config, content: [{ raw: tokens.join(' ') }] })]).process(
    '@tailwind utilities;',
    { from: undefined },
  );
  const rules: Array<{ selector: string; spec: Spec }> = [];
  root.walkRules((rule) => {
    if (!rule.nodes.some((node) => node.type === 'decl' && node.prop === 'border-color')) return;
    selectorParser((selectors) => {
      selectors.each((selector) => { rules.push({ selector: selector.toString(), spec: specificity(selector) }); });
    }).processSync(rule.selector);
  });
  return rules;
};

test('dark invalid border outranks dark:border-input on the outline Button by specificity', async () => {
  const tokens = `${buttonBaseClass} ${buttonVariantClasses.outline}`
    .split(/\s+/)
    .filter((token) => /border-(input|destructive)/.test(token));
  const rules = await borderColorRules(tokens);

  const neutral = rules.find((rule) => rule.selector.includes('dark\\:border-input'));
  const invalid = rules.filter((rule) => rule.selector.includes('dark\\:aria-'));
  assert.ok(neutral, 'dark:border-input generated no rule');
  assert.ok(invalid.length > 0, 'outline Button has no dark:aria-[invalid=true]:border-* rule');
  for (const rule of invalid) {
    assert.ok(
      compare(rule.spec, neutral.spec) > 0,
      `${rule.selector} (${rule.spec}) does not outrank ${neutral.selector} (${neutral.spec})`,
    );
  }
});
