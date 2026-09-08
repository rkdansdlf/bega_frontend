import { type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdminRole, useAuthAccessActions, useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { LogInIcon } from './icons/PublicFeatureIcons';
import {
  NavbarLogOutIcon as LogOutIcon,
  NavbarShieldAlertIcon as ShieldAlertIcon,
} from './icons/NavbarIcons';
import { Button } from './ui/button';
import { ProfileAvatar } from './ui/ProfileAvatar';

interface PublicNavbarDesktopAuthControlsProps {
  isAuthBootstrapPending?: boolean;
  compactProgress?: number;
  visualQaStateOverride?: {
    isLoggedIn: boolean;
    userName?: string | null;
    userProfileImageUrl?: string | null;
    userRole?: string;
  };
}

const COMPACT_AUTH_BUTTON_SIZE = 40;

export default function PublicNavbarDesktopAuthControls({
  isAuthBootstrapPending = false,
  compactProgress = 0,
  visualQaStateOverride: visualQaStateOverrideProp,
}: PublicNavbarDesktopAuthControlsProps) {
  const visualQaStateOverride = import.meta.env?.DEV ? visualQaStateOverrideProp : undefined;
  const navigate = useNavigate();
  const liveSession = useAuthSession();
  const liveProfile = useAuthProfileSnapshot();
  const { logout } = useAuthAccessActions();
  const isLoggedIn = visualQaStateOverride?.isLoggedIn ?? liveSession.isLoggedIn;
  const userName = visualQaStateOverride?.userName ?? liveProfile.userName;
  const userProfileImageUrl = visualQaStateOverride?.userProfileImageUrl
    ?? liveProfile.userProfileImageUrl;
  const userRole = visualQaStateOverride?.userRole ?? liveProfile.userRole;
  const isAdmin = isAdminRole(userRole);
  const displayName = userName?.trim() || '회원';
  const collapseProgress = Math.min(1, Math.max(0, compactProgress));
  const isCompact = collapseProgress > 0;
  const expandedProgress = isCompact ? 0 : 1;

  const authButtonStyle = (expandedWidth: number): CSSProperties => ({
    width: `${COMPACT_AUTH_BUTTON_SIZE + ((expandedWidth - COMPACT_AUTH_BUTTON_SIZE) * expandedProgress)}px`,
    flexBasis: `${COMPACT_AUTH_BUTTON_SIZE + ((expandedWidth - COMPACT_AUTH_BUTTON_SIZE) * expandedProgress)}px`,
    maxWidth: `${COMPACT_AUTH_BUTTON_SIZE + ((expandedWidth - COMPACT_AUTH_BUTTON_SIZE) * expandedProgress)}px`,
    paddingLeft: `${16 * expandedProgress}px`,
    paddingRight: `${16 * expandedProgress}px`,
    paddingTop: '0px',
    paddingBottom: '0px',
    fontSize: `${14 + (2 * expandedProgress)}px`,
    lineHeight: '1',
  });

  const labelStyle = (maxWidth: number): CSSProperties => ({
    display: isCompact ? 'none' : 'inline-flex',
    maxWidth: `${maxWidth * expandedProgress}px`,
    opacity: expandedProgress,
  });

  const profileLabelStyle = (width: number): CSSProperties => ({
    display: isCompact ? 'none' : 'inline-flex',
    marginLeft: `${8 * expandedProgress}px`,
    width: `${width * expandedProgress}px`,
    opacity: expandedProgress,
  });

  const handleLogout = () => {
    logout();
    navigate('/home');
  };

  if (isAuthBootstrapPending) {
    return (
      <Button
        type="button"
        disabled
        aria-busy="true"
        aria-label="로그인 확인 중"
        className="rounded-full h-10 overflow-hidden p-0 text-white bg-primary-dark/80 hover:bg-primary-dark/80 cursor-wait transition-[width,padding,font-size] duration-150 ease-out"
        style={authButtonStyle(148)}
      >
        <span className="overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-150 ease-out" style={labelStyle(112)}>
          로그인 확인 중...
        </span>
        {isCompact && <span>...</span>}
      </Button>
    );
  }

  if (!isLoggedIn) {
    return (
      <Button
        type="button"
        aria-label="로그인"
        title="로그인"
        data-testid={import.meta.env?.DEV ? 'public-navbar-desktop-login' : undefined}
        onClick={() => navigate(buildLoginPath(getCurrentRelativeUrl()))}
        className="h-10 w-10 flex-none rounded-full bg-primary-dark p-0 text-white transition-colors duration-150 hover:bg-primary"
      >
        <LogInIcon className="h-5 w-5 shrink-0" weight="bold" />
      </Button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => navigate('/mypage')}
        aria-label={`${displayName} 마이페이지로 이동`}
        data-testid={import.meta.env?.DEV ? 'public-navbar-desktop-profile' : undefined}
        className="group relative flex h-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[rgba(15,23,42,.08)] bg-white/80 font-bold text-gray-900 transition-[width,font-size,background-color,color,border-color] duration-150 ease-out hover:border-primary hover:bg-primary hover:text-primary-foreground dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:border-primary/80 dark:hover:bg-primary/80 dark:hover:text-white"
        style={{
          width: `${COMPACT_AUTH_BUTTON_SIZE + (102 * expandedProgress)}px`,
          flexBasis: `${COMPACT_AUTH_BUTTON_SIZE + (102 * expandedProgress)}px`,
          maxWidth: `${COMPACT_AUTH_BUTTON_SIZE + (102 * expandedProgress)}px`,
          fontSize: `${13 + (2 * expandedProgress)}px`,
          lineHeight: '1',
        }}
      >
        <span className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full">
          <ProfileAvatar
            src={userProfileImageUrl}
            alt={`${displayName} 프로필`}
            fallbackName={displayName}
            width={26}
            height={26}
            className="text-11"
          />
        </span>
        <span
          className="relative inline-flex h-full min-w-0 overflow-hidden whitespace-nowrap text-center transition-[width,margin-left,opacity] duration-150 ease-out"
          style={profileLabelStyle(92)}
          aria-hidden={isCompact}
        >
          <span className="absolute inset-y-0 left-0 flex w-full min-w-0 max-w-full items-center justify-center overflow-hidden text-ellipsis transition-[opacity,transform] duration-150 ease-out group-hover:-translate-y-full group-hover:opacity-0">
            {displayName} 님
          </span>
          <span className="absolute inset-y-0 left-0 flex w-full items-center justify-center translate-y-full opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover:translate-y-0 group-hover:opacity-100">
            마이페이지
          </span>
        </span>
      </button>
      {isAdmin && (
        <Button
          type="button"
          onClick={() => navigate('/admin')}
          variant="outline"
          aria-label="관리자 페이지로 이동"
          data-testid={import.meta.env?.DEV ? 'public-navbar-desktop-admin' : undefined}
          className="rounded-full h-10 flex items-center justify-center gap-0 overflow-hidden p-0 text-red-600 border-red-500/80 transition-[width,padding,font-size] duration-150 ease-out dark:text-red-400 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
          style={authButtonStyle(82)}
        >
          <ShieldAlertIcon className="w-4 h-4 shrink-0" />
          <span className="overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-150 ease-out" style={labelStyle(42)}>
            관리자
          </span>
        </Button>
      )}
      <Button
        type="button"
        onClick={handleLogout}
        aria-label="로그아웃"
        data-testid={import.meta.env?.DEV ? 'public-navbar-desktop-logout' : undefined}
        className="rounded-full h-10 flex items-center justify-center gap-0 overflow-hidden p-0 text-primary dark:text-primary-light border-primary dark:border-primary-light transition-[width,padding,font-size] duration-150 ease-out"
        style={authButtonStyle(124)}
        variant="outline"
      >
        <LogOutIcon className="w-4 h-4 shrink-0" />
        <span className="overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-150 ease-out" style={labelStyle(72)}>
          로그아웃
        </span>
      </Button>
    </>
  );
}
