import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

test('auth session boundary는 라우트 provider가 아니라 앱 루트에 마운트된다', () => {
  const appShell = readSource('./AppShellRuntime.tsx');
  const appQueryProvider = readSource('./AppQueryProvider.tsx');

  assert.match(appShell, /<AuthSessionBoundary>/);
  assert.doesNotMatch(appQueryProvider, /auth-session-expired/);
  assert.doesNotMatch(appQueryProvider, /Notification\.requestPermission/);
});

test('OAuth 성공 경로도 auth session generation을 명시적으로 갱신한다', () => {
  const oauthCallback = readSource('./OAuthCallback.tsx');

  assert.match(oauthCallback, /markAuthSessionEstablished\(\)/);
});

test('홈 복구 배너는 콘텐츠 흐름 안에 있고 viewport overlay가 아니다', () => {
  const homeRuntime = readSource('./HomeRuntime.tsx');
  const recoveryBanner = readSource('./home/HomeRecoveryBanner.tsx');
  const contentIndex = homeRuntime.indexOf('<div className="max-w-7xl');
  const bannerIndex = homeRuntime.indexOf('<LazyHomeRecoveryBanner');

  assert.ok(contentIndex >= 0 && bannerIndex > contentIndex);
  assert.doesNotMatch(recoveryBanner, /\bfixed\b/);
  assert.doesNotMatch(recoveryBanner, /inset-x-0|top-\[/);
});

test('stadium guide 오류 상태는 안정된 빈 배열을 재사용해 render loop를 만들지 않는다', () => {
  const stadiumGuideHook = readSource('../hooks/useStadiumGuide.ts');

  assert.match(stadiumGuideHook, /const EMPTY_STADIUMS: Stadium\[\] = \[\];/);
  assert.match(stadiumGuideHook, /stadiumsQuery\.data \?\? EMPTY_STADIUMS/);
  assert.match(stadiumGuideHook, /setPlaces\(\(currentPlaces\) => currentPlaces\.length === 0 \? currentPlaces : \[\]\)/);
});

test('전역 navbar 브랜드와 route 항목은 heading button이 아닌 링크다', () => {
  for (const path of ['./Navbar.tsx', './PublicNavbar.tsx']) {
    const source = readSource(path);
    assert.match(source, /<Link\s+to="\/home"/);
    assert.doesNotMatch(source, /<h1[^>]*>\s*BEGA/);
    assert.match(source, /to=\{buildNavbarNavPath\(item\.id\)\}/);
  }
});

test('핵심 dialog는 공용 focus trap과 명시적 ARIA 이름을 사용한다', () => {
  const reviewDialog = readSource('./ReviewDialog.tsx');
  const userListModal = readSource('./profile/UserListModal.tsx');
  const mateConfirm = readSource('./MateCreateConfirmDialog.tsx');
  const verification = readSource('./VerificationRequiredDialog.tsx');

  for (const source of [reviewDialog, userListModal, mateConfirm, verification]) {
    assert.match(source, /useFocusTrap/);
    assert.match(source, /tabIndex=\{-1\}/);
  }
  assert.match(reviewDialog, /role="radiogroup"/);
  assert.match(reviewDialog, /aria-label=\{`\$\{num\}점/);
  assert.match(userListModal, /aria-label="닫기"/);
  assert.match(verification, /data-testid="verification-required-dialog"/);
  assert.match(verification, /\[overflow-wrap:anywhere\]/);
  assert.match(verification, /!whitespace-normal/);
  assert.match(verification, /overflow-y-auto/);
  assert.match(verification, /min-h-full/);
});

test('layout의 main landmark 안에 route-level main을 중첩하지 않는다', () => {
  const routeRuntimes = [
    './HomeRuntime.tsx',
    './CheerRuntime.tsx',
    './CheerBookmarks.tsx',
    './MyPageRuntime.tsx',
  ];

  for (const path of routeRuntimes) {
    assert.doesNotMatch(readSource(path), /<main\b/);
  }
});
