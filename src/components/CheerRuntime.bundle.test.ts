import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { cn } from '../lib/utils';

test('Cheer shell joins non-conflicting classes without loading the Tailwind merger', () => {
  const source = readFileSync(new URL('./CheerRuntime.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /import .*\bcn\b.*from '\.\.\/lib\/utils'/);
  const file = ts.createSourceFile('CheerRuntime.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let compared = 0;
  const visit = (node: ts.Node) => {
    if (ts.isJsxAttribute(node) && node.name.getText(file) === 'className'
      && node.initializer && ts.isJsxExpression(node.initializer)
      && node.initializer.expression && ts.isTemplateExpression(node.initializer.expression)) {
      const expression = node.initializer.expression;
      const span = expression.templateSpans[0];
      assert.equal(expression.templateSpans.length, 1);
      assert.equal(span.literal.text, '');
      assert.ok(ts.isConditionalExpression(span.expression));
      const base = expression.head.text.trimEnd();
      for (const branch of [span.expression.whenTrue, span.expression.whenFalse]) {
        assert.ok(ts.isStringLiteral(branch));
        assert.equal(cn(base, branch.text), `${base} ${branch.text}`);
        compared += 1;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  assert.equal(compared, 4);
});
