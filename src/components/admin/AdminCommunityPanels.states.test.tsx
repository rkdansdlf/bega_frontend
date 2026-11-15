import assert from 'node:assert/strict';
import * as moduleApi from 'node:module';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

type NextLoad = (url: string, context: unknown) => unknown;
const { registerHooks } = moduleApi as unknown as {
  registerHooks: (hooks: { load: (url: string, context: unknown, next: NextLoad) => unknown }) => void;
};
registerHooks({ load(url, context, next) {
  if (/\.(png|webp|css)$/.test(url)) return { format: 'module', shortCircuit: true,
    source: url.endsWith('.css') ? 'export default {};' : 'export default "/synthetic-asset.png";' };
  return next(url, context);
} });

const [{ PostsAdminPanel }, { MatesAdminPanel }, { UsersAdminPanel }] = await Promise.all([
  import('./PostsAdminPanel'), import('./MatesAdminPanel'), import('./UsersAdminPanel'),
]);

for (const kind of ['posts', 'mates'] as const) {
  const render = (loading: boolean, error: string | null, populated = false) => {
    if (kind === 'posts') return renderToStaticMarkup(createElement(PostsAdminPanel, {
      posts: populated ? [{ id: 99101, team: 'SYNTH', content: '합성 내용', author: '합성 작성자',
        createdAt: '2020-01-01T09:00:00', likeCount: 1, commentCount: 1 }] : [],
      loading, error, handleDeletePost: () => assert.fail('delete must not execute'),
    }));
    return renderToStaticMarkup(createElement(MatesAdminPanel, {
      mates: populated ? [{ id: 99102, title: '합성 모임', hostName: '합성 호스트', gameDate: '2099-01-01',
        currentMembers: 1, maxMembers: 2, status: 'pending' }] : [],
      loading, error, handleDeleteMate: () => assert.fail('delete must not execute'),
    }));
  };

  test(`${kind}: pending query announces loading without claiming healthy empty`, () => {
    const html = render(true, null);
    assert.match(html, /aria-busy="true"/);
    assert.match(html, new RegExp(`data-testid="admin-${kind}-loading" role="status"`));
    assert.doesNotMatch(html, new RegExp(`admin-${kind}-empty|admin-${kind}-error`));
  });

  test(`${kind}: query failure is visible without healthy empty or duplicate global alert`, () => {
    const html = render(false, '합성 조회 실패');
    assert.match(html, new RegExp(`data-testid="admin-${kind}-error"`));
    assert.match(html, /합성 조회 실패/);
    assert.doesNotMatch(html, /role="alert"/);
    assert.doesNotMatch(html, new RegExp(`admin-${kind}-empty|admin-${kind}-loading|aria-busy="true"`));
  });

  test(`${kind}: healthy empty retains the original status`, () => {
    const html = render(false, null);
    assert.match(html, new RegExp(`data-testid="admin-${kind}-empty"`));
    assert.doesNotMatch(html, new RegExp(`admin-${kind}-loading|admin-${kind}-error`));
  });

  test(`${kind}: populated data and touch-sized delete control remain`, () => {
    const html = render(false, null, true);
    assert.match(html, /data-slot="table-body"/);
    assert.match(html, /min-h-11 min-w-11/);
    assert.doesNotMatch(html, /sm:min-w-8/);
    assert.doesNotMatch(html, new RegExp(`admin-${kind}-empty|admin-${kind}-error|admin-${kind}-loading`));
  });

  test(`${kind}: cached rows survive a pending or failed refresh`, () => {
    for (const [loading, error] of [[true, null], [false, '합성 조회 실패']] as const) {
      const html = render(loading, error, true);
      assert.match(html, /data-slot="table-body"/);
      assert.match(html, new RegExp(`admin-${kind}-${loading ? 'loading' : 'error'}`));
      assert.doesNotMatch(html, new RegExp(`admin-${kind}-empty`));
    }
  });
}

const usersProps = {
  searchTerm: '', setSearchTerm: () => {}, users: [], loading: false, isSuperAdmin: false,
  currentUserId: 99000, handleDeleteUser: () => assert.fail('delete must not execute'),
  setPendingRoleChange: () => assert.fail('role change must not execute'), setRoleChangeReason: () => {},
};

test('users query failure has local guidance without a healthy-empty claim or duplicate alert', () => {
  const html = renderToStaticMarkup(createElement(UsersAdminPanel, { ...usersProps, error: '사용자 조회 실패' }));
  assert.match(html, /admin-users-error/);
  assert.doesNotMatch(html, /admin-users-empty|role="alert"/);
});

test('users loading keeps a non-shrinking circle and mobile copy layout', () => {
  const html = renderToStaticMarkup(createElement(UsersAdminPanel, { ...usersProps, loading: true }));
  assert.match(html, /flex-col[^"<>]*sm:flex-row/);
  assert.match(html, /h-8 w-8 shrink-0 animate-spin/);
  assert.doesNotMatch(html, /admin-users-empty/);
});

test('users healthy empty retains the original status', () => {
  const html = renderToStaticMarkup(createElement(UsersAdminPanel, usersProps));
  assert.match(html, /admin-users-empty/);
  assert.doesNotMatch(html, /admin-users-error|admin-users-loading/);
});

test('users role masks, selected values and disabled deletion contracts stay unchanged', () => {
  const users = [
    { id: 99000, email: 'self@example.invalid', name: '합성 본인', role: 'ROLE_SUPER_ADMIN', createdAt: '2020-01-01', postCount: 0 },
    { id: 99001, email: 'user@example.invalid', name: '합성 사용자', role: 'ROLE_USER', createdAt: '2020-01-01', postCount: 0 },
    { id: 99002, email: 'admin@example.invalid', name: '합성 관리자', role: 'ROLE_ADMIN', createdAt: '2020-01-01', postCount: 0 },
  ];
  for (const isSuperAdmin of [false, true]) {
    const html = renderToStaticMarkup(createElement(UsersAdminPanel, { ...usersProps, users, isSuperAdmin, error: '사용자 조회 실패' }));
    assert.match(html, /data-slot="table-body"/);
    assert.match(html, /admin-users-error/);
    assert.equal((html.match(/<select/g) ?? []).length, isSuperAdmin ? 2 : 0);
    assert.equal((html.match(/disabled=""/g) ?? []).length, 2);
    assert.match(html, /min-h-11 min-w-11/);
    if (isSuperAdmin) {
      assert.match(html, /w-42 min-h-11/);
      assert.match(html, /value="ROLE_USER" selected=""/);
      assert.match(html, /value="ROLE_ADMIN" selected=""/);
    }
  }
});
