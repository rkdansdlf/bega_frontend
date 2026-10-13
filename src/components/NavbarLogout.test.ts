import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Execute the actual local handlers without mounting React or starting a browser.
const loadLogoutHandler = (
  file: string,
  logout: () => Promise<boolean>,
  navigate: (path: string) => void,
) => {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const handlers: ts.Expression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleLogout' && node.initializer) {
      handlers.push(node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.equal(handlers.length, 1);
  const script = ts.transpileModule(`(${handlers[0].getText(ast)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return runInNewContext(script, { logout, navigate, onClose: () => {} }) as () => Promise<void>;
};

for (const file of ['./Navbar.tsx', './PublicNavbarMenuPanel.tsx', './PublicNavbarDesktopAuthControls.tsx']) {
  for (const result of [true, false]) {
    test(`${file} navigates only after logout resolves ${result}`, async () => {
      let resolve!: (result: boolean) => void;
      const pending = new Promise<boolean>((done) => { resolve = done; });
      const destinations: string[] = [];
      let calls = 0;
      const handler = loadLogoutHandler(file, () => { calls += 1; return pending; }, (path) => {
        destinations.push(path);
      });

      const completion = handler();
      assert.equal(calls, 1);
      assert.deepEqual(destinations, []);
      resolve(result);
      await completion;
      assert.deepEqual(destinations, result ? ['/home'] : []);
    });
  }
}
