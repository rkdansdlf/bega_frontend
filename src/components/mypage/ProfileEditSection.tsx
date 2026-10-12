import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import type { ProfileSection } from '../../types/profile';

const ProfileEditSectionRuntime = lazy(() => import('./ProfileEditSectionRuntime'));

export interface ProfileEditSectionProps {
  profileImage: string | null;
  name: string;
  email: string;
  userRole?: string;
  userProvider?: string;
  savedFavoriteTeam: string;
  initialBio?: string | null;
  onCancel: () => void;
  onSave: () => void;
  activeSection?: ProfileSection;
  onSectionChange?: (section: ProfileSection) => void;
  onChangePassword?: () => void;
  hasPassword?: boolean;
  visualQaPhase?: 'fallback' | 'resolved';
  visualQaRuntimeOverride?: ReactNode;
}

const profileEditSectionFallback = (
  <div className="rounded-2xl border-2 border-border bg-card p-6 text-center text-body text-muted-foreground shadow-lg">
    프로필 설정을 불러오는 중입니다.
  </div>
);

export default function ProfileEditSection({
  visualQaPhase: requestedVisualQaPhase,
  visualQaRuntimeOverride: visualQaRuntimeOverrideProp,
  ...props
}: ProfileEditSectionProps) {
  const visualQaPhase = import.meta.env.PROD === true ? undefined : requestedVisualQaPhase;
  const visualQaRuntimeOverride = import.meta.env.PROD === true
    ? undefined
    : visualQaRuntimeOverrideProp;

  if (visualQaPhase === 'fallback') {
    return profileEditSectionFallback;
  }

  if (visualQaPhase === 'resolved' && visualQaRuntimeOverride) {
    return <>{visualQaRuntimeOverride}</>;
  }

  return (
    <Suspense fallback={profileEditSectionFallback}>
      <ProfileEditSectionRuntime {...props} />
    </Suspense>
  );
}
