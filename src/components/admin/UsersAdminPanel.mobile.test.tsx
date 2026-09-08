import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = () => readFile(
  new URL('./UsersAdminPanel.tsx', import.meta.url),
  'utf8',
);

test('users admin panel owns a bounded named table and explicitly labels its controls', async () => {
  const source = await readSource();

  assert.match(source, /data-testid="admin-users-panel"[\s\S]*className="min-w-0 max-w-full/);
  assert.match(source, /aria-label="사용자 검색"/);
  assert.match(source, /<Table aria-label="관리자 사용자 목록" className=\{tableClassName \?\? 'min-w-\[860px\]'\}>/);
  assert.match(source, /data-testid=\{`admin-user-row-\$\{user\.id\}`\}/);
  assert.match(source, /aria-label=\{`\$\{user\.name\} 역할 변경`\}/);
});

test('users admin panel announces the polite busy loading state', async () => {
  const source = await readSource();

  assert.match(source, /data-testid="admin-users-loading"/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /aria-busy="true"/);
  assert.match(source, /사용자 목록을 불러오는 중/);
});

test('users admin panel preserves current delete and role restrictions while exposing touch-safe actions', async () => {
  const source = await readSource();

  assert.match(source, /user\.id === currentUserId \|\| user\.role === 'ROLE_SUPER_ADMIN'/);
  assert.match(source, /disabled=\{user\.role === 'ROLE_ADMIN'\}/);
  assert.match(source, /data-testid=\{`admin-user-delete-\$\{user\.id\}`\}/);
  assert.match(source, /aria-label=\{`사용자 \$\{user\.name\} 삭제`\}/);
  assert.match(source, /min-w-11[^'"\n]*sm:min-w-8/);
  assert.match(source, /contentTestId="admin-user-delete-dialog"/);
  assert.match(source, /data-testid="admin-user-delete-cancel"/);
  assert.match(source, /data-testid="admin-user-delete-confirm"/);
  assert.ok((source.match(/min-h-11/g) ?? []).length >= 2);
});

test('users admin panel remains a pure prop and callback surface without API calls', async () => {
  const source = await readSource();

  assert.doesNotMatch(source, /api\/axios|from ['"][^'"]*\/api(?:\/|['"])/);
  assert.doesNotMatch(source, /\b(?:axios|fetch)\s*\(/);
  assert.doesNotMatch(source, /useEffect|useQuery|useMutation/);
  assert.match(source, /handleDeleteUser\(pendingDeleteUser\.id\)/);
  assert.match(source, /setPendingRoleChange\(\{/);
});

test('users admin panel permits deterministic controlled search input only outside production', async () => {
  const source = await readSource();

  assert.match(source, /visualQaInteractive\?: boolean/);
  assert.match(source, /import\.meta\.env\?\.PROD !== true/);
  assert.match(source, /visualQaInteractive === true/);
  assert.match(source, /const effectiveSearchTerm = visualQaEnabled \? visualQaSearchTerm : searchTerm/);
  assert.match(source, /setSearchTerm\(nextSearchTerm\)/);
});

test('users admin panel role-select keyboard change commits the visible harness value and unchanged callback payload', async () => {
  const { createServer } = await import('vite');
  const vite = await createServer({
    appType: 'custom',
    configFile: false,
    logLevel: 'silent',
    optimizeDeps: { noDiscovery: true },
    root: process.cwd(),
    server: { hmr: false, middlewareMode: true },
  });
  const subject = await vite.ssrLoadModule('/src/components/admin/UsersAdminPanel.tsx') as Record<string, unknown>;
  await vite.close();
  const applyRoleSelection = subject.applyAdminUserRoleSelection as undefined | ((args: {
      user: {
        id: number;
        email: string;
        name: string;
        role: string;
      };
      nextRole: 'ROLE_ADMIN' | 'ROLE_USER';
      visualQaEnabled: boolean;
      setVisualQaRoles: (update: (current: Record<number, string>) => Record<number, string>) => void;
      setPendingRoleChange: (payload: unknown) => void;
      setRoleChangeReason: (reason: string) => void;
    }) => void);
  const applyKeyboardRoleSelection = subject.applyAdminUserRoleKeyboardSelection as undefined | ((args: {
      key: string;
      preventDefault: () => void;
      user: {
        id: number;
        email: string;
        name: string;
        role: string;
      };
      visualQaEnabled: boolean;
      setVisualQaRoles: (update: (current: Record<number, string>) => Record<number, string>) => void;
      setPendingRoleChange: (payload: unknown) => void;
      setRoleChangeReason: (reason: string) => void;
    }) => void);
  const resolveRoleValue = subject.resolveAdminUserRoleValue as undefined | ((args: {
      userRole: string;
      userId: number;
      visualQaEnabled: boolean;
      visualQaRoles: Record<number, string>;
    }) => string);
  assert.ok(applyRoleSelection, 'the real role-select change handler must be directly behavior-testable');
  assert.ok(applyKeyboardRoleSelection, 'the real role-select keyboard handler must be directly behavior-testable');
  assert.ok(resolveRoleValue, 'the real controlled value resolver must be directly behavior-testable');

  const user = {
    id: 1,
    email: 'visualqa-user-1@example.invalid',
    name: 'Visual QA 사용자 1',
    role: 'ROLE_USER',
  };
  let visualQaRoles: Record<number, string> = {};
  const pendingPayloads: unknown[] = [];
  const reasons: string[] = [];
  let prevented = 0;
  applyKeyboardRoleSelection({
    key: 'ArrowDown',
    preventDefault: () => { prevented += 1; },
    user,
    visualQaEnabled: true,
    setVisualQaRoles: (update) => { visualQaRoles = update(visualQaRoles); },
    setPendingRoleChange: (payload) => { pendingPayloads.push(payload); },
    setRoleChangeReason: (reason) => { reasons.push(reason); },
  });

  assert.equal(resolveRoleValue({
    userRole: user.role,
    userId: user.id,
    visualQaEnabled: true,
    visualQaRoles,
  }), 'ROLE_ADMIN');
  assert.deepEqual(pendingPayloads, [{
    userId: 1,
    userName: 'Visual QA 사용자 1',
    userEmail: 'visualqa-user-1@example.invalid',
    currentRole: 'ROLE_USER',
    targetRole: 'ROLE_ADMIN',
  }]);
  assert.deepEqual(reasons, ['']);
  assert.equal(prevented, 1);

  let productionVisualStateWrites = 0;
  applyKeyboardRoleSelection({
    key: 'ArrowDown',
    preventDefault: () => { prevented += 1; },
    user,
    visualQaEnabled: false,
    setVisualQaRoles: () => { productionVisualStateWrites += 1; },
    setPendingRoleChange: () => {},
    setRoleChangeReason: () => {},
  });
  assert.equal(productionVisualStateWrites, 0);
  assert.equal(prevented, 1);

  const productionPayloads: unknown[] = [];
  const productionReasons: string[] = [];
  applyRoleSelection({
    user,
    nextRole: 'ROLE_ADMIN',
    visualQaEnabled: false,
    setVisualQaRoles: () => { productionVisualStateWrites += 1; },
    setPendingRoleChange: (payload) => { productionPayloads.push(payload); },
    setRoleChangeReason: (reason) => { productionReasons.push(reason); },
  });
  assert.equal(productionVisualStateWrites, 0);
  assert.deepEqual(productionPayloads, pendingPayloads);
  assert.deepEqual(productionReasons, ['']);
  assert.equal(resolveRoleValue({
    userRole: user.role,
    userId: user.id,
    visualQaEnabled: false,
    visualQaRoles: { [user.id]: 'ROLE_ADMIN' },
  }), 'ROLE_USER');
});

test('users admin panel keeps its empty outcome visible outside the wide table canvas', async () => {
  const source = await readSource();

  assert.match(source, /users\.length === 0 \? \([\s\S]*data-testid="admin-users-empty"[\s\S]*role="status"[\s\S]*aria-live="polite"/);
  assert.match(source, /유저가 없습니다\.[\s\S]*\) : \([\s\S]*<div className="max-w-full overflow-hidden rounded-xl/);
});

test('users admin panel keeps pressure identities in compact single-line cells', async () => {
  const source = await readSource();

  assert.match(source, /<span title=\{user\.email\} className="block max-w-\[220px\] truncate whitespace-nowrap">/);
  assert.match(source, /<span title=\{user\.name\} className="block max-w-\[160px\] truncate whitespace-nowrap">/);
  assert.match(source, /className="inline-flex min-w-8 items-center justify-center whitespace-nowrap rounded-lg bg-slate-800 px-2/);
});
