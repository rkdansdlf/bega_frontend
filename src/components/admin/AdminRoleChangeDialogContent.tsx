import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import PlainDialog from '../ui/plain-dialog';
import { AdminUserCogIcon } from './AdminPanelIcons';
import { AdminBadge } from './AdminPanelPrimitives';

interface PendingRoleChangeLike {
  userId: number;
  userName: string;
  userEmail: string;
  currentRole: string;
  targetRole: 'ROLE_ADMIN' | 'ROLE_USER';
}

interface AdminRoleChangeDialogContentProps {
  open: boolean;
  pendingRoleChange: PendingRoleChangeLike | null;
  roleChangeReason: string;
  setRoleChangeReason: Dispatch<SetStateAction<string>>;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  visualQaStateOverride?: AdminRoleChangeDialogVisualQaStateOverride;
}

export type AdminRoleChangeDialogVisualQaStateOverride = {
  interactive: boolean;
};

const roleActionClassName = 'min-h-11 w-full whitespace-normal [overflow-wrap:anywhere] sm:min-h-9 sm:w-auto';

export default function AdminRoleChangeDialogContent({
  open,
  pendingRoleChange,
  roleChangeReason,
  setRoleChangeReason,
  onOpenChange,
  onConfirm,
  visualQaStateOverride: requestedVisualQaStateOverride,
}: AdminRoleChangeDialogContentProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const visualQaInteractive = visualQaStateOverride?.interactive === true;
  const [visualQaRoleChangeReason, setVisualQaRoleChangeReason] = useState(roleChangeReason);

  useEffect(() => {
    if (visualQaInteractive) {
      setVisualQaRoleChangeReason(roleChangeReason);
    }
  }, [roleChangeReason, visualQaInteractive]);

  const effectiveRoleChangeReason = visualQaInteractive
    ? visualQaRoleChangeReason
    : roleChangeReason;
  const updateRoleChangeReason = visualQaInteractive
    ? setVisualQaRoleChangeReason
    : setRoleChangeReason;
  const hasPendingRoleChange = pendingRoleChange !== null;
  const isPromotion = pendingRoleChange?.targetRole === 'ROLE_ADMIN';

  return (
    <PlainDialog
      open={open}
      onClose={() => onOpenChange(false)}
      contentTestId="admin-role-change-dialog"
      title={(
        <span className="flex min-w-0 items-center gap-2 text-foreground">
          <AdminUserCogIcon className="h-5 w-5 shrink-0 text-amber-500" />
          역할 변경 확인
        </span>
      )}
      description={hasPendingRoleChange ? (
        <span className="space-y-2 text-muted-foreground">
          <span className="block min-w-0 [overflow-wrap:anywhere]">
            <span
              className="min-w-0 line-clamp-2 font-semibold text-foreground [overflow-wrap:anywhere]"
              title={pendingRoleChange.userName || '이름 없음'}
            >
              {pendingRoleChange.userName || '이름 없음'}
            </span>
            <span
              className="mt-0.5 block min-w-0 truncate"
              title={pendingRoleChange.userEmail || '이메일 없음'}
            >
              ({pendingRoleChange.userEmail || '이메일 없음'})
            </span>
            <span className="mt-1 block">의 역할을 변경합니다.</span>
          </span>
          <span className="flex min-w-0 flex-wrap items-center gap-2 text-caption">
            <AdminBadge className="border-0 bg-muted text-muted-foreground">
              {pendingRoleChange.currentRole === 'ROLE_ADMIN' ? '관리자' : '일반 사용자'}
            </AdminBadge>
            <span className="shrink-0 text-muted-foreground" aria-hidden="true">→</span>
            <AdminBadge
              className={isPromotion
                ? 'border-0 bg-amber-100 text-amber-800 dark:bg-amber-950/35 dark:text-amber-200'
                : 'border-0 bg-muted text-muted-foreground'}
            >
              {isPromotion ? '관리자' : '일반 사용자'}
            </AdminBadge>
          </span>
        </span>
      ) : (
        <span className="text-muted-foreground [overflow-wrap:anywhere]" role="status">
          변경할 사용자 정보가 없습니다.
        </span>
      )}
      className="max-w-md border-border text-foreground"
      footer={(
        <>
          <Button
            variant="outline"
            data-testid="admin-role-change-cancel"
            className={roleActionClassName}
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            variant={isPromotion ? 'default' : 'secondary'}
            data-testid="admin-role-change-confirm"
            className={`${roleActionClassName} ${isPromotion
              ? 'border-0 bg-amber-500 text-slate-950 shadow-sm hover:bg-amber-400'
              : ''}`}
            disabled={!hasPendingRoleChange}
            onClick={onConfirm}
          >
            {hasPendingRoleChange
              ? isPromotion ? '관리자로 승격' : '일반 사용자로 강등'
              : '변경 대상 없음'}
          </Button>
        </>
      )}
    >
      {hasPendingRoleChange ? (
        <div className="min-w-0 px-1 pb-2">
          <label
            htmlFor="admin-role-change-reason"
            className="mb-1 block text-caption text-muted-foreground"
          >
            변경 사유 (선택)
          </label>
          <Input
            id="admin-role-change-reason"
            data-testid="admin-role-change-reason"
            placeholder="역할 변경 사유를 입력하세요..."
            value={effectiveRoleChangeReason}
            onChange={(event) => updateRoleChangeReason(event.target.value)}
            className="min-h-11 rounded-lg border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:ring-amber-500 sm:min-h-9"
          />
        </div>
      ) : (
        <p className="px-1 pb-2 text-body text-muted-foreground [overflow-wrap:anywhere]">
          사용자 목록에서 변경 대상을 다시 선택해 주세요.
        </p>
      )}
    </PlainDialog>
  );
}
