import { useState } from 'react';
import { AdminBadge } from './AdminPanelPrimitives';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import PlainDialog from '../ui/plain-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import TeamLogo from '../TeamLogo';
import { TEAM_DATA } from '../../constants/teams';
import { formatDate } from '../../utils/formatters';
import {
  AdminSearchIcon,
  AdminTrashIcon,
  AdminUserCogIcon,
  AdminUsersIcon,
} from './AdminPanelIcons';

interface PendingRoleChange {
  userId: number;
  userName: string;
  userEmail: string;
  currentRole: string;
  targetRole: 'ROLE_ADMIN' | 'ROLE_USER';
}

interface AdminUser {
  id: number;
  email: string;
  name: string;
  favoriteTeam?: string;
  createdAt: string;
  postCount: number;
  role: string;
}

interface UsersAdminPanelProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  users: AdminUser[];
  loading: boolean;
  isSuperAdmin: boolean;
  currentUserId: number | null;
  handleDeleteUser: (userId: number) => void;
  setPendingRoleChange: (change: PendingRoleChange | null) => void;
  setRoleChangeReason: (reason: string) => void;
  tableClassName?: string;
  visualQaInteractive?: boolean;
}

const adminNativeSelectClassName = 'w-[120px] rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-caption text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-60';

export function UsersAdminPanel({
  searchTerm,
  setSearchTerm,
  users,
  loading,
  isSuperAdmin,
  currentUserId,
  handleDeleteUser,
  setPendingRoleChange,
  setRoleChangeReason,
  tableClassName,
  visualQaInteractive,
}: UsersAdminPanelProps) {
  const [pendingDeleteUser, setPendingDeleteUser] = useState<AdminUser | null>(null);
  const [visualQaSearchTerm, setVisualQaSearchTerm] = useState(searchTerm);
  const [visualQaRoles, setVisualQaRoles] = useState<Record<number, string>>({});
  const visualQaEnabled = import.meta.env?.PROD !== true && visualQaInteractive === true;
  const effectiveSearchTerm = visualQaEnabled ? visualQaSearchTerm : searchTerm;

  return (
    <>
      <div data-testid="admin-users-panel" className="min-w-0 max-w-full">
        <div className="mb-6">
          <div className="relative max-w-md">
            <AdminSearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <Input
              aria-label="사용자 검색"
              placeholder="이메일 또는 이름으로 검색..."
              data-testid="admin-users-search"
              value={effectiveSearchTerm}
              onChange={(event) => {
                const nextSearchTerm = event.target.value;
                if (visualQaEnabled) setVisualQaSearchTerm(nextSearchTerm);
                setSearchTerm(nextSearchTerm);
              }}
              className="h-11 rounded-xl border-slate-700 bg-slate-800/50 pl-12 text-slate-100 transition-colors placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500"
            />
          </div>
        </div>

        {loading ? (
          <div
            data-testid="admin-users-loading"
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="flex items-center justify-center gap-3 py-16 text-slate-400"
          >
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent motion-reduce:animate-none" />
            <span>사용자 목록을 불러오는 중...</span>
          </div>
        ) : users.length === 0 ? (
          <div
            data-testid="admin-users-empty"
            role="status"
            aria-live="polite"
            className="flex min-h-40 flex-col items-center justify-center py-10 text-slate-500"
          >
            <AdminUsersIcon className="mb-3 h-12 w-12 opacity-30" />
            유저가 없습니다.
          </div>
        ) : (
          <div className="max-w-full overflow-hidden rounded-xl border border-slate-800">
            <Table aria-label="관리자 사용자 목록" className={tableClassName ?? 'min-w-[860px]'}>
            <TableHeader>
              <TableRow className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/50">
                <TableHead className="text-slate-400 font-semibold">ID</TableHead>
                <TableHead className="text-slate-400 font-semibold">이메일</TableHead>
                <TableHead className="text-slate-400 font-semibold">닉네임</TableHead>
                <TableHead className="text-slate-400 font-semibold">선호 팀</TableHead>
                <TableHead className="text-slate-400 font-semibold">가입일</TableHead>
                <TableHead className="text-slate-400 font-semibold">게시글</TableHead>
                <TableHead className="text-slate-400 font-semibold">역할</TableHead>
                {isSuperAdmin && (
                  <TableHead className="text-slate-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <AdminUserCogIcon className="w-4 h-4" />
                      역할 변경
                    </span>
                  </TableHead>
                )}
                <TableHead className="text-slate-400 font-semibold text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                  <TableRow
                    key={user.id}
                    data-testid={`admin-user-row-${user.id}`}
                    className="border-slate-800 transition-colors duration-150 hover:bg-slate-800/30"
                  >
                    <TableCell className="text-slate-300 font-mono text-caption">{user.id}</TableCell>
                    <TableCell className="text-slate-200">
                      <span title={user.email} className="block max-w-[220px] truncate whitespace-nowrap">{user.email}</span>
                    </TableCell>
                    <TableCell className="text-slate-200 font-semibold">
                      <span title={user.name} className="block max-w-[160px] truncate whitespace-nowrap">{user.name}</span>
                    </TableCell>
                    <TableCell>
                      {user.favoriteTeam ? (
                        <div className="flex items-center gap-2">
                          <TeamLogo team={user.favoriteTeam} size={24} />
                          <span className="text-slate-300">{TEAM_DATA[user.favoriteTeam]?.name || user.favoriteTeam}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-400 text-caption">{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <span className="inline-flex min-w-8 items-center justify-center whitespace-nowrap rounded-lg bg-slate-800 px-2 py-1 text-amber-400 font-semibold text-caption">
                        {user.postCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.role === 'ROLE_SUPER_ADMIN' ? (
                        <AdminBadge className="border-0 bg-amber-500 text-slate-950">
                          최고관리자
                        </AdminBadge>
                      ) : user.role === 'ROLE_ADMIN' ? (
                        <AdminBadge className="border-0 bg-amber-500/20 text-amber-200">
                          관리자
                        </AdminBadge>
                      ) : (
                        <AdminBadge className="bg-slate-700 text-slate-300 border-0">
                          일반
                        </AdminBadge>
                      )}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        {/* SUPER_ADMIN 자신의 역할은 변경 불가 */}
                        {user.id === currentUserId || user.role === 'ROLE_SUPER_ADMIN' ? (
                          <span className="text-slate-600 text-caption">변경 불가</span>
                        ) : (
                          <select
                            data-testid={`admin-user-role-trigger-${user.id}`}
                            aria-label={`${user.name} 역할 변경`}
                            value={visualQaEnabled ? (visualQaRoles[user.id] ?? user.role) : user.role}
                            onChange={(event) => {
                              const nextRole = event.target.value as 'ROLE_ADMIN' | 'ROLE_USER';
                              if (nextRole === user.role) return;
                              if (visualQaEnabled) {
                                setVisualQaRoles((current) => ({
                                  ...current,
                                  [user.id]: nextRole,
                                }));
                              }
                              setPendingRoleChange({
                                userId: user.id,
                                userName: user.name,
                                userEmail: user.email,
                                currentRole: user.role,
                                targetRole: nextRole,
                              });
                              setRoleChangeReason('');
                            }}
                            className={adminNativeSelectClassName}
                          >
                            <option value="ROLE_USER">일반 사용자</option>
                            <option value="ROLE_ADMIN">관리자</option>
                          </select>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`admin-user-delete-${user.id}`}
                        aria-label={`사용자 ${user.name} 삭제`}
                        className="min-w-11 rounded-lg text-slate-500 transition-colors duration-150 hover:bg-red-500/10 hover:text-red-400 sm:min-w-8"
                        disabled={user.role === 'ROLE_ADMIN'}
                        onClick={() => setPendingDeleteUser(user)}
                      >
                        <AdminTrashIcon className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        )}
      </div>

      <PlainDialog
        open={Boolean(pendingDeleteUser)}
        onClose={() => setPendingDeleteUser(null)}
        title="유저를 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 유저의 모든 데이터가 영구적으로 삭제됩니다."
        contentTestId="admin-user-delete-dialog"
        className="sm:max-w-md border-slate-800 bg-slate-900 text-slate-100"
        footer={(
          <>
            <Button
              variant="outline"
              data-testid="admin-user-delete-cancel"
              onClick={() => setPendingDeleteUser(null)}
              className="min-h-11 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 sm:min-h-9"
            >
              취소
            </Button>
            <Button
              data-testid="admin-user-delete-confirm"
              onClick={() => {
                if (!pendingDeleteUser) return;
                handleDeleteUser(pendingDeleteUser.id);
                setPendingDeleteUser(null);
              }}
              className="min-h-11 bg-red-500 text-white border-0 shadow-sm hover:bg-red-600 sm:min-h-9"
            >
              삭제
            </Button>
          </>
        )}
      >
        {pendingDeleteUser ? (
          <p className="text-caption text-slate-400">
            <span className="font-semibold text-slate-200">{pendingDeleteUser.name}</span> 계정을 삭제합니다.
          </p>
        ) : null}
      </PlainDialog>
    </>
  );
}
