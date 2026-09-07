import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createElement,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { AdminMate, AdminPost, AdminUser } from '../../types/admin';
import AdminCommunityRuntime from './AdminCommunityRuntime';
import type AdminRoleChangeDialogContent from './AdminRoleChangeDialogContent';
import type { MatesAdminPanel } from './MatesAdminPanel';
import type { PostsAdminPanel } from './PostsAdminPanel';
import type { UsersAdminPanel } from './UsersAdminPanel';

type PendingRoleChange = {
  userId: number;
  userName: string;
  userEmail: string;
  currentRole: string;
  targetRole: 'ROLE_ADMIN' | 'ROLE_USER';
};

type VisualQaState = {
  panelPhase: 'fallback' | 'resolved';
  roleDialogPhase: 'closed' | 'fallback' | 'resolved';
  searchTerm: string;
  users: AdminUser[];
  posts: AdminPost[];
  mates: AdminMate[];
  loading: boolean;
  currentUserId: number | null;
  userRole: 'ROLE_ADMIN' | 'ROLE_SUPER_ADMIN' | 'ROLE_USER' | null;
  pendingRoleChange: PendingRoleChange | null;
  roleChangeReason: string;
};

type VisualQaRenderers = {
  users: (props: ComponentProps<typeof UsersAdminPanel>) => ReactNode;
  posts: (props: ComponentProps<typeof PostsAdminPanel>) => ReactNode;
  parties: (props: ComponentProps<typeof MatesAdminPanel>) => ReactNode;
  roleDialog: (props: ComponentProps<typeof AdminRoleChangeDialogContent>) => ReactNode;
};

type TestableRuntimeProps = ComponentProps<typeof AdminCommunityRuntime> & {
  visualQaStateOverride: VisualQaState;
  visualQaRenderers: VisualQaRenderers;
};

const TestableAdminCommunityRuntime = AdminCommunityRuntime as ComponentType<TestableRuntimeProps>;

const visualQaUser: AdminUser = {
  id: 42,
  email: 'mobile-admin@example.com',
  name: '모바일 관리자',
  favoriteTeam: null,
  createdAt: '2026-08-29T09:00:00+09:00',
  postCount: 17,
  role: 'ROLE_USER',
};

const visualQaPost: AdminPost = {
  id: 73,
  team: 'LG',
  content: '모바일 게시글',
  author: '게시글 작성자',
  createdAt: '2026-08-29T09:00:00+09:00',
  likeCount: 23,
  commentCount: 5,
  views: 144,
  isHot: true,
};

const visualQaMate: AdminMate = {
  id: 91,
  teamId: 'LG',
  title: '모바일 메이트 모임',
  stadium: 'Visual QA 구장',
  hostName: '모임 호스트',
  gameDate: '2026-09-01T18:30:00+09:00',
  maxMembers: 8,
  currentMembers: 4,
  status: 'pending',
  createdAt: '2026-08-29T09:00:00+09:00',
  homeTeam: 'VISUAL_QA_HOME',
  awayTeam: 'VISUAL_QA_AWAY',
  section: 'Visual QA 좌석 구역',
};

const baseState: VisualQaState = {
  panelPhase: 'resolved',
  roleDialogPhase: 'closed',
  searchTerm: '모바일 검색어',
  users: [visualQaUser],
  posts: [visualQaPost],
  mates: [visualQaMate],
  loading: false,
  currentUserId: 7,
  userRole: 'ROLE_SUPER_ADMIN',
  pendingRoleChange: null,
  roleChangeReason: '',
};

const renderRuntime = (
  activeTab: 'users' | 'posts' | 'parties',
  visualQaStateOverride: VisualQaState,
  visualQaRenderers: VisualQaRenderers,
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return renderToStaticMarkup(createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(TestableAdminCommunityRuntime, {
      activeTab,
      onErrorChange: () => undefined,
      onSuccessMessageChange: () => undefined,
      refreshStats: async () => undefined,
      visualQaStateOverride,
      visualQaRenderers,
    }),
  ));
};

const renderers: VisualQaRenderers = {
  users: (props) => {
    const tableClassName = (props as typeof props & { tableClassName?: string }).tableClassName;
    return createElement(
      'div',
      { 'data-testid': 'community-users-probe' },
      `${props.searchTerm}:${props.loading}:${props.isSuperAdmin}:${props.currentUserId}:${props.users[0]?.email}:${tableClassName}`,
    );
  },
  posts: (props) => {
    const tableClassName = (props as typeof props & { tableClassName?: string }).tableClassName;
    return createElement(
      'div',
      { 'data-testid': 'community-posts-probe' },
      `${props.posts.length}:${props.posts[0]?.content}:${tableClassName}`,
    );
  },
  parties: (props) => {
    const tableClassName = (props as typeof props & { tableClassName?: string }).tableClassName;
    return createElement(
      'div',
      { 'data-testid': 'community-parties-probe' },
      `${props.mates.length}:${props.mates[0]?.title}:${tableClassName}`,
    );
  },
  roleDialog: (props) => createElement(
    'div',
    { 'data-testid': 'community-role-dialog-probe' },
    `${props.pendingRoleChange?.userEmail}:${props.roleChangeReason}`,
  ),
};

test('community runtime owns an announced and mobile-contained tab fallback', () => {
  const html = renderRuntime('users', {
    ...baseState,
    panelPhase: 'fallback',
  }, renderers);

  assert.match(html, /data-testid="admin-community-runtime"[^>]+aria-busy="true"[^>]+min-w-0[^>]+overflow-hidden/);
  assert.match(html, /data-testid="admin-community-users-fallback"[^>]+role="status"[^>]+aria-busy="true"/);
  assert.match(html, /overflow-wrap:anywhere/);
  assert.match(html, /p-4[^>]+sm:p-6/);
  assert.doesNotMatch(html, /community-users-probe/);
});

test('community runtime routes every active tab to its matching resolved renderer', () => {
  const usersHtml = renderRuntime('users', baseState, renderers);
  const postsHtml = renderRuntime('posts', baseState, renderers);
  const partiesHtml = renderRuntime('parties', baseState, renderers);

  assert.match(usersHtml, /community-users-probe/);
  assert.match(usersHtml, /모바일 검색어:false:true:7:mobile-admin@example\.com/);
  assert.doesNotMatch(usersHtml, /community-posts-probe|community-parties-probe/);
  assert.match(postsHtml, /community-posts-probe[^>]*>1:모바일 게시글/);
  assert.doesNotMatch(postsHtml, /community-users-probe|community-parties-probe/);
  assert.match(partiesHtml, /community-parties-probe[^>]*>1:모바일 메이트 모임/);
  assert.doesNotMatch(partiesHtml, /community-users-probe|community-posts-probe/);
});

test('community runtime gives every resolved data table a reusable mobile scroll width', () => {
  const usersHtml = renderRuntime('users', baseState, renderers);
  const postsHtml = renderRuntime('posts', baseState, renderers);
  const partiesHtml = renderRuntime('parties', baseState, renderers);

  assert.match(usersHtml, /community-users-probe[^>]*>[^<]+:min-w-\[860px\]/);
  assert.match(postsHtml, /community-posts-probe[^>]*>[^<]+:min-w-\[860px\]/);
  assert.match(partiesHtml, /community-parties-probe[^>]*>[^<]+:min-w-\[860px\]/);
});

test('community runtime renders an announced modal shell while the role dialog chunk loads', () => {
  const html = renderRuntime('users', {
    ...baseState,
    roleDialogPhase: 'fallback',
    pendingRoleChange: {
      userId: visualQaUser.id,
      userName: visualQaUser.name,
      userEmail: visualQaUser.email,
      currentRole: 'ROLE_USER',
      targetRole: 'ROLE_ADMIN',
    },
  }, renderers);

  assert.match(html, /data-testid="admin-community-role-dialog-fallback"/);
  assert.match(html, /role="dialog"[^>]+aria-modal="true"[^>]+aria-busy="true"/);
  assert.match(html, /role="status"[^>]+aria-live="polite"/);
  assert.doesNotMatch(html, /community-role-dialog-probe/);
});

test('community runtime forwards pending role state into the resolved dialog renderer', () => {
  const html = renderRuntime('users', {
    ...baseState,
    roleDialogPhase: 'resolved',
    pendingRoleChange: {
      userId: visualQaUser.id,
      userName: visualQaUser.name,
      userEmail: visualQaUser.email,
      currentRole: 'ROLE_USER',
      targetRole: 'ROLE_ADMIN',
    },
    roleChangeReason: '운영 권한 검토 완료',
  }, renderers);

  assert.match(html, /community-role-dialog-probe[^>]*>mobile-admin@example\.com:운영 권한 검토 완료/);
});
