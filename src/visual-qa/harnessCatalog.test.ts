import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import * as harnessCatalogModule from './harnessCatalog';
import {
  AUTOMATIC_COMPONENT_PROBE_SCENARIOS,
  AUTOMATIC_COMPONENT_STATE_SCENARIOS,
  AUTOMATIC_ICON_SCENARIOS,
  componentModuleKey,
  componentStyleModuleKeys,
  resolveDirectModuleFile,
  resolveHarnessScenario,
} from './harnessCatalog';
import { KNOWN_COMPONENT_STATE_ADAPTER_IDS } from './stateAdapters';

test('automatic icon scenarios include every module-export gallery symbol exactly once', () => {
  assert.ok(AUTOMATIC_ICON_SCENARIOS.length > 0);
  assert.equal(
    new Set(AUTOMATIC_ICON_SCENARIOS.map(({ componentId }) => componentId)).size,
    AUTOMATIC_ICON_SCENARIOS.length,
  );
  assert.ok(AUTOMATIC_ICON_SCENARIOS.every(({ renderAccess }) => renderAccess === 'module-export'));
  assert.ok(AUTOMATIC_ICON_SCENARIOS.every(({ exportName }) => exportName.length > 0));
  assert.ok(AUTOMATIC_ICON_SCENARIOS.some(
    ({ componentId }) => componentId.endsWith('PredictionShellIcons.tsx#PredictionBaseballIcon'),
  ));
});

test('automatic component probes include every module-export visual candidate without treating it as final coverage', () => {
  assert.ok(AUTOMATIC_COMPONENT_PROBE_SCENARIOS.length > 0);
  assert.ok(AUTOMATIC_COMPONENT_PROBE_SCENARIOS.every(({ kind }) => kind === 'component-probe'));
  assert.ok(AUTOMATIC_COMPONENT_PROBE_SCENARIOS.every(({ finalCoverage }) => finalCoverage === false));
  assert.equal(
    new Set(AUTOMATIC_COMPONENT_PROBE_SCENARIOS.map(({ componentId }) => componentId)).size,
    AUTOMATIC_COMPONENT_PROBE_SCENARIOS.length,
  );
});

test('registered component states expand to executable adapter-backed scenarios', () => {
  assert.equal(AUTOMATIC_COMPONENT_STATE_SCENARIOS.length, 70836);
  assert.ok(AUTOMATIC_COMPONENT_STATE_SCENARIOS.every(({ kind }) => kind === 'component-state'));
  const registeredDataStates = new Set(AUTOMATIC_COMPONENT_STATE_SCENARIOS
    .map(({ states }) => states.data)
    .filter((value): value is string => value !== undefined));
  for (const requiredState of ['empty', 'error-503', 'loading', 'manual-required']) {
    assert.ok(registeredDataStates.has(requiredState));
  }
  assert.ok(AUTOMATIC_COMPONENT_STATE_SCENARIOS.every(({ adapterId }) => (
    KNOWN_COMPONENT_STATE_ADAPTER_IDS.includes(adapterId)
  )));
  assert.equal(
    new Set(AUTOMATIC_COMPONENT_STATE_SCENARIOS.map(({ componentId }) => componentId)).size,
    282,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/AppBrowserShell.tsx#AppBrowserShell'
    )).length,
    2,
  );
  const appRoutes = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/AppRoutes.tsx#AppRoutes'
  ));
  assert.equal(appRoutes.length, 2);
  assert.deepEqual(
    new Set(appRoutes.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.ok(appRoutes.every(({ variants }) => variants.route === 'not-found'));
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/Login.tsx#Login'
    )).length,
    1912,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/SignUp.tsx#SignUp'
    )).length,
    2776,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/OAuthCallback.tsx#OAuthCallback'
    )).length,
    42,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/OAuthEmailChallengeConfirm.tsx#OAuthEmailChallengeConfirm'
    )).length,
    42,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/NoticePage.tsx#NoticePage'
    )).length,
    4,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/NoticePageRuntime.tsx#NoticePageRuntime'
    )).length,
    508,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/PasswordReset.tsx#PasswordReset'
    )).length,
    136,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/PasswordResetConfirm.tsx#PasswordResetConfirm'
    )).length,
    960,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/AppShellRuntime.tsx#AppShellRuntime'
    )).length,
    8,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/AuthBootstrapGate.tsx#AuthBootstrapGate'
    )).length,
    5,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/AuthSessionBoundary.tsx#AuthSessionBoundary'
    )).length,
    7,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/AppQueryProvider.tsx#AppQueryProvider'
    )).length,
    4,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/AuthenticatedLayoutChrome.tsx#AuthenticatedLayoutChrome'
    )).length,
    6,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/AuthenticatedLayoutToaster.tsx#AuthenticatedLayoutToaster'
    )).length,
    2,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/Layout.tsx#Layout'
    )).length,
    306,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/Navbar.tsx#Navbar'
    )).length,
    7074,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/PublicNavbar.tsx#PublicNavbar'
    )).length,
    3924,
  );
  const publicDesktopAuthControls = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/PublicNavbarDesktopAuthControls.tsx#PublicNavbarDesktopAuthControls'
  ));
  assert.equal(publicDesktopAuthControls.length, 168);
  assert.deepEqual(Object.fromEntries(['default', 'hover', 'focus-visible', 'pressed'].map((interaction) => [
    interaction,
    publicDesktopAuthControls.filter(({ states }) => states.interactions === interaction).length,
  ])), {
    default: 66,
    hover: 34,
    'focus-visible': 34,
    pressed: 34,
  });
  assert.deepEqual(Object.fromEntries(['login', 'profile', 'admin', 'logout'].map((targetId) => [
    targetId,
    publicDesktopAuthControls.filter(({ interactionPlan }) => (
      interactionPlan?.targetId === targetId
    )).length,
  ])), {
    login: 6,
    profile: 36,
    admin: 24,
    logout: 36,
  });
  assert.deepEqual(
    new Set(publicDesktopAuthControls.map(({ variants }) => variants.compact)),
    new Set(['expanded', 'compact']),
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/ProtectedRoute.tsx#ProtectedRoute'
    )).length,
    5,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/PublicOnlyAuthRoute.tsx#PublicOnlyAuthRoute'
    )).length,
    8,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/SimpleMarkdownContent.tsx#SimpleMarkdownContent'
    )).length,
    52,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/FeatureCard.tsx#FeatureCard'
    )).length,
    1440,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/EndOfFeed.tsx#EndOfFeed'
    )).length,
    8,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/Footer.tsx#Footer'
    )).length,
    14,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/LaptopMockup.tsx#LaptopMockup'
    )).length,
    240,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/AchievementCelebrationOverlay.tsx#AchievementCelebrationOverlay'
    )).length,
    40,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/NotFound.tsx#NotFound'
    )).length,
    14,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/ChatBotFloatingButton.tsx#ChatBotFloatingButton'
    )).length,
    32,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/PublicNavbarDmUnreadBadge.tsx#PublicNavbarDmUnreadBadge'
    )).length,
    9,
  );
  const publicNavbarMenuPanel = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/PublicNavbarMenuPanel.tsx#PublicNavbarMenuPanel'
  ));
  assert.equal(publicNavbarMenuPanel.length, 1190);
  assert.deepEqual(Object.fromEntries(['default', 'hover', 'focus-visible', 'pressed'].map((interaction) => [
    interaction,
    publicNavbarMenuPanel.filter(({ states }) => states.interactions === interaction).length,
  ])), {
    default: 170,
    hover: 340,
    'focus-visible': 340,
    pressed: 340,
  });
  assert.deepEqual(Object.fromEntries([
    'theme',
    'cheer',
    'stadium',
    'prediction',
    'mate',
    'login',
    'profile',
    'admin',
    'logout',
  ].map((targetId) => [
    targetId,
    publicNavbarMenuPanel.filter(({ interactionPlan }) => (
      interactionPlan?.targetId === targetId
    )).length,
  ])), {
    theme: 150,
    cheer: 150,
    stadium: 150,
    prediction: 150,
    mate: 150,
    login: 30,
    profile: 90,
    admin: 60,
    logout: 90,
  });
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/AuthenticatedStadiumFavoriteToggle.tsx#AuthenticatedStadiumFavoriteToggle'
    )).length,
    40,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/MateTodayCountBadge.tsx#MateTodayCountBadge'
    )).length,
    11,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === 'src/components/CheerThemeControl.tsx#CheerThemeControl'
    )).length,
    160,
  );
  const cardScenarioCounts = Object.fromEntries([
    'Card',
    'CardAction',
    'CardContent',
    'CardDescription',
    'CardFooter',
    'CardHeader',
    'CardTitle',
  ].map((exportName) => [
    exportName,
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === `src/components/ui/card.tsx#${exportName}`
    )).length,
  ]));
  assert.deepEqual(cardScenarioCounts, {
    Card: 9,
    CardAction: 3,
    CardContent: 3,
    CardDescription: 3,
    CardFooter: 6,
    CardHeader: 12,
    CardTitle: 3,
  });
  const pagePrimitiveScenarioCounts = Object.fromEntries([
    'Container',
    'CTAGroup',
    'MockupFrame',
    'Section',
    'SectionHeader',
    'Stack',
    'TextBlock',
  ].map((exportName) => [
    exportName,
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === `src/components/ui/page-primitives.tsx#${exportName}`
    )).length,
  ]));
  assert.deepEqual(pagePrimitiveScenarioCounts, {
    Container: 3,
    CTAGroup: 6,
    MockupFrame: 3,
    Section: 3,
    SectionHeader: 24,
    Stack: 12,
    TextBlock: 12,
  });
  const adSlotScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/ads/AdSlot.tsx#AdSlot'
  ));
  assert.equal(adSlotScenarios.length, 60);
  assert.ok(adSlotScenarios.every(({ interactionPlan }) => interactionPlan === undefined));
  assert.ok(adSlotScenarios
    .filter(({ states }) => states.data === 'unbroken-token')
    .every(({ variants }) => ['banner', 'native-card', 'sponsor-card'].includes(variants.creative)));
  const tableScenarioCounts = Object.fromEntries([
    'Table',
    'TableBody',
    'TableCaption',
    'TableCell',
    'TableFooter',
    'TableHead',
    'TableHeader',
    'TableRow',
  ].map((exportName) => [
    exportName,
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === `src/components/ui/table.tsx#${exportName}`
    )).length,
  ]));
  assert.deepEqual(tableScenarioCounts, {
    Table: 24,
    TableBody: 24,
    TableCaption: 3,
    TableCell: 6,
    TableFooter: 6,
    TableHead: 6,
    TableHeader: 6,
    TableRow: 24,
  });
  const statusBadgeScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/ui/status-badge.tsx#StatusBadge'
  ));
  assert.equal(statusBadgeScenarios.length, 2448);
  assert.ok(statusBadgeScenarios
    .filter(({ states }) => states.interactions === 'hover')
    .every(({ variants, interactionPlan }) => (
      variants.live === 'hover'
        && interactionPlan?.targetId === 'hover-scope'
        && interactionPlan.selector === '[data-vqa-harness-surface]'
    )));
  assert.ok(statusBadgeScenarios
    .filter(({ variants }) => variants.visualVariant === 'line')
    .every(({ variants }) => variants.marker === 'dot' && variants.customColors === 'default'));
  assert.ok(statusBadgeScenarios
    .filter(({ variants }) => variants.visualVariant === 'filled')
    .every(({ variants }) => variants.marker === 'dot' && variants.tone === 'neutral'));
  const formControlScenarioCounts = Object.fromEntries([
    ['autosize-textarea.tsx', 'AutosizeTextarea'],
    ['input.tsx', 'Input'],
    ['textarea.tsx', 'Textarea'],
  ].map(([file, exportName]) => [
    exportName,
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === `src/components/ui/${file}#${exportName}`
    )).length,
  ]));
  assert.deepEqual(formControlScenarioCounts, {
    AutosizeTextarea: 39,
    Input: 126,
    Textarea: 32,
  });
  assert.ok(AUTOMATIC_COMPONENT_STATE_SCENARIOS
    .filter(({ componentId, states }) => (
      componentId === 'src/components/ui/input.tsx#Input'
        && states.interactions === 'focus-visible'
    ))
    .every(({ interactionPlan, variants }) => (
      variants.availability === 'enabled'
        && interactionPlan?.targetId === 'field'
    )));
  const buttonScenarioCounts = Object.fromEntries([
    ['button.tsx', 'Button'],
    ['plain-button.tsx', 'PlainButton'],
  ].map(([file, label]) => [
    label,
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === `src/components/ui/${file}#Button`
    )).length,
  ]));
  assert.deepEqual(buttonScenarioCounts, {
    Button: 6768,
    PlainButton: 1566,
  });
  assert.ok(AUTOMATIC_COMPONENT_STATE_SCENARIOS
    .filter(({ componentId, variants }) => (
      componentId.endsWith('/button.tsx#Button')
        && variants.element === 'as-child-link'
    ))
    .every(({ variants }) => variants.availability === 'enabled'));
  assert.ok(AUTOMATIC_COMPONENT_STATE_SCENARIOS
    .filter(({ componentId, variants }) => (
      componentId.endsWith('/button.tsx#Button')
        && variants.content === 'icon-only'
    ))
    .every(({ states, variants }) => (
      states.data === 'single'
        && (variants.size === 'icon' || variants.size === 'iconTouch')
    )));
  const profileAvatarScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/ui/ProfileAvatar.tsx#ProfileAvatar'
  ));
  assert.equal(profileAvatarScenarios.length, 510);
  assert.deepEqual(
    [...new Set(profileAvatarScenarios.map(({ variants }) => variants.dimensions))].sort(),
    [
      'height-only-40',
      'landscape-96x24',
      'portrait-24x96',
      'responsive-lg',
      'responsive-md',
      'responsive-sm',
      'square-24',
      'square-26',
      'square-30',
      'square-32',
      'square-40',
      'square-48',
      'square-56',
      'square-64',
      'square-80',
      'square-96',
      'width-only-40',
    ],
  );
  assert.deepEqual(
    [...new Set(profileAvatarScenarios.map(({ variants }) => variants.ring))].sort(),
    ['cheer', 'cheerFeed', 'custom', 'default', 'none'],
  );
  const plainDialogScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/ui/plain-dialog.tsx#PlainDialog'
  ));
  assert.equal(plainDialogScenarios.length, 390);
  assert.ok(plainDialogScenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ interactionPlan, variants }) => (
      interactionPlan?.targetId === 'close'
        && variants.close === 'visible'
        && variants.header !== 'hidden'
    )));
  assert.ok(plainDialogScenarios
    .filter(({ states }) => states.data === 'null-optional')
    .every(({ variants }) => variants.header === 'empty' || variants.header === 'hidden'));
  const plainMenuScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/ui/plain-menu.tsx#PlainMenu'
  ));
  assert.equal(plainMenuScenarios.length, 100);
  assert.ok(plainMenuScenarios
    .filter(({ variants }) => variants.open === 'closed')
    .every(({ states, variants }) => (
      states.data === 'single'
        && variants.align === 'start'
        && variants.density === 'one'
        && variants.role === 'menu'
    )));
  assert.ok(plainMenuScenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ interactionPlan }) => interactionPlan?.targetId === 'trigger'));
  const calendarScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/ui/calendar.tsx#Calendar'
  ));
  assert.equal(calendarScenarios.length, 744);
  assert.ok(calendarScenarios
    .filter(({ variants }) => variants.availability === 'all-disabled')
    .every(({ states, interactionPlan }) => (
      states.interactions !== 'keyboard-navigation'
        && interactionPlan?.targetId !== 'day'
    )));
  assert.ok(calendarScenarios
    .filter(({ states }) => states.interactions === 'keyboard-navigation')
    .every(({ interactionPlan, variants }) => (
      variants.availability !== 'all-disabled'
      && ['ArrowRight', 'PageDown'].includes(interactionPlan?.key ?? '')
    )));
  const uiKitPreviewScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/ui/UIKitPreview.tsx#UIKitPreview'
  ));
  assert.equal(uiKitPreviewScenarios.length, 10);
  assert.deepEqual(
    [...new Set(uiKitPreviewScenarios.map(({ variants }) => variants.theme))].sort(),
    ['dark', 'light'],
  );
  assert.ok(uiKitPreviewScenarios
    .filter(({ states }) => states.interactions === 'selected')
    .every(({ interactionPlan, variants }) => (
      interactionPlan?.targetId === (variants.theme === 'light' ? 'to-dark' : 'to-light')
    )));
  const authPrimitiveScenarioCounts = Object.fromEntries([
    'AuthActionGroup',
    'AuthFieldGroup',
    'AuthFormPanel',
    'AuthHeader',
    'AuthHeroPanel',
    'AuthShell',
    'AuthStage',
    'AuthStatusPanel',
  ].map((exportName) => [
    exportName,
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === `src/components/ui/auth-primitives.tsx#${exportName}`
    )).length,
  ]));
  assert.deepEqual(authPrimitiveScenarioCounts, {
    AuthActionGroup: 4,
    AuthFieldGroup: 4,
    AuthFormPanel: 4,
    AuthHeader: 8,
    AuthHeroPanel: 4,
    AuthShell: 8,
    AuthStage: 4,
    AuthStatusPanel: 32,
  });
  assert.ok(AUTOMATIC_COMPONENT_STATE_SCENARIOS
    .filter(({ componentId }) => componentId.startsWith('src/components/ui/auth-primitives.tsx#'))
    .every(({ styleModuleKeys }) => (
      styleModuleKeys.includes('../components/auth/auth-layout.css')
    )));
  const authLayoutScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/auth/AuthLayout.tsx#AuthLayout'
  ));
  assert.equal(authLayoutScenarios.length, 16);
  assert.ok(authLayoutScenarios
    .filter(({ variants }) => variants.homeButton === 'hidden')
    .every(({ states }) => states.interactions === 'default'));
  assert.ok(authLayoutScenarios
    .filter(({ states }) => states.interactions === 'selected')
    .every(({ interactionPlan }) => (
      interactionPlan?.action === 'click'
      && interactionPlan.selector === '[data-testid="auth-home-button"]'
    )));
  const signUpStatusScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/auth/SignUpStatusPanel.tsx#SignUpStatusPanel'
  ));
  assert.equal(signUpStatusScenarios.length, 5);
  assert.ok(signUpStatusScenarios
    .filter(({ variants }) => variants.outcome !== 'error')
    .every(({ states }) => states.data === 'single'));
  const commonScenarioCounts = Object.fromEntries([
    ['CoachMarkdown.tsx', 'CoachMarkdown'],
    ['EmptyState.tsx', 'EmptyState'],
    ['ErrorBoundary.tsx', 'ErrorBoundary'],
    ['ErrorBoundaryFallback.tsx', 'ErrorBoundaryFallback'],
    ['ErrorFeedbackPanel.tsx', 'ErrorFeedbackPanel'],
    ['OptimizedImage.tsx', 'OptimizedImage'],
    ['ProfileImage.tsx', 'ProfileImage'],
    ['QrCodeSvg.tsx', 'QrCodeSvg'],
  ].map(([file, exportName]) => [
    exportName,
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId === `src/components/common/${file}#${exportName}`
    )).length,
  ]));
  assert.deepEqual(commonScenarioCounts, {
    CoachMarkdown: 9,
    EmptyState: 192,
    ErrorBoundary: 7,
    ErrorBoundaryFallback: 12,
    ErrorFeedbackPanel: 252,
    OptimizedImage: 16,
    ProfileImage: 20,
    QrCodeSvg: 144,
  });
  assert.ok(AUTOMATIC_COMPONENT_STATE_SCENARIOS
    .filter(({ componentId, states }) => (
      componentId === 'src/components/common/EmptyState.tsx#EmptyState'
      && states.interactions !== 'default'
    ))
    .every(({ variants, interactionPlan }) => (
      variants.action === 'present'
      && interactionPlan?.selector === '[data-testid="common-empty-state-action"]'
    )));
  const errorFeedbackScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/common/ErrorFeedbackPanel.tsx#ErrorFeedbackPanel'
  ));
  assert.equal(errorFeedbackScenarios.length, 252);
  assert.ok(errorFeedbackScenarios
    .filter(({ states }) => ['default', 'focus-visible', 'input'].includes(states.interactions ?? ''))
    .every(({ states }) => states.system === 'online'));
  assert.ok(errorFeedbackScenarios
    .filter(({ states }) => states.interactions === 'selected')
    .every(({ states, interactionPlan }) => (
      states.data !== 'null-optional'
      && states.system !== 'timeout'
      && interactionPlan?.setup?.[0]?.action === 'fill'
      && interactionPlan.waitForSelector === '[data-testid="error-feedback"] [aria-live="polite"]'
    )));
  assert.ok(errorFeedbackScenarios
    .filter(({ states }) => states.interactions === 'submitting')
    .every(({ states, interactionPlan }) => (
      states.data !== 'null-optional'
      && states.system === 'timeout'
      && interactionPlan?.waitForSelector
        === '[data-testid="error-feedback"] button:last-child[aria-busy="true"]'
    )));
  const oauthEmailChallengeScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/auth/OAuthEmailChallengePanel.tsx#OAuthEmailChallengePanel'
  ));
  assert.equal(oauthEmailChallengeScenarios.length, 64);
  assert.equal(
    oauthEmailChallengeScenarios.filter(({ states }) => states.data === 'loading').length,
    2,
  );
  assert.ok(oauthEmailChallengeScenarios
    .filter(({ states }) => states.interactions === 'selected')
    .every(({ interactionPlan, variants }) => (
      ['email-required', 'email-sent'].includes(variants.presentation)
      && interactionPlan?.waitForSelector?.startsWith('[data-testid="oauth-email-')
    )));
  assert.ok(oauthEmailChallengeScenarios
    .filter(({ states }) => states.interactions === 'submitting')
    .every(({ states, interactionPlan }) => (
      states.system === 'timeout'
      && interactionPlan?.waitForSelector?.includes('[aria-busy="true"]')
    )));
  const figmaImages = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/figma/ImageWithFallback.tsx#ImageWithFallback'
  ));
  assert.equal(figmaImages.length, 12);
  assert.ok(figmaImages.some(({ states }) => states.data === 'broken-image'));
  const rankingResults = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/ranking/RankingPredictionResultPanel.tsx#RankingPredictionResultPanel'
  ));
  assert.equal(rankingResults.length, 28);
  assert.ok(rankingResults
    .filter(({ states }) => ['empty', 'null-optional'].includes(states.data ?? ''))
    .every(({ variants }) => variants.accuracy === 'exact'));
  const rankingItems = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/ranking/RankingItem.tsx#RankingItem'
  ));
  assert.equal(rankingItems.length, 394);
  assert.equal(rankingItems.filter(({ states }) => states.interactions === 'default').length, 52);
  assert.equal(rankingItems.filter(({ states }) => states.interactions === 'hover').length, 90);
  assert.equal(rankingItems.filter(({ states }) => states.interactions === 'focus-visible').length, 126);
  assert.equal(rankingItems.filter(({ states }) => states.interactions === 'pressed').length, 126);
  assert.ok(rankingItems
    .filter(({ states }) => states.data === 'empty')
    .every(({ states, variants, interactionPlan }) => (
      states.interactions === 'default'
      && variants.mode === 'editable'
      && variants.movement === 'idle'
      && interactionPlan === undefined
    )));
  assert.ok(rankingItems
    .filter(({ variants }) => variants.mode === 'read-only')
    .every(({ states, variants, interactionPlan }) => (
      states.interactions === 'default'
      && variants.movement === 'idle'
      && interactionPlan === undefined
    )));
  const themeToggleScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/ThemeToggleButton.tsx#ThemeToggleButton'
  ));
  assert.equal(themeToggleScenarios.length, 32);
  assert.deepEqual(Object.fromEntries(['default', 'hover', 'focus-visible', 'selected'].map((interaction) => [
    interaction,
    themeToggleScenarios.filter(({ states }) => states.interactions === interaction).length,
  ])), {
    default: 8,
    hover: 8,
    'focus-visible': 8,
    selected: 8,
  });
  assert.equal(themeToggleScenarios
    .filter(({ interactionPlan }) => interactionPlan?.targetId === 'to-dark').length, 4);
  assert.equal(themeToggleScenarios
    .filter(({ interactionPlan }) => interactionPlan?.targetId === 'to-light').length, 4);
  assert.ok(themeToggleScenarios.every(({ variants }) => (
    ['default', 'private-navbar', 'public-navbar', 'menu-panel'].includes(variants.usage)
  )));
  const termsScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/TermsOfService.tsx#TermsOfService'
  ));
  assert.equal(termsScenarios.length, 2);
  assert.deepEqual(new Set(termsScenarios.map(({ variants }) => variants.theme)), new Set(['light', 'dark']));
  assert.ok(termsScenarios.every(({ interactionPlan }) => interactionPlan === undefined));
  const privacyScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/PrivacyPolicy.tsx#PrivacyPolicy'
  ));
  assert.equal(privacyScenarios.length, 2);
  assert.deepEqual(new Set(privacyScenarios.map(({ variants }) => variants.theme)), new Set(['light', 'dark']));
  assert.ok(privacyScenarios.every(({ interactionPlan }) => interactionPlan === undefined));
  const teamLogoScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/TeamLogo.tsx#TeamLogo'
  ));
  assert.equal(teamLogoScenarios.length, 272);
  assert.deepEqual(new Set(teamLogoScenarios.map(({ states }) => states.data)), new Set([
    'populated',
    'long-korean',
    'unbroken-token',
    'empty',
    'null-optional',
  ]));
  assert.deepEqual(new Set(teamLogoScenarios.map(({ variants }) => variants.team)), new Set([
    'hanwha',
    'kiwoom',
    'samsung',
    'lotte',
    'doosan',
    'kia',
    'ssg',
    'nc',
    'lg',
    'kt',
    'legacy-code',
    'team-id-precedence',
    'unknown-short',
  ]));
  assert.deepEqual(new Set(teamLogoScenarios.map(({ variants }) => variants.theme)), new Set(['light', 'dark']));
  assert.deepEqual(new Set(teamLogoScenarios.map(({ variants }) => variants.size)), new Set([
    'default',
    'sm',
    'md',
    'lg',
    'custom-min',
    'custom-large',
    'full-prediction',
    'full-standalone',
  ]));
  assert.ok(teamLogoScenarios.every(({ interactionPlan }) => interactionPlan === undefined));
  const teamRecommendationScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/TeamRecommendationTest.tsx#TeamRecommendationTest'
  ));
  assert.equal(teamRecommendationScenarios.length, 252);
  assert.deepEqual(Object.fromEntries(['default', 'hover', 'focus-visible', 'pressed', 'selected'].map((interaction) => [
    interaction,
    teamRecommendationScenarios.filter(({ states }) => states.interactions === interaction).length,
  ])), {
    default: 34,
    hover: 68,
    'focus-visible': 68,
    pressed: 68,
    selected: 14,
  });
  assert.deepEqual(new Set(teamRecommendationScenarios.map(({ variants }) => variants.theme)), new Set(['light', 'dark']));
  const ticketUploadScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/ticket/TicketUploadModal.tsx#TicketUploadModal'
  ));
  assert.equal(ticketUploadScenarios.length, 122);
  assert.deepEqual(Object.fromEntries(['default', 'focus-visible', 'input', 'selected'].map((interaction) => [
    interaction,
    ticketUploadScenarios.filter(({ states }) => states.interactions === interaction).length,
  ])), {
    default: 14,
    'focus-visible': 14,
    input: 70,
    selected: 24,
  });
  assert.deepEqual(
    new Set(ticketUploadScenarios
      .filter(({ states }) => states.interactions === 'input')
      .map(({ interactionPlan }) => interactionPlan?.targetId)),
    new Set(['date', 'stadium', 'away-team', 'home-team', 'section', 'row', 'seat']),
  );
  assert.ok(ticketUploadScenarios
    .filter(({ variants }) => variants.gameMatch === 'present')
    .every(({ states }) => (
      ['single', 'maximum-supported', 'long-korean', 'null-optional', 'unbroken-token']
        .includes(states.data ?? '')
    )));
  assert.ok(ticketUploadScenarios.every(({ states }) => (
    states.data === 'error-503'
      ? states.system === 'offline'
      : states.data === 'loading'
        ? states.system === 'timeout'
        : states.system === 'online'
  )));
  const toasterScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/ui/sonner.tsx#Toaster'
  ));
  assert.equal(toasterScenarios.length, 2880);
  assert.ok(toasterScenarios
    .filter(({ states }) => states.interactions === 'selected')
    .every(({ states, interactionPlan }) => (states.data === 'maximum-supported'
      ? interactionPlan?.targetId === 'close-stack'
        && interactionPlan.waitForSelector === '.vqa-toaster [role="status"]'
      : interactionPlan?.targetId === 'close-single'
        && interactionPlan.waitForHiddenSelector === '.vqa-toaster [role="status"]')));
  const sajikPathValidation = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('sajik/SajikSeatMapEditor.tsx#PathValidationStatus')
  ));
  const sajikEditor = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('sajik/SajikSeatMapEditor.tsx#SajikSeatMapEditor')
  ));
  const sajikMissing = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('sajik/SajikSeatMapSvg.tsx#MissingOfficialSeatMap')
  ));
  const sajikSvg = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('sajik/SajikSeatMapSvg.tsx#SajikSeatMapSvg')
  ));
  assert.equal(sajikPathValidation.length, 8);
  assert.equal(sajikEditor.length, 1944);
  assert.equal(sajikMissing.length, 2);
  assert.equal(sajikSvg.length, 1154);
  assert.ok(sajikSvg
    .filter(({ variants }) => variants.filter !== 'none')
    .every(({ states, interactionPlan }) => (
      states.interactions === 'default' && interactionPlan === undefined
    )));
  assert.equal(sajikSvg.filter(({ states }) => states.data === 'broken-image').length, 2);
  assert.ok(sajikSvg
    .filter(({ states }) => states.data === 'broken-image')
    .every(({ states, variants, interactionPlan }) => (
      states.interactions === 'default'
        && variants.filter === 'none'
        && variants.fullscreen === 'absent'
        && variants.guide === 'inactive'
        && variants.selection === 'none'
        && variants.zoom === 'minimum'
        && interactionPlan === undefined
    )));
  const maximumZoomHover = sajikSvg.find(({ states, variants }) => (
    states.data === 'populated'
      && states.interactions === 'hover'
      && variants.filter === 'none'
      && variants.zoom === 'maximum'
  ));
  const minimumZoomHover = sajikSvg.find(({ states, variants }) => (
    states.data === 'populated'
      && states.interactions === 'hover'
      && variants.filter === 'none'
      && variants.zoom === 'minimum'
  ));
  const maximumZoomPressed = sajikSvg.find(({ states, variants }) => (
    states.data === 'populated'
      && states.interactions === 'pressed'
      && variants.filter === 'none'
      && variants.zoom === 'maximum'
  ));
  assert.equal(maximumZoomHover?.interactionPlan?.targetId, 'zoom-out');
  assert.equal(maximumZoomHover?.interactionPlan?.selector, '[data-testid="sajik-seatmap-zoom-out"]');
  assert.equal(minimumZoomHover?.interactionPlan?.targetId, 'seat-block-322');
  assert.equal(minimumZoomHover?.interactionPlan?.selector, '[data-testid="sajik-seat-block-sajik-canonical-322"]');
  assert.equal(maximumZoomPressed?.interactionPlan?.targetId, 'zoom-out');
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId.endsWith('StadiumSeatMapStates.tsx#StadiumSeatMapLoadingSkeleton')
    )).length,
    9,
  );
  assert.equal(
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ states }) => states.data === 'manual-required').length,
    12,
  );
  const stadiumError = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('StadiumSeatMapStates.tsx#StadiumSeatMapErrorFallback')
  ));
  assert.equal(stadiumError.length, 12);
  assert.deepEqual(
    [...new Set(stadiumError.map(({ variants }) => variants.stadiumName))].sort(),
    ['long-korean', 'missing', 'short'],
  );
  assert.equal(stadiumError.filter(({ interactionPlan }) => interactionPlan != null).length, 9);
  const predictionMatchesError = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('prediction/PredictionMatchesErrorView.tsx#PredictionMatchesErrorView')
  ));
  assert.equal(predictionMatchesError.length, 35);
  assert.equal(predictionMatchesError.filter(({ interactionPlan }) => interactionPlan == null).length, 5);
  assert.deepEqual(
    [...new Set(predictionMatchesError
      .map(({ interactionPlan }) => interactionPlan?.targetId)
      .filter((value): value is string => value !== undefined))].sort(),
    ['recovery', 'retry'],
  );
  assert.equal(
    predictionMatchesError.filter(({ interactionPlan }) => interactionPlan?.targetId === 'retry').length,
    15,
  );
  assert.equal(
    predictionMatchesError.filter(({ interactionPlan }) => interactionPlan?.targetId === 'recovery').length,
    15,
  );
  const myPageSeasonEmpty = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('mypage/MyPageSeasonEmptyState.tsx#MyPageSeasonEmptyState')
  ));
  assert.equal(myPageSeasonEmpty.length, 360);
  assert.ok(myPageSeasonEmpty.every(({ styleModuleKeys }) => (
    styleModuleKeys.length === 1
      && styleModuleKeys[0] === '../components/mypage/MyPageSeason.css'
  )));
  assert.equal(myPageSeasonEmpty.filter(({ interactionPlan }) => interactionPlan != null).length, 216);
  assert.ok(myPageSeasonEmpty
    .filter(({ variants }) => variants.action === 'missing')
    .every(({ states, interactionPlan }) => (
      states.interactions === 'default' && interactionPlan === undefined
    )));
  const interactive = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('CheerFeedStates.tsx#CheerFeedErrorState')
  ));
  assert.equal(interactive.length, 4);
  assert.equal(interactive.filter(({ interactionPlan }) => interactionPlan != null).length, 3);
  assert.deepEqual(
    interactive.map(({ states }) => states.interactions).sort(),
    ['default', 'focus-visible', 'hover', 'pressed'],
  );
  const emptyFeed = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('CheerFeedStates.tsx#CheerFeedEmptyState')
  ));
  assert.equal(emptyFeed.length, 90);
  assert.deepEqual(
    [...new Set(emptyFeed.map(({ variants }) => variants.teamId))].sort(),
    ['DB', 'HH', 'KH', 'KIA', 'KT', 'LG', 'LT', 'NC', 'SS', 'SSG'],
  );
  const offseasonError = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('offseason/OffseasonListStates.tsx#OffseasonErrorState')
  ));
  assert.equal(offseasonError.length, 44);
  assert.deepEqual(
    [...new Set(offseasonError.map(({ states }) => states.data))].sort(),
    [
      'error-400', 'error-401', 'error-403', 'error-404', 'error-409', 'error-422',
      'error-429', 'error-500', 'error-503', 'long-korean', 'unbroken-token',
    ],
  );
  const offseasonEmpty = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('offseason/OffseasonListStates.tsx#OffseasonEmptyState')
  ));
  assert.equal(offseasonEmpty.length, 10);
  assert.ok(offseasonEmpty
    .filter(({ variants }) => variants.hasActiveFilters === 'false')
    .every(({ states, interactionPlan }) => (
      states.interactions === 'default' && interactionPlan === undefined
    )));
  const offseasonPublicDirect = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.startsWith('src/components/OffSeason')
      || componentId.startsWith('src/components/offseason/')
  ));
  assert.equal(new Set(offseasonPublicDirect.map(({ componentId }) => componentId)).size, 17);
  assert.ok(offseasonPublicDirect.some(({ componentId, variants }) => (
    componentId === 'src/components/OffSeasonHome.tsx#OffSeasonHome'
      && variants.openingState === 'started'
      && variants.layout === 'mobile'
  )));
  assert.ok(offseasonPublicDirect.some(({ componentId, states, interactionPlan }) => (
    componentId === 'src/components/OffSeasonList.tsx#OffSeasonList'
      && states.interactions === 'input'
      && interactionPlan?.targetId === 'search'
  )));
  assert.ok(offseasonPublicDirect.some(({ componentId, states, interactionPlan }) => (
    componentId === 'src/components/offseason/OffseasonMobileCards.tsx#OffseasonMobileCards'
      && states.interactions === 'open'
      && interactionPlan?.targetId === 'movement-first'
  )));
  const offseasonListScenarios = offseasonPublicDirect.filter(({ componentId }) => (
    componentId === 'src/components/OffSeasonList.tsx#OffSeasonList'
  ));
  assert.deepEqual(
    new Set(offseasonListScenarios
      .filter(({ states }) => states.interactions === 'hover')
      .map(({ interactionPlan }) => interactionPlan?.selector)
      .filter((selector): selector is string => selector?.includes('offseason-section-') ?? false)),
    new Set([
      '[data-testid="offseason-section-ALL"]',
      '[data-testid="offseason-section-FA"]',
      '[data-testid="offseason-section-TRADE"]',
      '[data-testid="offseason-section-FOREIGN"]',
      '[data-testid="offseason-section-RELEASE"]',
      '[data-testid="offseason-section-MILITARY"]',
    ]),
  );
  assert.ok(offseasonListScenarios
    .filter(({ states }) => states.interactions === 'pressed')
    .every(({ interactionPlan }) => !['search', 'team-filter'].includes(interactionPlan?.targetId ?? '')));
  assert.ok(offseasonPublicDirect
    .filter(({ componentId, states }) => (
      states.interactions === 'pressed'
        && (componentId === 'src/components/offseason/OffseasonDesktopTable.tsx#OffseasonDesktopTable'
          || componentId === 'src/components/offseason/OffseasonListContentRuntime.tsx#OffseasonListContentRuntime')
    ))
    .every(({ interactionPlan }) => interactionPlan?.selector !== '[data-testid="offseason-table-row-1"]'));
  assert.deepEqual(
    [...new Set(emptyFeed.map(({ variants }) => variants.feedTab))].sort(),
    ['all', 'following', 'popular'],
  );
  assert.ok(emptyFeed
    .filter(({ variants }) => variants.feedTab === 'following')
    .every(({ states, interactionPlan }) => (
      states.interactions === 'default' && interactionPlan === undefined
    )));
  const loginRequired = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('CheerFeedStates.tsx#CheerFeedLoginRequiredState')
  ));
  assert.equal(loginRequired.length, 40);
  assert.ok(loginRequired.every(({ states }) => states.permissions === 'anonymous'));
  assert.deepEqual(
    [...new Set(loginRequired.map(({ variants }) => variants.teamId))].sort(),
    ['DB', 'HH', 'KH', 'KIA', 'KT', 'LG', 'LT', 'NC', 'SS', 'SSG'],
  );
  const alerts = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('ui/alert.tsx#Alert')
  ));
  assert.equal(alerts.length, 36);
  assert.deepEqual(
    [...new Set(alerts.map(({ variants }) => variants.content))].sort(),
    ['both', 'description-only', 'title-only'],
  );
  assert.equal(AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('ui/alert.tsx#AlertDescription')
  )).length, 6);
  assert.equal(AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('ui/alert.tsx#AlertTitle')
  )).length, 3);
  const skeletons = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('ui/skeleton.tsx#Skeleton')
  ));
  assert.equal(skeletons.length, 86);
  assert.equal(new Set(skeletons.map(({ variants }) => variants.usage)).size, 86);
  const loadingSpinners = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('LoadingSpinner.tsx#LoadingSpinner')
  ));
  assert.equal(loadingSpinners.length, 312);
  assert.deepEqual(
    [...new Set(loadingSpinners.map(({ variants }) => variants.size))].sort(),
    ['lg', 'md', 'sm'],
  );
  assert.deepEqual(
    [...new Set(loadingSpinners.map(({ variants }) => variants.variant))].sort(),
    ['app', 'auth', 'inline'],
  );
  assert.ok(loadingSpinners
    .filter(({ variants }) => variants.fullScreen === 'false')
    .every(({ variants }) => variants.variant === 'inline'));
  assert.ok(loadingSpinners
    .filter(({ variants }) => variants.showTagline === 'false')
    .every(({ states, variants }) => (
      variants.variant !== 'inline'
        && states.data !== 'empty'
        && states.data !== 'null-optional'
    )));
  assert.equal(
    loadingSpinners.filter(({ variants }) => variants.delay === 'delayed').length,
    156,
  );
  const loginRequiredDialogs = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('LoginRequiredDialog.tsx#LoginRequiredDialog')
  ));
  assert.equal(loginRequiredDialogs.length, 7);
  assert.ok(loginRequiredDialogs.every(({ states }) => states.permissions === 'anonymous'));
  assert.deepEqual(
    loginRequiredDialogs
      .map(({ interactionPlan }) => interactionPlan?.targetId)
      .filter((value): value is string => value !== undefined)
      .sort(),
    ['cancel', 'cancel', 'cancel', 'login', 'login', 'login'],
  );
  const verificationRequiredDialogs = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('VerificationRequiredDialog.tsx#VerificationRequiredDialog')
  ));
  assert.equal(verificationRequiredDialogs.length, 63);
  assert.ok(verificationRequiredDialogs.every(({ states, variants }) => (
    variants.mode === 'security'
      ? states.permissions === 'user'
      : states.permissions === 'user-unverified'
  )));
  assert.equal(
    verificationRequiredDialogs.filter(({ interactionPlan }) => interactionPlan != null).length,
    54,
  );
  assert.deepEqual(
    [...new Set(verificationRequiredDialogs.map(({ variants }) => variants.mode))].sort(),
    ['normal', 'security'],
  );
  assert.deepEqual(
    [...new Set(verificationRequiredDialogs.map(({ variants }) => variants.copyPreset))].sort(),
    ['advanced-security', 'none', 'password-change', 'unlink'],
  );
  assert.deepEqual(
    verificationRequiredDialogs
      .map(({ interactionPlan }) => interactionPlan?.targetId)
      .filter((value): value is string => value !== undefined)
      .reduce<Record<string, number>>((counts, targetId) => ({
        ...counts,
        [targetId]: (counts[targetId] ?? 0) + 1,
      }), {}),
    { confirm: 27, dismiss: 27 },
  );
  const viewportDeferred = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('ViewportDeferred.tsx#ViewportDeferred')
  ));
  assert.equal(viewportDeferred.length, 6);
  assert.deepEqual(
    [...new Set(viewportDeferred.map(({ states }) => states.data))].sort(),
    ['long-korean', 'single', 'unbroken-token'],
  );
  assert.deepEqual(
    [...new Set(viewportDeferred.map(({ variants }) => variants.phase))].sort(),
    ['content', 'fallback'],
  );
  const welcomeGuide = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('WelcomeGuide.tsx#WelcomeGuide')
  ));
  assert.equal(welcomeGuide.length, 20);
  assert.deepEqual(
    [...new Set(welcomeGuide.map(({ states }) => states.data))].sort(),
    ['broken-image', 'populated'],
  );
  assert.equal(welcomeGuide.filter(({ interactionPlan }) => interactionPlan != null).length, 18);
  assert.deepEqual(
    welcomeGuide
      .map(({ interactionPlan }) => interactionPlan?.targetId)
      .filter((value): value is string => value !== undefined)
      .reduce<Record<string, number>>((counts, targetId) => ({
        ...counts,
        [targetId]: (counts[targetId] ?? 0) + 1,
      }), {}),
    { close: 6, dismiss: 6, start: 6 },
  );
  const leaderboardPage = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('pages/LeaderboardPage.tsx#LeaderboardPage')
  ));
  assert.equal(leaderboardPage.length, 2);
  assert.deepEqual(
    leaderboardPage.map(({ variants }) => variants.phase).sort(),
    ['fallback', 'resolved'],
  );
  const leaderboardPageRuntime = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('pages/LeaderboardPageRuntime.tsx#LeaderboardPageRuntime')
  ));
  assert.equal(leaderboardPageRuntime.length, 28);
  assert.deepEqual(
    [...new Set(leaderboardPageRuntime.map(({ states }) => states.data))].sort(),
    [
      'broken-image',
      'empty',
      'loading',
      'long-korean',
      'maximum-supported',
      'populated',
      'unbroken-token',
    ],
  );
  assert.deepEqual(
    [...new Set(leaderboardPageRuntime.map(({ variants }) => variants.authPhase))].sort(),
    ['auth-loading', 'authenticated-fallback', 'authenticated-resolved', 'public'],
  );
  assert.ok(leaderboardPageRuntime.every(({ states, variants }) => (
    variants.authPhase === 'public'
      ? states.permissions === 'anonymous'
      : states.permissions === 'user'
  )));
  const leaderboardRulesOverlay = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('retro/RetroLeaderboardRulesOverlay.tsx#RetroLeaderboardRulesOverlay')
  ));
  assert.equal(leaderboardRulesOverlay.length, 4);
  assert.equal(
    leaderboardRulesOverlay.filter(({ interactionPlan }) => interactionPlan != null).length,
    3,
  );
  assert.ok(leaderboardRulesOverlay.every(({ interactionPlan }) => (
    interactionPlan == null
      || interactionPlan.selector === '[data-testid="retro-leaderboard-rules-close"]'
  )));
  const leaderboardDecorations = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('retro/RetroLeaderboardDecorations.tsx#RetroLeaderboardDecorations')
  ));
  assert.equal(leaderboardDecorations.length, 1);
  const levelBadge = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('retro/LevelBadge.tsx#LevelBadge')
  ));
  assert.equal(levelBadge.length, 24);
  assert.deepEqual(
    [...new Set(levelBadge.map(({ states }) => states.data))].sort(),
    ['boundary-maximum', 'boundary-minimum'],
  );
  assert.deepEqual(
    [...new Set(levelBadge.map(({ variants }) => variants.tier))].sort(),
    ['hall', 'major', 'minor', 'rookie'],
  );
  assert.equal(levelBadge.filter(({ variants }) => variants.compact === 'true').length, 8);
  const leaderboardRows = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('retro/LeaderboardRow.tsx#LeaderboardRow')
  ));
  assert.equal(leaderboardRows.length, 288);
  assert.deepEqual(
    [...new Set(leaderboardRows.map(({ states }) => states.data))].sort(),
    ['broken-image', 'long-korean', 'maximum-supported', 'missing-image', 'single', 'unbroken-token'],
  );
  assert.deepEqual(
    [...new Set(leaderboardRows.map(({ variants }) => variants.rankTier))].sort(),
    ['first', 'other', 'second', 'third'],
  );
  assert.equal(leaderboardRows.filter(({ interactionPlan }) => interactionPlan != null).length, 144);
  const comboAnimations = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('retro/ComboAnimation.tsx#ComboAnimation')
  ));
  assert.equal(comboAnimations.length, 30);
  assert.deepEqual(
    [...new Set(comboAnimations.map(({ states }) => states.data))].sort(),
    ['boundary-minimum', 'maximum-supported'],
  );
  assert.deepEqual(
    [...new Set(comboAnimations.map(({ variants }) => variants.streakTier))].sort(),
    ['amazing', 'combo', 'fire', 'legendary', 'nice'],
  );
  const rankBadges = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('retro/RetroTheme.tsx#RankBadge')
  ));
  assert.equal(rankBadges.length, 16);
  assert.deepEqual(
    [...new Set(rankBadges.map(({ states }) => states.data))].sort(),
    ['long-korean', 'maximum-supported', 'single', 'unbroken-token'],
  );
  assert.deepEqual(
    [...new Set(rankBadges.map(({ variants }) => variants.rankTier))].sort(),
    ['first', 'other', 'second', 'third'],
  );
  const pixelNumbers = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('retro/RetroTheme.tsx#PixelNumber')
  ));
  assert.equal(pixelNumbers.length, 12);
  assert.deepEqual(
    [...new Set(pixelNumbers.map(({ variants }) => variants.color))].sort(),
    ['custom', 'default'],
  );
  const scoreDisplays = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('retro/RetroTheme.tsx#ScoreDisplay')
  ));
  assert.equal(scoreDisplays.length, 12);
  assert.deepEqual(
    [...new Set(scoreDisplays.map(({ variants }) => variants.animate))].sort(),
    ['false', 'true'],
  );
  const streakCounters = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('retro/RetroTheme.tsx#StreakCounter')
  ));
  assert.equal(streakCounters.length, 24);
  assert.deepEqual(
    [...new Set(streakCounters.map(({ states }) => states.data))].sort(),
    ['boundary-minimum', 'maximum-supported'],
  );
  assert.deepEqual(
    [...new Set(streakCounters.map(({ variants }) => variants.streakTier))].sort(),
    ['combo', 'fire', 'hot', 'low'],
  );
  const flickerTexts = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('retro/RetroTheme.tsx#FlickerText')
  ));
  assert.equal(flickerTexts.length, 6);
  assert.deepEqual(
    [...new Set(flickerTexts.map(({ variants }) => variants.active))].sort(),
    ['false', 'true'],
  );
  const glitchWrappers = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('retro/RetroTheme.tsx#GlitchWrapper')
  ));
  assert.equal(glitchWrappers.length, 6);
  const dotMatrixTexts = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('retro/RetroTheme.tsx#DotMatrixText')
  ));
  assert.equal(dotMatrixTexts.length, 3);
  assert.deepEqual(
    [...new Set(dotMatrixTexts.map(({ states }) => states.data))].sort(),
    ['long-korean', 'single', 'unbroken-token'],
  );
  const newsTickers = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('retro/NewsTicker.tsx#NewsTicker')
  ));
  assert.equal(newsTickers.length, 109);
  assert.equal(newsTickers.filter(({ interactionPlan }) => interactionPlan != null).length, 54);
  assert.deepEqual(
    [...new Set(newsTickers.map(({ variants }) => variants.type))].sort(),
    ['fire', 'levelup', 'normal', 'perfect', 'streak', 'upset'],
  );
  assert.ok(newsTickers
    .filter(({ states }) => states.data === 'empty')
    .every(({ states, variants, interactionPlan }) => (
      states.interactions === 'default'
        && variants.speed === 'default'
        && variants.type === 'normal'
        && interactionPlan === undefined
    )));
  const footerPanels = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('retro/RetroLeaderboardFooterPanels.tsx#RetroLeaderboardFooterPanels')
  ));
  assert.equal(footerPanels.length, 40);
  assert.deepEqual(
    [...new Set(footerPanels.map(({ variants }) => variants.inventory))].sort(),
    ['active', 'available', 'empty', 'maximum-supported'],
  );
  const powerUpInventories = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('retro/PowerUpInventory.tsx#PowerUpInventory')
  ));
  assert.equal(powerUpInventories.length, 2376);
  assert.equal(
    powerUpInventories.filter(({ states }) => states.interactions === 'default').length,
    864,
  );
  for (const interaction of ['hover', 'focus-visible', 'pressed', 'open']) {
    assert.equal(
      powerUpInventories.filter(({ states }) => states.interactions === interaction).length,
      216,
    );
  }
  assert.equal(
    powerUpInventories.filter(({ states }) => states.interactions === 'selected').length,
    648,
  );
  assert.equal(
    new Set(powerUpInventories.map(({ variants }) => (
      `${variants.magicBatCount}-${variants.goldenGloveCount}-${variants.scouterCount}`
    ))).size,
    27,
  );
  assert.equal(new Set(powerUpInventories.map(({ variants }) => variants.activeSet)).size, 8);
  assert.equal(
    new Set(powerUpInventories
      .map(({ interactionPlan }) => interactionPlan?.targetId)
      .filter((value): value is string => value !== undefined)).size,
    21,
  );
  assert.ok(powerUpInventories
    .filter(({ states }) => states.interactions === 'selected')
    .every(({ interactionPlan }) => interactionPlan?.setup?.length === 1));
  const userStatsPanels = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('retro/UserStatsPanel.tsx#UserStatsPanel')
  ));
  assert.equal(userStatsPanels.length, 3600);
  assert.equal(new Set(userStatsPanels.map(({ variants }) => variants.identity)).size, 5);
  assert.equal(new Set(userStatsPanels.map(({ variants }) => variants.metrics)).size, 4);
  assert.equal(new Set(userStatsPanels.map(({ variants }) => variants.rank)).size, 6);
  assert.equal(new Set(userStatsPanels.map(({ variants }) => variants.streak)).size, 6);
  assert.equal(new Set(userStatsPanels.map(({ variants }) => variants.xp)).size, 5);
  assert.ok(userStatsPanels.every(({ states, interactionPlan }) => (
    states.data === 'populated'
      && states.interactions === 'default'
      && interactionPlan === undefined
  )));
  const reviewDialogs = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('ReviewDialog.tsx#ReviewDialog')
  ));
  assert.equal(reviewDialogs.length, 111);
  assert.equal(new Set(reviewDialogs.map(({ variants }) => variants.reviewee)).size, 3);
  assert.equal(new Set(reviewDialogs.map(({ variants }) => variants.comment)).size, 4);
  assert.equal(reviewDialogs.filter(({ states }) => states.interactions === 'default').length, 3);
  assert.equal(reviewDialogs.filter(({ states }) => states.interactions === 'input').length, 9);
  assert.equal(reviewDialogs.filter(({ states }) => states.interactions === 'submitting').length, 12);
  assert.equal(
    reviewDialogs.filter(({ states }) => states.interactions === 'keyboard-navigation').length,
    6,
  );
  assert.ok(reviewDialogs
    .filter(({ states }) => states.interactions === 'input')
    .every(({ interactionPlan }) => (
      interactionPlan?.action === 'fill' && typeof interactionPlan.value === 'string'
    )));
  const rollingNumbers = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('RollingNumber.tsx#RollingNumber')
  ));
  assert.equal(rollingNumbers.length, 17);
  assert.deepEqual(
    [...new Set(rollingNumbers.map(({ states }) => states.data))].sort(),
    ['boundary-maximum', 'boundary-minimum', 'maximum-supported', 'negative', 'single', 'zero'],
  );
  assert.deepEqual(
    rollingNumbers.reduce<Record<string, number>>((counts, { variants }) => ({
      ...counts,
      [variants.phase]: (counts[variants.phase] ?? 0) + 1,
    }), {}),
    { stable: 6, increase: 6, decrease: 5 },
  );
  assert.ok(rollingNumbers.every(({ interactionPlan }) => interactionPlan === undefined));
  const rootEntryRoutes = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('RootEntryRoute.tsx#RootEntryRoute')
  ));
  assert.equal(rootEntryRoutes.length, 4);
  assert.deepEqual(
    [...new Set(rootEntryRoutes.map(({ variants }) => variants.routeMode))].sort(),
    ['cold-start', 'persisted-auth'],
  );
  assert.deepEqual(
    [...new Set(rootEntryRoutes.map(({ variants }) => variants.phase))].sort(),
    ['fallback', 'resolved'],
  );
  const rootEntryAuthAware = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('RootEntryRouteAuthAware.tsx#RootEntryRouteAuthAware')
  ));
  assert.equal(rootEntryAuthAware.length, 5);
  assert.deepEqual(
    [...new Set(rootEntryAuthAware.map(({ variants }) => variants.authState))].sort(),
    ['auth-loading', 'bootstrap-pending', 'ready'],
  );
  assert.equal(rootEntryAuthAware.filter(({ states }) => states.permissions === 'user').length, 1);
  const sajikGuide = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('sajik/SajikSeatMap.tsx#SajikFirstVisitGuide')
  ));
  assert.equal(sajikGuide.length, 1464);
  assert.deepEqual(
    [...new Set(sajikGuide.map(({ states }) => states.data))].sort(),
    ['empty', 'long-korean', 'maximum-supported', 'populated', 'unbroken-token'],
  );
  assert.equal(sajikGuide.filter(({ states }) => states.interactions === 'input').length, 0);
  assert.deepEqual(
    [...new Set(sajikGuide.map(({ variants }) => variants.intent))].sort(),
    ['accessible', 'all', 'away_third', 'center_table', 'home_cheer', 'outfield'],
  );
  const sajikMap = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('sajik/SajikSeatMap.tsx#SajikSeatMap')
  ));
  assert.equal(sajikMap.length, 121);
  assert.deepEqual(
    [...new Set(sajikMap.map(({ states }) => states.permissions))].sort(),
    ['anonymous', 'user'],
  );
  assert.equal(sajikMap.filter(({ states }) => states.interactions === 'selected').length, 40);
  assert.equal(
    new Set(sajikMap
      .filter(({ states }) => states.interactions === 'selected')
      .map(({ interactionPlan }) => interactionPlan?.targetId)).size,
    20,
  );
  assert.equal(sajikMap.filter(({ states }) => states.interactions === 'open').length, 3);
  assert.equal(
    sajikMap.find(({ interactionPlan }) => interactionPlan?.targetId === 'upload-modal')?.states.permissions,
    'user',
  );
  assert.ok(reviewDialogs
    .filter(({ states }) => states.interactions === 'keyboard-navigation')
    .every(({ interactionPlan }) => (
      interactionPlan?.action === 'press-key' && typeof interactionPlan.key === 'string'
    )));
  const retroButtons = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('retro/RetroTheme.tsx#RetroButton')
  ));
  assert.equal(retroButtons.length, 45);
  assert.deepEqual(
    [...new Set(retroButtons.map(({ variants }) => variants.tone))].sort(),
    ['danger', 'primary', 'secondary'],
  );
  assert.equal(retroButtons.filter(({ interactionPlan }) => interactionPlan != null).length, 27);
  assert.ok(retroButtons
    .filter(({ variants }) => variants.disabled === 'true')
    .every(({ states, interactionPlan }) => (
      states.interactions === 'default' && interactionPlan === undefined
    )));
  const retroCards = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('retro/RetroTheme.tsx#RetroCard')
  ));
  assert.equal(retroCards.length, 9);
  assert.deepEqual(
    [...new Set(retroCards.map(({ variants }) => variants.glow))].sort(),
    ['custom', 'default', 'off'],
  );
  for (const [componentName, expected] of [
    ['AnimatedCrown', 3],
    ['PixelCrown', 3],
    ['PixelEmptyState', 3],
    ['RetroContainer', 3],
    ['RetroDivider', 1],
  ] as const) {
    assert.equal(AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
      componentId.endsWith(`retro/RetroTheme.tsx#${componentName}`)
    )).length, expected);
  }
  const pixelProgressBar = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId.endsWith('retro/PixelProgressBar.tsx#PixelProgressBar')
  ));
  assert.equal(pixelProgressBar.length, 144);
  assert.deepEqual(
    [...new Set(pixelProgressBar.map(({ states }) => states.data))].sort(),
    ['complete', 'negative', 'overflow', 'partial', 'zero', 'zero-maximum'],
  );
  const first = AUTOMATIC_COMPONENT_STATE_SCENARIOS[0];
  assert.deepEqual(resolveHarnessScenario(first.id), first);
});

test('mate list control leaves resolve lower-camel wrappers with exact direct matrices', () => {
  const harnessModuleKey = componentModuleKey(
    'src/components/visual-qa/MateListControlLeavesHarnesses.tsx',
  );
  const expected = new Map([
    ['src/components/MateStatusTabs.tsx#MateStatusTabs', { count: 21, exportName: 'mateStatusTabsVisualQaHarness' }],
    ['src/components/MateSortDropdown.tsx#MateSortDropdown', { count: 30, exportName: 'mateSortDropdownVisualQaHarness' }],
    ['src/components/MateSeatFilterButtons.tsx#MateSeatFilterButtons', { count: 28, exportName: 'mateSeatFilterButtonsVisualQaHarness' }],
  ]);
  for (const [componentId, contract] of expected) {
    const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((scenario) => (
      scenario.componentId === componentId
    ));
    assert.equal(scenarios.length, contract.count, componentId);
    assert.ok(scenarios.every((scenario) => scenario.exportName === contract.exportName));
    assert.ok(scenarios.every((scenario) => scenario.moduleKey === harnessModuleKey));
    assert.ok(scenarios.every((scenario) => scenario.file === componentId.slice(0, componentId.indexOf('#'))));
  }

  const status = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/MateStatusTabs.tsx#MateStatusTabs'
  ));
  assert.deepEqual(Object.fromEntries(['default', 'hover', 'focus-visible', 'pressed', 'selected', 'keyboard-navigation'].map((interaction) => [
    interaction,
    status.filter(({ states }) => states.interactions === interaction).length,
  ])), { default: 8, hover: 3, 'focus-visible': 1, pressed: 4, selected: 4, 'keyboard-navigation': 1 });

  const sort = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/MateSortDropdown.tsx#MateSortDropdown'
  ));
  assert.deepEqual(Object.fromEntries(['default', 'hover', 'focus-visible', 'pressed', 'open', 'selected', 'keyboard-navigation'].map((interaction) => [
    interaction,
    sort.filter(({ states }) => states.interactions === interaction).length,
  ])), { default: 12, hover: 4, 'focus-visible': 4, pressed: 4, open: 1, selected: 3, 'keyboard-navigation': 2 });

  const seat = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/MateSeatFilterButtons.tsx#MateSeatFilterButtons'
  ));
  assert.deepEqual(Object.fromEntries(['default', 'hover', 'focus-visible', 'pressed', 'selected', 'keyboard-navigation'].map((interaction) => [
    interaction,
    seat.filter(({ states }) => states.interactions === interaction).length,
  ])), { default: 11, hover: 4, 'focus-visible': 4, pressed: 4, selected: 4, 'keyboard-navigation': 1 });
});

test('mate mobile date filter resolves exact 55 direct states and four hosted root aliases', async () => {
  const componentId = 'src/components/MateMobileDateFilter.tsx#MateMobileDateFilter';
  const hostedId = 'src/components/MateListControlsRuntime.tsx#MateMobileDateFilter';
  const moduleFile = 'src/components/visual-qa/MateMobileDateFilterHarness.tsx';
  const moduleKey = componentModuleKey(moduleFile);
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((scenario) => (
    scenario.componentId === componentId
  ));
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as { components: Array<{
    id: string;
    render?: {
      adapterId?: string;
      exportName?: string;
      hostScenarioIds?: string[];
      mode?: string;
      moduleFile?: string;
    };
    status: string;
  }> };
  const entry = manifest.components.find(({ id }) => id === componentId);
  const hosted = manifest.components.find(({ id }) => id === hostedId);
  const expectedHostScenarioIds = [
    'state:src/components/Mate.tsx#Mate:data=single|variant.phase=results-fallback|variant.theme=light',
    'state:src/components/Mate.tsx#Mate:data=single|variant.phase=results-fallback|variant.theme=dark',
    'state:src/components/Mate.tsx#Mate:data=single|variant.phase=runtime|variant.theme=light',
    'state:src/components/Mate.tsx#Mate:data=single|variant.phase=runtime|variant.theme=dark',
  ];

  assert.equal(entry?.status, 'registered');
  assert.equal(entry?.render?.mode, 'direct');
  assert.equal(entry?.render?.adapterId, 'mate.mobile-date-filter');
  assert.equal(entry?.render?.exportName, 'mateMobileDateFilterVisualQaHarness');
  assert.equal(entry?.render?.moduleFile, moduleFile);
  assert.equal(scenarios.length, 55);
  assert.ok(scenarios.every((scenario) => scenario.moduleKey === moduleKey));
  assert.ok(scenarios.every((scenario) => scenario.file === 'src/components/MateMobileDateFilter.tsx'));
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['empty', 'single', 'long-korean', 'boundary-minimum', 'maximum-supported']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.selection)),
    new Set(['all', 'first', 'middle', 'last', 'outside-range']),
  );
  assert.deepEqual(Object.fromEntries(
    ['default', 'hover', 'focus-visible', 'pressed', 'selected', 'keyboard-navigation'].map((interaction) => [
      interaction,
      scenarios.filter(({ states }) => states.interactions === interaction).length,
    ]),
  ), {
    default: 36,
    hover: 4,
    'focus-visible': 4,
    pressed: 4,
    selected: 5,
    'keyboard-navigation': 2,
  });
  assert.equal(new Set(scenarios.map(({ id }) => id)).size, 55);

  assert.equal(hosted?.status, 'registered');
  assert.equal(hosted?.render?.mode, 'hosted');
  assert.deepEqual(hosted?.render?.hostScenarioIds, expectedHostScenarioIds);
  assert.ok(expectedHostScenarioIds.every((id) => (
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.some((scenario) => scenario.id === id)
  )));
});

test('QA-only direct module overrides fail closed for unknown modules and mismatched exports', () => {
  const componentFilePath = 'src/components/MateStatusTabs.tsx';
  const moduleFile = 'src/components/visual-qa/MateListControlLeavesHarnesses.tsx';
  assert.equal(
    resolveDirectModuleFile(componentFilePath, undefined, 'MateStatusTabs'),
    componentFilePath,
  );
  assert.equal(
    resolveDirectModuleFile(componentFilePath, moduleFile, 'mateStatusTabsVisualQaHarness'),
    moduleFile,
  );
  assert.throws(
    () => resolveDirectModuleFile(componentFilePath, 'src/components/visual-qa/UnknownHarnesses.tsx', 'mateStatusTabsVisualQaHarness'),
    /unknown or mismatched direct module export/,
  );
  assert.throws(
    () => resolveDirectModuleFile(componentFilePath, moduleFile, 'mateSortDropdownVisualQaHarness'),
    /unknown or mismatched direct module export/,
  );
  assert.equal(
    resolveDirectModuleFile(
      'src/components/MateMobileDateFilter.tsx',
      'src/components/visual-qa/MateMobileDateFilterHarness.tsx',
      'mateMobileDateFilterVisualQaHarness',
    ),
    'src/components/visual-qa/MateMobileDateFilterHarness.tsx',
  );
  assert.throws(
    () => resolveDirectModuleFile(
      'src/components/MateMobileDateFilter.tsx',
      moduleFile,
      'mateMobileDateFilterVisualQaHarness',
    ),
    /unknown or mismatched direct module export/,
  );
});

test('module federation fallback controls resolve exact 48 and 21 direct matrices', () => {
  const moduleFile = 'src/components/visual-qa/ModuleFederationFallbackControlsHarnesses.tsx';
  const moduleKey = componentModuleKey(moduleFile);
  const expected = new Map([
    ['src/components/moduleFederation/fallback/Button.tsx#FallbackDesignSystemButton', {
      count: 48,
      exportName: 'mfFallbackButtonVisualQaHarness',
      interactions: {
        default: 34,
        hover: 8,
        'focus-visible': 2,
        pressed: 1,
        selected: 1,
        'keyboard-navigation': 2,
      },
    }],
    ['src/components/moduleFederation/fallback/Modal.tsx#FallbackDesignSystemModal', {
      count: 21,
      exportName: 'mfFallbackModalVisualQaHarness',
      interactions: {
        default: 10,
        hover: 1,
        'focus-visible': 1,
        pressed: 1,
        selected: 5,
        'keyboard-navigation': 3,
      },
    }],
  ]);

  for (const [componentId, contract] of expected) {
    const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((scenario) => (
      scenario.componentId === componentId
    ));
    assert.equal(scenarios.length, contract.count, componentId);
    assert.equal(new Set(scenarios.map(({ id }) => id)).size, contract.count);
    assert.equal(new Set(scenarios.map(({ stateCombinationId }) => stateCombinationId)).size, contract.count);
    assert.ok(scenarios.every((scenario) => scenario.exportName === contract.exportName));
    assert.ok(scenarios.every((scenario) => scenario.moduleKey === moduleKey));
    assert.ok(scenarios.every((scenario) => scenario.file === componentId.slice(0, componentId.indexOf('#'))));
    assert.deepEqual(Object.fromEntries(Object.keys(contract.interactions).map((interaction) => [
      interaction,
      scenarios.filter(({ states }) => states.interactions === interaction).length,
    ])), contract.interactions);
  }

  const modalScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === 'src/components/moduleFederation/fallback/Modal.tsx#FallbackDesignSystemModal'
  ));
  assert.equal(
    modalScenarios.filter(({ interactionPlan }) => interactionPlan?.targetId === 'close-both').length,
    1,
  );
  assert.equal(
    modalScenarios.filter(({ interactionPlan }) => interactionPlan?.targetId === 'backdrop-both').length,
    1,
  );

  assert.equal(
    resolveDirectModuleFile(
      'src/components/moduleFederation/fallback/Button.tsx',
      moduleFile,
      'mfFallbackButtonVisualQaHarness',
    ),
    moduleFile,
  );
  assert.equal(
    resolveDirectModuleFile(
      'src/components/moduleFederation/fallback/Modal.tsx',
      moduleFile,
      'mfFallbackModalVisualQaHarness',
    ),
    moduleFile,
  );
  assert.throws(
    () => resolveDirectModuleFile(
      'src/components/moduleFederation/fallback/Button.tsx',
      moduleFile,
      'mfFallbackModalVisualQaHarness',
    ),
    /unknown or mismatched direct module export/,
  );
  assert.throws(
    () => resolveDirectModuleFile(
      'src/components/moduleFederation/fallback/Modal.tsx',
      'src/components/visual-qa/UnknownHarness.tsx',
      'mfFallbackModalVisualQaHarness',
    ),
    /unknown or mismatched direct module export/,
  );
});

test('admin primitive badges cover pressure, every preset status tone, public sizes, and themes', () => {
  const badgeId = 'src/components/admin/AdminPanelPrimitives.tsx#AdminBadge';
  const badgeScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => componentId === badgeId);
  assert.equal(badgeScenarios.length, 36);
  assert.deepEqual(
    new Set(badgeScenarios.map(({ states }) => states.data)),
    new Set(['empty', 'single', 'long-korean', 'unbroken-token']),
  );
  assert.deepEqual(
    new Set(badgeScenarios.map(({ variants }) => variants.tone)),
    new Set([
      'default',
      'decision-go',
      'decision-no-go',
      'decision-pending',
      'confidence-low',
      'confidence-medium',
      'confidence-high',
      'eval-pass',
      'eval-fail',
    ]),
  );

  const statusId = 'src/components/admin/AdminPanelPrimitives.tsx#AdminStatusBadge';
  const statusScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => componentId === statusId);
  assert.equal(statusScenarios.length, 96);
  assert.equal(new Set(statusScenarios.map(({ states }) => states.data)).size, 16);
  assert.deepEqual(new Set(statusScenarios.map(({ variants }) => variants.size)), new Set(['xs', 'sm', 'md']));
  assert.deepEqual(new Set(statusScenarios.map(({ variants }) => variants.theme)), new Set(['light', 'dark']));
  assert.ok([...badgeScenarios, ...statusScenarios].every(({ states }) => states.interactions === undefined));
});

test('admin animated number and stat card cover deterministic frames, numeric and label pressure, colors, and hover', () => {
  const animatedId = 'src/components/admin/AnimatedNumber.tsx#AnimatedNumber';
  const animatedScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => componentId === animatedId);
  assert.equal(animatedScenarios.length, 18);
  assert.deepEqual(
    new Set(animatedScenarios.map(({ states }) => states.data)),
    new Set(['zero', 'single', 'negative', 'decimal', 'maximum-supported', 'non-finite']),
  );
  assert.deepEqual(
    new Set(animatedScenarios.map(({ variants }) => variants.frame)),
    new Set(['initial', 'midpoint', 'settled']),
  );

  const statId = 'src/components/admin/StatCard.tsx#StatCard';
  const statScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => componentId === statId);
  assert.equal(statScenarios.length, 73);
  assert.deepEqual(
    new Set(statScenarios.map(({ states }) => states.data)),
    new Set(['zero', 'single', 'negative', 'maximum-supported', 'long-korean', 'unbroken-token']),
  );
  assert.deepEqual(new Set(statScenarios.map(({ variants }) => variants.color)), new Set(['amber', 'emerald', 'sky']));
  assert.deepEqual(
    new Set(statScenarios.map(({ variants }) => variants.frame)),
    new Set(['static', 'animated-initial', 'animated-midpoint', 'animated-settled']),
  );
  assert.equal(statScenarios.filter(({ states }) => states.interactions === 'default').length, 72);
  assert.equal(statScenarios.filter(({ states }) => states.interactions === 'hover').length, 1);
});

test('admin coach auto brief ops covers every health, lifecycle, window, copy, and canonical control state', () => {
  const componentId = 'src/components/admin/AdminCoachAutoBriefOpsPanel.tsx#AdminCoachAutoBriefOpsPanel';
  const runtimeComponentId = 'src/components/admin/AdminCoachAutoBriefOpsPanelRuntime.tsx#AdminCoachAutoBriefOpsPanelRuntime';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => id === componentId);
  const runtimeScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => id === runtimeComponentId);
  assert.equal(scenarios.length, 188);
  assert.equal(runtimeScenarios.length, 188);
  assert.deepEqual(
    runtimeScenarios.map(({ states, variants, interactionPlan }) => ({ states, variants, interactionPlan })),
    scenarios.map(({ states, variants, interactionPlan }) => ({ states, variants, interactionPlan })),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['empty', 'pass', 'warn', 'fail', 'long-korean', 'unbroken-token', 'maximum-supported']),
  );
  assert.deepEqual(new Set(scenarios.map(({ states }) => states.system)), new Set(['idle', 'loading', 'error-503']));
  assert.deepEqual(new Set(scenarios.map(({ variants }) => variants.window)), new Set(['today', 'tomorrow', 'custom']));
  assert.deepEqual(new Set(scenarios.map(({ variants }) => variants.copy)), new Set(['idle', 'done', 'error']));
  assert.equal(scenarios.filter(({ states }) => states.interactions === 'default').length, 171);
  for (const interaction of ['hover', 'focus-visible']) {
    const interactionScenarios = scenarios.filter(({ states }) => states.interactions === interaction);
    assert.equal(interactionScenarios.length, 6);
    assert.deepEqual(
      new Set(interactionScenarios.map(({ interactionPlan }) => interactionPlan?.targetId)),
      new Set(['refresh', 'window', 'copy-command', 'start-date', 'end-date', 'apply-custom']),
    );
  }
  const pressedScenarios = scenarios.filter(({ states }) => states.interactions === 'pressed');
  assert.equal(pressedScenarios.length, 5);
  assert.deepEqual(
    new Set(pressedScenarios.map(({ interactionPlan }) => interactionPlan?.targetId)),
    new Set(['refresh', 'copy-command', 'start-date', 'end-date', 'apply-custom']),
  );
  assert.equal(
    scenarios.filter(({ states, variants }) => states.data === 'empty' && variants.copy !== 'idle').length,
    0,
  );
});

test('admin AI release decision covers every declared content, lifecycle, artifact, evaluation, copy, and control state', () => {
  const componentId = 'src/components/admin/AdminAiReleaseDecisionRuntime.tsx#AdminAiReleaseDecisionRuntime';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => id === componentId);
  assert.equal(scenarios.length, 5271);
  assert.equal(scenarios.filter(({ states }) => states.interactions === 'default').length, 5223);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['empty', 'go', 'no-go', 'pending', 'long-korean', 'unbroken-token', 'maximum-supported']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.system)),
    new Set([
      'idle',
      'presets-loading',
      'presets-error',
      'eval-cases-loading',
      'eval-cases-error',
      'artifacts-loading',
      'artifacts-error',
      'draft-loading',
      'draft-error',
      'evaluation-loading',
      'evaluation-error',
      'save-loading',
      'save-error',
      'save-success',
      'artifact-load-loading',
      'artifact-markdown-loading',
      'artifact-json-loading',
    ]),
  );
  assert.deepEqual(new Set(scenarios.map(({ variants }) => variants.artifacts)), new Set(['empty', 'single', 'maximum']));
  assert.deepEqual(new Set(scenarios.map(({ variants }) => variants.evaluation)), new Set(['absent', 'pass', 'fail']));
  assert.deepEqual(new Set(scenarios.map(({ variants }) => variants.copy)), new Set(['idle', 'done', 'error']));
  assert.deepEqual(new Set(scenarios.map(({ variants }) => variants.loaded)), new Set(['absent', 'present']));

  const expectedTargets = {
    hover: 15,
    'focus-visible': 15,
    pressed: 13,
    input: 3,
    'keyboard-navigation': 2,
  } as const;
  for (const [interaction, count] of Object.entries(expectedTargets)) {
    assert.equal(scenarios.filter(({ states }) => states.interactions === interaction).length, count);
  }
  assert.equal(
    scenarios.filter(({ states, variants }) => states.data === 'empty' && variants.copy !== 'idle').length,
    0,
  );
  assert.equal(
    scenarios.filter(({ states, variants }) => states.data === 'empty' && variants.evaluation !== 'absent').length,
    0,
  );
  assert.equal(
    scenarios.filter(({ states, variants }) => states.data === 'empty' && variants.loaded !== 'absent').length,
    0,
  );
  assert.equal(
    scenarios.filter(({ states, variants }) => (
      variants.artifacts === 'empty'
      && ['artifact-load-loading', 'artifact-markdown-loading', 'artifact-json-loading'].includes(states.system ?? '')
    )).length,
    0,
  );
});

test('admin AI operations panel covers both lazy boundaries without invisible pressure duplicates', () => {
  const componentId = 'src/components/admin/AdminAiOperationsPanel.tsx#AdminAiOperationsPanel';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => id === componentId);

  assert.equal(scenarios.length, 10);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['single', 'long-korean', 'unbroken-token']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => (
      `${variants['auto-brief-phase']}/${variants['release-phase']}`
    ))),
    new Set([
      'fallback/fallback',
      'fallback/resolved',
      'resolved/fallback',
      'resolved/resolved',
    ]),
  );
  assert.equal(
    scenarios.filter(({ states, variants }) => (
      variants['auto-brief-phase'] === 'fallback'
      && variants['release-phase'] === 'fallback'
      && states.data !== 'single'
    )).length,
    0,
  );
});

test('admin AI operations panel runtime mirrors the pass-through panel state contract', () => {
  const panelComponentId = 'src/components/admin/AdminAiOperationsPanel.tsx#AdminAiOperationsPanel';
  const runtimeComponentId = 'src/components/admin/AdminAiOperationsPanelRuntime.tsx#AdminAiOperationsPanelRuntime';
  const panelScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(
    ({ componentId }) => componentId === panelComponentId,
  );
  const runtimeScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(
    ({ componentId }) => componentId === runtimeComponentId,
  );

  assert.equal(runtimeScenarios.length, 10);
  assert.deepEqual(
    runtimeScenarios.map(({ states, variants, interactionPlan }) => ({
      states,
      variants,
      interactionPlan,
    })),
    panelScenarios.map(({ states, variants, interactionPlan }) => ({
      states,
      variants,
      interactionPlan,
    })),
  );
});

test('admin AI operations runtime adds one outer fallback to every owned Auto Brief state', () => {
  const childComponentId = 'src/components/admin/AdminCoachAutoBriefOpsPanel.tsx#AdminCoachAutoBriefOpsPanel';
  const runtimeComponentId = 'src/components/admin/AdminAiOperationsRuntime.tsx#AdminAiOperationsRuntime';
  const childScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(
    ({ componentId }) => componentId === childComponentId,
  );
  const runtimeScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(
    ({ componentId }) => componentId === runtimeComponentId,
  );
  const fallbackScenarios = runtimeScenarios.filter(
    ({ variants }) => variants['panel-phase'] === 'fallback',
  );
  const resolvedScenarios = runtimeScenarios.filter(
    ({ variants }) => variants['panel-phase'] === 'resolved',
  );

  assert.equal(runtimeScenarios.length, 189);
  assert.equal(fallbackScenarios.length, 1);
  assert.deepEqual(fallbackScenarios[0]?.states, {
    data: 'empty',
    interactions: 'default',
    system: 'idle',
  });
  assert.deepEqual(fallbackScenarios[0]?.variants, {
    copy: 'idle',
    'panel-phase': 'fallback',
    theme: 'dark',
    window: 'today',
  });
  assert.equal(resolvedScenarios.length, 188);
  assert.deepEqual(
    resolvedScenarios.map(({ states, variants, interactionPlan }) => {
      const { ['panel-phase']: _panelPhase, ...childVariants } = variants;
      return { states, variants: childVariants, interactionPlan };
    }),
    childScenarios.map(({ states, variants, interactionPlan }) => ({
      states,
      variants,
      interactionPlan,
    })),
  );
});

test('admin community runtime covers every owned tab, permission, data, and lazy-dialog state', () => {
  const componentId = 'src/components/admin/AdminCommunityRuntime.tsx#AdminCommunityRuntime';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(
    ({ componentId: id }) => id === componentId,
  );
  const fallbackScenarios = scenarios.filter(
    ({ variants }) => variants['panel-phase'] === 'fallback',
  );
  const closedScenarios = scenarios.filter(
    ({ variants }) => (
      variants['panel-phase'] === 'resolved'
      && variants['role-dialog-phase'] === 'closed'
    ),
  );
  const dialogScenarios = scenarios.filter(
    ({ variants }) => variants['role-dialog-phase'] !== 'closed',
  );

  assert.equal(scenarios.length, 33);
  assert.equal(fallbackScenarios.length, 3);
  assert.deepEqual(
    fallbackScenarios.map(({ states, variants }) => ({ states, variants })),
    ['parties', 'posts', 'users'].map((activeTab) => ({
      states: {
        data: 'empty',
        interactions: 'default',
        permissions: 'admin',
      },
      variants: {
        'active-tab': activeTab,
        'panel-phase': 'fallback',
        'role-dialog-phase': 'closed',
        theme: 'dark',
      },
    })),
  );
  assert.equal(closedScenarios.length, 22);
  assert.equal(dialogScenarios.length, 8);
  assert.deepEqual(
    new Set(dialogScenarios.map(({ states }) => states.data)),
    new Set(['single', 'long-korean', 'unbroken-token', 'maximum-supported']),
  );
  assert.deepEqual(
    new Set(dialogScenarios.map(({ variants }) => variants['role-dialog-phase'])),
    new Set(['fallback', 'resolved']),
  );
  assert.equal(
    dialogScenarios.filter(({ states, variants }) => (
      variants['active-tab'] !== 'users'
      || variants['panel-phase'] !== 'resolved'
      || states.permissions !== 'super-admin'
    )).length,
    0,
  );
  assert.equal(
    scenarios.filter(({ states, variants }) => (
      variants['active-tab'] !== 'users'
      && states.permissions === 'super-admin'
    )).length,
    0,
  );
  assert.equal(
    scenarios.filter(({ states, variants }) => (
      states.data === 'loading'
      && variants['active-tab'] !== 'users'
    )).length,
    0,
  );
  assert.deepEqual(
    Object.fromEntries(['parties', 'posts', 'users'].map((activeTab) => [
      activeTab,
      scenarios.filter(({ variants }) => variants['active-tab'] === activeTab).length,
    ])),
    { parties: 6, posts: 6, users: 21 },
  );
});

test('admin delete-place dialog covers its rendered surface and all three action controls', () => {
  const componentId = 'src/components/admin/AdminDeletePlaceDialogContent.tsx#AdminDeletePlaceDialogContent';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(
    ({ componentId: id }) => id === componentId,
  );
  const defaults = scenarios.filter(({ states }) => states.interactions === 'default');
  const interactive = scenarios.filter(({ states }) => states.interactions !== 'default');

  assert.equal(scenarios.length, 20);
  assert.equal(defaults.length, 2);
  assert.ok(defaults.every(({ states }) => (
    states.interactions === 'default'
    && states.permissions === 'admin'
  )));
  assert.deepEqual(
    new Set(defaults.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.equal(interactive.length, 18);
  assert.deepEqual(
    new Set(interactive.map(({ states }) => states.interactions)),
    new Set(['hover', 'focus-visible', 'pressed']),
  );
  assert.deepEqual(Object.fromEntries(['cancel', 'close', 'confirm'].map((targetId) => [
    targetId,
    interactive.filter(({ interactionPlan }) => interactionPlan?.targetId === targetId).length,
  ])), { cancel: 6, close: 6, confirm: 6 });
  assert.ok(scenarios.every(({ states, variants }) => (
    states.permissions === 'admin'
    && states.data === undefined
    && states.system === undefined
    && Object.keys(variants).length === 2
    && (variants.theme === 'light' || variants.theme === 'dark')
    && variants.visibility === 'open'
  )));
});

test('admin place dialog covers every form branch, lifecycle, mode, pressure state, and control', () => {
  const componentId = 'src/components/admin/AdminPlaceDialogContent.tsx#AdminPlaceDialogContent';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(
    ({ componentId: id }) => id === componentId,
  );
  const defaults = scenarios.filter(({ states }) => states.interactions === 'default');
  const interactive = scenarios.filter(({ states }) => states.interactions !== 'default');

  assert.equal(scenarios.length, 85);
  assert.equal(defaults.length, 46);
  assert.equal(interactive.length, 39);
  assert.deepEqual(
    new Set(defaults.map(({ states }) => states.data)),
    new Set([
      'empty',
      'populated',
      'null-optional',
      'boundary-minimum',
      'boundary-maximum',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
    ]),
  );
  assert.deepEqual(
    new Set(defaults.map(({ states }) => states.system)),
    new Set(['idle', 'loading', 'error-503']),
  );
  assert.deepEqual(
    new Set(defaults.map(({ variants }) => variants.mode)),
    new Set(['create', 'edit']),
  );
  assert.equal(defaults.filter(({ states }) => (
    states.data === 'empty' && states.system === 'loading'
  )).length, 0);
  assert.deepEqual(Object.fromEntries([
    'hover',
    'focus-visible',
    'pressed',
    'input',
    'keyboard-navigation',
  ].map((interaction) => [
    interaction,
    interactive.filter(({ states }) => states.interactions === interaction).length,
  ])), {
    hover: 13,
    'focus-visible': 13,
    pressed: 3,
    input: 9,
    'keyboard-navigation': 1,
  });
  assert.ok(interactive.every(({ states, variants, interactionPlan }) => (
    states.data === 'maximum-supported'
    && states.permissions === 'admin'
    && states.system === 'idle'
    && variants.mode === 'create'
    && interactionPlan != null
  )));
  assert.ok(scenarios.every(({ states, variants }) => (
    states.permissions === 'admin'
    && variants.theme === 'dark'
    && variants.visibility === 'open'
  )));
});

test('admin report detail drawer covers every data branch, lifecycle, and owned control', () => {
  const componentId = 'src/components/admin/AdminReportDetailDrawer.tsx#AdminReportDetailDrawer';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(
    ({ componentId: id }) => id === componentId,
  );
  const defaults = scenarios.filter(({ states }) => states.interactions === 'default');
  const interactive = scenarios.filter(({ states }) => states.interactions !== 'default');

  assert.equal(scenarios.length, 30);
  assert.equal(defaults.length, 9);
  assert.equal(interactive.length, 21);
  assert.deepEqual(
    new Set(defaults.map(({ states }) => states.data)),
    new Set([
      'empty',
      'populated',
      'null-optional',
      'boundary-minimum',
      'boundary-maximum',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
    ]),
  );
  assert.equal(defaults.filter(({ states }) => states.system === 'loading').length, 1);
  assert.ok(defaults.some(({ states }) => (
    states.data === 'empty' && states.system === 'idle'
  )));
  assert.ok(defaults.some(({ states }) => (
    states.data === 'empty' && states.system === 'loading'
  )));
  assert.deepEqual(Object.fromEntries([
    'hover',
    'focus-visible',
    'pressed',
    'input',
  ].map((interaction) => [
    interaction,
    interactive.filter(({ states }) => states.interactions === interaction).length,
  ])), {
    hover: 7,
    'focus-visible': 7,
    pressed: 6,
    input: 1,
  });
  assert.ok(interactive.every(({ states, variants, interactionPlan }) => (
    states.data === 'maximum-supported'
    && states.permissions === 'admin'
    && states.system === 'idle'
    && variants.theme === 'dark'
    && variants.visibility === 'open'
    && interactionPlan != null
  )));
  assert.ok(scenarios.every(({ states, variants }) => (
    states.permissions === 'admin'
    && variants.theme === 'dark'
    && variants.visibility === 'open'
  )));
});

test('admin reports panel covers filters, list pressure, lifecycle, and every owned control', () => {
  const componentId = 'src/components/admin/AdminReportsPanel.tsx#AdminReportsPanel';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(
    ({ componentId: id }) => id === componentId,
  );
  const defaults = scenarios.filter(({ states }) => states.interactions === 'default');
  const interactive = scenarios.filter(({ states }) => states.interactions !== 'default');

  assert.equal(scenarios.length, 39);
  assert.equal(defaults.length, 18);
  assert.equal(interactive.length, 21);
  assert.deepEqual(
    new Set(defaults.map(({ states }) => states.data)),
    new Set([
      'empty',
      'populated',
      'null-optional',
      'boundary-minimum',
      'boundary-maximum',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
    ]),
  );
  assert.deepEqual(
    new Set(defaults.map(({ variants }) => variants.filters)),
    new Set(['default', 'active']),
  );
  assert.equal(defaults.filter(({ states }) => states.system === 'loading').length, 2);
  assert.ok(defaults.filter(({ states, variants }) => (
    states.data === 'empty' && states.system === 'loading' && variants.filters === 'default'
  )).length === 1);
  assert.ok(defaults.filter(({ states, variants }) => (
    states.data === 'empty' && states.system === 'loading' && variants.filters === 'active'
  )).length === 1);
  assert.deepEqual(Object.fromEntries([
    'hover',
    'focus-visible',
    'pressed',
    'input',
    'keyboard-navigation',
  ].map((interaction) => [
    interaction,
    interactive.filter(({ states }) => states.interactions === interaction).length,
  ])), {
    hover: 5,
    'focus-visible': 8,
    pressed: 4,
    input: 2,
    'keyboard-navigation': 2,
  });
  assert.ok(interactive.every(({ states, variants, interactionPlan }) => (
    states.data === 'maximum-supported'
    && states.permissions === 'admin'
    && states.system === 'idle'
    && variants.filters === 'active'
    && variants.theme === 'dark'
    && interactionPlan != null
  )));
  assert.ok(scenarios.every(({ states, variants }) => (
    states.permissions === 'admin'
    && variants.theme === 'dark'
  )));
});

test('admin seat-views panel covers filters, list pressure, lifecycle, and every owned control', () => {
  const componentId = 'src/components/admin/AdminSeatViewsPanel.tsx#AdminSeatViewsPanel';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(
    ({ componentId: id }) => id === componentId,
  );
  const defaults = scenarios.filter(({ states }) => states.interactions === 'default');
  const interactive = scenarios.filter(({ states }) => states.interactions !== 'default');

  assert.equal(scenarios.length, 38);
  assert.equal(defaults.length, 18);
  assert.equal(interactive.length, 20);
  assert.deepEqual(
    new Set(defaults.map(({ states }) => states.data)),
    new Set([
      'empty',
      'populated',
      'null-optional',
      'boundary-minimum',
      'boundary-maximum',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
    ]),
  );
  assert.deepEqual(
    new Set(defaults.map(({ variants }) => variants.filters)),
    new Set(['default', 'active']),
  );
  assert.equal(defaults.filter(({ states }) => states.system === 'loading').length, 2);
  assert.deepEqual(Object.fromEntries([
    'hover',
    'focus-visible',
    'pressed',
    'input',
    'keyboard-navigation',
  ].map((interaction) => [
    interaction,
    interactive.filter(({ states }) => states.interactions === interaction).length,
  ])), {
    hover: 4,
    'focus-visible': 8,
    pressed: 3,
    input: 1,
    'keyboard-navigation': 4,
  });
  assert.ok(interactive.every(({ states, variants, interactionPlan }) => (
    states.data === 'maximum-supported'
    && states.permissions === 'admin'
    && states.system === 'idle'
    && variants.filters === 'active'
    && variants.theme === 'dark'
    && interactionPlan != null
  )));
  assert.ok(scenarios.every(({ states, variants }) => (
    states.permissions === 'admin'
    && variants.theme === 'dark'
  )));
});

test('admin stadiums panel covers selection, lifecycle, place pressure, and every owned control', () => {
  const componentId = 'src/components/admin/AdminStadiumsPanel.tsx#AdminStadiumsPanel';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(
    ({ componentId: id }) => id === componentId,
  );
  const defaults = scenarios.filter(({ states }) => states.interactions === 'default');
  const interactive = scenarios.filter(({ states }) => states.interactions !== 'default');

  assert.equal(scenarios.length, 32);
  assert.equal(defaults.length, 20);
  assert.equal(interactive.length, 12);
  assert.deepEqual(
    new Set(defaults.map(({ states }) => states.data)),
    new Set([
      'empty',
      'populated',
      'null-optional',
      'boundary-minimum',
      'boundary-maximum',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
    ]),
  );
  assert.deepEqual(Object.fromEntries([
    'idle',
    'panel-error',
    'initial-loading',
    'loading',
  ].map((system) => [
    system,
    defaults.filter(({ states }) => states.system === system).length,
  ])), {
    idle: 9,
    'panel-error': 9,
    'initial-loading': 1,
    loading: 1,
  });
  assert.deepEqual(
    new Set(defaults.map(({ variants }) => variants.selection)),
    new Set(['none', 'selected']),
  );
  assert.deepEqual(Object.fromEntries([
    'hover',
    'focus-visible',
    'pressed',
    'keyboard-navigation',
  ].map((interaction) => [
    interaction,
    interactive.filter(({ states }) => states.interactions === interaction).length,
  ])), {
    hover: 4,
    'focus-visible': 4,
    pressed: 3,
    'keyboard-navigation': 1,
  });
  assert.ok(interactive.every(({ states, variants, interactionPlan }) => (
    states.data === 'maximum-supported'
    && states.permissions === 'admin'
    && states.system === 'idle'
    && variants.selection === 'selected'
    && variants.theme === 'dark'
    && interactionPlan != null
  )));
  assert.ok(scenarios.every(({ states, variants }) => (
    states.permissions === 'admin'
    && variants.theme === 'dark'
  )));
});

test('admin stadiums runtime covers every panel lifecycle and lazy dialog boundary', () => {
  const componentId = 'src/components/admin/AdminStadiumsRuntime.tsx#AdminStadiumsRuntime';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(
    ({ componentId: id }) => id === componentId,
  );
  const panelFallback = scenarios.filter(
    ({ variants }) => variants['panel-phase'] === 'fallback',
  );
  const closed = scenarios.filter(
    ({ variants }) => variants['dialog-phase'] === 'closed',
  );
  const dialogs = scenarios.filter(
    ({ variants }) => variants['dialog-phase'] !== 'closed',
  );

  assert.equal(scenarios.length, 27);
  assert.equal(panelFallback.length, 1);
  assert.equal(closed.length, 21);
  assert.equal(dialogs.length, 6);
  assert.deepEqual(
    new Set(dialogs.map(({ variants }) => variants['dialog-phase'])),
    new Set([
      'create-fallback',
      'create-resolved',
      'edit-fallback',
      'edit-resolved',
      'delete-fallback',
      'delete-resolved',
    ]),
  );
  assert.ok(panelFallback.every(({ states, variants }) => (
    states.data === 'empty'
    && states.interactions === 'default'
    && states.permissions === 'admin'
    && states.system === 'idle'
    && variants['dialog-phase'] === 'closed'
    && variants.selection === 'none'
  )));
  assert.ok(dialogs.every(({ states, variants }) => (
    states.data === 'maximum-supported'
    && states.interactions === 'default'
    && states.permissions === 'admin'
    && states.system === 'idle'
    && variants['panel-phase'] === 'resolved'
    && variants.selection === 'selected'
    && variants.theme === 'dark'
  )));
});

test('admin role-change dialog covers nullable identity, both directions, themes, and controls', () => {
  const componentId = 'src/components/admin/AdminRoleChangeDialogContent.tsx#AdminRoleChangeDialogContent';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(
    ({ componentId: id }) => id === componentId,
  );
  const defaults = scenarios.filter(({ states }) => states.interactions === 'default');
  const interactive = scenarios.filter(({ states }) => states.interactions !== 'default');

  assert.equal(scenarios.length, 74);
  assert.equal(defaults.length, 30);
  assert.equal(interactive.length, 44);
  assert.deepEqual(
    new Set(defaults.map(({ states }) => states.data)),
    new Set([
      'empty',
      'populated',
      'null-optional',
      'boundary-minimum',
      'boundary-maximum',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
    ]),
  );
  assert.equal(defaults.filter(({ states }) => states.data === 'null-optional').length, 2);
  assert.deepEqual(
    new Set(defaults.map(({ variants }) => variants.direction)),
    new Set(['promote', 'demote']),
  );
  assert.deepEqual(
    new Set(defaults.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.deepEqual(Object.fromEntries([
    'hover',
    'focus-visible',
    'pressed',
    'input',
  ].map((interaction) => [
    interaction,
    interactive.filter(({ states }) => states.interactions === interaction).length,
  ])), {
    hover: 12,
    'focus-visible': 16,
    pressed: 12,
    input: 4,
  });
  assert.ok(interactive.every(({ states, variants, interactionPlan }) => (
    states.data === 'maximum-supported'
    && states.permissions === 'super-admin'
    && states.system === undefined
    && variants.visibility === 'open'
    && interactionPlan != null
  )));
  assert.ok(scenarios.every(({ states, variants }) => (
    states.permissions === 'super-admin'
    && states.system === undefined
    && variants.visibility === 'open'
  )));
});

test('admin seat-view detail drawer covers every data branch, lifecycle, and owned control', () => {
  const componentId = 'src/components/admin/AdminSeatViewDetailDrawer.tsx#AdminSeatViewDetailDrawer';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(
    ({ componentId: id }) => id === componentId,
  );
  const defaults = scenarios.filter(({ states }) => states.interactions === 'default');
  const interactive = scenarios.filter(({ states }) => states.interactions !== 'default');

  assert.equal(scenarios.length, 27);
  assert.equal(defaults.length, 9);
  assert.equal(interactive.length, 18);
  assert.deepEqual(
    new Set(defaults.map(({ states }) => states.data)),
    new Set([
      'empty',
      'populated',
      'null-optional',
      'boundary-minimum',
      'boundary-maximum',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
    ]),
  );
  assert.equal(defaults.filter(({ states }) => states.system === 'loading').length, 1);
  assert.ok(defaults.some(({ states }) => (
    states.data === 'empty' && states.system === 'idle'
  )));
  assert.ok(defaults.some(({ states }) => (
    states.data === 'empty' && states.system === 'loading'
  )));
  assert.deepEqual(Object.fromEntries([
    'hover',
    'focus-visible',
    'pressed',
    'input',
  ].map((interaction) => [
    interaction,
    interactive.filter(({ states }) => states.interactions === interaction).length,
  ])), {
    hover: 6,
    'focus-visible': 6,
    pressed: 5,
    input: 1,
  });
  assert.ok(interactive.every(({ states, variants, interactionPlan }) => (
    states.data === 'maximum-supported'
    && states.permissions === 'admin'
    && states.system === 'idle'
    && variants.theme === 'dark'
    && variants.visibility === 'open'
    && interactionPlan != null
  )));
  assert.ok(scenarios.every(({ states, variants }) => (
    states.permissions === 'admin'
    && variants.theme === 'dark'
    && variants.visibility === 'open'
  )));
});

test('admin game-status repair panel covers every owned data, lifecycle, and control state', () => {
  const componentId = 'src/components/admin/AdminGameStatusRepairPanel.tsx#AdminGameStatusRepairPanel';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(
    ({ componentId: id }) => id === componentId,
  );
  const defaults = scenarios.filter(({ states }) => states.interactions === 'default');
  const interactive = scenarios.filter(({ states }) => states.interactions !== 'default');
  const expectedData = new Set([
    'empty',
    'clean',
    'mismatch-only',
    'non-canonical-only',
    'mixed',
    'repair-dry-run',
    'repair-applied',
    'tracker-draft',
    'tracker-requested',
    'tracker-done',
    'closure-pass',
    'long-korean',
    'unbroken-token',
    'maximum-supported',
  ]);
  const expectedSystem = new Set([
    'idle',
    'initial-loading',
    'diagnosis-loading',
    'repair-loading',
    'suggestions-loading',
    'suggestions-error',
    'tracker-loading',
    'tracker-saving',
    'panel-error',
    'tracker-message',
    'action-success',
    'copy-done',
    'copy-error',
    'manual-required',
  ]);

  assert.equal(defaults.length, expectedData.size * expectedSystem.size);
  assert.deepEqual(new Set(defaults.map(({ states }) => states.data)), expectedData);
  assert.deepEqual(new Set(defaults.map(({ states }) => states.system)), expectedSystem);
  assert.ok(defaults.every(({ states, variants }) => (
    states.permissions === 'admin'
    && variants.active === 'active'
    && variants.theme === 'dark'
  )));
  assert.ok(interactive.length > 0);
  assert.ok(interactive.every(({ states }) => (
    states.data === 'maximum-supported'
    && states.system === 'idle'
  )));
  assert.deepEqual(
    new Set(interactive.map(({ states }) => states.interactions)),
    new Set(['hover', 'focus-visible', 'pressed', 'input', 'keyboard-navigation']),
  );
  assert.deepEqual(
    new Set(interactive.map(({ interactionPlan }) => interactionPlan?.targetId)),
    new Set([
      'apply',
      'copy-current-closure',
      'copy-current-handoff',
      'copy-current-summary',
      'copy-current-sync',
      'copy-history-closure',
      'copy-history-handoff',
      'copy-history-summary',
      'copy-history-sync',
      'copy-template',
      'diagnose',
      'download-mismatches',
      'download-non-canonical',
      'download-repairs',
      'dry-run',
      'end-date',
      'history-ticket-link',
      'load-history',
      'mark-done',
      'refresh-suggestions',
      'save',
      'start-date',
      'suggestion',
      'ticket-assignee',
      'ticket-clear',
      'ticket-link',
      'ticket-note',
      'ticket-status',
      'ticket-url',
    ]),
  );
});

test('offseason public route tree has no pending direct or hosted visual symbol', async () => {
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{ id: string; status: string }>;
  };
  const offseasonEntries = manifest.components.filter(({ id }) => (
    id.startsWith('src/components/OffSeason')
      || id.startsWith('src/components/offseason/')
      || id === 'src/components/AppRoutes.tsx#OffSeasonHomePage'
      || id === 'src/components/AppRoutes.tsx#OffSeasonListPage'
  ));

  assert.equal(offseasonEntries.length, 32);
  assert.deepEqual(
    offseasonEntries.filter(({ status }) => status !== 'registered'),
    [],
  );
});

test('public landing tree has no pending direct or hosted visual symbol', async () => {
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{ id: string; status: string }>;
  };
  const landingIds = manifest.components
    .filter(({ id }) => id === 'src/components/Landing.tsx#Landing'
      || id.startsWith('src/components/landing/'))
    .map(({ id }) => id);
  const publicLandingVisualIds = landingIds.filter((id) => (
    !id.endsWith('#PREVIEW_POINTS')
      && !id.endsWith('#HERO_STATS')
      && !id.endsWith('#PRESS_START_FONT_HREF')
      && !id.endsWith('#PRESS_START_FONT_ID')
      && !id.endsWith('#LandingMateVignette.Icon')
      && !id.endsWith('#MATE_DETAIL_ICONS')
  ));
  const pending = manifest.components.filter(({ id, status }) => (
    publicLandingVisualIds.includes(id) && status !== 'registered'
  ));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    publicLandingVisualIds.includes(componentId)
  ));

  assert.equal(publicLandingVisualIds.length, 17);
  assert.deepEqual(pending, []);
  assert.equal(scenarios.length, 326);
  assert.equal(new Set(scenarios.map(({ componentId }) => componentId)).size, 16);
  const heroOpen = scenarios.find(({ stateCombinationId }) => (
    stateCombinationId === 'data=populated|interactions=open|variant.theme=light|interactionTarget=home'
  ));
  assert.equal(heroOpen?.interactionPlan?.waitForSelector, '[data-vqa-router-pathname="/home"]');
});

test('legacy landing showcases have exhaustive direct mobile scenarios', async () => {
  const componentIds = [
    'src/components/LandingCapabilityShowcase.tsx#LandingCapabilityShowcase',
    'src/components/LandingFeaturesRuntime.tsx#LandingFeaturesRuntime',
  ];
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{ id: string; status: string }>;
  };
  const pending = manifest.components.filter(({ id, status }) => (
    componentIds.includes(id) && status !== 'registered'
  ));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentIds.includes(componentId)
  ));

  assert.deepEqual(pending, []);
  assert.equal(scenarios.length, 58);
  assert.equal(new Set(scenarios.map(({ componentId }) => componentId)).size, 2);
  const selectedTargets = scenarios.filter(({ componentId, states }) => (
    componentId === componentIds[1] && states.interactions === 'selected'
  ));
  assert.equal(selectedTargets.length, 12);
  assert.ok(selectedTargets.every(({ interactionPlan }) => (
    interactionPlan?.waitForSelector?.includes('[aria-expanded="true"]')
  )));
});

test('lazy emoji picker has exhaustive mobile inventory, pressure, size, and interaction scenarios', async () => {
  const componentId = 'src/components/LazyEmojiPicker.tsx#LazyEmojiPicker';
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{ id: string; status: string }>;
  };
  const entry = manifest.components.find(({ id }) => id === componentId);
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((scenario) => (
    scenario.componentId === componentId
  ));

  assert.equal(entry?.status, 'registered');
  assert.equal(scenarios.length, 1058);
  assert.equal(scenarios.filter(({ states }) => states.interactions === 'default').length, 54);
  assert.equal(scenarios.filter(({ states }) => states.interactions === 'input').length, 8);
  assert.equal(scenarios.filter(({ states }) => states.interactions === 'selected').length, 240);
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ variants, interactionPlan }) => (
      variants.size === 'default'
      && Boolean(interactionPlan?.selector)
    )));
});

test('mate page isolates both lazy fallbacks and the resolved runtime in each theme', async () => {
  const componentIds = [
    'src/components/Mate.tsx#Mate',
    'src/components/Mate.tsx#MateControlsFallback',
    'src/components/Mate.tsx#MateListControlsRuntime',
    'src/components/Mate.tsx#MateResultsFallback',
    'src/components/Mate.tsx#MateResultsRuntime',
  ];
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entries = manifest.components.filter(({ id }) => componentIds.includes(id));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === componentIds[0]
  ));

  assert.equal(entries.length, 5);
  assert.ok(entries.every(({ status }) => status === 'registered'));
  assert.equal(scenarios.length, 6);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['single']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.phase)),
    new Set(['controls-fallback', 'results-fallback', 'runtime']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.ok(entries.slice(1).every(({ render }) => (
    (render?.hostScenarioIds?.length ?? 0) > 0
  )));
});

test('mate apply owns exhaustive flow, fault, pressure, ticket, and interaction scenarios', async () => {
  const componentIds = [
    'src/components/MateApply.tsx#MateApply',
    'src/components/MateApply.tsx#MateApplyTicketVerificationPanel',
    'src/components/MateApply.tsx#MatePill',
    'src/components/MateApply.tsx#SectionDivider',
  ];
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entries = manifest.components.filter(({ id }) => componentIds.includes(id));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === componentIds[0]
  ));

  assert.equal(entries.length, 4);
  assert.ok(entries.every(({ status }) => status === 'registered'));
  assert.equal(scenarios.length, 96);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['loading', 'error-503', 'single', 'long-korean', 'unbroken-token', 'maximum-supported']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.flow)),
    new Set(['participation', 'selling']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.ticketPanel)),
    new Set(['fallback', 'resolved']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ interactionPlan }) => Boolean(interactionPlan?.selector)));
  assert.ok(entries.slice(1).every(({ render }) => (
    (render?.hostScenarioIds?.length ?? 0) > 0
  )));
});

test('mate apply page isolates the lazy fallback and resolved runtime in each theme', async () => {
  const componentIds = [
    'src/components/AppRoutes.tsx#MateApplyPage',
    'src/components/MateApplyPage.tsx#MateApplyFallback',
    'src/components/MateApplyPage.tsx#MateApplyPage',
    'src/components/MateApplyPage.tsx#MateApplyRuntime',
  ];
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entries = manifest.components.filter(({ id }) => componentIds.includes(id));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === componentIds[2]
  ));

  assert.equal(entries.length, 4);
  assert.ok(entries.every(({ status }) => status === 'registered'));
  assert.equal(scenarios.length, 4);
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.phase)),
    new Set(['fallback', 'runtime']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.ok(entries
    .filter(({ id }) => id !== componentIds[2])
    .every(({ render }) => (render?.hostScenarioIds?.length ?? 0) > 0));
});

test('mate ticket verification covers every visible phase and metadata pressure class', async () => {
  const componentId = 'src/components/MateApplyTicketVerificationPanel.tsx#MateApplyTicketVerificationPanel';
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{ id: string; status: string }>;
  };
  const entry = manifest.components.find(({ id }) => id === componentId);
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => (
    id === componentId
  ));

  assert.equal(entry?.status, 'registered');
  assert.equal(scenarios.length, 26);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['single', 'partial', 'null-optional', 'long-korean', 'unbroken-token']),
  );
  assert.equal(scenarios.filter(({ variants }) => variants.phase === 'idle').length, 8);
  assert.equal(scenarios.filter(({ variants }) => variants.phase === 'scanning').length, 2);
  assert.equal(scenarios.filter(({ variants }) => variants.phase === 'verified').length, 16);
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ interactionPlan }) => Boolean(interactionPlan?.selector)));
});

test('mate chat covers every route, permission, pressure, action, and approved fallback state', async () => {
  const componentIds = [
    'src/components/MateChat.tsx#LazyMateChatAccessStateRuntime',
    'src/components/MateChat.tsx#LazyMateChatApprovedRuntime',
    'src/components/MateChat.tsx#MateChat',
  ];
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entries = manifest.components.filter(({ id }) => componentIds.includes(id));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === componentIds[2]
  ));

  assert.equal(entries.length, 3);
  assert.ok(entries.every(({ status }) => status === 'registered'));
  assert.equal(scenarios.length, 98);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set([
      'error-503',
      'loading',
      'long-korean',
      'single',
      'unbroken-token',
    ]),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.permissions)),
    new Set(['anonymous', 'mate-applicant-pending', 'mate-member-approved', 'mate-host']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.phase)),
    new Set(['auth', 'party', 'access', 'approval', 'approved-fallback']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.equal(
    scenarios.filter(({ variants }) => variants.phase === 'approved-fallback').length,
    4,
  );
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ interactionPlan }) => Boolean(interactionPlan?.selector)));
  assert.ok(entries
    .filter(({ id }) => id !== componentIds[2])
    .every(({ render }) => (render?.hostScenarioIds?.length ?? 0) > 0));
});

test('mate chat access runtime covers every denial state, pressure class, and action target', async () => {
  const componentIds = [
    'src/components/MateChatAccessStateRuntime.tsx#MateChatAccessStateRuntime',
    'src/components/MateChatAccessStateRuntime.tsx#MateChatStateLayout',
  ];
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entries = manifest.components.filter(({ id }) => componentIds.includes(id));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === componentIds[0]
  ));

  assert.equal(entries.length, 2);
  assert.ok(entries.every(({ status }) => status === 'registered'));
  assert.equal(scenarios.length, 88);
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.state)),
    new Set(['party-error', 'unauthenticated', 'approval-error', 'not-approved']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['error-503', 'single', 'long-korean', 'unbroken-token']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.permissions)),
    new Set(['anonymous', 'mate-applicant-pending']),
  );
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ interactionPlan }) => Boolean(interactionPlan?.selector)));
  assert.ok((entries[1]?.render?.hostScenarioIds?.length ?? 0) > 0);
});

test('mate chat approved runtime covers every valid data, permission, transport, and phase combination', async () => {
  const componentIds = [
    'src/components/MateChatApprovedRuntime.tsx#MateChatApprovedRuntime',
    'src/components/MateChatApprovedRuntime.tsx#LazyMateChatViewRuntime',
  ];
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entries = manifest.components.filter(({ id }) => componentIds.includes(id));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === componentIds[0]
  ));

  assert.equal(entries.length, 2);
  assert.ok(entries.every(({ status }) => status === 'registered'));
  assert.equal(scenarios.length, 200);
  assert.equal(scenarios.filter(({ variants }) => variants.phase === 'messages-loading').length, 4);
  assert.equal(scenarios.filter(({ variants }) => variants.phase === 'view-fallback').length, 4);
  assert.equal(scenarios.filter(({ variants }) => variants.phase === 'runtime').length, 192);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['loading', 'empty', 'populated', 'error-403', 'error-503', 'long-korean', 'unbroken-token']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.permissions)),
    new Set(['mate-member-approved', 'mate-host']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.system)),
    new Set(['online', 'offline']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.history)),
    new Set(['none', 'available', 'loading']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.revalidating)),
    new Set(['false', 'true']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.equal(
    entries.find(({ id }) => id === componentIds[1])?.render?.hostScenarioIds?.length,
    8,
  );
});

test('mate chat composer covers every valid message, media, connection, theme, and control state', async () => {
  const componentId = 'src/components/MateChatComposerPanel.tsx#MateChatComposerPanel';
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as { components: Array<{ id: string; status: string }> };
  const entry = manifest.components.find(({ id }) => id === componentId);
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => id === componentId);

  assert.equal(entry?.status, 'registered');
  assert.equal(scenarios.length, 236);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['empty', 'single', 'long-korean', 'unbroken-token', 'broken-image']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.system)),
    new Set(['online', 'offline']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.media)),
    new Set(['none', 'preview', 'uploading']),
  );
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ interactionPlan }) => Boolean(interactionPlan?.selector)));
  assert.ok(scenarios
    .filter(({ variants }) => variants.media === 'uploading')
    .every(({ states }) => states.interactions === 'default'));
});

test('mate chat conversation covers every valid message, role, history, ownership, composer, and control state', async () => {
  const componentIds = [
    'src/components/MateChatConversationPanel.tsx#ChatEmptyState',
    'src/components/MateChatConversationPanel.tsx#MateChatComposerPanel',
    'src/components/MateChatConversationPanel.tsx#MateChatConversationPanel',
    'src/components/MateChatConversationPanel.tsx#SectionDivider',
  ];
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entries = manifest.components.filter(({ id }) => componentIds.includes(id));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === componentIds[2]
  ));

  assert.equal(entries.length, 4);
  assert.ok(entries.every(({ status }) => status === 'registered'));
  assert.equal(scenarios.length, 126);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['empty', 'populated', 'long-korean', 'unbroken-token', 'broken-image', 'error-403', 'error-503']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.permissions)),
    new Set(['mate-member-approved', 'mate-host']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.system)),
    new Set(['online', 'offline']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.history)),
    new Set(['none', 'available', 'loading']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.composer)),
    new Set(['fallback', 'runtime']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.ownership)),
    new Set(['mine', 'theirs', 'mixed']),
  );
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ interactionPlan }) => Boolean(interactionPlan?.selector)));
  assert.ok(entries
    .filter(({ id }) => id !== componentIds[2])
    .every(({ render }) => (render?.hostScenarioIds?.length ?? 0) > 0));
});

test('mate chat page isolates the lazy fallback and resolved runtime in each theme', async () => {
  const componentIds = [
    'src/components/MateChatPage.tsx#MateChatFallback',
    'src/components/MateChatPage.tsx#MateChatPage',
    'src/components/MateChatPage.tsx#MateChatRuntime',
  ];
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entries = manifest.components.filter(({ id }) => componentIds.includes(id));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === componentIds[1]
  ));

  assert.equal(entries.length, 3);
  assert.ok(entries.every(({ status }) => status === 'registered'));
  assert.equal(scenarios.length, 4);
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.phase)),
    new Set(['fallback', 'runtime']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.ok(entries
    .filter(({ id }) => id !== componentIds[1])
    .every(({ render }) => (render?.hostScenarioIds?.length ?? 0) > 0));
});

test('mate chat view covers role, transport, metadata pressure, child loading, and every header action', async () => {
  const componentIds = [
    'src/components/MateChatViewRuntime.tsx#MateChatConversationPanel',
    'src/components/MateChatViewRuntime.tsx#MateChatViewRuntime',
    'src/components/MateChatViewRuntime.tsx#MatePill',
    'src/components/MateChatViewRuntime.tsx#SummaryItem',
  ];
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entries = manifest.components.filter(({ id }) => componentIds.includes(id));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === componentIds[1]
  ));

  assert.equal(entries.length, 4);
  assert.ok(entries.every(({ status }) => status === 'registered'));
  assert.equal(scenarios.length, 58);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['single', 'long-korean', 'unbroken-token']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.permissions)),
    new Set(['mate-member-approved', 'mate-host']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.system)),
    new Set(['online', 'offline']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.state)),
    new Set(['base', 'checkin', 'conversation-fallback', 'revalidating', 'ticket-unverified']),
  );
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ interactionPlan }) => Boolean(interactionPlan?.selector)));
  assert.ok(entries
    .filter(({ id }) => id !== componentIds[1])
    .every(({ render }) => (render?.hostScenarioIds?.length ?? 0) > 0));
});

test('mate check-in covers route recovery, entry mode, validation, lazy content, and owned actions', async () => {
  const componentIds = [
    'src/components/MateCheckIn.tsx#MateCheckIn',
    'src/components/MateCheckIn.tsx#MateCheckInContentRuntime',
  ];
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entries = manifest.components.filter(({ id }) => componentIds.includes(id));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === componentIds[0]
  ));

  assert.equal(entries.length, 2);
  assert.ok(entries.every(({ status }) => status === 'registered'));
  assert.equal(scenarios.length, 64);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['loading', 'single', 'error-404', 'error-503', 'long-korean', 'unbroken-token']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.permissions)),
    new Set(['anonymous', 'mate-member-approved', 'mate-host']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.phase)),
    new Set(['auth-loading', 'party-loading', 'party-error', 'auth-required', 'content-fallback', 'runtime']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.entry)),
    new Set(['manual', 'qr']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.validation)),
    new Set(['idle', 'invalid']),
  );
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ interactionPlan }) => Boolean(interactionPlan?.selector)));
  assert.equal(entries[1]?.render?.hostScenarioIds?.length, 16);
});

test('mate check-in action covers role, progress, numeric pressure, and every mobile action', async () => {
  const componentId = 'src/components/MateCheckInActionRuntime.tsx#MateCheckInActionRuntime';
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{ id: string; status: string }>;
  };
  const entry = manifest.components.find(({ id }) => id === componentId);
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((scenario) => (
    scenario.componentId === componentId
  ));

  assert.equal(entry?.status, 'registered');
  assert.equal(scenarios.length, 54);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['single', 'maximum-supported']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.permissions)),
    new Set(['mate-member-approved', 'mate-host']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.state)),
    new Set(['ready', 'checking', 'waiting', 'complete']),
  );
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ interactionPlan }) => Boolean(interactionPlan?.selector)));
  assert.ok(scenarios.some(({ stateCombinationId }) => (
    stateCombinationId.includes('state=waiting')
      && stateCombinationId.includes('interactionTarget=chat')
  )));
  assert.ok(!scenarios.some(({ stateCombinationId }) => (
    stateCombinationId.includes('state=waiting')
      && stateCombinationId.includes('interactionTarget=primary')
  )));
});

test('mate check-in content covers child boundaries, roles, progress, transport, and density', async () => {
  const componentIds = [
    'src/components/MateCheckInContentRuntime.tsx#MateCheckInActionRuntime',
    'src/components/MateCheckInContentRuntime.tsx#MateCheckInContentRuntime',
    'src/components/MateCheckInContentRuntime.tsx#MateCheckInOverviewRuntime',
    'src/components/MateCheckInContentRuntime.tsx#MateCheckInRosterRuntime',
    'src/components/MateCheckInContentRuntime.tsx#MateCheckInStatusRuntime',
  ];
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entries = manifest.components.filter(({ id }) => componentIds.includes(id));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === componentIds[1]
  ));

  assert.equal(entries.length, 5);
  assert.ok(entries.every(({ status }) => status === 'registered'));
  assert.equal(scenarios.length, 64);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['single', 'long-korean', 'unbroken-token', 'maximum-supported']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.system)),
    new Set(['online', 'offline', 'timeout']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.phase)),
    new Set(['runtime', 'overview-fallback', 'status-fallback', 'roster-fallback', 'action-fallback']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.state)),
    new Set(['ready', 'checking', 'waiting', 'complete']),
  );
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ interactionPlan }) => interactionPlan?.targetId === 'retry'));
  assert.ok(entries
    .filter(({ id }) => id !== componentIds[1])
    .every(({ render }) => render?.hostScenarioIds?.length === 8));
});

test('mate check-in overview covers owned pressure and every hosted leaf', async () => {
  const componentIds = [
    'src/components/MateCheckInOverviewRuntime.tsx#MateCheckInOverviewRuntime',
    'src/components/MateCheckInOverviewRuntime.tsx#MatePill',
    'src/components/MateCheckInOverviewRuntime.tsx#SummaryItem',
  ];
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entries = manifest.components.filter(({ id }) => componentIds.includes(id));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === componentIds[0]
  ));

  assert.equal(entries.length, 3);
  assert.ok(entries.every(({ status }) => status === 'registered'));
  assert.equal(scenarios.length, 30);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['single', 'long-korean', 'unbroken-token', 'maximum-supported']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.permissions)),
    new Set(['mate-member-approved', 'mate-host']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.state)),
    new Set(['ready', 'waiting', 'complete']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.entry)),
    new Set(['manual', 'qr']),
  );
  assert.ok(scenarios.every(({ states, interactionPlan }) => (
    states.interactions === undefined
      && states.system === undefined
      && interactionPlan === undefined
  )));
  assert.equal(entries.find(({ id }) => id.endsWith('#MatePill'))?.render?.hostScenarioIds?.length, 24);
  assert.equal(entries.find(({ id }) => id.endsWith('#SummaryItem'))?.render?.hostScenarioIds?.length, 14);
});

test('mate check-in page isolates both lazy phases and hosted declarations', async () => {
  const componentIds = [
    'src/components/MateCheckInPage.tsx#MateCheckInFallback',
    'src/components/MateCheckInPage.tsx#MateCheckInPage',
    'src/components/MateCheckInPage.tsx#MateCheckInRuntime',
  ];
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entries = manifest.components.filter(({ id }) => componentIds.includes(id));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === componentIds[1]
  ));

  assert.equal(entries.length, 3);
  assert.ok(entries.every(({ status }) => status === 'registered'));
  assert.equal(scenarios.length, 4);
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.phase)),
    new Set(['fallback', 'runtime']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.ok(entries
    .filter(({ id }) => id !== componentIds[1])
    .every(({ render }) => render?.hostScenarioIds?.length === 2));
});

test('mate check-in roster covers roles, density, progress, chat, and hosted empty state', async () => {
  const componentIds = [
    'src/components/MateCheckInRosterRuntime.tsx#EmptyState',
    'src/components/MateCheckInRosterRuntime.tsx#MateCheckInRosterRuntime',
  ];
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entries = manifest.components.filter(({ id }) => componentIds.includes(id));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === componentIds[1]
  ));

  assert.equal(entries.length, 2);
  assert.ok(entries.every(({ status }) => status === 'registered'));
  assert.equal(scenarios.length, 70);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['single', 'long-korean', 'unbroken-token', 'maximum-supported']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.permissions)),
    new Set(['mate-member-approved', 'mate-host']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.state)),
    new Set(['empty', 'host-only', 'partial', 'complete']),
  );
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ interactionPlan }) => interactionPlan?.targetId === 'chat'));
  assert.equal(entries[0]?.render?.hostScenarioIds?.length, 4);
});

test('mate check-in status covers entry, progress, pressure, actions, and hosted progress bar', async () => {
  const componentIds = [
    'src/components/MateCheckInStatusRuntime.tsx#MateCheckInStatusRuntime',
    'src/components/MateCheckInStatusRuntime.tsx#ProgressBar',
  ];
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entries = manifest.components.filter(({ id }) => componentIds.includes(id));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === componentIds[0]
  ));

  assert.equal(entries.length, 2);
  assert.ok(entries.every(({ status }) => status === 'registered'));
  assert.equal(scenarios.length, 46);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['single', 'long-korean', 'unbroken-token', 'maximum-supported']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.state)),
    new Set(['ready', 'checking', 'waiting', 'complete']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.entry)),
    new Set(['manual', 'qr']),
  );
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ interactionPlan, variants }) => interactionPlan?.targetId === (
      variants.state === 'ready' ? 'check-in' : 'complete'
    )));
  assert.equal(entries[1]?.render?.hostScenarioIds?.length, 6);
});

test('mate create covers every lazy phase, pressure case, navigation state, and hosted declaration', async () => {
  const componentIds = [
    'src/components/MateCreate.tsx#MateCreate',
    'src/components/MateCreate.tsx#MateCreateConfirmDialog',
    'src/components/MateCreate.tsx#MateCreateDescriptionStep',
    'src/components/MateCreate.tsx#MateCreateMatchStep',
    'src/components/MateCreate.tsx#MateCreateSeatStep',
    'src/components/MateCreate.tsx#MateCreateStepFallback',
    'src/components/MateCreate.tsx#MateCreateTicketStep',
    'src/components/MateCreate.tsx#VerificationRequiredDialog',
  ];
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entries = manifest.components.filter(({ id }) => componentIds.includes(id));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === componentIds[0]
  ));

  assert.equal(entries.length, 8);
  assert.ok(entries.every(({ status }) => status === 'registered'));
  assert.equal(scenarios.length, 94);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['single', 'long-korean', 'unbroken-token']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.phase)),
    new Set([
      'ticket-fallback', 'ticket-runtime',
      'match-fallback', 'match-runtime',
      'seat-fallback', 'seat-runtime',
      'description-fallback', 'description-runtime',
      'confirm-fallback', 'confirm-runtime',
      'verification-fallback', 'verification-runtime',
    ]),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.equal(
    scenarios.filter(({ states }) => states.data !== 'single').length,
    4,
  );
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ interactionPlan, variants }) => {
      const target = interactionPlan?.targetId;
      if (variants.phase === 'ticket-runtime') return target === 'back' || target === 'next';
      if (variants.phase === 'match-runtime' || variants.phase === 'seat-runtime') {
        return target === 'back' || target === 'prev' || target === 'next';
      }
      return variants.phase === 'description-runtime'
        && (target === 'back' || target === 'prev' || target === 'submit');
    }));
  const hostedCounts = Object.fromEntries(entries
    .filter(({ id }) => id !== componentIds[0])
    .map(({ id, render }) => [id, render?.hostScenarioIds?.length]));
  assert.deepEqual(hostedCounts, {
    'src/components/MateCreate.tsx#MateCreateConfirmDialog': 4,
    'src/components/MateCreate.tsx#MateCreateDescriptionStep': 4,
    'src/components/MateCreate.tsx#MateCreateMatchStep': 4,
    'src/components/MateCreate.tsx#MateCreateSeatStep': 4,
    'src/components/MateCreate.tsx#MateCreateStepFallback': 8,
    'src/components/MateCreate.tsx#MateCreateTicketStep': 4,
    'src/components/MateCreate.tsx#VerificationRequiredDialog': 4,
  });
});

test('mate create confirmation covers every valid summary branch, pressure case, and action state', async () => {
  const componentId = 'src/components/MateCreateConfirmDialog.tsx#MateCreateConfirmDialog';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((scenario) => (
    scenario.componentId === componentId
  ));

  assert.equal(scenarios.length, 390);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['single', 'long-korean', 'unbroken-token', 'maximum-supported']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.submission)),
    new Set(['idle', 'pending']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.deposit)),
    new Set(['none', 'present']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.seat)),
    new Set(['detailed', 'legacy-section']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.time)),
    new Set(['fallback', 'provided']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.cheering)),
    new Set(['away', 'home', 'neutral']),
  );
  assert.equal(scenarios.filter(({ states }) => states.data !== 'single').length, 6);
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ interactionPlan, variants }) => (
      variants.submission === 'idle'
      && (interactionPlan?.targetId === 'cancel' || interactionPlan?.targetId === 'confirm')
    )));
});

test('mate create description covers count thresholds, validation, tag inventory, and mobile interactions', async () => {
  const componentId = 'src/components/MateCreateDescriptionStep.tsx#MateCreateDescriptionStep';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((scenario) => (
    scenario.componentId === componentId
  ));

  assert.equal(scenarios.length, 88);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['empty', 'single', 'long-korean', 'unbroken-token', 'maximum-supported']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.validation)),
    new Set(['none', 'error']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.equal(scenarios.filter(({ states }) => states.data !== 'single').length, 8);
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ states, interactionPlan }) => (
      states.data === 'single'
      && (
        interactionPlan?.targetId === 'description'
        || /^tag-[0-5]$/.test(interactionPlan?.targetId ?? '')
      )
    )));
});

test('mate create match covers transport outcomes, manual fallback, result selection, and pressure', async () => {
  const componentId = 'src/components/MateCreateMatchStep.tsx#MateCreateMatchStep';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((scenario) => (
    scenario.componentId === componentId
  ));

  assert.equal(scenarios.length, 124);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['single', 'long-korean', 'unbroken-token', 'maximum-supported']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.system)),
    new Set(['online', 'offline', 'timeout']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.phase)),
    new Set([
      'date-only', 'loading', 'error', 'manual-empty', 'manual-complete',
      'results-unselected', 'results-selected',
    ]),
  );
  assert.equal(scenarios.filter(({ states }) => states.data !== 'single').length, 6);
  assert.ok(scenarios
    .filter(({ states }) => states.system !== 'online')
    .every(({ variants }) => variants.phase === 'error'));
});

test('mate create page isolates both lazy phases and hosted declarations', async () => {
  const componentIds = [
    'src/components/MateCreatePage.tsx#MateCreateFallback',
    'src/components/MateCreatePage.tsx#MateCreatePage',
    'src/components/MateCreatePage.tsx#MateCreateRuntime',
  ];
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entries = manifest.components.filter(({ id }) => componentIds.includes(id));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === componentIds[1]
  ));

  assert.equal(entries.length, 3);
  assert.ok(entries.every(({ status }) => status === 'registered'));
  assert.equal(scenarios.length, 4);
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.phase)),
    new Set(['fallback', 'runtime']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.ok(entries
    .filter(({ id }) => id !== componentIds[1])
    .every(({ render }) => render?.hostScenarioIds?.length === 2));
});

test('mate detail page isolates both lazy phases and hosts the resolved runtime declaration', async () => {
  const componentIds = [
    'src/components/MateDetail.tsx#MateDetail',
    'src/components/MateDetail.tsx#MateDetailRuntime',
  ];
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entries = manifest.components.filter(({ id }) => componentIds.includes(id));
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => (
    componentId === componentIds[0]
  ));

  assert.equal(entries.length, 2);
  assert.ok(entries.every(({ status }) => status === 'registered'));
  assert.equal(scenarios.length, 4);
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.phase)),
    new Set(['fallback', 'runtime']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.equal(entries[1]?.render?.hostScenarioIds?.length, 2);
});

test('mate detail action dialogs cover both forms, pressure, pending, selection, validation, theme, and controls', () => {
  const componentId = 'src/components/MateDetailActionDialogs.tsx#MateDetailActionDialogs';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => (
    id === componentId
  ));

  assert.equal(scenarios.length, 124);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['single', 'long-korean', 'unbroken-token', 'maximum-supported']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.interactions)),
    new Set(['default', 'hover', 'focus-visible', 'pressed', 'input', 'submitting', 'selected']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.dialog)),
    new Set(['cancel', 'sale']),
  );
  assert.equal(scenarios.filter(({ states }) => states.interactions === 'default').length, 52);
  assert.equal(scenarios.filter(({ states }) => states.interactions === 'selected').length, 4);
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ states, variants }) => (
      states.data === 'single'
      && variants.pending === 'idle'
    )));
});

test('mate detail action-dialog lazy binding hosts every non-interactive form combination', async () => {
  const lazyComponentId = 'src/components/MateDetailContentRuntime.tsx#LazyMateDetailActionDialogs';
  const childComponentId = 'src/components/MateDetailActionDialogs.tsx#MateDetailActionDialogs';
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { mode?: string; hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entry = manifest.components.find(({ id }) => id === lazyComponentId);
  const childScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId, states }) => (
    componentId === childComponentId && states.interactions === 'default'
  ));
  const childScenarioIds = childScenarios.map(({ id }) => id);

  assert.equal(childScenarios.length, 52);
  assert.equal(entry?.status, 'registered');
  assert.equal(entry?.render?.mode, 'hosted');
  assert.equal(entry?.render?.hostScenarioIds?.length, 52);
  assert.deepEqual(
    new Set(entry?.render?.hostScenarioIds),
    new Set(childScenarioIds),
  );
});

test('mate detail action section covers every data-permission pair, owned surface, pending branch, and control', () => {
  const componentId = 'src/components/MateDetailActionSection.tsx#MateDetailActionSection';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => (
    id === componentId
  ));

  assert.equal(scenarios.length, 366);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['single', 'long-korean', 'unbroken-token', 'maximum-supported']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.permissions)),
    new Set([
      'mate-host',
      'mate-member-approved',
      'mate-applicant-pending',
      'mate-applicant-rejected',
      'non-owner',
      'disabled',
    ]),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.interactions)),
    new Set(['default', 'hover', 'focus-visible', 'pressed', 'open', 'keyboard-navigation']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.surface)),
    new Set(['mobile-bar', 'mobile-sheet', 'desktop-rail']),
  );
  assert.deepEqual(Object.fromEntries(
    ['default', 'hover', 'focus-visible', 'pressed', 'open', 'keyboard-navigation'].map((interaction) => [
      interaction,
      scenarios.filter(({ states }) => states.interactions === interaction).length,
    ]),
  ), {
    default: 264,
    hover: 32,
    'focus-visible': 32,
    pressed: 32,
    open: 4,
    'keyboard-navigation': 2,
  });
  const defaultScenarios = scenarios.filter(({ states }) => states.interactions === 'default');
  assert.equal(new Set(defaultScenarios.map(({ states }) => (
    `${states.data}:${states.permissions}`
  ))).size, 24);
  assert.ok(defaultScenarios
    .filter(({ states }) => states.permissions === 'disabled')
    .every(({ variants }) => variants.surface === 'desktop-rail'));
  assert.ok(defaultScenarios
    .filter(({ variants }) => variants.pending === 'share')
    .every(({ states, variants }) => (
      states.permissions === 'mate-host'
      && variants.surface !== 'mobile-bar'
    )));
  assert.ok(defaultScenarios
    .filter(({ variants }) => variants.pending === 'action' && variants.surface === 'mobile-bar')
    .every(({ states }) => states.permissions === 'mate-applicant-pending'));
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ states, variants }) => (
      states.data === 'single'
      && states.permissions === 'mate-host'
      && variants.actions === 'maximum'
      && variants.pending === 'idle'
    )));
});

test('mate detail action-section lazy binding hosts the resolved light and dark handoff', async () => {
  const componentId = 'src/components/MateDetailContentRuntime.tsx#LazyMateDetailActionSection';
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { mode?: string; hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entry = manifest.components.find(({ id }) => id === componentId);
  const expectedHostScenarioIds = [
    'state:src/components/MateDetailActionSection.tsx#MateDetailActionSection:data=single|permissions=mate-host|interactions=default|variant.actions=maximum|variant.pending=idle|variant.surface=desktop-rail|variant.theme=light',
    'state:src/components/MateDetailActionSection.tsx#MateDetailActionSection:data=single|permissions=mate-host|interactions=default|variant.actions=maximum|variant.pending=idle|variant.surface=desktop-rail|variant.theme=dark',
  ];

  assert.equal(entry?.status, 'registered');
  assert.equal(entry?.render?.mode, 'hosted');
  assert.deepEqual(entry?.render?.hostScenarioIds, expectedHostScenarioIds);
});

test('mate host reviews modal covers every query outcome, pressure state, theme, and close control', () => {
  const componentId = 'src/components/MateHostReviewsModal.tsx#MateHostReviewsModal';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => (
    id === componentId
  ));

  assert.equal(scenarios.length, 26);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set([
      'loading',
      'error-503',
      'empty',
      'single',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
    ]),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.interactions)),
    new Set(['default', 'hover', 'focus-visible', 'pressed']),
  );
  assert.equal(scenarios.filter(({ states }) => states.interactions === 'default').length, 14);
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ states }) => states.data === 'single' && states.system === 'online'));
});

test('mate host reviews lazy binding hosts every non-interactive query outcome', async () => {
  const lazyComponentId = 'src/components/MateDetailInfoSections.tsx#LazyMateHostReviewsModal';
  const childComponentId = 'src/components/MateHostReviewsModal.tsx#MateHostReviewsModal';
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { mode?: string; hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entry = manifest.components.find(({ id }) => id === lazyComponentId);
  const childScenarioIds = AUTOMATIC_COMPONENT_STATE_SCENARIOS
    .filter(({ componentId, states }) => (
      componentId === childComponentId && states.interactions === 'default'
    ))
    .map(({ id }) => id);

  assert.equal(childScenarioIds.length, 14);
  assert.equal(entry?.status, 'registered');
  assert.equal(entry?.render?.mode, 'hosted');
  assert.deepEqual(
    new Set(entry?.render?.hostScenarioIds),
    new Set(childScenarioIds),
  );
});

test('mate detail reviews cover every admitted permission, query outcome, pressure state, theme, and control', () => {
  const componentId = 'src/components/MateDetailReviewsSection.tsx#MateDetailReviewsSection';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => (
    id === componentId
  ));

  assert.equal(scenarios.length, 54);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set([
      'loading',
      'error-503',
      'empty',
      'single',
      'reviewed',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
    ]),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.permissions)),
    new Set(['host', 'approved-member']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.interactions)),
    new Set(['default', 'hover', 'focus-visible', 'pressed']),
  );
  assert.equal(scenarios.filter(({ states }) => states.interactions === 'default').length, 30);
  assert.equal(scenarios.filter(({ states }) => states.interactions !== 'default').length, 24);
  assert.ok(scenarios
    .filter(({ states }) => states.data === 'maximum-supported')
    .every(({ states }) => states.permissions === 'host'));
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ states, interactionPlan }) => (
      (states.data === 'single'
        && states.system === 'online'
        && interactionPlan?.targetId === 'write-review')
      || (states.data === 'error-503'
        && states.system === 'offline'
        && interactionPlan?.targetId === 'retry')
    )));
});

test('mate detail seat view covers every photo count, pressure state, theme, and both controls', () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#MateDetailSeatViewBlock';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => (
    id === componentId
  ));

  assert.equal(scenarios.length, 22);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['empty', 'single', 'long-korean', 'unbroken-token', 'maximum-supported']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.interactions)),
    new Set(['default', 'hover', 'focus-visible', 'pressed']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.equal(scenarios.filter(({ states }) => states.interactions === 'default').length, 10);
  assert.equal(scenarios.filter(({ states }) => states.interactions !== 'default').length, 12);
  assert.deepEqual(
    new Set(scenarios
      .filter(({ states }) => states.interactions !== 'default')
      .map(({ interactionPlan }) => interactionPlan?.targetId)),
    new Set(['photo-gallery', 'official-map']),
  );
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ states }) => states.data === 'single'));
});

test('mate detail host covers every identity, image, metric pressure, theme, and both controls', () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#MateDetailHostBlock';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => (
    id === componentId
  ));

  assert.equal(scenarios.length, 26);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set([
      'empty',
      'single',
      'unverified',
      'broken-image',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
    ]),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.interactions)),
    new Set(['default', 'hover', 'focus-visible', 'pressed']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.equal(scenarios.filter(({ states }) => states.interactions === 'default').length, 14);
  assert.equal(scenarios.filter(({ states }) => states.interactions !== 'default').length, 12);
  assert.deepEqual(
    new Set(scenarios
      .filter(({ states }) => states.interactions !== 'default')
      .map(({ interactionPlan }) => interactionPlan?.targetId)),
    new Set(['chat', 'profile']),
  );
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ states }) => states.data === 'single'));
});

test('mate detail intro covers optional copy, verification, pressure, maximum tags, and both themes', () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#MateDetailIntroBlock';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => (
    id === componentId
  ));

  assert.equal(scenarios.length, 12);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set([
      'empty',
      'single',
      'unverified',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
    ]),
  );
  assert.ok(scenarios.every(({ states }) => states.interactions === undefined));
  assert.ok(scenarios.every(({ states }) => states.permissions === undefined));
  assert.ok(scenarios.every(({ states }) => states.system === undefined));
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
});

test('mate detail review covers empty, rating bounds, pressure, maximum inventory, action availability, and themes', () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#MateDetailReviewBlock';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => (
    id === componentId
  ));

  assert.equal(scenarios.length, 24);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set([
      'empty',
      'single',
      'missing-host-handle',
      'no-comment',
      'rating-below-minimum',
      'rating-above-maximum',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
    ]),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.interactions)),
    new Set(['default', 'hover', 'focus-visible', 'pressed']),
  );
  assert.equal(scenarios.filter(({ states }) => states.interactions === 'default').length, 18);
  assert.equal(scenarios.filter(({ states }) => states.interactions !== 'default').length, 6);
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ states, interactionPlan }) => (
      states.data === 'single' && interactionPlan?.targetId === 'open-reviews'
    )));
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
});

test('mate detail reference card covers empty, normal, Korean, unbroken content, and both themes', () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#MateDetailReferenceCard';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => (
    id === componentId
  ));

  assert.equal(scenarios.length, 8);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['empty', 'single', 'long-korean', 'unbroken-token']),
  );
  assert.ok(scenarios.every(({ states }) => states.interactions === undefined));
  assert.ok(scenarios.every(({ states }) => states.permissions === undefined));
  assert.ok(scenarios.every(({ states }) => states.system === undefined));
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
});

test('mate detail hero covers date and matchup pressure, both layouts, favorite states, themes, and toggle feedback', () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#MateDetailHeroBlock';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => (
    id === componentId
  ));

  assert.equal(scenarios.length, 46);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['single', 'invalid-date', 'long-korean', 'unbroken-token', 'unknown-team']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.interactions)),
    new Set(['default', 'hover', 'focus-visible', 'pressed']),
  );
  assert.deepEqual(new Set(scenarios.map(({ variants }) => variants.layout)), new Set(['full', 'compact']));
  assert.deepEqual(new Set(scenarios.map(({ variants }) => variants.favorite)), new Set(['off', 'on']));
  assert.deepEqual(new Set(scenarios.map(({ variants }) => variants.theme)), new Set(['light', 'dark']));
  assert.equal(scenarios.filter(({ states }) => states.interactions === 'default').length, 40);
  assert.equal(scenarios.filter(({ states }) => states.interactions !== 'default').length, 6);
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ states, variants, interactionPlan }) => (
      states.data === 'single'
      && variants.layout === 'full'
      && variants.favorite === 'off'
      && interactionPlan?.targetId === 'favorite'
  )));
});

test('mate detail participation covers bounded capacity, roster pressure, every status tone, and both themes', () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#MateDetailParticipationBlock';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => (
    id === componentId
  ));

  assert.equal(scenarios.length, 26);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set([
      'zero',
      'single',
      'full',
      'roster-provided',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
      'status-matched',
      'status-failed',
      'status-selling',
      'status-sold',
      'status-checked-in',
      'status-completed',
    ]),
  );
  assert.ok(scenarios.every(({ states }) => states.interactions === undefined));
  assert.ok(scenarios.every(({ states }) => states.permissions === undefined));
  assert.ok(scenarios.every(({ states }) => states.system === undefined));
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
});

test('mate detail price covers missing and zero values, payment branches, sale mode, maximum currency, and themes', () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#MateDetailPriceBox';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => (
    id === componentId
  ));

  assert.equal(scenarios.length, 14);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['zero', 'missing', 'ticket-only', 'deposit-only', 'deposit-ticket', 'selling', 'maximum-supported']),
  );
  assert.ok(scenarios.every(({ states }) => states.interactions === undefined));
  assert.ok(scenarios.every(({ states }) => states.permissions === undefined));
  assert.ok(scenarios.every(({ states }) => states.system === undefined));
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
});

test('mate detail QR hint covers locked and available permissions, themes, and available interactions', () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#MateDetailQrHint';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => (
    id === componentId
  ));

  assert.equal(scenarios.length, 10);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.permissions)),
    new Set(['locked', 'check-in-access']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.interactions)),
    new Set(['default', 'hover', 'focus-visible', 'pressed']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.equal(scenarios.filter(({ states }) => states.interactions === 'default').length, 4);
  assert.equal(scenarios.filter(({ states }) => states.interactions !== 'default').length, 6);
  assert.ok(scenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ states, interactionPlan }) => (
      states.permissions === 'check-in-access'
      && interactionPlan?.targetId === 'open'
    )));
});

test('mate detail reference badge hosts pressure, metric, hashtag, and theme evidence from registered leaves', async () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#ReferenceBadge';
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { mode?: string; hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entry = manifest.components.find(({ id }) => id === componentId);
  const expectedHostScenarioIds = [
    'state:src/components/MateDetailReferenceBlocks.tsx#MateDetailSeatViewBlock:data=unbroken-token|interactions=default|variant.theme=light',
    'state:src/components/MateDetailReferenceBlocks.tsx#MateDetailSeatViewBlock:data=unbroken-token|interactions=default|variant.theme=dark',
    'state:src/components/MateDetailReferenceBlocks.tsx#MateDetailHostBlock:data=maximum-supported|interactions=default|variant.theme=light',
    'state:src/components/MateDetailReferenceBlocks.tsx#MateDetailHostBlock:data=maximum-supported|interactions=default|variant.theme=dark',
    'state:src/components/MateDetailReferenceBlocks.tsx#MateDetailIntroBlock:data=maximum-supported|variant.theme=light',
    'state:src/components/MateDetailReferenceBlocks.tsx#MateDetailIntroBlock:data=maximum-supported|variant.theme=dark',
  ];
  const executableScenarioIds = new Set(AUTOMATIC_COMPONENT_STATE_SCENARIOS.map(({ id }) => id));

  assert.equal(entry?.status, 'registered');
  assert.equal(entry?.render?.mode, 'hosted');
  assert.deepEqual(entry?.render?.hostScenarioIds, expectedHostScenarioIds);
  assert.ok(expectedHostScenarioIds.every((id) => executableScenarioIds.has(id)));
});

test('mate detail section title hosts plain, badge-extra, action-extra, pressure, and theme evidence', async () => {
  const componentId = 'src/components/MateDetailReferenceBlocks.tsx#SectionTitle';
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { mode?: string; hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entry = manifest.components.find(({ id }) => id === componentId);
  const expectedHostScenarioIds = [
    'state:src/components/MateDetailReferenceBlocks.tsx#MateDetailSeatViewBlock:data=unbroken-token|interactions=default|variant.theme=light',
    'state:src/components/MateDetailReferenceBlocks.tsx#MateDetailSeatViewBlock:data=unbroken-token|interactions=default|variant.theme=dark',
    'state:src/components/MateDetailReferenceBlocks.tsx#MateDetailIntroBlock:data=long-korean|variant.theme=light',
    'state:src/components/MateDetailReferenceBlocks.tsx#MateDetailIntroBlock:data=long-korean|variant.theme=dark',
    'state:src/components/MateDetailReferenceBlocks.tsx#MateDetailReviewBlock:data=maximum-supported|interactions=default|variant.theme=light',
    'state:src/components/MateDetailReferenceBlocks.tsx#MateDetailReviewBlock:data=maximum-supported|interactions=default|variant.theme=dark',
  ];
  const executableScenarioIds = new Set(AUTOMATIC_COMPONENT_STATE_SCENARIOS.map(({ id }) => id));

  assert.equal(entry?.status, 'registered');
  assert.equal(entry?.render?.mode, 'hosted');
  assert.deepEqual(entry?.render?.hostScenarioIds, expectedHostScenarioIds);
  assert.ok(expectedHostScenarioIds.every((id) => executableScenarioIds.has(id)));
});

test('mate detail inline badge hosts the reviewed light and dark handoff', async () => {
  const componentId = 'src/components/MateDetailReviewsSection.tsx#InlineBadge';
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { mode?: string; hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entry = manifest.components.find(({ id }) => id === componentId);
  const expectedHostScenarioIds = [
    'state:src/components/MateDetailReviewsSection.tsx#MateDetailReviewsSection:data=reviewed|permissions=approved-member|interactions=default|system=online|variant.theme=light',
    'state:src/components/MateDetailReviewsSection.tsx#MateDetailReviewsSection:data=reviewed|permissions=approved-member|interactions=default|system=online|variant.theme=dark',
  ];

  assert.equal(entry?.status, 'registered');
  assert.equal(entry?.render?.mode, 'hosted');
  assert.deepEqual(entry?.render?.hostScenarioIds, expectedHostScenarioIds);
});

test('mate detail reviews lazy binding hosts every non-interactive admitted combination', async () => {
  const lazyComponentId = 'src/components/MateDetailInfoSections.tsx#LazyMateDetailReviewsSection';
  const childComponentId = 'src/components/MateDetailReviewsSection.tsx#MateDetailReviewsSection';
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { mode?: string; hostScenarioIds?: string[] };
      status: string;
    }>;
  };
  const entry = manifest.components.find(({ id }) => id === lazyComponentId);
  const childScenarioIds = AUTOMATIC_COMPONENT_STATE_SCENARIOS
    .filter(({ componentId, states }) => (
      componentId === childComponentId && states.interactions === 'default'
    ))
    .map(({ id }) => id);

  assert.equal(childScenarioIds.length, 30);
  assert.equal(entry?.status, 'registered');
  assert.equal(entry?.render?.mode, 'hosted');
  assert.deepEqual(
    new Set(entry?.render?.hostScenarioIds),
    new Set(childScenarioIds),
  );
});

test('mate create field label covers pressure copy and every production presentation branch', () => {
  const componentId = 'src/components/MateCreatePrimitives.tsx#FieldLabel';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((scenario) => (
    scenario.componentId === componentId
  ));

  assert.equal(scenarios.length, 48);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['single', 'long-korean', 'unbroken-token']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.association)),
    new Set(['associated', 'unassociated']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.emphasis)),
    new Set(['default', 'prominent']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.required)),
    new Set(['optional', 'required']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
});

test('mate create seat pricing covers numeric boundaries, copy pressure, themes, and every control', () => {
  const componentId = 'src/components/MateCreateSeatPricingFields.tsx#MateCreateSeatPricingFields';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((scenario) => (
    scenario.componentId === componentId
  ));

  assert.equal(scenarios.length, 228);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['empty', 'single', 'long-korean', 'unbroken-token']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.participants)),
    new Set(['two', 'three', 'four']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.ticket)),
    new Set(['empty', 'ordinary', 'maximum-supported']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.deposit)),
    new Set(['empty', 'ordinary', 'maximum-supported']),
  );
  assert.deepEqual(Object.fromEntries(
    ['default', 'focus-visible', 'input', 'keyboard-navigation'].map((interaction) => [
      interaction,
      scenarios.filter(({ states }) => states.interactions === interaction).length,
    ]),
  ), {
    default: 216,
    'focus-visible': 6,
    input: 4,
    'keyboard-navigation': 2,
  });
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.ok(scenarios
    .filter(({ states }) => states.interactions === 'keyboard-navigation')
    .every(({ interactionPlan }) => (
      interactionPlan?.key === '3'
      &&
      interactionPlan?.waitForSelector
      === '[data-testid="mate-create-max-participants"][data-selected-value="3"]'
    )));
});

test('mate create seat selection covers every production inventory, selection, pressure state, and control', () => {
  const componentId = 'src/components/MateCreateSeatSelectionFields.tsx#MateCreateSeatSelectionFields';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((scenario) => (
    scenario.componentId === componentId
  ));

  assert.equal(scenarios.length, 1_758);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['empty', 'single', 'long-korean', 'unbroken-token']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.inventory)),
    new Set(['jamsil-daegu', 'incheon', 'gwangju-all', 'suwon', 'changwon', 'sajik', 'gocheok', 'daejeon']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.category)),
    new Set(['none', 'cheering', 'table', 'premium', 'exciting', 'comfort', 'special', 'outfield']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.cheering)),
    new Set(['none', 'home', 'neutral', 'away']),
  );
  assert.deepEqual(Object.fromEntries(
    ['default', 'focus-visible', 'hover', 'pressed', 'selected', 'input', 'keyboard-navigation']
      .map((interaction) => [
        interaction,
        scenarios.filter(({ states }) => states.interactions === interaction).length,
      ]),
  ), {
    default: 1_632,
    'focus-visible': 26,
    hover: 20,
    pressed: 20,
    selected: 34,
    input: 6,
    'keyboard-navigation': 20,
  });
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.ok(scenarios
    .filter(({ states }) => states.interactions === 'keyboard-navigation')
    .every(({ interactionPlan }) => interactionPlan?.key === 'Enter'));
});

test('mate create seat step covers every lazy-boundary composition and hosts its internal visuals', async () => {
  const componentIds = [
    'src/components/MateCreateSeatStep.tsx#MateCreateSeatPricingFields',
    'src/components/MateCreateSeatStep.tsx#MateCreateSeatSelectionFields',
    'src/components/MateCreateSeatStep.tsx#MateCreateSeatStep',
    'src/components/MateCreateSeatStep.tsx#SeatStepFallback',
  ];
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((scenario) => (
    scenario.componentId === componentIds[2]
  ));
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { hostScenarioIds?: string[]; mode?: string };
      status: string;
    }>;
  };
  const entries = componentIds.map((id) => manifest.components.find((entry) => entry.id === id));

  assert.ok(entries.every((entry) => entry?.status === 'registered'));
  assert.equal(entries[2]?.render?.mode, 'direct');
  assert.equal(scenarios.length, 32);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['empty', 'single', 'long-korean', 'unbroken-token', 'maximum-supported']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.selection)),
    new Set(['fallback', 'runtime']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.pricing)),
    new Set(['fallback', 'runtime']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.equal(entries[0]?.render?.hostScenarioIds?.length, 4);
  assert.equal(entries[1]?.render?.hostScenarioIds?.length, 4);
  assert.equal(entries[3]?.render?.hostScenarioIds?.length, 4);
});

test('mate create ticket step covers every reachable scanner, validation, pressure, theme, and control state', async () => {
  const componentId = 'src/components/MateCreateTicketStep.tsx#MateCreateTicketStep';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((scenario) => (
    scenario.componentId === componentId
  ));
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { adapterId?: string; mode?: string };
      status: string;
    }>;
  };
  const entry = manifest.components.find((candidate) => candidate.id === componentId);

  assert.equal(entry?.status, 'registered');
  assert.equal(entry?.render?.mode, 'direct');
  assert.equal(entry?.render?.adapterId, 'mate.create-ticket-step');
  assert.equal(scenarios.length, 42);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['empty', 'single', 'long-korean', 'unbroken-token']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.phase)),
    new Set(['idle', 'scanning', 'scan-error', 'validation-size', 'validation-type']),
  );
  assert.deepEqual(Object.fromEntries(
    ['default', 'focus-visible', 'hover', 'pressed'].map((interaction) => [
      interaction,
      scenarios.filter(({ states }) => states.interactions === interaction).length,
    ]),
  ), {
    default: 24,
    'focus-visible': 6,
    hover: 6,
    pressed: 6,
  });
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.equal(
    scenarios.filter(({ interactionPlan }) => interactionPlan?.targetId === 'picker-idle').length,
    6,
  );
  assert.equal(
    scenarios.filter(({ interactionPlan }) => interactionPlan?.targetId === 'picker-scan-error').length,
    6,
  );
  assert.equal(
    scenarios.filter(({ interactionPlan }) => interactionPlan?.targetId === 'retry').length,
    6,
  );
  assert.equal(new Set(scenarios.map(({ id }) => id)).size, 42);
});

test('mate date rail covers every supported density, selection boundary, expansion, theme, and control state', async () => {
  const componentId = 'src/components/MateDateRailFilter.tsx#MateDateRailFilter';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((scenario) => (
    scenario.componentId === componentId
  ));
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { adapterId?: string; mode?: string };
      status: string;
    }>;
  };
  const entry = manifest.components.find((candidate) => candidate.id === componentId);

  assert.equal(entry?.status, 'registered');
  assert.equal(entry?.render?.mode, 'direct');
  assert.equal(entry?.render?.adapterId, 'mate.date-rail-filter');
  assert.equal(scenarios.length, 106);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set(['empty', 'single', 'boundary-maximum', 'maximum-supported']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.selection)),
    new Set(['all', 'first', 'eighth', 'ninth', 'last', 'outside-range']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.expansion)),
    new Set(['collapsed', 'expanded']),
  );
  assert.deepEqual(Object.fromEntries(
    ['default', 'focus-visible', 'hover', 'pressed', 'selected'].map((interaction) => [
      interaction,
      scenarios.filter(({ states }) => states.interactions === interaction).length,
    ]),
  ), {
    default: 42,
    'focus-visible': 16,
    hover: 16,
    pressed: 16,
    selected: 16,
  });
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.theme)),
    new Set(['light', 'dark']),
  );
  assert.equal(new Set(scenarios.map(({ id }) => id)).size, 106);
});

test('admin client-error detail covers every badge pair, pressure state, lifecycle, and dialog control', async () => {
  const componentId = 'src/components/admin/ClientErrorAdminDetailRuntime.tsx#ClientErrorAdminDetailRuntime';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((scenario) => (
    scenario.componentId === componentId
  ));
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { adapterId?: string; mode?: string };
      status: string;
    }>;
  };
  const entry = manifest.components.find((candidate) => candidate.id === componentId);

  assert.equal(entry?.status, 'registered');
  assert.equal(entry?.render?.mode, 'direct');
  assert.equal(entry?.render?.adapterId, 'admin.client-error-detail');
  assert.equal(scenarios.length, 104);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set([
      'empty',
      'populated',
      'null-optional',
      'boundary-minimum',
      'boundary-maximum',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
    ]),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.system)),
    new Set(['idle', 'loading', 'missing']),
  );
  assert.deepEqual(Object.fromEntries(
    ['default', 'focus-visible', 'hover', 'pressed'].map((interaction) => [
      interaction,
      scenarios.filter(({ states }) => states.interactions === interaction).length,
    ]),
  ), {
    default: 98,
    'focus-visible': 2,
    hover: 2,
    pressed: 2,
  });
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.bucket)),
    new Set(['api', 'runtime', 'feedback']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.source)),
    new Set(['api', 'runtime', 'unhandled_rejection', 'unknown']),
  );
  assert.ok(scenarios.every(({ states, variants }) => (
    states.permissions === 'admin'
      && variants.theme === 'dark'
      && variants.visibility === 'open'
  )));
  assert.equal(scenarios.filter(({ states }) => states.system === 'idle').length, 102);
  assert.equal(scenarios.filter(({ states }) => states.system === 'loading').length, 1);
  assert.equal(scenarios.filter(({ states }) => states.system === 'missing').length, 1);
  assert.equal(
    scenarios.filter(({ states }) => (
      states.system === 'idle' && states.interactions === 'default'
    )).length,
    96,
  );
  assert.deepEqual(
    new Set(scenarios
      .filter(({ states }) => states.interactions !== 'default')
      .map(({ interactionPlan }) => interactionPlan?.targetId)),
    new Set(['close', 'recent']),
  );
  assert.equal(new Set(scenarios.map(({ id }) => id)).size, 104);
});

test('admin client-error trend chart covers exactly nine direct mobile states', async () => {
  const componentId = 'src/components/admin/ClientErrorTrendChart.tsx#ClientErrorTrendChart';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((scenario) => (
    scenario.componentId === componentId
  ));
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { adapterId?: string; mode?: string };
      status: string;
    }>;
  };
  const entry = manifest.components.find((candidate) => candidate.id === componentId);
  const expectedIds = new Set([
    ...[
      'empty',
      'single',
      'boundary-minimum',
      'boundary-maximum',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
      'zero',
    ].map((data) => (
      `state:${componentId}:data=${data}|system=idle|variant.theme=dark`
    )),
    `state:${componentId}:data=empty|system=loading|variant.theme=dark`,
  ]);

  assert.equal(entry?.status, 'registered');
  assert.equal(entry?.render?.mode, 'direct');
  assert.equal(entry?.render?.adapterId, 'admin.client-error-trend-chart');
  assert.equal(scenarios.length, 9);
  assert.deepEqual(new Set(scenarios.map(({ id }) => id)), expectedIds);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set([
      'empty',
      'single',
      'boundary-minimum',
      'boundary-maximum',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
      'zero',
    ]),
  );
  assert.equal(scenarios.filter(({ states }) => states.system === 'idle').length, 8);
  assert.equal(scenarios.filter(({ states }) => states.system === 'loading').length, 1);
  assert.ok(scenarios.every(({ states, variants, interactionPlan }) => (
    states.permissions === undefined
      && states.interactions === undefined
      && variants.theme === 'dark'
      && interactionPlan === undefined
  )));
  assert.equal(new Set(scenarios.map(({ stateCombinationId }) => stateCombinationId)).size, 9);
});

test('admin community leaf panels cover exactly 18 mates, 18 posts, and 31 users states', async () => {
  const componentIds = {
    mates: 'src/components/admin/MatesAdminPanel.tsx#MatesAdminPanel',
    posts: 'src/components/admin/PostsAdminPanel.tsx#PostsAdminPanel',
    users: 'src/components/admin/UsersAdminPanel.tsx#UsersAdminPanel',
  } as const;
  const scenariosByPanel = Object.fromEntries(Object.entries(componentIds).map(([key, id]) => [
    key,
    AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => componentId === id),
  ])) as Record<keyof typeof componentIds, typeof AUTOMATIC_COMPONENT_STATE_SCENARIOS>;
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { adapterId?: string; mode?: string };
      status: string;
    }>;
  };
  const entryById = new Map(manifest.components.map((entry) => [entry.id, entry]));
  const matesData = [
    'empty',
    'single',
    'populated',
    'boundary-minimum',
    'boundary-maximum',
    'long-korean',
    'unbroken-token',
    'maximum-supported',
  ];
  const nullableData = [
    'empty',
    'single',
    'null-optional',
    'boundary-minimum',
    'boundary-maximum',
    'long-korean',
    'unbroken-token',
    'maximum-supported',
  ];
  const panelExpectedIds = (componentId: string, dataStates: string[]) => new Set([
    ...dataStates.map((data) => (
      `state:${componentId}:data=${data}|interactions=default|variant.theme=dark`
    )),
    ...['hover', 'focus-visible', 'pressed'].flatMap((interaction) => (
      ['delete', 'dialog-cancel', 'dialog-confirm'].map((target) => (
        `state:${componentId}:data=maximum-supported|interactions=${interaction}|variant.theme=dark|interactionTarget=${target}`
      ))
    )),
    `state:${componentId}:data=maximum-supported|interactions=open|variant.theme=dark|interactionTarget=delete`,
  ]);
  const usersExpectedIds = new Set([
    ...nullableData.flatMap((data) => ['admin', 'super-admin'].map((permissions) => (
      `state:${componentIds.users}:data=${data}|permissions=${permissions}|interactions=default|system=idle|variant.theme=dark`
    ))),
    `state:${componentIds.users}:data=empty|permissions=admin|interactions=default|system=loading|variant.theme=dark`,
    ...['hover', 'pressed'].flatMap((interaction) => (
      ['delete', 'dialog-cancel', 'dialog-confirm'].map((target) => (
        `state:${componentIds.users}:data=maximum-supported|permissions=super-admin|interactions=${interaction}|system=idle|variant.theme=dark|interactionTarget=${target}`
      ))
    )),
    ...['search', 'role-select', 'delete', 'dialog-cancel', 'dialog-confirm'].map((target) => (
      `state:${componentIds.users}:data=maximum-supported|permissions=super-admin|interactions=focus-visible|system=idle|variant.theme=dark|interactionTarget=${target}`
    )),
    `state:${componentIds.users}:data=maximum-supported|permissions=super-admin|interactions=input|system=idle|variant.theme=dark|interactionTarget=search`,
    `state:${componentIds.users}:data=maximum-supported|permissions=super-admin|interactions=change|system=idle|variant.theme=dark|interactionTarget=role-select`,
    `state:${componentIds.users}:data=maximum-supported|permissions=super-admin|interactions=open|system=idle|variant.theme=dark|interactionTarget=delete`,
  ]);

  assert.equal(entryById.get(componentIds.mates)?.status, 'registered');
  assert.equal(entryById.get(componentIds.mates)?.render?.mode, 'direct');
  assert.equal(entryById.get(componentIds.mates)?.render?.adapterId, 'admin.mates-panel');
  assert.equal(entryById.get(componentIds.posts)?.status, 'registered');
  assert.equal(entryById.get(componentIds.posts)?.render?.mode, 'direct');
  assert.equal(entryById.get(componentIds.posts)?.render?.adapterId, 'admin.posts-panel');
  assert.equal(entryById.get(componentIds.users)?.status, 'registered');
  assert.equal(entryById.get(componentIds.users)?.render?.mode, 'direct');
  assert.equal(entryById.get(componentIds.users)?.render?.adapterId, 'admin.users-panel');

  assert.equal(scenariosByPanel.mates.length, 18);
  assert.equal(scenariosByPanel.posts.length, 18);
  assert.equal(scenariosByPanel.users.length, 31);
  assert.deepEqual(new Set(scenariosByPanel.mates.map(({ id }) => id)), panelExpectedIds(componentIds.mates, matesData));
  assert.deepEqual(new Set(scenariosByPanel.posts.map(({ id }) => id)), panelExpectedIds(componentIds.posts, nullableData));
  assert.deepEqual(new Set(scenariosByPanel.users.map(({ id }) => id)), usersExpectedIds);

  const combined = [
    ...scenariosByPanel.mates,
    ...scenariosByPanel.posts,
    ...scenariosByPanel.users,
  ];
  assert.equal(combined.length, 67);
  assert.equal(new Set(combined.map(({ id }) => id)).size, 67);
  assert.ok(combined.every(({ variants }) => variants.theme === 'dark'));
  assert.deepEqual(
    Object.fromEntries(['default', 'hover', 'focus-visible', 'pressed', 'open'].map((interaction) => [
      interaction,
      scenariosByPanel.mates.filter(({ states }) => states.interactions === interaction).length,
    ])),
    { default: 8, hover: 3, 'focus-visible': 3, pressed: 3, open: 1 },
  );
  assert.deepEqual(
    Object.fromEntries(['default', 'hover', 'focus-visible', 'pressed', 'input', 'change', 'open'].map((interaction) => [
      interaction,
      scenariosByPanel.users.filter(({ states }) => states.interactions === interaction).length,
    ])),
    { default: 17, hover: 3, 'focus-visible': 5, pressed: 3, input: 1, change: 1, open: 1 },
  );
  const roleChangeScenario = scenariosByPanel.users.find(({ states }) => (
    states.interactions === 'change'
  ));
  assert.deepEqual({
    key: roleChangeScenario?.interactionPlan?.key,
    waitForSelector: roleChangeScenario?.interactionPlan?.waitForSelector,
  }, {
    key: 'ArrowDown',
    waitForSelector: '[data-testid="admin-user-role-trigger-1"]:has(option[value="ROLE_ADMIN"]:checked)',
  });
  assert.ok(combined
    .filter(({ interactionPlan }) => interactionPlan?.targetId?.startsWith('dialog-'))
    .every(({ interactionPlan }) => interactionPlan?.setup?.[0]?.selector.includes('-delete-1')));
});

test('admin client-error insights covers exactly 98 inventory, pressure, and alert badge states', async () => {
  const componentId = 'src/components/admin/ClientErrorAdminInsightsRuntime.tsx#ClientErrorAdminInsightsRuntime';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((scenario) => (
    scenario.componentId === componentId
  ));
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { adapterId?: string; mode?: string };
      status: string;
    }>;
  };
  const entry = manifest.components.find((candidate) => candidate.id === componentId);

  assert.equal(entry?.status, 'registered');
  assert.equal(entry?.render?.mode, 'direct');
  assert.equal(entry?.render?.adapterId, 'admin.client-error-insights');
  assert.equal(scenarios.length, 98);
  assert.deepEqual(
    new Set(scenarios.map(({ states }) => states.data)),
    new Set([
      'empty',
      'populated',
      'null-optional',
      'boundary-minimum',
      'boundary-maximum',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
    ]),
  );
  assert.deepEqual(Object.fromEntries(
    ['none', 'feedback-only', 'alerts-only', 'both'].map((inventory) => [
      inventory,
      scenarios.filter(({ variants }) => variants.inventory === inventory).length,
    ]),
  ), {
    none: 1,
    'feedback-only': 1,
    'alerts-only': 12,
    both: 84,
  });
  assert.deepEqual(Object.fromEntries(
    [
      'empty',
      'populated',
      'null-optional',
      'boundary-minimum',
      'boundary-maximum',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
    ].map((data) => [
      data,
      scenarios.filter(({ states }) => states.data === data).length,
    ]),
  ), {
    empty: 1,
    populated: 25,
    'null-optional': 12,
    'boundary-minimum': 12,
    'boundary-maximum': 12,
    'long-korean': 12,
    'unbroken-token': 12,
    'maximum-supported': 12,
  });
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.bucket)),
    new Set(['api', 'runtime', 'feedback']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.channel)),
    new Set(['telegram', 'slack']),
  );
  assert.deepEqual(
    new Set(scenarios.map(({ variants }) => variants.delivery)),
    new Set(['sent', 'failed']),
  );
  assert.ok(scenarios.every(({ states, variants }) => (
    states.permissions === 'admin'
      && states.interactions === undefined
      && states.system === undefined
      && variants.theme === 'dark'
  )));
  assert.equal(new Set(scenarios.map(({ id }) => id)).size, 98);
});

test('admin client-error panel covers exactly 82 parent scenarios and every hosted leaf', async () => {
  const componentId = 'src/components/admin/ClientErrorAdminPanel.tsx#ClientErrorAdminPanel';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((scenario) => (
    scenario.componentId === componentId
  ));
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { adapterId?: string; hostScenarioIds?: string[]; mode?: string };
      status: string;
    }>;
  };
  const defaultScenarios = scenarios.filter(({ states }) => states.interactions === 'default');
  const interactionScenarios = scenarios.filter(({ states }) => states.interactions !== 'default');
  const dataPresets = new Set([
    'none-empty',
    'dashboard-only-empty', 'dashboard-only-populated',
    'dashboard-only-null-optional', 'dashboard-only-boundary-minimum',
    'dashboard-only-boundary-maximum', 'dashboard-only-long-korean',
    'dashboard-only-unbroken-token', 'dashboard-only-maximum-supported',
    'events-only-populated', 'events-only-null-optional',
    'events-only-boundary-minimum', 'events-only-boundary-maximum',
    'events-only-long-korean', 'events-only-unbroken-token',
    'events-only-maximum-supported',
    'both-populated', 'both-null-optional', 'both-boundary-minimum',
    'both-boundary-maximum', 'both-long-korean',
    'both-unbroken-token', 'both-maximum-supported',
  ]);
  const lifecyclePresets = new Set([
    'inactive', 'dashboard-loading', 'events-loading', 'refresh-loading',
    'panel-error', 'detail-error',
  ]);
  const lazyPresets = new Set([
    'chart-fallback', 'insights-deferred-fallback',
    'insights-suspense-fallback', 'detail-suspense-fallback',
    'detail-resolved-loading', 'detail-resolved-populated',
  ]);
  const valuePresets = new Set([
    'window-1h', 'window-7d', 'page-middle', 'page-last',
    'filter-bucket-api', 'filter-bucket-runtime', 'filter-source-api',
    'filter-source-runtime', 'filter-source-unhandled-rejection',
    'filter-status-5xx', 'filter-status-4xx', 'filter-status-none',
    'filter-route', 'filter-fingerprint', 'filter-search',
    'filter-long-korean', 'filter-unbroken-token',
  ]);

  assert.equal(scenarios.length, 82);
  assert.equal(defaultScenarios.length, 52);
  assert.equal(interactionScenarios.length, 30);
  assert.equal(new Set(scenarios.map(({ id }) => id)).size, 82);
  assert.deepEqual({
    data: defaultScenarios.filter(({ variants }) => dataPresets.has(variants.preset ?? '')).length,
    lifecycle: defaultScenarios.filter(({ variants }) => lifecyclePresets.has(variants.preset ?? '')).length,
    lazy: defaultScenarios.filter(({ variants }) => lazyPresets.has(variants.preset ?? '')).length,
    value: defaultScenarios.filter(({ variants }) => valuePresets.has(variants.preset ?? '')).length,
  }, { data: 23, lifecycle: 6, lazy: 6, value: 17 });
  assert.deepEqual(Object.fromEntries(
    ['hover', 'focus-visible', 'pressed', 'input', 'change', 'keyboard-navigation']
      .map((interaction) => [
        interaction,
        interactionScenarios.filter(({ states }) => states.interactions === interaction).length,
      ]),
  ), {
    hover: 5,
    'focus-visible': 12,
    pressed: 5,
    input: 3,
    change: 4,
    'keyboard-navigation': 1,
  });
  assert.ok(scenarios.every(({ states, variants }) => (
    states.permissions === 'admin'
      && variants.theme === 'dark'
      && (states.interactions === 'default' || variants.preset === 'both-maximum-supported')
  )));

  const parentEntry = manifest.components.find(({ id }) => id === componentId);
  assert.equal(parentEntry?.status, 'registered');
  assert.equal(parentEntry?.render?.mode, 'direct');
  assert.equal(parentEntry?.render?.adapterId, 'admin.client-error-panel');

  const parentScenarioIds = new Set(scenarios.map(({ id }) => id));
  const hostedCounts = new Map([
    ['src/components/admin/ClientErrorAdminPanel.tsx#ClientErrorAdminDetailRuntime', 4],
    ['src/components/admin/ClientErrorAdminPanel.tsx#ClientErrorAdminInsightsRuntime', 4],
    ['src/components/admin/ClientErrorAdminPanel.tsx#ClientErrorInsightsSkeleton', 2],
    ['src/components/admin/ClientErrorAdminPanel.tsx#ClientErrorTrendChart', 3],
    ['src/components/admin/ClientErrorAdminPanel.tsx#MonitoringCard', 8],
  ]);
  for (const [hostedId, expectedCount] of hostedCounts) {
    const entry = manifest.components.find(({ id }) => id === hostedId);
    assert.equal(entry?.status, 'registered', hostedId);
    assert.equal(entry?.render?.mode, 'hosted', hostedId);
    assert.equal(entry?.render?.hostScenarioIds?.length, expectedCount, hostedId);
    assert.ok(entry?.render?.hostScenarioIds?.every((id) => parentScenarioIds.has(id)), hostedId);
  }
});

test('admin offseason movement root covers exactly 44 scenarios and three production lazy bindings', async () => {
  const componentId = 'src/components/admin/OffseasonMovementAdminPanel.tsx#OffseasonMovementAdminPanel';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => id === componentId);
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { adapterId?: string; hostScenarioIds?: string[]; mode?: string };
      status: string;
    }>;
  };
  const defaultScenarios = scenarios.filter(({ states }) => states.interactions === 'default');
  const interactionScenarios = scenarios.filter(({ states }) => states.interactions !== 'default');
  const lifecycleStates = new Set([
    'list-loading', 'load-error', 'success-message', 'csv-importing',
    'csv-success', 'csv-many-errors', 'quality-filter-empty', 'create-dialog',
    'edit-dialog', 'delete-dialog', 'create-submitting', 'edit-submitting',
    'delete-submitting', 'content-fallback', 'results-fallback', 'dialogs-fallback',
  ]);

  assert.equal(scenarios.length, 44);
  assert.equal(new Set(scenarios.map(({ id }) => id)).size, 44);
  assert.equal(defaultScenarios.filter(({ variants }) => variants.preset === 'idle').length, 8);
  assert.equal(defaultScenarios.filter(({ variants }) => lifecycleStates.has(variants.preset ?? '')).length, 16);
  assert.deepEqual(Object.fromEntries(
    ['hover', 'focus-visible', 'pressed', 'input', 'change', 'keyboard-navigation'].map((interaction) => [
      interaction,
      interactionScenarios.filter(({ states }) => states.interactions === interaction).length,
    ]),
  ), {
    hover: 4,
    'focus-visible': 7,
    pressed: 4,
    input: 2,
    change: 2,
    'keyboard-navigation': 1,
  });
  assert.ok(scenarios.every(({ states, variants }) => (
    states.permissions === 'admin'
      && variants.theme === 'dark'
      && (states.interactions === 'default'
        || (states.data === 'maximum-supported'
          && states.system === 'idle'
          && variants.preset === 'idle'))
  )));

  const parentEntry = manifest.components.find(({ id }) => id === componentId);
  assert.equal(parentEntry?.status, 'registered');
  assert.equal(parentEntry?.render?.mode, 'direct');
  assert.equal(parentEntry?.render?.adapterId, 'admin.offseason-movement-panel');

  const teamChange = scenarios.find(({ states, interactionPlan }) => (
    states.interactions === 'change' && interactionPlan?.targetId === 'team-filter'
  ));
  assert.deepEqual(teamChange?.interactionPlan, {
    action: 'select-option',
    selector: '[data-testid="admin-offseason-team-trigger"]',
    targetId: 'team-filter',
    value: 'LG',
    waitForSelector: '[data-testid="admin-offseason-team-trigger"]:has(option[value="LG"]:checked)',
  });
  const dialogSectionChange = scenarios.find(({ states, interactionPlan }) => (
    states.interactions === 'change' && interactionPlan?.targetId === 'dialog-section'
  ));
  assert.equal(dialogSectionChange?.interactionPlan?.action, 'select-option');
  assert.equal(dialogSectionChange?.interactionPlan?.value, '기타');
  assert.equal(
    dialogSectionChange?.interactionPlan?.waitForSelector,
    '[data-testid="admin-offseason-dialog-section-trigger"]:has(option[value="기타"]:checked)',
  );

  const parentScenarioIds = new Set(scenarios.map(({ id }) => id));
  const hostedIds = [
    'src/components/admin/OffseasonMovementAdminPanel.tsx#OffseasonMovementAdminPanelContent',
    'src/components/admin/OffseasonMovementAdminPanelContent.tsx#OffseasonMovementAdminResultsRuntime',
    'src/components/admin/OffseasonMovementAdminPanelContent.tsx#OffseasonMovementAdminDialogs',
  ];
  for (const hostedId of hostedIds) {
    const entry = manifest.components.find(({ id }) => id === hostedId);
    assert.equal(entry?.status, 'registered', hostedId);
    assert.equal(entry?.render?.mode, 'hosted', hostedId);
    assert.ok((entry?.render?.hostScenarioIds?.length ?? 0) > 0, hostedId);
    assert.ok(entry?.render?.hostScenarioIds?.every((id) => parentScenarioIds.has(id)), hostedId);
  }
});

test('admin offseason content direct export covers exactly 36 declared legal scenarios', async () => {
  const componentId = 'src/components/admin/OffseasonMovementAdminPanelContent.tsx#OffseasonMovementAdminPanelContent';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => id === componentId);
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      id: string;
      render?: { adapterId?: string; mode?: string };
      status: string;
    }>;
  };
  const defaults = scenarios.filter(({ states }) => states.interactions === 'default');
  const interactions = scenarios.filter(({ states }) => states.interactions !== 'default');

  assert.equal(scenarios.length, 36);
  assert.equal(new Set(scenarios.map(({ id }) => id)).size, 36);
  assert.equal(defaults.filter(({ variants }) => variants.preset === 'idle').length, 8);
  assert.equal(defaults.filter(({ variants }) => variants.preset !== 'idle').length, 15);
  assert.deepEqual(Object.fromEntries(
    ['hover', 'focus-visible', 'pressed', 'input', 'change', 'keyboard-navigation'].map((interaction) => [
      interaction,
      interactions.filter(({ states }) => states.interactions === interaction).length,
    ]),
  ), {
    hover: 2,
    'focus-visible': 3,
    pressed: 3,
    input: 2,
    change: 2,
    'keyboard-navigation': 1,
  });
  assert.ok(scenarios.every(({ states, variants }) => (
    states.permissions === 'admin'
      && states.system === 'idle'
      && variants.theme === 'dark'
      && variants.preset !== 'content-fallback'
  )));
  assert.ok(interactions.every(({ states, variants }) => (
    states.data === 'maximum-supported' && variants.preset === 'idle'
  )));

  const entry = manifest.components.find(({ id }) => id === componentId);
  assert.equal(entry?.status, 'registered');
  assert.equal(entry?.render?.mode, 'direct');
  assert.equal(entry?.render?.adapterId, 'admin.offseason-movement-content');
  const selectedChanges = interactions.filter(({ states }) => states.interactions === 'change');
  assert.ok(selectedChanges.every(({ interactionPlan }) => (
    interactionPlan != null
      && String(interactionPlan.action) === 'select-option'
      && typeof interactionPlan.value === 'string'
      && interactionPlan.waitForSelector?.includes(':checked')
  )));
  const callbackEvidence = new Map(interactions.map(({ interactionPlan }) => [
    interactionPlan?.targetId,
    interactionPlan?.waitForSelector,
  ]));
  assert.match(callbackEvidence.get('search') ?? '', /data-vqa-search-change-count="1"/);
  assert.match(callbackEvidence.get('team-filter') ?? '', /data-vqa-team-filter-change-count="1"/);
  assert.match(callbackEvidence.get('dialog-summary') ?? '', /data-vqa-update-field="summary"/);
  assert.match(callbackEvidence.get('dialog-section') ?? '', /data-vqa-update-field="section"/);
});

test('admin offseason results direct export covers exactly 25 declared legal scenarios', async () => {
  const componentId = 'src/components/admin/OffseasonMovementAdminResultsRuntime.tsx#OffseasonMovementAdminResultsRuntime';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => id === componentId);
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as { components: Array<{ id: string; render?: { adapterId?: string; mode?: string }; status: string }> };
  const defaults = scenarios.filter(({ states }) => states.interactions === 'default');
  const interactions = scenarios.filter(({ states }) => states.interactions !== 'default');

  assert.equal(scenarios.length, 25);
  assert.equal(new Set(scenarios.map(({ id }) => id)).size, 25);
  assert.equal(defaults.filter(({ variants }) => variants.preset === 'idle').length, 8);
  assert.equal(defaults.filter(({ variants }) => variants.preset !== 'idle').length, 8);
  assert.deepEqual(Object.fromEntries(
    ['hover', 'focus-visible', 'pressed'].map((interaction) => [
      interaction,
      interactions.filter(({ states }) => states.interactions === interaction).length,
    ]),
  ), { hover: 3, 'focus-visible': 3, pressed: 3 });
  assert.ok(interactions.every(({ states, variants }) => (
    states.data === 'maximum-supported'
      && states.permissions === 'admin'
      && states.system === 'idle'
      && variants.preset === 'idle'
      && variants.theme === 'dark'
  )));
  const entry = manifest.components.find(({ id }) => id === componentId);
  assert.equal(entry?.status, 'registered');
  assert.equal(entry?.render?.mode, 'direct');
  assert.equal(entry?.render?.adapterId, 'admin.offseason-movement-results');
});

test('admin offseason dialogs direct export covers exactly 41 declared legal scenarios', async () => {
  const componentId = 'src/components/admin/OffseasonMovementAdminDialogs.tsx#OffseasonMovementAdminDialogs';
  const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId: id }) => id === componentId);
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as { components: Array<{ id: string; render?: { adapterId?: string; mode?: string }; status: string }> };
  const defaults = scenarios.filter(({ states }) => states.interactions === 'default');
  const interactions = scenarios.filter(({ states }) => states.interactions !== 'default');

  assert.equal(scenarios.length, 41);
  assert.equal(new Set(scenarios.map(({ id }) => id)).size, 41);
  assert.equal(defaults.filter(({ variants }) => variants.preset === 'create-dialog').length, 8);
  assert.equal(defaults.filter(({ variants }) => variants.preset !== 'create-dialog').length, 5);
  assert.deepEqual(Object.fromEntries(
    ['hover', 'focus-visible', 'pressed', 'input', 'change', 'keyboard-navigation'].map((interaction) => [
      interaction,
      interactions.filter(({ states }) => states.interactions === interaction).length,
    ]),
  ), {
    hover: 6,
    'focus-visible': 10,
    pressed: 6,
    input: 3,
    change: 2,
    'keyboard-navigation': 1,
  });
  assert.ok(interactions.every(({ states, variants }) => (
    states.data === 'maximum-supported'
      && states.permissions === 'admin'
      && states.system === 'idle'
      && variants.preset === 'create-dialog'
      && variants.theme === 'dark'
  )));
  assert.ok(scenarios.every(({ interactionPlan, states }) => (
    states.interactions !== 'change'
      || interactionPlan?.targetId !== 'section'
      || interactionPlan.waitForSelector?.includes('data-vqa-update-field-count="1"') === true
  )));
  const focusLoop = scenarios.find(({ states, interactionPlan }) => (
    states.interactions === 'keyboard-navigation'
      && interactionPlan?.targetId === 'create-focus-loop'
  ));
  assert.deepEqual(focusLoop?.interactionPlan, {
    action: 'press-key',
    selector: '[data-testid="admin-offseason-dialog-submit"]',
    targetId: 'create-focus-loop',
    key: 'Tab',
    waitForSelector: 'body:has([data-testid="admin-offseason-dialog"] button[aria-label="닫기"]:focus-visible)',
  });
  assert.ok(scenarios.every(({ interactionPlan, states }) => (
    states.interactions !== 'change'
      || interactionPlan?.targetId !== 'team'
      || interactionPlan.waitForSelector?.includes('data-vqa-update-field-count="1"') === true
  )));
  const entry = manifest.components.find(({ id }) => id === componentId);
  assert.equal(entry?.status, 'registered');
  assert.equal(entry?.render?.mode, 'direct');
  assert.equal(entry?.render?.adapterId, 'admin.offseason-movement-dialogs');
});

test('admin internal fallbacks use reviewed hosted evidence without independent state combinations', async () => {
  const expectedHostCounts = new Map([
    ['src/components/admin/AdminAiOperationsPanel.tsx#AutoBriefFallback', 4],
    ['src/components/admin/AdminAiOperationsPanel.tsx#ReleaseDecisionFallback', 4],
    ['src/components/admin/AdminAiOperationsRuntime.tsx#AdminAiOperationsRuntimeFallback', 1],
    ['src/components/admin/AdminCommunityRuntime.tsx#AdminCommunityPanelFallback', 3],
    ['src/components/admin/AdminCommunityRuntime.tsx#AdminCommunityRoleDialogFallback', 4],
    ['src/components/admin/AdminStadiumsRuntime.tsx#AdminStadiumsDialogFallback', 3],
    ['src/components/admin/AdminStadiumsRuntime.tsx#AdminStadiumsPanelFallback', 1],
    ['src/components/admin/ClientErrorAdminPanel.tsx#ClientErrorChartFallback', 1],
    ['src/components/admin/ClientErrorAdminPanel.tsx#ClientErrorChartResolvedState', 3],
    ['src/components/admin/ClientErrorAdminPanel.tsx#ClientErrorDetailFallback', 1],
  ]);
  const classifications = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-classifications-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      basis?: string;
      classification: string;
      id: string;
      renderAccess?: string;
    }>;
  };
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      axes?: Record<string, Record<string, { owner?: string; reason?: string; testEvidence?: string }>>;
      constraints?: unknown[];
      id: string;
      render?: { hostScenarioIds?: string[]; mode?: string };
      renderAccess?: string;
      status: string;
      variants?: Record<string, { owner?: string; reason?: string; testEvidence?: string }>;
    }>;
  };
  const generatedScenarioIds = new Set(AUTOMATIC_COMPONENT_STATE_SCENARIOS.map(({ id }) => id));

  assert.equal(expectedHostCounts.size, 10);
  for (const [componentId, expectedCount] of expectedHostCounts) {
    const classification = classifications.components.find(({ id }) => id === componentId);
    assert.deepEqual(classification, {
      id: componentId,
      classification: 'visual',
      basis: 'reviewed-jsx-callable',
      reason: 'The callable contains JSX and is included as a visual React render unit.',
      testEvidence: 'visual-qa-component-inventory containsJsx=true',
      owner: 'frontend-platform',
      renderAccess: 'hosted',
    }, componentId);

    const entry = manifest.components.find(({ id }) => id === componentId);
    assert.equal(entry?.status, 'registered', componentId);
    assert.equal(entry?.renderAccess, 'hosted', componentId);
    assert.equal(entry?.render?.mode, 'hosted', componentId);
    assert.equal(entry?.render?.hostScenarioIds?.length, expectedCount, componentId);
    assert.ok(entry?.render?.hostScenarioIds?.every((id) => generatedScenarioIds.has(id)), componentId);
    assert.deepEqual(Object.keys(entry?.axes ?? {}).sort(), [
      'data', 'interactions', 'permissions', 'system',
    ], componentId);
    for (const axis of Object.values(entry?.axes ?? {})) {
      assert.deepEqual(Object.keys(axis), ['notApplicable'], componentId);
      assert.ok(axis.notApplicable.owner, componentId);
      assert.ok(axis.notApplicable.reason, componentId);
      assert.ok(axis.notApplicable.testEvidence, componentId);
    }
    assert.deepEqual(Object.keys(entry?.variants ?? {}), ['notApplicable'], componentId);
    assert.ok(entry?.variants?.notApplicable.owner, componentId);
    assert.ok(entry?.variants?.notApplicable.reason, componentId);
    assert.ok(entry?.variants?.notApplicable.testEvidence, componentId);
    assert.deepEqual(entry?.constraints, [], componentId);
  }
});

test('admin hosted leaf reconciliation uses only proven parent scenarios', async () => {
  const communityScenarioIds = {
    roleDialog: 'state:src/components/admin/AdminCommunityRuntime.tsx#AdminCommunityRuntime:data=maximum-supported|permissions=super-admin|interactions=default|variant.active-tab=users|variant.panel-phase=resolved|variant.role-dialog-phase=resolved|variant.theme=dark',
    mates: 'state:src/components/admin/AdminCommunityRuntime.tsx#AdminCommunityRuntime:data=maximum-supported|permissions=admin|interactions=default|variant.active-tab=parties|variant.panel-phase=resolved|variant.role-dialog-phase=closed|variant.theme=dark',
    posts: 'state:src/components/admin/AdminCommunityRuntime.tsx#AdminCommunityRuntime:data=maximum-supported|permissions=admin|interactions=default|variant.active-tab=posts|variant.panel-phase=resolved|variant.role-dialog-phase=closed|variant.theme=dark',
    users: 'state:src/components/admin/AdminCommunityRuntime.tsx#AdminCommunityRuntime:data=maximum-supported|permissions=super-admin|interactions=default|variant.active-tab=users|variant.panel-phase=resolved|variant.role-dialog-phase=closed|variant.theme=dark',
  };
  const gameStatusScenarioId = 'state:src/components/admin/AdminGameStatusRepairPanel.tsx#AdminGameStatusRepairPanel:data=maximum-supported|permissions=admin|interactions=default|system=idle|variant.active=active|variant.theme=dark';
  const stadiumScenarioIds = {
    panel: 'state:src/components/admin/AdminStadiumsRuntime.tsx#AdminStadiumsRuntime:data=maximum-supported|permissions=admin|interactions=default|system=idle|variant.dialog-phase=closed|variant.panel-phase=resolved|variant.selection=selected|variant.theme=dark',
    create: 'state:src/components/admin/AdminStadiumsRuntime.tsx#AdminStadiumsRuntime:data=maximum-supported|permissions=admin|interactions=default|system=idle|variant.dialog-phase=create-resolved|variant.panel-phase=resolved|variant.selection=selected|variant.theme=dark',
    edit: 'state:src/components/admin/AdminStadiumsRuntime.tsx#AdminStadiumsRuntime:data=maximum-supported|permissions=admin|interactions=default|system=idle|variant.dialog-phase=edit-resolved|variant.panel-phase=resolved|variant.selection=selected|variant.theme=dark',
    delete: 'state:src/components/admin/AdminStadiumsRuntime.tsx#AdminStadiumsRuntime:data=maximum-supported|permissions=admin|interactions=default|system=idle|variant.dialog-phase=delete-resolved|variant.panel-phase=resolved|variant.selection=selected|variant.theme=dark',
  };
  const expectedHostScenarioIds = new Map<string, string[]>([
    ['src/components/admin/AdminCommunityRuntime.tsx#AdminRoleChangeDialogContent', [communityScenarioIds.roleDialog]],
    ['src/components/admin/AdminCommunityRuntime.tsx#MatesAdminPanel', [communityScenarioIds.mates]],
    ['src/components/admin/AdminCommunityRuntime.tsx#PostsAdminPanel', [communityScenarioIds.posts]],
    ['src/components/admin/AdminCommunityRuntime.tsx#UsersAdminPanel', [communityScenarioIds.users]],
    ['src/components/admin/AdminGameStatusRepairPanel.tsx#AdminGameStatusBadge', [gameStatusScenarioId]],
    ['src/components/admin/AdminGameStatusRepairPanel.tsx#CleanupArtifactPaths', [gameStatusScenarioId]],
    ['src/components/admin/AdminGameStatusRepairPanel.tsx#CleanupClosureStatus', [gameStatusScenarioId]],
    ['src/components/admin/AdminGameStatusRepairPanel.tsx#MismatchDateSuggestionCard', [gameStatusScenarioId]],
    ['src/components/admin/AdminGameStatusRepairPanel.tsx#MismatchReasons', [gameStatusScenarioId]],
    ['src/components/admin/AdminGameStatusRepairPanel.tsx#NonCanonicalGameRow', [gameStatusScenarioId]],
    ['src/components/admin/AdminGameStatusRepairPanel.tsx#RepairedGameRow', [gameStatusScenarioId]],
    ['src/components/admin/AdminGameStatusRepairPanel.tsx#SummaryCard', [gameStatusScenarioId]],
    ['src/components/admin/AdminStadiumsRuntime.tsx#AdminDeletePlaceDialogContent', [stadiumScenarioIds.delete]],
    ['src/components/admin/AdminStadiumsRuntime.tsx#AdminPlaceDialogContent', [stadiumScenarioIds.create, stadiumScenarioIds.edit]],
    ['src/components/admin/AdminStadiumsRuntime.tsx#AdminStadiumsPanel', [stadiumScenarioIds.panel]],
  ]);
  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as {
    components: Array<{
      axes?: Record<string, Record<string, { owner?: string; reason?: string; testEvidence?: string }>>;
      constraints?: unknown[];
      id: string;
      render?: { hostScenarioIds?: string[]; mode?: string };
      renderAccess?: string;
      status: string;
      variants?: Record<string, { owner?: string; reason?: string; testEvidence?: string }>;
    }>;
  };
  const generatedScenarioIds = new Set(AUTOMATIC_COMPONENT_STATE_SCENARIOS.map(({ id }) => id));

  assert.equal(expectedHostScenarioIds.size, 15);
  for (const [componentId, expectedIds] of expectedHostScenarioIds) {
    const entry = manifest.components.find(({ id }) => id === componentId);
    assert.equal(entry?.status, 'registered', componentId);
    assert.equal(entry?.renderAccess, 'hosted', componentId);
    assert.equal(entry?.render?.mode, 'hosted', componentId);
    assert.deepEqual(entry?.render?.hostScenarioIds, expectedIds, componentId);
    assert.ok(expectedIds.every((id) => generatedScenarioIds.has(id)), componentId);
    assert.deepEqual(Object.keys(entry?.axes ?? {}).sort(), [
      'data', 'interactions', 'permissions', 'system',
    ], componentId);
    for (const axis of Object.values(entry?.axes ?? {})) {
      assert.deepEqual(Object.keys(axis), ['notApplicable'], componentId);
      assert.ok(axis.notApplicable.owner, componentId);
      assert.ok(axis.notApplicable.reason, componentId);
      assert.ok(axis.notApplicable.testEvidence, componentId);
    }
    assert.deepEqual(Object.keys(entry?.variants ?? {}), ['notApplicable'], componentId);
    assert.ok(entry?.variants?.notApplicable.owner, componentId);
    assert.ok(entry?.variants?.notApplicable.reason, componentId);
    assert.ok(entry?.variants?.notApplicable.testEvidence, componentId);
    assert.deepEqual(entry?.constraints, [], componentId);
  }
});

test('component file paths resolve to Vite glob module keys', () => {
  assert.equal(
    componentModuleKey('src/components/prediction/PredictionShellIcons.tsx'),
    '../components/prediction/PredictionShellIcons.tsx',
  );
  assert.equal(
    componentModuleKey('src/pages/LeaderboardPage.tsx'),
    '../pages/LeaderboardPage.tsx',
  );
});

test('component stylesheet paths resolve to isolated Vite style module keys', () => {
  assert.deepEqual(componentStyleModuleKeys([
    'src/components/mypage/MyPageSeason.css',
    'src/pages/LeaderboardPage.css',
  ]), [
    '../components/mypage/MyPageSeason.css',
    '../pages/LeaderboardPage.css',
  ]);
});

test('the browser harness includes both component and page module roots', async () => {
  const source = await readFile(new URL('./VisualQaHarnessApp.tsx', import.meta.url), 'utf8');
  assert.match(source, /const componentModules = import\.meta\.glob<Record<string, unknown>>\(\[/);
  assert.match(source, /'\.\.\/components\/\*\*\/\*\.tsx'/);
  assert.match(source, /'\.\.\/pages\/\*\*\/\*\.tsx'/);
  assert.match(source, /import\.meta\.glob<unknown>\('\.\.\/components\/\*\*\/\*\.css'\)/);
  assert.match(source, /scenario\.styleModuleKeys/);
  assert.match(source, /data-vqa-capture-selector=\{renderResult\.captureSelector\}/);
  assert.match(source, /data-vqa-expected-pathname=\{renderResult\.expectedPathname\}/);
  assert.match(source, /data-vqa-expected-search=\{renderResult\.expectedSearch\}/);
  assert.match(source, /data-vqa-expected-hash=\{renderResult\.expectedHash\}/);
  assert.match(source, /initialEntries=\{\[renderResult\.initialPathname \?\? '\/__visual-qa__'\]\}/);
  assert.match(source, /aria-hidden="true"/);
  assert.doesNotMatch(source, /<span\s+hidden\s+data-vqa-router-hash/);
  assert.match(source, /data-vqa-router-pathname=\{location\.pathname\}/);
  assert.match(source, /data-vqa-router-search=\{location\.search\}/);
  assert.match(source, /data-vqa-router-hash=\{location\.hash\}/);
  assert.match(source, /interactionTargetId: scenario\.interactionPlan\?\.targetId/);
  assert.match(source, /queryClient\.clear\(\)/);
});

test('the harness prebundles CommonJS and portal dependencies used by direct components', async () => {
  const source = await readFile(new URL('../../vite.visual-qa.config.ts', import.meta.url), 'utf8');
  assert.match(source, /'style-to-js'/);
  assert.match(source, /'react-dom',/);
});

test('scenario selection is explicit and rejects unknown or hosted component ids', () => {
  const first = AUTOMATIC_ICON_SCENARIOS[0];
  assert.deepEqual(resolveHarnessScenario(first.componentId), first);
  const componentProbe = AUTOMATIC_COMPONENT_PROBE_SCENARIOS[0];
  assert.deepEqual(resolveHarnessScenario(componentProbe.componentId), componentProbe);
  assert.equal(resolveHarnessScenario('src/components/Unknown.tsx#UnknownIcon'), null);
  assert.equal(resolveHarnessScenario(''), null);
});

test('non-default interaction states resolve to executable scenario plans and missing plans fail closed', () => {
  const resolveInteractionPlan = (harnessCatalogModule as unknown as {
    resolveInteractionPlan?: (
      entry: { interactionPlans?: Record<string, { action: string; selector: string }> },
      states: { interactions?: string },
    ) => { action: string; selector: string } | undefined;
  }).resolveInteractionPlan;
  assert.equal(typeof resolveInteractionPlan, 'function');
  if (!resolveInteractionPlan) return;

  const entry = {
    interactionPlans: {
      hover: { action: 'hover', selector: 'button' },
    },
  };
  assert.equal(resolveInteractionPlan(entry, { interactions: 'default' }), undefined);
  assert.deepEqual(resolveInteractionPlan(entry, { interactions: 'hover' }), {
    action: 'hover',
    selector: 'button',
  });
  assert.throws(
    () => resolveInteractionPlan(entry, { interactions: 'pressed' }),
    /missing executable interaction plan for pressed/,
  );
});

test('multi-target interaction states resolve one executable scenario per target', () => {
  const expandInteractionTargets = (harnessCatalogModule as unknown as {
    expandInteractionTargets?: (
      entry: { interactionPlans?: Record<string, unknown> },
      combination: { states: { interactions?: string }; variants: Record<string, string> },
    ) => Array<{
      states: { interactions?: string };
      variants: Record<string, string>;
      interactionTarget?: { id: string; selector: string };
    }>;
  }).expandInteractionTargets;
  assert.equal(typeof expandInteractionTargets, 'function');
  if (!expandInteractionTargets) return;

  const expanded = expandInteractionTargets({
    interactionPlans: {
      hover: {
        action: 'hover',
        targets: [
          { id: 'retry', selector: '[data-testid="retry"]' },
          { id: 'recovery', selector: '[data-testid="recovery"]' },
        ],
      },
    },
  }, {
    states: { interactions: 'hover' },
    variants: {},
  });
  assert.deepEqual(expanded.map(({ interactionTarget }) => interactionTarget), [
    { id: 'retry', selector: '[data-testid="retry"]' },
    { id: 'recovery', selector: '[data-testid="recovery"]' },
  ]);
});

test('conditional targets preserve ordered setup and result waits for matching combinations only', () => {
  const expandInteractionTargets = (harnessCatalogModule as unknown as {
    expandInteractionTargets?: (
      entry: { interactionPlans?: Record<string, unknown> },
      combination: { states: Record<string, string>; variants: Record<string, string> },
    ) => Array<{
      states: Record<string, string>;
      variants: Record<string, string>;
      interactionTarget?: Record<string, unknown>;
    }>;
  }).expandInteractionTargets;
  const resolveInteractionPlan = (harnessCatalogModule as unknown as {
    resolveInteractionPlan?: (
      entry: { interactionPlans?: Record<string, unknown> },
      states: Record<string, string>,
      interactionTarget?: Record<string, unknown>,
    ) => Record<string, unknown> | undefined;
  }).resolveInteractionPlan;
  assert.equal(typeof expandInteractionTargets, 'function');
  assert.equal(typeof resolveInteractionPlan, 'function');
  if (!expandInteractionTargets || !resolveInteractionPlan) return;

  const entry = {
    interactionPlans: {
      open: {
        action: 'click',
        setup: [{ action: 'click', selector: '[data-testid="global-toggle"]' }],
        targets: [{
          id: 'available-card',
          selector: '[data-testid="available-card"]',
          clickPosition: { x: 1, y: 1 },
          when: { data: 'populated', 'variant.enabled': ['true'] },
          setup: [{
            action: 'click',
            selector: '[data-testid="inventory-toggle"]',
            waitForSelector: '[data-testid="inventory-panel"]',
          }],
          waitForSelector: '[role="dialog"]',
          waitForHiddenSelector: '[data-testid="closed-state"]',
        }],
      },
    },
  };
  const matching = expandInteractionTargets(entry, {
    states: { data: 'populated', interactions: 'open' },
    variants: { enabled: 'true' },
  });
  const missing = expandInteractionTargets(entry, {
    states: { data: 'empty', interactions: 'open' },
    variants: { enabled: 'true' },
  });

  assert.equal(matching.length, 1);
  assert.deepEqual(missing, []);
  assert.deepEqual(resolveInteractionPlan(
    entry,
    matching[0].states,
    matching[0].interactionTarget,
  ), {
    action: 'click',
    selector: '[data-testid="available-card"]',
    targetId: 'available-card',
    clickPosition: { x: 1, y: 1 },
    setup: [
      { action: 'click', selector: '[data-testid="global-toggle"]' },
      {
        action: 'click',
        selector: '[data-testid="inventory-toggle"]',
        waitForSelector: '[data-testid="inventory-panel"]',
      },
    ],
    waitForSelector: '[role="dialog"]',
    waitForHiddenSelector: '[data-testid="closed-state"]',
  });
});

test('interaction catalog rejects click positions outside finite nonnegative click targets', () => {
  const resolveInteractionPlan = (harnessCatalogModule as unknown as {
    resolveInteractionPlan?: (
      entry: { interactionPlans?: Record<string, unknown> },
      states: Record<string, string>,
      interactionTarget?: Record<string, unknown>,
    ) => Record<string, unknown> | undefined;
  }).resolveInteractionPlan;
  assert.equal(typeof resolveInteractionPlan, 'function');
  if (!resolveInteractionPlan) return;

  for (const [action, clickPosition] of [
    ['hover', { x: 1, y: 1 }],
    ['click', { x: -1, y: 1 }],
    ['click', { x: Number.NaN, y: 1 }],
    ['click', { x: 1, y: Number.POSITIVE_INFINITY }],
  ] as const) {
    assert.throws(
      () => resolveInteractionPlan({
        interactionPlans: { selected: { action } },
      }, { interactions: 'selected' }, {
        id: 'target',
        selector: '[data-testid="target"]',
        clickPosition,
      }),
      /clickPosition requires finite nonnegative coordinates on click action/,
    );
  }
});

test('global error Root, Content, and lazy host cover exactly 22, 35, and 16 legal scenarios', async () => {
  const rootComponentId = 'src/components/GlobalErrorDialog.tsx#GlobalErrorDialog';
  const contentComponentId = 'src/components/GlobalErrorDialogContent.tsx#GlobalErrorDialogContent';
  const lazyComponentId = 'src/components/GlobalErrorDialog.tsx#LazyGlobalErrorDialogContent';
  const rootScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(
    ({ componentId }) => componentId === rootComponentId,
  );
  const contentScenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(
    ({ componentId }) => componentId === contentComponentId,
  );
  assert.equal(rootScenarios.length, 22);
  assert.equal(new Set(rootScenarios.map(({ id }) => id)).size, 22);
  assert.equal(rootScenarios.filter(({ variants }) => variants.preset === 'idle').length, 8);
  assert.equal(rootScenarios.filter(({ variants }) => variants.preset !== 'idle').length, 14);
  assert.ok(rootScenarios.every(({ states }) => states.interactions === undefined));

  assert.equal(contentScenarios.length, 35);
  assert.equal(new Set(contentScenarios.map(({ id }) => id)).size, 35);
  assert.equal(contentScenarios.filter(({ states }) => states.interactions === 'default').length, 16);
  assert.deepEqual(Object.fromEntries(
    ['hover', 'focus-visible', 'pressed', 'input', 'selected', 'submitting', 'keyboard-navigation']
      .map((interaction) => [interaction, contentScenarios.filter(
        ({ states }) => states.interactions === interaction,
      ).length]),
  ), {
    hover: 4,
    'focus-visible': 5,
    pressed: 4,
    input: 1,
    selected: 2,
    submitting: 2,
    'keyboard-navigation': 1,
  });
  assert.ok(contentScenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ states, variants }) => (
      states.data === 'maximum-supported' && variants.preset === 'idle'
    )));
  assert.ok(contentScenarios
    .filter(({ states }) => states.interactions !== 'default')
    .every(({ interactionPlan }) => Boolean(interactionPlan)));
  const feedbackSubmitFocus = contentScenarios.find(({ interactionPlan, states }) => (
    states.interactions === 'focus-visible'
      && interactionPlan?.targetId === 'feedback-submit'
  ));
  assert.deepEqual(feedbackSubmitFocus?.interactionPlan?.setup, [{
    action: 'fill',
    selector: '[data-testid="error-feedback"] textarea',
    value: 'MOCK 비생산 포커스 오류 제보',
  }]);
  const feedbackSubmitHover = contentScenarios.find(({ interactionPlan, states }) => (
    states.interactions === 'hover'
      && interactionPlan?.targetId === 'feedback-submit'
  ));
  assert.deepEqual(feedbackSubmitHover?.interactionPlan?.setup, [{
    action: 'fill',
    selector: '[data-testid="error-feedback"] textarea',
    value: 'MOCK 비생산 hover 오류 제보',
  }]);
  const feedbackSuccess = contentScenarios.find(({ interactionPlan, states }) => (
    states.interactions === 'selected'
      && interactionPlan?.targetId === 'feedback-success'
  ));
  assert.deepEqual(feedbackSuccess?.interactionPlan?.setup, [{
    action: 'press-key',
    selector: '[data-testid="error-feedback"] textarea',
    key: 'A',
  }]);

  const manifest = JSON.parse(await readFile(
    new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
    'utf8',
  )) as { components: Array<{
    id: string;
    render?: { hostScenarioIds?: string[]; mode?: string };
    status: string;
  }> };
  const hosted = manifest.components.find(({ id }) => id === lazyComponentId);
  const expectedHostScenarioIds = [
    ...['empty', 'populated', 'null-optional', 'boundary-minimum', 'boundary-maximum', 'long-korean', 'unbroken-token', 'maximum-supported']
      .map((data) => `state:${rootComponentId}:data=${data}|variant.preset=idle`),
    ...['status-null', 'status-404', 'status-409', 'status-500', 'source-runtime', 'source-unhandled-rejection', 'retry-missing', 'latest-event-wins']
      .map((preset) => `state:${rootComponentId}:data=populated|variant.preset=${preset}`),
  ];
  assert.equal(hosted?.status, 'registered');
  assert.equal(hosted?.render?.mode, 'hosted');
  assert.deepEqual(hosted?.render?.hostScenarioIds, expectedHostScenarioIds);
  assert.ok(expectedHostScenarioIds.every((id) => rootScenarios.some((scenario) => scenario.id === id)));
});
