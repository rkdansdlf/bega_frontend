import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';

import { useQueryClient } from '@tanstack/react-query';

import {
  deleteAdminMate,
  deleteAdminPost,
  deleteAdminUser,
  demoteToUser,
  fetchAdminMates,
  fetchAdminPosts,
  fetchAdminUsers,
  promoteToAdmin,
} from '../../api/admin';
import type { AdminMate, AdminPost, AdminUser } from '../../types/admin';
import { useAuthProfileSnapshot } from '../../store/authStore';
import type { AdminTabValue } from './adminPageTabs';
import type AdminRoleChangeDialogContentComponent from './AdminRoleChangeDialogContent';
import type { MatesAdminPanel as MatesAdminPanelComponent } from './MatesAdminPanel';
import type { PostsAdminPanel as PostsAdminPanelComponent } from './PostsAdminPanel';
import type { UsersAdminPanel as UsersAdminPanelComponent } from './UsersAdminPanel';

const UsersAdminPanel = lazy(() =>
  import('./UsersAdminPanel').then((module) => ({ default: module.UsersAdminPanel })),
);
const PostsAdminPanel = lazy(() =>
  import('./PostsAdminPanel').then((module) => ({ default: module.PostsAdminPanel })),
);
const MatesAdminPanel = lazy(() =>
  import('./MatesAdminPanel').then((module) => ({ default: module.MatesAdminPanel })),
);
const AdminRoleChangeDialogContent = lazy(() => import('./AdminRoleChangeDialogContent'));

export interface PendingRoleChange {
  userId: number;
  userName: string;
  userEmail: string;
  currentRole: string;
  targetRole: 'ROLE_ADMIN' | 'ROLE_USER';
}

type CommunityActiveTab = 'parties' | 'posts' | 'users';

export interface AdminCommunityRuntimeVisualQaState {
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
}

export interface AdminCommunityRuntimeVisualQaRenderers {
  users: (props: ComponentProps<typeof UsersAdminPanelComponent>) => ReactNode;
  posts: (props: ComponentProps<typeof PostsAdminPanelComponent>) => ReactNode;
  parties: (props: ComponentProps<typeof MatesAdminPanelComponent>) => ReactNode;
  roleDialog: (
    props: ComponentProps<typeof AdminRoleChangeDialogContentComponent>,
  ) => ReactNode;
}

export interface AdminCommunityRuntimeProps {
  activeTab: AdminTabValue;
  onErrorChange: (next: string | null) => void;
  onSuccessMessageChange: (next: string | null) => void;
  refreshStats: () => Promise<void>;
  visualQaStateOverride?: AdminCommunityRuntimeVisualQaState;
  visualQaRenderers?: AdminCommunityRuntimeVisualQaRenderers;
}

const communityPanelLabels: Record<CommunityActiveTab, string> = {
  parties: '메이트',
  posts: '게시글',
  users: '유저',
};

const isCommunityActiveTab = (activeTab: AdminTabValue): activeTab is CommunityActiveTab => (
  activeTab === 'parties' || activeTab === 'posts' || activeTab === 'users'
);

const AdminCommunityPanelFallback = ({ activeTab }: { activeTab: CommunityActiveTab }) => (
  <div
    data-testid={`admin-community-${activeTab}-fallback`}
    role="status"
    aria-live="polite"
    aria-busy="true"
    className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400 [overflow-wrap:anywhere]"
  >
    {communityPanelLabels[activeTab]} 관리 로딩 중...
  </div>
);

const AdminCommunityRoleDialogFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
    <div
      data-testid="admin-community-role-dialog-fallback"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-label="역할 변경 확인"
      className="min-w-0 w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 px-4 py-8 text-center text-slate-300 shadow-xl [overflow-wrap:anywhere]"
    >
      <p role="status" aria-live="polite">
        역할 변경 확인 창 로딩 중...
      </p>
    </div>
  </div>
);

export default function AdminCommunityRuntime({
  activeTab,
  onErrorChange,
  onSuccessMessageChange,
  refreshStats,
  visualQaStateOverride: requestedVisualQaStateOverride,
  visualQaRenderers: requestedVisualQaRenderers,
}: AdminCommunityRuntimeProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const visualQaRenderers = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaRenderers;
  const queryClient = useQueryClient();
  const { userId: liveCurrentUserId, userRole: liveUserRole } = useAuthProfileSnapshot();
  const currentUserId = visualQaStateOverride
    ? visualQaStateOverride.currentUserId
    : liveCurrentUserId;
  const userRole = visualQaStateOverride
    ? visualQaStateOverride.userRole
    : liveUserRole;
  const isSuperAdmin = userRole === 'ROLE_SUPER_ADMIN';

  const [searchTerm, setSearchTerm] = useState(visualQaStateOverride?.searchTerm ?? '');
  const [users, setUsers] = useState<AdminUser[]>(visualQaStateOverride?.users ?? []);
  const [posts, setPosts] = useState<AdminPost[]>(visualQaStateOverride?.posts ?? []);
  const [mates, setMates] = useState<AdminMate[]>(visualQaStateOverride?.mates ?? []);
  const [loading, setLoading] = useState(visualQaStateOverride?.loading ?? false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [matesLoaded, setMatesLoaded] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(
    visualQaStateOverride?.pendingRoleChange ?? null,
  );
  const [roleChangeReason, setRoleChangeReason] = useState(
    visualQaStateOverride?.roleChangeReason ?? '',
  );
  const lastLoadedUsersSearchRef = useRef<string | undefined>(undefined);

  const loadUsers = async (search?: string) => {
    if (visualQaStateOverride) return;
    setLoading(true);
    onErrorChange(null);

    try {
      const data = await fetchAdminUsers(search);
      setUsers(data);
      setUsersLoaded(true);
      lastLoadedUsersSearchRef.current = search;
    } catch (error) {
      console.error('유저 조회 오류:', error);
      onErrorChange(error instanceof Error ? error.message : '유저 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    if (visualQaStateOverride) return;
    onErrorChange(null);
    try {
      const data = await fetchAdminPosts();
      setPosts(data);
      setPostsLoaded(true);
    } catch (error) {
      console.error('게시글 조회 오류:', error);
      onErrorChange('게시글을 불러오는데 실패했습니다.');
    }
  };

  const loadMates = async () => {
    if (visualQaStateOverride) return;
    onErrorChange(null);
    try {
      const data = await fetchAdminMates();
      setMates(data);
      setMatesLoaded(true);
    } catch (error) {
      console.error('메이트 조회 오류:', error);
      onErrorChange('메이트를 불러오는데 실패했습니다.');
    }
  };

  const clearSuccessMessageLater = () => {
    window.setTimeout(() => onSuccessMessageChange(null), 3000);
  };

  const handleDeleteUser = async (userId: number) => {
    if (visualQaStateOverride) {
      setUsers((current) => current.filter((user) => user.id !== userId));
      return;
    }
    try {
      await deleteAdminUser(userId);
      onSuccessMessageChange('유저가 삭제되었습니다.');
      void loadUsers(searchTerm || undefined);
      void refreshStats();
      clearSuccessMessageLater();
    } catch (error) {
      console.error('유저 삭제 오류:', error);
      onErrorChange('유저 삭제에 실패했습니다.');
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (visualQaStateOverride) {
      setPosts((current) => current.filter((post) => post.id !== postId));
      return;
    }
    try {
      await deleteAdminPost(postId);
      onSuccessMessageChange('게시글이 삭제되었습니다.');
      void queryClient.invalidateQueries({ queryKey: ['cheer-posts'] });
      setPosts((prev) => prev.filter((post) => post.id !== postId));
      void refreshStats();
      clearSuccessMessageLater();
    } catch (error) {
      console.error('게시글 삭제 오류:', error);
      onErrorChange('게시글 삭제에 실패했습니다.');
    }
  };

  const handleDeleteMate = async (mateId: number) => {
    if (visualQaStateOverride) {
      setMates((current) => current.filter((mate) => mate.id !== mateId));
      return;
    }
    try {
      await deleteAdminMate(mateId);
      onSuccessMessageChange('메이트 모임이 삭제되었습니다.');
      setMates((prev) => prev.filter((mate) => mate.id !== mateId));
      void refreshStats();
      clearSuccessMessageLater();
    } catch (error) {
      console.error('메이트 삭제 오류:', error);
      onErrorChange('메이트 삭제에 실패했습니다.');
    }
  };

  const handleRoleChange = async (
    userId: number,
    targetRole: 'ROLE_ADMIN' | 'ROLE_USER',
    reason?: string,
  ) => {
    if (visualQaStateOverride) {
      onSuccessMessageChange(
        targetRole === 'ROLE_ADMIN'
          ? '사용자를 관리자로 승격했습니다.'
          : '사용자를 일반 사용자로 강등했습니다.',
      );
      return;
    }
    try {
      if (targetRole === 'ROLE_ADMIN') {
        await promoteToAdmin(userId, reason);
        onSuccessMessageChange('사용자를 관리자로 승격했습니다.');
      } else {
        await demoteToUser(userId, reason);
        onSuccessMessageChange('사용자를 일반 사용자로 강등했습니다.');
      }
      await loadUsers(searchTerm || undefined);
      clearSuccessMessageLater();
    } catch (error) {
      console.error('역할 변경 오류:', error);
      onErrorChange(error instanceof Error ? error.message : '역할 변경에 실패했습니다.');
      window.setTimeout(() => onErrorChange(null), 4000);
    }
  };

  const handleRoleChangeConfirm = async () => {
    if (!pendingRoleChange) {
      return;
    }

    await handleRoleChange(
      pendingRoleChange.userId,
      pendingRoleChange.targetRole,
      roleChangeReason || undefined,
    );
    setPendingRoleChange(null);
    setRoleChangeReason('');
  };

  useEffect(() => {
    if (visualQaStateOverride) {
      return undefined;
    }
    if (activeTab !== 'users') {
      return undefined;
    }

    const normalizedSearch = searchTerm || undefined;
    if (normalizedSearch === lastLoadedUsersSearchRef.current) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void loadUsers(normalizedSearch);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [activeTab, searchTerm, visualQaStateOverride]);

  useEffect(() => {
    if (visualQaStateOverride) {
      return;
    }
    if (activeTab === 'users' && !usersLoaded) {
      void loadUsers(searchTerm || undefined);
      return;
    }

    if (activeTab === 'posts' && !postsLoaded) {
      void loadPosts();
      return;
    }

    if (activeTab === 'parties' && !matesLoaded) {
      void loadMates();
    }
  }, [activeTab, matesLoaded, postsLoaded, searchTerm, usersLoaded, visualQaStateOverride]);

  const usersPanelProps: ComponentProps<typeof UsersAdminPanelComponent> = {
    searchTerm,
    setSearchTerm,
    users: users.map((user) => ({
      ...user,
      favoriteTeam: user.favoriteTeam ?? undefined,
    })),
    loading,
    isSuperAdmin,
    currentUserId,
    handleDeleteUser,
    setPendingRoleChange,
    setRoleChangeReason,
    tableClassName: 'min-w-[860px]',
  };
  const postsPanelProps: ComponentProps<typeof PostsAdminPanelComponent> = {
    posts,
    handleDeletePost,
    tableClassName: 'min-w-[860px]',
  };
  const matesPanelProps: ComponentProps<typeof MatesAdminPanelComponent> = {
    mates,
    handleDeleteMate,
    tableClassName: 'min-w-[860px]',
  };
  const roleDialogProps: ComponentProps<typeof AdminRoleChangeDialogContentComponent> = {
    open: true,
    pendingRoleChange,
    roleChangeReason,
    setRoleChangeReason,
    onOpenChange: (open) => {
      if (!open) {
        setPendingRoleChange(null);
      }
    },
    onConfirm: handleRoleChangeConfirm,
  };

  if (visualQaStateOverride?.panelPhase === 'resolved') {
    if (!isCommunityActiveTab(activeTab) || visualQaRenderers?.[activeTab] === undefined) {
      throw new Error('AdminCommunityRuntime Visual QA active panel renderer is required.');
    }
  }
  if (
    visualQaStateOverride
    && visualQaStateOverride.roleDialogPhase !== 'closed'
    && pendingRoleChange === null
  ) {
    throw new Error('AdminCommunityRuntime Visual QA role dialog state is required.');
  }
  if (
    visualQaStateOverride?.roleDialogPhase === 'resolved'
    && visualQaRenderers?.roleDialog === undefined
  ) {
    throw new Error('AdminCommunityRuntime Visual QA role dialog renderer is required.');
  }

  const renderResolvedPanel = (tab: CommunityActiveTab): ReactNode => {
    if (visualQaStateOverride) {
      if (tab === 'users') return visualQaRenderers?.users(usersPanelProps);
      if (tab === 'posts') return visualQaRenderers?.posts(postsPanelProps);
      return visualQaRenderers?.parties(matesPanelProps);
    }

    if (tab === 'users') return <UsersAdminPanel {...usersPanelProps} />;
    if (tab === 'posts') return <PostsAdminPanel {...postsPanelProps} />;
    return <MatesAdminPanel {...matesPanelProps} />;
  };

  const panelContent = isCommunityActiveTab(activeTab)
    ? visualQaStateOverride?.panelPhase === 'fallback'
      ? <AdminCommunityPanelFallback activeTab={activeTab} />
      : visualQaStateOverride?.panelPhase === 'resolved'
        ? renderResolvedPanel(activeTab)
        : (
          <Suspense fallback={<AdminCommunityPanelFallback activeTab={activeTab} />}>
            {renderResolvedPanel(activeTab)}
          </Suspense>
        )
    : null;

  const roleDialogContent = visualQaStateOverride
    ? visualQaStateOverride.roleDialogPhase === 'closed'
      ? null
      : visualQaStateOverride.roleDialogPhase === 'fallback'
        ? <AdminCommunityRoleDialogFallback />
        : visualQaRenderers?.roleDialog(roleDialogProps)
    : pendingRoleChange !== null
      ? (
        <Suspense fallback={<AdminCommunityRoleDialogFallback />}>
          <AdminRoleChangeDialogContent {...roleDialogProps} />
        </Suspense>
      )
      : null;

  return (
    <section
      data-testid="admin-community-runtime"
      aria-busy={visualQaStateOverride?.panelPhase === 'fallback' || loading || undefined}
      className="min-w-0 overflow-hidden"
    >
      {panelContent !== null ? (
        <div
          data-testid="admin-community-panel-frame"
          className="min-w-0 p-4 sm:p-6"
        >
          {panelContent}
        </div>
      ) : null}
      {roleDialogContent}
    </section>
  );
}
