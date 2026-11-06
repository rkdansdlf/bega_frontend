import type { ReactNode } from 'react';

interface AccountSettingsReadErrorProps {
  source: 'providers' | 'sessions' | 'events';
  title: string;
  description?: ReactNode;
  isRetrying: boolean;
  onRetry?: () => unknown;
}

export default function AccountSettingsReadError({ source, title, description, isRetrying, onRetry }: AccountSettingsReadErrorProps) {
  return (
    <div role="alert" className="mypage-account-read-error" data-testid={`account-settings-${source}-error`}>
      <strong className="mypage-season-empty-title">{title}</strong>
      <p className="mypage-season-empty-copy">{description ?? '잠시 후 다시 시도해주세요.'}</p>
      <button type="button" className="mypage-season-empty-action mypage-account-read-retry"
        data-testid={`account-settings-${source}-retry`} disabled={isRetrying || !onRetry} onClick={() => void onRetry?.()}>
        {isRetrying ? '불러오는 중...' : '다시 시도'}
      </button>
    </div>
  );
}
