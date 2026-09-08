import { Suspense, lazy, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { TEAM_LIST, getFullTeamName } from '../constants/teams';
import { VALIDATION_RULES } from '../constants/validation';
import { useSignUpForm } from '../hooks/useSignUpForm';
import { buildLoginPath } from '../utils/loginRedirect';
import AuthLayout from './auth/AuthLayout';
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon, UserIcon } from './icons/AuthFlowIcons';
import {
  AuthActionGroup,
  AuthFieldGroup,
  AuthHeader,
  AuthStatusPanel,
} from './ui/auth-primitives';
import { Button } from './ui/button';
import { Input } from './ui/input';

const LazyTeamRecommendationTest = lazy(() => import('./TeamRecommendationTest'));
const LazySignUpStatusPanel = lazy(() => import('./auth/SignUpStatusPanel'));

const getAvailabilityMessageClassName = (state: 'idle' | 'checking' | 'available' | 'taken' | 'error') => {
  if (state === 'available') {
    return 'auth-helper-text text-emerald-600';
  }

  if (state === 'taken' || state === 'error') {
    return 'auth-error-text';
  }

  return 'auth-helper-text';
};

function AvailabilityMessage({
  state,
  message,
  idleMessage,
  testId,
}: {
  state: 'idle' | 'checking' | 'available' | 'taken' | 'error';
  message?: string;
  idleMessage?: string;
  testId: string;
}) {
  if (state !== 'idle' && message) {
    return (
      <p className={getAvailabilityMessageClassName(state)} data-testid={testId}>
        {state === 'taken' || state === 'error' ? '* ' : ''}
        {message}
      </p>
    );
  }

  if (idleMessage) {
    return <p className="auth-helper-text" data-testid={testId}>{idleMessage}</p>;
  }

  return null;
}

function PasswordVisibilityButton({
  isVisible,
  onToggle,
  disabled,
  showLabel,
  hideLabel,
  testId,
}: {
  isVisible: boolean;
  onToggle: () => void;
  disabled: boolean;
  showLabel: string;
  hideLabel: string;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      disabled={disabled}
      aria-label={isVisible ? hideLabel : showLabel}
      data-testid={testId}
    >
      {isVisible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
    </button>
  );
}

export type SignUpVisualQaStateOverride = Pick<
  ReturnType<typeof useSignUpForm>,
  | 'formData'
  | 'fieldErrors'
  | 'handleAvailability'
  | 'emailAvailability'
  | 'isLoading'
  | 'isSubmitDisabled'
  | 'isSuccess'
  | 'error'
> & {
  showPassword: boolean;
  showConfirmPassword: boolean;
};

interface SignUpProps {
  visualQaStateOverride?: SignUpVisualQaStateOverride;
}

export default function SignUp(props: SignUpProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [liveShowPassword, setShowPassword] = useState(false);
  const [liveShowConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTeamTest, setShowTeamTest] = useState(false);

  const liveState = useSignUpForm();
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : props.visualQaStateOverride;

  const {
    formData,
    fieldErrors,
    handleAvailability,
    emailAvailability,
    isLoading,
    isSubmitDisabled,
    isSuccess,
    error,
  } = visualQaStateOverride ?? liveState;
  const {
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
  } = liveState;
  const showPassword = visualQaStateOverride?.showPassword ?? liveShowPassword;
  const showConfirmPassword = visualQaStateOverride?.showConfirmPassword ?? liveShowConfirmPassword;

  const loginPath = buildLoginPath(new URLSearchParams(location.search).get('redirect'));
  const isFormLocked = isLoading || isSuccess;

  return (
    <AuthLayout>
      <AuthHeader
        title="회원가입"
        description="응원팀과 프로필 정보를 설정해 BEGA 경험을 바로 시작하세요."
        data-testid="signup-header"
      />

      <form onSubmit={handleSubmit} className="space-y-6" noValidate data-testid="signup-form">
        {isSuccess || error ? (
          <Suspense fallback={null}>
            <LazySignUpStatusPanel error={error} isSuccess={isSuccess} />
          </Suspense>
        ) : null}

        <AuthFieldGroup>
          <div className="space-y-2">
            <label htmlFor="name" className="flex items-center gap-2 text-foreground">
              <UserIcon className="h-4 w-4 text-primary" />
              닉네임
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="nickname"
              value={formData.name}
              onChange={(event) => handleFieldChange('name', event.target.value)}
              onBlur={() => handleFieldBlur('name')}
              className={`auth-input auth-autofill-input ${fieldErrors.name ? 'auth-input-error' : ''}`}
              placeholder="잠실직관러"
              disabled={isFormLocked}
              data-testid="signup-name"
            />
            {fieldErrors.name ? <p className="auth-error-text">* {fieldErrors.name}</p> : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="handle" className="flex items-center gap-2 text-foreground">
              <UserIcon className="h-4 w-4 text-primary" />
              사용자 핸들 (@)
            </label>
            <Input
              id="handle"
              name="handle"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              value={formData.handle}
              onChange={(event) => handleFieldChange('handle', event.target.value)}
              onBlur={() => handleFieldBlur('handle')}
              className={`auth-input auth-autofill-input ${fieldErrors.handle ? 'auth-input-error' : ''}`}
              placeholder="@jamsil_rookie"
              disabled={isFormLocked}
              data-testid="signup-handle"
            />
            {fieldErrors.handle ? <p className="auth-error-text">* {fieldErrors.handle}</p> : (
              <AvailabilityMessage
                state={handleAvailability.state}
                message={handleAvailability.message}
                idleMessage="핸들은 내 프로필 주소로 사용되며 소문자로 저장됩니다. (기호는 _만 가능)"
                testId="signup-handle-availability"
              />
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="flex items-center gap-2 text-foreground">
              <MailIcon className="h-4 w-4 text-primary" />
              이메일
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              value={formData.email}
              onChange={(event) => handleFieldChange('email', event.target.value)}
              onBlur={() => handleFieldBlur('email')}
              className={`auth-input auth-autofill-input ${fieldErrors.email ? 'auth-input-error' : ''}`}
              placeholder="fan@begabaseball.kr"
              disabled={isFormLocked}
              data-testid="signup-email"
            />
            {fieldErrors.email ? <p className="auth-error-text">* {fieldErrors.email}</p> : (
              <AvailabilityMessage
                state={emailAvailability.state}
                message={emailAvailability.message}
                testId="signup-email-availability"
              />
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="flex items-center gap-2 text-foreground">
              <LockIcon className="h-4 w-4 text-primary" />
              비밀번호
            </label>
            <div className="relative" data-vqa-overlap="allowed">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={formData.password}
                onChange={(event) => handleFieldChange('password', event.target.value)}
                onBlur={() => handleFieldBlur('password')}
                className={`auth-input auth-autofill-input pr-12 ${fieldErrors.password ? 'auth-input-error' : ''}`}
                placeholder={`${VALIDATION_RULES.PASSWORD.MIN_LENGTH}자 이상 입력`}
                disabled={isFormLocked}
                data-testid="signup-password"
              />
              <PasswordVisibilityButton
                isVisible={showPassword}
                onToggle={() => setShowPassword((current) => !current)}
                disabled={isFormLocked}
                showLabel="비밀번호 보기"
                hideLabel="비밀번호 숨기기"
                testId="signup-password-visibility"
              />
            </div>
            {fieldErrors.password ? (
              <p className="auth-error-text">* {fieldErrors.password}</p>
            ) : (
              <p className="auth-helper-text">
                • {VALIDATION_RULES.PASSWORD.MIN_LENGTH}자 이상
                <br />
                • 대문자, 소문자, 숫자, 특수문자(@$!%*?&#) 각 1개 이상 포함
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="flex items-center gap-2 text-foreground">
              <LockIcon className="h-4 w-4 text-primary" />
              비밀번호 확인
            </label>
            <div className="relative" data-vqa-overlap="allowed">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={(event) => handleFieldChange('confirmPassword', event.target.value)}
                onBlur={() => handleFieldBlur('confirmPassword')}
                className={`auth-input auth-autofill-input pr-12 ${fieldErrors.confirmPassword ? 'auth-input-error' : ''}`}
                placeholder="비밀번호 재입력"
                disabled={isFormLocked}
                data-testid="signup-confirm-password"
              />
              <PasswordVisibilityButton
                isVisible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((current) => !current)}
                disabled={isFormLocked}
                showLabel="비밀번호 확인 보기"
                hideLabel="비밀번호 확인 숨기기"
                testId="signup-confirm-password-visibility"
              />
            </div>
            {fieldErrors.confirmPassword ? <p className="auth-error-text">* {fieldErrors.confirmPassword}</p> : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="favoriteTeam" className="text-foreground">
              응원팀 선택
            </label>
            <select
              id="favoriteTeam"
              name="favoriteTeam"
              value={formData.favoriteTeam}
              onChange={(event) => handleFieldChange('favoriteTeam', event.target.value)}
              disabled={isFormLocked}
              className={`auth-select-trigger ${fieldErrors.favoriteTeam ? 'auth-input-error' : ''}`}
              data-testid="signup-favorite-team"
            >
              <option value="" disabled>
                팀을 선택하세요
              </option>
              {TEAM_LIST.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>

            {fieldErrors.favoriteTeam ? <p className="auth-error-text">* {fieldErrors.favoriteTeam}</p> : null}

            {formData.favoriteTeam === '없음' ? (
              <AuthStatusPanel tone="warning" role="status" data-testid="signup-no-team-warning">
                <div className="space-y-1 text-body">
                  <p className="font-semibold">응원구단을 선택하지 않으면 응원석을 이용할 수 없습니다.</p>
                  <p>회원가입 후에도 마이페이지 &gt; 내 정보 수정에서 언제든 변경할 수 있습니다.</p>
                </div>
              </AuthStatusPanel>
            ) : null}

            <div className="auth-support-row">
              <p className="auth-note">응원구단은 응원석에서 사용됩니다</p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowTeamTest(true)}
                className="min-h-11 px-2 py-1 text-body text-primary hover:bg-primary/10 dark:hover:bg-primary/20"
                disabled={isFormLocked}
                data-testid="signup-team-test"
              >
                구단 테스트 해보기
              </Button>
            </div>

            {showTeamTest ? (
              <Suspense fallback={null}>
                <LazyTeamRecommendationTest
                  isOpen={showTeamTest}
                  onClose={() => setShowTeamTest(false)}
                  onSelectTeam={(team) => {
                    handleFieldChange('favoriteTeam', getFullTeamName(team));
                    setShowTeamTest(false);
                  }}
                />
              </Suspense>
            ) : null}

            <p className="auth-note">응원구단은 회원가입 후에도 마이페이지 &gt; 내 정보 수정에서 변경할 수 있습니다.</p>
          </div>
        </AuthFieldGroup>

        <AuthActionGroup>
          <Button
            type="submit"
            variant="brand"
            size="touchLg"
            className="w-full"
            disabled={isSubmitDisabled}
            data-testid="signup-submit"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                처리 중...
              </span>
            ) : isSuccess ? (
              <span className="flex items-center justify-center">성공!</span>
            ) : '회원가입'}
          </Button>

          <p className="auth-note text-center">
            이미 계정이 있으신가요?{' '}
            <button
              type="button"
              onClick={() => navigate(loginPath)}
              className="auth-link inline-flex min-h-11 items-center"
              disabled={isFormLocked}
              data-testid="signup-login-link"
            >
              로그인
            </button>
          </p>
        </AuthActionGroup>
      </form>
    </AuthLayout>
  );
}
