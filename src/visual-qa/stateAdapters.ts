import {
  createElement,
  Fragment,
  lazy,
  Suspense,
  useEffect,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { toast, type ToastOptions } from 'sonner';

import type { AdminStadium, Place, PlaceFormData } from '../api/admin';
import { AdminCoachAutoBriefOpsPanel } from '../components/admin/AdminCoachAutoBriefOpsPanel';
import type AdminDeletePlaceDialogContentComponent from '../components/admin/AdminDeletePlaceDialogContent';
import type AdminPlaceDialogContentComponent from '../components/admin/AdminPlaceDialogContent';
import type AdminRoleChangeDialogContentComponent from '../components/admin/AdminRoleChangeDialogContent';
import type { AdminStadiumsPanel as AdminStadiumsPanelComponent } from '../components/admin/AdminStadiumsPanel';
import type {
  ClientErrorAdminEventFilters,
  ClientErrorAdminPanelVisualQaState,
} from '../components/admin/ClientErrorAdminPanel';
import type OffseasonMovementAdminDialogsComponent from '../components/admin/OffseasonMovementAdminDialogs';
import type OffseasonMovementAdminPanelContentComponent from '../components/admin/OffseasonMovementAdminPanelContent';
import type OffseasonMovementAdminResultsRuntimeComponent from '../components/admin/OffseasonMovementAdminResultsRuntime';
import type { MatesAdminPanel as MatesAdminPanelComponent } from '../components/admin/MatesAdminPanel';
import type { PostsAdminPanel as PostsAdminPanelComponent } from '../components/admin/PostsAdminPanel';
import type { UsersAdminPanel as UsersAdminPanelComponent } from '../components/admin/UsersAdminPanel';
import type GlobalErrorDialogContentComponent from '../components/GlobalErrorDialogContent';
import { MyPageTicketIcon } from '../components/mypage/MyPageFlowIcons';
import { AlertDescription, AlertTitle } from '../components/ui/alert';
import {
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { FRANCHISE_TEAM_IDS } from '../constants/teams';
import { TEAM_DATA_BASE } from '../constants/teamIdentity';
import { SAJIK_CANONICAL_BLOCKS } from '../data/sajikCanonicalSeatMap';
import type {
  AdminClientErrorAlertNotification,
  AdminClientErrorDashboard,
  AdminClientErrorEventDetail,
  AdminClientErrorEventPage,
  AdminClientErrorEventSummary,
  AdminClientErrorRecentFeedback,
  AdminGameScoreSyncResult,
  AdminGameStatusMismatch,
  AdminGameStatusMismatchBatchResult,
  AdminGameStatusRepairBatchResult,
  AdminMate,
  AdminNonCanonicalCleanupTrackerEntry,
  AdminNonCanonicalCleanupTrackerStatus,
  AdminNonCanonicalGame,
  AdminOffseasonMovement,
  AdminOffseasonMovementPayload,
  AdminPost,
  AdminReport,
  AdminReportFilters,
  AdminSeatView,
  AdminSeatViewFilters,
  AdminUser,
} from '../types/admin';
import type { NotificationData, NotificationType } from '../types/notification';
import { MANUAL_BASEBALL_DATA_REQUIRED_CODE } from '../utils/manualBaseballDataContract';
import skeletonUsageContract from '../../contracts/visual-qa-skeleton-usages-v1.json';
import type { VisualQaSemanticHost } from './semanticHost';

const VisualQaAdminRoleChangeDialogContent = lazy(() => (
  import('../components/admin/AdminRoleChangeDialogContent')
));
const VisualQaAdminDeletePlaceDialogContent = lazy(() => (
  import('../components/admin/AdminDeletePlaceDialogContent')
));
const VisualQaAdminPlaceDialogContent = lazy(() => (
  import('../components/admin/AdminPlaceDialogContent')
));
const VisualQaAdminStadiumsPanel = lazy(() => (
  import('../components/admin/AdminStadiumsPanel').then((module) => ({
    default: module.AdminStadiumsPanel,
  }))
));
const VisualQaClientErrorTrendChart = lazy(() => (
  import('../components/admin/ClientErrorTrendChart')
));
const VisualQaClientErrorAdminInsightsRuntime = lazy(() => (
  import('../components/admin/ClientErrorAdminInsightsRuntime')
));
const VisualQaClientErrorAdminDetailRuntime = lazy(() => (
  import('../components/admin/ClientErrorAdminDetailRuntime')
));
const VisualQaMatesAdminPanel = lazy(() => (
  import('../components/admin/MatesAdminPanel').then((module) => ({
    default: module.MatesAdminPanel,
  }))
));
const VisualQaPostsAdminPanel = lazy(() => (
  import('../components/admin/PostsAdminPanel').then((module) => ({
    default: module.PostsAdminPanel,
  }))
));
const VisualQaUsersAdminPanel = lazy(() => (
  import('../components/admin/UsersAdminPanel').then((module) => ({
    default: module.UsersAdminPanel,
  }))
));
const VisualQaOffseasonMovementAdminPanelContent = lazy(() => (
  import('../components/admin/OffseasonMovementAdminPanelContent')
));
const VisualQaOffseasonMovementAdminResultsRuntime = lazy(() => (
  import('../components/admin/OffseasonMovementAdminResultsRuntime')
));
const VisualQaOffseasonMovementAdminDialogs = lazy(() => (
  import('../components/admin/OffseasonMovementAdminDialogs')
));
const VisualQaGlobalErrorDialogContent = lazy(() => import('../components/GlobalErrorDialogContent'));

const renderVisualQaGlobalErrorLazyChild = (child: ReactNode) => createElement(
  Suspense,
  {
    fallback: createElement(
      'div',
      {
        'aria-busy': true,
        'aria-live': 'polite',
        role: 'status',
      },
      '오류 안내를 불러오는 중...',
    ),
  },
  child,
);

const renderVisualQaCommunityLazyChild = (child: ReactNode) => createElement(
  Suspense,
  {
    fallback: createElement(
      'div',
      {
        'aria-busy': true,
        'aria-live': 'polite',
        className: 'min-w-0 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-12 text-center text-slate-400 [overflow-wrap:anywhere]',
        role: 'status',
      },
      '커뮤니티 관리 패널 로딩 중...',
    ),
  },
  child,
);

const renderVisualQaStadiumsLazyChild = (child: ReactNode, label: string) => createElement(
  Suspense,
  {
    fallback: createElement(
      'div',
      {
        'aria-busy': true,
        'aria-live': 'polite',
        className: 'min-w-0 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-12 text-center text-slate-400 [overflow-wrap:anywhere]',
        role: 'status',
      },
      label,
    ),
  },
  child,
);

const renderVisualQaClientErrorLazyChild = (child: ReactNode, label: string) => createElement(
  Suspense,
  {
    fallback: createElement(
      'div',
      {
        'aria-busy': true,
        'aria-live': 'polite',
        className: 'min-w-0 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-12 text-center text-slate-400 [overflow-wrap:anywhere]',
        role: 'status',
      },
      label,
    ),
  },
  child,
);

const renderVisualQaOffseasonAdminLazyChild = (child: ReactNode, label: string) => createElement(
  Suspense,
  {
    fallback: createElement(
      'div',
      {
        'aria-busy': true,
        'aria-live': 'polite',
        className: 'min-w-0 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-12 text-center text-slate-400 [overflow-wrap:anywhere]',
        role: 'status',
      },
      label,
    ),
  },
  child,
);

export type ComponentStateValues = Partial<Record<
  'data' | 'permissions' | 'interactions' | 'system',
  string
>>;

export type ComponentVariantValues = Record<string, string>;

export type ComponentStateAdapterContext = {
  componentId: string;
  states: ComponentStateValues;
  variants: ComponentVariantValues;
  interactionTargetId?: string;
};

export type ComponentStateAdapterResult = {
  props: Record<string, unknown>;
  captureSelector?: string;
  companion?: ReactNode;
  expectedHash?: string;
  expectedPathname?: string;
  expectedSearch?: string;
  initialPathname?: string;
  semanticHost?: VisualQaSemanticHost;
  surfaceClassName?: string;
  theme?: 'light' | 'dark';
};

type ComponentStateAdapter = (
  context: ComponentStateAdapterContext,
) => ComponentStateAdapterResult;

type VisualQaToastTone = 'default' | 'error' | 'info' | 'loading' | 'success' | 'warning';

type VisualQaToastSeedProps = {
  count: number;
  description?: string;
  duration: number;
  title: string;
  tone: VisualQaToastTone;
};

const VisualQaAdminStatIcon = ({ className }: { className?: string }) => createElement(
  'span',
  { 'aria-hidden': true, className },
  '◆',
);

const pushVisualQaToast = (
  tone: VisualQaToastTone,
  title: string,
  options: ToastOptions,
) => {
  if (tone === 'default') return toast(title, options);
  return toast[tone](title, options);
};

function VisualQaToastSeed({
  count,
  description,
  duration,
  title,
  tone,
}: VisualQaToastSeedProps) {
  useEffect(() => {
    toast.dismiss();
    const ids = Array.from({ length: count }, (_, index) => pushVisualQaToast(
      tone,
      count === 1 ? title : `${title} ${index + 1}`,
      {
        description: count === 1 || description == null
          ? description
          : `${description} ${index + 1}`,
        duration,
        id: `visual-qa-toast-${index}`,
      },
    ));

    return () => {
      ids.forEach((id) => toast.dismiss(id));
    };
  }, [count, description, duration, title, tone]);

  return null;
}

const resolveDeclaredVariant = <T>(
  context: ComponentStateAdapterContext,
  name: string,
  values: Record<string, T>,
): T => {
  const value = context.variants[name];
  if (value === undefined || !Object.prototype.hasOwnProperty.call(values, value)) {
    throw new Error(`지원하지 않는 Visual QA variant: ${name}=${value ?? '<missing>'}`);
  }
  return values[value];
};

const requireStateValue = (
  context: ComponentStateAdapterContext,
  name: keyof ComponentStateValues,
  expected: string,
) => {
  const actual = context.states[name];
  if (actual !== expected) {
    throw new Error(`지원하지 않는 Visual QA state: ${name}=${actual ?? '<missing>'}`);
  }
};

const requireStateValueFromMap = <T>(
  context: ComponentStateAdapterContext,
  name: keyof ComponentStateValues,
  values: Record<string, T>,
): T => {
  const value = context.states[name];
  if (value === undefined || !Object.prototype.hasOwnProperty.call(values, value)) {
    throw new Error(`지원하지 않는 Visual QA state: ${name}=${value ?? '<missing>'}`);
  }
  return values[value];
};

const landingDirectSurface = 'block min-h-0 w-full overflow-visible bg-transparent p-0 shadow-none';

const resolveLandingTheme = (context: ComponentStateAdapterContext) => (
  resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
    dark: 'dark',
    light: 'light',
  })
);

const resolveLandingStatic = (
  context: ComponentStateAdapterContext,
  captureSelector: string,
  options: { fixedTheme?: boolean; surfaceClassName?: string } = {},
): ComponentStateAdapterResult => {
  requireStateValue(context, 'data', 'populated');
  return {
    props: {},
    captureSelector,
    surfaceClassName: options.surfaceClassName ?? landingDirectSurface,
    ...(options.fixedTheme ? {} : { theme: resolveLandingTheme(context) }),
  };
};

const stadiumNames = {
  missing: null,
  short: '잠실야구장',
  'long-korean': '서울특별시 종합운동장 야구장 공식 좌석 안내 구역',
};

const franchiseTeamColors = Object.fromEntries(FRANCHISE_TEAM_IDS.map((teamId) => {
  const color = TEAM_DATA_BASE[teamId]?.color;
  if (!color) throw new Error(`Visual QA franchise color is missing: ${teamId}`);
  return [teamId, color];
}));

const skeletonUsageClasses = Object.fromEntries(
  skeletonUsageContract.variants.map(({ id, className }) => [id, className]),
);

const skeletonSurfaceClassName = (className: string) => {
  if (/\b(?:order-|col-span-)/.test(className)) {
    return 'grid min-h-48 w-full grid-cols-2 content-center gap-2 p-4 lg:grid-cols-4';
  }
  if (/\b(?:flex-1|min-w-0|ml-auto)\b/.test(className)) {
    return 'flex min-h-48 w-full items-center justify-start gap-2 p-4';
  }
  if (/\bh-full\b/.test(className)) {
    return 'flex h-48 w-full items-stretch justify-stretch p-4';
  }
  return 'flex min-h-48 w-full items-center justify-center p-4';
};

const makeVisualQaNoticePost = (
  id: number,
  overrides: Partial<{
    author: string;
    content: string;
    timeAgo: string;
  }> = {},
) => ({
  id,
  teamId: 'LG',
  team: 'LG',
  postType: 'NOTICE' as const,
  author: overrides.author ?? 'BEGA 운영팀',
  authorHandle: '@bega_notice',
  content: overrides.content ?? `서비스 공지사항 ${id}`,
  timeAgo: overrides.timeAgo ?? `${id}분 전`,
  teamColor: '#c30452',
  likeCount: id,
  commentCount: id,
  bookmarkCount: 0,
  repostCount: 0,
  views: id * 10,
  isHot: false,
  createdAt: '2026-08-27T00:00:00Z',
  updatedAt: '2026-08-27T00:00:00Z',
  liked: false,
  bookmarked: false,
  isOwner: false,
  repostedByMe: false,
  imageUrls: [],
});

const visualQaNoticePosts = {
  empty: [],
  single: [makeVisualQaNoticePost(1, { content: '서비스 이용 안내' })],
  'long-korean': [makeVisualQaNoticePost(1, {
    author: '모바일 화면에서도 자연스럽게 여러 줄로 표시되어야 하는 매우 긴 운영자 이름',
    content: '공지사항 제목이 가장 좁은 모바일 화면에서도 카드 경계와 아이콘 영역을 침범하지 않고 자연스럽게 여러 줄로 표시되는지 확인하는 긴 한국어 안내입니다.',
    timeAgo: '아주 오래 전 업데이트된 공지사항',
  })],
  'unbroken-token': [makeVisualQaNoticePost(1, {
    author: `NOTICE-AUTHOR-${'UNBROKEN'.repeat(16)}`,
    content: `NOTICE-${'UNBROKEN'.repeat(24)}`,
    timeAgo: `NOTICE-TIME-${'UNBROKEN'.repeat(12)}`,
  })],
  'maximum-supported': Array.from({ length: 31 }, (_, index) => makeVisualQaNoticePost(
    index + 1,
    { content: `페이지 이동을 검증하는 공지사항 ${index + 1}` },
  )),
};

type VisualQaClientErrorDataState =
  | 'empty'
  | 'populated'
  | 'null-optional'
  | 'boundary-minimum'
  | 'boundary-maximum'
  | 'long-korean'
  | 'unbroken-token'
  | 'maximum-supported';

type VisualQaClientErrorTrendDataState =
  | 'empty'
  | 'single'
  | 'boundary-minimum'
  | 'boundary-maximum'
  | 'long-korean'
  | 'unbroken-token'
  | 'maximum-supported'
  | 'zero';

type VisualQaClientErrorTrendPoint = {
  label: string;
  api: number;
  runtime: number;
  feedback: number;
};

const resolveVisualQaClientErrorTrendData = (
  data: VisualQaClientErrorTrendDataState,
): VisualQaClientErrorTrendPoint[] => {
  if (data === 'empty') return [];
  if (data === 'single') {
    return [{ label: '00:00', api: 3, runtime: 2, feedback: 1 }];
  }
  if (data === 'boundary-minimum') {
    return [
      { label: 'M', api: 0, runtime: 1, feedback: 0 },
      { label: 'M', api: 1, runtime: 0, feedback: 1 },
    ];
  }
  if (data === 'boundary-maximum') {
    return [{
      label: 'MAX',
      api: Number.MAX_SAFE_INTEGER,
      runtime: Number.MAX_SAFE_INTEGER,
      feedback: Number.MAX_SAFE_INTEGER,
    }];
  }
  if (data === 'long-korean') {
    const label = '가장 좁은 관리자 모바일 화면에서도 시간 구간 전체 문구가 보존되어야 합니다.';
    return Array.from({ length: 3 }, (_, index) => ({
      label: `${label} ${index + 1}`,
      api: index + 1,
      runtime: index + 2,
      feedback: index,
    }));
  }
  if (data === 'unbroken-token') {
    const label = `MOCK_CLIENT_ERROR_TREND_UNBROKEN_${'TOKEN'.repeat(48)}`;
    return Array.from({ length: 3 }, (_, index) => ({
      label: `${label}_${index + 1}`,
      api: index + 1,
      runtime: index,
      feedback: index + 2,
    }));
  }
  if (data === 'maximum-supported') {
    return Array.from({ length: 20 }, (_, index) => ({
      label: `MOCK ${String(index).padStart(2, '0')}:00`,
      api: (index * 3) % 11,
      runtime: (index * 5) % 13,
      feedback: (index * 7) % 9,
    }));
  }

  return Array.from({ length: 3 }, (_, index) => ({
    label: `ZERO ${index + 1}`,
    api: 0,
    runtime: 0,
    feedback: 0,
  }));
};

const makeVisualQaClientErrorEvent = (
  index: number,
  bucket: AdminClientErrorEventSummary['bucket'],
  source: AdminClientErrorEventSummary['source'],
  overrides: Partial<AdminClientErrorEventSummary> = {},
): AdminClientErrorEventSummary => ({
  eventId: index === 0 ? 'MOCK_EVENT_1' : `MOCK_RECENT_${index}`,
  bucket,
  source,
  message: index === 0 ? 'MOCK 클라이언트 오류' : `MOCK 최근 이벤트 ${index}`,
  statusCode: 500,
  statusGroup: '5xx',
  responseCode: 'MOCK_ERROR',
  route: '/MOCK/route',
  normalizedRoute: '/MOCK/route',
  method: 'GET',
  endpoint: '/api/MOCK',
  normalizedEndpoint: '/api/MOCK',
  fingerprint: 'MOCK_FINGERPRINT',
  occurredAt: `2026-08-29T00:${String(index).padStart(2, '0')}:00.000Z`,
  sessionId: `MOCK_SESSION_${index}`,
  userId: index + 7,
  feedbackCount: index === 0 ? 1 : index,
  ...overrides,
});

const resolveVisualQaClientErrorDetail = (
  data: VisualQaClientErrorDataState,
  bucket: AdminClientErrorEventSummary['bucket'],
  source: AdminClientErrorEventSummary['source'],
): AdminClientErrorEventDetail => {
  const longKorean = '가장 좁은 관리자 모바일 화면에서도 오류 원인과 사용자 피드백이 카드 경계를 벗어나지 않고 자연스럽게 여러 줄로 표시되어야 합니다. '.repeat(8).trim();
  const unbroken = `MOCK_CLIENT_ERROR_${'UNBROKEN'.repeat(48)}`;
  const eventOverrides: Partial<AdminClientErrorEventSummary> = {};
  let stack: string | null = 'Error: MOCK stack\n    at MOCK component';
  let componentStack: string | null = 'at MOCKComponent\n    at MOCKBoundary';
  let feedbackCount = 1;
  let recentCount = 1;
  let feedbackComment = 'MOCK 피드백';

  if (data === 'empty') {
    feedbackCount = 0;
    recentCount = 0;
    eventOverrides.feedbackCount = 0;
  } else if (data === 'null-optional') {
    Object.assign(eventOverrides, {
      endpoint: null,
      method: null,
      normalizedEndpoint: null,
      responseCode: null,
      sessionId: null,
      statusCode: null,
      userId: null,
    });
    stack = null;
    componentStack = null;
  } else if (data === 'boundary-minimum') {
    Object.assign(eventOverrides, {
      eventId: 'MOCK_M',
      feedbackCount: 0,
      fingerprint: 'M',
      message: 'M',
      route: '/',
      normalizedRoute: '/',
      statusCode: 0,
      statusGroup: '0xx',
    });
    feedbackCount = 0;
    recentCount = 0;
    stack = 'M';
    componentStack = 'M';
  } else if (data === 'boundary-maximum') {
    Object.assign(eventOverrides, {
      feedbackCount: Number.MAX_SAFE_INTEGER,
      statusCode: Number.MAX_SAFE_INTEGER,
      statusGroup: 'maximum',
      userId: Number.MAX_SAFE_INTEGER,
    });
  } else if (data === 'long-korean') {
    Object.assign(eventOverrides, {
      endpoint: `/api/${longKorean}`,
      eventId: `MOCK_LONG_${longKorean}`,
      fingerprint: longKorean,
      message: longKorean,
      route: `/관리자/${longKorean}`,
    });
    feedbackComment = longKorean;
    stack = `Error: ${longKorean}\n    at 긴한국어컴포넌트`;
    componentStack = `at 긴한국어컴포넌트\n${longKorean}`;
  } else if (data === 'unbroken-token') {
    Object.assign(eventOverrides, {
      endpoint: unbroken,
      eventId: unbroken,
      fingerprint: unbroken,
      message: unbroken,
      route: unbroken,
    });
    feedbackComment = unbroken;
    stack = `Error:${unbroken}`;
    componentStack = `at${unbroken}`;
  } else if (data === 'maximum-supported') {
    feedbackCount = 50;
    recentCount = 50;
    eventOverrides.feedbackCount = 50;
    stack = `Error: MOCK maximum stack\n${'    at MOCKMaximumFrame\n'.repeat(80)}`;
    componentStack = `at MOCKMaximumComponent\n${'    at MOCKMaximumBoundary\n'.repeat(80)}`;
  }

  const event = makeVisualQaClientErrorEvent(0, bucket, source, eventOverrides);
  return {
    event,
    stack,
    componentStack,
    feedback: Array.from({ length: feedbackCount }, (_, index) => ({
      eventId: event.eventId,
      route: event.route,
      actionTaken: `MOCK_ACTION_${index + 1}`,
      comment: feedbackCount === 1 ? feedbackComment : `MOCK 피드백 ${index + 1}`,
      occurredAt: `2026-08-29T01:${String(index).padStart(2, '0')}:00.000Z`,
    })),
    sameFingerprintRecentEvents: Array.from({ length: recentCount }, (_, index) => (
      makeVisualQaClientErrorEvent(index + 1, bucket, source, {
        fingerprint: event.fingerprint,
      })
    )),
  };
};

type VisualQaClientErrorInsightsInventory =
  | 'none'
  | 'feedback-only'
  | 'alerts-only'
  | 'both';

const resolveVisualQaClientErrorInsightsDashboard = (
  data: VisualQaClientErrorDataState,
  inventory: VisualQaClientErrorInsightsInventory,
  bucket: AdminClientErrorAlertNotification['bucket'],
  channel: AdminClientErrorAlertNotification['channel'],
  deliveryStatus: AdminClientErrorAlertNotification['deliveryStatus'],
): AdminClientErrorDashboard | null => {
  if (data === 'empty') return null;

  const longKorean = '가장 좁은 관리자 모바일 화면에서도 최근 피드백과 알림 결과가 카드 경계를 벗어나지 않고 자연스럽게 여러 줄로 표시되어야 합니다. '.repeat(8).trim();
  const unbroken = `MOCK_CLIENT_ERROR_INSIGHTS_${'UNBROKEN'.repeat(48)}`;
  const itemCount = data === 'maximum-supported' ? 50 : 1;
  const includeFeedback = inventory === 'feedback-only' || inventory === 'both';
  const includeAlerts = inventory === 'alerts-only' || inventory === 'both';

  const recentFeedback: AdminClientErrorRecentFeedback[] = includeFeedback
    ? Array.from({ length: itemCount }, (_, index) => {
      const sequence = index + 1;
      const baseline: AdminClientErrorRecentFeedback = {
        eventId: `MOCK_FEEDBACK_EVENT_${sequence}`,
        route: `/MOCK/feedback/${sequence}`,
        actionTaken: `MOCK_ACTION_${sequence}`,
        comment: `MOCK 피드백 ${sequence}`,
        occurredAt: `2000-01-01T00:00:${String(index).padStart(2, '0')}.000Z`,
      };
      if (data === 'boundary-minimum') {
        return { ...baseline, eventId: 'M', route: '/', actionTaken: 'M', comment: 'M' };
      }
      if (data === 'boundary-maximum') {
        return {
          ...baseline,
          eventId: `MOCK_${Number.MAX_SAFE_INTEGER}`,
          route: `/MOCK/${Number.MAX_SAFE_INTEGER}`,
          actionTaken: `MOCK_${Number.MAX_SAFE_INTEGER}`,
          comment: `MOCK ${Number.MAX_SAFE_INTEGER}`,
        };
      }
      if (data === 'long-korean') {
        return {
          ...baseline,
          eventId: `MOCK_LONG_${longKorean}`,
          route: `/관리자/${longKorean}`,
          actionTaken: longKorean,
          comment: longKorean,
        };
      }
      if (data === 'unbroken-token') {
        return {
          ...baseline,
          eventId: unbroken,
          route: unbroken,
          actionTaken: unbroken,
          comment: unbroken,
        };
      }
      return baseline;
    })
    : [];

  const recentAlerts: AdminClientErrorAlertNotification[] = includeAlerts
    ? Array.from({ length: itemCount }, (_, index) => {
      const sequence = index + 1;
      const baseline: AdminClientErrorAlertNotification = {
        id: sequence,
        fingerprint: `MOCK_ALERT_FINGERPRINT_${sequence}`,
        bucket,
        source: 'api',
        channel,
        route: `/MOCK/alert/${sequence}`,
        statusGroup: '5xx',
        observedCount: 5,
        thresholdCount: 3,
        windowMinutes: 10,
        latestEventId: `MOCK_ALERT_EVENT_${sequence}`,
        latestMessage: `MOCK 알림 ${sequence}`,
        latestOccurredAt: `2000-01-01T00:00:${String(index).padStart(2, '0')}.000Z`,
        notifiedAt: `2000-01-01T01:00:${String(index).padStart(2, '0')}.000Z`,
        deliveryStatus,
        failureReason: deliveryStatus === 'FAILED' ? `MOCK_DELIVERY_FAILURE_${sequence}` : null,
      };
      if (data === 'null-optional') {
        return {
          ...baseline,
          latestEventId: null,
          latestMessage: null,
          latestOccurredAt: null,
          failureReason: null,
        };
      }
      if (data === 'boundary-minimum') {
        return {
          ...baseline,
          id: 0,
          fingerprint: 'M',
          route: '/',
          statusGroup: '0xx',
          observedCount: 0,
          thresholdCount: 0,
          windowMinutes: 0,
          latestEventId: 'M',
          latestMessage: 'M',
        };
      }
      if (data === 'boundary-maximum') {
        return {
          ...baseline,
          id: Number.MAX_SAFE_INTEGER,
          fingerprint: `MOCK_${Number.MAX_SAFE_INTEGER}`,
          observedCount: Number.MAX_SAFE_INTEGER,
          thresholdCount: Number.MAX_SAFE_INTEGER,
          windowMinutes: Number.MAX_SAFE_INTEGER,
        };
      }
      if (data === 'long-korean') {
        return {
          ...baseline,
          fingerprint: longKorean,
          route: `/관리자/${longKorean}`,
          statusGroup: longKorean,
          latestMessage: longKorean,
          failureReason: deliveryStatus === 'FAILED' ? longKorean : null,
        };
      }
      if (data === 'unbroken-token') {
        return {
          ...baseline,
          fingerprint: unbroken,
          route: unbroken,
          statusGroup: unbroken,
          latestMessage: unbroken,
          failureReason: deliveryStatus === 'FAILED' ? unbroken : null,
        };
      }
      return baseline;
    })
    : [];

  return {
    from: '2000-01-01T00:00:00.000Z',
    to: '2000-01-02T00:00:00.000Z',
    granularity: 'hour',
    totals: {
      api: bucket === 'api' ? recentAlerts.length : 0,
      runtime: bucket === 'runtime' ? recentAlerts.length : 0,
      feedback: recentFeedback.length + (bucket === 'feedback' ? recentAlerts.length : 0),
      uniqueFingerprints: recentAlerts.length,
      affectedRoutes: recentFeedback.length + recentAlerts.length,
    },
    timeSeries: [],
    topFingerprints: [],
    recentFeedback,
    recentAlerts,
  };
};

type VisualQaClientErrorPanelSystem =
  | 'idle'
  | 'inactive'
  | 'dashboard-loading'
  | 'events-loading'
  | 'refresh-loading'
  | 'panel-error'
  | 'detail-error';

type VisualQaClientErrorPanelInventory =
  | 'none'
  | 'dashboard-only'
  | 'events-only'
  | 'both';

interface VisualQaClientErrorPanelPreset {
  data: VisualQaClientErrorDataState;
  system: VisualQaClientErrorPanelSystem;
  inventory: VisualQaClientErrorPanelInventory;
  chartPhase: 'fallback' | 'resolved';
  insightsPhase: 'deferred-fallback' | 'suspense-fallback' | 'resolved';
  detailPhase: 'closed' | 'suspense-fallback' | 'resolved';
  windowKey: '1h' | '24h' | '7d';
  page: 'first' | 'middle' | 'last';
  filters: ClientErrorAdminEventFilters;
}

const visualQaClientErrorEmptyFilters = (): ClientErrorAdminEventFilters => ({
  bucket: 'all',
  source: 'all',
  statusGroup: 'all',
  route: '',
  fingerprint: '',
  search: '',
});

const makeVisualQaClientErrorPanelPreset = (
  data: VisualQaClientErrorDataState,
  system: VisualQaClientErrorPanelSystem,
  inventory: VisualQaClientErrorPanelInventory,
  overrides: Partial<Omit<
    VisualQaClientErrorPanelPreset,
    'data' | 'system' | 'inventory'
  >> = {},
): VisualQaClientErrorPanelPreset => ({
  data,
  system,
  inventory,
  chartPhase: 'resolved',
  insightsPhase: 'resolved',
  detailPhase: 'closed',
  windowKey: '24h',
  page: 'first',
  filters: visualQaClientErrorEmptyFilters(),
  ...overrides,
});

const visualQaClientErrorLongFilter = '가장 좁은 관리자 모바일 화면에서도 검색 필터의 긴 한국어 문장이 입력 영역 밖으로 넘치지 않아야 합니다. '.repeat(4).trim();
const visualQaClientErrorUnbrokenFilter = `MOCK_CLIENT_ERROR_FILTER_UNBROKEN_${'TOKEN'.repeat(48)}`;

const visualQaClientErrorPanelPresets = {
  'none-empty': makeVisualQaClientErrorPanelPreset('empty', 'idle', 'none'),
  'dashboard-only-empty': makeVisualQaClientErrorPanelPreset('empty', 'idle', 'dashboard-only'),
  'dashboard-only-populated': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'dashboard-only'),
  'dashboard-only-null-optional': makeVisualQaClientErrorPanelPreset('null-optional', 'idle', 'dashboard-only'),
  'dashboard-only-boundary-minimum': makeVisualQaClientErrorPanelPreset('boundary-minimum', 'idle', 'dashboard-only'),
  'dashboard-only-boundary-maximum': makeVisualQaClientErrorPanelPreset('boundary-maximum', 'idle', 'dashboard-only'),
  'dashboard-only-long-korean': makeVisualQaClientErrorPanelPreset('long-korean', 'idle', 'dashboard-only'),
  'dashboard-only-unbroken-token': makeVisualQaClientErrorPanelPreset('unbroken-token', 'idle', 'dashboard-only'),
  'dashboard-only-maximum-supported': makeVisualQaClientErrorPanelPreset('maximum-supported', 'idle', 'dashboard-only'),
  'events-only-populated': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'events-only'),
  'events-only-null-optional': makeVisualQaClientErrorPanelPreset('null-optional', 'idle', 'events-only'),
  'events-only-boundary-minimum': makeVisualQaClientErrorPanelPreset('boundary-minimum', 'idle', 'events-only'),
  'events-only-boundary-maximum': makeVisualQaClientErrorPanelPreset('boundary-maximum', 'idle', 'events-only'),
  'events-only-long-korean': makeVisualQaClientErrorPanelPreset('long-korean', 'idle', 'events-only'),
  'events-only-unbroken-token': makeVisualQaClientErrorPanelPreset('unbroken-token', 'idle', 'events-only'),
  'events-only-maximum-supported': makeVisualQaClientErrorPanelPreset(
    'maximum-supported',
    'idle',
    'events-only',
    { page: 'middle' },
  ),
  'both-populated': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'both'),
  'both-null-optional': makeVisualQaClientErrorPanelPreset('null-optional', 'idle', 'both'),
  'both-boundary-minimum': makeVisualQaClientErrorPanelPreset('boundary-minimum', 'idle', 'both'),
  'both-boundary-maximum': makeVisualQaClientErrorPanelPreset('boundary-maximum', 'idle', 'both'),
  'both-long-korean': makeVisualQaClientErrorPanelPreset('long-korean', 'idle', 'both'),
  'both-unbroken-token': makeVisualQaClientErrorPanelPreset('unbroken-token', 'idle', 'both'),
  'both-maximum-supported': makeVisualQaClientErrorPanelPreset(
    'maximum-supported',
    'idle',
    'both',
    { page: 'middle' },
  ),
  inactive: makeVisualQaClientErrorPanelPreset('empty', 'inactive', 'none'),
  'dashboard-loading': makeVisualQaClientErrorPanelPreset('populated', 'dashboard-loading', 'both'),
  'events-loading': makeVisualQaClientErrorPanelPreset('populated', 'events-loading', 'both'),
  'refresh-loading': makeVisualQaClientErrorPanelPreset('populated', 'refresh-loading', 'both'),
  'panel-error': makeVisualQaClientErrorPanelPreset('long-korean', 'panel-error', 'both'),
  'detail-error': makeVisualQaClientErrorPanelPreset(
    'populated',
    'detail-error',
    'both',
    { detailPhase: 'resolved' },
  ),
  'chart-fallback': makeVisualQaClientErrorPanelPreset(
    'maximum-supported',
    'idle',
    'both',
    { chartPhase: 'fallback', page: 'middle' },
  ),
  'insights-deferred-fallback': makeVisualQaClientErrorPanelPreset(
    'maximum-supported',
    'idle',
    'both',
    { insightsPhase: 'deferred-fallback', page: 'middle' },
  ),
  'insights-suspense-fallback': makeVisualQaClientErrorPanelPreset(
    'maximum-supported',
    'idle',
    'both',
    { insightsPhase: 'suspense-fallback', page: 'middle' },
  ),
  'detail-suspense-fallback': makeVisualQaClientErrorPanelPreset(
    'maximum-supported',
    'idle',
    'both',
    { detailPhase: 'suspense-fallback', page: 'middle' },
  ),
  'detail-resolved-loading': makeVisualQaClientErrorPanelPreset(
    'maximum-supported',
    'idle',
    'both',
    { detailPhase: 'resolved', page: 'middle' },
  ),
  'detail-resolved-populated': makeVisualQaClientErrorPanelPreset(
    'maximum-supported',
    'idle',
    'both',
    { detailPhase: 'resolved', page: 'middle' },
  ),
  'window-1h': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'both', { windowKey: '1h' }),
  'window-7d': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'both', { windowKey: '7d' }),
  'page-middle': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'both', { page: 'middle' }),
  'page-last': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'both', { page: 'last' }),
  'filter-bucket-api': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'both', {
    filters: { ...visualQaClientErrorEmptyFilters(), bucket: 'api' },
  }),
  'filter-bucket-runtime': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'both', {
    filters: { ...visualQaClientErrorEmptyFilters(), bucket: 'runtime' },
  }),
  'filter-source-api': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'both', {
    filters: { ...visualQaClientErrorEmptyFilters(), source: 'api' },
  }),
  'filter-source-runtime': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'both', {
    filters: { ...visualQaClientErrorEmptyFilters(), source: 'runtime' },
  }),
  'filter-source-unhandled-rejection': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'both', {
    filters: { ...visualQaClientErrorEmptyFilters(), source: 'unhandled_rejection' },
  }),
  'filter-status-5xx': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'both', {
    filters: { ...visualQaClientErrorEmptyFilters(), statusGroup: '5xx' },
  }),
  'filter-status-4xx': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'both', {
    filters: { ...visualQaClientErrorEmptyFilters(), statusGroup: '4xx' },
  }),
  'filter-status-none': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'both', {
    filters: { ...visualQaClientErrorEmptyFilters(), statusGroup: 'none' },
  }),
  'filter-route': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'both', {
    filters: { ...visualQaClientErrorEmptyFilters(), route: '/MOCK/client-error/route' },
  }),
  'filter-fingerprint': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'both', {
    filters: { ...visualQaClientErrorEmptyFilters(), fingerprint: 'MOCK_FILTER_FINGERPRINT' },
  }),
  'filter-search': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'both', {
    filters: { ...visualQaClientErrorEmptyFilters(), search: 'MOCK client error search' },
  }),
  'filter-long-korean': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'both', {
    filters: { ...visualQaClientErrorEmptyFilters(), search: visualQaClientErrorLongFilter },
  }),
  'filter-unbroken-token': makeVisualQaClientErrorPanelPreset('populated', 'idle', 'both', {
    filters: { ...visualQaClientErrorEmptyFilters(), search: visualQaClientErrorUnbrokenFilter },
  }),
} as const satisfies Record<string, VisualQaClientErrorPanelPreset>;

type VisualQaClientErrorPanelPresetName = keyof typeof visualQaClientErrorPanelPresets;

const resolveVisualQaClientErrorPanelDashboard = (
  data: VisualQaClientErrorDataState,
): AdminClientErrorDashboard => {
  const boundedInsights = resolveVisualQaClientErrorInsightsDashboard(
    data,
    'both',
    'api',
    'telegram',
    'SENT',
  );
  const dashboard: AdminClientErrorDashboard = boundedInsights ?? {
    from: '2000-01-01T00:00:00.000Z',
    to: '2000-01-02T00:00:00.000Z',
    granularity: 'hour',
    totals: { api: 0, runtime: 0, feedback: 0, uniqueFingerprints: 0, affectedRoutes: 0 },
    timeSeries: [],
    topFingerprints: [],
    recentFeedback: [],
    recentAlerts: [],
  };
  const itemCount = data === 'empty' ? 0 : data === 'maximum-supported' ? 20 : 1;
  const detail = resolveVisualQaClientErrorDetail(data, 'api', 'api');
  const event = detail.event;
  const numericValue = data === 'boundary-minimum'
    ? 0
    : data === 'boundary-maximum'
      ? Number.MAX_SAFE_INTEGER
      : 1;

  return {
    ...dashboard,
    timeSeries: Array.from({ length: itemCount }, (_, index) => ({
      bucketStart: `2000-01-01T${String(index).padStart(2, '0')}:00:00.000Z`,
      api: numericValue,
      runtime: numericValue,
      feedback: numericValue,
    })),
    topFingerprints: Array.from({ length: itemCount }, (_, index) => ({
      fingerprint: itemCount === 1 ? event.fingerprint : `${event.fingerprint}_${index + 1}`,
      bucket: event.bucket,
      source: event.source,
      message: event.message,
      route: event.route,
      endpoint: event.endpoint,
      statusGroup: event.statusGroup,
      method: event.method,
      count: numericValue,
      uniqueSessions: numericValue,
      latestEventId: itemCount === 1 ? event.eventId : `${event.eventId}_${index + 1}`,
      latestOccurredAt: event.occurredAt,
      latestAlertSentAt: data === 'null-optional' ? null : '2000-01-01T01:00:00.000Z',
      latestAlertChannel: data === 'null-optional' ? null : 'telegram',
    })),
  };
};

const resolveVisualQaClientErrorPanelEventsPage = (
  data: VisualQaClientErrorDataState,
  page: VisualQaClientErrorPanelPreset['page'],
  includeEvents: boolean,
): AdminClientErrorEventPage => {
  const itemCount = includeEvents ? data === 'maximum-supported' ? 20 : 1 : 0;
  const event = resolveVisualQaClientErrorDetail(data, 'api', 'api').event;
  const content = Array.from({ length: itemCount }, (_, index) => ({
    ...event,
    eventId: itemCount === 1 ? event.eventId : `${event.eventId}_${index + 1}`,
    occurredAt: `2000-01-01T00:${String(index).padStart(2, '0')}:00.000Z`,
  }));
  const paginated = includeEvents && page !== 'first';
  const totalPages = includeEvents ? paginated || data === 'maximum-supported' ? 3 : 1 : 0;
  const number = page === 'middle' ? 1 : page === 'last' ? 2 : 0;

  return {
    content,
    totalElements: totalPages > 1 ? 60 : content.length,
    totalPages,
    size: 20,
    number,
    last: totalPages === 0 || number >= totalPages - 1,
    first: number === 0,
    empty: content.length === 0,
    numberOfElements: content.length,
  };
};

const resolveVisualQaClientErrorPanelState = (
  presetName: VisualQaClientErrorPanelPresetName,
  preset: VisualQaClientErrorPanelPreset,
): ClientErrorAdminPanelVisualQaState => {
  const hasDashboard = preset.inventory === 'dashboard-only' || preset.inventory === 'both';
  const hasEvents = preset.inventory === 'events-only' || preset.inventory === 'both';
  const detailOpen = preset.detailPhase !== 'closed';
  const detailLoading = presetName === 'detail-resolved-loading';
  const detailMissing = presetName === 'detail-error' || detailLoading;

  return {
    active: preset.system !== 'inactive',
    windowKey: preset.windowKey,
    filters: { ...preset.filters },
    dashboard: hasDashboard ? resolveVisualQaClientErrorPanelDashboard(preset.data) : null,
    eventsPage: resolveVisualQaClientErrorPanelEventsPage(preset.data, preset.page, hasEvents),
    currentPage: preset.page === 'middle' ? 1 : preset.page === 'last' ? 2 : 0,
    loadingDashboard: preset.system === 'dashboard-loading' || preset.system === 'refresh-loading',
    loadingEvents: preset.system === 'events-loading' || preset.system === 'refresh-loading',
    panelError: preset.system === 'panel-error'
      ? '가장 좁은 관리자 모바일 화면에서도 클라이언트 오류 관제 경고 문구가 패널 경계를 벗어나지 않고 자연스럽게 여러 줄로 표시되어야 합니다. '.repeat(4).trim()
      : null,
    detailOpen,
    detailLoading,
    selectedEvent: detailOpen && !detailMissing
      ? resolveVisualQaClientErrorDetail(preset.data, 'api', 'api')
      : null,
    chartPhase: preset.chartPhase,
    insightsPhase: preset.insightsPhase,
    detailPhase: preset.detailPhase,
  };
};

const visualQaClientErrorPanelInteractionTargets = {
  hover: new Set(['refresh', 'fingerprint', 'detail', 'previous', 'next']),
  pressed: new Set(['refresh', 'fingerprint', 'detail', 'previous', 'next']),
  'focus-visible': new Set([
    'refresh',
    'fingerprint',
    'detail',
    'previous',
    'next',
    'window',
    'bucket',
    'source',
    'status',
    'route',
    'fingerprint-input',
    'search',
  ]),
  input: new Set(['route', 'fingerprint-input', 'search']),
  change: new Set(['window', 'bucket', 'source', 'status']),
  'keyboard-navigation': new Set(['filter-tab-path']),
} as const;

type VisualQaOffseasonMovement = {
  id: number;
  date: string;
  section: string;
  team: string;
  player: string;
  summary?: string | null;
  remarks: string;
  contractTerm?: string | null;
  contractValue?: string | null;
  optionDetails?: string | null;
  counterpartyTeam?: string | null;
  counterpartyDetails?: string | null;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  announcedAt?: string | null;
  isBigEvent: boolean;
  estimatedAmount: number;
  displayAmount?: string | null;
};

const makeVisualQaOffseasonMovement = (
  id: number,
  overrides: Partial<VisualQaOffseasonMovement> = {},
): VisualQaOffseasonMovement => ({
  id,
  date: `2026-01-${String(Math.min(id, 28)).padStart(2, '0')}`,
  section: id % 2 === 0 ? '트레이드' : 'FA',
  team: `VISUAL_QA_TEAM_${(id % 4) + 1}`,
  player: `VISUAL QA 테스트 선수 ${id}`,
  summary: `Visual QA 모바일 검증용 비생산 mock 요약 ${id}`,
  remarks: `Visual QA 모바일 검증용 비생산 mock 메모 ${id}`,
  contractTerm: 'Visual QA 계약 기간',
  contractValue: 'Visual QA 계약 규모',
  optionDetails: 'Visual QA 옵션',
  counterpartyTeam: 'VISUAL_QA_COUNTERPARTY',
  counterpartyDetails: 'Visual QA 반대급부',
  sourceLabel: 'Visual QA 내부 mock',
  sourceUrl: '',
  announcedAt: '2026-01-15T09:00:00Z',
  isBigEvent: id % 2 === 1,
  estimatedAmount: 0,
  displayAmount: '비생산 mock 금액',
  ...overrides,
});

const visualQaOffseasonMovements = {
  empty: [],
  single: [makeVisualQaOffseasonMovement(1)],
  populated: Array.from({ length: 4 }, (_, index) => makeVisualQaOffseasonMovement(index + 1)),
  'maximum-supported': Array.from({ length: 30 }, (_, index) => makeVisualQaOffseasonMovement(index + 1)),
  'long-korean': [makeVisualQaOffseasonMovement(1, {
    player: '모바일 화면에서 여러 줄로 표시되어야 하는 매우 긴 Visual QA 테스트 선수 이름',
    team: '모바일 레이아웃 검증용 매우 긴 Visual QA 테스트 구단 코드',
    summary: '선수 이동의 계약 조건과 팀 변경 배경을 설명하는 긴 한국어 문장이 가장 좁은 화면에서도 카드 밖으로 나가지 않아야 합니다.',
    remarks: '선수 이동의 계약 조건과 팀 변경 배경을 설명하는 긴 한국어 원문 메모가 상세 패널 경계 안에서 자연스럽게 줄바꿈되어야 합니다.',
  })],
  'unbroken-token': [makeVisualQaOffseasonMovement(1, {
    player: `VISUAL-QA-${'UNBROKEN'.repeat(18)}`,
    team: `VISUAL-QA-TEAM-${'UNBROKEN'.repeat(14)}`,
    summary: `VISUAL-QA-SUMMARY-${'UNBROKEN'.repeat(24)}`,
    remarks: `VISUAL-QA-REMARKS-${'UNBROKEN'.repeat(28)}`,
    contractTerm: `VISUAL-QA-TERM-${'UNBROKEN'.repeat(12)}`,
    contractValue: `VISUAL-QA-VALUE-${'UNBROKEN'.repeat(12)}`,
    optionDetails: `VISUAL-QA-OPTION-${'UNBROKEN'.repeat(12)}`,
    counterpartyDetails: `VISUAL-QA-COUNTERPARTY-${'UNBROKEN'.repeat(12)}`,
    sourceLabel: `VISUAL-QA-SOURCE-${'UNBROKEN'.repeat(12)}`,
  })],
};

const makeVisualQaRanking = (rank: number, teamName = `VISUAL QA 테스트 구단 ${rank}`) => ({
  rank,
  teamId: `VISUAL_QA_TEAM_${rank}`,
  teamName,
  wins: rank,
  losses: 0,
  draws: 0,
  winRate: '1.000',
  games: rank,
});

const makeVisualQaAward = (index: number, pressure: 'default' | 'long-korean' | 'unbroken' = 'default') => ({
  award: pressure === 'long-korean'
    ? '모바일 화면에서 여러 줄로 표시되어야 하는 매우 긴 Visual QA 시상 부문'
    : pressure === 'unbroken'
      ? `VISUAL-QA-AWARD-${'UNBROKEN'.repeat(12)}`
      : `Visual QA 시상 부문 ${index}`,
  playerName: pressure === 'long-korean'
    ? '모바일 화면에서 자연스럽게 줄바꿈되는 매우 긴 Visual QA 테스트 선수 이름'
    : pressure === 'unbroken'
      ? `VISUAL-QA-PLAYER-${'UNBROKEN'.repeat(14)}`
      : `Visual QA 테스트 선수 ${index}`,
  team: `VISUAL_QA_TEAM_${index}`,
  stats: pressure === 'long-korean'
    ? '가장 좁은 화면에서도 카드 너비를 침범하지 않고 읽을 수 있어야 하는 긴 한국어 Visual QA 기록 설명입니다.'
    : pressure === 'unbroken'
      ? `VISUAL-QA-STATS-${'UNBROKEN'.repeat(20)}`
      : `Visual QA 비생산 mock 기록 ${index}`,
});

const resolveVisualQaOffseasonMovements = (context: ComponentStateAdapterContext) => (
  requireStateValueFromMap(context, 'data', visualQaOffseasonMovements)
);

const resolveVisualQaOffseasonTheme = (context: ComponentStateAdapterContext) => (
  resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', { dark: 'dark', light: 'light' })
);

const resolveVisualQaOffseasonLayout = (context: ComponentStateAdapterContext) => (
  resolveDeclaredVariant<boolean>(context, 'layout', { desktop: false, mobile: true })
);

const visualQaOffseasonHomeData = (context: ComponentStateAdapterContext) => {
  const data = context.states.data;
  if (data === 'loading') return { movements: [], awards: [], rankings: [] };
  const movements = resolveVisualQaOffseasonMovements(context);
  if (data === 'empty') return { movements, awards: [], rankings: [] };
  if (data === 'maximum-supported') {
    return {
      movements,
      awards: Array.from({ length: 4 }, (_, index) => makeVisualQaAward(index + 1)),
      rankings: Array.from({ length: 10 }, (_, index) => makeVisualQaRanking(index + 1)),
    };
  }
  if (data === 'long-korean') {
    return {
      movements,
      awards: [makeVisualQaAward(1, 'long-korean')],
      rankings: [makeVisualQaRanking(1, '모바일 화면에서 여러 줄로 표시되어야 하는 매우 긴 Visual QA 테스트 구단 이름')],
    };
  }
  if (data === 'unbroken-token') {
    return {
      movements,
      awards: [makeVisualQaAward(1, 'unbroken')],
      rankings: [makeVisualQaRanking(1, `VISUAL-QA-TEAM-${'UNBROKEN'.repeat(14)}`)],
    };
  }
  return {
    movements,
    awards: [makeVisualQaAward(1)],
    rankings: [makeVisualQaRanking(1)],
  };
};

const offseasonMobileSurface = 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-transparent p-0 shadow-none';

const requireOffseasonInteraction = (
  context: ComponentStateAdapterContext,
  allowedTargets: readonly string[],
  allowedInteractions: readonly string[] = ['default', 'hover', 'focus-visible', 'pressed'],
) => {
  const interaction = context.states.interactions;
  if (!interaction || !allowedInteractions.includes(interaction)) {
    throw new Error(`지원하지 않는 Visual QA offseason interaction: ${interaction ?? '<missing>'}`);
  }
  if (interaction !== 'default' && !allowedTargets.includes(context.interactionTargetId ?? '')) {
    throw new Error(`지원하지 않는 Visual QA offseason interaction target: ${context.interactionTargetId ?? '<missing>'}`);
  }
  return interaction;
};

const sajikGuideLongQuery = '모바일에서도 입력 영역과 결과 카드가 겹치지 않는 매우 긴 사직야구장 좌석 블록 검색어';
const sajikGuideMatches = (limit: number, reason: string) => SAJIK_CANONICAL_BLOCKS
  .slice(0, limit)
  .map((block) => ({ block, reasons: [reason] }));
const sajikGuideData = {
  empty: {
    matches: [],
    query: '등록되지않은구역',
  },
  'long-korean': {
    matches: sajikGuideMatches(3, '공식 좌석 블록 · 모바일 긴 문구 점검'),
    query: sajikGuideLongQuery,
  },
  'maximum-supported': {
    matches: sajikGuideMatches(SAJIK_CANONICAL_BLOCKS.length, '공식 좌석 블록'),
    query: '',
  },
  populated: {
    matches: sajikGuideMatches(10, '공식 좌석 블록'),
    query: '',
  },
  'unbroken-token': {
    matches: sajikGuideMatches(3, `SAJIK-REASON-${'X'.repeat(160)}`),
    query: `SAJIK-${'X'.repeat(160)}`,
  },
};

const sajikGuideInteractions = {
  default: true,
  'focus-visible': true,
  hover: true,
  pressed: true,
};

const sajikSeatMapInteractions = {
  default: true,
  'focus-visible': true,
  hover: true,
  input: true,
  'keyboard-navigation': true,
  open: true,
  pressed: true,
  selected: true,
};

const sajikSeatMapSvgInteractions = {
  default: true,
  'focus-visible': true,
  hover: true,
  'keyboard-navigation': true,
  pressed: true,
};

const sajikSeatMapEditorInteractions = {
  default: true,
  'focus-visible': true,
  hover: true,
  input: true,
  pressed: true,
  selected: true,
};

const sajikSvgReferenceBlock = SAJIK_CANONICAL_BLOCKS.find((block) => block.id === 'sajik-canonical-322')
  ?? SAJIK_CANONICAL_BLOCKS[0];

const retroPowerupCountValues = {
  0: 0,
  1: 1,
  max: Number.MAX_SAFE_INTEGER,
};

const retroPowerupActiveSets: Record<string, string[]> = {
  none: [],
  'magic-bat': ['MAGIC_BAT'],
  'golden-glove': ['GOLDEN_GLOVE'],
  scouter: ['SCOUTER'],
  'magic-bat-golden-glove': ['MAGIC_BAT', 'GOLDEN_GLOVE'],
  'magic-bat-scouter': ['MAGIC_BAT', 'SCOUTER'],
  'golden-glove-scouter': ['GOLDEN_GLOVE', 'SCOUTER'],
  all: ['MAGIC_BAT', 'GOLDEN_GLOVE', 'SCOUTER'],
};

const retroPowerupHandlers: Record<string, ((type: string) => Promise<void>) | undefined> = {
  missing: undefined,
  idle: async () => {},
  pending: () => new Promise<void>(() => {}),
  error: async () => { throw new Error('Visual QA power-up use failed'); },
  success: async () => {},
};

const retroUserStatsIdentities = {
  'normal-image': {
    profileImageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%2300ffff"/%3E%3C/svg%3E',
    userName: '비주얼 QA',
  },
  'missing-image': {
    profileImageUrl: undefined,
    userName: '비주얼 QA',
  },
  'broken-image': {
    profileImageUrl: 'data:image/png;base64,bm90LXZhbGlk',
    userName: '비주얼 QA',
  },
  'long-korean': {
    profileImageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%23ff00ff"/%3E%3C/svg%3E',
    userName: '가장 긴 사용자 이름이 모바일 통계 패널 안에서도 안전하게 줄바꿈되는 상태',
  },
  'unbroken-token-broken-image': {
    profileImageUrl: 'data:image/png;base64,bm90LXZhbGlk',
    userName: `USER-${'X'.repeat(160)}`,
  },
};

const retroUserStatsMetrics = {
  'zero-null': {
    accuracy: undefined,
    maxStreak: 0,
    seasonScore: 0,
    totalScore: 0,
  },
  normal: {
    accuracy: 72.5,
    maxStreak: 2,
    seasonScore: 987,
    totalScore: 456,
  },
  compact: {
    accuracy: 100,
    maxStreak: 99,
    seasonScore: 1000,
    totalScore: 1000000,
  },
  'maximum-supported': {
    accuracy: 100,
    maxStreak: Number.MAX_SAFE_INTEGER,
    seasonScore: Number.MAX_SAFE_INTEGER,
    totalScore: Number.MAX_SAFE_INTEGER,
  },
};

const retroUserStatsRanks = {
  first: 1,
  second: 2,
  third: 3,
  'top-ten': 10,
  regular: 11,
  'maximum-supported': Number.MAX_SAFE_INTEGER,
};

const retroUserStatsStreaks = {
  none: 0,
  low: 1,
  combo: 3,
  hot: 5,
  fire: 7,
  'maximum-supported': Number.MAX_SAFE_INTEGER,
};

const retroUserStatsXp = {
  'rookie-start': {
    experiencePoints: 0,
    level: 1,
    nextLevelExp: 100,
  },
  'minor-partial': {
    experiencePoints: 11050,
    level: 11,
    nextLevelExp: 12100,
  },
  'major-complete': {
    experiencePoints: 96100,
    level: 31,
    nextLevelExp: 96100,
  },
  'hall-overflow': {
    experiencePoints: 999999,
    level: 61,
    nextLevelExp: 372100,
  },
  'maximum-supported': {
    experiencePoints: Number.MAX_SAFE_INTEGER,
    level: 999,
    nextLevelExp: Number.MAX_SAFE_INTEGER,
  },
};

const reviewDialogReviewees = {
  normal: {
    handle: 'visual-qa',
    name: '비주얼 QA',
  },
  'long-korean': {
    handle: 'visual-qa-long',
    name: '모바일 리뷰 대화상자에서 여러 줄로 표시되는 매우 긴 한국어 참여자 이름',
  },
  'unbroken-token': {
    handle: 'visual-qa-token',
    name: `REVIEWEE-${'X'.repeat(160)}`,
  },
};

const reviewDialogCommentPresets = {
  empty: true,
  short: true,
  'long-korean': true,
  'unbroken-200': true,
};

const reviewDialogInteractionStates = {
  default: true,
  hover: true,
  'focus-visible': true,
  pressed: true,
  selected: true,
  input: true,
  submitting: true,
  'keyboard-navigation': true,
};

const rollingNumberValues = {
  negative: -1,
  zero: 0,
  single: 7,
  'boundary-minimum': 99,
  'boundary-maximum': 100,
  'maximum-supported': Number.MAX_SAFE_INTEGER,
};

const offseasonHttpStatuses = new Map([
  ['error-400', 400],
  ['error-401', 401],
  ['error-403', 403],
  ['error-404', 404],
  ['error-409', 409],
  ['error-422', 422],
  ['error-429', 429],
  ['error-500', 500],
  ['error-503', 503],
]);

const resolveOffseasonError = (context: ComponentStateAdapterContext) => {
  const state = context.states.data;
  if (state === 'long-korean') {
    return new Error('스토브리그 이동 정보를 불러오는 과정에서 문제가 발생했습니다. 잠시 후 필터 조건을 확인하고 다시 시도해 주세요.');
  }
  if (state === 'unbroken-token') return new Error('X'.repeat(180));
  const status = state ? offseasonHttpStatuses.get(state) : undefined;
  if (status === undefined) {
    throw new Error(`지원하지 않는 Visual QA state: data=${state ?? '<missing>'}`);
  }
  return {
    code: 'ERR_BAD_RESPONSE',
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    name: 'AxiosError',
    response: { data: {}, status },
  };
};

const resolvePredictionMatchesError = (context: ComponentStateAdapterContext) => {
  const state = context.states.data;
  const declared = {
    'error-503': {
      matchesLoadErrorCode: 'UPSTREAM_ERROR',
      matchesLoadErrorMessage: '예측 경기 데이터 서비스가 응답하지 않습니다.',
    },
    'long-korean': {
      matchesLoadErrorCode: 'UPSTREAM_ERROR',
      matchesLoadErrorMessage: '예측 경기 데이터를 불러오는 과정에서 문제가 발생했습니다. 잠시 후 경기 목록을 다시 불러와 주세요.',
    },
    'manual-required': {
      matchesLoadErrorCode: MANUAL_BASEBALL_DATA_REQUIRED_CODE,
      matchesLoadErrorMessage: null,
    },
    'null-optional': {
      matchesLoadErrorCode: null,
      matchesLoadErrorMessage: null,
    },
    'unbroken-token': {
      matchesLoadErrorCode: 'UPSTREAM_ERROR',
      matchesLoadErrorMessage: 'X'.repeat(180),
    },
  } as const;
  if (!state || !Object.prototype.hasOwnProperty.call(declared, state)) {
    throw new Error(`지원하지 않는 Visual QA state: data=${state ?? '<missing>'}`);
  }
  return declared[state as keyof typeof declared];
};

const resolveMyPageSeasonEmptyContent = (context: ComponentStateAdapterContext) => {
  const state = context.states.data;
  const declared = {
    empty: {
      title: '시즌 기록이 없습니다',
      description: '새 직관 기록을 남기면 이곳에 표시됩니다.',
      actionLabel: '기록 남기기',
    },
    'long-korean': {
      title: '조건에 맞는 시즌 직관 기록과 경기 관람 추억이 아직 없습니다',
      description: '필터 조건을 바꾸거나 새로운 직관 기록을 남기면 시즌 타임라인과 구장 방문 기록이 이 영역에 다시 표시됩니다.',
      actionLabel: '새로운 직관 기록 작성 화면으로 이동하기',
    },
    'unbroken-token': {
      title: 'X'.repeat(96),
      description: 'Y'.repeat(180),
      actionLabel: 'Z'.repeat(72),
    },
  } as const;
  if (!state || !Object.prototype.hasOwnProperty.call(declared, state)) {
    throw new Error(`지원하지 않는 Visual QA state: data=${state ?? '<missing>'}`);
  }
  return declared[state as keyof typeof declared];
};

const resolveAlertCopy = (context: ComponentStateAdapterContext) => {
  const state = context.states.data;
  const declared = {
    single: {
      title: '알림',
      description: '내용을 확인해 주세요.',
    },
    'long-korean': {
      title: '모바일 화면에서 확인해야 하는 중요한 알림입니다',
      description: '긴 한국어 안내 문구가 두 줄 이상으로 자연스럽게 줄바꿈되고 가로 스크롤이나 잘림 없이 표시되는지 확인해 주세요.',
    },
    'unbroken-token': {
      title: 'T'.repeat(120),
      description: 'D'.repeat(220),
    },
  } as const;
  if (!state || !Object.prototype.hasOwnProperty.call(declared, state)) {
    throw new Error(`지원하지 않는 Visual QA state: data=${state ?? '<missing>'}`);
  }
  return declared[state as keyof typeof declared];
};

const resolveCardCopy = (context: ComponentStateAdapterContext) => {
  const state = context.states.data;
  const declared = {
    single: {
      action: '자세히 보기',
      content: '카드 본문 내용입니다.',
      description: '카드 설명',
      secondaryAction: '닫기',
      title: '카드 제목',
    },
    'long-korean': {
      action: '전체 경기 일정과 좌석 정보를 자세히 확인하기',
      content: '모바일 화면에서도 긴 카드 본문이 자연스럽게 여러 줄로 이어지고 카드 경계를 벗어나지 않는지 확인합니다.',
      description: '긴 한국어 설명과 작업 영역이 좁은 화면에서 서로 겹치지 않아야 합니다.',
      secondaryAction: '현재 화면에서 나중에 다시 확인하기',
      title: '모바일 화면에서 확인하는 긴 한국어 카드 제목입니다',
    },
    'unbroken-token': {
      action: `CARD-ACTION-${'A'.repeat(120)}`,
      content: `CARD-CONTENT-${'C'.repeat(220)}`,
      description: `CARD-DESCRIPTION-${'D'.repeat(180)}`,
      secondaryAction: `CARD-SECONDARY-${'S'.repeat(120)}`,
      title: `CARD-TITLE-${'T'.repeat(140)}`,
    },
  } as const;
  if (!state || !Object.prototype.hasOwnProperty.call(declared, state)) {
    throw new Error(`지원하지 않는 Visual QA state: data=${state ?? '<missing>'}`);
  }
  return declared[state as keyof typeof declared];
};

const resolvePagePrimitiveCopy = (context: ComponentStateAdapterContext) => {
  const state = context.states.data;
  const declared = {
    single: {
      action: '시작하기',
      body: '페이지 섹션의 본문 내용입니다.',
      description: '페이지 섹션 설명입니다.',
      secondaryAction: '더 알아보기',
      title: '페이지 섹션 제목',
    },
    'long-korean': {
      action: '지금 바로 모든 기능과 경기 정보를 확인하기',
      body: '모바일 화면에서도 페이지 섹션의 긴 한국어 본문이 자연스럽게 여러 줄로 표시되고 인접한 레이아웃을 밀어내지 않는지 확인합니다.',
      description: '긴 설명 문구와 제목, 작업 버튼이 좁은 화면 안에서 서로 겹치지 않고 읽기 쉬운 간격을 유지해야 합니다.',
      secondaryAction: '서비스 이용 방법을 자세히 살펴보기',
      title: '모바일 화면을 위한 길고 구체적인 페이지 섹션 제목입니다',
    },
    'unbroken-token': {
      action: `PAGE-ACTION-${'A'.repeat(120)}`,
      body: `PAGE-BODY-${'B'.repeat(220)}`,
      description: `PAGE-DESCRIPTION-${'D'.repeat(180)}`,
      secondaryAction: `PAGE-SECONDARY-${'S'.repeat(120)}`,
      title: `PAGE-TITLE-${'T'.repeat(140)}`,
    },
  } as const;
  if (!state || !Object.prototype.hasOwnProperty.call(declared, state)) {
    throw new Error(`지원하지 않는 Visual QA state: data=${state ?? '<missing>'}`);
  }
  return declared[state as keyof typeof declared];
};

const resolveTableCopy = (context: ComponentStateAdapterContext) => {
  const state = context.states.data;
  const declared = {
    single: {
      caption: '선수 명단',
      cell: '김선수',
      head: '선수',
    },
    'long-korean': {
      caption: '모바일 화면에서 긴 한국어 표 제목과 행 내용의 배치 상태를 확인합니다.',
      cell: '모바일에서도 중요한 선수 이동 정보와 상세 계약 내용을 빠짐없이 확인할 수 있어야 합니다.',
      head: '선수 이동과 계약의 상세 정보',
    },
    'unbroken-token': {
      caption: `TABLE-CAPTION-${'C'.repeat(180)}`,
      cell: `TABLE-CELL-${'D'.repeat(220)}`,
      head: `TABLE-HEAD-${'H'.repeat(140)}`,
    },
  } as const;
  if (!state || !Object.prototype.hasOwnProperty.call(declared, state)) {
    throw new Error(`지원하지 않는 Visual QA state: data=${state ?? '<missing>'}`);
  }
  return declared[state as keyof typeof declared];
};

const resolveStatusBadgeLabel = (context: ComponentStateAdapterContext) => (
  requireStateValueFromMap(context, 'data', {
    'null-optional': undefined,
    single: '진행 중',
    'long-korean': '모바일 화면에서 아주 긴 경기 진행 상태와 운영 안내를 함께 표시하는 배지',
    'unbroken-token': `STATUS-BADGE-${'S'.repeat(180)}`,
  })
);

const resolveTextControlCopy = (context: ComponentStateAdapterContext) => (
  requireStateValueFromMap(context, 'data', {
    empty: '',
    single: '입력 내용',
    'long-korean': '모바일 화면에서 긴 한국어 입력 내용이 컨트롤의 너비와 높이 안에서 자연스럽게 표시되는지 확인합니다.',
    'unbroken-token': `FORM-CONTROL-${'X'.repeat(180)}`,
  })
);

const resolveButtonCopy = (context: ComponentStateAdapterContext) => (
  requireStateValueFromMap(context, 'data', {
    single: '확인',
    'long-korean': '모바일 화면에서 모든 경기 일정과 좌석 안내를 자세히 확인하기',
    'unbroken-token': `BUTTON-${'X'.repeat(180)}`,
  })
);

const resolveProfileAvatarData = (context: ComponentStateAdapterContext) => (
  requireStateValueFromMap(context, 'data', {
    single: {
      alt: '비주얼 QA 사용자',
      fallbackName: '비주얼 QA 사용자',
      src: retroAvatarDataUrl,
    },
    'broken-image': {
      alt: '이미지를 불러올 수 없는 사용자',
      fallbackName: '이미지 실패 사용자',
      src: 'data:image/png;base64,bm90LXZhbGlk',
    },
    'missing-image': {
      alt: '기본 프로필 사용자',
      fallbackName: '기본 프로필 사용자',
      src: null,
    },
    'long-korean': {
      alt: '모바일 화면에서 긴 한국어 대체 이름을 사용하는 프로필 이미지',
      fallbackName: '모바일 화면에서도 안전하게 표시되어야 하는 매우 긴 한국어 사용자 이름',
      src: null,
    },
    'unbroken-token': {
      alt: `AVATAR-ALT-${'A'.repeat(160)}`,
      fallbackName: `AVATAR-${'X'.repeat(180)}`,
      src: null,
    },
    'null-optional': {
      alt: '',
      fallbackName: undefined,
      src: undefined,
    },
  })
);

const profileAvatarDimensions = {
  'responsive-sm': { size: 'sm' },
  'responsive-md': { size: 'md' },
  'responsive-lg': { size: 'lg' },
  'square-24': { height: 24, width: 24 },
  'square-26': { height: 26, width: 26 },
  'square-30': { height: 30, width: 30 },
  'square-32': { height: 32, width: 32 },
  'square-40': { height: 40, width: 40 },
  'square-48': { height: 48, width: 48 },
  'square-56': { height: 56, width: 56 },
  'square-64': { height: 64, width: 64 },
  'square-80': { height: 80, width: 80 },
  'square-96': { height: 96, width: 96 },
  'width-only-40': { width: 40 },
  'height-only-40': { height: 40 },
  'landscape-96x24': { height: 24, width: 96 },
  'portrait-24x96': { height: 96, width: 24 },
} as const;

const resolvePlainDialogCopy = (context: ComponentStateAdapterContext) => (
  requireStateValueFromMap(context, 'data', {
    single: {
      body: ['대화상자 본문 내용입니다.'],
      description: '필요한 내용을 확인해 주세요.',
      primary: '확인',
      secondary: '취소',
      title: '안내',
    },
    'long-korean': {
      body: Array.from({ length: 18 }, (_, index) => (
        `모바일 화면에서 긴 대화상자 본문 ${index + 1}번째 문단이 헤더와 하단 작업 영역을 가리지 않고 내부에서 안전하게 스크롤되는지 확인합니다.`
      )),
      description: '긴 한국어 설명과 제목이 닫기 버튼을 침범하지 않고 화면 너비 안에서 자연스럽게 여러 줄로 표시되어야 합니다.',
      primary: '모든 변경 내용을 확인하고 안전하게 적용하기',
      secondary: '현재 입력 내용을 유지한 채 이전 화면으로 돌아가기',
      title: '모바일 화면에서 확인해야 하는 매우 길고 구체적인 대화상자 제목입니다',
    },
    'unbroken-token': {
      body: [`DIALOG-BODY-${'B'.repeat(520)}`],
      description: `DIALOG-DESCRIPTION-${'D'.repeat(220)}`,
      primary: `DIALOG-CONFIRM-${'C'.repeat(120)}`,
      secondary: `DIALOG-CANCEL-${'X'.repeat(120)}`,
      title: `DIALOG-TITLE-${'T'.repeat(180)}`,
    },
    'null-optional': {
      body: [],
      description: undefined,
      primary: '확인',
      secondary: '취소',
      title: undefined,
    },
  })
);

const plainDialogBody = (body: readonly string[]) => createElement(
  'div',
  { className: 'min-w-0 space-y-3 [overflow-wrap:anywhere]' },
  ...body.map((paragraph, index) => createElement('p', { key: index }, paragraph)),
);

const plainDialogFooter = (primary: string, secondary: string) => [
  createElement('button', {
    className: 'min-h-11 min-w-0 max-w-full rounded-lg border px-4 py-2 font-semibold [overflow-wrap:anywhere]',
    key: 'secondary',
    type: 'button',
  }, secondary),
  createElement('button', {
    className: 'min-h-11 min-w-0 max-w-full rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground [overflow-wrap:anywhere]',
    key: 'primary',
    type: 'button',
  }, primary),
];

const resolvePlainMenuCopy = (context: ComponentStateAdapterContext) => (
  requireStateValueFromMap(context, 'data', {
    single: '메뉴 항목',
    'long-korean': '모바일 화면에서도 긴 한국어 메뉴 항목이 패널 경계를 벗어나지 않고 자연스럽게 여러 줄로 표시되어야 합니다',
    'unbroken-token': `MENU-ITEM-${'M'.repeat(220)}`,
  })
);

const plainMenuItems = (copy: string, count: number, role: 'menu' | 'dialog') => createElement(
  'div',
  { className: 'w-64 max-w-full space-y-1 p-2' },
  ...Array.from({ length: count }, (_, index) => createElement(
    'button',
    {
      className: 'min-h-11 w-full min-w-0 rounded-lg px-3 py-2 text-left text-15 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring [overflow-wrap:anywhere]',
      key: index,
      role: role === 'menu' ? 'menuitem' : undefined,
      type: 'button',
    },
    `${copy} ${index + 1}`,
  )),
);

const buttonIcon = () => createElement(
  'svg',
  { 'aria-hidden': true, fill: 'none', key: 'icon', viewBox: '0 0 24 24' },
  createElement('path', {
    d: 'M5 12h14m-6-6 6 6-6 6',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: 2,
  }),
);

const resolveButtonChildren = (
  context: ComponentStateAdapterContext,
  content: string,
) => {
  const copy = resolveButtonCopy(context);
  if (content === 'icon-only') return buttonIcon();
  if (content === 'leading-icon') return [buttonIcon(), copy];
  if (content === 'trailing-icon') return [copy, buttonIcon()];
  return copy;
};

const resolveButtonState = (
  context: ComponentStateAdapterContext,
  {
    includeInvalid,
    sizes,
    testId,
    variants,
  }: {
    includeInvalid: boolean;
    sizes: Record<string, string>;
    testId: string;
    variants: Record<string, string>;
  },
) => {
  const availability = resolveDeclaredVariant(context, 'availability', {
    disabled: 'disabled',
    enabled: 'enabled',
  });
  const element = resolveDeclaredVariant(context, 'element', {
    'as-child-link': 'as-child-link',
    button: 'button',
  });
  const interaction = requireStateValueFromMap(context, 'interactions', {
    default: 'default',
    'focus-visible': 'focus-visible',
    hover: 'hover',
    pressed: 'pressed',
  });
  if (element === 'as-child-link' && availability === 'disabled') {
    throw new Error('지원하지 않는 Visual QA button 조합: anchor elements do not support disabled');
  }
  if (availability === 'disabled' && interaction !== 'default') {
    throw new Error(`지원하지 않는 Visual QA interaction state: interactions=${interaction}, availability=${availability}`);
  }
  if (interaction !== 'default' && context.interactionTargetId !== 'control') {
    throw new Error(`지원하지 않는 Visual QA interaction target: ${context.interactionTargetId ?? '<missing>'}`);
  }
  const content = resolveDeclaredVariant(context, 'content', {
    'icon-only': 'icon-only',
    'label-only': 'label-only',
    'leading-icon': 'leading-icon',
    'trailing-icon': 'trailing-icon',
  });
  const size = resolveDeclaredVariant(context, 'size', sizes);
  const iconSize = size === 'icon' || size === 'iconTouch';
  if ((content === 'icon-only') !== iconSize) {
    throw new Error(`지원하지 않는 Visual QA button content/size 조합: content=${content}, size=${size}`);
  }
  if (content === 'icon-only' && context.states.data !== 'single') {
    throw new Error(`지원하지 않는 Visual QA icon button data: ${context.states.data ?? '<missing>'}`);
  }
  const controlChildren = resolveButtonChildren(context, content);
  const asChild = element === 'as-child-link';
  return {
    props: {
      ...(includeInvalid ? {
        'aria-invalid': resolveDeclaredVariant(context, 'invalid', {
          false: false,
          true: true,
        }),
      } : {}),
      'aria-label': content === 'icon-only' ? '다음 화면으로 이동' : undefined,
      asChild,
      children: asChild
        ? createElement('a', { href: '#visual-qa-button' }, controlChildren)
        : controlChildren,
      'data-testid': testId,
      disabled: asChild ? undefined : availability === 'disabled',
      onClick: () => {},
      size,
      variant: resolveDeclaredVariant(context, 'variant', variants),
    },
    captureSelector: `[data-testid="${testId}"]`,
    surfaceClassName: 'flex min-h-28 w-full min-w-0 max-w-[320px] items-center justify-center overflow-visible bg-transparent p-4 shadow-none',
  };
};

const resolveLoadingSpinnerCopy = (context: ComponentStateAdapterContext) => {
  const state = context.states.data;
  const declared = {
    loading: {
      message: '로딩 중...',
      subMessage: '잠시만 기다려주세요.',
    },
    empty: {
      message: '',
      subMessage: '',
    },
    'long-korean': {
      message: '모바일 화면에서 데이터를 안전하게 불러오고 있습니다.',
      subMessage: '긴 한국어 안내가 자연스럽게 줄바꿈되고 요소 밖으로 넘치지 않는지 확인합니다.',
    },
    'unbroken-token': {
      message: 'L'.repeat(160),
      subMessage: 'S'.repeat(220),
    },
    'null-optional': {},
  } as const;
  if (!state || !Object.prototype.hasOwnProperty.call(declared, state)) {
    throw new Error(`지원하지 않는 Visual QA state: data=${state ?? '<missing>'}`);
  }
  return declared[state as keyof typeof declared];
};

const verificationDialogLineBreak = (first: string, second: string) => (
  createElement(Fragment, null, first, createElement('br'), second)
);

const resolveVerificationRequiredDialogCopy = (context: ComponentStateAdapterContext) => {
  const state = context.states.data;
  const copyPreset = context.variants.copyPreset;
  const singleCopyPresets = {
    'advanced-security': {
      title: '고급 설정 진입',
      description: verificationDialogLineBreak(
        '탈퇴 예약과 같은 고급 설정은 본인 확인 후에만 열 수 있습니다.',
        '확인 후에만 고급 설정 내용을 볼 수 있습니다.',
      ),
      confirmLabel: '고급 설정 진입',
    },
    'password-change': {
      title: '비밀번호 변경',
      description: '비밀번호 변경은 민감한 작업입니다. 본인 확인을 위해 보안 모드로 이동합니다.',
      confirmLabel: '안전하게 진행',
    },
    unlink: {
      title: '연동 해제',
      description: verificationDialogLineBreak(
        '로그인 수단을 변경하기 전에 본인 확인이 필요합니다.',
        '계속 진행하면 연동이 해제됩니다.',
      ),
      confirmLabel: '연동 해제 진행',
    },
  } as const;
  if (state === 'single') {
    if (!copyPreset || !Object.prototype.hasOwnProperty.call(singleCopyPresets, copyPreset)) {
      throw new Error(`지원하지 않는 Visual QA variant: copyPreset=${copyPreset ?? '<missing>'}`);
    }
    return singleCopyPresets[copyPreset as keyof typeof singleCopyPresets];
  }
  if (copyPreset !== 'none') {
    throw new Error(`지원하지 않는 Visual QA state/variant 조합: data=${state ?? '<missing>'}, copyPreset=${copyPreset ?? '<missing>'}`);
  }
  const declared = {
    'null-optional': {},
    'long-korean': {
      title: '모바일 화면에서 민감한 계정 작업을 계속하기 전에 본인인증이 필요합니다',
      description: '긴 한국어 본인인증 안내 문구와 작업 설명이 여러 줄로 자연스럽게 줄바꿈되고 작은 화면에서도 모든 내용을 확인할 수 있는지 검증합니다.',
      confirmLabel: '본인인증을 완료하고 안전하게 다음 단계로 계속 진행하기',
    },
    'unbroken-token': {
      title: 'T'.repeat(120),
      description: 'D'.repeat(220),
      confirmLabel: 'C'.repeat(96),
    },
  } as const;
  if (!state || !Object.prototype.hasOwnProperty.call(declared, state)) {
    throw new Error(`지원하지 않는 Visual QA state: data=${state ?? '<missing>'}`);
  }
  return declared[state as keyof typeof declared];
};

const viewportDeferredSlot = (
  tone: 'content' | 'fallback',
  title: string,
  description: string,
) => createElement(
  'div',
  {
    className: tone === 'content'
      ? 'w-full min-w-0 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 [overflow-wrap:anywhere]'
      : 'w-full min-w-0 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-slate-700 [overflow-wrap:anywhere]',
    'data-vqa-deferred-slot': tone,
  },
  createElement('p', { className: 'font-bold' }, title),
  createElement('p', { className: 'mt-2 text-sm leading-relaxed' }, description),
);

const resolveViewportDeferredSlots = (context: ComponentStateAdapterContext) => {
  const state = context.states.data;
  const declared = {
    single: {
      children: viewportDeferredSlot('content', '실제 콘텐츠', '화면 진입 후 표시되는 내용입니다.'),
      fallback: viewportDeferredSlot('fallback', '콘텐츠 준비 중', '화면 진입 전 자리 표시자입니다.'),
    },
    'long-korean': {
      children: viewportDeferredSlot(
        'content',
        '화면에 진입한 뒤 표시되는 지연된 실제 콘텐츠입니다',
        '긴 한국어 문구가 모바일 화면에서 자연스럽게 여러 줄로 표시되고 관찰 컨테이너의 너비를 벗어나지 않는지 확인합니다.',
      ),
      fallback: viewportDeferredSlot(
        'fallback',
        '화면에 가까워질 때까지 콘텐츠를 준비하고 있습니다',
        '지연 로딩 자리 표시자의 긴 안내 문구도 작은 화면에서 잘리거나 가로 스크롤을 만들지 않아야 합니다.',
      ),
    },
    'unbroken-token': {
      children: viewportDeferredSlot('content', 'C'.repeat(120), 'D'.repeat(220)),
      fallback: viewportDeferredSlot('fallback', 'F'.repeat(120), 'P'.repeat(220)),
    },
  } as const;
  if (!state || !Object.prototype.hasOwnProperty.call(declared, state)) {
    throw new Error(`지원하지 않는 Visual QA state: data=${state ?? '<missing>'}`);
  }
  return declared[state as keyof typeof declared];
};

const alertLeadingIcon = () => createElement(
  'svg',
  {
    'aria-hidden': 'true',
    fill: 'none',
    viewBox: '0 0 24 24',
  },
  createElement('path', {
    d: 'M12 8v5m0 3h.01M10.3 3.8 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: 2,
  }),
);

const cardActionButton = (key: string, label: string, primary = false) => createElement(
  'button',
  {
    className: primary
      ? 'min-h-11 max-w-full rounded-md bg-slate-900 px-3 py-2 text-left text-sm text-white [overflow-wrap:anywhere]'
      : 'min-h-11 max-w-full rounded-md border px-3 py-2 text-left text-sm [overflow-wrap:anywhere]',
    key,
    type: 'button',
  },
  label,
);

const cardHeaderChildren = (
  copy: ReturnType<typeof resolveCardCopy>,
  includeAction: boolean,
) => [
  createElement(CardTitle, { key: 'title' }, copy.title),
  createElement(CardDescription, { key: 'description' }, copy.description),
  includeAction
    ? createElement(
      CardAction,
      { key: 'action' },
      cardActionButton('primary-action', copy.action, true),
    )
    : null,
].filter((child) => child !== null);

const cardFooterChildren = (copy: ReturnType<typeof resolveCardCopy>) => [
  cardActionButton('primary', copy.action, true),
  cardActionButton('secondary', copy.secondaryAction),
];

const cardPrimitiveSurface = 'block min-h-24 w-full max-w-[320px] overflow-hidden rounded-xl border bg-card p-0 text-card-foreground shadow-none';

const pagePrimitiveChildren = (copy: ReturnType<typeof resolvePagePrimitiveCopy>) => [
  createElement(
    'h3',
    { className: 'text-xl font-semibold [overflow-wrap:anywhere]', key: 'title' },
    copy.title,
  ),
  createElement(
    'p',
    { className: 'text-sm text-slate-600 [overflow-wrap:anywhere]', key: 'body' },
    copy.body,
  ),
];

const pageCtaChildren = (copy: ReturnType<typeof resolvePagePrimitiveCopy>) => [
  cardActionButton('primary', copy.action, true),
  cardActionButton('secondary', copy.secondaryAction),
];

const pagePrimitiveSurface = 'block min-h-24 w-full max-w-[320px] overflow-visible bg-transparent p-0 shadow-none';

const tablePrimitiveSurface = 'block min-h-0 w-full max-w-[320px] overflow-hidden rounded-xl border bg-card p-0 text-card-foreground shadow-none';
const statusBadgeSurface = 'status-badge-hover-scope flex min-h-24 w-full min-w-0 max-w-[320px] items-center justify-start overflow-visible bg-transparent p-4 shadow-none';
const formControlSurface = 'flex min-h-24 w-full min-w-0 max-w-[320px] items-center overflow-visible bg-transparent p-4 shadow-none';

const resolveTableColumnCount = (context: ComponentStateAdapterContext) => (
  resolveDeclaredVariant(context, 'columns', {
    compact: 2,
    wide: 5,
  })
);

const tableCheckbox = (label: string) => createElement('input', {
  'aria-label': label,
  className: 'h-5 w-5 accent-slate-900',
  readOnly: true,
  role: 'checkbox',
  type: 'checkbox',
});

const tableHeadCells = (
  copy: ReturnType<typeof resolveTableCopy>,
  count: number,
) => Array.from({ length: count }, (_, index) => createElement(
  TableHead,
  { key: `head-${index}` },
  `${copy.head} ${index + 1}`,
));

const tableBodyCells = (
  copy: ReturnType<typeof resolveTableCopy>,
  count: number,
  rowIndex = 0,
) => Array.from({ length: count }, (_, index) => createElement(
  TableCell,
  { key: `cell-${rowIndex}-${index}` },
  `${copy.cell} ${rowIndex + 1}-${index + 1}`,
));

const tableBodyRows = (
  copy: ReturnType<typeof resolveTableCopy>,
  columnCount: number,
  rowCount: number,
  selected: boolean,
) => Array.from({ length: rowCount }, (_, index) => createElement(
  TableRow,
  {
    'data-state': selected && index === 0 ? 'selected' : undefined,
    key: `row-${index}`,
  } as ComponentProps<typeof TableRow> & { 'data-state'?: string },
  ...tableBodyCells(copy, columnCount, index),
));

const leaderboardRuntimeDataStates = [
  'broken-image',
  'empty',
  'loading',
  'long-korean',
  'maximum-supported',
  'populated',
  'unbroken-token',
] as const;

const resolveLeaderboardRuntimeData = (context: ComponentStateAdapterContext) => {
  const dataState = context.states.data;
  if (!leaderboardRuntimeDataStates.some((state) => state === dataState)) {
    throw new Error(`지원하지 않는 Visual QA state: data=${dataState ?? '<missing>'}`);
  }

  const entryCount = dataState === 'maximum-supported'
    ? 10
    : dataState === 'empty' || dataState === 'loading'
      ? 0
      : 3;
  const leaderboard = Array.from({ length: entryCount }, (_, index) => {
    const rank = index + 1;
    const longCopy = dataState === 'long-korean';
    const tokenCopy = dataState === 'unbroken-token';
    return {
      rank,
      handle: index === 0
        ? 'visualqa-user'
        : tokenCopy
          ? `handle-${'X'.repeat(96)}-${rank}`
          : `visualqa-rival-${rank}`,
      userName: longCopy
        ? `대한민국프로야구모바일리더보드검증사용자${rank}`
        : tokenCopy
          ? `USER${'Y'.repeat(120)}${rank}`
          : `비주얼큐에이 ${rank}`,
      profileImageUrl: dataState === 'broken-image' && index === 0
        ? 'data:image/png;base64,bm90LXZhbGlk'
        : undefined,
      level: Math.min(99, 31 - index),
      rankTitle: longCopy
        ? '명예의전당에오른전설적인예측마스터'
        : tokenCopy
          ? `TIER${'Z'.repeat(80)}`
          : index === 0 ? 'HALL_OF_FAME' : 'MAJOR_LEAGUER',
      score: Math.max(1, 987654 - index * 43210),
      streak: Math.max(0, 12 - index),
      maxStreak: 25 - index,
      accuracy: 91.7 - index,
      rankChange: index % 3 - 1,
    };
  });
  const copy = dataState === 'long-korean'
    ? '긴 한국어 리더보드 소식이 작은 화면에서도 자연스럽게 흐르고 잘리지 않는지 확인합니다.'
    : dataState === 'unbroken-token'
      ? `NEWS-${'N'.repeat(180)}`
      : '비주얼 QA 사용자가 시즌 리더보드 1위에 올랐습니다.';

  return {
    hotStreaks: entryCount === 0 ? [] : [{
      handle: leaderboard[0]?.handle,
      userName: leaderboard[0]?.userName ?? '비주얼 QA',
      profileImageUrl: leaderboard[0]?.profileImageUrl,
      streak: 12,
      level: 31,
    }],
    isLoading: dataState === 'loading',
    leaderboard,
    tickerMessages: entryCount === 0 ? [] : [{
      id: `visual-qa-${dataState}`,
      text: copy,
      type: 'streak' as const,
      timestamp: 1,
    }],
  };
};

const resolveLeaderboardRuntimeAuth = (context: ComponentStateAdapterContext) => {
  const phase = resolveDeclaredVariant(context, 'authPhase', {
    'auth-loading': 'auth-loading',
    'authenticated-fallback': 'authenticated-fallback',
    'authenticated-resolved': 'authenticated-resolved',
    public: 'public',
  });
  const expectedPermission = phase === 'public' ? 'anonymous' : 'user';
  if (context.states.permissions !== expectedPermission) {
    throw new Error(
      `지원하지 않는 Visual QA state/variant 조합: permissions=${context.states.permissions ?? '<missing>'}, authPhase=${phase}`,
    );
  }
  return phase;
};

const retroLevelValues = {
  hall: {
    'boundary-maximum': 999,
    'boundary-minimum': 61,
  },
  major: {
    'boundary-maximum': 60,
    'boundary-minimum': 31,
  },
  minor: {
    'boundary-maximum': 30,
    'boundary-minimum': 11,
  },
  rookie: {
    'boundary-maximum': 10,
    'boundary-minimum': 1,
  },
};

const retroProgressValues = {
  complete: { max: 100, value: 100 },
  negative: { max: 100, value: -20 },
  overflow: { max: 100, value: 160 },
  partial: { max: 100, value: 37 },
  zero: { max: 100, value: 0 },
  'zero-maximum': { max: 0, value: 37 },
};

const retroAvatarDataUrl = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Crect width="32" height="32" fill="%2300ffff"/%3E%3Ccircle cx="16" cy="13" r="6" fill="%231a1a2e"/%3E%3Cpath d="M6 30c1-8 6-11 10-11s9 3 10 11" fill="%231a1a2e"/%3E%3C/svg%3E';

const retroLeaderboardRowData = {
  'broken-image': {
    level: 31,
    profileImageUrl: 'data:image/png;base64,bm90LXZhbGlk',
    score: 456_789,
    streak: 4,
    userName: '이미지 실패 사용자',
  },
  'long-korean': {
    level: 31,
    profileImageUrl: retroAvatarDataUrl,
    score: 345_678,
    streak: 12,
    userName: '모바일 화면에서도 긴 한국어 사용자 이름이 안전하게 줄임표로 표시되는지 확인합니다',
  },
  'maximum-supported': {
    level: 31,
    profileImageUrl: retroAvatarDataUrl,
    score: Number.MAX_SAFE_INTEGER,
    streak: Number.MAX_SAFE_INTEGER,
    userName: '최대 점수',
  },
  'missing-image': {
    level: 31,
    score: 234_567,
    streak: 0,
    userName: '기본 아바타 사용자',
  },
  single: {
    level: 31,
    profileImageUrl: retroAvatarDataUrl,
    score: 123_456,
    streak: 7,
    userName: '비주얼 QA',
  },
  'unbroken-token': {
    level: 31,
    profileImageUrl: retroAvatarDataUrl,
    score: 567_890,
    streak: 21,
    userName: `USER-${'X'.repeat(160)}`,
  },
};

const retroComboStreaks = {
  amazing: {
    'boundary-minimum': 5,
    'maximum-supported': 6,
  },
  combo: {
    'boundary-minimum': 3,
    'maximum-supported': 4,
  },
  fire: {
    'boundary-minimum': 7,
    'maximum-supported': 9,
  },
  legendary: {
    'boundary-minimum': 10,
    'maximum-supported': Number.MAX_SAFE_INTEGER,
  },
  nice: {
    'boundary-minimum': 1,
    'maximum-supported': 2,
  },
};

const retroComboScores = {
  maximum: Number.MAX_SAFE_INTEGER,
  positive: 12_345,
  zero: 0,
};

const retroFlickerCopy = {
  'long-korean': '모바일 화면에서 깜빡임 효과가 적용된 긴 한국어 문구를 확인합니다',
  single: 'FLICKER',
  'unbroken-token': `FLICKER-${'X'.repeat(160)}`,
};

const retroGlitchCopy = {
  'long-korean': '모바일 화면에서 글리치 효과가 적용된 긴 한국어 문구를 확인합니다',
  single: 'GLITCH',
  'unbroken-token': `GLITCH-${'X'.repeat(160)}`,
};

const retroDotMatrixCopy = {
  'long-korean': '모바일 화면에서도 도트 매트릭스 안내 문구가 안전하게 줄바꿈되는지 확인합니다',
  single: '도트 매트릭스',
  'unbroken-token': `DOT-MATRIX-${'X'.repeat(160)}`,
};

const retroAnimatedCrownCopy = {
  'long-korean': '모바일 화면의 우승 왕관 장식',
  single: '👑',
  'unbroken-token': `CROWN-${'X'.repeat(160)}`,
};

const retroPixelCrownCopy = {
  'long-korean': '모바일 화면의 픽셀 왕관 장식',
  single: '♛',
  'unbroken-token': `PIXEL-CROWN-${'X'.repeat(160)}`,
};

const retroButtonCopy = {
  'long-korean': '모바일 화면에서도 안전하게 동작하는 긴 작업 버튼',
  single: '확인',
  'unbroken-token': `BUTTON-${'X'.repeat(160)}`,
};

const retroCardCopy = {
  'long-korean': '모바일 화면에서도 긴 한국어 카드 내용이 안전하게 줄바꿈되는지 확인합니다',
  single: '레트로 카드',
  'unbroken-token': `CARD-${'X'.repeat(160)}`,
};

const retroContainerCopy = {
  'long-korean': '모바일 화면에서도 긴 한국어 컨테이너 내용이 안전하게 줄바꿈되는지 확인합니다',
  single: '레트로 컨테이너',
  'unbroken-token': `CONTAINER-${'X'.repeat(160)}`,
};

const retroEmptyStateCopy = {
  'long-korean': '모바일 화면에서 표시할 기록이 아직 없습니다. 새로운 활동을 시작하면 이 영역에 내용이 표시됩니다.',
  single: '표시할 내용이 없습니다',
  'unbroken-token': `EMPTY-${'X'.repeat(160)}`,
};

const retroTickerCopy = {
  empty: null,
  'long-korean': '모바일 화면에서도 긴 실시간 알림 문구가 흐르는 동안 안전하게 표시되는지 확인합니다',
  single: '새로운 예측 결과가 집계되었습니다',
  'unbroken-token': `TICKER-${'X'.repeat(160)}`,
};

const retroFooterHotStreaks = {
  empty: [],
  'long-korean': [{
    level: 31,
    rank: 1,
    score: 123_456,
    streak: 12,
    userName: '모바일 화면에서도 긴 한국어 사용자 이름과 연승 정보가 안전하게 표시되는지 확인합니다',
  }],
  'maximum-supported': [{
    level: 61,
    rank: 1,
    score: Number.MAX_SAFE_INTEGER,
    streak: Number.MAX_SAFE_INTEGER,
    userName: '최대 연승 사용자',
  }],
  single: [{
    level: 31,
    rank: 1,
    score: 123_456,
    streak: 7,
    userName: '연승 사용자',
  }],
  'unbroken-token': [{
    level: 31,
    rank: 1,
    score: 123_456,
    streak: 21,
    userName: `HOT-STREAK-${'X'.repeat(160)}`,
  }],
};

const retroFooterInventories = {
  active: {
    activePowerups: ['MAGIC_BAT'],
    powerups: { GOLDEN_GLOVE: 2, MAGIC_BAT: 1, SCOUTER: 3 },
  },
  available: {
    activePowerups: [],
    powerups: { GOLDEN_GLOVE: 2, MAGIC_BAT: 1, SCOUTER: 3 },
  },
  empty: {
    activePowerups: [],
    powerups: { GOLDEN_GLOVE: 0, MAGIC_BAT: 0, SCOUTER: 0 },
  },
  'maximum-supported': {
    activePowerups: [],
    powerups: {
      GOLDEN_GLOVE: Number.MAX_SAFE_INTEGER,
      MAGIC_BAT: Number.MAX_SAFE_INTEGER,
      SCOUTER: Number.MAX_SAFE_INTEGER,
    },
  },
};

const retroRankBadgeCopy = {
  'long-korean': '정규시즌 통합 순위 안내 문구',
  'maximum-supported': String(Number.MAX_SAFE_INTEGER),
  single: '1',
  'unbroken-token': `RANK-${'X'.repeat(160)}`,
};

const retroNumericCopy = {
  'long-korean': '시즌 누적 최고 점수 안내 문구',
  'maximum-supported': String(Number.MAX_SAFE_INTEGER),
  negative: '-12,345',
  single: '12,345',
  'unbroken-token': `SCORE-${'X'.repeat(160)}`,
  zero: '0',
};

const retroStreakValues = {
  combo: {
    'boundary-minimum': 3,
    'maximum-supported': 4,
  },
  fire: {
    'boundary-minimum': 7,
    'maximum-supported': Number.MAX_SAFE_INTEGER,
  },
  hot: {
    'boundary-minimum': 5,
    'maximum-supported': 6,
  },
  low: {
    'boundary-minimum': 0,
    'maximum-supported': 2,
  },
};

const authLayoutCopy = {
  'long-korean': '모바일 화면에서도 인증 절차의 목적과 다음 행동을 분명히 이해할 수 있도록 충분히 길게 작성한 안내 문구입니다.',
  'maximum-supported': '계정 정보 확인, 보안 설정, 복구 수단 검토, 서비스 약관 확인을 모두 마친 뒤 다음 단계로 이동해 주세요.',
  single: '인증 흐름 콘텐츠',
  'unbroken-token': `AUTH-LAYOUT-${'X'.repeat(180)}`,
};

const adSlotContent = {
  empty: undefined,
  'long-korean': createElement(
    'p',
    { className: 'min-w-0 break-words text-body text-foreground' },
    '모바일 광고 영역 안에서도 제휴 안내와 프로모션 설명이 자연스럽게 여러 줄로 표시되는지 확인하는 충분히 긴 한국어 문구입니다.',
  ),
  'maximum-supported': createElement(
    'div',
    { className: 'min-w-0 space-y-2 text-body text-foreground' },
    createElement('p', { key: 'title', className: 'font-semibold' }, '공식 파트너 프로모션'),
    createElement('p', { key: 'description' }, '최대 지원 콘텐츠 구성에서 제목과 설명, 보조 안내가 안전하게 쌓이는지 확인합니다.'),
    createElement('p', { key: 'caption', className: 'text-sm text-muted-foreground' }, '광고 · 제휴 콘텐츠'),
  ),
  single: createElement('p', { className: 'text-body text-foreground' }, '공식 파트너 안내'),
  'unbroken-token': createElement(
    'p',
    { className: 'min-w-0 break-all text-body text-foreground' },
    `AD-CONTENT-${'X'.repeat(200)}`,
  ),
};

const ticketPreviewDataUrl = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"%3E%3Crect width="640" height="360" rx="24" fill="%23f1f5f9"/%3E%3Cpath d="M48 72h544v216H48z" fill="%23ffffff" stroke="%231f5c4a" stroke-width="8"/%3E%3Ctext x="320" y="180" text-anchor="middle" dominant-baseline="middle" font-size="42" font-family="sans-serif" fill="%231f5c4a"%3EVISUAL QA TICKET%3C/text%3E%3C/svg%3E';
const ticketResultData = {
  single: {
    awayTeam: '두산',
    date: '2026-08-23',
    homeTeam: 'LG',
    row: '3열',
    seat: '12번',
    section: '오렌지석',
    stadium: '잠실야구장',
  },
  'maximum-supported': {
    awayTeam: '원정팀 최대 지원 이름',
    date: '2099-12-31',
    homeTeam: '홈팀 최대 지원 이름',
    row: '999999열',
    seat: '999999번',
    section: '최대 지원 좌석 구역',
    stadium: '최대 지원 길이의 야구장 이름',
  },
  'long-korean': {
    awayTeam: '모바일에서도 안전하게 표시되어야 하는 긴 원정팀 이름',
    date: '2026년 8월 23일 일요일 저녁 경기',
    homeTeam: '모바일에서도 안전하게 표시되어야 하는 긴 홈팀 이름',
    row: '매우 긴 좌석 열 안내',
    seat: '매우 긴 좌석 번호 안내',
    section: '모바일 티켓 결과에서 여러 줄로 표시되는 매우 긴 좌석 구역',
    stadium: '서울특별시 종합운동장 야구장 공식 관람 구역',
  },
  'null-optional': {
    awayTeam: null,
    date: null,
    homeTeam: null,
    row: null,
    seat: null,
    section: null,
    stadium: null,
  },
  'unbroken-token': {
    awayTeam: `AWAY-${'A'.repeat(120)}`,
    date: `DATE-${'D'.repeat(120)}`,
    homeTeam: `HOME-${'H'.repeat(120)}`,
    row: `ROW-${'R'.repeat(120)}`,
    seat: `SEAT-${'S'.repeat(120)}`,
    section: `SECTION-${'X'.repeat(160)}`,
    stadium: `STADIUM-${'Y'.repeat(180)}`,
  },
};

const signUpStatusErrorCopy = {
  'long-korean': '모바일 화면에서도 회원가입 실패 원인과 다시 시도할 방법을 정확히 이해할 수 있도록 충분히 길게 작성한 오류 안내입니다.',
  single: '이미 사용 중인 이메일입니다.',
  'unbroken-token': `SIGN-UP-ERROR-${'X'.repeat(180)}`,
};

const oauthEmailChallengeId = 'oauth-challenge-visual-qa';
const oauthEmailSentData = {
  single: {
    expiresAt: '2099-08-23T12:00:00.000Z',
    maskedEmail: 'v***@example.com',
  },
  'long-korean': {
    expiresAt: '2099-08-23T12:00:00.000Z',
    maskedEmail: '모바일에서도 여러 줄로 안전하게 표시되어야 하는 매우 긴 이메일 안내 수신자@example.com',
  },
  'unbroken-token': {
    expiresAt: '2099-08-23T12:00:00.000Z',
    maskedEmail: `OAUTH-EMAIL-${'X'.repeat(180)}@example.com`,
  },
  'null-optional': {
    expiresAt: null,
    maskedEmail: null,
  },
};

const commonCopy = {
  empty: {
    description: '표시할 항목이 없습니다.',
    title: '아직 내용이 없습니다',
  },
  'long-korean': {
    description: '모바일 화면에서도 현재 상태와 다음에 수행할 수 있는 행동을 정확히 이해할 수 있도록 충분히 길게 작성한 공통 안내 문구입니다.',
    title: '요청한 내용을 아직 표시할 수 없어 잠시 후 다시 확인해 주세요',
  },
  'maximum-supported': {
    description: '첫 번째 안내 · 두 번째 안내 · 세 번째 안내 · 네 번째 안내',
    title: '지원하는 최대 공통 콘텐츠 구성',
  },
  single: {
    description: '다음 행동을 선택해 주세요.',
    title: '공통 상태',
  },
  'unbroken-token': {
    description: `EMPTY-DESCRIPTION-${'Y'.repeat(200)}`,
    title: `EMPTY-TITLE-${'X'.repeat(160)}`,
  },
};

const simpleMarkdownContent = {
  empty: '',
  'long-korean': `# 모바일 문서 읽기 검증

작은 화면에서도 긴 한국어 문장이 자연스럽게 여러 줄로 이어지고, 제목과 본문 및 [관련 안내 링크](https://example.com/docs)가 서로 겹치거나 화면 밖으로 밀려나지 않아야 합니다. 필요한 정보를 충분히 전달하면서도 문단 사이의 간격과 줄 높이가 안정적으로 유지되는지 확인합니다.`,
  'maximum-supported': `# 전체 마크다운 구성

도입 문단과 **강조 문구**, \`인라인 코드\`, [관련 안내 링크](https://example.com/docs)를 함께 확인합니다.

## 목록

- 첫 번째 항목
- 두 번째 항목

1. 순서가 있는 항목
2. 다음 순서 항목

> 중요한 안내 문구는 인용 블록으로 표시합니다.

\`\`\`typescript
const message = 'mobile-safe-markdown';
\`\`\`

| 구단 | 상태 |
| --- | --- |
| 비주얼 QA 테스트 팀 | 정상 |
| 모바일 장문 확인 팀 | 검토 완료 |`,
  single: `# 기본 문서

기본 문단과 [관련 안내 링크](https://example.com/docs)를 확인합니다.`,
  'unbroken-token': `# 긴 토큰 문서

MARKDOWN-${'X'.repeat(220)}

[관련 안내 링크](https://example.com/docs)`,
};

const validVisualQaImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"%3E%3Crect width="320" height="180" fill="%231f5c4a"/%3E%3Ccircle cx="160" cy="90" r="48" fill="%23ffffff"/%3E%3C/svg%3E';
const brokenVisualQaImage = 'data:image/png;base64,bm90LXZhbGlk';
const featureCardMobileImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844"%3E%3Crect width="390" height="844" rx="32" fill="%230f766e"/%3E%3Crect x="32" y="80" width="326" height="184" rx="20" fill="%23ffffff" fill-opacity=".9"/%3E%3Crect x="32" y="296" width="326" height="468" rx="20" fill="%23ccfbf1"/%3E%3C/svg%3E';
const featureCardCopy = {
  empty: {
    description: '',
    guide: [] as string[],
    title: '',
  },
  'long-korean': {
    description: '모바일 화면에서도 서비스 기능을 충분히 이해할 수 있도록 상세한 설명이 여러 줄로 자연스럽게 이어지는지 확인합니다.',
    guide: [
      '첫 번째 사용 단계의 목적과 수행 방법을 작은 화면에서도 명확하게 읽을 수 있도록 충분히 길게 설명합니다.',
      '두 번째 단계에서는 다음 화면으로 이동하기 전에 확인해야 할 정보를 빠짐없이 안내합니다.',
      '마지막 단계에서는 저장된 결과를 다시 확인하고 필요한 후속 행동을 선택하는 방법을 설명합니다.',
    ],
    title: '경기 전부터 경기 후까지 이어지는 통합 야구 생활 기능',
  },
  'maximum-supported': {
    description: '제목, 설명, 이미지와 최대 지원 가이드 목록이 한 카드에 함께 표시되는 구성입니다.',
    guide: Array.from({ length: 8 }, (_, index) => `최대 지원 사용 가이드 ${index + 1}`),
    title: '최대 지원 기능 카드',
  },
  single: {
    description: '오늘 필요한 야구 정보를 확인합니다.',
    guide: ['오늘 경기 확인', '다음 행동 선택', '결과 저장'],
    title: '오늘 경기 보드',
  },
  'unbroken-token': {
    description: `FEATURE-DESCRIPTION-${'X'.repeat(180)}`,
    guide: [`FEATURE-GUIDE-${'X'.repeat(180)}`],
    title: `FEATURE-TITLE-${'X'.repeat(160)}`,
  },
};
const featureCardIcons = {
  cheer: 'megaphone',
  diary: 'book',
  home: 'home',
  mate: 'users',
  prediction: 'linechart',
  stadium: 'map',
} as const;
const laptopFeaturePresets = {
  cheer: { description: '마이팀 팬들의 반응과 경기 이야기를 모아봅니다.', iconKey: 'megaphone', title: '응원석' },
  diary: { description: '경기 후 관람 기록과 사진을 남깁니다.', iconKey: 'book', title: '다이어리' },
  home: { description: '오늘 볼 경기, 상태, 다음 동선을 먼저 확인합니다.', iconKey: 'home', title: '오늘 경기 보드' },
  mate: { description: '같이 볼 팬을 찾고 약속 상태를 관리합니다.', iconKey: 'users', title: '같이가요' },
  prediction: { description: '경기 전 예측과 시즌 흐름을 비교합니다.', iconKey: 'linechart', title: '전력분석실' },
  stadium: { description: '방문 전에 좌석, 먹거리, 이동 정보를 점검합니다.', iconKey: 'map', title: '구장 가이드' },
} as const;
const featureCardImages = {
  broken: { image: brokenVisualQaImage, mobileImage: brokenVisualQaImage },
  'image-only': { image: validVisualQaImage },
  'mobile-fallback': { image: validVisualQaImage, mobileImage: brokenVisualQaImage },
  'mobile-preferred': { image: validVisualQaImage, mobileImage: featureCardMobileImage },
};
const featureCardPresentations = {
  'active-collapsed': { isActive: true, isExpanded: false },
  'active-expanded': { isActive: true, isExpanded: true },
  'inactive-collapsed': { isActive: false, isExpanded: false },
};

const achievementBase = {
  code: 'FIRST_ATTENDANCE',
  description: '처음으로 직관 기록을 남겼습니다!',
  earned: true,
  earnedAt: '2026-08-23T00:00:00',
  iconUrl: null,
  id: 1,
  name: '첫 직관',
  pointsRequired: 0,
  rarity: 'COMMON',
  rarityColor: '#8a8a8a',
  rarityKo: '일반',
};
const achievementPresets = {
  'long-korean': {
    ...achievementBase,
    description: '모바일 화면에서도 새로 획득한 업적의 의미와 다음 행동을 충분히 이해할 수 있도록 상세한 설명이 여러 줄로 자연스럽게 이어집니다.',
    name: '야구장 방문과 응원 기록을 꾸준히 남긴 팬에게 주어지는 특별 업적',
  },
  'maximum-supported': {
    ...achievementBase,
    description: '설명'.repeat(250),
    name: '업적'.repeat(50),
  },
  'null-optional': { ...achievementBase, description: null },
  single: achievementBase,
  'unbroken-token': {
    ...achievementBase,
    description: `DESCRIPTION-${'Y'.repeat(500)}`,
    name: `ACHIEVEMENT-${'X'.repeat(100)}`,
  },
} as const;

const teamLogoPopulatedData: Record<string, { team?: string; teamId?: string }> = {
  'doosan': { team: 'DB' },
  'hanwha': { team: 'HH' },
  'kia': { team: 'KIA' },
  'kiwoom': { team: 'KH' },
  'kt': { team: 'KT' },
  'legacy-code': { team: 'OB' },
  'lg': { team: 'LG' },
  'lotte': { team: 'LT' },
  'nc': { team: 'NC' },
  'samsung': { team: 'SS' },
  'ssg': { team: 'SSG' },
  'team-id-precedence': { team: 'HH', teamId: 'LG' },
  'unknown-short': { team: '독립구단' },
};

const teamLogoStressData: Record<string, { team?: string }> = {
  'empty': { team: '' },
  'long-korean': { team: '모바일 화면에서 아주 길게 표시되는 미등록 독립 야구단 이름' },
  'null-optional': {},
  'unbroken-token': { team: `UNKNOWN-${'X'.repeat(180)}` },
};

const teamLogoSizes: Record<string, { className?: string; size?: number | 'sm' | 'md' | 'lg' | 'full' }> = {
  'custom-large': { size: 320 },
  'custom-min': { size: 16 },
  'default': {},
  'full-prediction': {
    className: 'h-6 w-6 shrink-0 sm:h-7 sm:w-7 lg:h-[34px] lg:w-[34px]',
    size: 'full',
  },
  'full-standalone': { className: 'h-24 w-24', size: 'full' },
  'lg': { size: 'lg' },
  'md': { size: 'md' },
  'sm': { size: 'sm' },
};

const teamRecommendationPresentations: Record<
  string,
  { questionIndex?: number; recommendedTeam?: string }
> = {
  'question-1': { questionIndex: 0 },
  'question-2': { questionIndex: 1 },
  'question-3': { questionIndex: 2 },
  'question-4': { questionIndex: 3 },
  'question-5': { questionIndex: 4 },
  'question-6': { questionIndex: 5 },
  'question-7': { questionIndex: 6 },
  'result-db': { recommendedTeam: 'DB' },
  'result-hh': { recommendedTeam: 'HH' },
  'result-kh': { recommendedTeam: 'KH' },
  'result-kia': { recommendedTeam: 'KIA' },
  'result-kt': { recommendedTeam: 'KT' },
  'result-lg': { recommendedTeam: 'LG' },
  'result-lt': { recommendedTeam: 'LT' },
  'result-nc': { recommendedTeam: 'NC' },
  'result-ss': { recommendedTeam: 'SS' },
  'result-ssg': { recommendedTeam: 'SSG' },
};

const visualQaNotificationNow = '2026-08-23T12:00:00+09:00';
const visualQaNotificationTypes: NotificationType[] = [
  'APPLICATION_RECEIVED',
  'APPLICATION_APPROVED',
  'APPLICATION_REJECTED',
  'PARTY_EXPIRED',
  'PARTY_AUTO_COMPLETED',
  'GAME_TOMORROW_REMINDER',
  'GAME_DAY_REMINDER',
  'HOST_RESPONSE_NUDGE',
  'REVIEW_REQUEST',
  'PARTY_CANCELLED_HOST_DELETED',
  'PARTY_PARTICIPANT_LEFT',
  'POST_COMMENT',
  'COMMENT_REPLY',
  'POST_LIKE',
  'POST_REPOST',
  'NEW_FOLLOWER',
  'FOLLOWING_NEW_POST',
  'NEW_DEVICE_LOGIN',
  'RANKING_PREDICTION_SETTLED',
];
const visualQaNotification = (
  id: number,
  overrides: Partial<NotificationData> = {},
): NotificationData => ({
  id,
  type: 'APPLICATION_RECEIVED',
  title: `알림 ${id}`,
  message: `비주얼 QA 사용자님에게 ${id}번째 알림이 도착했습니다.`,
  relatedId: 1000 + id,
  isRead: false,
  createdAt: '2026-08-23T11:55:00+09:00',
  ...overrides,
});
const populatedVisualQaNotifications = visualQaNotificationTypes.map((type, index) => (
  visualQaNotification(index + 1, {
    type,
    title: `${type} 알림`,
    createdAt: index < 7
      ? '2026-08-23T11:55:00+09:00'
      : index < 14
        ? '2026-08-20T09:00:00+09:00'
        : '2026-07-01T09:00:00+09:00',
    isRead: index % 3 === 0,
  })
));
const visualQaNotificationData: Record<string, NotificationData[]> = {
  empty: [],
  single: [visualQaNotification(1)],
  populated: populatedVisualQaNotifications,
  'long-korean': [visualQaNotification(1, {
    type: 'POST_COMMENT',
    title: '모바일 알림 목록에서 여러 줄로 자연스럽게 표시되어야 하는 매우 긴 한글 알림 제목입니다',
    message: '아주 긴 사용자 이름님이 작은 화면에서도 삭제 버튼이나 시간 정보와 겹치지 않아야 하는 긴 알림 메시지를 남겼습니다.',
  })],
  'unbroken-token': [visualQaNotification(1, {
    type: 'POST_COMMENT',
    title: `NOTIFICATION-TITLE-${'X'.repeat(180)}`,
    message: `NOTIFICATION-MESSAGE-${'Y'.repeat(240)}`,
  })],
  overflow: Array.from({ length: 24 }, (_, index) => visualQaNotification(index + 1, {
    type: index % 2 === 0 ? 'APPLICATION_RECEIVED' : 'POST_COMMENT',
    title: `스크롤 경계 알림 ${index + 1}`,
    createdAt: index < 8
      ? '2026-08-23T11:55:00+09:00'
      : index < 16
        ? '2026-08-20T09:00:00+09:00'
        : '2026-07-01T09:00:00+09:00',
    isRead: index % 4 === 0,
  })),
};

function VisualQaThrowingState({ message }: { message: string }): never {
  throw new Error(message);
}

function VisualQaAuthenticatedLayoutNullRuntime() {
  return null;
}

function VisualQaAuthenticatedLayoutChatBot({ autoOpen }: { autoOpen?: boolean }) {
  return createElement(
    'div',
    {
      className: 'fixed inset-0 z-[9999] flex min-h-[100dvh] w-full min-w-0 flex-col overflow-hidden border border-border bg-background text-foreground',
      'data-testid': 'authenticated-layout-chatbot-stub',
      role: 'dialog',
      'aria-label': '인증 레이아웃 챗봇 상태',
    },
    createElement(
      'header',
      { className: 'flex min-w-0 items-center justify-between gap-3 bg-primary p-4 text-white' },
      createElement(
        'div',
        { className: 'min-w-0' },
        createElement('p', { className: 'truncate text-base font-bold' }, '야구 가이드 BEGA'),
        createElement('p', { className: 'text-sm text-white/80' }, '인증 레이아웃에서 자동으로 열림'),
      ),
      createElement(
        'span',
        { className: 'inline-flex min-h-11 shrink-0 items-center rounded-full border border-white/30 px-3 text-sm font-semibold' },
        'Beta',
      ),
    ),
    createElement(
      'div',
      { className: 'flex min-h-0 flex-1 items-center justify-center p-4' },
      createElement(
        'div',
        { className: 'min-w-0 max-w-full break-words rounded-2xl border border-border bg-card p-5 text-center [overflow-wrap:anywhere]' },
        autoOpen
          ? '챗봇 요청 상태가 열림으로 전달되어 모바일 전체 화면 패널을 준비했습니다.'
          : '챗봇 요청 상태가 닫힘입니다.',
      ),
    ),
  );
}

function VisualQaAuthenticatedLayoutLauncher({
  className,
  onClick,
  testId,
}: {
  className?: string;
  onClick: () => void;
  testId?: string;
}) {
  return createElement(
    'button',
    {
      'aria-label': '챗봇 열기',
      className: `fixed z-[9999] h-12 w-12 rounded-full bg-green-900 text-white ${className ?? ''}`,
      'data-testid': testId,
      onClick,
      type: 'button',
    },
    'BEGA',
  );
}

function VisualQaLayoutPublicNavbar() {
  return createElement(
    'header',
    {
      className: 'relative z-[60] px-3 py-2',
      'data-testid': 'visual-qa-layout-public-navbar',
    },
    createElement(
      'div',
      { className: 'flex h-12 min-w-0 items-center gap-2 rounded-full border border-border bg-card px-3 shadow-sm' },
      createElement(
        'span',
        { className: 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-white' },
        'B',
      ),
      createElement('strong', { className: 'min-w-0 flex-1 truncate text-primary' }, 'BEGA'),
      createElement('span', { className: 'shrink-0 text-xs text-muted-foreground' }, '공개'),
    ),
  );
}

function VisualQaLayoutNavbar() {
  return createElement(
    'header',
    {
      className: 'relative z-[60] px-3 py-2',
      'data-testid': 'visual-qa-layout-navbar',
    },
    createElement(
      'div',
      { className: 'flex h-12 min-w-0 items-center gap-2 rounded-full border border-border bg-card px-3 shadow-sm' },
      createElement(
        'span',
        { className: 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-white' },
        'B',
      ),
      createElement('strong', { className: 'min-w-0 flex-1 truncate text-primary' }, 'BEGA'),
      createElement('span', { className: 'shrink-0 text-xs text-muted-foreground' }, '로그인'),
    ),
  );
}

function VisualQaLayoutChrome() {
  return createElement(
    'span',
    {
      className: 'sr-only',
      'data-testid': 'visual-qa-layout-chat-chrome',
    },
    '인증 레이아웃 크롬 마운트',
  );
}

type VisualQaReleaseDecisionData =
  | 'empty'
  | 'go'
  | 'no-go'
  | 'pending'
  | 'long-korean'
  | 'unbroken-token'
  | 'maximum-supported';

type VisualQaReleaseDecisionSystem =
  | 'idle'
  | 'presets-loading'
  | 'presets-error'
  | 'eval-cases-loading'
  | 'eval-cases-error'
  | 'artifacts-loading'
  | 'artifacts-error'
  | 'draft-loading'
  | 'draft-error'
  | 'evaluation-loading'
  | 'evaluation-error'
  | 'save-loading'
  | 'save-error'
  | 'save-success'
  | 'artifact-load-loading'
  | 'artifact-markdown-loading'
  | 'artifact-json-loading';

const visualQaReleaseScenario = 'visual-qa-release';
const visualQaReleaseSecondaryScenario = 'visual-qa-release-secondary';

const visualQaReleaseCopy = (data: VisualQaReleaseDecisionData) => {
  if (data === 'long-korean') {
    return '가장 좁은 관리자 모바일 화면에서도 릴리즈 결정 제목과 요약, 차단 사유, 후속 조치, 근거 문구가 카드와 버튼 경계를 벗어나지 않고 자연스럽게 여러 줄로 표시되어야 합니다.';
  }
  if (data === 'unbroken-token') return `RELEASE-${'UNBROKEN'.repeat(32)}`;
  return data === 'maximum-supported'
    ? '비생산 Visual QA 최대 지원 릴리즈 결정'
    : '비생산 Visual QA 릴리즈 결정';
};

const visualQaReleaseDecision = (
  data: VisualQaReleaseDecisionData,
): 'GO' | 'NO_GO' | 'PENDING' => {
  if (data === 'no-go' || data === 'unbroken-token') return 'NO_GO';
  if (data === 'pending' || data === 'long-korean') return 'PENDING';
  return 'GO';
};

const visualQaReleaseList = (
  data: VisualQaReleaseDecisionData,
  text: string,
  label: string,
) => Array.from(
  { length: data === 'maximum-supported' ? 50 : 1 },
  (_, index) => `${text} · ${label} ${index + 1}`,
);

const makeVisualQaReleasePreset = (
  scenario: string,
  text: string,
  count = 1,
) => ({
  scenario,
  task_prompt: text,
  seed_paths: Array.from({ length: count }, (_, index) => `docs/visual-qa/seed-${index + 1}.md`),
  allowed_roots: Array.from({ length: count }, (_, index) => `reports/visual-qa/root-${index + 1}`),
});

const makeVisualQaReleaseEvalCase = (
  caseId: string,
  text: string,
  decision: 'GO' | 'NO_GO' | 'PENDING',
  count = 1,
) => ({
  case_id: caseId,
  scenario: visualQaReleaseScenario,
  expected_decision: decision,
  required_keywords: Array.from({ length: count }, (_, index) => `${text} · keyword ${index + 1}`),
  required_sources: Array.from({ length: count }, (_, index) => `docs/visual-qa/source-${index + 1}.md`),
});

const makeVisualQaReleaseDraft = (
  data: Exclude<VisualQaReleaseDecisionData, 'empty'>,
  text: string,
) => {
  const decision = visualQaReleaseDecision(data);
  const blockers = visualQaReleaseList(data, text, 'blocker');
  const risks = visualQaReleaseList(data, text, 'risk');
  const nextActions = visualQaReleaseList(data, text, 'next action');
  const evidence = visualQaReleaseList(data, text, 'evidence').map((item, index) => ({
    claim: item,
    source: `docs/visual-qa/evidence-${index + 1}.md`,
    excerpt: text,
  }));
  return {
    result: {
      scenario: visualQaReleaseScenario,
      model: data === 'unbroken-token' ? `MODEL-${'M'.repeat(220)}` : 'mock-release-model',
      task_prompt: text,
      seed_paths: ['docs/visual-qa/release.md'],
      generated_at_utc: '2026-08-28T00:01:00Z',
      response_id: 'MOCK-RESPONSE-1',
      raw_response_text: text,
      draft: {
        title: text,
        decision,
        summary: text,
        blockers,
        risks,
        next_actions: nextActions,
        evidence,
        confidence: data === 'pending' || data === 'long-korean' ? 'medium' as const : 'high' as const,
      },
      tool_trace: [{
        tool_name: 'mock-internal-document-read',
        arguments: { source: 'operator-provided-visual-qa-fixture' },
        result_preview: text,
      }],
    },
    markdown: `# ${text}\n\n${text}`,
  };
};

const makeVisualQaReleaseArtifact = (
  index: number,
  text: string,
) => ({
  artifact_id: `MOCK-ARTIFACT-${index}`,
  scenario: visualQaReleaseScenario,
  decision: (index % 3 === 0 ? 'NO_GO' : index % 3 === 1 ? 'GO' : 'PENDING') as 'GO' | 'NO_GO' | 'PENDING',
  eval_status: (index % 2 === 0 ? 'FAIL' : 'PASS') as 'PASS' | 'FAIL',
  saved_at_utc: '2026-08-28T00:02:00Z',
  markdown_filename: `${text}-${index}.md`,
  json_filename: `${text}-${index}.json`,
});

type VisualQaAdminCommunityData =
  | 'empty'
  | 'loading'
  | 'long-korean'
  | 'maximum-supported'
  | 'single'
  | 'unbroken-token';

const visualQaAdminCommunityCopy = (
  data: VisualQaAdminCommunityData,
  fallback: string,
) => data === 'long-korean'
  ? '가장 좁은 관리자 모바일 화면에서도 커뮤니티 운영 데이터의 긴 한국어 문구가 표와 다이얼로그 경계를 침범하지 않고 자연스럽게 여러 줄로 표시되어야 합니다.'
  : data === 'unbroken-token'
    ? `ADMIN-COMMUNITY-${'UNBROKEN'.repeat(32)}`
    : fallback;

const makeVisualQaAdminUser = (
  id: number,
  data: VisualQaAdminCommunityData,
): AdminUser => ({
  id,
  email: data === 'unbroken-token'
    ? `visualqa-${'X'.repeat(180)}@example.com`
    : `visualqa-user-${id}@example.com`,
  name: visualQaAdminCommunityCopy(data, `Visual QA 사용자 ${id}`),
  favoriteTeam: id % 2 === 0 ? null : 'LG',
  createdAt: '2026-08-29T09:00:00+09:00',
  postCount: data === 'maximum-supported' ? Number.MAX_SAFE_INTEGER : id * 3,
  role: id % 11 === 0 ? 'ROLE_ADMIN' : 'ROLE_USER',
});

const makeVisualQaAdminPost = (
  id: number,
  data: VisualQaAdminCommunityData,
): AdminPost => ({
  id,
  team: 'LG',
  content: visualQaAdminCommunityCopy(data, `Visual QA 게시글 ${id}`),
  author: visualQaAdminCommunityCopy(data, `Visual QA 작성자 ${id}`),
  createdAt: '2026-08-29T09:00:00+09:00',
  likeCount: data === 'maximum-supported' ? Number.MAX_SAFE_INTEGER : id * 7,
  commentCount: data === 'maximum-supported' ? Number.MAX_SAFE_INTEGER : id * 2,
  views: data === 'maximum-supported' ? Number.MAX_SAFE_INTEGER : id * 13,
  isHot: id % 2 === 1,
});

const makeVisualQaAdminMate = (
  id: number,
  data: VisualQaAdminCommunityData,
): AdminMate => ({
  id,
  teamId: 'LG',
  title: visualQaAdminCommunityCopy(data, `Visual QA 메이트 모임 ${id}`),
  stadium: visualQaAdminCommunityCopy(data, 'Visual QA 구장'),
  gameDate: '2026-09-01T18:30:00+09:00',
  currentMembers: data === 'maximum-supported' ? Number.MAX_SAFE_INTEGER - 1 : 4,
  maxMembers: data === 'maximum-supported' ? Number.MAX_SAFE_INTEGER : 8,
  status: id % 2 === 0 ? 'matched' : 'pending',
  createdAt: '2026-08-29T09:00:00+09:00',
  hostName: visualQaAdminCommunityCopy(data, `Visual QA 호스트 ${id}`),
  homeTeam: 'VISUAL_QA_HOME',
  awayTeam: 'VISUAL_QA_AWAY',
  section: visualQaAdminCommunityCopy(data, 'Visual QA 좌석 구역'),
});

const visualQaAdminCommunityInventory = (
  data: VisualQaAdminCommunityData,
) => {
  const count = data === 'maximum-supported'
    ? 50
    : data === 'empty' || data === 'loading'
      ? 0
      : 1;
  return {
    users: Array.from({ length: count }, (_, index) => (
      makeVisualQaAdminUser(index + 1, data)
    )),
    posts: Array.from({ length: count }, (_, index) => (
      makeVisualQaAdminPost(index + 1, data)
    )),
    mates: Array.from({ length: count }, (_, index) => (
      makeVisualQaAdminMate(index + 1, data)
    )),
  };
};

type VisualQaAdminCommunityLeafData =
  | 'empty'
  | 'single'
  | 'populated'
  | 'null-optional'
  | 'boundary-minimum'
  | 'boundary-maximum'
  | 'long-korean'
  | 'unbroken-token'
  | 'maximum-supported';

const visualQaAdminCommunityLeafCopy = (
  data: VisualQaAdminCommunityLeafData,
  fallback: string,
) => data === 'boundary-minimum'
  ? 'M'
  : data === 'boundary-maximum'
    ? `MOCK-${Number.MAX_SAFE_INTEGER}`
    : data === 'long-korean'
      ? '가장 좁은 관리자 모바일 화면에서도 커뮤니티 운영 데이터의 매우 긴 한국어 문구가 표와 다이얼로그 경계를 침범하지 않고 자연스럽게 여러 줄로 표시되어 전체 원문을 확인할 수 있어야 합니다. '.repeat(4).trim()
      : data === 'unbroken-token'
        ? `ADMIN-COMMUNITY-LEAF-${'UNBROKEN'.repeat(40)}`
        : fallback;

const visualQaAdminMateStatuses = [
  'pending',
  'matched',
  'selling',
  'sold',
  'completed',
  'unknown-status',
] as const;

const makeVisualQaAdminLeafMate = (
  index: number,
  data: VisualQaAdminCommunityLeafData,
) => ({
  id: data === 'boundary-minimum'
    ? 0
    : data === 'boundary-maximum'
      ? Number.MAX_SAFE_INTEGER
      : index,
  title: visualQaAdminCommunityLeafCopy(data, `Visual QA 메이트 모임 ${index}`),
  hostName: visualQaAdminCommunityLeafCopy(data, `Visual QA 호스트 ${index}`),
  gameDate: '2000-01-01T18:30:00+09:00',
  maxMembers: data === 'boundary-minimum'
    ? 1
    : data === 'boundary-maximum' || data === 'maximum-supported'
      ? Number.MAX_SAFE_INTEGER
      : 8,
  currentMembers: data === 'boundary-minimum'
    ? 0
    : data === 'boundary-maximum' || data === 'maximum-supported'
      ? Number.MAX_SAFE_INTEGER - 1
      : 4,
  status: visualQaAdminMateStatuses[(index - 1) % visualQaAdminMateStatuses.length],
});

const makeVisualQaAdminLeafPost = (
  index: number,
  data: VisualQaAdminCommunityLeafData,
) => ({
  id: data === 'boundary-minimum'
    ? 0
    : data === 'boundary-maximum'
      ? Number.MAX_SAFE_INTEGER
      : index,
  team: 'LG',
  content: data === 'null-optional'
    ? undefined
    : visualQaAdminCommunityLeafCopy(data, `Visual QA 게시글 ${index}`),
  author: visualQaAdminCommunityLeafCopy(data, `Visual QA 작성자 ${index}`),
  createdAt: '2000-01-01T00:00:00.000Z',
  likeCount: data === 'boundary-minimum'
    ? 0
    : data === 'boundary-maximum' || data === 'maximum-supported'
      ? Number.MAX_SAFE_INTEGER
      : index * 7,
  commentCount: data === 'boundary-minimum'
    ? 0
    : data === 'boundary-maximum' || data === 'maximum-supported'
      ? Number.MAX_SAFE_INTEGER
      : index * 2,
  isHot: data === 'null-optional' ? undefined : index % 2 === 1,
});

const visualQaAdminLeafUserRoles = [
  'ROLE_USER',
  'ROLE_ADMIN',
  'ROLE_SUPER_ADMIN',
  'ROLE_USER',
] as const;

const makeVisualQaAdminLeafUser = (
  index: number,
  data: VisualQaAdminCommunityLeafData,
) => ({
  id: data === 'boundary-minimum'
    ? 0
    : data === 'boundary-maximum'
      ? Number.MAX_SAFE_INTEGER
      : index,
  email: data === 'unbroken-token'
    ? `visualqa-${'X'.repeat(180)}@example.invalid`
    : data === 'long-korean'
      ? `visualqa-${'long'.repeat(40)}@example.invalid`
      : `visualqa-user-${index}@example.invalid`,
  name: visualQaAdminCommunityLeafCopy(data, `Visual QA 사용자 ${index}`),
  favoriteTeam: data === 'null-optional' || index % 2 === 0 ? undefined : 'LG',
  createdAt: '2000-01-01T00:00:00.000Z',
  postCount: data === 'boundary-minimum'
    ? 0
    : data === 'boundary-maximum' || data === 'maximum-supported'
      ? Number.MAX_SAFE_INTEGER
      : index * 3,
  role: visualQaAdminLeafUserRoles[(index - 1) % visualQaAdminLeafUserRoles.length],
});

const visualQaAdminLeafCount = (
  data: VisualQaAdminCommunityLeafData,
  populatedCount = 1,
) => data === 'empty'
  ? 0
  : data === 'maximum-supported'
    ? 50
    : data === 'populated'
      ? populatedCount
      : 1;

type VisualQaAdminGameStatusData =
  | 'empty'
  | 'clean'
  | 'mismatch-only'
  | 'non-canonical-only'
  | 'mixed'
  | 'repair-dry-run'
  | 'repair-applied'
  | 'tracker-draft'
  | 'tracker-requested'
  | 'tracker-done'
  | 'closure-pass'
  | 'long-korean'
  | 'unbroken-token'
  | 'maximum-supported';

type VisualQaAdminGameStatusSystem =
  | 'idle'
  | 'initial-loading'
  | 'diagnosis-loading'
  | 'repair-loading'
  | 'suggestions-loading'
  | 'suggestions-error'
  | 'tracker-loading'
  | 'tracker-saving'
  | 'panel-error'
  | 'tracker-message'
  | 'action-success'
  | 'copy-done'
  | 'copy-error'
  | 'manual-required';

const visualQaAdminGameStatusCopy = (
  data: VisualQaAdminGameStatusData,
  fallback: string,
) => data === 'long-korean'
  ? '비생산 Visual QA에서 가장 좁은 관리자 모바일 화면의 긴 한국어 경기 상태 진단 문구와 정제 이력이 카드 및 표 경계를 벗어나지 않고 자연스럽게 여러 줄로 표시되어야 합니다.'
  : data === 'unbroken-token'
    ? `MOCK-GAME-STATUS-${'UNBROKEN'.repeat(34)}`
    : fallback;

const makeVisualQaGameStatusMismatch = (
  index: number,
  data: VisualQaAdminGameStatusData,
): AdminGameStatusMismatch => ({
  gameId: `MOCK-MISMATCH-${index}`,
  gameDate: `2026-08-${String(29 - ((index - 1) % 14)).padStart(2, '0')}`,
  startTime: '18:30:00',
  rawStatus: 'MOCK_RAW_STATUS',
  normalizedRawStatus: 'MOCK_NORMALIZED_STATUS',
  effectiveStatus: 'MOCK_EFFECTIVE_STATUS',
  homeScore: 7,
  awayScore: 4,
  inningScoreCount: 9,
  hasKnownScore: true,
  hasInningScores: true,
  reasons: [visualQaAdminGameStatusCopy(data, `비생산 Visual QA mismatch 사유 ${index}`)],
});

const makeVisualQaNonCanonicalGame = (
  index: number,
  data: VisualQaAdminGameStatusData,
): AdminNonCanonicalGame => ({
  gameId: `MOCK-NON-CANONICAL-${index}`,
  gameDate: `2026-08-${String(29 - ((index - 1) % 14)).padStart(2, '0')}`,
  startTime: '18:30:00',
  rawStatus: 'MOCK_RAW_STATUS',
  homeTeam: visualQaAdminGameStatusCopy(data, `MOCK_HOME_${index}`),
  awayTeam: visualQaAdminGameStatusCopy(data, `MOCK_AWAY_${index}`),
  homeScore: null,
  awayScore: null,
  reasons: [visualQaAdminGameStatusCopy(data, `비생산 Visual QA 비정상 팀 코드 ${index}`)],
});

const makeVisualQaGameScoreSyncResult = (
  index: number,
): AdminGameScoreSyncResult => ({
  gameId: `MOCK-MISMATCH-${index}`,
  homeScore: 7,
  awayScore: 4,
  gameStatus: 'MOCK_EFFECTIVE_STATUS',
  inningScoreCount: 9,
  synced: true,
  usedInningScores: true,
  winningTeam: `MOCK_HOME_${index}`,
  winningScore: 7,
});

const makeVisualQaCleanupTracker = ({
  startDate,
  endDate = startDate,
  status,
  copy,
  gameIds,
  includeArtifacts = false,
  compareStatus,
  updatedAt = '2026-08-29T09:00:00+09:00',
}: {
  startDate: string;
  endDate?: string;
  status: AdminNonCanonicalCleanupTrackerStatus;
  copy: string;
  gameIds: string[];
  includeArtifacts?: boolean;
  compareStatus?: 'PASS' | 'FAIL';
  updatedAt?: string;
}): AdminNonCanonicalCleanupTrackerEntry => ({
  startDate,
  endDate,
  ticketUrl: `https://example.invalid/visual-qa/${encodeURIComponent(startDate)}`,
  assignee: copy,
  status,
  note: [
    copy,
    ...(includeArtifacts ? [
      '- summary_json: reports/visual-qa/mock/summary.json',
      '- handoff_md: reports/visual-qa/mock/handoff.md',
    ] : []),
    ...(compareStatus ? [
      `[closure-sync 2026-08-29T00:00:00Z] compare=${compareStatus} tracker=${status} resolved=${compareStatus === 'PASS' ? 1 : 0} remaining=${compareStatus === 'PASS' ? 0 : 1} new=0`,
    ] : []),
  ].join('\n'),
  updatedAt,
  gameIds,
});

const buildVisualQaAdminGameStatusState = (
  data: VisualQaAdminGameStatusData,
  system: VisualQaAdminGameStatusSystem,
) => {
  const rangeStart = '2026-08-29';
  const rangeEnd = data === 'empty' ? rangeStart : '2026-08-30';
  const copy = visualQaAdminGameStatusCopy(data, '비생산 Visual QA 정제 이력');
  const maximum = data === 'maximum-supported';
  const mismatchCount = maximum
    ? 50
    : data === 'mismatch-only'
      || data === 'mixed'
      || data === 'repair-dry-run'
      || data === 'repair-applied'
      || data === 'long-korean'
      || data === 'unbroken-token'
        ? 1
        : 0;
  const nonCanonicalCount = maximum
    ? 50
    : data === 'non-canonical-only'
      || data === 'mixed'
      || data === 'repair-dry-run'
      || data === 'repair-applied'
      || data === 'tracker-draft'
      || data === 'tracker-requested'
      || data === 'long-korean'
      || data === 'unbroken-token'
        ? 1
        : 0;
  const mismatches = Array.from(
    { length: mismatchCount },
    (_, index) => makeVisualQaGameStatusMismatch(index + 1, data),
  );
  const nonCanonicalGames = Array.from(
    { length: nonCanonicalCount },
    (_, index) => makeVisualQaNonCanonicalGame(index + 1, data),
  );
  const mismatchResult: AdminGameStatusMismatchBatchResult | null = data === 'empty'
    ? null
    : {
      startDate: rangeStart,
      endDate: rangeEnd,
      totalGames: Math.max(1, mismatchCount + nonCanonicalCount),
      mismatchCount,
      mismatches,
      nonCanonicalCount,
      nonCanonicalGames,
    };
  const hasRepairResult = data === 'repair-dry-run'
    || data === 'repair-applied'
    || maximum;
  const repairResult: AdminGameStatusRepairBatchResult | null = hasRepairResult
    ? {
      startDate: rangeStart,
      endDate: rangeEnd,
      dryRun: data === 'repair-dry-run',
      totalGames: Math.max(1, mismatchCount + nonCanonicalCount),
      mismatchCount,
      repairedCount: mismatchCount,
      mismatches,
      repairedGames: Array.from(
        { length: mismatchCount },
        (_, index) => makeVisualQaGameScoreSyncResult(index + 1),
      ),
      nonCanonicalCount,
      nonCanonicalGames,
    }
    : null;
  const trackerStatus: AdminNonCanonicalCleanupTrackerStatus = data === 'tracker-draft'
    ? 'draft'
    : data === 'tracker-requested'
      ? 'requested'
      : data === 'tracker-done'
        ? 'done'
        : 'in_progress';
  const hasCurrentTracker = maximum
    || data === 'mixed'
    || data === 'repair-dry-run'
    || data === 'repair-applied'
    || data === 'tracker-draft'
    || data === 'tracker-requested'
    || data === 'tracker-done'
    || data === 'closure-pass'
    || data === 'long-korean'
    || data === 'unbroken-token';
  const currentTracker = hasCurrentTracker
    ? makeVisualQaCleanupTracker({
      startDate: rangeStart,
      endDate: rangeEnd,
      status: trackerStatus,
      copy,
      gameIds: maximum || data === 'closure-pass'
        ? ['MOCK-RESOLVED-1']
        : nonCanonicalGames.map((game) => game.gameId),
      includeArtifacts: maximum || data === 'mixed' || data === 'repair-applied',
      compareStatus: data === 'closure-pass' ? 'PASS' : hasCurrentTracker ? 'FAIL' : undefined,
    })
    : null;
  const historicalTrackers = maximum
    ? Array.from({ length: 49 }, (_, index) => {
      const historyDate = new Date(Date.UTC(2026, 5, index + 1)).toISOString().slice(0, 10);
      const statuses: AdminNonCanonicalCleanupTrackerStatus[] = [
        'draft',
        'requested',
        'in_progress',
        'done',
      ];
      return makeVisualQaCleanupTracker({
        startDate: historyDate,
        status: statuses[index % statuses.length],
        copy: `비생산 Visual QA 정제 이력 ${index + 1}`,
        gameIds: [`MOCK-HISTORY-${index + 1}`],
        includeArtifacts: index === 0,
        compareStatus: index % 2 === 0 ? 'PASS' : 'FAIL',
        updatedAt: `2026-08-${String(28 - (index % 20)).padStart(2, '0')}T09:00:00+09:00`,
      });
    })
    : [];
  const recommendationCount = maximum ? 14 : data === 'empty' || data === 'clean' ? 0 : 1;
  const recentRecommendations = Array.from({ length: recommendationCount }, (_, index) => ({
    gameDate: `2026-08-${String(29 - index).padStart(2, '0')}`,
    mismatchCount: Math.max(1, mismatchCount),
    nonCanonicalCount: Math.max(1, nonCanonicalCount),
    issueCount: Math.max(2, mismatchCount + nonCanonicalCount),
    effectiveStatuses: ['MOCK_EFFECTIVE_STATUS'],
  }));
  const initialLoading = system === 'initial-loading';
  const panelError = system === 'manual-required'
    ? MANUAL_BASEBALL_DATA_REQUIRED_CODE
    : system === 'panel-error'
      ? visualQaAdminGameStatusCopy(data, '비생산 Visual QA 경기 상태 요청 오류')
      : null;
  const suggestionsError = system === 'suggestions-error'
    ? visualQaAdminGameStatusCopy(data, '비생산 Visual QA 최근 이슈 조회 오류')
    : null;
  const defaultActionMessage = data === 'repair-dry-run'
    ? '비생산 Visual QA dry-run 완료'
    : data === 'repair-applied'
      ? '비생산 Visual QA 실제 복구 완료'
      : null;

  return {
    today: rangeStart,
    startDate: rangeStart,
    endDate: rangeEnd,
    loadingMismatches: initialLoading || system === 'diagnosis-loading',
    loadingRepair: system === 'repair-loading',
    loadingSuggestions: initialLoading || system === 'suggestions-loading',
    loadingCleanupTrackers: initialLoading || system === 'tracker-loading',
    savingCleanupTracker: system === 'tracker-saving',
    panelError,
    suggestionsError,
    lastActionMessage: system === 'action-success'
      ? visualQaAdminGameStatusCopy(data, '비생산 Visual QA 진단 작업 완료')
      : defaultActionMessage,
    mismatchResult,
    repairResult,
    recentRecommendations,
    cleanupTrackers: [...(currentTracker ? [currentTracker] : []), ...historicalTrackers],
    nonCanonicalCopyState: system === 'copy-done'
      ? 'done'
      : system === 'copy-error'
        ? 'error'
        : 'idle',
    cleanupTicketUrl: currentTracker?.ticketUrl ?? (nonCanonicalCount > 0
      ? 'https://example.invalid/visual-qa/draft'
      : ''),
    cleanupAssignee: currentTracker?.assignee ?? (nonCanonicalCount > 0 ? copy : ''),
    cleanupStatus: trackerStatus,
    cleanupNote: currentTracker ? copy : nonCanonicalCount > 0 ? copy : '',
    cleanupSavedAt: currentTracker?.updatedAt ?? null,
    cleanupTrackerMessage: system === 'tracker-message'
      ? visualQaAdminGameStatusCopy(data, '비생산 Visual QA tracker 저장 완료')
      : null,
  };
};

type VisualQaAdminOffseasonData =
  | 'empty'
  | 'populated'
  | 'null-optional'
  | 'boundary-minimum'
  | 'boundary-maximum'
  | 'long-korean'
  | 'unbroken-token'
  | 'maximum-supported';

type VisualQaAdminOffseasonSystem =
  | 'idle'
  | 'list-loading'
  | 'load-error'
  | 'success-message'
  | 'csv-importing'
  | 'csv-success'
  | 'csv-many-errors'
  | 'quality-filter-empty'
  | 'create-dialog'
  | 'edit-dialog'
  | 'delete-dialog'
  | 'create-submitting'
  | 'edit-submitting'
  | 'delete-submitting'
  | 'content-fallback'
  | 'results-fallback'
  | 'dialogs-fallback';

const makeVisualQaAdminOffseasonMovement = (
  id: number,
  overrides: Partial<AdminOffseasonMovement> = {},
): AdminOffseasonMovement => ({
  id,
  movementDate: '2000-01-01',
  section: ['FA', '트레이드', '외국인', '방출/웨이버', '군 관련', '기타'][id % 6],
  teamCode: FRANCHISE_TEAM_IDS[id % FRANCHISE_TEAM_IDS.length] ?? 'LG',
  playerName: `MOCK 비생산 선수 ${id}`,
  summary: `MOCK 비생산 이동 요약 ${id}`,
  details: `MOCK 비생산 이동 상세 메모 ${id}`,
  contractTerm: `MOCK ${id}년`,
  contractValue: `MOCK 계약 규모 ${id}`,
  optionDetails: `MOCK 옵션 ${id}`,
  counterpartyTeam: 'LG',
  counterpartyDetails: `MOCK 반대급부 ${id}`,
  sourceLabel: `MOCK 비생산 출처 ${id}`,
  sourceUrl: `https://example.invalid/visual-qa/offseason/${id}`,
  announcedAt: '2000-01-01T00:00:00',
  createdAt: '2000-01-01T00:00:00',
  updatedAt: '2000-01-01T00:00:00',
  ...overrides,
});

const visualQaAdminOffseasonLongKorean =
  '비생산 Visual QA 모바일 화면에서 선수명과 이동 요약, 계약 조건, 출처, 상세 메모가 카드와 표 경계를 넘지 않고 자연스럽게 줄바꿈되는지 확인하는 긴 한국어 문구입니다. '.repeat(4);
const visualQaAdminOffseasonUnbroken = `MOCK_OFFSEASON_${'UNBROKEN'.repeat(44)}`;

const resolveVisualQaAdminOffseasonMovements = (
  data: VisualQaAdminOffseasonData,
): AdminOffseasonMovement[] => {
  switch (data) {
    case 'empty':
      return [];
    case 'populated':
      return Array.from({ length: 6 }, (_, index) => makeVisualQaAdminOffseasonMovement(index + 1));
    case 'null-optional':
      return [makeVisualQaAdminOffseasonMovement(7, {
        summary: null,
        details: null,
        contractTerm: null,
        contractValue: null,
        optionDetails: null,
        counterpartyTeam: null,
        counterpartyDetails: null,
        sourceLabel: null,
        sourceUrl: null,
        announcedAt: null,
        createdAt: null,
        updatedAt: null,
      })];
    case 'boundary-minimum':
      return [makeVisualQaAdminOffseasonMovement(1, {
        playerName: 'MOCK 가',
        summary: 'M',
        details: 'M',
        contractTerm: '1',
        contractValue: '0',
        optionDetails: '0',
        counterpartyDetails: 'M',
        sourceLabel: 'M',
      })];
    case 'boundary-maximum':
      return [makeVisualQaAdminOffseasonMovement(2_147_483_647, {
        playerName: `MOCK 경계 최대 ${'선수'.repeat(24)}`,
        summary: `MOCK 경계 최대 ${'요약'.repeat(56)}`,
        details: `MOCK 경계 최대 ${'상세'.repeat(80)}`,
        contractTerm: `MOCK ${'계약기간'.repeat(20)}`,
        contractValue: `MOCK ${'계약규모'.repeat(20)}`,
        optionDetails: `MOCK ${'옵션'.repeat(24)}`,
        sourceLabel: `MOCK ${'출처'.repeat(24)}`,
      })];
    case 'long-korean':
      return [makeVisualQaAdminOffseasonMovement(8, {
        playerName: `MOCK ${visualQaAdminOffseasonLongKorean}`,
        summary: visualQaAdminOffseasonLongKorean,
        details: visualQaAdminOffseasonLongKorean,
        contractTerm: visualQaAdminOffseasonLongKorean,
        contractValue: visualQaAdminOffseasonLongKorean,
        optionDetails: visualQaAdminOffseasonLongKorean,
        counterpartyDetails: visualQaAdminOffseasonLongKorean,
        sourceLabel: visualQaAdminOffseasonLongKorean,
      })];
    case 'unbroken-token':
      return [makeVisualQaAdminOffseasonMovement(9, {
        playerName: visualQaAdminOffseasonUnbroken,
        summary: visualQaAdminOffseasonUnbroken,
        details: visualQaAdminOffseasonUnbroken,
        contractTerm: visualQaAdminOffseasonUnbroken,
        contractValue: visualQaAdminOffseasonUnbroken,
        optionDetails: visualQaAdminOffseasonUnbroken,
        counterpartyDetails: visualQaAdminOffseasonUnbroken,
        sourceLabel: visualQaAdminOffseasonUnbroken,
      })];
    case 'maximum-supported':
      return Array.from({ length: 50 }, (_, index) => makeVisualQaAdminOffseasonMovement(index + 1, {
        playerName: `MOCK 최대 비생산 선수 ${index + 1}`,
      }));
  }
};

const buildVisualQaAdminOffseasonState = (
  data: VisualQaAdminOffseasonData,
  system: VisualQaAdminOffseasonSystem,
) => {
  const canonicalRows = resolveVisualQaAdminOffseasonMovements(data);
  const dialogMovement = canonicalRows[0] ?? makeVisualQaAdminOffseasonMovement(1);
  const formData = {
    movementDate: dialogMovement.movementDate,
    section: dialogMovement.section,
    teamCode: dialogMovement.teamCode,
    playerName: dialogMovement.playerName,
    summary: dialogMovement.summary ?? '',
    details: dialogMovement.details ?? '',
    contractTerm: dialogMovement.contractTerm ?? '',
    contractValue: dialogMovement.contractValue ?? '',
    optionDetails: dialogMovement.optionDetails ?? '',
    counterpartyTeam: dialogMovement.counterpartyTeam ?? '',
    counterpartyDetails: dialogMovement.counterpartyDetails ?? '',
    sourceLabel: dialogMovement.sourceLabel ?? '',
    sourceUrl: dialogMovement.sourceUrl ?? '',
    announcedAt: dialogMovement.announcedAt ?? '',
  };
  const createDialog = system === 'create-dialog' || system === 'create-submitting' || system === 'dialogs-fallback';
  const editDialog = system === 'edit-dialog' || system === 'edit-submitting';
  const deleteDialog = system === 'delete-dialog' || system === 'delete-submitting';
  const csvManyErrors = Array.from(
    { length: 12 },
    (_, index) => `${index + 2}행: MOCK 비생산 CSV 오류 ${visualQaAdminOffseasonUnbroken}`,
  );

  return {
    active: true as const,
    movements: system === 'list-loading' ? [] : canonicalRows,
    loading: system === 'list-loading',
    submitting: system.endsWith('-submitting'),
    importingCsv: system === 'csv-importing',
    error: system === 'load-error'
      ? `MOCK 비생산 목록 오류 ${visualQaAdminOffseasonLongKorean}`
      : null,
    successMessage: system === 'success-message'
      ? `MOCK 비생산 저장 완료 ${visualQaAdminOffseasonLongKorean}`
      : null,
    csvReport: system === 'csv-success' || system === 'csv-many-errors'
      ? {
        fileName: system === 'csv-many-errors'
          ? `MOCK-${visualQaAdminOffseasonUnbroken}.csv`
          : 'MOCK-offseason-success.csv',
        totalRows: system === 'csv-many-errors' ? 50 : 3,
        createdCount: system === 'csv-many-errors' ? 1 : 2,
        updatedCount: 1,
        failedCount: system === 'csv-many-errors' ? csvManyErrors.length : 0,
        errors: system === 'csv-many-errors' ? csvManyErrors : [],
      }
      : null,
    search: '',
    sectionFilter: 'ALL',
    teamFilter: 'ALL',
    fromDate: '',
    toDate: '',
    qualityFilter: system === 'quality-filter-empty' ? 'MISSING_SUMMARY' as const : 'ALL' as const,
    dialogOpen: createDialog || editDialog,
    editingMovement: editDialog ? dialogMovement : null,
    deleteTarget: deleteDialog ? dialogMovement : null,
    formData,
    contentPhase: system === 'content-fallback' ? 'fallback' as const : 'resolved' as const,
    resultsPhase: system === 'results-fallback' ? 'fallback' as const : 'resolved' as const,
    dialogsPhase: system === 'dialogs-fallback' ? 'fallback' as const : 'resolved' as const,
  };
};

const visualQaAdminOffseasonQualityOptions = [
  { value: 'ALL', label: '전체', hint: 'MOCK 비생산 전체 이동' },
  { value: 'MISSING_SUMMARY', label: '요약 없음', hint: 'MOCK 비생산 요약 누락' },
  { value: 'MISSING_DETAILS', label: '상세 메모 없음', hint: 'MOCK 비생산 상세 누락' },
  { value: 'MISSING_SOURCE', label: '출처 없음', hint: 'MOCK 비생산 출처 누락' },
  { value: 'MISSING_STRUCTURED', label: '구조화 없음', hint: 'MOCK 비생산 구조화 누락' },
] as const;

const buildVisualQaAdminOffseasonContentProps = (
  data: VisualQaAdminOffseasonData,
  preset: Exclude<VisualQaAdminOffseasonSystem, 'content-fallback'>,
  interaction: string,
  targetId: string | undefined,
) => {
  const state = buildVisualQaAdminOffseasonState(data, preset);
  const movements = state.movements;
  const filteredMovements = preset === 'quality-filter-empty' ? [] : movements;
  const qualityCounts = {
    ALL: movements.length,
    MISSING_SUMMARY: movements.filter((movement) => !movement.summary?.trim()).length,
    MISSING_DETAILS: movements.filter((movement) => !movement.details?.trim()).length,
    MISSING_SOURCE: movements.filter((movement) => (
      !movement.sourceLabel?.trim() && !movement.sourceUrl?.trim()
    )).length,
    MISSING_STRUCTURED: movements.filter((movement) => !(
      movement.contractTerm?.trim()
      || movement.contractValue?.trim()
      || movement.optionDetails?.trim()
      || movement.counterpartyTeam?.trim()
      || movement.counterpartyDetails?.trim()
    )).length,
  };
  const activeQualityOption = visualQaAdminOffseasonQualityOptions.find(
    ({ value }) => value === state.qualityFilter,
  ) ?? visualQaAdminOffseasonQualityOptions[0];
  const callbackCounts = new Map<string, number>();
  const trackedCallback = <Args extends unknown[]>(
    name: string,
    validate?: (...args: Args) => void,
  ) => (...args: Args) => {
    const nextCount = (callbackCounts.get(name) ?? 0) + 1;
    callbackCounts.set(name, nextCount);
    if (nextCount !== 1) {
      throw new Error(`Admin offseason content Visual QA callback repeated: ${name}`);
    }
    validate?.(...args);
  };
  const expectValue = (name: string, actual: string, expected: string) => {
    if (actual !== expected) {
      throw new Error(
        `Admin offseason content Visual QA callback ${name} expected ${expected} but received ${actual}`,
      );
    }
  };

  return {
    successMessage: state.successMessage,
    error: state.error,
    movements,
    filteredMovements,
    loading: state.loading,
    importingCsv: state.importingCsv,
    submitting: state.submitting,
    csvReport: state.csvReport,
    search: state.search,
    sectionFilter: state.sectionFilter,
    teamFilter: state.teamFilter,
    fromDate: state.fromDate,
    toDate: state.toDate,
    qualityFilter: state.qualityFilter,
    qualityOptions: [...visualQaAdminOffseasonQualityOptions],
    activeQualityOption,
    qualityCounts,
    summaryCount: movements.filter((movement) => movement.summary?.trim()).length,
    detailsCount: movements.filter((movement) => movement.details?.trim()).length,
    structuredCount: movements.length - qualityCounts.MISSING_STRUCTURED,
    sourcedCount: movements.length - qualityCounts.MISSING_SOURCE,
    dialogOpen: state.dialogOpen,
    editingMovement: state.editingMovement,
    deleteTarget: state.deleteTarget,
    formData: state.formData,
    onSearchChange: trackedCallback<[string]>('onSearchChange', (value) => {
      if (interaction === 'input' && targetId === 'search') {
        expectValue('onSearchChange', value, 'MOCK 모바일 검색 입력');
      }
    }),
    onSectionFilterChange: trackedCallback<[string]>('onSectionFilterChange'),
    onTeamFilterChange: trackedCallback<[string]>('onTeamFilterChange', (value) => {
      if (interaction === 'change' && targetId === 'team-filter') {
        expectValue('onTeamFilterChange', value, 'LG');
      }
    }),
    onFromDateChange: trackedCallback<[string]>('onFromDateChange'),
    onToDateChange: trackedCallback<[string]>('onToDateChange'),
    onApplyFilters: trackedCallback('onApplyFilters'),
    onResetFilters: trackedCallback('onResetFilters'),
    onQualityFilterChange: trackedCallback<[string]>('onQualityFilterChange'),
    onRefresh: trackedCallback('onRefresh'),
    onDownloadCsvTemplate: trackedCallback('onDownloadCsvTemplate'),
    onOpenCsvImport: trackedCallback('onOpenCsvImport'),
    onOpenCreateDialog: trackedCallback('onOpenCreateDialog'),
    onOpenEditDialog: trackedCallback<[AdminOffseasonMovement]>('onOpenEditDialog'),
    onDeleteTargetChange: trackedCallback<[AdminOffseasonMovement | null]>(
      'onDeleteTargetChange',
    ),
    onDialogClose: trackedCallback('onDialogClose'),
    onUpdateField: trackedCallback<[string, string]>('onUpdateField', (field, value) => {
      if (interaction === 'input' && targetId === 'dialog-summary') {
        expectValue('onUpdateField field', field, 'summary');
        expectValue('onUpdateField value', value, 'MOCK 비생산 모바일 요약 입력');
      }
      if (interaction === 'change' && targetId === 'dialog-section') {
        expectValue('onUpdateField field', field, 'section');
        expectValue('onUpdateField value', value, '기타');
      }
    }),
    onSubmit: trackedCallback('onSubmit'),
    onDelete: trackedCallback('onDelete'),
    visualQaControlledState: true as const,
    visualQaStateOverride: {
      resultsPhase: state.resultsPhase,
      dialogsPhase: state.dialogsPhase,
    },
  };
};

type VisualQaAdminOffseasonResultsPreset =
  | 'idle'
  | 'loading'
  | 'filtered-empty'
  | 'csv-success'
  | 'csv-single-error'
  | 'csv-many-errors'
  | 'csv-boundary-maximum'
  | 'csv-pressure'
  | 'csv-success-loading';

type VisualQaAdminOffseasonDialogsPreset =
  | 'create-dialog'
  | 'edit-dialog'
  | 'delete-dialog'
  | 'create-submitting'
  | 'edit-submitting'
  | 'delete-submitting';

const buildVisualQaAdminOffseasonResultsProps = (
  data: VisualQaAdminOffseasonData,
  preset: VisualQaAdminOffseasonResultsPreset,
) => {
  const movements = resolveVisualQaAdminOffseasonMovements(data);
  const selectedMovement = movements[0] ?? makeVisualQaAdminOffseasonMovement(1);
  const callbackCounts = new Map<string, number>();
  const trackedMovementCallback = (name: string) => (movement: AdminOffseasonMovement | null) => {
    const nextCount = (callbackCounts.get(name) ?? 0) + 1;
    callbackCounts.set(name, nextCount);
    if (nextCount !== 1) {
      throw new Error(`Admin offseason results Visual QA callback repeated: ${name}`);
    }
    if (movement !== selectedMovement) {
      throw new Error(`Admin offseason results Visual QA callback identity mismatch: ${name}`);
    }
  };
  const manyErrors = Array.from(
    { length: 12 },
    (_, index) => `${index + 2}행: MOCK 비생산 CSV 오류 ${visualQaAdminOffseasonUnbroken}`,
  );
  const csvReport = (() => {
    if (preset === 'csv-success' || preset === 'csv-success-loading') {
      return {
        fileName: 'MOCK-offseason-success.csv',
        totalRows: 3,
        createdCount: 2,
        updatedCount: 1,
        failedCount: 0,
        errors: [],
      };
    }
    if (preset === 'csv-single-error') {
      return {
        fileName: 'MOCK-offseason-single-error.csv',
        totalRows: 1,
        createdCount: 0,
        updatedCount: 0,
        failedCount: 1,
        errors: ['2행: MOCK 비생산 필수값 누락'],
      };
    }
    if (preset === 'csv-many-errors') {
      return {
        fileName: 'MOCK-offseason-many-errors.csv',
        totalRows: 50,
        createdCount: 1,
        updatedCount: 0,
        failedCount: manyErrors.length,
        errors: manyErrors,
      };
    }
    if (preset === 'csv-boundary-maximum') {
      return {
        fileName: 'MOCK-offseason-boundary-maximum.csv',
        totalRows: 999_999,
        createdCount: 499_999,
        updatedCount: 499_999,
        failedCount: 1,
        errors: ['999999행: MOCK 비생산 최대 행 경계 오류'],
      };
    }
    if (preset === 'csv-pressure') {
      return {
        fileName: `MOCK-${visualQaAdminOffseasonUnbroken}.csv`,
        totalRows: 50,
        createdCount: 0,
        updatedCount: 0,
        failedCount: manyErrors.length,
        errors: manyErrors,
      };
    }
    return null;
  })();

  return {
    csvReport,
    movements,
    filteredMovements: preset === 'filtered-empty' ? [] : movements,
    loading: preset === 'loading' || preset === 'csv-success-loading',
    activeQualityOption: preset === 'filtered-empty'
      ? visualQaAdminOffseasonQualityOptions[1]
      : visualQaAdminOffseasonQualityOptions[0],
    onOpenEditDialog: trackedMovementCallback('onOpenEditDialog'),
    onDeleteTargetChange: trackedMovementCallback('onDeleteTargetChange'),
  };
};

const buildVisualQaAdminOffseasonDialogsProps = (
  data: VisualQaAdminOffseasonData,
  preset: VisualQaAdminOffseasonDialogsPreset,
  interaction: string,
  targetId: string | undefined,
) => {
  const baseSystem = preset.startsWith('edit')
    ? 'edit-dialog'
    : preset.startsWith('delete')
      ? 'delete-dialog'
      : 'create-dialog';
  const state = buildVisualQaAdminOffseasonState(data, baseSystem);
  const emptyFormData: AdminOffseasonMovementPayload = {
    movementDate: '',
    section: 'FA',
    teamCode: 'DB',
    playerName: '',
    summary: '',
    details: '',
    contractTerm: '',
    contractValue: '',
    optionDetails: '',
    counterpartyTeam: '',
    counterpartyDetails: '',
    sourceLabel: '',
    sourceUrl: '',
    announcedAt: '',
  };
  const movement = state.editingMovement ?? state.deleteTarget
    ?? state.movements[0]
    ?? makeVisualQaAdminOffseasonMovement(1);
  const deleteInteraction = targetId?.startsWith('delete-') === true;
  const callbackCounts = new Map<string, number>();
  const trackedCallback = <Args extends unknown[]>(
    name: string,
    validate?: (...args: Args) => void,
  ) => (...args: Args) => {
    const nextCount = (callbackCounts.get(name) ?? 0) + 1;
    callbackCounts.set(name, nextCount);
    if (nextCount !== 1) {
      throw new Error(`Admin offseason dialogs Visual QA callback repeated: ${name}`);
    }
    validate?.(...args);
  };
  const expectedUpdates: Partial<Record<string, [string, string]>> = {
    'player-name': ['playerName', 'MOCK 직접 모바일 선수 입력'],
    summary: ['summary', 'MOCK 직접 모바일 요약 입력'],
    'source-url': ['sourceUrl', 'https://example.invalid/direct-dialog-source'],
    section: ['section', '기타'],
    team: ['teamCode', 'LG'],
  };

  return {
    dialogOpen: deleteInteraction ? false : state.dialogOpen,
    editingMovement: deleteInteraction ? null : state.editingMovement,
    deleteTarget: deleteInteraction ? movement : state.deleteTarget,
    submitting: preset.endsWith('-submitting'),
    formData: data === 'empty' ? emptyFormData : state.formData,
    onDialogClose: trackedCallback('onDialogClose'),
    onDeleteTargetChange: trackedCallback<[AdminOffseasonMovement | null]>(
      'onDeleteTargetChange',
    ),
    onUpdateField: trackedCallback<[string, string]>('onUpdateField', (field, value) => {
      const expected = targetId ? expectedUpdates[targetId] : undefined;
      if ((interaction === 'input' || interaction === 'change')
        && (!expected || field !== expected[0] || value !== expected[1])) {
        throw new Error(
          `Admin offseason dialogs Visual QA callback expected ${expected?.join(':') ?? '<missing>'} but received ${field}:${value}`,
        );
      }
    }),
    onSubmit: trackedCallback('onSubmit'),
    onDelete: trackedCallback('onDelete'),
    visualQaControlledState: true as const,
  };
};

type VisualQaGlobalErrorData =
  | 'empty'
  | 'populated'
  | 'null-optional'
  | 'boundary-minimum'
  | 'boundary-maximum'
  | 'long-korean'
  | 'unbroken-token'
  | 'maximum-supported';

type VisualQaGlobalErrorPreset =
  | 'idle'
  | 'idle-no-event'
  | 'content-loading-fallback'
  | 'closed'
  | 'status-null'
  | 'status-404'
  | 'status-409'
  | 'status-500'
  | 'source-runtime'
  | 'source-unhandled-rejection'
  | 'retry-missing'
  | 'ignored-invalid-author'
  | 'ignored-cancelled-request'
  | 'ignored-home-endpoint'
  | 'cypress-suppressed'
  | 'latest-event-wins';

const visualQaGlobalErrorData = new Set<VisualQaGlobalErrorData>([
  'empty',
  'populated',
  'null-optional',
  'boundary-minimum',
  'boundary-maximum',
  'long-korean',
  'unbroken-token',
  'maximum-supported',
]);

const visualQaGlobalErrorRootPresets = new Set<VisualQaGlobalErrorPreset>([
  'idle',
  'idle-no-event',
  'content-loading-fallback',
  'status-null',
  'status-404',
  'status-409',
  'status-500',
  'source-runtime',
  'source-unhandled-rejection',
  'retry-missing',
  'ignored-invalid-author',
  'ignored-cancelled-request',
  'ignored-home-endpoint',
  'cypress-suppressed',
  'latest-event-wins',
]);

const visualQaGlobalErrorContentPresets = new Set<VisualQaGlobalErrorPreset>([
  'idle',
  'closed',
  'status-null',
  'status-404',
  'status-409',
  'status-500',
  'source-runtime',
  'source-unhandled-rejection',
  'retry-missing',
]);

const visualQaGlobalErrorLongKorean =
  'MOCK 비생산 전역 오류 안내가 가장 좁은 모바일 화면에서도 제목과 본문, 오류 식별자, 피드백 조작 영역을 침범하지 않고 자연스럽게 여러 줄로 표시되는지 확인하는 긴 한국어 문구입니다. '.repeat(5);
const visualQaGlobalErrorUnbroken = `MOCK_GLOBAL_ERROR_${'UNBROKEN'.repeat(70)}`;

const resolveVisualQaGlobalErrorCopy = (data: VisualQaGlobalErrorData) => {
  switch (data) {
    case 'empty':
      return { errorId: '', message: '' };
    case 'populated':
      return { errorId: 'MOCK-ERROR-POPULATED', message: 'MOCK 비생산 요청을 처리하지 못했습니다.' };
    case 'null-optional':
      return { errorId: null, message: 'MOCK 비생산 선택 오류 식별자 없음' };
    case 'boundary-minimum':
      return { errorId: 'M', message: 'M' };
    case 'boundary-maximum':
      return {
        errorId: `MOCK-MAX-${'E'.repeat(180)}`,
        message: `MOCK 경계 최대 ${'오류 설명'.repeat(90)}`,
      };
    case 'long-korean':
      return { errorId: 'MOCK-LONG-KOREAN', message: visualQaGlobalErrorLongKorean };
    case 'unbroken-token':
      return { errorId: visualQaGlobalErrorUnbroken, message: visualQaGlobalErrorUnbroken };
    case 'maximum-supported':
      return {
        errorId: `MOCK-MAXIMUM-${'ID'.repeat(90)}`,
        message: `${visualQaGlobalErrorLongKorean}${visualQaGlobalErrorUnbroken}`,
      };
  }
};

const buildVisualQaGlobalErrorProps = (
  data: VisualQaGlobalErrorData,
  preset: VisualQaGlobalErrorPreset,
  system: string,
) => {
  const copy = resolveVisualQaGlobalErrorCopy(data);
  const closed = preset === 'closed'
    || preset === 'idle-no-event'
    || preset === 'ignored-invalid-author'
    || preset === 'ignored-cancelled-request'
    || preset === 'ignored-home-endpoint'
    || preset === 'cypress-suppressed';
  const statusCode = preset === 'status-null'
    ? null
    : preset === 'status-404'
      ? 404
      : preset === 'status-409'
        ? 409
        : preset === 'status-500'
          ? 500
          : 400;
  const source = preset === 'source-runtime'
    ? 'runtime' as const
    : preset === 'source-unhandled-rejection'
      ? 'unhandled_rejection' as const
      : 'api' as const;
  let retryCount = 0;
  const onRetry = preset === 'retry-missing'
    ? null
    : async () => {
      retryCount += 1;
      if (retryCount !== 1) throw new Error('Global error Visual QA retry callback repeated');
      if (system === 'timeout') await new Promise<void>(() => {});
    };
  let feedbackCount = 0;
  const visualQaSubmitFeedback = async () => {
    feedbackCount += 1;
    if (feedbackCount !== 1) throw new Error('Global error Visual QA feedback submission repeated');
    if (system === 'timeout') return new Promise<boolean>(() => {});
    return system !== 'offline';
  };
  const prefixText = statusCode === 404 || statusCode === 409
    ? '⚠️ 오류 발생'
    : statusCode !== null && statusCode >= 500
      ? '🚨 시스템 오류'
      : '⛔ 요청 실패';

  return {
    closeErrorModal: () => {},
    errorId: copy.errorId,
    isOpen: !closed,
    message: preset === 'latest-event-wins' ? 'MOCK event B latest' : copy.message,
    onRetry,
    prefixText,
    source,
    statusCode,
    visualQaSubmitFeedback,
  };
};

const adapters: Record<string, ComponentStateAdapter> = {
  'seat-map-hover-preview': (context) => {
    if (context.componentId !== 'src/components/SeatMapHoverPreview.tsx#SeatMapHoverPreview') {
      throw new Error('지원하지 않는 SeatMapHoverPreview component');
    }
    if (Object.keys(context.states).some((axis) => axis !== 'data')
      || Object.keys(context.variants).some((variant) => variant !== 'theme')
      || context.interactionTargetId !== undefined) {
      throw new Error('지원하지 않는 SeatMapHoverPreview axis');
    }
    const theme = resolveDeclaredVariant<'light' | 'dark'>(context, 'theme', { dark: 'dark', light: 'light' });
    const data = requireStateValueFromMap(context, 'data', {
      empty: { visible: false, title: '숨김 구역', subtitle: '숨김 보조 정보', description: '숨김 설명', badgeLabel: '숨김 배지' },
      single: { visible: true, title: '중앙 내야 구역' },
      partial: { visible: true, subtitle: '모바일 좌석 안내' },
      'null-optional': { visible: true, description: '관람 위치와 이동 경로를 확인하세요.' },
      'boundary-minimum': { visible: true, badgeLabel: '잔여 좌석' },
      populated: { visible: true, title: '중앙 내야 구역', subtitle: '1루 응원석', description: '가까운 출입구를 이용하세요.', badgeLabel: '잔여 12석' },
      'long-korean': { visible: true, title: '모바일 화면에서 긴 한국어 좌석 구역 제목이 자연스럽게 잘리는지 확인합니다', subtitle: '긴 한국어 보조 안내 문구도 작은 화면의 너비를 넘지 않아야 합니다', description: '긴 한국어 설명 문구가 배지와 함께 표시될 때도 카드의 가로 스크롤을 만들지 않는지 검증합니다.', badgeLabel: '긴 한국어 배지 안내 문구' },
      'unbroken-token': { visible: true, title: 'SEATMAPUNBROKENTITLE0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', subtitle: 'SEATMAPUNBROKENSUBTITLE0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', description: 'SEATMAPUNBROKENDESCRIPTION0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', badgeLabel: 'SEATMAPUNBROKENBADGE0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
      'maximum-supported': { visible: true, title: '보라색 강조 구역', subtitle: '특별 좌석', description: '지정 강조색을 사용합니다.', badgeLabel: '특별', accentColor: '#7c3aed' },
    });
    return {
      props: data,
      captureSelector: '[data-testid="seat-map-hover-preview"]',
      surfaceClassName: 'block min-h-0 w-full overflow-visible bg-transparent p-0 shadow-none',
      theme,
    };
  },
  'global-error.root': (context) => {
    const failClosed = (): never => {
      throw new Error(
        `지원하지 않는 GlobalErrorDialog state: ${JSON.stringify({ states: context.states, variants: context.variants, target: context.interactionTargetId })}`,
      );
    };
    const stateNames = Object.keys(context.states).sort();
    const variantNames = Object.keys(context.variants).sort();
    const data = context.states.data as VisualQaGlobalErrorData | undefined;
    const preset = context.variants.preset as VisualQaGlobalErrorPreset | undefined;
    if (
      stateNames.length !== 1
      || stateNames[0] !== 'data'
      || variantNames.length !== 1
      || variantNames[0] !== 'preset'
      || !data
      || !visualQaGlobalErrorData.has(data)
      || !preset
      || !visualQaGlobalErrorRootPresets.has(preset)
      || context.interactionTargetId !== undefined
      || (preset !== 'idle' && data !== 'populated')
    ) failClosed();

    const contentProps = buildVisualQaGlobalErrorProps(
      data as VisualQaGlobalErrorData,
      preset as VisualQaGlobalErrorPreset,
      'online',
    );
    let closeCount = 0;
    return {
      props: {
        visualQaRenderers: {
          content: (props: ComponentProps<typeof GlobalErrorDialogContentComponent>) => (
            renderVisualQaGlobalErrorLazyChild(createElement(VisualQaGlobalErrorDialogContent, {
              ...props,
              visualQaSubmitFeedback: contentProps.visualQaSubmitFeedback,
            }))
          ),
        },
        visualQaStateOverride: {
          active: true,
          onClose: () => {
            closeCount += 1;
            if (closeCount !== 1) throw new Error('Global error Visual QA close callback repeated');
          },
          phase: preset === 'content-loading-fallback' ? 'fallback' : 'resolved',
          state: {
            errorId: contentProps.errorId,
            isOpen: contentProps.isOpen,
            message: contentProps.message,
            onRetry: contentProps.onRetry,
            source: contentProps.source,
            statusCode: contentProps.statusCode,
          },
        },
      },
      captureSelector: 'body',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
    };
  },
  'global-error.content': (context) => {
    const failClosed = (): never => {
      throw new Error(
        `지원하지 않는 GlobalErrorDialogContent state: ${JSON.stringify({ states: context.states, variants: context.variants, target: context.interactionTargetId })}`,
      );
    };
    const stateNames = Object.keys(context.states).sort();
    const variantNames = Object.keys(context.variants).sort();
    const data = context.states.data as VisualQaGlobalErrorData | undefined;
    const interaction = context.states.interactions;
    const system = context.states.system;
    const preset = context.variants.preset as VisualQaGlobalErrorPreset | undefined;
    const target = context.interactionTargetId;
    const onlineTargets = {
      hover: new Set(['close', 'confirm', 'retry', 'feedback-submit']),
      'focus-visible': new Set(['close', 'textarea', 'retry', 'feedback-submit', 'confirm']),
      pressed: new Set(['close', 'confirm', 'retry', 'feedback-submit']),
      input: new Set(['textarea']),
      'keyboard-navigation': new Set(['confirm-to-close']),
    } as const;
    const defaultValid = interaction === 'default'
      && system === 'online'
      && target === undefined
      && (preset === 'idle' || data === 'populated');
    const onlineInteractionTargets = onlineTargets[interaction as keyof typeof onlineTargets];
    const onlineInteractionValid = data === 'maximum-supported'
      && preset === 'idle'
      && system === 'online'
      && onlineInteractionTargets?.has(target ?? '') === true;
    const selectedValid = data === 'maximum-supported'
      && preset === 'idle'
      && interaction === 'selected'
      && ((system === 'online' && target === 'feedback-success')
        || (system === 'offline' && target === 'feedback-failure'));
    const submittingValid = data === 'maximum-supported'
      && preset === 'idle'
      && interaction === 'submitting'
      && system === 'timeout'
      && (target === 'retry-timeout' || target === 'feedback-timeout');
    if (
      stateNames.join(',') !== 'data,interactions,system'
      || variantNames.length !== 1
      || variantNames[0] !== 'preset'
      || !data
      || !visualQaGlobalErrorData.has(data)
      || !preset
      || !visualQaGlobalErrorContentPresets.has(preset)
      || (!defaultValid && !onlineInteractionValid && !selectedValid && !submittingValid)
    ) failClosed();

    const props = buildVisualQaGlobalErrorProps(
      data as VisualQaGlobalErrorData,
      preset as VisualQaGlobalErrorPreset,
      system ?? 'online',
    );
    return {
      props,
      captureSelector: 'body',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
    };
  },
  'admin.offseason-movement-dialogs': (context) => {
    const supportedData = new Set<VisualQaAdminOffseasonData>([
      'empty', 'populated', 'null-optional', 'boundary-minimum',
      'boundary-maximum', 'long-korean', 'unbroken-token', 'maximum-supported',
    ]);
    const supportedPresets = new Set<VisualQaAdminOffseasonDialogsPreset>([
      'create-dialog', 'edit-dialog', 'delete-dialog',
      'create-submitting', 'edit-submitting', 'delete-submitting',
    ]);
    const interactionTargets = {
      hover: new Set(['create-close', 'create-cancel', 'create-submit', 'delete-close', 'delete-cancel', 'delete-confirm']),
      'focus-visible': new Set([
        'movement-date', 'section', 'team', 'player-name', 'summary', 'details',
        'contract-term', 'source-url', 'create-submit', 'delete-confirm',
      ]),
      pressed: new Set(['create-close', 'create-cancel', 'create-submit', 'delete-close', 'delete-cancel', 'delete-confirm']),
      input: new Set(['player-name', 'summary', 'source-url']),
      change: new Set(['section', 'team']),
      'keyboard-navigation': new Set(['create-focus-loop']),
    } as const;
    const data = context.states.data as VisualQaAdminOffseasonData | undefined;
    const preset = context.variants.preset as VisualQaAdminOffseasonDialogsPreset | undefined;
    const interaction = context.states.interactions;
    const targetId = context.interactionTargetId;
    const failClosed = (): never => {
      throw new Error(
        `지원하지 않는 Admin offseason dialogs state: ${data ?? 'none'}:${context.states.system ?? 'none'}:${preset ?? 'none'}:${interaction ?? 'none'}:${targetId ?? 'none'}`,
      );
    };
    if (
      Object.keys(context.states).length !== 4
      || Object.keys(context.variants).length !== 2
      || context.states.permissions !== 'admin'
      || context.states.system !== 'idle'
      || context.variants.theme !== 'dark'
      || !data
      || !supportedData.has(data)
      || !preset
      || !supportedPresets.has(preset)
      || !interaction
    ) return failClosed();
    if (interaction === 'default') {
      if (targetId !== undefined
        || (preset === 'create-dialog' ? true : data === 'populated') === false) {
        return failClosed();
      }
    } else {
      const targets = interactionTargets[interaction as keyof typeof interactionTargets];
      if (data !== 'maximum-supported'
        || preset !== 'create-dialog'
        || !targets
        || !targetId
        || !targets.has(targetId)) {
        return failClosed();
      }
    }
    return {
      props: buildVisualQaAdminOffseasonDialogsProps(data, preset, interaction, targetId),
      captureSelector: 'body',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-0 text-slate-100 shadow-none',
      theme: 'dark',
    };
  },
  'admin.offseason-movement-content': (context) => {
    const supportedData = new Set<VisualQaAdminOffseasonData>([
      'empty', 'populated', 'null-optional', 'boundary-minimum',
      'boundary-maximum', 'long-korean', 'unbroken-token', 'maximum-supported',
    ]);
    const supportedPresets = new Set<Exclude<VisualQaAdminOffseasonSystem, 'content-fallback'>>([
      'idle', 'list-loading', 'load-error', 'success-message', 'csv-importing',
      'csv-success', 'csv-many-errors', 'quality-filter-empty', 'create-dialog',
      'edit-dialog', 'delete-dialog', 'create-submitting', 'edit-submitting',
      'delete-submitting', 'results-fallback', 'dialogs-fallback',
    ]);
    const interactionTargets = {
      hover: new Set(['row-edit', 'row-delete']),
      'focus-visible': new Set(['search', 'create', 'dialog-summary']),
      pressed: new Set(['apply', 'reset', 'delete-confirm']),
      input: new Set(['search', 'dialog-summary']),
      change: new Set(['team-filter', 'dialog-section']),
      'keyboard-navigation': new Set(['dialog-focus-loop']),
    } as const;
    const data = context.states.data as VisualQaAdminOffseasonData | undefined;
    const preset = context.variants.preset as Exclude<
      VisualQaAdminOffseasonSystem,
      'content-fallback'
    > | undefined;
    const interaction = context.states.interactions;
    const targetId = context.interactionTargetId;
    const failClosed = (): never => {
      throw new Error(
        `지원하지 않는 Admin offseason content state: ${data ?? 'none'}:${context.states.system ?? 'none'}:${preset ?? 'none'}:${interaction ?? 'none'}:${targetId ?? 'none'}`,
      );
    };

    if (
      Object.keys(context.states).length !== 4
      || Object.keys(context.variants).length !== 2
      || !Object.prototype.hasOwnProperty.call(context.states, 'data')
      || !Object.prototype.hasOwnProperty.call(context.states, 'permissions')
      || !Object.prototype.hasOwnProperty.call(context.states, 'interactions')
      || !Object.prototype.hasOwnProperty.call(context.states, 'system')
      || !Object.prototype.hasOwnProperty.call(context.variants, 'preset')
      || !Object.prototype.hasOwnProperty.call(context.variants, 'theme')
      || context.states.permissions !== 'admin'
      || context.states.system !== 'idle'
      || context.variants.theme !== 'dark'
      || !data
      || !supportedData.has(data)
      || !preset
      || !supportedPresets.has(preset)
      || !interaction
    ) return failClosed();

    if (interaction === 'default') {
      if (targetId !== undefined || (preset !== 'idle' && data !== 'populated')) {
        return failClosed();
      }
    } else {
      const targets = interactionTargets[interaction as keyof typeof interactionTargets];
      if (
        data !== 'maximum-supported'
        || preset !== 'idle'
        || !targets
        || !targetId
        || !targets.has(targetId)
      ) return failClosed();
    }

    const renderResults = (
      props: ComponentProps<typeof OffseasonMovementAdminResultsRuntimeComponent>,
    ) => renderVisualQaOffseasonAdminLazyChild(
      createElement(VisualQaOffseasonMovementAdminResultsRuntime, props),
      '스토브리그 결과를 불러오는 중...',
    );
    const renderDialogs = (
      props: ComponentProps<typeof OffseasonMovementAdminDialogsComponent>,
    ) => renderVisualQaOffseasonAdminLazyChild(
      createElement(VisualQaOffseasonMovementAdminDialogs, props),
      '스토브리그 입력 창을 불러오는 중...',
    );
    const portalPresets = new Set([
      'create-dialog', 'edit-dialog', 'delete-dialog',
      'create-submitting', 'edit-submitting', 'delete-submitting', 'dialogs-fallback',
    ]);
    const portalTargets = new Set([
      'dialog-summary', 'delete-confirm', 'dialog-section', 'dialog-focus-loop',
    ]);

    return {
      props: {
        ...buildVisualQaAdminOffseasonContentProps(data, preset, interaction, targetId),
        visualQaRenderers: { dialogs: renderDialogs, results: renderResults },
      },
      captureSelector: portalPresets.has(preset) || portalTargets.has(targetId ?? '')
        ? 'body'
        : '[data-testid="admin-offseason-content"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none',
      theme: 'dark',
    };
  },
  'admin.offseason-movement-results': (context) => {
    const supportedData = new Set<VisualQaAdminOffseasonData>([
      'empty', 'populated', 'null-optional', 'boundary-minimum',
      'boundary-maximum', 'long-korean', 'unbroken-token', 'maximum-supported',
    ]);
    const supportedPresets = new Set<VisualQaAdminOffseasonResultsPreset>([
      'idle', 'loading', 'filtered-empty', 'csv-success', 'csv-single-error',
      'csv-many-errors', 'csv-boundary-maximum', 'csv-pressure', 'csv-success-loading',
    ]);
    const interactionTargets = {
      hover: new Set(['source-link', 'edit', 'delete']),
      'focus-visible': new Set(['source-link', 'edit', 'delete']),
      pressed: new Set(['source-link', 'edit', 'delete']),
    } as const;
    const data = context.states.data as VisualQaAdminOffseasonData | undefined;
    const preset = context.variants.preset as VisualQaAdminOffseasonResultsPreset | undefined;
    const interaction = context.states.interactions;
    const targetId = context.interactionTargetId;
    const failClosed = (): never => {
      throw new Error(
        `지원하지 않는 Admin offseason results state: ${data ?? 'none'}:${context.states.system ?? 'none'}:${preset ?? 'none'}:${interaction ?? 'none'}:${targetId ?? 'none'}`,
      );
    };
    if (
      Object.keys(context.states).length !== 4
      || Object.keys(context.variants).length !== 2
      || context.states.permissions !== 'admin'
      || context.states.system !== 'idle'
      || context.variants.theme !== 'dark'
      || !data
      || !supportedData.has(data)
      || !preset
      || !supportedPresets.has(preset)
      || !interaction
    ) return failClosed();
    if (interaction === 'default') {
      if (targetId !== undefined || (preset === 'idle' ? true : data === 'populated') === false) {
        return failClosed();
      }
    } else {
      const targets = interactionTargets[interaction as keyof typeof interactionTargets];
      if (data !== 'maximum-supported'
        || preset !== 'idle'
        || !targets
        || !targetId
        || !targets.has(targetId)) {
        return failClosed();
      }
    }
    return {
      props: buildVisualQaAdminOffseasonResultsProps(data, preset),
      captureSelector: '[data-testid="admin-offseason-results-runtime"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none',
      theme: 'dark',
    };
  },
  'admin.offseason-movement-panel': (context) => {
    const supportedData = new Set<VisualQaAdminOffseasonData>([
      'empty', 'populated', 'null-optional', 'boundary-minimum',
      'boundary-maximum', 'long-korean', 'unbroken-token', 'maximum-supported',
    ]);
    const supportedSystems = new Set<VisualQaAdminOffseasonSystem>([
      'idle', 'list-loading', 'load-error', 'success-message', 'csv-importing',
      'csv-success', 'csv-many-errors', 'quality-filter-empty', 'create-dialog',
      'edit-dialog', 'delete-dialog', 'create-submitting', 'edit-submitting',
      'delete-submitting', 'content-fallback', 'results-fallback', 'dialogs-fallback',
    ]);
    const interactionTargets = {
      hover: new Set(['refresh', 'quality-filter', 'row-edit', 'row-delete']),
      'focus-visible': new Set([
        'search', 'section', 'team', 'from-date', 'to-date', 'create', 'dialog-field',
      ]),
      pressed: new Set(['apply', 'reset', 'create', 'delete-confirm']),
      input: new Set(['search', 'dialog-summary']),
      change: new Set(['team-filter', 'dialog-section']),
      'keyboard-navigation': new Set(['dialog-focus-loop']),
    } as const;
    const data = context.states.data as VisualQaAdminOffseasonData | undefined;
    const system = context.states.system;
    const preset = context.variants.preset as VisualQaAdminOffseasonSystem | undefined;
    const interaction = context.states.interactions;
    const targetId = context.interactionTargetId;
    const stateNames = Object.keys(context.states);
    const variantNames = Object.keys(context.variants);
    const failClosed = (): never => {
      throw new Error(
        `지원하지 않는 Admin offseason movement state: ${data ?? 'none'}:${system ?? 'none'}:${preset ?? 'none'}:${interaction ?? 'none'}:${targetId ?? 'none'}`,
      );
    };

    if (
      stateNames.length !== 4
      || !stateNames.includes('data')
      || !stateNames.includes('permissions')
      || !stateNames.includes('interactions')
      || !stateNames.includes('system')
      || variantNames.length !== 2
      || !variantNames.includes('preset')
      || !variantNames.includes('theme')
      || context.variants.theme !== 'dark'
      || context.states.permissions !== 'admin'
      || !data
      || !supportedData.has(data)
      || system !== 'idle'
      || !preset
      || !supportedSystems.has(preset)
      || !interaction
    ) return failClosed();

    if (interaction === 'default') {
      if (
        targetId !== undefined
        || (preset === 'idle' ? true : data === 'populated') === false
      ) return failClosed();
    } else {
      const targets = interactionTargets[interaction as keyof typeof interactionTargets];
      if (
        data !== 'maximum-supported'
        || preset !== 'idle'
        || !targets
        || !targetId
        || !targets.has(targetId)
      ) return failClosed();
    }

    const visualQaStateOverride = buildVisualQaAdminOffseasonState(data, preset);
    const renderResults = (
      props: ComponentProps<typeof OffseasonMovementAdminResultsRuntimeComponent>,
    ) => renderVisualQaOffseasonAdminLazyChild(
      createElement(VisualQaOffseasonMovementAdminResultsRuntime, props),
      '스토브리그 결과를 불러오는 중...',
    );
    const renderDialogs = (
      props: ComponentProps<typeof OffseasonMovementAdminDialogsComponent>,
    ) => renderVisualQaOffseasonAdminLazyChild(
      createElement(VisualQaOffseasonMovementAdminDialogs, props),
      '스토브리그 입력 창을 불러오는 중...',
    );
    const portalSystems = new Set<VisualQaAdminOffseasonSystem>([
      'create-dialog', 'edit-dialog', 'delete-dialog',
      'create-submitting', 'edit-submitting', 'delete-submitting', 'dialogs-fallback',
    ]);
    const portalTargets = new Set([
      'dialog-field', 'delete-confirm', 'dialog-summary', 'dialog-section', 'dialog-focus-loop',
    ]);

    return {
      props: {
        active: true,
        visualQaStateOverride,
        visualQaRenderers: {
          content: (
            props: ComponentProps<typeof OffseasonMovementAdminPanelContentComponent>,
          ) => renderVisualQaOffseasonAdminLazyChild(
            createElement(VisualQaOffseasonMovementAdminPanelContent, {
              ...props,
              visualQaRenderers: {
                dialogs: renderDialogs,
                results: renderResults,
              },
            }),
            '스토브리그 관리 패널 로딩 중...',
          ),
        },
      },
      captureSelector: portalSystems.has(preset) || portalTargets.has(targetId ?? '')
        ? 'body'
        : '[data-testid="admin-offseason-movement-panel"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none',
      theme: 'dark',
    };
  },
  'achievement.celebration-overlay': (context) => {
    const achievement = requireStateValueFromMap(context, 'data', achievementPresets);
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    if (
      interaction !== 'default'
      && context.interactionTargetId !== undefined
      && context.interactionTargetId !== 'confirm'
    ) {
      throw new Error(`지원하지 않는 Visual QA interaction target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: { achievement, onClose: () => {} },
      captureSelector: '[data-testid="achievement-celebration-overlay"]',
      surfaceClassName: 'block min-h-11 w-full max-w-[320px] overflow-visible bg-background p-0 shadow-none',
      theme,
    };
  },
  'admin.page-shell': (context) => {
    const copy = requireStateValueFromMap(context, 'data', {
      single: '관리자 런타임 준비 완료',
      'long-korean': '관리자 화면의 긴 운영 안내가 가장 좁은 모바일 화면에서도 카드 경계와 제목 영역을 침범하지 않고 자연스럽게 여러 줄로 표시됩니다.',
      'unbroken-token': `ADMIN-RUNTIME-${'UNBROKEN'.repeat(24)}`,
    });
    requireStateValueFromMap(context, 'permissions', {
      admin: 'admin',
      'super-admin': 'super-admin',
    });
    requireStateValue(context, 'interactions', 'default');
    const phase = resolveDeclaredVariant(context, 'phase', {
      fallback: 'fallback',
      resolved: 'resolved',
    });
    const runtimeContentOverride = phase === 'fallback'
      ? createElement(
        'div',
        {
          className: 'min-w-0 break-words rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-12 text-center text-caption text-slate-300 [overflow-wrap:anywhere]',
          'data-testid': 'admin-page-runtime-fallback',
        },
        '관리자 패널을 준비하고 있습니다.',
      )
      : createElement(
        'div',
        {
          className: 'min-w-0 break-words rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-slate-200 [overflow-wrap:anywhere]',
          'data-testid': 'admin-page-runtime-probe',
        },
        copy,
      );
    return {
      props: { runtimeContentOverride },
      captureSelector: '[data-testid="admin-page-shell"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-slate-950 p-0 shadow-none',
      theme: 'dark',
    };
  },
  'admin.animated-number': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      zero: 'zero',
      single: 'single',
      negative: 'negative',
      decimal: 'decimal',
      'maximum-supported': 'maximum-supported',
      'non-finite': 'non-finite',
    });
    const frame = resolveDeclaredVariant<'initial' | 'midpoint' | 'settled'>(context, 'frame', {
      initial: 'initial',
      midpoint: 'midpoint',
      settled: 'settled',
    });
    const theme = resolveDeclaredVariant<'dark'>(context, 'theme', { dark: 'dark' });
    const valueByData = {
      zero: 0,
      single: 1_000,
      negative: -1_000,
      decimal: 1_234.75,
      'maximum-supported': Number.MAX_SAFE_INTEGER,
      'non-finite': Number.POSITIVE_INFINITY,
    } as const;
    const value = valueByData[data as keyof typeof valueByData];
    const normalizedValue = Number.isFinite(value) ? Math.floor(value) : 0;
    const visualQaDisplayValueOverride = frame === 'initial'
      ? 0
      : frame === 'midpoint'
        ? Math.floor(normalizedValue * 0.9375)
        : normalizedValue;

    return {
      props: {
        value,
        duration: 1_000,
        testId: 'visual-qa-admin-animated-number',
        visualQaDisplayValueOverride,
      },
      captureSelector: '[data-testid="visual-qa-admin-animated-number"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-3xl font-black text-amber-300 shadow-none',
      theme,
    };
  },
  'admin.badge': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      single: 'single',
      'long-korean': 'long-korean',
      'unbroken-token': 'unbroken-token',
    });
    const className = resolveDeclaredVariant<string>(context, 'tone', {
      default: 'border-slate-600 bg-slate-800 text-slate-200',
      'decision-go': 'bg-emerald-500/20 text-emerald-300 border-0',
      'decision-no-go': 'bg-red-500/20 text-red-300 border-0',
      'decision-pending': 'bg-amber-500/20 text-amber-300 border-0',
      'confidence-low': 'bg-slate-700 text-slate-300 border-0',
      'confidence-medium': 'bg-sky-500/20 text-sky-300 border-0',
      'confidence-high': 'bg-amber-500/20 text-amber-300 border-0',
      'eval-pass': 'bg-emerald-500/20 text-emerald-300 border-0',
      'eval-fail': 'bg-red-500/20 text-red-300 border-0',
    });
    const theme = resolveDeclaredVariant<'dark'>(context, 'theme', { dark: 'dark' });
    const children = data === 'empty'
      ? null
      : data === 'long-korean'
        ? '가장 좁은 관리자 모바일 패널에서도 상태 배지가 주변 컨트롤을 밀어내지 않고 여러 줄로 안전하게 표시되어야 합니다.'.repeat(3)
        : data === 'unbroken-token'
          ? `ADMIN-${'A'.repeat(260)}`
          : 'GO';

    return {
      props: {
        children,
        className,
        testId: 'visual-qa-admin-badge',
      },
      captureSelector: '[data-testid="visual-qa-admin-badge"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none',
      theme,
    };
  },
  'admin.client-error-detail': (context) => {
    const data = requireStateValueFromMap<VisualQaClientErrorDataState>(context, 'data', {
      empty: 'empty',
      populated: 'populated',
      'null-optional': 'null-optional',
      'boundary-minimum': 'boundary-minimum',
      'boundary-maximum': 'boundary-maximum',
      'long-korean': 'long-korean',
      'unbroken-token': 'unbroken-token',
      'maximum-supported': 'maximum-supported',
    });
    requireStateValue(context, 'permissions', 'admin');
    const interaction = requireStateValueFromMap<
      'default' | 'focus-visible' | 'hover' | 'pressed'
    >(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const system = requireStateValueFromMap<'idle' | 'loading' | 'missing'>(
      context,
      'system',
      { idle: 'idle', loading: 'loading', missing: 'missing' },
    );
    const bucket = resolveDeclaredVariant<AdminClientErrorEventSummary['bucket']>(
      context,
      'bucket',
      { api: 'api', feedback: 'feedback', runtime: 'runtime' },
    );
    const source = resolveDeclaredVariant<AdminClientErrorEventSummary['source']>(
      context,
      'source',
      {
        api: 'api',
        runtime: 'runtime',
        unhandled_rejection: 'unhandled_rejection',
        unknown: 'unknown',
      },
    );
    const theme = resolveDeclaredVariant<'dark'>(context, 'theme', { dark: 'dark' });
    resolveDeclaredVariant<'open'>(context, 'visibility', { open: 'open' });

    const variantNames = Object.keys(context.variants);
    const canonicalBadgePair = bucket === 'api' && source === 'api';
    const canonicalTerminalState = data === 'empty'
      && interaction === 'default'
      && canonicalBadgePair
      && context.interactionTargetId === undefined;
    const canonicalInteraction = system === 'idle'
      && data === 'maximum-supported'
      && canonicalBadgePair
      && interaction !== 'default'
      && (context.interactionTargetId === 'close' || context.interactionTargetId === 'recent');
    const defaultIdle = system === 'idle'
      && interaction === 'default'
      && context.interactionTargetId === undefined;

    if (
      variantNames.length !== 4
      || !variantNames.includes('bucket')
      || !variantNames.includes('source')
      || !variantNames.includes('theme')
      || !variantNames.includes('visibility')
      || (system !== 'idle' && !canonicalTerminalState)
      || (interaction !== 'default' && !canonicalInteraction)
      || (system === 'idle' && interaction === 'default' && !defaultIdle)
    ) {
      throw new Error(
        `지원하지 않는 Admin client-error detail state: ${data}:${system}:${interaction}:${bucket}:${source}:${context.interactionTargetId ?? 'none'}`,
      );
    }

    return {
      props: {
        open: true,
        detailLoading: system === 'loading',
        selectedEvent: system === 'idle'
          ? resolveVisualQaClientErrorDetail(data, bucket, source)
          : null,
        onClose: () => undefined,
        onOpenDetail: () => undefined,
      },
      captureSelector: '[data-testid="admin-client-error-detail"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-0 text-slate-100 shadow-none',
      theme,
    };
  },
  'admin.client-error-trend-chart': (context) => {
    const data = context.states.data;
    const system = context.states.system;
    const stateNames = Object.keys(context.states);
    const variantNames = Object.keys(context.variants);
    const supportedData = new Set<VisualQaClientErrorTrendDataState>([
      'empty',
      'single',
      'boundary-minimum',
      'boundary-maximum',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
      'zero',
    ]);
    const failClosed = (): never => {
      throw new Error(
        `지원하지 않는 Admin client-error trend chart state: ${data ?? 'none'}:${system ?? 'none'}`,
      );
    };

    if (
      stateNames.length !== 2
      || !stateNames.includes('data')
      || !stateNames.includes('system')
      || variantNames.length !== 1
      || context.variants.theme !== 'dark'
      || typeof data !== 'string'
      || !supportedData.has(data as VisualQaClientErrorTrendDataState)
      || (system !== 'idle' && system !== 'loading')
      || (system === 'loading' && data !== 'empty')
      || context.interactionTargetId !== undefined
    ) {
      return failClosed();
    }

    return {
      props: {
        chartData: resolveVisualQaClientErrorTrendData(
          data as VisualQaClientErrorTrendDataState,
        ),
        loading: system === 'loading',
      },
      captureSelector: '[data-testid="admin-client-error-trend-chart"]',
      surfaceClassName: 'block min-h-[844px] w-full min-w-0 max-w-full overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none',
      theme: 'dark',
    };
  },
  'admin.client-error-insights': (context) => {
    const data = requireStateValueFromMap<VisualQaClientErrorDataState>(context, 'data', {
      empty: 'empty',
      populated: 'populated',
      'null-optional': 'null-optional',
      'boundary-minimum': 'boundary-minimum',
      'boundary-maximum': 'boundary-maximum',
      'long-korean': 'long-korean',
      'unbroken-token': 'unbroken-token',
      'maximum-supported': 'maximum-supported',
    });
    requireStateValue(context, 'permissions', 'admin');
    const inventory = resolveDeclaredVariant<VisualQaClientErrorInsightsInventory>(
      context,
      'inventory',
      {
        none: 'none',
        'feedback-only': 'feedback-only',
        'alerts-only': 'alerts-only',
        both: 'both',
      },
    );
    const bucket = resolveDeclaredVariant<AdminClientErrorAlertNotification['bucket']>(
      context,
      'bucket',
      { api: 'api', feedback: 'feedback', runtime: 'runtime' },
    );
    const channel = resolveDeclaredVariant<AdminClientErrorAlertNotification['channel']>(
      context,
      'channel',
      { slack: 'slack', telegram: 'telegram' },
    );
    const deliveryStatus = resolveDeclaredVariant<AdminClientErrorAlertNotification['deliveryStatus']>(
      context,
      'delivery',
      { failed: 'FAILED', sent: 'SENT' },
    );
    const theme = resolveDeclaredVariant<'dark'>(context, 'theme', { dark: 'dark' });
    const stateNames = Object.keys(context.states);
    const variantNames = Object.keys(context.variants);
    const canonicalAlertVariants = bucket === 'api'
      && channel === 'telegram'
      && deliveryStatus === 'SENT';
    const supported = data === 'empty'
      ? inventory === 'none' && canonicalAlertVariants
      : data === 'populated'
        ? (inventory === 'feedback-only' && canonicalAlertVariants)
          || inventory === 'alerts-only'
          || inventory === 'both'
        : inventory === 'both';

    if (
      stateNames.length !== 2
      || !stateNames.includes('data')
      || !stateNames.includes('permissions')
      || variantNames.length !== 5
      || !variantNames.includes('bucket')
      || !variantNames.includes('channel')
      || !variantNames.includes('delivery')
      || !variantNames.includes('inventory')
      || !variantNames.includes('theme')
      || context.interactionTargetId !== undefined
      || !supported
    ) {
      throw new Error(
        `지원하지 않는 Admin client-error insights state: ${data}:${inventory}:${bucket}:${channel}:${deliveryStatus}`,
      );
    }

    return {
      props: {
        dashboard: resolveVisualQaClientErrorInsightsDashboard(
          data,
          inventory,
          bucket,
          channel,
          deliveryStatus,
        ),
      },
      captureSelector: '[data-testid="admin-client-error-insights"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none',
      theme,
    };
  },
  'admin.client-error-panel': (context) => {
    const presetName = context.variants.preset;
    const data = context.states.data;
    const system = context.states.system;
    const interaction = context.states.interactions;
    const interactionTargetId = context.interactionTargetId;
    const failClosed = (): never => {
      throw new Error(
        `지원하지 않는 Admin client-error panel state: ${presetName ?? 'none'}:${data ?? 'none'}:${system ?? 'none'}:${interaction ?? 'none'}:${interactionTargetId ?? 'none'}`,
      );
    };
    const stateNames = Object.keys(context.states);
    const variantNames = Object.keys(context.variants);

    if (
      stateNames.length !== 4
      || !stateNames.includes('data')
      || !stateNames.includes('interactions')
      || !stateNames.includes('permissions')
      || !stateNames.includes('system')
      || variantNames.length !== 2
      || !variantNames.includes('preset')
      || !variantNames.includes('theme')
      || context.states.permissions !== 'admin'
      || context.variants.theme !== 'dark'
      || !presetName
      || !Object.prototype.hasOwnProperty.call(visualQaClientErrorPanelPresets, presetName)
    ) {
      return failClosed();
    }

    const canonicalPresetName = presetName as VisualQaClientErrorPanelPresetName;
    const preset = visualQaClientErrorPanelPresets[canonicalPresetName];
    if (data !== preset.data || system !== preset.system || !interaction) {
      return failClosed();
    }

    if (interaction === 'default') {
      if (interactionTargetId !== undefined) return failClosed();
    } else {
      const allowedTargets = visualQaClientErrorPanelInteractionTargets[
        interaction as keyof typeof visualQaClientErrorPanelInteractionTargets
      ];
      if (
        canonicalPresetName !== 'both-maximum-supported'
        || data !== 'maximum-supported'
        || system !== 'idle'
        || !allowedTargets
        || !interactionTargetId
        || !allowedTargets.has(interactionTargetId)
      ) {
        return failClosed();
      }
    }

    const visualQaStateOverride = resolveVisualQaClientErrorPanelState(
      canonicalPresetName,
      preset,
    );

    return {
      props: {
        active: preset.system !== 'inactive',
        visualQaStateOverride,
        visualQaRenderers: {
          chart: (props: ComponentProps<typeof VisualQaClientErrorTrendChart>) => (
            renderVisualQaClientErrorLazyChild(
              createElement(VisualQaClientErrorTrendChart, props),
              '클라이언트 에러 차트를 불러오는 중...',
            )
          ),
          detail: (props: ComponentProps<typeof VisualQaClientErrorAdminDetailRuntime>) => (
            renderVisualQaClientErrorLazyChild(
              createElement(VisualQaClientErrorAdminDetailRuntime, props),
              '클라이언트 에러 상세를 불러오는 중...',
            )
          ),
          insights: (props: ComponentProps<typeof VisualQaClientErrorAdminInsightsRuntime>) => (
            renderVisualQaClientErrorLazyChild(
              createElement(VisualQaClientErrorAdminInsightsRuntime, props),
              '클라이언트 에러 인사이트를 불러오는 중...',
            )
          ),
        },
      },
      captureSelector: preset.detailPhase === 'closed'
        ? '[data-testid="admin-client-error-panel"]'
        : '[role="dialog"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none',
      theme: 'dark',
    };
  },
  'admin.ai-operations-panel': (context) => {
    const copy = requireStateValueFromMap(context, 'data', {
      single: '관리자 AI 운영 패널',
      'long-korean': '가장 좁은 관리자 모바일 화면에서도 자동 브리프와 AI 릴리즈 결정 패널의 로딩 경계가 서로를 밀어내지 않고, 긴 운영 안내 문구도 각 패널 경계 안에서 자연스럽게 줄바꿈되어야 합니다.',
      'unbroken-token': `ADMIN-AI-OPERATIONS-${'UNBROKEN'.repeat(32)}`,
    });
    requireStateValue(context, 'interactions', 'default');
    const autoBriefPhase = resolveDeclaredVariant<'fallback' | 'resolved'>(
      context,
      'auto-brief-phase',
      { fallback: 'fallback', resolved: 'resolved' },
    );
    const releaseDecisionPhase = resolveDeclaredVariant<'fallback' | 'resolved'>(
      context,
      'release-phase',
      { fallback: 'fallback', resolved: 'resolved' },
    );
    const theme = resolveDeclaredVariant<'dark'>(context, 'theme', { dark: 'dark' });

    if (
      autoBriefPhase === 'fallback'
      && releaseDecisionPhase === 'fallback'
      && context.states.data !== 'single'
    ) {
      throw new Error(
        `지원하지 않는 Admin AI operations state: data=${context.states.data ?? '<missing>'}`,
      );
    }

    return {
      props: {
        visualQaStateOverride: {
          autoBriefPhase,
          releaseDecisionPhase,
          copy,
        },
      },
      captureSelector: '[data-testid="admin-ai-operations-panel"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none',
      theme,
    };
  },
  'admin.ai-operations-runtime': (context) => {
    const panelPhase = resolveDeclaredVariant<'fallback' | 'resolved'>(
      context,
      'panel-phase',
      { fallback: 'fallback', resolved: 'resolved' },
    );
    const panelAdapter = adapters['admin.coach-auto-brief-ops-panel'](context);
    const panelProps = panelAdapter.props as unknown as ComponentProps<
      typeof AdminCoachAutoBriefOpsPanel
    >;
    const fallbackCanonical = context.states.data === 'empty'
      && context.states.interactions === 'default'
      && context.states.system === 'idle'
      && context.variants.copy === 'idle'
      && context.variants.window === 'today';

    if (panelPhase === 'fallback' && !fallbackCanonical) {
      throw new Error(
        `지원하지 않는 Admin AI operations runtime state: ${context.states.data ?? '<missing>'}:${context.states.system ?? '<missing>'}:${context.variants.window ?? '<missing>'}:${context.variants.copy ?? '<missing>'}:${context.states.interactions ?? '<missing>'}`,
      );
    }

    return {
      props: {
        visualQaStateOverride: {
          panelPhase,
          health: panelProps.health,
          loading: panelProps.loading,
          error: panelProps.error,
          selectedWindow: panelProps.selectedWindow,
          startDate: panelProps.startDate,
          endDate: panelProps.endDate,
          commandCopyState: panelProps.commandCopyState,
        },
        visualQaPanelRenderer: (
          props: ComponentProps<typeof AdminCoachAutoBriefOpsPanel>,
        ) => createElement(AdminCoachAutoBriefOpsPanel, props),
      },
      captureSelector: '[data-testid="admin-ai-operations-runtime"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none',
      theme: panelAdapter.theme,
    };
  },
  'admin.mates-panel': (context) => {
    const data = context.states.data;
    const interaction = context.states.interactions;
    const targetId = context.interactionTargetId;
    const supportedData = new Set<VisualQaAdminCommunityLeafData>([
      'empty',
      'single',
      'populated',
      'boundary-minimum',
      'boundary-maximum',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
    ]);
    const dialogTargets = new Set(['delete', 'dialog-cancel', 'dialog-confirm']);
    const interactionValid = interaction === 'default'
      ? targetId === undefined
      : data === 'maximum-supported'
        && (interaction === 'hover' || interaction === 'focus-visible' || interaction === 'pressed'
          ? dialogTargets.has(targetId ?? '')
          : interaction === 'open' && targetId === 'delete');
    if (
      Object.keys(context.states).length !== 2
      || !context.states.data
      || !context.states.interactions
      || Object.keys(context.variants).length !== 1
      || context.variants.theme !== 'dark'
      || !supportedData.has(data as VisualQaAdminCommunityLeafData)
      || !interactionValid
    ) {
      throw new Error(
        `지원하지 않는 Admin mates panel state: ${data ?? 'none'}:${interaction ?? 'none'}:${targetId ?? 'none'}`,
      );
    }
    const typedData = data as VisualQaAdminCommunityLeafData;
    const count = visualQaAdminLeafCount(typedData, 6);
    return {
      props: {
        mates: Array.from({ length: count }, (_, index) => (
          makeVisualQaAdminLeafMate(index + 1, typedData)
        )),
        handleDeleteMate: () => undefined,
      },
      captureSelector: interaction === 'default'
        ? '[data-testid="admin-mates-panel"]'
        : 'body',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none',
      theme: 'dark',
    };
  },
  'admin.posts-panel': (context) => {
    const data = context.states.data;
    const interaction = context.states.interactions;
    const targetId = context.interactionTargetId;
    const supportedData = new Set<VisualQaAdminCommunityLeafData>([
      'empty',
      'single',
      'null-optional',
      'boundary-minimum',
      'boundary-maximum',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
    ]);
    const dialogTargets = new Set(['delete', 'dialog-cancel', 'dialog-confirm']);
    const interactionValid = interaction === 'default'
      ? targetId === undefined
      : data === 'maximum-supported'
        && (interaction === 'hover' || interaction === 'focus-visible' || interaction === 'pressed'
          ? dialogTargets.has(targetId ?? '')
          : interaction === 'open' && targetId === 'delete');
    if (
      Object.keys(context.states).length !== 2
      || !context.states.data
      || !context.states.interactions
      || Object.keys(context.variants).length !== 1
      || context.variants.theme !== 'dark'
      || !supportedData.has(data as VisualQaAdminCommunityLeafData)
      || !interactionValid
    ) {
      throw new Error(
        `지원하지 않는 Admin posts panel state: ${data ?? 'none'}:${interaction ?? 'none'}:${targetId ?? 'none'}`,
      );
    }
    const typedData = data as VisualQaAdminCommunityLeafData;
    const count = visualQaAdminLeafCount(typedData);
    return {
      props: {
        posts: Array.from({ length: count }, (_, index) => (
          makeVisualQaAdminLeafPost(index + 1, typedData)
        )),
        handleDeletePost: () => undefined,
      },
      captureSelector: interaction === 'default'
        ? '[data-testid="admin-posts-panel"]'
        : 'body',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none',
      theme: 'dark',
    };
  },
  'admin.users-panel': (context) => {
    const data = context.states.data;
    const permission = context.states.permissions;
    const interaction = context.states.interactions;
    const system = context.states.system;
    const targetId = context.interactionTargetId;
    const supportedData = new Set<VisualQaAdminCommunityLeafData>([
      'empty',
      'single',
      'null-optional',
      'boundary-minimum',
      'boundary-maximum',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
    ]);
    const dialogTargets = new Set(['delete', 'dialog-cancel', 'dialog-confirm']);
    const focusTargets = new Set([
      'search',
      'role-select',
      'delete',
      'dialog-cancel',
      'dialog-confirm',
    ]);
    const canonicalDefault = system === 'idle'
      && interaction === 'default'
      && targetId === undefined;
    const canonicalLoading = data === 'empty'
      && permission === 'admin'
      && interaction === 'default'
      && system === 'loading'
      && targetId === undefined;
    const canonicalInteraction = data === 'maximum-supported'
      && permission === 'super-admin'
      && system === 'idle'
      && (interaction === 'hover' || interaction === 'pressed'
        ? dialogTargets.has(targetId ?? '')
        : interaction === 'focus-visible'
          ? focusTargets.has(targetId ?? '')
          : interaction === 'input'
            ? targetId === 'search'
            : interaction === 'change'
              ? targetId === 'role-select'
              : interaction === 'open' && targetId === 'delete');
    if (
      Object.keys(context.states).length !== 4
      || !context.states.data
      || !context.states.permissions
      || !context.states.interactions
      || !context.states.system
      || Object.keys(context.variants).length !== 1
      || context.variants.theme !== 'dark'
      || !supportedData.has(data as VisualQaAdminCommunityLeafData)
      || (permission !== 'admin' && permission !== 'super-admin')
      || (!canonicalDefault && !canonicalLoading && !canonicalInteraction)
    ) {
      throw new Error(
        `지원하지 않는 Admin users panel state: ${data ?? 'none'}:${permission ?? 'none'}:${system ?? 'none'}:${interaction ?? 'none'}:${targetId ?? 'none'}`,
      );
    }
    const typedData = data as VisualQaAdminCommunityLeafData;
    const loading = system === 'loading';
    const count = loading ? 0 : visualQaAdminLeafCount(typedData);
    return {
      props: {
        searchTerm: typedData === 'long-korean' || typedData === 'unbroken-token'
          ? visualQaAdminCommunityLeafCopy(typedData, '')
          : '',
        setSearchTerm: () => undefined,
        users: Array.from({ length: count }, (_, index) => (
          makeVisualQaAdminLeafUser(index + 1, typedData)
        )),
        loading,
        isSuperAdmin: permission === 'super-admin',
        currentUserId: 4,
        handleDeleteUser: () => undefined,
        setPendingRoleChange: () => undefined,
        setRoleChangeReason: () => undefined,
        visualQaInteractive: true,
      },
      captureSelector: interaction === 'default'
        ? '[data-testid="admin-users-panel"]'
        : 'body',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none',
      theme: 'dark',
    };
  },
  'admin.community-runtime': (context) => {
    const data = requireStateValueFromMap<VisualQaAdminCommunityData>(context, 'data', {
      empty: 'empty',
      loading: 'loading',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const permission = requireStateValueFromMap(context, 'permissions', {
      admin: 'admin',
      'super-admin': 'super-admin',
    });
    requireStateValue(context, 'interactions', 'default');
    const activeTab = resolveDeclaredVariant<'parties' | 'posts' | 'users'>(
      context,
      'active-tab',
      { parties: 'parties', posts: 'posts', users: 'users' },
    );
    const panelPhase = resolveDeclaredVariant<'fallback' | 'resolved'>(
      context,
      'panel-phase',
      { fallback: 'fallback', resolved: 'resolved' },
    );
    const roleDialogPhase = resolveDeclaredVariant<'closed' | 'fallback' | 'resolved'>(
      context,
      'role-dialog-phase',
      { closed: 'closed', fallback: 'fallback', resolved: 'resolved' },
    );
    const theme = resolveDeclaredVariant<'dark'>(context, 'theme', { dark: 'dark' });
    const fallbackCanonical = data === 'empty'
      && permission === 'admin'
      && roleDialogPhase === 'closed';

    if (panelPhase === 'fallback' && !fallbackCanonical) {
      throw new Error(
        `지원하지 않는 Admin community runtime fallback: ${activeTab}:${data}:${permission}:${roleDialogPhase}`,
      );
    }
    if (panelPhase === 'resolved' && activeTab !== 'users' && permission !== 'admin') {
      throw new Error(
        `지원하지 않는 Admin community runtime permission: ${activeTab}:${permission}`,
      );
    }
    if (panelPhase === 'resolved' && data === 'loading' && activeTab !== 'users') {
      throw new Error(`지원하지 않는 Admin community runtime loading: ${activeTab}`);
    }
    if (
      roleDialogPhase !== 'closed'
      && (
        panelPhase !== 'resolved'
        || activeTab !== 'users'
        || permission !== 'super-admin'
        || data === 'empty'
        || data === 'loading'
      )
    ) {
      throw new Error(
        `지원하지 않는 Admin community runtime role dialog: ${panelPhase}:${activeTab}:${permission}:${data}:${roleDialogPhase}`,
      );
    }

    const inventory = visualQaAdminCommunityInventory(data);
    const pendingUser = inventory.users[0] ?? makeVisualQaAdminUser(1, data);
    const pendingRoleChange = roleDialogPhase === 'closed'
      ? null
      : {
          userId: pendingUser.id,
          userName: pendingUser.name,
          userEmail: pendingUser.email,
          currentRole: 'ROLE_USER',
          targetRole: 'ROLE_ADMIN' as const,
        };
    const roleChangeReason = roleDialogPhase === 'closed'
      ? ''
      : data === 'unbroken-token'
        ? `ROLE-CHANGE-${'UNBROKEN'.repeat(32)}`
        : visualQaAdminCommunityCopy(data, '운영 권한 검토 완료');
    const searchTerm = data === 'empty' || data === 'loading'
      ? ''
      : visualQaAdminCommunityCopy(data, 'Visual QA 검색어');

    return {
      props: {
        activeTab,
        onErrorChange: () => undefined,
        onSuccessMessageChange: () => undefined,
        refreshStats: async () => undefined,
        visualQaStateOverride: {
          panelPhase,
          roleDialogPhase,
          searchTerm,
          ...inventory,
          loading: data === 'loading',
          currentUserId: 7,
          userRole: permission === 'super-admin' ? 'ROLE_SUPER_ADMIN' : 'ROLE_ADMIN',
          pendingRoleChange,
          roleChangeReason,
        },
        visualQaRenderers: {
          users: (props: ComponentProps<typeof UsersAdminPanelComponent>) => (
            renderVisualQaCommunityLazyChild(createElement(VisualQaUsersAdminPanel, props))
          ),
          posts: (props: ComponentProps<typeof PostsAdminPanelComponent>) => (
            renderVisualQaCommunityLazyChild(createElement(VisualQaPostsAdminPanel, props))
          ),
          parties: (props: ComponentProps<typeof MatesAdminPanelComponent>) => (
            renderVisualQaCommunityLazyChild(createElement(VisualQaMatesAdminPanel, props))
          ),
          roleDialog: (props: ComponentProps<typeof AdminRoleChangeDialogContentComponent>) => (
            renderVisualQaCommunityLazyChild(createElement(
              VisualQaAdminRoleChangeDialogContent,
              props,
            ))
          ),
        },
      },
      captureSelector: roleDialogPhase === 'closed'
        ? '[data-testid="admin-community-runtime"]'
        : '[role="dialog"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none',
      theme,
    };
  },
  'admin.delete-place-dialog': (context) => {
    requireStateValue(context, 'permissions', 'admin');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const targetId = context.interactionTargetId;
    const actionTargets = new Set(['close', 'cancel', 'confirm']);
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    resolveDeclaredVariant(context, 'visibility', { open: 'open' });
    const validInteraction = interaction === 'default'
      ? targetId === undefined
      : actionTargets.has(targetId ?? '');
    const variantNames = Object.keys(context.variants);

    if (
      !validInteraction
      || context.states.data !== undefined
      || context.states.system !== undefined
      || variantNames.length !== 2
      || !variantNames.includes('theme')
      || !variantNames.includes('visibility')
    ) {
      throw new Error(
        `지원하지 않는 Admin delete-place dialog state: ${interaction}:${targetId ?? '<none>'}`,
      );
    }

    return {
      props: {
        open: true,
        onOpenChange: () => undefined,
        onConfirm: () => undefined,
      },
      captureSelector: '[data-testid="admin-delete-place-dialog"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-0 text-slate-100 shadow-none',
      theme,
    };
  },
  'admin.place-dialog': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'boundary-maximum': 'boundary-maximum',
      'boundary-minimum': 'boundary-minimum',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      'null-optional': 'null-optional',
      populated: 'populated',
      'unbroken-token': 'unbroken-token',
    });
    requireStateValue(context, 'permissions', 'admin');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      input: 'input',
      'keyboard-navigation': 'keyboard-navigation',
      pressed: 'pressed',
    });
    const system = requireStateValueFromMap(context, 'system', {
      'error-503': 'error-503',
      idle: 'idle',
      loading: 'loading',
    });
    const mode = resolveDeclaredVariant<'create' | 'edit'>(context, 'mode', {
      create: 'create',
      edit: 'edit',
    });
    const theme = resolveDeclaredVariant<'dark'>(context, 'theme', { dark: 'dark' });
    resolveDeclaredVariant(context, 'visibility', { open: 'open' });

    const targetId = context.interactionTargetId;
    const focusTargets = new Set([
      'address',
      'cancel',
      'category',
      'close',
      'close-time',
      'description',
      'lat',
      'lng',
      'name',
      'open-time',
      'phone',
      'rating',
      'submit',
    ]);
    const inputTargets = new Set([
      'address',
      'close-time',
      'description',
      'lat',
      'lng',
      'name',
      'open-time',
      'phone',
      'rating',
    ]);
    const pressedTargets = new Set(['cancel', 'close', 'submit']);
    const validTarget = interaction === 'default'
      ? targetId === undefined
      : interaction === 'hover' || interaction === 'focus-visible'
        ? focusTargets.has(targetId ?? '')
        : interaction === 'pressed'
          ? pressedTargets.has(targetId ?? '')
          : interaction === 'input'
            ? inputTargets.has(targetId ?? '')
            : targetId === 'category';
    const canonicalInteractionState = interaction === 'default'
      || (data === 'maximum-supported' && system === 'idle' && mode === 'create');
    const variantNames = Object.keys(context.variants);

    if (
      !validTarget
      || !canonicalInteractionState
      || (data === 'empty' && system === 'loading')
      || variantNames.length !== 3
      || !variantNames.includes('mode')
      || !variantNames.includes('theme')
      || !variantNames.includes('visibility')
    ) {
      throw new Error(
        `지원하지 않는 Admin place dialog state: ${data}:${system}:${mode}:${interaction}:${targetId ?? '<none>'}`,
      );
    }

    const longKorean = '모바일 화면에서도 장소 이름과 주소가 자연스럽게 여러 줄로 표시되는지 확인하는 긴 한국어 시각 점검 문구';
    const unbroken = `MOCK_PLACE_${'UNBROKEN'.repeat(24)}`;
    const placeForms: Record<typeof data, PlaceFormData> = {
      empty: {
        name: '',
        category: '',
        lat: 0,
        lng: 0,
      },
      'boundary-maximum': {
        name: 'MOCK 경계 최댓값 장소',
        category: '기타',
        description: '지원 입력 범위의 최댓값 경계',
        address: 'MOCK 최대 경계 주소',
        phone: '000-0000-0000',
        lat: 90,
        lng: 180,
        rating: 5,
        openTime: '23:59',
        closeTime: '23:59',
      },
      'boundary-minimum': {
        name: 'MOCK 경계 최솟값 장소',
        category: '기타',
        description: '지원 입력 범위의 최솟값 경계',
        address: 'MOCK 최소 경계 주소',
        phone: '000-0000-0000',
        lat: -90,
        lng: -180,
        rating: 0,
        openTime: '00:00',
        closeTime: '00:00',
      },
      'long-korean': {
        name: longKorean,
        category: '기타',
        description: `${longKorean} ${longKorean}`,
        address: `${longKorean} ${longKorean}`,
        phone: '000-0000-0000',
        lat: 37.5,
        lng: 127,
        rating: 4.3,
        openTime: '09:00',
        closeTime: '22:00',
      },
      'maximum-supported': {
        name: `MOCK 최대 장소 ${'가나다라마바사'.repeat(8)}`,
        category: '기타',
        description: `MOCK 최대 설명 ${'모바일시각점검'.repeat(24)}`,
        address: `MOCK 최대 주소 ${'긴주소점검'.repeat(24)}`,
        phone: '000-0000-0000',
        lat: 37.5123456789,
        lng: 127.0719876543,
        rating: 4.9,
        openTime: '00:00',
        closeTime: '23:59',
      },
      'null-optional': {
        name: 'MOCK 선택 정보 없음',
        category: '기타',
        lat: 37.5,
        lng: 127,
        rating: undefined,
      },
      populated: {
        name: 'MOCK 모바일 점검 장소',
        category: '카페',
        description: '관리자 장소 입력 다이얼로그 시각 점검용 설명',
        address: 'MOCK 시각 점검 주소',
        phone: '000-0000-0000',
        lat: 37.5,
        lng: 127,
        rating: 4.3,
        openTime: '09:00',
        closeTime: '22:00',
      },
      'unbroken-token': {
        name: unbroken,
        category: '기타',
        description: unbroken,
        address: unbroken,
        phone: '0000000000000000000000000000000000000000',
        lat: 37.5,
        lng: 127,
        rating: 4.3,
        openTime: '090000000000000000000000',
        closeTime: '220000000000000000000000',
      },
    };
    const stadiumError = system === 'error-503'
      ? data === 'unbroken-token'
        ? `MOCK_ERROR_${'UNBROKEN'.repeat(28)}`
        : data === 'long-korean'
          ? `${longKorean} ${longKorean}`
          : '장소 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'
      : null;

    return {
      props: {
        categories: ['음식점', '카페', '편의점', '주차장', '대중교통', '숙박', '관광명소', '기타'],
        mode,
        onOpenChange: () => undefined,
        onSubmit: () => undefined,
        open: true,
        placeForm: placeForms[data],
        placeSubmitting: system === 'loading',
        setPlaceForm: () => undefined,
        stadiumError,
        stadiumName: data === 'unbroken-token'
          ? unbroken
          : data === 'long-korean'
            ? longKorean
            : 'MOCK 시각 점검 구장',
        visualQaStateOverride: { interactive: true },
      },
      captureSelector: '[data-testid="admin-place-dialog"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-0 text-slate-100 shadow-none',
      theme,
    };
  },
  'admin.report-detail-drawer': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'boundary-maximum': 'boundary-maximum',
      'boundary-minimum': 'boundary-minimum',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      'null-optional': 'null-optional',
      populated: 'populated',
      'unbroken-token': 'unbroken-token',
    });
    requireStateValue(context, 'permissions', 'admin');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      input: 'input',
      pressed: 'pressed',
    });
    const system = requireStateValueFromMap(context, 'system', {
      idle: 'idle',
      loading: 'loading',
    });
    const theme = resolveDeclaredVariant<'dark'>(context, 'theme', { dark: 'dark' });
    resolveDeclaredVariant(context, 'visibility', { open: 'open' });

    const targetId = context.interactionTargetId;
    const focusTargets = new Set([
      'close',
      'memo',
      'take-down',
      'dismiss',
      'restore',
      'require-modification',
      'warning',
    ]);
    const pressedTargets = new Set([
      'close',
      'take-down',
      'dismiss',
      'restore',
      'require-modification',
      'warning',
    ]);
    const canonicalInteractionState = data === 'maximum-supported' && system === 'idle';
    const validTarget = interaction === 'default'
      ? targetId === undefined
      : canonicalInteractionState && (
        interaction === 'hover' || interaction === 'focus-visible'
          ? focusTargets.has(targetId ?? '')
          : interaction === 'pressed'
            ? pressedTargets.has(targetId ?? '')
            : targetId === 'memo'
      );
    const canonicalLoadingState = system === 'idle'
      || (data === 'empty' && interaction === 'default');
    const variantNames = Object.keys(context.variants);

    if (
      !validTarget
      || !canonicalLoadingState
      || variantNames.length !== 2
      || !variantNames.includes('theme')
      || !variantNames.includes('visibility')
    ) {
      throw new Error(
        `지원하지 않는 Admin report detail drawer state: ${data}:${system}:${interaction}:${targetId ?? '<none>'}`,
      );
    }

    const longKorean = '모바일 화면에서도 신고 내용과 이의 제기 사유가 자연스럽게 여러 줄로 표시되는지 확인하는 긴 한국어 시각 점검 문구';
    const unbroken = `MOCK_REPORT_${'UNBROKEN'.repeat(32)}`;
    const baseReport: AdminReport = {
      id: 42,
      postId: 24,
      postPreview: 'MOCK 관리자 신고 상세 패널의 게시물 미리보기입니다.',
      reporterId: 7,
      reporterHandle: 'mock-reporter',
      reason: 'INAPPROPRIATE_CONTENT',
      description: 'MOCK 신고 상세 설명',
      status: 'IN_REVIEW',
      adminAction: null,
      adminMemo: null,
      handledBy: 3,
      handledAt: '2026-08-28T01:00:00.000Z',
      evidenceUrl: 'https://example.invalid/visual-qa/report-evidence',
      requestedAction: 'TAKE_DOWN',
      appealStatus: 'PENDING',
      appealReason: 'MOCK 이의 제기 사유',
      appealCount: 1,
      createdAt: '2026-08-27T01:00:00.000Z',
    };
    const reports: Record<typeof data, AdminReport | null> = {
      empty: null,
      populated: baseReport,
      'null-optional': {
        ...baseReport,
        id: 43,
        postId: null,
        postPreview: null,
        reporterId: null,
        reporterHandle: null,
        reason: null,
        description: null,
        status: null,
        adminAction: null,
        adminMemo: null,
        handledBy: null,
        handledAt: null,
        evidenceUrl: null,
        requestedAction: null,
        appealStatus: null,
        appealReason: null,
        appealCount: null,
      },
      'boundary-minimum': {
        ...baseReport,
        id: 1,
        postId: 1,
        reporterId: 1,
        handledBy: 1,
        appealCount: 0,
      },
      'boundary-maximum': {
        ...baseReport,
        id: 2_147_483_647,
        postId: 2_147_483_647,
        reporterId: 2_147_483_647,
        handledBy: 2_147_483_647,
        appealCount: 2_147_483_647,
      },
      'long-korean': {
        ...baseReport,
        id: 44,
        postPreview: `${longKorean} ${longKorean}`,
        reporterHandle: longKorean,
        reason: longKorean,
        status: longKorean,
        requestedAction: longKorean,
        appealStatus: longKorean,
        appealReason: `${longKorean} ${longKorean}`,
        evidenceUrl: `https://example.invalid/visual-qa/${encodeURIComponent(longKorean)}`,
      },
      'unbroken-token': {
        ...baseReport,
        id: 45,
        postPreview: unbroken,
        reporterHandle: unbroken,
        reason: unbroken,
        status: unbroken,
        requestedAction: unbroken,
        appealStatus: unbroken,
        appealReason: unbroken,
        evidenceUrl: `https://example.invalid/${unbroken}`,
      },
      'maximum-supported': {
        ...baseReport,
        id: 2_147_483_647,
        postId: 2_147_483_647,
        postPreview: `MOCK 최대 게시물 ${'모바일시각점검'.repeat(48)}`,
        reporterId: 2_147_483_647,
        reporterHandle: `mock-${'reporter'.repeat(24)}`,
        reason: `MOCK_REASON_${'LONG'.repeat(32)}`,
        status: `MOCK_STATUS_${'LONG'.repeat(32)}`,
        handledBy: 2_147_483_647,
        evidenceUrl: `https://example.invalid/visual-qa/${'evidence'.repeat(48)}`,
        requestedAction: `MOCK_ACTION_${'LONG'.repeat(32)}`,
        appealStatus: `MOCK_APPEAL_${'LONG'.repeat(32)}`,
        appealReason: `MOCK 최대 이의 제기 ${'긴사유점검'.repeat(48)}`,
        appealCount: 2_147_483_647,
      },
    };
    const selectedReportDetail = reports[data];
    const selectedReportId = selectedReportDetail?.id ?? 42;
    const adminMemo = data === 'unbroken-token'
      ? unbroken
      : data === 'long-korean'
        ? `${longKorean} ${longKorean}`
        : data === 'maximum-supported'
          ? `MOCK 최대 관리자 메모 ${'조치근거점검'.repeat(48)}`
          : data === 'null-optional' || data === 'empty'
            ? ''
            : 'MOCK 운영 정책 검토 완료';

    return {
      props: {
        adminMemo,
        closeReportDetail: () => undefined,
        handleReportAction: async () => undefined,
        reportDetailLoading: system === 'loading',
        selectedReportDetail,
        selectedReportId,
        setAdminMemo: () => undefined,
        visualQaStateOverride: { interactive: true },
      },
      captureSelector: '[data-testid="admin-report-detail-drawer"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-0 text-slate-100 shadow-none',
      theme,
    };
  },
  'admin.reports-panel': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'boundary-maximum': 'boundary-maximum',
      'boundary-minimum': 'boundary-minimum',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      'null-optional': 'null-optional',
      populated: 'populated',
      'unbroken-token': 'unbroken-token',
    });
    requireStateValue(context, 'permissions', 'admin');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      input: 'input',
      'keyboard-navigation': 'keyboard-navigation',
      pressed: 'pressed',
    });
    const system = requireStateValueFromMap(context, 'system', {
      idle: 'idle',
      loading: 'loading',
    });
    const filters = resolveDeclaredVariant<'active' | 'default'>(context, 'filters', {
      active: 'active',
      default: 'default',
    });
    const theme = resolveDeclaredVariant<'dark'>(context, 'theme', { dark: 'dark' });

    const targetId = context.interactionTargetId;
    const hoverTargets = new Set(['reset', 'row', 'detail', 'take-down', 'dismiss']);
    const focusTargets = new Set([
      'status',
      'reason',
      'from-date',
      'to-date',
      'reset',
      'detail',
      'take-down',
      'dismiss',
    ]);
    const pressedTargets = new Set(['reset', 'detail', 'take-down', 'dismiss']);
    const inputTargets = new Set(['from-date', 'to-date']);
    const keyboardTargets = new Set(['status', 'reason']);
    const canonicalInteractionState = data === 'maximum-supported'
      && system === 'idle'
      && filters === 'active';
    const validTarget = interaction === 'default'
      ? targetId === undefined
      : canonicalInteractionState && (
        interaction === 'hover'
          ? hoverTargets.has(targetId ?? '')
          : interaction === 'focus-visible'
            ? focusTargets.has(targetId ?? '')
            : interaction === 'pressed'
              ? pressedTargets.has(targetId ?? '')
              : interaction === 'input'
                ? inputTargets.has(targetId ?? '')
                : keyboardTargets.has(targetId ?? '')
      );
    const canonicalLoadingState = system === 'idle'
      || (data === 'empty' && interaction === 'default');
    const variantNames = Object.keys(context.variants);

    if (
      !validTarget
      || !canonicalLoadingState
      || variantNames.length !== 2
      || !variantNames.includes('filters')
      || !variantNames.includes('theme')
    ) {
      throw new Error(
        `지원하지 않는 Admin reports panel state: ${data}:${system}:${filters}:${interaction}:${targetId ?? '<none>'}`,
      );
    }

    const longKorean = '모바일 신고 목록에서도 게시물 요약과 신고자 정보가 자연스럽게 표시되는지 확인하는 긴 한국어 시각 점검 문구';
    const unbroken = `MOCK_REPORT_LIST_${'UNBROKEN'.repeat(32)}`;
    const baseReport: AdminReport = {
      id: 42,
      postId: 24,
      postPreview: 'MOCK 관리자 신고 목록의 게시물 미리보기입니다.',
      reporterId: 7,
      reporterHandle: 'mock-reporter',
      reason: 'INAPPROPRIATE_CONTENT',
      description: 'MOCK 신고 목록 설명',
      status: 'IN_REVIEW',
      adminAction: null,
      adminMemo: null,
      handledBy: null,
      handledAt: null,
      evidenceUrl: null,
      requestedAction: 'TAKE_DOWN',
      appealStatus: 'PENDING',
      appealReason: null,
      appealCount: 0,
      createdAt: '2026-08-27T01:00:00.000Z',
    };
    const oneReportByState: Record<Exclude<typeof data, 'empty' | 'maximum-supported'>, AdminReport> = {
      populated: baseReport,
      'null-optional': {
        ...baseReport,
        id: 43,
        postId: null,
        postPreview: null,
        reporterId: null,
        reporterHandle: null,
        reason: null,
        description: null,
        status: null,
        requestedAction: null,
        appealStatus: null,
        appealCount: null,
      },
      'boundary-minimum': {
        ...baseReport,
        id: 1,
        postId: 1,
        reporterId: 1,
        appealCount: 0,
      },
      'boundary-maximum': {
        ...baseReport,
        id: 2_147_483_647,
        postId: 2_147_483_647,
        reporterId: 2_147_483_647,
        appealCount: 2_147_483_647,
      },
      'long-korean': {
        ...baseReport,
        id: 44,
        postPreview: `${longKorean} ${longKorean}`,
        reporterHandle: longKorean,
        reason: longKorean,
        status: longKorean,
      },
      'unbroken-token': {
        ...baseReport,
        id: 45,
        postPreview: unbroken,
        reporterHandle: unbroken,
        reason: unbroken,
        status: unbroken,
      },
    };
    const maximumStatuses = ['PENDING', 'IN_REVIEW', 'RESOLVED', 'CLOSED'];
    const maximumReasons = [
      'SPAM',
      'INAPPROPRIATE_CONTENT',
      'ABUSIVE_LANGUAGE',
      'ADVERTISEMENT',
      'COPYRIGHT_INFRINGEMENT',
      'FAKE_INFORMATION',
      'OTHER',
    ];
    const maximumReports = Array.from({ length: 50 }, (_, index): AdminReport => ({
      ...baseReport,
      id: 2_147_483_647 - index,
      postId: 2_147_483_647 - index,
      postPreview: `MOCK 최대 목록 게시물 ${index + 1} ${'모바일시각점검'.repeat(12)}`,
      reporterId: 2_147_483_647 - index,
      reporterHandle: `mock-reporter-${index + 1}-${'handle'.repeat(8)}`,
      reason: maximumReasons[index % maximumReasons.length],
      status: maximumStatuses[index % maximumStatuses.length],
      appealCount: 2_147_483_647 - index,
    }));
    const reports = data === 'empty'
      ? []
      : data === 'maximum-supported'
        ? maximumReports
        : [oneReportByState[data]];
    const reportFilters: AdminReportFilters = filters === 'active'
      ? {
          status: 'IN_REVIEW',
          reason: 'INAPPROPRIATE_CONTENT',
          fromDate: '2026-08-01',
          toDate: '2026-08-29',
        }
      : {
          status: 'all',
          reason: 'all',
          fromDate: '',
          toDate: '',
        };

    return {
      props: {
        handleReportAction: async () => undefined,
        openReportDetail: () => undefined,
        reportFilters,
        reports,
        reportsLoading: system === 'loading',
        resetReportFilters: () => undefined,
        updateReportFilters: () => undefined,
        visualQaStateOverride: { interactive: true },
      },
      captureSelector: '[data-testid="admin-reports-panel"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-0 text-slate-100 shadow-none',
      theme,
    };
  },
  'admin.role-change-dialog': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'boundary-maximum': 'boundary-maximum',
      'boundary-minimum': 'boundary-minimum',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      'null-optional': 'null-optional',
      populated: 'populated',
      'unbroken-token': 'unbroken-token',
    });
    requireStateValue(context, 'permissions', 'super-admin');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      input: 'input',
      pressed: 'pressed',
    });
    const direction = resolveDeclaredVariant<'demote' | 'promote'>(context, 'direction', {
      demote: 'demote',
      promote: 'promote',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    resolveDeclaredVariant(context, 'visibility', { open: 'open' });

    const targetId = context.interactionTargetId;
    const pointerTargets = new Set(['close', 'cancel', 'confirm']);
    const focusTargets = new Set(['close', 'reason', 'cancel', 'confirm']);
    const canonicalInteractionState = data === 'maximum-supported';
    const validTarget = interaction === 'default'
      ? targetId === undefined
      : canonicalInteractionState && (
        interaction === 'hover' || interaction === 'pressed'
          ? pointerTargets.has(targetId ?? '')
          : interaction === 'focus-visible'
            ? focusTargets.has(targetId ?? '')
            : targetId === 'reason'
      );
    const variantNames = Object.keys(context.variants);

    if (
      !validTarget
      || context.states.system !== undefined
      || (data === 'null-optional' && direction === 'demote')
      || variantNames.length !== 3
      || !variantNames.includes('direction')
      || !variantNames.includes('theme')
      || !variantNames.includes('visibility')
    ) {
      throw new Error(
        `지원하지 않는 Admin role-change dialog state: ${data}:${direction}:${interaction}:${targetId ?? '<none>'}`,
      );
    }

    const longKorean = '모바일 역할 변경 확인 화면에서 사용자 이름과 이메일 및 변경 사유가 자연스럽게 여러 줄로 표시되는지 확인하는 긴 한국어 시각 점검 문구';
    const unbroken = `MOCK_ROLE_CHANGE_${'UNBROKEN'.repeat(36)}`;
    const identities: Record<
      typeof data,
      null | { userId: number; userName: string; userEmail: string }
    > = {
      empty: { userId: 42, userName: '', userEmail: '' },
      populated: {
        userId: 42,
        userName: 'MOCK 운영 사용자',
        userEmail: 'mock-role-user@example.invalid',
      },
      'null-optional': null,
      'boundary-minimum': { userId: 1, userName: '가', userEmail: 'a@b.co' },
      'boundary-maximum': {
        userId: 2_147_483_647,
        userName: `MOCK 경계 최대 ${'사용자'.repeat(16)}`,
        userEmail: `mock-${'boundary'.repeat(20)}@example.invalid`,
      },
      'long-korean': {
        userId: 43,
        userName: longKorean,
        userEmail: `mock-long-${'identity'.repeat(12)}@example.invalid`,
      },
      'unbroken-token': { userId: 44, userName: unbroken, userEmail: `${unbroken}@example.invalid` },
      'maximum-supported': {
        userId: 2_147_483_647,
        userName: `MOCK 최대 사용자 ${'모바일시각점검'.repeat(16)}`,
        userEmail: `mock-${'maximum'.repeat(24)}@example.invalid`,
      },
    };
    const reasons: Record<typeof data, string> = {
      empty: '',
      populated: 'MOCK 운영 정책에 따른 역할 변경',
      'null-optional': '',
      'boundary-minimum': '',
      'boundary-maximum': `MOCK 경계 최대 사유 ${'근거'.repeat(32)}`,
      'long-korean': `${longKorean} ${longKorean}`,
      'unbroken-token': unbroken,
      'maximum-supported': `MOCK 최대 변경 사유 ${'감사로그시각점검'.repeat(50)}`,
    };
    const identity = identities[data];
    const targetRole = direction === 'promote' ? 'ROLE_ADMIN' : 'ROLE_USER';
    const currentRole = direction === 'promote' ? 'ROLE_USER' : 'ROLE_ADMIN';

    return {
      props: {
        onConfirm: async () => undefined,
        onOpenChange: () => undefined,
        open: true,
        pendingRoleChange: identity === null
          ? null
          : { ...identity, currentRole, targetRole },
        roleChangeReason: reasons[data],
        setRoleChangeReason: () => undefined,
        visualQaStateOverride: { interactive: true },
      },
      captureSelector: '[data-testid="admin-role-change-dialog"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'admin.seat-view-detail-drawer': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'boundary-maximum': 'boundary-maximum',
      'boundary-minimum': 'boundary-minimum',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      'null-optional': 'null-optional',
      populated: 'populated',
      'unbroken-token': 'unbroken-token',
    });
    requireStateValue(context, 'permissions', 'admin');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      input: 'input',
      pressed: 'pressed',
    });
    const system = requireStateValueFromMap(context, 'system', {
      idle: 'idle',
      loading: 'loading',
    });
    const theme = resolveDeclaredVariant<'dark'>(context, 'theme', { dark: 'dark' });
    resolveDeclaredVariant(context, 'visibility', { open: 'open' });

    const targetId = context.interactionTargetId;
    const focusTargets = new Set([
      'close',
      'memo',
      'approve',
      'ticket',
      'other',
      'inappropriate',
    ]);
    const pressedTargets = new Set([
      'close',
      'approve',
      'ticket',
      'other',
      'inappropriate',
    ]);
    const canonicalInteractionState = data === 'maximum-supported' && system === 'idle';
    const validTarget = interaction === 'default'
      ? targetId === undefined
      : canonicalInteractionState && (
        interaction === 'hover' || interaction === 'focus-visible'
          ? focusTargets.has(targetId ?? '')
          : interaction === 'pressed'
            ? pressedTargets.has(targetId ?? '')
            : targetId === 'memo'
      );
    const canonicalLoadingState = system === 'idle'
      || (data === 'empty' && interaction === 'default');
    const variantNames = Object.keys(context.variants);

    if (
      !validTarget
      || !canonicalLoadingState
      || variantNames.length !== 2
      || !variantNames.includes('theme')
      || !variantNames.includes('visibility')
    ) {
      throw new Error(
        `지원하지 않는 Admin seat-view detail drawer state: ${data}:${system}:${interaction}:${targetId ?? '<none>'}`,
      );
    }

    const longKorean = '모바일 시야뷰 검토 화면에서 구장과 좌석 및 AI 사유와 사용자 한줄평이 자연스럽게 여러 줄로 표시되는지 확인하는 긴 한국어 시각 점검 문구';
    const unbroken = `MOCK_SEAT_VIEW_${'UNBROKEN'.repeat(36)}`;
    const photoUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"%3E%3Crect width="640" height="360" fill="%230f172a"/%3E%3Cpath d="M0 250L160 150L320 240L480 120L640 220V360H0Z" fill="%2310b981"/%3E%3Ccircle cx="320" cy="180" r="44" fill="white"/%3E%3C/svg%3E';
    const baseSeatView: AdminSeatView = {
      id: 42,
      diaryId: 24,
      userId: 7,
      photoUrl,
      storagePath: 'MOCK/seat-view/42.svg',
      sourceType: 'MOCK_DIARY',
      aiSuggestedLabel: 'SEAT_VIEW',
      aiConfidence: 0.92,
      aiReason: 'MOCK 좌석 시야 이미지로 판정했습니다.',
      userSelected: true,
      moderationStatus: 'PENDING',
      adminLabel: 'SEAT_VIEW',
      adminMemo: null,
      reviewedBy: 3,
      reviewedAt: '2026-08-28T01:00:00.000Z',
      rewardGranted: false,
      stadium: 'MOCK_STADIUM',
      section: 'MOCK 1루 구역',
      block: 'MOCK 101블록',
      seatRow: 'MOCK 12열',
      seatNumber: 'MOCK 34번',
      diaryDate: '2026-08-28',
      ticketVerified: true,
      ticketVerifiedAt: '2026-08-28T00:30:00.000Z',
      rating: 5,
      comment: 'MOCK 좌석에서 경기장이 잘 보입니다.',
      tags: ['MOCK 시야 좋음', 'MOCK 응원석 근처'],
    };
    const seatViews: Record<typeof data, AdminSeatView | null> = {
      empty: null,
      populated: baseSeatView,
      'null-optional': {
        ...baseSeatView,
        id: 43,
        diaryId: null,
        aiSuggestedLabel: null,
        aiConfidence: null,
        aiReason: null,
        moderationStatus: null,
        adminLabel: null,
        adminMemo: null,
        reviewedBy: null,
        reviewedAt: null,
        section: null,
        block: null,
        seatRow: null,
        seatNumber: null,
        diaryDate: null,
        ticketVerifiedAt: null,
        rating: null,
        comment: null,
        tags: [],
      },
      'boundary-minimum': {
        ...baseSeatView,
        id: 1,
        diaryId: 1,
        userId: 1,
        aiConfidence: 0,
        reviewedBy: 1,
        rating: 1,
        section: '가',
        block: '1',
        seatRow: '1',
        seatNumber: '1',
        tags: ['가'],
      },
      'boundary-maximum': {
        ...baseSeatView,
        id: 2_147_483_647,
        diaryId: 2_147_483_647,
        userId: 2_147_483_647,
        aiConfidence: 1,
        reviewedBy: 2_147_483_647,
        rating: 5,
        section: `MOCK 경계 최대 ${'구역'.repeat(20)}`,
        block: `MOCK 경계 최대 ${'블록'.repeat(20)}`,
        seatRow: `MOCK 경계 최대 ${'열'.repeat(24)}`,
        seatNumber: `MOCK 경계 최대 ${'번호'.repeat(20)}`,
      },
      'long-korean': {
        ...baseSeatView,
        id: 44,
        sourceType: longKorean,
        aiSuggestedLabel: longKorean,
        aiReason: `${longKorean} ${longKorean}`,
        moderationStatus: longKorean,
        adminLabel: longKorean,
        stadium: longKorean,
        section: longKorean,
        block: longKorean,
        seatRow: longKorean,
        seatNumber: longKorean,
        comment: `${longKorean} ${longKorean}`,
        tags: [longKorean, `${longKorean} 두 번째 태그`],
      },
      'unbroken-token': {
        ...baseSeatView,
        id: 45,
        sourceType: unbroken,
        aiSuggestedLabel: unbroken,
        aiReason: unbroken,
        moderationStatus: unbroken,
        adminLabel: unbroken,
        stadium: unbroken,
        section: unbroken,
        block: unbroken,
        seatRow: unbroken,
        seatNumber: unbroken,
        comment: unbroken,
        tags: [`${unbroken}_1`, `${unbroken}_2`],
      },
      'maximum-supported': {
        ...baseSeatView,
        id: 2_147_483_647,
        diaryId: 2_147_483_647,
        userId: 2_147_483_647,
        sourceType: `MOCK_SOURCE_${'LONG'.repeat(32)}`,
        aiSuggestedLabel: `MOCK_LABEL_${'LONG'.repeat(32)}`,
        aiConfidence: 1,
        aiReason: `MOCK 최대 AI 사유 ${'시야판정근거점검'.repeat(48)}`,
        moderationStatus: `MOCK_STATUS_${'LONG'.repeat(32)}`,
        adminLabel: `MOCK_ADMIN_LABEL_${'LONG'.repeat(32)}`,
        reviewedBy: 2_147_483_647,
        stadium: `MOCK_STADIUM_${'LONG'.repeat(32)}`,
        section: `MOCK 최대 구역 ${'모바일시각점검'.repeat(24)}`,
        block: `MOCK 최대 블록 ${'모바일시각점검'.repeat(24)}`,
        seatRow: `MOCK 최대 열 ${'모바일시각점검'.repeat(24)}`,
        seatNumber: `MOCK 최대 번호 ${'모바일시각점검'.repeat(24)}`,
        rating: 5,
        comment: `MOCK 최대 한줄평 ${'좌석시야점검'.repeat(48)}`,
        tags: Array.from({ length: 50 }, (_, index) => (
          `MOCK_TAG_${String(index + 1).padStart(2, '0')}_${'PRESSURE'.repeat(8)}`
        )),
      },
    };
    const selectedSeatViewDetail = seatViews[data];
    const selectedSeatViewId = selectedSeatViewDetail?.id ?? 42;
    const adminMemo = data === 'unbroken-token'
      ? unbroken
      : data === 'long-korean'
        ? `${longKorean} ${longKorean}`
        : data === 'maximum-supported'
          ? `MOCK 최대 관리자 메모 ${'분류근거점검'.repeat(48)}`
          : data === 'null-optional' || data === 'empty'
            ? ''
            : 'MOCK 운영 정책 검토 완료';

    return {
      props: {
        adminMemo,
        closeSeatViewDetail: () => undefined,
        handleSeatViewAction: async () => undefined,
        seatViewDetailLoading: system === 'loading',
        selectedSeatViewDetail,
        selectedSeatViewId,
        setAdminMemo: () => undefined,
        visualQaStateOverride: { interactive: true },
      },
      captureSelector: '[data-testid="admin-seat-view-detail-drawer"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-0 text-slate-100 shadow-none',
      theme,
    };
  },
  'admin.seat-views-panel': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'boundary-maximum': 'boundary-maximum',
      'boundary-minimum': 'boundary-minimum',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      'null-optional': 'null-optional',
      populated: 'populated',
      'unbroken-token': 'unbroken-token',
    });
    requireStateValue(context, 'permissions', 'admin');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      input: 'input',
      'keyboard-navigation': 'keyboard-navigation',
      pressed: 'pressed',
    });
    const system = requireStateValueFromMap(context, 'system', {
      idle: 'idle',
      loading: 'loading',
    });
    const filters = resolveDeclaredVariant<'active' | 'default'>(context, 'filters', {
      active: 'active',
      default: 'default',
    });
    const theme = resolveDeclaredVariant<'dark'>(context, 'theme', { dark: 'dark' });

    const targetId = context.interactionTargetId;
    const hoverTargets = new Set(['reset', 'row', 'detail', 'approve']);
    const focusTargets = new Set([
      'status',
      'stadium',
      'ai-label',
      'admin-label',
      'ticket',
      'reset',
      'detail',
      'approve',
    ]);
    const pressedTargets = new Set(['reset', 'detail', 'approve']);
    const inputTargets = new Set(['stadium']);
    const keyboardTargets = new Set(['status', 'ai-label', 'admin-label', 'ticket']);
    const canonicalInteractionState = data === 'maximum-supported'
      && system === 'idle'
      && filters === 'active';
    const validTarget = interaction === 'default'
      ? targetId === undefined
      : canonicalInteractionState && (
        interaction === 'hover'
          ? hoverTargets.has(targetId ?? '')
          : interaction === 'focus-visible'
            ? focusTargets.has(targetId ?? '')
            : interaction === 'pressed'
              ? pressedTargets.has(targetId ?? '')
              : interaction === 'input'
                ? inputTargets.has(targetId ?? '')
                : keyboardTargets.has(targetId ?? '')
      );
    const canonicalLoadingState = system === 'idle'
      || (data === 'empty' && interaction === 'default');
    const variantNames = Object.keys(context.variants);

    if (
      !validTarget
      || !canonicalLoadingState
      || variantNames.length !== 2
      || !variantNames.includes('filters')
      || !variantNames.includes('theme')
    ) {
      throw new Error(
        `지원하지 않는 Admin seat-views panel state: ${data}:${system}:${filters}:${interaction}:${targetId ?? '<none>'}`,
      );
    }

    const longKorean = '모바일 시야뷰 후보 목록에서 구장과 좌석 및 판정 상태가 자연스럽게 표시되는지 확인하는 긴 한국어 시각 점검 문구';
    const unbroken = `MOCK_SEAT_VIEW_LIST_${'UNBROKEN'.repeat(32)}`;
    const photoUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 112 112"%3E%3Crect width="112" height="112" fill="%230f172a"/%3E%3Cpath d="M0 82L28 48L56 76L84 38L112 68V112H0Z" fill="%2310b981"/%3E%3Ccircle cx="56" cy="56" r="12" fill="white"/%3E%3C/svg%3E';
    const baseSeatView: AdminSeatView = {
      id: 42,
      diaryId: 24,
      userId: 7,
      photoUrl,
      storagePath: 'MOCK/seat-view/42.svg',
      sourceType: 'MOCK_DIARY',
      aiSuggestedLabel: 'SEAT_VIEW',
      aiConfidence: 0.92,
      aiReason: 'MOCK 좌석 시야 이미지 판정 근거',
      userSelected: true,
      moderationStatus: 'PENDING',
      adminLabel: 'SEAT_VIEW',
      adminMemo: null,
      reviewedBy: null,
      reviewedAt: null,
      rewardGranted: false,
      stadium: 'MOCK_STADIUM',
      section: 'MOCK 1루 구역',
      block: 'MOCK 101블록',
      seatRow: 'MOCK 12열',
      seatNumber: 'MOCK 34번',
      diaryDate: '2026-08-28',
      ticketVerified: true,
      ticketVerifiedAt: '2026-08-28T00:30:00.000Z',
      rating: 5,
      comment: 'MOCK 좌석 시야 한줄평',
      tags: ['MOCK 시야 좋음'],
    };
    const oneSeatViewByState: Record<
      Exclude<typeof data, 'empty' | 'maximum-supported'>,
      AdminSeatView
    > = {
      populated: baseSeatView,
      'null-optional': {
        ...baseSeatView,
        id: 43,
        diaryId: null,
        aiSuggestedLabel: null,
        aiConfidence: null,
        aiReason: null,
        moderationStatus: null,
        adminLabel: null,
        adminMemo: null,
        reviewedBy: null,
        reviewedAt: null,
        section: null,
        block: null,
        seatRow: null,
        seatNumber: null,
        diaryDate: null,
        ticketVerifiedAt: null,
        rating: null,
        comment: null,
        tags: [],
      },
      'boundary-minimum': {
        ...baseSeatView,
        id: 1,
        diaryId: 1,
        userId: 1,
        aiConfidence: 0,
        stadium: '가',
        section: '가',
        block: '1',
        seatRow: '1',
        seatNumber: '1',
        rating: 1,
      },
      'boundary-maximum': {
        ...baseSeatView,
        id: 2_147_483_647,
        diaryId: 2_147_483_647,
        userId: 2_147_483_647,
        aiConfidence: 1,
        reviewedBy: 2_147_483_647,
        stadium: `MOCK 경계 최대 ${'구장'.repeat(20)}`,
        section: `MOCK 경계 최대 ${'구역'.repeat(20)}`,
        block: `MOCK 경계 최대 ${'블록'.repeat(20)}`,
        seatRow: `MOCK 경계 최대 ${'열'.repeat(24)}`,
        seatNumber: `MOCK 경계 최대 ${'번호'.repeat(20)}`,
        rating: 5,
      },
      'long-korean': {
        ...baseSeatView,
        id: 44,
        aiSuggestedLabel: longKorean,
        moderationStatus: longKorean,
        adminLabel: longKorean,
        stadium: longKorean,
        section: longKorean,
        block: longKorean,
        seatRow: longKorean,
        seatNumber: longKorean,
      },
      'unbroken-token': {
        ...baseSeatView,
        id: 45,
        aiSuggestedLabel: unbroken,
        moderationStatus: unbroken,
        adminLabel: unbroken,
        stadium: unbroken,
        section: unbroken,
        block: unbroken,
        seatRow: unbroken,
        seatNumber: unbroken,
      },
    };
    const moderationStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    const maximumSeatViews = Array.from({ length: 50 }, (_, index): AdminSeatView => ({
      ...baseSeatView,
      id: 1001 + index,
      diaryId: 2001 + index,
      userId: 3001 + index,
      storagePath: `MOCK/seat-view/${1001 + index}.svg`,
      aiSuggestedLabel: index % 2 === 0 ? 'SEAT_VIEW' : 'TICKET',
      aiConfidence: index % 2 === 0 ? 1 : 0,
      moderationStatus: moderationStatuses[index % moderationStatuses.length],
      adminLabel: index % 2 === 0 ? 'SEAT_VIEW' : 'OTHER',
      stadium: `MOCK_STADIUM_${index + 1}_${'LONG'.repeat(12)}`,
      section: `MOCK 최대 구역 ${index + 1} ${'모바일시각점검'.repeat(10)}`,
      block: `MOCK 최대 블록 ${index + 1} ${'PRESSURE'.repeat(8)}`,
      seatRow: `MOCK 최대 열 ${index + 1}`,
      seatNumber: `MOCK 최대 번호 ${index + 1}`,
      ticketVerified: index % 2 === 0,
    }));
    const seatViews = data === 'empty'
      ? []
      : data === 'maximum-supported'
        ? maximumSeatViews
        : [oneSeatViewByState[data]];
    const seatViewFilters: AdminSeatViewFilters = filters === 'active'
      ? {
          moderationStatus: 'PENDING',
          stadium: 'MOCK_STADIUM',
          aiSuggestedLabel: 'SEAT_VIEW',
          adminLabel: 'SEAT_VIEW',
          ticketVerified: 'verified',
        }
      : {
          moderationStatus: 'all',
          stadium: '',
          aiSuggestedLabel: 'all',
          adminLabel: 'all',
          ticketVerified: 'all',
        };

    return {
      props: {
        handleSeatViewAction: async () => undefined,
        openSeatViewDetail: () => undefined,
        resetSeatViewFilters: () => undefined,
        seatViewFilters,
        seatViews,
        seatViewsLoading: system === 'loading',
        updateSeatViewFilters: () => undefined,
        visualQaStateOverride: { interactive: true },
      },
      captureSelector: '[data-testid="admin-seat-views-panel"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-0 text-slate-100 shadow-none',
      theme,
    };
  },
  'admin.stadiums-panel': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'boundary-maximum': 'boundary-maximum',
      'boundary-minimum': 'boundary-minimum',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      'null-optional': 'null-optional',
      populated: 'populated',
      'unbroken-token': 'unbroken-token',
    });
    requireStateValue(context, 'permissions', 'admin');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      'keyboard-navigation': 'keyboard-navigation',
      pressed: 'pressed',
    });
    const system = requireStateValueFromMap(context, 'system', {
      idle: 'idle',
      'initial-loading': 'initial-loading',
      loading: 'loading',
      'panel-error': 'panel-error',
    });
    const selection = resolveDeclaredVariant<'none' | 'selected'>(context, 'selection', {
      none: 'none',
      selected: 'selected',
    });
    const theme = resolveDeclaredVariant<'dark'>(context, 'theme', { dark: 'dark' });

    const targetId = context.interactionTargetId;
    const hoverTargets = new Set(['add', 'row', 'edit', 'delete']);
    const focusTargets = new Set(['select', 'add', 'edit', 'delete']);
    const pressedTargets = new Set(['add', 'edit', 'delete']);
    const canonicalInteractionState = data === 'maximum-supported'
      && system === 'idle'
      && selection === 'selected';
    const validTarget = interaction === 'default'
      ? targetId === undefined
      : canonicalInteractionState && (
        interaction === 'hover'
          ? hoverTargets.has(targetId ?? '')
          : interaction === 'focus-visible'
            ? focusTargets.has(targetId ?? '')
            : interaction === 'pressed'
              ? pressedTargets.has(targetId ?? '')
              : targetId === 'select'
      );
    const validLifecycle = system === 'idle' || system === 'panel-error'
      ? selection === 'selected' || data === 'empty'
      : system === 'initial-loading'
        ? data === 'empty' && selection === 'none'
        : data === 'empty' && selection === 'selected';
    const variantNames = Object.keys(context.variants);

    if (
      !validTarget
      || !validLifecycle
      || variantNames.length !== 2
      || !variantNames.includes('selection')
      || !variantNames.includes('theme')
    ) {
      throw new Error(
        `지원하지 않는 Admin stadiums panel state: ${data}:${system}:${selection}:${interaction}:${targetId ?? '<none>'}`,
      );
    }

    const longKorean = '모바일 구장 주변 장소 목록에서 카테고리와 이름 및 주소와 영업시간이 자연스럽게 표시되는지 확인하는 긴 한국어 시각 점검 문구';
    const unbroken = `MOCK_STADIUM_PLACE_${'UNBROKEN'.repeat(32)}`;
    const baseStadium: AdminStadium = {
      stadiumId: 'MOCK_STADIUM_1',
      stadiumName: 'MOCK 구장',
      team: 'MOCK 팀',
      lat: 37.5,
      lng: 127,
      address: 'MOCK 구장 주소',
      phone: '000-0000-0000',
    };
    const oneStadiumByState: Record<Exclude<typeof data, 'maximum-supported'>, AdminStadium> = {
      empty: baseStadium,
      populated: baseStadium,
      'null-optional': baseStadium,
      'boundary-minimum': {
        ...baseStadium,
        stadiumId: 'M',
        stadiumName: '가',
        team: '',
        lat: -90,
        lng: -180,
        address: '가',
        phone: '',
      },
      'boundary-maximum': {
        ...baseStadium,
        stadiumId: `MOCK_STADIUM_${'MAX'.repeat(24)}`,
        stadiumName: `MOCK 경계 최대 ${'구장'.repeat(20)}`,
        team: `MOCK 경계 최대 ${'팀'.repeat(20)}`,
        lat: 90,
        lng: 180,
        address: `MOCK 경계 최대 ${'주소'.repeat(32)}`,
        phone: `000-${'9'.repeat(32)}`,
      },
      'long-korean': {
        ...baseStadium,
        stadiumId: 'MOCK_STADIUM_LONG_KOREAN',
        stadiumName: longKorean,
        team: longKorean,
        address: longKorean,
      },
      'unbroken-token': {
        ...baseStadium,
        stadiumId: 'MOCK_STADIUM_UNBROKEN',
        stadiumName: unbroken,
        team: unbroken,
        address: unbroken,
        phone: unbroken,
      },
    };
    const basePlace: Place = {
      id: 42,
      stadiumName: 'MOCK 구장',
      category: 'MOCK 카테고리',
      name: 'MOCK 장소',
      description: 'MOCK 장소 설명',
      lat: 37.5,
      lng: 127,
      address: 'MOCK 장소 주소',
      phone: '000-1111-2222',
      rating: 4.5,
      openTime: '09:00',
      closeTime: '22:00',
    };
    const onePlaceByState: Record<Exclude<typeof data, 'empty' | 'maximum-supported'>, Place> = {
      populated: basePlace,
      'null-optional': {
        ...basePlace,
        id: 43,
        description: undefined,
        address: undefined,
        phone: undefined,
        rating: undefined,
        openTime: undefined,
        closeTime: undefined,
      },
      'boundary-minimum': {
        ...basePlace,
        id: 1,
        stadiumName: '가',
        category: '가',
        name: '가',
        description: '',
        lat: -90,
        lng: -180,
        address: '',
        phone: '',
        rating: 0,
        openTime: '00:00',
        closeTime: '00:00',
      },
      'boundary-maximum': {
        ...basePlace,
        id: 2_147_483_647,
        stadiumName: `MOCK 경계 최대 ${'구장'.repeat(20)}`,
        category: `MOCK 경계 최대 ${'카테고리'.repeat(20)}`,
        name: `MOCK 경계 최대 ${'장소'.repeat(24)}`,
        description: `MOCK 경계 최대 ${'설명'.repeat(48)}`,
        lat: 90,
        lng: 180,
        address: `MOCK 경계 최대 ${'주소'.repeat(40)}`,
        phone: `000-${'9'.repeat(32)}`,
        rating: 5,
        openTime: '00:00',
        closeTime: '23:59',
      },
      'long-korean': {
        ...basePlace,
        id: 44,
        stadiumName: longKorean,
        category: longKorean,
        name: longKorean,
        description: `${longKorean} ${longKorean}`,
        address: `${longKorean} ${longKorean}`,
        phone: longKorean,
        openTime: longKorean,
        closeTime: longKorean,
      },
      'unbroken-token': {
        ...basePlace,
        id: 45,
        stadiumName: unbroken,
        category: unbroken,
        name: unbroken,
        description: unbroken,
        address: unbroken,
        phone: unbroken,
        openTime: unbroken,
        closeTime: unbroken,
      },
    };
    const maximumStadiums = Array.from({ length: 50 }, (_, index): AdminStadium => ({
      ...baseStadium,
      stadiumId: `MOCK_STADIUM_${index + 1}`,
      stadiumName: `MOCK 구장 ${index + 1} ${'모바일시각점검'.repeat(8)}`,
      team: `MOCK 팀 ${index + 1} ${'TEAM'.repeat(8)}`,
      address: `MOCK 구장 주소 ${index + 1}`,
      phone: `000-0000-${String(index + 1).padStart(4, '0')}`,
    }));
    const maximumPlaces = Array.from({ length: 50 }, (_, index): Place => ({
      ...basePlace,
      id: 1001 + index,
      stadiumName: 'MOCK 구장 1',
      category: `MOCK 카테고리 ${index + 1} ${'TYPE'.repeat(8)}`,
      name: `MOCK 장소 ${index + 1} ${'모바일시각점검'.repeat(12)}`,
      description: `MOCK 장소 설명 ${index + 1}`,
      address: `MOCK 장소 주소 ${index + 1} ${'PRESSURE'.repeat(10)}`,
      phone: `000-1111-${String(index + 1).padStart(4, '0')}`,
      rating: index % 2 === 0 ? 5 : undefined,
      openTime: index % 2 === 0 ? '00:00' : undefined,
      closeTime: index % 2 === 0 ? '23:59' : undefined,
    }));
    const stadiums = selection === 'none'
      ? []
      : data === 'maximum-supported'
        ? maximumStadiums
        : [oneStadiumByState[data]];
    const places = data === 'empty'
      ? []
      : data === 'maximum-supported'
        ? maximumPlaces
        : [onePlaceByState[data]];
    const selectedStadiumId = selection === 'selected'
      ? stadiums[0]?.stadiumId ?? 'MOCK_STADIUM_1'
      : '';
    const stadiumError = system === 'panel-error'
      ? data === 'long-korean'
        ? `${longKorean} ${longKorean}`
        : data === 'unbroken-token'
          ? unbroken
          : data === 'maximum-supported'
            ? `MOCK 최대 장소 목록 오류 ${'오류근거시각점검'.repeat(48)}`
            : selection === 'none'
              ? 'MOCK 구장 목록 오류'
              : 'MOCK 장소 목록 오류'
      : null;

    return {
      props: {
        openCreateDialog: () => undefined,
        openEditDialog: () => undefined,
        places,
        placesLoading: system === 'loading',
        selectedStadiumId,
        setDeletingPlaceId: () => undefined,
        setSelectedStadiumId: () => undefined,
        stadiumError,
        stadiums,
        stadiumsLoading: system === 'initial-loading',
        visualQaStateOverride: { interactive: true },
      },
      captureSelector: '[data-testid="admin-stadiums-panel"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-0 text-slate-100 shadow-none',
      theme,
    };
  },
  'admin.stadiums-runtime': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'boundary-maximum': 'boundary-maximum',
      'boundary-minimum': 'boundary-minimum',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      'null-optional': 'null-optional',
      populated: 'populated',
      'unbroken-token': 'unbroken-token',
    });
    requireStateValue(context, 'permissions', 'admin');
    requireStateValue(context, 'interactions', 'default');
    const system = requireStateValueFromMap(context, 'system', {
      idle: 'idle',
      'initial-loading': 'initial-loading',
      loading: 'loading',
      'panel-error': 'panel-error',
    });
    const dialogPhase = resolveDeclaredVariant<
      | 'closed'
      | 'create-fallback'
      | 'create-resolved'
      | 'edit-fallback'
      | 'edit-resolved'
      | 'delete-fallback'
      | 'delete-resolved'
    >(context, 'dialog-phase', {
      closed: 'closed',
      'create-fallback': 'create-fallback',
      'create-resolved': 'create-resolved',
      'edit-fallback': 'edit-fallback',
      'edit-resolved': 'edit-resolved',
      'delete-fallback': 'delete-fallback',
      'delete-resolved': 'delete-resolved',
    });
    const panelPhase = resolveDeclaredVariant<'fallback' | 'resolved'>(
      context,
      'panel-phase',
      { fallback: 'fallback', resolved: 'resolved' },
    );
    const selection = resolveDeclaredVariant<'none' | 'selected'>(context, 'selection', {
      none: 'none',
      selected: 'selected',
    });
    const theme = resolveDeclaredVariant<'dark'>(context, 'theme', { dark: 'dark' });
    const variantNames = Object.keys(context.variants);
    const dialogOpen = dialogPhase !== 'closed';
    const fallbackCanonical = panelPhase === 'fallback'
      && data === 'empty'
      && system === 'idle'
      && selection === 'none'
      && !dialogOpen;
    const dialogCanonical = panelPhase === 'resolved'
      && data === 'maximum-supported'
      && system === 'idle'
      && selection === 'selected';

    if (
      variantNames.length !== 4
      || !variantNames.includes('dialog-phase')
      || !variantNames.includes('panel-phase')
      || !variantNames.includes('selection')
      || !variantNames.includes('theme')
      || (panelPhase === 'fallback' && !fallbackCanonical)
      || (dialogOpen && !dialogCanonical)
    ) {
      throw new Error(
        `지원하지 않는 Admin stadiums runtime state: ${data}:${system}:${panelPhase}:${dialogPhase}:${selection}`,
      );
    }

    let panelAdapter: ComponentStateAdapterResult;
    try {
      panelAdapter = adapters['admin.stadiums-panel']({
        componentId: 'src/components/admin/AdminStadiumsPanel.tsx#AdminStadiumsPanel',
        states: context.states,
        variants: { selection, theme },
      });
    } catch {
      throw new Error(
        `지원하지 않는 Admin stadiums runtime state: ${data}:${system}:${panelPhase}:${dialogPhase}:${selection}`,
      );
    }

    const panelProps = panelAdapter.props as unknown as ComponentProps<
      typeof AdminStadiumsPanelComponent
    >;
    const selectedPlace = panelProps.places[0];
    const dialogMode = dialogPhase.startsWith('create')
      ? 'create'
      : dialogPhase.startsWith('edit')
        ? 'edit'
        : dialogPhase.startsWith('delete')
          ? 'delete'
          : null;

    if (dialogOpen && selectedPlace === undefined) {
      throw new Error(
        `지원하지 않는 Admin stadiums runtime state: ${data}:${system}:${panelPhase}:${dialogPhase}:${selection}`,
      );
    }

    const placeForm: PlaceFormData = dialogMode === 'create' || selectedPlace === undefined
      ? {
          name: '',
          category: '',
          description: '',
          address: '',
          phone: '',
          lat: 0,
          lng: 0,
          rating: undefined,
          openTime: '',
          closeTime: '',
        }
      : {
          name: selectedPlace.name,
          category: selectedPlace.category,
          description: selectedPlace.description ?? '',
          address: selectedPlace.address ?? '',
          phone: selectedPlace.phone ?? '',
          lat: selectedPlace.lat,
          lng: selectedPlace.lng,
          rating: selectedPlace.rating,
          openTime: selectedPlace.openTime ?? '',
          closeTime: selectedPlace.closeTime ?? '',
        };

    return {
      props: {
        visualQaStateOverride: {
          panelPhase,
          dialogPhase: dialogPhase === 'closed'
            ? 'closed'
            : dialogPhase.endsWith('fallback')
              ? 'fallback'
              : 'resolved',
          stadiums: panelProps.stadiums,
          stadiumsLoading: panelProps.stadiumsLoading,
          selectedStadiumId: panelProps.selectedStadiumId,
          places: panelProps.places,
          placesLoading: panelProps.placesLoading,
          stadiumError: panelProps.stadiumError,
          placeDialog: dialogMode === 'create'
            ? 'create'
            : dialogMode === 'edit'
              ? selectedPlace
              : null,
          placeForm,
          placeSubmitting: false,
          deletingPlaceId: dialogMode === 'delete' ? selectedPlace?.id ?? null : null,
        },
        visualQaRenderers: {
          panel: (props: ComponentProps<typeof AdminStadiumsPanelComponent>) => (
            renderVisualQaStadiumsLazyChild(
              createElement(VisualQaAdminStadiumsPanel, props),
              '구장 관리 패널 로딩 중...',
            )
          ),
          placeDialog: (props: ComponentProps<typeof AdminPlaceDialogContentComponent>) => (
            renderVisualQaStadiumsLazyChild(
              createElement(VisualQaAdminPlaceDialogContent, props),
              '장소 편집 창 로딩 중...',
            )
          ),
          deleteDialog: (
            props: ComponentProps<typeof AdminDeletePlaceDialogContentComponent>,
          ) => renderVisualQaStadiumsLazyChild(
            createElement(VisualQaAdminDeletePlaceDialogContent, props),
            '장소 삭제 창 로딩 중...',
          ),
        },
      },
      captureSelector: dialogOpen
        ? '[role="dialog"]'
        : '[data-testid="admin-stadiums-runtime"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none',
      theme,
    };
  },
  'admin.game-status-repair-panel': (context) => {
    const declaredData = new Set<VisualQaAdminGameStatusData>([
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
    const declaredSystem = new Set<VisualQaAdminGameStatusSystem>([
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
    const requestedData = context.states.data as VisualQaAdminGameStatusData | undefined;
    const requestedSystem = context.states.system as VisualQaAdminGameStatusSystem | undefined;

    if (!requestedData || !declaredData.has(requestedData)
      || !requestedSystem || !declaredSystem.has(requestedSystem)) {
      throw new Error(
        `지원하지 않는 Admin game-status repair state: ${requestedData ?? '<missing>'}:${requestedSystem ?? '<missing>'}`,
      );
    }

    requireStateValue(context, 'permissions', 'admin');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      hover: 'hover',
      'focus-visible': 'focus-visible',
      pressed: 'pressed',
      input: 'input',
      'keyboard-navigation': 'keyboard-navigation',
    });
    resolveDeclaredVariant(context, 'active', { active: 'active' });
    const theme = resolveDeclaredVariant<'dark'>(context, 'theme', { dark: 'dark' });
    const targetId = context.interactionTargetId;
    const actionTargets = new Set([
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
      'history-ticket-link',
      'load-history',
      'mark-done',
      'refresh-suggestions',
      'save',
      'suggestion',
      'ticket-clear',
      'ticket-link',
    ]);
    const formTargets = new Set([
      'start-date',
      'end-date',
      'ticket-url',
      'ticket-assignee',
      'ticket-status',
      'ticket-note',
    ]);
    const pressedTargets = new Set(actionTargets);
    pressedTargets.delete('ticket-link');
    pressedTargets.delete('history-ticket-link');
    const inputTargets = new Set([
      'start-date',
      'end-date',
      'ticket-url',
      'ticket-assignee',
      'ticket-note',
    ]);
    const canonicalInteraction = requestedData === 'maximum-supported'
      && requestedSystem === 'idle';
    const validInteraction = interaction === 'default'
      ? targetId === undefined
      : canonicalInteraction && (
        interaction === 'hover'
          ? actionTargets.has(targetId ?? '')
          : interaction === 'pressed'
            ? pressedTargets.has(targetId ?? '')
          : interaction === 'focus-visible'
            ? actionTargets.has(targetId ?? '') || formTargets.has(targetId ?? '')
            : interaction === 'input'
              ? inputTargets.has(targetId ?? '')
              : targetId === 'ticket-status'
      );

    if (!validInteraction || Object.keys(context.variants).length !== 2) {
      throw new Error(
        `지원하지 않는 Admin game-status repair state: ${requestedData}:${requestedSystem}:${interaction}:${targetId ?? '<none>'}`,
      );
    }

    return {
      props: {
        active: true,
        visualQaStateOverride: buildVisualQaAdminGameStatusState(
          requestedData,
          requestedSystem,
        ),
      },
      captureSelector: '[data-testid="admin-game-status-panel"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none',
      theme,
    };
  },
  'admin.ai-release-decision-runtime': (context) => {
    const data = requireStateValueFromMap<VisualQaReleaseDecisionData>(context, 'data', {
      empty: 'empty',
      go: 'go',
      'no-go': 'no-go',
      pending: 'pending',
      'long-korean': 'long-korean',
      'unbroken-token': 'unbroken-token',
      'maximum-supported': 'maximum-supported',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      hover: 'hover',
      'focus-visible': 'focus-visible',
      pressed: 'pressed',
      input: 'input',
      'keyboard-navigation': 'keyboard-navigation',
    });
    const system = requireStateValueFromMap<VisualQaReleaseDecisionSystem>(context, 'system', {
      idle: 'idle',
      'presets-loading': 'presets-loading',
      'presets-error': 'presets-error',
      'eval-cases-loading': 'eval-cases-loading',
      'eval-cases-error': 'eval-cases-error',
      'artifacts-loading': 'artifacts-loading',
      'artifacts-error': 'artifacts-error',
      'draft-loading': 'draft-loading',
      'draft-error': 'draft-error',
      'evaluation-loading': 'evaluation-loading',
      'evaluation-error': 'evaluation-error',
      'save-loading': 'save-loading',
      'save-error': 'save-error',
      'save-success': 'save-success',
      'artifact-load-loading': 'artifact-load-loading',
      'artifact-markdown-loading': 'artifact-markdown-loading',
      'artifact-json-loading': 'artifact-json-loading',
    });
    const artifactsVariant = resolveDeclaredVariant<'empty' | 'single' | 'maximum'>(context, 'artifacts', {
      empty: 'empty',
      single: 'single',
      maximum: 'maximum',
    });
    const copy = resolveDeclaredVariant<'idle' | 'done' | 'error'>(context, 'copy', {
      idle: 'idle',
      done: 'done',
      error: 'error',
    });
    const evaluationVariant = resolveDeclaredVariant<'absent' | 'pass' | 'fail'>(context, 'evaluation', {
      absent: 'absent',
      pass: 'pass',
      fail: 'fail',
    });
    const loadedVariant = resolveDeclaredVariant<'absent' | 'present'>(context, 'loaded', {
      absent: 'absent',
      present: 'present',
    });
    const theme = resolveDeclaredVariant<'dark'>(context, 'theme', { dark: 'dark' });
    const targetId = context.interactionTargetId;
    const allTargets = new Set([
      'refresh-presets',
      'scenario',
      'task-prompt',
      'seed-paths',
      'allowed-roots',
      'generate-draft',
      'refresh-eval-cases',
      'eval-case',
      'run-eval',
      'refresh-artifacts',
      'artifact-load',
      'artifact-markdown',
      'artifact-json',
      'copy-markdown',
      'save-artifact',
    ]);
    const pressedTargets = new Set(allTargets);
    pressedTargets.delete('scenario');
    pressedTargets.delete('eval-case');
    const inputTargets = new Set(['task-prompt', 'seed-paths', 'allowed-roots']);
    const selectedTargets = new Set(['scenario', 'eval-case']);
    const canonical = data === 'go'
      && system === 'idle'
      && artifactsVariant === 'single'
      && copy === 'idle'
      && evaluationVariant === 'pass'
      && loadedVariant === 'present';
    const validInteraction = interaction === 'default'
      ? targetId === undefined
      : canonical && (
        (interaction === 'hover' || interaction === 'focus-visible')
          ? allTargets.has(targetId ?? '')
          : interaction === 'pressed'
            ? pressedTargets.has(targetId ?? '')
            : interaction === 'input'
              ? inputTargets.has(targetId ?? '')
              : selectedTargets.has(targetId ?? '')
      );
    const hasDraft = data !== 'empty';
    const artifactAction = system === 'artifact-load-loading'
      || system === 'artifact-markdown-loading'
      || system === 'artifact-json-loading';
    const invalidContentCombination = !hasDraft && (
      evaluationVariant !== 'absent'
      || copy !== 'idle'
      || loadedVariant !== 'absent'
      || system === 'evaluation-loading'
      || system === 'save-loading'
      || system === 'save-success'
    );
    if (!validInteraction || invalidContentCombination || (artifactAction && artifactsVariant === 'empty')) {
      throw new Error(
        `지원하지 않는 Release decision state: ${data}:${system}:${artifactsVariant}:${copy}:${evaluationVariant}:${loadedVariant}:${interaction}:${targetId ?? '<none>'}`,
      );
    }

    const text = visualQaReleaseCopy(data);
    const decision = visualQaReleaseDecision(data);
    const maximumCount = data === 'maximum-supported' ? 50 : 1;
    const draft = hasDraft
      ? makeVisualQaReleaseDraft(data as Exclude<VisualQaReleaseDecisionData, 'empty'>, text)
      : null;
    const primaryCase = makeVisualQaReleaseEvalCase('MOCK-CASE-1', text, decision, maximumCount);
    const secondaryCase = makeVisualQaReleaseEvalCase(
      'MOCK-CASE-2',
      '비생산 Visual QA 보조 평가 케이스',
      'PENDING',
    );
    const evaluation = evaluationVariant === 'absent'
      ? null
      : {
        case: primaryCase,
        evaluation: {
          case_id: primaryCase.case_id,
          status: evaluationVariant === 'pass' ? 'PASS' as const : 'FAIL' as const,
          decision_ok: evaluationVariant === 'pass',
          keyword_hits: Object.fromEntries(primaryCase.required_keywords.map((item) => [
            item,
            evaluationVariant === 'pass',
          ])),
          source_hits: Object.fromEntries(primaryCase.required_sources.map((item) => [
            item,
            evaluationVariant === 'pass',
          ])),
          missing_keywords: evaluationVariant === 'fail' ? primaryCase.required_keywords : [],
          missing_sources: evaluationVariant === 'fail' ? primaryCase.required_sources : [],
        },
      };
    const artifactCount = artifactsVariant === 'maximum' ? 50 : artifactsVariant === 'single' ? 1 : 0;
    const artifacts = Array.from(
      { length: artifactCount },
      (_, index) => makeVisualQaReleaseArtifact(index + 1, text),
    );
    const loadedArtifact = loadedVariant === 'present' && draft
      ? {
        artifact_id: 'MOCK-ARTIFACT-1',
        saved_at_utc: '2026-08-28T00:02:00Z',
        scenario: visualQaReleaseScenario,
        task_prompt: draft.result.task_prompt,
        seed_paths: draft.result.seed_paths,
        allowed_roots: ['docs/visual-qa'],
        draft_response: draft.result,
        markdown: draft.markdown,
        evaluation,
      }
      : null;
    const errorCopy = data === 'long-korean' || data === 'unbroken-token'
      ? text
      : '비생산 Visual QA 요청을 처리하지 못했습니다.';
    const visualQaStateOverride = {
      releasePresets: [
        makeVisualQaReleasePreset(visualQaReleaseScenario, text, maximumCount),
        makeVisualQaReleasePreset(
          visualQaReleaseSecondaryScenario,
          '비생산 Visual QA 보조 프리셋',
        ),
      ],
      releasePresetsLoading: system === 'presets-loading',
      releaseSelectedScenario: visualQaReleaseScenario,
      releaseTaskPrompt: text,
      releaseSeedPathsInput: Array.from(
        { length: maximumCount },
        (_, index) => `docs/visual-qa/seed-${index + 1}.md`,
      ).join('\n'),
      releaseAllowedRootsInput: Array.from(
        { length: maximumCount },
        (_, index) => `reports/visual-qa/root-${index + 1}`,
      ).join('\n'),
      releaseDraftResult: draft,
      releaseDraftLoading: system === 'draft-loading',
      releaseDraftError: system === 'presets-error' || system === 'draft-error' ? errorCopy : null,
      releaseCopyState: copy,
      releaseEvalCases: [primaryCase, secondaryCase],
      releaseEvalCasesLoading: system === 'eval-cases-loading',
      releaseSelectedCaseId: primaryCase.case_id,
      releaseEvaluationResult: evaluation,
      releaseEvaluationLoading: system === 'evaluation-loading',
      releaseEvaluationError: system === 'eval-cases-error' || system === 'evaluation-error'
        ? errorCopy
        : null,
      releaseArtifacts: artifacts,
      releaseArtifactsLoading: system === 'artifacts-loading',
      releaseArtifactsError: system === 'artifacts-error' ? errorCopy : null,
      releaseLoadedArtifact: loadedArtifact,
      releaseSaveLoading: system === 'save-loading',
      releaseSaveMessage: system === 'save-success'
        ? `비생산 Visual QA 아티팩트가 저장되었습니다: MOCK-ARTIFACT-1 · ${errorCopy}`
        : null,
      releaseSaveError: system === 'save-error'
        ? hasDraft ? errorCopy : '저장할 초안을 먼저 생성하세요.'
        : null,
      releaseArtifactAction: system === 'artifact-load-loading'
        ? { artifactId: 'MOCK-ARTIFACT-1', mode: 'load' }
        : system === 'artifact-markdown-loading'
          ? { artifactId: 'MOCK-ARTIFACT-1', mode: 'markdown' }
          : system === 'artifact-json-loading'
            ? { artifactId: 'MOCK-ARTIFACT-1', mode: 'json' }
            : null,
    };

    return {
      props: {
        autoBriefPanel: createElement(
          'section',
          {
            className: 'min-w-0 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 text-caption text-slate-300 [overflow-wrap:anywhere]',
            'data-testid': 'visual-qa-release-auto-brief-panel',
          },
          '비생산 Visual QA Coach Auto Brief 경계 fixture',
        ),
        visualQaStateOverride,
      },
      captureSelector: '[data-testid="admin-ai-release-decision-runtime"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none',
      theme,
    };
  },
  'admin.coach-auto-brief-ops-panel': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      pass: 'pass',
      warn: 'warn',
      fail: 'fail',
      'long-korean': 'long-korean',
      'unbroken-token': 'unbroken-token',
      'maximum-supported': 'maximum-supported',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      hover: 'hover',
      'focus-visible': 'focus-visible',
      pressed: 'pressed',
    });
    const system = requireStateValueFromMap(context, 'system', {
      idle: 'idle',
      loading: 'loading',
      'error-503': 'error-503',
    });
    const copy = resolveDeclaredVariant<'idle' | 'done' | 'error'>(context, 'copy', {
      idle: 'idle',
      done: 'done',
      error: 'error',
    });
    const selectedWindow = resolveDeclaredVariant<'today' | 'tomorrow' | 'custom'>(context, 'window', {
      today: 'today',
      tomorrow: 'tomorrow',
      custom: 'custom',
    });
    const theme = resolveDeclaredVariant<'dark'>(context, 'theme', { dark: 'dark' });
    const targetId = context.interactionTargetId;
    const expectedTargets = selectedWindow === 'custom'
      ? new Set(['start-date', 'end-date', 'apply-custom'])
      : new Set(['refresh', 'window', 'copy-command']);
    if (interaction === 'pressed') {
      expectedTargets.delete('window');
    }
    const validInteraction = interaction === 'default'
      ? targetId === undefined
      : data === 'pass'
        && system === 'idle'
        && copy === 'idle'
        && expectedTargets.has(targetId ?? '');
    if (!validInteraction) {
      throw new Error(
        `지원하지 않는 Coach auto brief ops state: ${data}:${system}:${selectedWindow}:${copy}:${interaction}:${targetId ?? '<none>'}`,
      );
    }

    const pressure = data === 'long-korean'
      ? '가장 좁은 관리자 모바일 화면에서도 운영 상태와 오류 원인, 권장 명령, 최근 경기 설명이 카드 경계를 벗어나지 않고 자연스럽게 여러 줄로 표시되어야 합니다.'.repeat(4)
      : data === 'unbroken-token'
        ? `OPS-${'X'.repeat(260)}`
        : null;
    const maximum = data === 'maximum-supported';
    const count = maximum ? Number.MAX_SAFE_INTEGER : data === 'empty' ? 0 : 3;
    const verdict = data === 'fail'
      ? 'FAIL'
      : data === 'warn' || pressure
        ? 'WARN'
        : 'PASS';
    const unresolvedCount = maximum ? 50 : data === 'fail' || data === 'warn' || pressure ? 3 : 0;
    const cacheStates = ['FAILED_LOCKED', 'PENDING_WAIT', 'FAILED', 'MISSING', 'UNKNOWN'];
    const qualityStates = ['grounded', 'partial', 'insufficient', 'unknown'];
    const unresolvedTargets = Array.from({ length: unresolvedCount }, (_, index) => ({
      game_id: `MOCK-GAME-${index + 1}`,
      game_date: '2026-08-28',
      away_team_id: `MOCK-AWAY-${index + 1}`,
      home_team_id: `MOCK-HOME-${index + 1}`,
      stage_label: pressure ?? `mock-stage-${index + 1}`,
      game_status_bucket: pressure ?? 'MOCK_STATUS',
      cache_key: pressure ? `${pressure}-${index + 1}` : `mock:coach:auto-brief:${index + 1}`,
      cache_state: cacheStates[index % cacheStates.length],
      data_quality: qualityStates[index % qualityStates.length],
      headline: pressure ?? `비운영 Visual QA 경기 ${index + 1}`,
      reason: pressure ?? (data === 'fail' ? '운영 gate 실패 fixture' : '검토 필요 fixture'),
    }));
    const health = data === 'empty'
      ? null
      : {
        window: selectedWindow,
        date_window: pressure ?? (selectedWindow === 'custom' ? '2026-08-01..2026-08-31' : '2026-08-28'),
        generated_at_utc: '2026-08-28T00:00:00Z',
        runbook_path: pressure ?? 'task/operations/coach-auto-brief-prewarm-runbook.md',
        recommended_command: pressure ?? 'python scripts/mock-coach-auto-brief.py --window today',
        summary: {
          loaded_target_count: count,
          selected_target_count: count,
          generated_success_count: verdict === 'PASS' ? count : 0,
          cache_hit_count: verdict === 'PASS' ? count : 0,
          in_progress_count: verdict === 'WARN' ? count : 0,
          failed_count: verdict === 'FAIL' ? count : 0,
          unresolved_count: maximum ? Number.MAX_SAFE_INTEGER : unresolvedCount,
          completed_count: verdict === 'PASS' ? count : 0,
          cache_state_breakdown: {
            FAILED_LOCKED: verdict === 'FAIL' ? count : 0,
            PENDING_WAIT: verdict === 'WARN' ? count : 0,
          },
          data_quality_breakdown: {
            grounded: verdict === 'PASS' ? count : 0,
            insufficient: verdict === 'FAIL' ? count : 0,
          },
        },
        gate: {
          verdict,
          thresholds: {
            max_unresolved: maximum ? Number.MAX_SAFE_INTEGER : 0,
            max_failed_locked: maximum ? Number.MAX_SAFE_INTEGER : 0,
            max_pending_wait: maximum ? Number.MAX_SAFE_INTEGER : 0,
            max_insufficient_ratio: 0.1,
            min_selected_targets: maximum ? Number.MAX_SAFE_INTEGER : 1,
            fail_on_missing_report: true,
          },
          failed_locked_count: verdict === 'FAIL' ? count : 0,
          pending_wait_count: verdict === 'WARN' ? count : 0,
          insufficient_count: verdict === 'FAIL' ? count : 0,
          insufficient_ratio: verdict === 'FAIL' ? 1 : verdict === 'WARN' ? 0.5 : 0,
          checks: {
            failed: verdict === 'FAIL' ? [pressure ?? 'FAILED_LOCKED 상태가 기준을 초과했습니다.'] : [],
            warnings: verdict === 'WARN' ? [pressure ?? 'PENDING_WAIT 상태를 다시 확인하세요.'] : [],
          },
        },
        unresolved_targets: unresolvedTargets,
        latest_report: data === 'warn'
          ? null
          : {
            path: pressure ?? 'reports/mock-coach-auto-brief.json',
            run_started_at: '2026-08-28T00:00:00Z',
            run_finished_at: '2026-08-28T00:01:00Z',
            date_window: pressure ?? '2026-08-28',
            unresolved_count: maximum ? Number.MAX_SAFE_INTEGER : unresolvedCount,
            completed_count: count,
            cache_state_breakdown: {},
            data_quality_breakdown: {},
          },
      };
    const noop = () => undefined;

    return {
      props: {
        health,
        loading: system === 'loading',
        error: system === 'error-503'
          ? '503 · Coach auto brief 운영 상태를 불러오지 못했습니다.'
          : null,
        selectedWindow,
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        commandCopyState: copy,
        onWindowChange: noop,
        onStartDateChange: noop,
        onEndDateChange: noop,
        onRefresh: noop,
        onApplyCustomWindow: noop,
        onCopyCommand: noop,
      },
      captureSelector: '[data-testid="admin-coach-auto-brief-ops-panel"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none',
      theme,
    };
  },
  'admin.stat-card': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      zero: 'zero',
      single: 'single',
      negative: 'negative',
      'maximum-supported': 'maximum-supported',
      'long-korean': 'long-korean',
      'unbroken-token': 'unbroken-token',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      hover: 'hover',
    });
    const color = resolveDeclaredVariant<'amber' | 'emerald' | 'sky'>(context, 'color', {
      amber: 'amber',
      emerald: 'emerald',
      sky: 'sky',
    });
    const frame = resolveDeclaredVariant<'animated-initial' | 'animated-midpoint' | 'animated-settled' | 'static'>(context, 'frame', {
      static: 'static',
      'animated-initial': 'animated-initial',
      'animated-midpoint': 'animated-midpoint',
      'animated-settled': 'animated-settled',
    });
    const theme = resolveDeclaredVariant<'dark'>(context, 'theme', { dark: 'dark' });
    const targetId = context.interactionTargetId;
    const validInteraction = interaction === 'default'
      ? targetId === undefined
      : data === 'single' && color === 'amber' && frame === 'static' && targetId === 'card';
    if (!validInteraction) {
      throw new Error(`지원하지 않는 StatCard state: ${data}:${color}:${frame}:${interaction}:${targetId ?? '<none>'}`);
    }
    const value = data === 'zero'
      ? 0
      : data === 'negative'
        ? -1_000
        : data === 'maximum-supported'
          ? Number.MAX_SAFE_INTEGER
          : 1_000;
    const label = data === 'long-korean'
      ? '가장 좁은 관리자 모바일 통계 카드에서도 아이콘과 숫자를 밀어내지 않고 자연스럽게 여러 줄로 표시되어야 하는 매우 긴 한국어 지표 이름'
      : data === 'unbroken-token'
        ? `LABEL-${'L'.repeat(260)}`
        : '전체 사용자';
    const normalizedValue = Math.floor(value);
    const visualQaDisplayValueOverride = frame === 'animated-initial'
      ? 0
      : frame === 'animated-midpoint'
        ? Math.floor(normalizedValue * 0.9375)
        : frame === 'animated-settled'
          ? normalizedValue
          : undefined;

    return {
      props: {
        animate: frame !== 'static',
        color,
        icon: VisualQaAdminStatIcon,
        label,
        testId: 'visual-qa-admin-stat-card',
        value,
        visualQaDisplayValueOverride,
      },
      captureSelector: '[data-testid="visual-qa-admin-stat-card"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-slate-950 p-4 text-slate-100 shadow-none',
      theme,
    };
  },
  'admin.status-badge': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      pass: 'pass',
      fail: 'fail',
      warn: 'warn',
      go: 'go',
      'no-go': 'no-go',
      pending: 'pending',
      'in-review': 'in-review',
      resolved: 'resolved',
      closed: 'closed',
      draft: 'draft',
      requested: 'requested',
      'in-progress': 'in-progress',
      done: 'done',
      unknown: 'unknown',
      'explicit-long-korean': 'explicit-long-korean',
      'explicit-unbroken': 'explicit-unbroken',
    });
    const size = resolveDeclaredVariant<'md' | 'sm' | 'xs'>(context, 'size', {
      xs: 'xs',
      sm: 'sm',
      md: 'md',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const status = ({
      pass: 'PASS',
      fail: 'FAIL',
      warn: 'WARN',
      go: 'GO',
      'no-go': 'NO_GO',
      pending: 'PENDING',
      'in-review': 'IN_REVIEW',
      resolved: 'RESOLVED',
      closed: 'CLOSED',
      draft: 'DRAFT',
      requested: 'REQUESTED',
      'in-progress': 'IN_PROGRESS',
      done: 'DONE',
      unknown: 'NOT_A_REAL_STATUS',
      'explicit-long-korean': 'IN_PROGRESS',
      'explicit-unbroken': 'IN_PROGRESS',
    } as const)[data];
    const label = data === 'explicit-long-korean'
      ? '가장 좁은 관리자 모바일 패널에서도 상태 배지가 주변 요소를 가리지 않도록 안전하게 생략되어야 하는 매우 긴 한국어 상태 이름'
      : data === 'explicit-unbroken'
        ? `STATUS-${'S'.repeat(260)}`
        : undefined;

    return {
      props: {
        status,
        label,
        size,
        testId: 'visual-qa-admin-status-badge',
      },
      captureSelector: '[data-testid="visual-qa-admin-status-badge"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-4 shadow-none',
      theme,
    };
  },
  'admin.page-route': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      loading: 'loading',
      single: 'single',
    });
    requireStateValueFromMap(context, 'permissions', {
      admin: 'admin',
      'super-admin': 'super-admin',
    });
    requireStateValue(context, 'interactions', 'default');
    const runtimeOverride = data === 'loading'
      ? createElement(
        'div',
        {
          className: 'min-h-screen bg-slate-950 px-4 py-8 text-slate-100',
          'data-testid': 'admin-page-route-fallback',
        },
        createElement(
          'div',
          { className: 'rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-10 text-center text-caption text-slate-300' },
          '관리자 화면을 준비하고 있습니다.',
        ),
      )
      : createElement(
        'div',
        {
          className: 'min-h-screen bg-slate-950 px-4 py-8 text-slate-100',
          'data-testid': 'admin-page-route-resolved',
        },
        '관리자 화면이 준비되었습니다.',
      );
    return {
      props: { runtimeOverride },
      captureSelector: data === 'loading'
        ? '[data-testid="admin-page-route-fallback"]'
        : '[data-testid="admin-page-route-resolved"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-slate-950 p-0 shadow-none',
      theme: 'dark',
    };
  },
  'admin.route': (context) => {
    const permission = requireStateValueFromMap(context, 'permissions', {
      admin: 'admin',
      anonymous: 'anonymous',
      'super-admin': 'super-admin',
      user: 'user',
    });
    const role = permission === 'admin'
      ? 'ROLE_ADMIN'
      : permission === 'super-admin'
        ? 'ROLE_SUPER_ADMIN'
        : permission === 'user'
          ? 'ROLE_USER'
          : undefined;
    const isAllowed = permission === 'admin' || permission === 'super-admin';
    const isAnonymous = permission === 'anonymous';
    const accessOverride = isAnonymous
      ? { isLoggedIn: false }
      : { isLoggedIn: true, userRole: role };
    const outletOverride = isAllowed
      ? createElement(
        'div',
        {
          className: 'min-w-0 break-words rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-emerald-300 [overflow-wrap:anywhere]',
          'data-testid': 'admin-route-outlet',
          role: 'status',
        },
        permission === 'super-admin'
          ? '슈퍼 관리자 권한으로 관리자 화면에 진입했습니다.'
          : '관리자 권한으로 관리자 화면에 진입했습니다.',
      )
      : undefined;
    const companion = isAllowed
      ? undefined
      : createElement(
        'div',
        {
          className: 'min-w-0 break-words rounded-xl border border-slate-700 bg-slate-900 p-4 text-center text-slate-200 [overflow-wrap:anywhere]',
          'data-testid': 'admin-route-redirect-outcome',
          role: 'status',
        },
        isAnonymous
          ? '로그인이 필요하여 로그인 화면으로 이동했습니다.'
          : '관리자 권한이 없어 첫 화면으로 이동했습니다.',
      );
    return {
      props: { accessOverride, outletOverride },
      captureSelector: isAllowed
        ? '[data-testid="admin-route-outlet"]'
        : '[data-testid="admin-route-redirect-outcome"]',
      companion,
      expectedHash: isAllowed ? '#release' : '',
      expectedPathname: isAllowed ? '/admin' : isAnonymous ? '/login' : '/',
      expectedSearch: isAllowed
        ? '?tab=ai'
        : isAnonymous
          ? '?redirect=%2Fadmin%3Ftab%3Dai%23release'
          : '',
      initialPathname: '/admin?tab=ai#release',
      semanticHost: 'admin-route',
      surfaceClassName: 'flex min-h-48 w-[320px] max-w-none overflow-visible bg-slate-950 p-4 shadow-none',
      theme: 'dark',
    };
  },
  'admin.runtime-content': (context) => {
    const copy = requireStateValueFromMap(context, 'data', {
      loading: '관리 데이터 로딩 중...',
      single: '선택한 관리자 패널',
      'long-korean': '선택한 관리자 패널의 운영 안내와 작업 상태가 모바일에서도 탭이나 카드 바깥으로 넘치지 않아야 합니다.',
      'unbroken-token': `ADMIN-PANEL-${'UNBROKEN'.repeat(26)}`,
    });
    requireStateValueFromMap(context, 'permissions', {
      admin: 'admin',
      'super-admin': 'super-admin',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
      selected: 'selected',
    });
    const activeTab = resolveDeclaredVariant(context, 'active-tab', {
      ai: 'ai',
      clientErrors: 'clientErrors',
      gameStatus: 'gameStatus',
      offseason: 'offseason',
      parties: 'parties',
      posts: 'posts',
      reports: 'reports',
      seatViews: 'seatViews',
      stadiums: 'stadiums',
      users: 'users',
    });
    const nextTab = {
      ai: 'users',
      clientErrors: 'seatViews',
      gameStatus: 'clientErrors',
      offseason: 'stadiums',
      parties: 'reports',
      posts: 'parties',
      reports: 'gameStatus',
      seatViews: 'offseason',
      stadiums: 'ai',
      users: 'posts',
    }[activeTab];
    if (interaction !== 'default') {
      const expectedTarget = interaction === 'selected' ? `select-${nextTab}` : activeTab;
      if (context.interactionTargetId !== expectedTarget) {
        throw new Error(`지원하지 않는 Visual QA admin tab target: ${context.interactionTargetId ?? '<missing>'}`);
      }
    }
    return {
      props: {
        dataRuntimeOverride: createElement(
          'div',
          {
            className: 'min-w-0 break-words p-4 text-slate-200 [overflow-wrap:anywhere]',
            'data-testid': 'admin-runtime-panel-probe',
          },
          copy,
        ),
        initialActiveTabOverride: activeTab,
      },
      captureSelector: '[data-testid="admin-runtime-content"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-slate-950 p-4 shadow-none',
      theme: 'dark',
    };
  },
  'admin.data-runtime': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      zero: 'zero',
      single: 'single',
      'maximum-supported': 'maximum-supported',
      'long-korean': 'long-korean',
      'unbroken-token': 'unbroken-token',
      'error-503': 'error-503',
    });
    requireStateValueFromMap(context, 'permissions', {
      admin: 'admin',
      'super-admin': 'super-admin',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      hover: 'hover',
    });
    if (
      interaction === 'hover'
      && !new Set(['users-stat', 'posts-stat', 'mates-stat']).has(context.interactionTargetId ?? '')
    ) {
      throw new Error(`지원하지 않는 Visual QA admin stat target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    const activeTab = resolveDeclaredVariant(context, 'active-tab', {
      ai: 'ai',
      clientErrors: 'clientErrors',
      gameStatus: 'gameStatus',
      offseason: 'offseason',
      parties: 'parties',
      posts: 'posts',
      reports: 'reports',
      seatViews: 'seatViews',
      stadiums: 'stadiums',
      users: 'users',
    });
    const panel = resolveDeclaredVariant(context, 'panel', {
      loading: 'loading',
      resolved: 'resolved',
    });
    const statsValue = data === 'zero'
      ? 0
      : data === 'maximum-supported'
        ? Number.MAX_SAFE_INTEGER
        : 128;
    const initialSuccessMessageOverride = data === 'long-korean'
      ? '관리 작업이 완료되었습니다. 변경된 운영 데이터와 통계가 모든 관리자 화면에 반영되었으며 필요한 후속 작업도 정상적으로 예약되었습니다.'
      : null;
    const initialErrorOverride = data === 'unbroken-token'
      ? `ADMIN-DATA-ERROR-${'UNBROKEN'.repeat(28)}`
      : null;
    const statsErrorOverride = data === 'error-503'
      ? '503: 관리자 통계 서비스를 현재 사용할 수 없습니다.'
      : null;
    return {
      props: {
        activeTab,
        animateStatsOverride: false,
        initialErrorOverride,
        initialSuccessMessageOverride,
        panelContentOverride: createElement(
          'div',
          {
            className: 'min-w-0 break-words rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-12 text-center text-slate-300 [overflow-wrap:anywhere]',
            'data-testid': `admin-${panel}-panel-probe`,
          },
          panel === 'loading' ? '관리 패널 로딩 중...' : `${activeTab} 관리 패널`,
        ),
        statsErrorOverride,
        statsOverride: {
          totalMates: statsValue,
          totalPosts: statsValue,
          totalUsers: statsValue,
        },
      },
      captureSelector: '[data-testid="admin-page-data-runtime"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-slate-950 p-4 shadow-none',
      theme: 'dark',
    };
  },
  'chatbot.floating-button': (context) => {
    requireStateValueFromMap(context, 'data', { single: 'single' });
    requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const className = resolveDeclaredVariant(context, 'placement', {
      'mate-raised': 'right-4 bottom-[calc(var(--mobile-content-safe-bottom)+2.25rem)]',
      regular: 'right-4 bottom-[var(--mobile-content-safe-bottom)]',
    });
    const compactOnMobile = resolveDeclaredVariant(context, 'size', {
      compact: true,
      large: false,
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: {
        ariaLabel: '챗봇 열기',
        className,
        compactOnMobile,
        onClick: () => {},
        testId: 'visual-qa-chatbot-floating-button',
      },
      surfaceClassName: 'relative block min-h-[844px] w-[320px] max-w-none overflow-hidden bg-background p-0 shadow-none',
      theme,
    };
  },
  'navbar.notification-controls': (context) => {
    const unreadCountOverride = requireStateValueFromMap(context, 'data', {
      negative: -1,
      zero: 0,
      single: 1,
      'boundary-maximum': 99,
      overflow: 100,
      'maximum-supported': Number.MAX_SAFE_INTEGER,
    });
    requireStateValue(context, 'permissions', 'user');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    if (
      interaction !== 'default'
      && context.interactionTargetId !== undefined
      && context.interactionTargetId !== 'trigger'
    ) {
      throw new Error(`지원하지 않는 Visual QA notification trigger target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    const openOverride = resolveDeclaredVariant(context, 'disclosure', {
      closed: false,
      open: true,
    });
    const panelProps = resolveDeclaredVariant(context, 'panel', {
      'resolved-empty': {
        notificationPanelPropsOverride: {
          browserPermissionOverride: 'granted',
          isLoggedInOverride: true,
          notificationsOverride: visualQaNotificationData.empty,
          nowOverride: visualQaNotificationNow,
        },
      },
      'resolved-long-korean': {
        notificationPanelPropsOverride: {
          browserPermissionOverride: 'default',
          isLoggedInOverride: true,
          notificationsOverride: visualQaNotificationData['long-korean'],
          nowOverride: visualQaNotificationNow,
        },
      },
      loading: {
        panelContentOverride: createElement(
          'div',
          {
            className: 'flex min-h-[300px] items-center justify-center px-4 text-center text-body text-muted-foreground',
            'data-testid': 'navbar-notification-panel-fallback',
          },
          '알림을 불러오는 중...',
        ),
      },
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: {
        buttonClassName: 'rounded-full bg-muted text-foreground',
        onOpenChangeOverride: () => {},
        openOverride,
        ...panelProps,
        unreadCountOverride,
      },
      captureSelector: openOverride
        ? '[data-testid="navbar-notification-popover"]'
        : '[data-testid="navbar-notification-trigger"]',
      surfaceClassName: 'relative flex min-h-[720px] w-[320px] max-w-none items-start justify-end overflow-hidden bg-background p-4 shadow-none',
      theme,
    };
  },
  'navbar.shell': (context) => {
    const profile = requireStateValueFromMap(context, 'data', {
      single: {
        userName: '비주얼 QA',
        userProfileImageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%2316a34a"/%3E%3C/svg%3E',
      },
      'long-korean': {
        userName: '모바일 내비게이션 계정 카드에서도 자연스럽게 여러 줄로 표시되어야 하는 매우 긴 한국어 사용자 이름',
        userProfileImageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%230ea5e9"/%3E%3C/svg%3E',
      },
      'unbroken-token': {
        userName: `NAVBAR-${'UNBROKEN'.repeat(28)}`,
        userProfileImageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%237c3aed"/%3E%3C/svg%3E',
      },
      'missing-image': {
        userName: '프로필 이미지 없음',
        userProfileImageUrl: null,
      },
      'broken-image': {
        userName: '프로필 이미지 오류',
        userProfileImageUrl: '/__visual-qa__/missing-navbar-profile.png',
      },
    });
    const permission = requireStateValueFromMap(context, 'permissions', {
      anonymous: { isLoggedIn: false, userRole: undefined },
      user: { isLoggedIn: true, userRole: 'ROLE_USER' },
      admin: { isLoggedIn: true, userRole: 'ROLE_ADMIN' },
      'super-admin': { isLoggedIn: true, userRole: 'ROLE_SUPER_ADMIN' },
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const shell = resolveDeclaredVariant(context, 'shell', {
      authenticated: 'authenticated',
      public: 'public',
    });
    const menu = resolveDeclaredVariant(context, 'menu', {
      closed: 'closed',
      entering: 'entering',
      exiting: 'exiting',
      open: 'open',
    });
    const route = resolveDeclaredVariant(context, 'route', {
      'cheer-deferred': 'cheer-deferred',
      mate: 'mate',
      prediction: 'prediction',
      regular: 'regular',
      stadium: 'stadium',
    });
    const unreadValues = {
      zero: 0,
      single: 1,
      'boundary-maximum': 99,
      overflow: 100,
      'maximum-supported': Number.MAX_SAFE_INTEGER,
    };
    const chatUnreadCount = resolveDeclaredVariant(context, 'chat-unread', unreadValues);
    const dmUnreadCount = resolveDeclaredVariant(context, 'dm-unread', unreadValues);
    const scroll = resolveDeclaredVariant(context, 'scroll', {
      scrolled: { compactProgress: 1, fastCompactProgress: 1, shrinkProgress: 1 },
      top: { compactProgress: 0, fastCompactProgress: 0, shrinkProgress: 0 },
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const menuState = {
      closed: {
        isMenuOpen: false,
        isMobileMenuMounted: false,
        isMobileMenuVisible: false,
      },
      entering: {
        isMenuOpen: true,
        isMobileMenuMounted: true,
        isMobileMenuVisible: false,
      },
      exiting: {
        isMenuOpen: false,
        isMobileMenuMounted: true,
        isMobileMenuVisible: false,
      },
      open: {
        isMenuOpen: true,
        isMobileMenuMounted: true,
        isMobileMenuVisible: true,
      },
    }[menu];
    const isTransition = menu === 'entering' || menu === 'exiting';
    const dataIsVisible = permission.isLoggedIn && menu === 'open';
    const chatUnreadIsVisible = shell === 'authenticated'
      && permission.isLoggedIn
      && (menu === 'open' || (menu === 'closed' && route !== 'cheer-deferred'));
    const dmUnreadIsVisible = shell === 'authenticated'
      && permission.isLoggedIn
      && menu === 'closed';
    const interactionIsCanonical = interaction === 'default' || (
      context.states.data === 'single'
      && chatUnreadCount === 0
      && dmUnreadCount === 0
      && !isTransition
      && context.variants.scroll === 'top'
    );
    const transitionIsCanonical = !isTransition || (
      context.states.data === 'single'
      && context.states.permissions === 'anonymous'
      && interaction === 'default'
      && shell === 'authenticated'
      && route === 'regular'
      && chatUnreadCount === 0
      && dmUnreadCount === 0
      && context.variants.scroll === 'top'
    );
    if (
      (!dataIsVisible && context.states.data !== 'single')
      || (!chatUnreadIsVisible && chatUnreadCount !== 0)
      || (!dmUnreadIsVisible && dmUnreadCount !== 0)
      || !interactionIsCanonical
      || !transitionIsCanonical
    ) {
      throw new Error(
        `지원하지 않는 Visual QA navbar state: ${context.states.data}:${context.states.permissions}:${interaction}:${shell}:${menu}:${route}:${context.variants['chat-unread']}:${context.variants['dm-unread']}:${context.variants.scroll}`,
      );
    }
    const pathname = route === 'cheer-deferred'
      ? '/cheer'
      : route === 'mate'
        ? '/mate'
        : route === 'prediction'
          ? '/prediction'
          : route === 'stadium'
            ? '/stadium'
            : '/mypage';
    return {
      props: {
        authenticatedShell: shell === 'authenticated',
        visualQaStateOverride: {
          chatUnreadCount,
          compactProgress: scroll.compactProgress,
          dmUnreadCount,
          fastCompactProgress: scroll.fastCompactProgress,
          isDesktop: false,
          isLoggedIn: permission.isLoggedIn,
          ...menuState,
          notificationUnreadCount: shell === 'authenticated' ? 100 : 0,
          shrinkProgress: scroll.shrinkProgress,
          userName: permission.isLoggedIn ? profile.userName : undefined,
          userProfileImageUrl: permission.isLoggedIn ? profile.userProfileImageUrl : undefined,
          userRole: permission.userRole,
          viewportFitProgress: 1,
        },
      },
      initialPathname: pathname,
      surfaceClassName: 'fixed inset-0 z-[100] block h-[844px] min-h-[844px] w-[320px] max-w-none overflow-hidden rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'public-navbar.shell': (context) => {
    const profile = requireStateValueFromMap(context, 'data', {
      single: {
        userName: '비주얼 QA',
        userProfileImageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%2316a34a"/%3E%3C/svg%3E',
      },
      'long-korean': {
        userName: '공개 모바일 내비게이션 계정 카드에서도 자연스럽게 여러 줄로 표시되어야 하는 매우 긴 한국어 사용자 이름',
        userProfileImageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%230ea5e9"/%3E%3C/svg%3E',
      },
      'unbroken-token': {
        userName: `PUBLIC-NAVBAR-${'UNBROKEN'.repeat(28)}`,
        userProfileImageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%237c3aed"/%3E%3C/svg%3E',
      },
      'missing-image': {
        userName: '프로필 이미지 없음',
        userProfileImageUrl: null,
      },
      'broken-image': {
        userName: '프로필 이미지 오류',
        userProfileImageUrl: '/__visual-qa__/missing-public-navbar-profile.png',
      },
    });
    const permission = requireStateValueFromMap(context, 'permissions', {
      anonymous: {
        isLoggedIn: false,
        userRole: undefined,
      },
      user: {
        isLoggedIn: true,
        userRole: 'ROLE_USER',
      },
      admin: {
        isLoggedIn: true,
        userRole: 'ROLE_ADMIN',
      },
      'super-admin': {
        isLoggedIn: true,
        userRole: 'ROLE_SUPER_ADMIN',
      },
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const menu = resolveDeclaredVariant(context, 'menu', {
      closed: 'closed',
      entering: 'entering',
      exiting: 'exiting',
      open: 'open',
    });
    const route = resolveDeclaredVariant(context, 'route', {
      'cheer-deferred': 'cheer-deferred',
      home: 'home',
      mate: 'mate',
      prediction: 'prediction',
      'public-standard': 'public-standard',
      stadium: 'stadium',
    });
    const isAuthBootstrapPending = resolveDeclaredVariant(context, 'auth', {
      'bootstrap-pending': true,
      settled: false,
    });
    const unreadValues = {
      zero: 0,
      single: 1,
      'boundary-maximum': 99,
      overflow: 100,
      'maximum-supported': Number.MAX_SAFE_INTEGER,
    };
    const dmUnreadCount = resolveDeclaredVariant(context, 'dm-unread', unreadValues);
    const notificationUnreadCount = resolveDeclaredVariant(
      context,
      'notification-unread',
      unreadValues,
    );
    const scroll = resolveDeclaredVariant(context, 'scroll', {
      scrolled: { compactProgress: 1, fastCompactProgress: 1, shrinkProgress: 1 },
      top: { compactProgress: 0, fastCompactProgress: 0, shrinkProgress: 0 },
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const menuState = {
      closed: {
        isMenuOpen: false,
        isMobileMenuMounted: false,
        isMobileMenuVisible: false,
      },
      entering: {
        isMenuOpen: true,
        isMobileMenuMounted: true,
        isMobileMenuVisible: false,
      },
      exiting: {
        isMenuOpen: false,
        isMobileMenuMounted: true,
        isMobileMenuVisible: false,
      },
      open: {
        isMenuOpen: true,
        isMobileMenuMounted: true,
        isMobileMenuVisible: true,
      },
    }[menu];
    const isTransition = menu === 'entering' || menu === 'exiting';
    const isLoggedInPermission = permission.isLoggedIn;
    const dataIsVisible = isLoggedInPermission && menu === 'open';
    const unreadIsVisible = isLoggedInPermission && menu === 'closed';
    const interactionIsCanonical = interaction === 'default' || (
      context.states.data === 'single'
      && dmUnreadCount === 0
      && notificationUnreadCount === 0
      && !isTransition
      && context.variants.scroll === 'top'
    );
    const transitionIsCanonical = !isTransition || (
      context.states.data === 'single'
      && context.states.permissions === 'anonymous'
      && interaction === 'default'
      && route === 'home'
      && !isAuthBootstrapPending
      && dmUnreadCount === 0
      && notificationUnreadCount === 0
      && context.variants.scroll === 'top'
    );
    const scrolledIsCanonical = context.variants.scroll !== 'scrolled' || (
      context.states.data === 'single'
      && context.states.permissions === 'anonymous'
      && interaction === 'default'
      && menu === 'closed'
      && route === 'home'
      && !isAuthBootstrapPending
      && dmUnreadCount === 0
      && notificationUnreadCount === 0
    );
    if (
      (!dataIsVisible && context.states.data !== 'single')
      || (!unreadIsVisible && dmUnreadCount !== 0)
      || (!unreadIsVisible && notificationUnreadCount !== 0)
      || (permission.isLoggedIn && isAuthBootstrapPending)
      || !interactionIsCanonical
      || !transitionIsCanonical
      || !scrolledIsCanonical
    ) {
      throw new Error(
        `지원하지 않는 Visual QA public navbar state: ${context.states.data}:${context.states.permissions}:${interaction}:${menu}:${route}:${context.variants.auth}:${context.variants['notification-unread']}:${context.variants['dm-unread']}:${context.variants.scroll}`,
      );
    }
    const pathname = route === 'cheer-deferred'
      ? '/cheer'
      : route === 'home'
        ? '/home'
        : route === 'mate'
          ? '/mate'
          : route === 'prediction'
            ? '/prediction'
            : route === 'stadium'
              ? '/stadium'
              : '/terms';
    return {
      props: {
        visualQaStateOverride: {
          compactProgress: scroll.compactProgress,
          dmUnreadCount,
          fastCompactProgress: scroll.fastCompactProgress,
          isAuthBootstrapPending,
          isDesktop: false,
          isLoggedIn: permission.isLoggedIn,
          ...menuState,
          notificationUnreadCount,
          shrinkProgress: scroll.shrinkProgress,
          userName: permission.isLoggedIn ? profile.userName : undefined,
          userProfileImageUrl: permission.isLoggedIn ? profile.userProfileImageUrl : undefined,
          userRole: permission.userRole,
          viewportFitProgress: 1,
        },
      },
      captureSelector: menu === 'closed' ? undefined : '.mobile-menu-layer',
      initialPathname: pathname,
      surfaceClassName: 'fixed inset-0 z-[100] block h-[844px] min-h-[844px] w-[320px] max-w-none overflow-hidden rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'public-navbar.desktop-auth-controls': (context) => {
    const profile = requireStateValueFromMap(context, 'data', {
      single: {
        userName: '비주얼 QA',
        userProfileImageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%2316a34a"/%3E%3C/svg%3E',
      },
      'long-korean': {
        userName: '공개 데스크톱 인증 컨트롤에서 말줄임되어야 하는 매우 긴 한국어 사용자 이름',
        userProfileImageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%230ea5e9"/%3E%3C/svg%3E',
      },
      'unbroken-token': {
        userName: `PUBLIC-DESKTOP-AUTH-${'UNBROKEN'.repeat(28)}`,
        userProfileImageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%237c3aed"/%3E%3C/svg%3E',
      },
      'missing-image': {
        userName: '프로필 이미지 없음',
        userProfileImageUrl: null,
      },
      'broken-image': {
        userName: '프로필 이미지 오류',
        userProfileImageUrl: '/__visual-qa__/missing-public-desktop-auth-profile.png',
      },
    });
    const permission = requireStateValueFromMap(context, 'permissions', {
      anonymous: { isLoggedIn: false, userRole: undefined },
      user: { isLoggedIn: true, userRole: 'ROLE_USER' },
      admin: { isLoggedIn: true, userRole: 'ROLE_ADMIN' },
      'super-admin': { isLoggedIn: true, userRole: 'ROLE_SUPER_ADMIN' },
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const isAuthBootstrapPending = resolveDeclaredVariant(context, 'auth', {
      'bootstrap-pending': true,
      settled: false,
    });
    const compactProgress = resolveDeclaredVariant(context, 'compact', {
      expanded: 0,
      compact: 1,
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const allowedTargets = permission.isLoggedIn
      ? new Set([
          'profile',
          ...(permission.userRole === 'ROLE_USER' ? [] : ['admin']),
          'logout',
        ])
      : new Set(isAuthBootstrapPending ? [] : ['login']);
    if (
      (!permission.isLoggedIn && context.states.data !== 'single')
      || (interaction !== 'default' && context.states.data !== 'single')
      || (permission.isLoggedIn && isAuthBootstrapPending)
      || (isAuthBootstrapPending && interaction !== 'default')
      || (!permission.isLoggedIn
        && !isAuthBootstrapPending
        && context.variants.compact !== 'expanded')
      || (interaction !== 'default' && !allowedTargets.has(context.interactionTargetId ?? ''))
    ) {
      throw new Error(
        `지원하지 않는 Visual QA public desktop auth controls state: ${context.states.data}:${context.states.permissions}:${interaction}:${context.variants.auth}:${context.variants.compact}`,
      );
    }
    return {
      props: {
        compactProgress,
        isAuthBootstrapPending,
        visualQaStateOverride: {
          isLoggedIn: permission.isLoggedIn,
          userName: permission.isLoggedIn ? profile.userName : undefined,
          userProfileImageUrl: permission.isLoggedIn ? profile.userProfileImageUrl : undefined,
          userRole: permission.userRole,
        },
      },
      surfaceClassName: 'flex min-h-24 w-[320px] max-w-none flex-wrap items-center justify-center gap-2 overflow-visible rounded-none border-0 bg-background p-4 shadow-none',
      theme,
    };
  },
  'notification.panel': (context) => {
    const notificationsOverride = requireStateValueFromMap(
      context,
      'data',
      visualQaNotificationData,
    );
    requireStateValue(context, 'permissions', 'user');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const supportedTargets = new Set([
      'active-tab-all',
      'active-tab-mate',
      'active-tab-cheer',
      'browser-permission',
      'first-delete',
      'first-item',
      'mark-all-read',
    ]);
    if (
      interaction !== 'default'
      && !supportedTargets.has(context.interactionTargetId ?? '')
    ) {
      throw new Error(`지원하지 않는 Visual QA notification panel target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    const browserPermissionOverride = resolveDeclaredVariant(context, 'browser-permission', {
      default: 'default',
      denied: 'denied',
      granted: 'granted',
      unsupported: 'unsupported',
    });
    const initialActiveTabOverride = resolveDeclaredVariant<'ALL' | 'CHEER' | 'MATE'>(
      context,
      'tab',
      {
        all: 'ALL',
        cheer: 'CHEER',
        mate: 'MATE',
      },
    );
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: {
        browserPermissionOverride,
        initialActiveTabOverride,
        isLoggedInOverride: true,
        notificationsOverride,
        nowOverride: visualQaNotificationNow,
        runtimeOverride: {
          deleteNotification: async () => {},
          markAllAsRead: async () => {},
          markAsRead: async () => {},
          navigate: () => {},
          requestBrowserNotificationPermission: async () => 'granted',
        },
      },
      captureSelector: '[data-testid="notification-panel"]',
      surfaceClassName: 'block min-h-[720px] w-[320px] max-w-none overflow-hidden bg-background p-0 shadow-none',
      theme,
    };
  },
  'cheer.theme-control': (context) => {
    requireStateValueFromMap(context, 'data', { single: 'single' });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    if (
      interaction !== 'default'
      && context.interactionTargetId !== 'system'
      && context.interactionTargetId !== 'light'
      && context.interactionTargetId !== 'dark'
    ) {
      throw new Error(`지원하지 않는 Visual QA cheer theme target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    const preference = resolveDeclaredVariant<'dark' | 'light' | 'system'>(context, 'preference', {
      dark: 'dark',
      light: 'light',
      system: 'system',
    });
    const resolvedTheme = resolveDeclaredVariant<'dark' | 'light'>(context, 'resolved-theme', {
      dark: 'dark',
      light: 'light',
    });
    const compact = resolveDeclaredVariant(context, 'density', {
      compact: true,
      regular: false,
    });
    const accentColor = resolveDeclaredVariant(context, 'accent', {
      bright: '#ffcc00',
      dark: '#1a1a4e',
    });
    return {
      props: {
        accentColor,
        compact,
        onThemeChangeOverride: () => {},
        themeStateOverride: {
          resolvedTheme,
          systemTheme: resolvedTheme,
          theme: preference,
        },
      },
      surfaceClassName: 'block min-h-0 w-full max-w-[320px] overflow-visible bg-[var(--cheer-page-bg)] p-4 shadow-none',
      theme: resolvedTheme,
    };
  },
  'app.browser-shell': (context) => {
    requireStateValue(context, 'data', 'single');
    const theme = resolveDeclaredVariant(context, 'theme', {
      dark: 'dark' as const,
      light: 'light' as const,
    });
    return {
      props: {
        routerOverride: (children: ReactNode) => children,
        runtimeOverride: createElement(
          'div',
          {
            className: 'flex min-h-[844px] w-[320px] min-w-0 items-center justify-center bg-background p-4 text-foreground',
            'data-testid': 'app-browser-shell-runtime',
          },
          createElement(
            'div',
            { className: 'min-w-0 max-w-full break-words rounded-2xl border border-border bg-card p-5 text-center [overflow-wrap:anywhere]' },
            '테마·라우터·문서 헤드 공급자 안에서 앱 브라우저 셸이 준비되었습니다.',
          ),
        ),
      },
      captureSelector: '[data-testid="app-browser-shell-runtime"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-background p-0 shadow-none',
      theme,
    };
  },
  'app.layout': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      single: '레이아웃 본문 콘텐츠입니다.',
      'long-korean': '공개·인증 레이아웃의 긴 한국어 본문이 모바일 내비게이션과 푸터 사이에서 잘리거나 화면 너비를 밀어내지 않고 자연스럽게 여러 줄로 표시되는지 확인합니다.',
      'unbroken-token': `LAYOUT-${'UNBROKEN'.repeat(36)}`,
    });
    const permission = requireStateValueFromMap(context, 'permissions', {
      anonymous: 'anonymous',
      user: 'user',
    });
    const route = resolveDeclaredVariant(context, 'route', {
      'authenticated-mate': 'authenticated-mate',
      'authenticated-regular': 'authenticated-regular',
      'public-home': 'public-home',
      'public-standard': 'public-standard',
    });
    const chromeStage = resolveDeclaredVariant(context, 'chrome-stage', {
      complete: 'complete',
      initial: 'initial',
      navigation: 'navigation',
    });
    const navbar = resolveDeclaredVariant(context, 'navbar', {
      fallback: 'fallback',
      resolved: 'resolved',
    });
    const footer = resolveDeclaredVariant(context, 'footer', {
      hidden: 'hidden',
      loading: 'loading',
      resolved: 'resolved',
    });
    const chatChrome = resolveDeclaredVariant(context, 'chat-chrome', {
      absent: 'absent',
      loading: 'loading',
      resolved: 'resolved',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const authenticated = route === 'authenticated-regular' || route === 'authenticated-mate';
    const isPublicHome = route === 'public-home';
    const expectedPermission = authenticated ? 'user' : 'anonymous';
    const stageValue = chromeStage === 'initial' ? 0 : chromeStage === 'navigation' ? 1 : 2;
    const shouldMountChatChrome = authenticated || (isPublicHome && stageValue === 2);
    const chatChromeIsValid = shouldMountChatChrome
      ? chatChrome !== 'absent'
      : chatChrome === 'absent';
    const stageIsValid = isPublicHome || chromeStage === 'complete';
    const navbarIsValid = !isPublicHome || chromeStage !== 'initial' || navbar === 'fallback';
    if (
      permission !== expectedPermission
      || !stageIsValid
      || !navbarIsValid
      || !chatChromeIsValid
    ) {
      throw new Error(
        `지원하지 않는 Visual QA layout state: ${permission}:${route}:${chromeStage}:${navbar}:${footer}:${chatChrome}`,
      );
    }
    const isFooterRequested = footer !== 'hidden';
    const navbarRuntimePhase = navbar === 'fallback' ? 'loading' : 'resolved';
    const footerRuntimePhase = footer === 'loading' ? 'loading' : 'resolved';
    const chatChromeRuntimePhase = chatChrome === 'loading' ? 'loading' : 'resolved';
    const pathname = route === 'public-home'
      ? '/home'
      : route === 'public-standard'
        ? '/terms'
        : route === 'authenticated-mate'
          ? '/mate/visual-qa/apply'
          : '/mypage';
    const statusCopy = [
      permission === 'user' ? '권한: 로그인 사용자' : '권한: 익명 사용자',
      `경로: ${route}`,
      `공개 홈 크롬 단계: ${chromeStage}`,
      `내비게이션: ${navbar}`,
      `푸터: ${footer}`,
      `챗 크롬: ${chatChrome}`,
    ];
    return {
      props: {
        authenticated,
        visualQaOutletOverride: createElement(
          'section',
          {
            className: 'mx-4 mt-4 min-w-0 max-w-full break-words rounded-2xl border border-border bg-card p-4 text-foreground shadow-sm [overflow-wrap:anywhere]',
            'data-testid': 'visual-qa-layout-outlet',
          },
          createElement('p', { className: 'font-bold' }, data),
          createElement(
            'div',
            { className: 'mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground' },
            ...statusCopy.map((copy) => createElement('p', { key: copy }, copy)),
          ),
        ),
        visualQaRuntimeOverrides: {
          authenticatedLayoutChrome: VisualQaLayoutChrome,
          navbar: VisualQaLayoutNavbar,
          publicNavbar: VisualQaLayoutPublicNavbar,
        },
        visualQaRuntimePhases: {
          authenticatedLayoutChrome: chatChromeRuntimePhase,
          footer: footerRuntimePhase,
          navbar: navbarRuntimePhase,
          publicNavbar: navbarRuntimePhase,
        },
        visualQaStateOverride: {
          isFooterRequested,
          publicHomeChromeReadyStage: stageValue,
        },
      },
      expectedHash: '',
      expectedPathname: pathname,
      expectedSearch: '',
      initialPathname: pathname,
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-background p-0 shadow-none',
      theme,
    };
  },
  'app.query-provider': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      single: '앱 쿼리 공급자 안의 콘텐츠입니다.',
      'long-korean': '앱 쿼리 공급자 안에 표시되는 긴 한국어 콘텐츠가 모바일 화면의 경계를 밀어내지 않고 자연스럽게 여러 줄로 이어지는지 확인합니다.',
      'unbroken-token': `APP-QUERY-PROVIDER-${'UNBROKEN'.repeat(30)}`,
    });
    const content = resolveDeclaredVariant(context, 'content', {
      outlet: 'outlet',
      provided: 'provided',
    });
    if (content === 'outlet' && context.states.data !== 'single') {
      throw new Error(
        `지원하지 않는 Visual QA app-query-provider state: ${context.states.data}:${content}`,
      );
    }
    if (content === 'outlet') {
      return {
        props: { children: undefined },
        captureSelector: '[data-testid="app-query-provider-outlet"]',
        expectedHash: '',
        expectedPathname: '/__visual-qa__',
        expectedSearch: '',
        initialPathname: '/__visual-qa__',
        semanticHost: 'outlet-route',
        surfaceClassName: 'flex min-h-[844px] w-[320px] max-w-none items-center overflow-visible bg-background p-4 shadow-none',
      };
    }
    return {
      props: {
        children: createElement(
          'div',
          {
            className: 'min-w-0 max-w-full break-words rounded-2xl border border-border bg-card p-5 text-center text-foreground [overflow-wrap:anywhere]',
            'data-testid': 'app-query-provider-content',
          },
          data,
        ),
      },
      captureSelector: '[data-testid="app-query-provider-content"]',
      initialPathname: '/__visual-qa__',
      surfaceClassName: 'flex min-h-[844px] w-[320px] max-w-none items-center overflow-visible bg-background p-4 shadow-none',
    };
  },
  'app.routes': (context) => {
    requireStateValue(context, 'data', 'single');
    const pathname = resolveDeclaredVariant(context, 'route', {
      'not-found': '/__visual-qa__/missing-route',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: {},
      captureSelector: '[data-testid="not-found-page"]',
      expectedHash: '',
      expectedPathname: pathname,
      expectedSearch: '',
      initialPathname: pathname,
      semanticHost: 'suspense',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-background p-0 shadow-none',
      theme,
    };
  },
  'app.shell-runtime': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      single: '앱 라우트와 세션 경계가 준비되었습니다.',
      'long-korean': '앱 라우트와 인증 세션 경계의 긴 운영 안내 문구가 모바일 화면에서도 카드 바깥으로 넘치지 않고 자연스럽게 여러 줄로 표시됩니다.',
      'unbroken-token': `APP-SHELL-${'UNBROKEN'.repeat(32)}`,
    });
    const phase = resolveDeclaredVariant(context, 'phase', {
      fallback: 'fallback',
      resolved: 'resolved',
    });
    const theme = resolveDeclaredVariant(context, 'theme', {
      dark: 'dark' as const,
      light: 'light' as const,
    });
    if (phase === 'fallback' && context.states.data !== 'single') {
      throw new Error(`지원하지 않는 Visual QA app-shell state: ${context.states.data}:${phase}`);
    }
    if (phase === 'fallback') {
      return {
        props: { phaseOverride: 'fallback' },
        captureSelector: '[data-vqa-harness-surface] main',
        surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-background p-0 shadow-none',
        theme,
      };
    }
    return {
      props: {
        phaseOverride: 'resolved',
        runtimeOverride: createElement(
          'main',
          {
            className: 'flex min-h-[844px] w-[320px] min-w-0 items-center justify-center bg-background p-4 text-foreground',
            'data-testid': 'app-shell-resolved',
          },
          createElement(
            'div',
            { className: 'min-w-0 max-w-full break-words rounded-2xl border border-border bg-card p-5 text-center [overflow-wrap:anywhere]' },
            data,
          ),
        ),
      },
      captureSelector: '[data-testid="app-shell-resolved"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-background p-0 shadow-none',
      theme,
    };
  },
  'ads.slot': (context) => {
    const data = requireStateValueFromMap(context, 'data', adSlotContent);
    const creativeType = resolveDeclaredVariant(context, 'creative', {
      banner: 'banner',
      'native-card': 'native_card',
      'sponsor-card': 'sponsor_card',
    });
    const minHeight = resolveDeclaredVariant(context, 'height', {
      compact: 96,
      default: undefined,
      maximum: 320,
      string: '12rem',
    });
    return {
      props: {
        children: data,
        className: 'w-full min-w-0',
        creativeType,
        minHeight,
        pageType: 'visual_qa',
        runtime: {
          adClient: 'ca-pub-visual-qa',
          adSlotUnit: 'visual-qa-unit',
          enabled: true,
          loadScript: () => new Promise<void>(() => {}),
          requestFill: () => true,
          testMode: true,
          trackEvent: () => {},
          variant: 'ads_wave1',
        },
        slotId: context.states.data === 'unbroken-token'
          ? `AD-SLOT-${'X'.repeat(180)}`
          : 'visual_qa_slot',
      },
      captureSelector: '[data-ad-variant][data-ad-slot]',
      surfaceClassName: 'block min-h-0 w-full max-w-[480px] overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'privacy-policy.page': (context) => {
    requireStateValueFromMap(context, 'data', { single: 'single' });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: {},
      surfaceClassName: 'block min-h-0 w-full max-w-none overflow-visible rounded-none border-0 bg-transparent p-0 shadow-none',
      theme,
    };
  },
  'public-navbar.dm-unread-badge': (context) => {
    const props = requireStateValueFromMap(context, 'data', {
      'boundary-maximum': { unreadCountOverride: 99 },
      empty: { unreadCountOverride: 0 },
      'error-503': { stateOverride: 'error' },
      loading: { stateOverride: 'loading' },
      overflow: { unreadCountOverride: 100 },
      single: { unreadCountOverride: 1 },
    });
    requireStateValue(context, 'permissions', 'user');
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props,
      surfaceClassName: 'relative block h-11 w-11 overflow-visible rounded-full bg-muted p-0 shadow-none',
      theme,
    };
  },
  'public-navbar.menu-panel': (context) => {
    const profile = requireStateValueFromMap(context, 'data', {
      single: {
        userName: '비주얼 QA',
        userProfileImageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%2316a34a"/%3E%3C/svg%3E',
      },
      'long-korean': {
        userName: '공개 모바일 메뉴 계정 카드에서도 자연스럽게 두 줄 안에 표시되어야 하는 매우 긴 한국어 사용자 이름',
        userProfileImageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%230ea5e9"/%3E%3C/svg%3E',
      },
      'unbroken-token': {
        userName: `PUBLIC-MENU-${'UNBROKEN'.repeat(28)}`,
        userProfileImageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%237c3aed"/%3E%3C/svg%3E',
      },
      'missing-image': {
        userName: '프로필 이미지 없음',
        userProfileImageUrl: null,
      },
      'broken-image': {
        userName: '프로필 이미지 오류',
        userProfileImageUrl: '/__visual-qa__/missing-public-navbar-menu-profile.png',
      },
    });
    const permission = requireStateValueFromMap(context, 'permissions', {
      anonymous: {
        isLoggedIn: false,
        userRole: undefined,
      },
      user: {
        isLoggedIn: true,
        userRole: 'ROLE_USER',
      },
      admin: {
        isLoggedIn: true,
        userRole: 'ROLE_ADMIN',
      },
      'super-admin': {
        isLoggedIn: true,
        userRole: 'ROLE_SUPER_ADMIN',
      },
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const isAuthBootstrapPending = resolveDeclaredVariant(context, 'auth', {
      'bootstrap-pending': true,
      settled: false,
    });
    const pathname = resolveDeclaredVariant(context, 'route', {
      'cheer-deferred': '/cheer',
      home: '/home',
      mate: '/mate',
      prediction: '/prediction',
      stadium: '/stadium',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    if (
      (!permission.isLoggedIn && context.states.data !== 'single')
      || (permission.isLoggedIn && isAuthBootstrapPending)
      || (interaction !== 'default' && context.states.data !== 'single')
    ) {
      throw new Error(
        `지원하지 않는 Visual QA public navbar menu panel state: ${context.states.data}:${context.states.permissions}:${interaction}:${context.variants.auth}`,
      );
    }
    return {
      props: {
        isAuthBootstrapPending,
        onClose: () => undefined,
        prefetchPredictionPage: () => undefined,
        visualQaStateOverride: {
          isLoggedIn: permission.isLoggedIn,
          userName: permission.isLoggedIn ? profile.userName : undefined,
          userProfileImageUrl: permission.isLoggedIn ? profile.userProfileImageUrl : undefined,
          userRole: permission.userRole,
        },
      },
      initialPathname: pathname,
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.apply': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'error-503': 'error-503',
      loading: 'loading',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      input: 'input',
      pressed: 'pressed',
    });
    const system = requireStateValueFromMap(context, 'system', {
      offline: 'error',
      online: 'available',
      timeout: 'pending',
    });
    const flow = resolveDeclaredVariant(context, 'flow', {
      participation: 'participation',
      selling: 'selling',
    });
    const submission = resolveDeclaredVariant(context, 'submission', {
      idle: false,
      pending: true,
    });
    const ticketPanelPhase = resolveDeclaredVariant(context, 'ticketPanel', {
      fallback: 'fallback',
      resolved: 'resolved',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const targetId = context.interactionTargetId;
    const targetIsValid = interaction === 'default'
      ? targetId === undefined
      : interaction === 'input'
        ? flow === 'participation' && targetId === 'message'
        : interaction === 'focus-visible' && flow === 'participation'
          ? ['back', 'message', 'submit-mobile'].includes(targetId ?? '')
          : ['back', 'submit-mobile'].includes(targetId ?? '');
    if (!targetIsValid) {
      throw new Error(`지원하지 않는 MateApply interaction target: ${targetId ?? '<missing>'}`);
    }

    const pressure = {
      'long-korean': {
        hostName: '모바일에서도 길게 이어지는 호스트 이름과 신뢰 정보를 안전하게 표시하는 사용자',
        message: '함께 응원하고 주변 관람객을 배려하면서 경기 종료까지 즐겁게 관람하고 싶습니다. '.repeat(5).slice(0, 190),
        section: '중앙 테이블석과 응원석 사이의 매우 긴 좌석 구역 설명이 두 줄을 넘어가도 카드 안에 머무는 구역',
        stadium: '서울특별시 종합운동장 야구장 공식 관람 구역 안내 명칭',
      },
      'maximum-supported': {
        hostName: '최대 금액 경계 호스트',
        message: '최대 입력 길이 확인 '.repeat(30).slice(0, 200),
        section: '최대 지원 좌석 정보',
        stadium: '잠실',
      },
      single: {
        hostName: '비가 호스트',
        message: '함께 즐겁고 안전하게 관람하고 싶어요!',
        section: '1루 내야 101구역',
        stadium: '잠실',
      },
      'unbroken-token': {
        hostName: `HOST-${'UNBROKEN'.repeat(16)}`,
        message: `MESSAGE-${'UNBROKEN'.repeat(20)}`.slice(0, 200),
        section: `SECTION-${'UNBROKEN'.repeat(18)}`,
        stadium: `STADIUM-${'UNBROKEN'.repeat(18)}`,
      },
    }[data as 'long-korean' | 'maximum-supported' | 'single' | 'unbroken-token'];
    const maximumAmount = data === 'maximum-supported' ? Number.MAX_SAFE_INTEGER : undefined;
    const party = pressure ? {
      id: 77,
      hostId: 11,
      hostHandle: '@visual_qa_host',
      hostName: pressure.hostName,
      hostBadge: 'TRUSTED',
      hostAverageRating: 4.9,
      hostReviewCount: 27,
      teamId: 'LG',
      cheeringSide: 'HOME',
      gameDate: '2026-09-05',
      gameTime: '18:30:00',
      stadium: pressure.stadium,
      homeTeam: 'LG',
      awayTeam: 'OB',
      section: pressure.section,
      maxParticipants: 4,
      currentParticipants: 2,
      description: 'Visual QA 신청 fixture',
      ticketVerified: data !== 'single',
      status: flow === 'selling' ? 'SELLING' : 'PENDING',
      price: flow === 'selling' ? maximumAmount ?? 45000 : undefined,
      ticketPrice: maximumAmount ?? 28000,
      reservationDepositAmount: maximumAmount ?? 10000,
      hostTrustMetrics: null,
      createdAt: '2026-08-27T00:00:00',
    } : null;
    const isTerminal = data === 'loading' || data === 'error-503';
    if (isTerminal && interaction !== 'default') {
      throw new Error(`지원하지 않는 MateApply terminal interaction: ${data}:${interaction}`);
    }

    return {
      props: {
        visualQaStateOverride: {
          currentUserId: 42,
          isAuthLoading: data === 'loading',
          isPartyLoading: data === 'loading',
          isPartyRevalidating: false,
          isSubmitting: submission,
          message: pressure?.message ?? '',
          party: data === 'error-503' ? null : party,
          partyError: data === 'error-503'
            ? '파티 정보를 불러오지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.'
            : null,
          paymentCapability: system,
          showVerificationDialog: false,
          ticketInfo: null,
          ticketPanelPhase,
          ticketVerified: false,
        },
      },
      captureSelector: data === 'loading'
        ? '[data-testid="mate-apply-loading"]'
        : data === 'error-503'
          ? '[data-testid="mate-apply-error"]'
          : '[data-testid="mate-apply"]',
      initialPathname: '/mate/77/apply',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.apply-page': (context) => {
    requireStateValue(context, 'data', 'single');
    const phase = resolveDeclaredVariant(context, 'phase', {
      fallback: 'fallback',
      runtime: 'runtime',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const runtimeState = phase === 'runtime'
      ? adapters['mate.apply']({
        componentId: 'src/components/MateApply.tsx#MateApply',
        states: {
          data: 'single',
          interactions: 'default',
          system: 'online',
        },
        variants: {
          flow: 'participation',
          submission: 'idle',
          ticketPanel: 'resolved',
          theme,
        },
      })
      : undefined;

    return {
      props: {
        visualQaPhase: phase,
        ...(runtimeState ? {
          visualQaRuntimeStateOverride: runtimeState.props.visualQaStateOverride,
        } : {}),
      },
      captureSelector: phase === 'fallback'
        ? '[data-testid="mate-apply-page-fallback"]'
        : '[data-testid="mate-apply"]',
      initialPathname: '/mate/77/apply',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.chat': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'error-503': 'error-503',
      loading: 'loading',
      'long-korean': 'long-korean',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const permission = requireStateValueFromMap(context, 'permissions', {
      anonymous: 'anonymous',
      'mate-applicant-pending': 'mate-applicant-pending',
      'mate-host': 'mate-host',
      'mate-member-approved': 'mate-member-approved',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const phase = resolveDeclaredVariant(context, 'phase', {
      access: 'access',
      approval: 'approval',
      'approved-fallback': 'approved-fallback',
      auth: 'auth',
      party: 'party',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const pressureBranchSuffix = data === 'long-korean'
      ? '-long-korean'
      : data === 'unbroken-token'
        ? '-unbroken-token'
        : '';
    const branch = phase === 'auth' && data === 'loading' && permission === 'anonymous'
      ? 'auth-loading'
      : phase === 'party' && data === 'loading' && permission === 'anonymous'
        ? 'party-loading'
        : phase === 'access' && permission === 'anonymous' && data === 'single'
          ? 'unauthenticated'
          : phase === 'access'
            && permission === 'anonymous'
            && ['error-503', 'long-korean', 'unbroken-token'].includes(data)
            ? `party-error${pressureBranchSuffix}`
            : phase === 'access' && permission === 'mate-applicant-pending' && data === 'single'
              ? 'not-approved'
              : phase === 'approval'
                && permission === 'mate-applicant-pending'
                && data === 'loading'
                ? 'approval-loading'
                : phase === 'approval'
                  && permission === 'mate-applicant-pending'
                  && ['error-503', 'long-korean', 'unbroken-token'].includes(data)
                  ? `approval-error${pressureBranchSuffix}`
                  : phase === 'approved-fallback'
                    && data === 'single'
                    && (permission === 'mate-member-approved' || permission === 'mate-host')
                    ? 'approved-fallback'
                    : null;
    const interactiveTargets = branch?.startsWith('party-error')
      ? ['party-error-list']
      : branch === 'unauthenticated'
        ? ['login']
        : branch?.startsWith('approval-error')
          ? ['approval-retry', 'approval-detail']
          : branch === 'not-approved'
            ? ['not-approved-back', 'not-approved-detail']
            : [];
    const targetIsValid = interaction === 'default'
      ? context.interactionTargetId === undefined
      : interactiveTargets.includes(context.interactionTargetId ?? '');
    if (branch == null || !targetIsValid) {
      throw new Error(
        `지원하지 않는 MateChat state: ${phase}:${data}:${permission}:${interaction}:${context.interactionTargetId ?? '<none>'}`,
      );
    }

    const partyError = branch === 'party-error'
      ? '파티 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
      : branch === 'party-error-long-korean'
        ? '파티 정보를 불러오지 못했습니다. 네트워크 연결 상태와 로그인 상태를 다시 확인한 뒤 잠시 후 목록 화면에서 다시 시도해주세요. 같은 문제가 계속되면 운영팀에 문의해주세요.'
        : branch === 'party-error-unbroken-token'
          ? `PARTY-ERROR-${'UNBROKEN'.repeat(24)}`
          : null;
    const approvalLoadError = branch === 'approval-error'
      ? '신청 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.'
      : branch === 'approval-error-long-korean'
        ? '채팅 승인 상태를 확인하지 못했습니다. 연결 상태를 확인하고 다시 시도하거나 메이트 상세 화면으로 돌아가 신청 상태를 확인해주세요.'
        : branch === 'approval-error-unbroken-token'
          ? `APPROVAL-ERROR-${'UNBROKEN'.repeat(24)}`
          : null;
    const party = new Set([
      'auth-loading',
      'party-loading',
      'party-error',
      'party-error-long-korean',
      'party-error-unbroken-token',
    ]).has(branch)
      ? null
      : {
        id: 77,
        hostId: 11,
        hostHandle: '@visual_qa_host',
        hostName: '비주얼 QA 호스트',
        hostBadge: 'TRUSTED',
        hostAverageRating: 4.9,
        hostReviewCount: 27,
        teamId: 'LG',
        cheeringSide: 'HOME',
        gameDate: '2026-09-05',
        gameTime: '18:30:00',
        stadium: '잠실',
        homeTeam: 'LG',
        awayTeam: 'OB',
        section: '1루 내야 101구역',
        maxParticipants: 4,
        currentParticipants: 2,
        description: 'Visual QA 채팅 fixture',
        ticketVerified: true,
        status: 'PENDING',
        ticketPrice: 28000,
        reservationDepositAmount: 10000,
        hostTrustMetrics: null,
        createdAt: '2026-08-27T00:00:00',
      };
    const currentUser = permission === 'anonymous'
      ? null
      : permission === 'mate-host'
        ? { id: 11, name: '비주얼 QA 호스트', handle: '@visual_qa_host' }
        : { id: 42, name: '비주얼 QA 신청자', handle: '@visual_qa_applicant' };
    const captureSelector = branch === 'auth-loading' || branch === 'party-loading'
      ? '[data-testid="mate-chat-loading"]'
      : branch === 'approval-loading'
        ? '[data-testid="mate-chat-approval-loading"]'
        : branch === 'approved-fallback'
          ? '[data-testid="mate-chat-approved-fallback"]'
          : '[data-testid="mate-chat-access-state"]';

    return {
      props: {
        visualQaStateOverride: {
          approvalLoadError,
          approvedPhase: 'fallback',
          currentUser,
          isAuthLoading: branch === 'auth-loading',
          isCheckingApproval: branch === 'approval-loading',
          isPartyLoading: branch === 'party-loading',
          isPartyRevalidating: false,
          myApplication: branch === 'approved-fallback' && permission === 'mate-member-approved'
            ? { isApproved: true }
            : branch === 'not-approved'
              ? { isApproved: false }
              : null,
          party,
          partyError,
        },
      },
      captureSelector,
      initialPathname: '/mate/77/chat',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.chat-access': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'error-503': 'error-503',
      'long-korean': 'long-korean',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const permission = requireStateValueFromMap(context, 'permissions', {
      anonymous: 'anonymous',
      'mate-applicant-pending': 'mate-applicant-pending',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const state = resolveDeclaredVariant(context, 'state', {
      'approval-error': 'approval-error',
      'not-approved': 'not-approved',
      'party-error': 'party-error',
      unauthenticated: 'unauthenticated',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const pressureData = ['error-503', 'long-korean', 'unbroken-token'].includes(data);
    const validState = state === 'party-error'
      ? permission === 'anonymous' && pressureData
      : state === 'unauthenticated'
        ? permission === 'anonymous' && data === 'single'
        : state === 'approval-error'
          ? permission === 'mate-applicant-pending' && pressureData
          : state === 'not-approved'
            && permission === 'mate-applicant-pending'
            && data === 'single';
    const interactiveTargets = state === 'party-error'
      ? ['party-error-list']
      : state === 'unauthenticated'
        ? ['login']
        : state === 'approval-error'
          ? ['approval-retry', 'approval-detail']
          : ['not-approved-back', 'not-approved-detail'];
    const targetIsValid = interaction === 'default'
      ? context.interactionTargetId === undefined
      : interactiveTargets.includes(context.interactionTargetId ?? '');
    if (!validState || !targetIsValid) {
      throw new Error(
        `지원하지 않는 MateChat access state: ${state}:${data}:${permission}:${interaction}:${context.interactionTargetId ?? '<none>'}`,
      );
    }

    const pressureCopy = state === 'party-error'
      ? data === 'error-503'
        ? '파티 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
        : data === 'long-korean'
          ? '파티 정보를 불러오지 못했습니다. 네트워크 연결 상태와 로그인 상태를 다시 확인한 뒤 잠시 후 목록 화면에서 다시 시도해주세요. 같은 문제가 계속되면 운영팀에 문의해주세요.'
          : `PARTY-ERROR-${'UNBROKEN'.repeat(24)}`
      : data === 'error-503'
        ? '신청 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.'
        : data === 'long-korean'
          ? '채팅 승인 상태를 확인하지 못했습니다. 연결 상태를 확인하고 다시 시도하거나 메이트 상세 화면으로 돌아가 신청 상태를 확인해주세요.'
          : `APPROVAL-ERROR-${'UNBROKEN'.repeat(24)}`;
    const props = state === 'party-error'
      ? { message: pressureCopy, partyId: '77', state: 'partyError' }
      : state === 'unauthenticated'
        ? { partyId: '77', state: 'unauthenticated' }
        : state === 'approval-error'
          ? {
            message: pressureCopy,
            onRetry: () => undefined,
            partyId: '77',
            state: 'approvalError',
          }
          : { partyId: '77', state: 'notApproved' };

    return {
      props,
      captureSelector: '[data-testid="mate-chat-access-state"]',
      initialPathname: '/mate/77/chat',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.chat-approved': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'error-403': 'error-403',
      'error-503': 'error-503',
      loading: 'loading',
      'long-korean': 'long-korean',
      populated: 'populated',
      'unbroken-token': 'unbroken-token',
    });
    const permission = requireStateValueFromMap(context, 'permissions', {
      'mate-host': 'mate-host',
      'mate-member-approved': 'mate-member-approved',
    });
    const system = requireStateValueFromMap(context, 'system', {
      offline: 'offline',
      online: 'online',
    });
    const history = resolveDeclaredVariant(context, 'history', {
      available: 'available',
      loading: 'loading',
      none: 'none',
    });
    const phase = resolveDeclaredVariant(context, 'phase', {
      'messages-loading': 'messages-loading',
      runtime: 'runtime',
      'view-fallback': 'view-fallback',
    });
    const revalidating = resolveDeclaredVariant(context, 'revalidating', {
      false: false,
      true: true,
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const runtimeData = ['empty', 'error-403', 'error-503', 'long-korean', 'populated', 'unbroken-token'];
    const historyData = ['long-korean', 'populated', 'unbroken-token'];
    const validState = phase === 'messages-loading'
      ? data === 'loading' && system === 'online' && history === 'none' && !revalidating
      : phase === 'view-fallback'
        ? data === 'empty' && system === 'online' && history === 'none' && !revalidating
        : runtimeData.includes(data)
          && (history === 'none' || historyData.includes(data));
    if (!validState) {
      throw new Error(
        `지원하지 않는 MateChat approved state: ${phase}:${data}:${permission}:${system}:${history}:${revalidating}`,
      );
    }

    const isHost = permission === 'mate-host';
    const currentUser = isHost
      ? { id: 11, name: '비주얼 QA 호스트' }
      : { id: 42, name: '비주얼 QA 참여자' };
    const baseMessages = [
      {
        id: 101,
        partyId: 77,
        senderId: 11,
        senderName: '비주얼 QA 호스트',
        message: '경기 시작 한 시간 전에 1루 출입구에서 만나요.',
        createdAt: '2026-08-26T18:30:00+09:00',
      },
      {
        id: 102,
        partyId: 77,
        senderId: 42,
        senderName: '비주얼 QA 참여자',
        message: '네, 도착하면 채팅 남기겠습니다.',
        createdAt: '2026-08-27T10:15:00+09:00',
      },
      {
        id: 103,
        partyId: 77,
        senderId: 11,
        senderName: '비주얼 QA 호스트',
        message: '좌석 전달과 체크인 순서도 현장에서 함께 확인해요.',
        createdAt: '2026-08-27T10:18:00+09:00',
      },
    ];
    const messages = data === 'populated'
      ? baseMessages
      : data === 'long-korean'
        ? [{
          ...baseMessages[0],
          message: '경기장 입구가 혼잡할 수 있으니 약속한 시간보다 조금 일찍 도착해서 정확한 출입구 번호와 현재 위치를 채팅으로 공유하고 티켓 전달과 체크인 순서를 차례대로 확인해주세요.',
        }]
        : data === 'unbroken-token'
          ? [{
            ...baseMessages[0],
            message: `MESSAGE-${'UNBROKEN'.repeat(32)}`,
          }]
          : [];
    const chatLoadError = data === 'error-403'
      ? '승인된 참여자와 호스트만 채팅 기록을 조회할 수 있습니다.'
      : data === 'error-503'
        ? '이전 메시지를 불러오지 못했습니다. 다시 시도해주세요.'
        : null;

    return {
      props: {
        party: {
          id: 77,
          hostId: 11,
          hostHandle: '@visual_qa_host',
          hostName: '비주얼 QA 호스트',
          hostBadge: 'TRUSTED',
          hostAverageRating: 4.9,
          hostReviewCount: 27,
          teamId: 'LG',
          cheeringSide: 'HOME',
          gameDate: '2026-09-05',
          gameTime: '18:30:00',
          stadium: '잠실',
          homeTeam: 'LG',
          awayTeam: 'OB',
          section: '1루 내야 101구역',
          maxParticipants: 4,
          currentParticipants: 2,
          description: 'Visual QA 승인 채팅 fixture',
          ticketVerified: true,
          status: 'MATCHED',
          ticketPrice: 28000,
          reservationDepositAmount: 10000,
          hostTrustMetrics: null,
          createdAt: '2026-08-27T00:00:00+09:00',
        },
        partyId: '77',
        currentUser,
        isHost,
        isPartyRevalidating: revalidating,
        visualQaStateOverride: {
          chatLoadError,
          hasOlderMessages: history !== 'none',
          isConnected: system === 'online',
          isLoadingOlderMessages: history === 'loading',
          isUploadingImage: false,
          imagePreviewUrl: null,
          messageText: '',
          messages,
          messagesPending: data === 'loading',
          nowIso: '2026-08-27T12:00:00+09:00',
          viewPhase: phase,
        },
      },
      captureSelector: phase === 'runtime'
        ? '[data-testid="mate-chat-view"]'
        : '[data-testid="mate-chat-approved-runtime-fallback"]',
      initialPathname: '/mate/77/chat',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.chat-composer': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'broken-image': 'broken-image',
      empty: 'empty',
      'long-korean': 'long-korean',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const system = requireStateValueFromMap(context, 'system', {
      offline: 'offline',
      online: 'online',
    });
    const media = resolveDeclaredVariant(context, 'media', {
      none: 'none',
      preview: 'preview',
      uploading: 'uploading',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const hasMessage = ['long-korean', 'single', 'unbroken-token'].includes(data);
    const hasPreview = media !== 'none';
    const submitEnabled = hasMessage || hasPreview;
    const validBase = (data !== 'broken-image' || hasPreview)
      && (data === 'broken-image' || data === 'empty' || system === 'online');
    const interactiveTargets = media === 'uploading'
      ? []
      : [
        'upload',
        ...(interaction === 'focus-visible' ? ['input'] : []),
        ...(media === 'preview' ? ['cancel'] : []),
        ...(media === 'preview' && submitEnabled ? ['submit-preview'] : []),
        ...(media === 'none' && submitEnabled ? ['submit-message'] : []),
      ];
    const targetIsValid = interaction === 'default'
      ? context.interactionTargetId === undefined
      : interactiveTargets.includes(context.interactionTargetId ?? '');
    if (!validBase || !targetIsValid || (media === 'uploading' && interaction !== 'default')) {
      throw new Error(
        `지원하지 않는 MateChat composer state: ${media}:${data}:${system}:${interaction}:${context.interactionTargetId ?? '<none>'}`,
      );
    }

    const messageText = data === 'single'
      ? '경기 시작 전에 1루 출입구에서 만나요.'
      : data === 'long-korean'
        ? '경기장 입구가 혼잡할 수 있으니 도착 예정 시간과 정확한 출입구 번호를 확인한 뒤 현재 위치를 채팅으로 알려주세요.'
        : data === 'unbroken-token'
          ? `MESSAGE-${'UNBROKEN'.repeat(24)}`
          : '';
    const validPreview = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"%3E%3Crect width="96" height="96" fill="%2316a34a"/%3E%3Ccircle cx="48" cy="38" r="18" fill="white"/%3E%3Cpath d="M18 82c7-17 18-25 30-25s23 8 30 25" fill="%23dcfce7"/%3E%3C/svg%3E';
    const imagePreviewUrl = media === 'none'
      ? null
      : data === 'broken-image'
        ? 'data:image/png;base64,bm90LXZhbGlk'
        : validPreview;
    const noop = () => undefined;

    return {
      props: {
        chatImageInputId: 'visual-qa-mate-chat-image-upload',
        fileInputRef: { current: null },
        messageText,
        imagePreviewUrl,
        isUploadingImage: media === 'uploading',
        isConnected: system === 'online',
        onMessageTextChange: noop,
        onImageSelect: noop,
        onOpenImagePicker: noop,
        onCancelImageSelection: noop,
        onSubmit: noop,
      },
      captureSelector: '[data-testid="mate-chat-composer-panel"]',
      surfaceClassName: 'block min-h-0 w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background px-4 py-1 shadow-none',
      theme,
    };
  },
  'mate.chat-conversation': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'broken-image': 'broken-image',
      empty: 'empty',
      'error-403': 'error-403',
      'error-503': 'error-503',
      'long-korean': 'long-korean',
      populated: 'populated',
      'unbroken-token': 'unbroken-token',
    });
    const permission = requireStateValueFromMap(context, 'permissions', {
      'mate-host': 'mate-host',
      'mate-member-approved': 'mate-member-approved',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const system = requireStateValueFromMap(context, 'system', {
      offline: 'offline',
      online: 'online',
    });
    const history = resolveDeclaredVariant(context, 'history', {
      available: 'available',
      loading: 'loading',
      none: 'none',
    });
    const composer = resolveDeclaredVariant(context, 'composer', {
      fallback: 'fallback',
      runtime: 'runtime',
    });
    const ownership = resolveDeclaredVariant(context, 'ownership', {
      mine: 'mine',
      mixed: 'mixed',
      theirs: 'theirs',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });

    const permissionIsValid = data === 'empty'
      ? permission === 'mate-member-approved' || permission === 'mate-host'
      : permission === 'mate-member-approved';
    const historyIsValid = data === 'populated' ? true : history === 'none';
    const ownershipIsValid = data === 'populated'
      || (data === 'broken-image' && ownership === 'theirs')
      || (['long-korean', 'unbroken-token'].includes(data) && ownership === 'mixed')
      || (['empty', 'error-403', 'error-503'].includes(data) && ownership === 'mine');
    const fallbackIsValid = composer === 'runtime' || (
      data === 'empty'
      && permission === 'mate-member-approved'
      && interaction === 'default'
      && system === 'online'
      && history === 'none'
      && ownership === 'mine'
    );
    const allowedTargets = [
      ...(['error-403', 'error-503'].includes(data) ? ['retry'] : []),
      ...(data === 'populated' && history === 'available' ? ['load-older'] : []),
    ];
    const targetIsValid = interaction === 'default'
      ? context.interactionTargetId === undefined
      : allowedTargets.includes(context.interactionTargetId ?? '');
    if (!permissionIsValid || !historyIsValid || !ownershipIsValid
      || !fallbackIsValid || !targetIsValid) {
      throw new Error(
        `지원하지 않는 MateChat conversation state: ${data}:${permission}:${interaction}:${system}:${history}:${composer}:${ownership}:${context.interactionTargetId ?? '<none>'}`,
      );
    }

    const currentUserId = 21;
    const baseMessage = {
      partyId: 77,
      createdAt: '2026-08-27T18:30:00+09:00',
    };
    const mine = {
      ...baseMessage,
      id: 'mine-1',
      senderId: currentUserId,
      senderName: '나',
      message: '1루 출입구 앞에서 먼저 기다릴게요.',
    };
    const theirs = {
      ...baseMessage,
      id: 'theirs-1',
      senderId: 42,
      senderName: '비주얼 QA 참여자',
      message: data === 'long-korean'
        ? '경기장 입구가 혼잡할 수 있으니 도착 예정 시간과 정확한 출입구 번호를 확인한 뒤 현재 위치를 채팅으로 알려주세요.'
        : data === 'unbroken-token'
          ? `MESSAGE-${'UNBROKEN'.repeat(24)}`
          : '확인했습니다. 도착하면 바로 연락드릴게요.',
      ...(data === 'broken-image'
        ? { imageUrl: 'data:image/png;base64,bm90LXZhbGlk' }
        : {}),
    };
    const messages = ['empty', 'error-403', 'error-503'].includes(data)
      ? []
      : ownership === 'mine'
        ? [mine]
        : ownership === 'theirs'
          ? [theirs]
          : [theirs, mine];
    const groupedMessages = messages.length === 0
      ? []
      : [{ date: '2026년 8월 27일 오늘', messages }];
    const noop = () => undefined;

    return {
      props: {
        currentUserId,
        isHost: permission === 'mate-host',
        isConnected: system === 'online',
        groupedMessages,
        chatLoadError: data === 'error-403'
          ? '채팅 기록을 볼 권한이 없습니다.'
          : data === 'error-503'
            ? '채팅 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.'
            : null,
        hasOlderMessages: history !== 'none',
        isLoadingOlderMessages: history === 'loading',
        messageText: '',
        imagePreviewUrl: null,
        isUploadingImage: false,
        fileInputRef: { current: null },
        scrollAreaRef: { current: null },
        onMessageTextChange: noop,
        onImageSelect: noop,
        onOpenImagePicker: noop,
        onCancelImageSelection: noop,
        onSubmit: noop,
        onRefetchMessages: noop,
        onLoadOlderMessages: noop,
        formatMessageTime: () => '오후 6:30',
        visualQaComposerPhase: composer,
      },
      captureSelector: '[data-testid="mate-chat-conversation-panel"]',
      surfaceClassName: 'block min-h-0 w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background px-4 py-1 shadow-none',
      theme,
    };
  },
  'mate.chat-page': (context) => {
    requireStateValue(context, 'data', 'single');
    const phase = resolveDeclaredVariant(context, 'phase', {
      fallback: 'fallback',
      runtime: 'runtime',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const runtimeState = phase === 'runtime'
      ? adapters['mate.chat']({
        componentId: 'src/components/MateChat.tsx#MateChat',
        states: {
          data: 'single',
          interactions: 'default',
          permissions: 'mate-member-approved',
        },
        variants: {
          phase: 'approved-fallback',
          theme,
        },
      })
      : undefined;

    return {
      props: {
        visualQaPhase: phase,
        ...(runtimeState ? {
          visualQaRuntimeStateOverride: runtimeState.props.visualQaStateOverride,
        } : {}),
      },
      captureSelector: phase === 'fallback'
        ? '[data-testid="mate-chat-page-fallback"]'
        : '[data-testid="mate-chat-approved-fallback"]',
      initialPathname: '/mate/77/chat',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.chat-view': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'long-korean': 'long-korean',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const permission = requireStateValueFromMap(context, 'permissions', {
      'mate-host': 'mate-host',
      'mate-member-approved': 'mate-member-approved',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const system = requireStateValueFromMap(context, 'system', {
      offline: 'offline',
      online: 'online',
    });
    const state = resolveDeclaredVariant(context, 'state', {
      base: 'base',
      checkin: 'checkin',
      'conversation-fallback': 'conversation-fallback',
      revalidating: 'revalidating',
      'ticket-unverified': 'ticket-unverified',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const isHost = permission === 'mate-host';
    const isPressureData = data !== 'single';
    const stateIsValid = isPressureData
      ? permission === 'mate-member-approved'
        && interaction === 'default'
        && system === 'online'
        && state === 'base'
      : state === 'base'
        ? true
        : state === 'checkin'
          ? permission === 'mate-member-approved' && system === 'online'
          : state === 'ticket-unverified'
            ? system === 'online' && interaction === 'default'
            : permission === 'mate-member-approved'
              && system === 'online'
              && interaction === 'default';
    const allowedTargets = state === 'checkin'
      ? ['check-in']
      : state === 'base'
        ? ['back', 'detail', ...(isHost ? ['manage'] : [])]
        : [];
    const targetIsValid = interaction === 'default'
      ? context.interactionTargetId === undefined
      : system === 'online' && allowedTargets.includes(context.interactionTargetId ?? '');
    if (!stateIsValid || !targetIsValid) {
      throw new Error(
        `지원하지 않는 MateChat view state: ${data}:${permission}:${interaction}:${system}:${state}:${context.interactionTargetId ?? '<none>'}`,
      );
    }

    const stadium = data === 'long-korean'
      ? '서울특별시 종합운동장 야구장 중앙 출입구와 내야 관람석 연결 통로 안내 구역'
      : data === 'unbroken-token'
        ? `STADIUM-${'UNBROKEN'.repeat(24)}`
        : '잠실';
    const section = data === 'long-korean'
      ? '1루 내야 응원석 앞쪽 통로와 가까운 101구역 가장 안쪽 좌석'
      : data === 'unbroken-token'
        ? `SECTION-${'UNBROKEN'.repeat(24)}`
        : '1루 내야 101구역';
    const noop = () => undefined;

    return {
      props: {
        party: {
          id: 77,
          hostId: 11,
          hostHandle: '@visual_qa_host',
          hostName: '비주얼 QA 호스트',
          hostBadge: 'TRUSTED',
          hostAverageRating: 4.9,
          hostReviewCount: 27,
          teamId: 'LG',
          cheeringSide: 'HOME',
          gameDate: '2026-09-05',
          gameTime: '18:30:00',
          stadium,
          homeTeam: 'LG',
          awayTeam: 'OB',
          section,
          maxParticipants: 4,
          currentParticipants: 2,
          description: 'Visual QA 채팅 화면 fixture',
          ticketVerified: state !== 'ticket-unverified',
          status: 'MATCHED',
          ticketPrice: 28000,
          reservationDepositAmount: 10000,
          hostTrustMetrics: null,
          createdAt: '2026-08-27T00:00:00+09:00',
        },
        currentUserId: 21,
        isHost,
        isConnected: system === 'online',
        isPartyRevalidating: state === 'revalidating',
        canAccessCheckIn: state === 'checkin',
        groupedMessages: [],
        chatLoadError: null,
        hasOlderMessages: false,
        isLoadingOlderMessages: false,
        messageText: '',
        imagePreviewUrl: null,
        isUploadingImage: false,
        fileInputRef: { current: null },
        scrollAreaRef: { current: null },
        onMessageTextChange: noop,
        onImageSelect: noop,
        onOpenImagePicker: noop,
        onCancelImageSelection: noop,
        onSubmit: noop,
        onNavigateBack: noop,
        onNavigateDetail: noop,
        onNavigateManage: noop,
        onNavigateCheckIn: noop,
        onRefetchMessages: noop,
        onLoadOlderMessages: noop,
        formatMessageTime: () => '오후 6:30',
        visualQaConversationPhase: state === 'conversation-fallback' ? 'fallback' : 'runtime',
      },
      captureSelector: '[data-testid="mate-chat-view"]',
      initialPathname: '/mate/77/chat',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.check-in': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'error-404': 'error-404',
      'error-503': 'error-503',
      loading: 'loading',
      'long-korean': 'long-korean',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const permission = requireStateValueFromMap(context, 'permissions', {
      anonymous: 'anonymous',
      'mate-host': 'mate-host',
      'mate-member-approved': 'mate-member-approved',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const phase = resolveDeclaredVariant(context, 'phase', {
      'auth-loading': 'auth-loading',
      'auth-required': 'auth-required',
      'content-fallback': 'content-fallback',
      'party-error': 'party-error',
      'party-loading': 'party-loading',
      runtime: 'runtime',
    });
    const entry = resolveDeclaredVariant(context, 'entry', {
      manual: 'manual',
      qr: 'qr',
    });
    const validation = resolveDeclaredVariant(context, 'validation', {
      idle: 'idle',
      invalid: 'invalid',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const pressureErrors = ['error-404', 'error-503', 'long-korean', 'unbroken-token'];
    const baseIsValid = phase === 'auth-loading'
      ? data === 'loading' && permission === 'anonymous'
      : phase === 'party-loading'
        ? data === 'loading' && permission === 'mate-member-approved'
        : phase === 'party-error'
          ? pressureErrors.includes(data) && permission === 'mate-member-approved'
          : phase === 'auth-required'
            ? data === 'single' && permission === 'anonymous'
            : data === 'single' && permission !== 'anonymous';
    const entryIsValid = ['content-fallback', 'runtime'].includes(phase)
      || entry === 'manual';
    const validationIsValid = validation === 'idle' || (
      phase === 'runtime'
      && permission === 'mate-member-approved'
      && entry === 'manual'
      && interaction === 'default'
    );
    const allowedTargets = phase === 'party-error' && data === 'error-404'
      ? ['error-list']
      : phase === 'auth-required'
        ? ['login', 'auth-list']
        : phase === 'content-fallback'
          && permission === 'mate-member-approved'
          && entry === 'manual'
          && validation === 'idle'
          && interaction !== 'pressed'
          ? ['back']
          : phase === 'runtime'
            && permission === 'mate-member-approved'
            && entry === 'manual'
            && validation === 'idle'
            ? [
              'back',
              ...(['hover', 'focus-visible'].includes(interaction) ? ['manual-code'] : []),
            ]
            : [];
    const targetIsValid = interaction === 'default'
      ? context.interactionTargetId === undefined
      : allowedTargets.includes(context.interactionTargetId ?? '');
    if (!baseIsValid || !entryIsValid || !validationIsValid || !targetIsValid) {
      throw new Error(
        `지원하지 않는 MateCheckIn state: ${phase}:${data}:${permission}:${interaction}:${entry}:${validation}:${context.interactionTargetId ?? '<none>'}`,
      );
    }

    const partyError = phase !== 'party-error'
      ? null
      : data === 'error-404'
        ? '파티 정보를 찾을 수 없습니다.'
        : data === 'error-503'
          ? '체크인 파티 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
          : data === 'long-korean'
            ? '체크인할 파티 정보를 확인하지 못했습니다. 네트워크 연결과 로그인 상태를 확인한 뒤 메이트 목록으로 돌아가 파티가 계속 유효한지 다시 확인해주세요.'
            : `CHECK-IN-PARTY-${'UNBROKEN'.repeat(24)}`;
    const currentUser = permission === 'anonymous'
      ? null
      : permission === 'mate-host'
        ? { id: 11, handle: '@visual_qa_host' }
        : { id: 42, handle: '@visual_qa_member' };

    return {
      props: {
        visualQaStateOverride: {
          checkInStatus: [],
          currentUser,
          isAuthLoading: phase === 'auth-loading',
          isChecking: false,
          isPartyLoading: phase === 'party-loading',
          isPartyRevalidating: false,
          manualCode: validation === 'invalid' ? '12' : '',
          manualCodeError: validation === 'invalid'
            ? '수동 체크인 코드를 4자리 숫자로 입력해주세요.'
            : null,
          party: ['auth-loading', 'party-loading', 'party-error'].includes(phase)
            ? null
            : {
              id: 77,
              hostId: 11,
              hostHandle: '@visual_qa_host',
              hostName: '비주얼 QA 호스트',
              hostBadge: 'TRUSTED',
              hostAverageRating: 4.9,
              hostReviewCount: 27,
              teamId: 'LG',
              cheeringSide: 'HOME',
              gameDate: '2026-09-05',
              gameTime: '18:30:00',
              stadium: '잠실',
              homeTeam: 'LG',
              awayTeam: 'OB',
              section: '1루 내야 101구역',
              maxParticipants: 4,
              currentParticipants: 2,
              description: 'Visual QA 체크인 fixture',
              ticketVerified: true,
              status: 'MATCHED',
              ticketPrice: 28000,
              reservationDepositAmount: 10000,
              hostTrustMetrics: null,
              createdAt: '2026-08-27T00:00:00+09:00',
            },
          partyError,
          ...(entry === 'qr' ? { qrSessionId: 'visual-qa-session' } : {}),
          statusLoadError: null,
          visualQaContentPhase: phase === 'content-fallback' ? 'fallback' : 'runtime',
        },
      },
      captureSelector: phase === 'auth-loading' || phase === 'party-loading'
        ? '[data-testid="mate-check-in-loading"]'
        : phase === 'party-error'
          ? '[data-testid="mate-check-in-error"]'
          : phase === 'auth-required'
            ? '[data-testid="mate-check-in-auth-required"]'
            : '[data-testid="mate-check-in"]',
      initialPathname: '/mate/77/check-in',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.check-in-action': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'maximum-supported': 'maximum-supported',
      single: 'single',
    });
    const permission = requireStateValueFromMap(context, 'permissions', {
      'mate-host': 'mate-host',
      'mate-member-approved': 'mate-member-approved',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const state = resolveDeclaredVariant<'checking' | 'complete' | 'ready' | 'waiting'>(context, 'state', {
      checking: 'checking',
      complete: 'complete',
      ready: 'ready',
      waiting: 'waiting',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const isDefault = interaction === 'default';
    const allowedTargets = state === 'ready' || state === 'complete'
      ? ['chat', 'primary']
      : ['chat'];
    const validPressureState = data === 'single' || (
      permission === 'mate-member-approved'
      && state === 'ready'
      && isDefault
    );
    const validInteractiveState = isDefault || (
      data === 'single'
      && permission === 'mate-member-approved'
      && allowedTargets.includes(context.interactionTargetId ?? '')
    );
    const targetIsValid = isDefault
      ? context.interactionTargetId === undefined
      : context.interactionTargetId !== undefined;
    if (!validPressureState || !validInteractiveState || !targetIsValid) {
      throw new Error(
        `지원하지 않는 MateCheckInActionRuntime state: ${data}:${permission}:${interaction}:${state}:${context.interactionTargetId ?? '<none>'}`,
      );
    }

    const countByState = {
      checking: 1,
      complete: 4,
      ready: 1,
      waiting: 2,
    } as const;
    const maximumCount = Number.MAX_SAFE_INTEGER;
    const noop = () => {};

    return {
      props: {
        isCheckedIn: state === 'waiting' || state === 'complete',
        isChecking: state === 'checking',
        allCheckedIn: state === 'complete',
        isHost: permission === 'mate-host',
        checkedInCount: data === 'maximum-supported' ? maximumCount : countByState[state],
        totalParticipants: data === 'maximum-supported' ? maximumCount : 4,
        onCheckIn: noop,
        onComplete: noop,
        onNavigateToChat: noop,
      },
      captureSelector: '[data-testid="mate-check-in-action-runtime"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.check-in-content': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const permission = requireStateValueFromMap(context, 'permissions', {
      'mate-host': 'mate-host',
      'mate-member-approved': 'mate-member-approved',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const system = requireStateValueFromMap(context, 'system', {
      offline: 'offline',
      online: 'online',
      timeout: 'timeout',
    });
    const phase = resolveDeclaredVariant<
      'action-fallback' | 'overview-fallback' | 'roster-fallback' | 'runtime' | 'status-fallback'
    >(context, 'phase', {
      'action-fallback': 'action-fallback',
      'overview-fallback': 'overview-fallback',
      'roster-fallback': 'roster-fallback',
      runtime: 'runtime',
      'status-fallback': 'status-fallback',
    });
    const state = resolveDeclaredVariant<'checking' | 'complete' | 'ready' | 'waiting'>(context, 'state', {
      checking: 'checking',
      complete: 'complete',
      ready: 'ready',
      waiting: 'waiting',
    });
    const entry = resolveDeclaredVariant<'manual' | 'qr'>(context, 'entry', {
      manual: 'manual',
      qr: 'qr',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const isDefault = interaction === 'default';
    const hasNoTarget = context.interactionTargetId === undefined;
    const isRepresentativeBase = permission === 'mate-member-approved'
      && state === 'ready'
      && entry === 'manual';
    const fallbackIsValid = phase !== 'runtime'
      && data === 'single'
      && system === 'online'
      && state === 'ready'
      && entry === 'manual'
      && isDefault
      && hasNoTarget;
    const runtimeDefaultIsValid = phase === 'runtime' && isDefault && hasNoTarget && (
      (data === 'single' && (
        system === 'online'
        || (['offline', 'timeout'].includes(system) && isRepresentativeBase)
      ))
      || (['long-korean', 'unbroken-token'].includes(data)
        && system === 'offline'
        && isRepresentativeBase)
      || (data === 'maximum-supported'
        && system === 'online'
        && permission === 'mate-member-approved'
        && state === 'waiting'
        && entry === 'manual')
    );
    const runtimeInteractionIsValid = phase === 'runtime'
      && !isDefault
      && data === 'single'
      && system === 'offline'
      && isRepresentativeBase
      && context.interactionTargetId === 'retry';
    if (!fallbackIsValid && !runtimeDefaultIsValid && !runtimeInteractionIsValid) {
      throw new Error(
        `지원하지 않는 MateCheckInContentRuntime state: ${data}:${permission}:${interaction}:${system}:${phase}:${state}:${entry}:${context.interactionTargetId ?? '<none>'}`,
      );
    }

    const isMaximum = data === 'maximum-supported';
    const regularCountByState = {
      checking: 1,
      complete: 4,
      ready: 0,
      waiting: 2,
    } as const;
    const totalParticipants = isMaximum ? 12 : 4;
    const checkedInCount = isMaximum ? 11 : regularCountByState[state];
    const isCheckedIn = isMaximum || state === 'waiting' || state === 'complete';
    const currentUserHandle = permission === 'mate-host'
      ? '@visual_qa_host'
      : '@visual_qa_member';
    const checkInStatus = Array.from({ length: checkedInCount }, (_, index) => ({
      id: index + 1,
      partyId: 77,
      userHandle: index === 0
        ? '@visual_qa_host'
        : index === 1
          ? '@visual_qa_member'
          : `@visual_qa_guest_${index}`,
      userName: index === 0
        ? '비주얼 QA 호스트'
        : index === 1
          ? '비주얼 QA 참여자'
          : `참여자 ${index}`,
      location: '잠실야구장',
      checkedInAt: `2026-09-05T17:${String(30 + index).padStart(2, '0')}:00+09:00`,
    }));
    const myCheckIn = isCheckedIn
      ? checkInStatus.find((checkIn) => checkIn.userHandle === currentUserHandle)
      : undefined;
    const statusLoadError = system !== 'offline'
      ? null
      : data === 'long-korean'
        ? '체크인 현황을 불러오지 못했습니다. 네트워크 연결 상태를 확인한 뒤 잠시 기다렸다가 다시 시도해주세요. 문제가 계속되면 메이트 채팅에서 다른 참여자의 도착 상태를 먼저 확인할 수 있습니다.'
        : data === 'unbroken-token'
          ? `CHECK-IN-STATUS-${'UNBROKEN'.repeat(24)}`
          : '체크인 현황을 불러오지 못했습니다.';
    const noop = () => {};

    return {
      props: {
        party: {
          id: 77,
          hostId: 11,
          hostHandle: '@visual_qa_host',
          hostName: '비주얼 QA 호스트',
          hostBadge: 'TRUSTED',
          hostAverageRating: 4.9,
          hostReviewCount: 27,
          teamId: 'LG',
          cheeringSide: 'HOME',
          gameDate: '2026-09-05',
          gameTime: '18:30:00',
          stadium: '잠실',
          homeTeam: 'LG',
          awayTeam: 'OB',
          section: '1루 내야 101구역',
          maxParticipants: totalParticipants,
          currentParticipants: totalParticipants,
          description: 'Visual QA 체크인 content fixture',
          ticketVerified: true,
          status: 'MATCHED',
          ticketPrice: 28000,
          reservationDepositAmount: 10000,
          hostTrustMetrics: null,
          createdAt: '2026-08-27T00:00:00+09:00',
        },
        isHost: permission === 'mate-host',
        isCheckedIn,
        isChecking: state === 'checking',
        ...(entry === 'qr' ? { qrSessionId: 'visual-qa-session' } : {}),
        isPartyRevalidating: system === 'timeout',
        statusLoadError,
        hostCheckedIn: checkInStatus.some((checkIn) => checkIn.userHandle === '@visual_qa_host'),
        allCheckedIn: state === 'complete',
        checkedInCount,
        totalParticipants,
        remainingCount: totalParticipants - checkedInCount,
        progressValue: Math.round((checkedInCount / totalParticipants) * 100),
        currentUserHandle,
        myCheckIn,
        checkInStatus,
        onRetryStatus: noop,
        onCheckIn: noop,
        onComplete: noop,
        onNavigateToChat: noop,
        visualQaStateOverride: {
          actionPhase: phase === 'action-fallback' ? 'fallback' : 'runtime',
          overviewPhase: phase === 'overview-fallback' ? 'fallback' : 'runtime',
          rosterPhase: phase === 'roster-fallback' ? 'fallback' : 'runtime',
          statusPhase: phase === 'status-fallback' ? 'fallback' : 'runtime',
        },
      },
      captureSelector: '[data-testid="mate-check-in-content"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.check-in-overview': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const permission = requireStateValueFromMap(context, 'permissions', {
      'mate-host': 'mate-host',
      'mate-member-approved': 'mate-member-approved',
    });
    const state = resolveDeclaredVariant<'complete' | 'ready' | 'waiting'>(context, 'state', {
      complete: 'complete',
      ready: 'ready',
      waiting: 'waiting',
    });
    const entry = resolveDeclaredVariant<'manual' | 'qr'>(context, 'entry', {
      manual: 'manual',
      qr: 'qr',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const isRepresentativePressure = permission === 'mate-member-approved'
      && state === 'ready'
      && entry === 'manual';
    const isMaximum = data === 'maximum-supported';
    const validDataState = data === 'single'
      || (['long-korean', 'unbroken-token'].includes(data) && isRepresentativePressure)
      || (isMaximum
        && permission === 'mate-member-approved'
        && state === 'waiting'
        && entry === 'manual');
    if (
      !validDataState
      || context.states.interactions !== undefined
      || context.states.system !== undefined
      || context.interactionTargetId !== undefined
    ) {
      throw new Error(
        `지원하지 않는 MateCheckInOverviewRuntime state: ${data}:${permission}:${state}:${entry}`,
      );
    }

    const totalParticipants = isMaximum ? Number.MAX_SAFE_INTEGER : 4;
    const checkedInCount = isMaximum
      ? Number.MAX_SAFE_INTEGER - 1
      : { complete: 4, ready: 0, waiting: 2 }[state];
    const remainingCount = totalParticipants - checkedInCount;
    const isCheckedIn = state === 'waiting' || state === 'complete';
    const stadium = data === 'long-korean'
      ? '서울특별시 종합운동장 야구장 공식 좌석 안내 경기장'
      : data === 'unbroken-token'
        ? `STADIUM${'UNBROKEN'.repeat(20)}`
        : '잠실';
    const section = data === 'long-korean'
      ? '1루 내야 응원단상 바로 아래 통로와 좌석 열이 매우 길게 이어지는 공식 좌석 안내 구역'
      : data === 'unbroken-token'
        ? `SECTION${'UNBROKEN'.repeat(24)}`
        : '1루 내야 101구역';

    return {
      props: {
        party: {
          id: 77,
          hostId: 11,
          hostHandle: '@visual_qa_host',
          hostName: '비주얼 QA 호스트',
          hostBadge: 'TRUSTED',
          hostAverageRating: 4.9,
          hostReviewCount: 27,
          teamId: 'LG',
          cheeringSide: 'HOME',
          gameDate: '2026-09-05',
          gameTime: '18:30:00',
          stadium,
          homeTeam: 'LG',
          awayTeam: 'OB',
          section,
          maxParticipants: totalParticipants,
          currentParticipants: totalParticipants,
          description: 'Visual QA 체크인 overview fixture',
          ticketVerified: true,
          status: { complete: 'COMPLETED', ready: 'MATCHED', waiting: 'CHECKED_IN' }[state],
          ticketPrice: 28000,
          reservationDepositAmount: 10000,
          hostTrustMetrics: null,
          createdAt: '2026-08-27T00:00:00+09:00',
        },
        isHost: permission === 'mate-host',
        isCheckedIn,
        ...(entry === 'qr' ? { qrSessionId: 'visual-qa-session' } : {}),
        allCheckedIn: state === 'complete',
        checkedInCount,
        totalParticipants,
        remainingCount,
        ...(isCheckedIn ? {
          myCheckIn: {
            id: 2,
            partyId: 77,
            userHandle: permission === 'mate-host' ? '@visual_qa_host' : '@visual_qa_member',
            userName: permission === 'mate-host' ? '비주얼 QA 호스트' : '비주얼 QA 참여자',
            location: '잠실야구장',
            checkedInAt: '2026-09-05T17:31:00+09:00',
          },
        } : {}),
      },
      captureSelector: '[data-testid="mate-check-in-overview"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.check-in-page': (context) => {
    requireStateValue(context, 'data', 'single');
    const phase = resolveDeclaredVariant<'fallback' | 'runtime'>(context, 'phase', {
      fallback: 'fallback',
      runtime: 'runtime',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const runtimeState = phase === 'runtime'
      ? adapters['mate.check-in']({
        componentId: 'src/components/MateCheckIn.tsx#MateCheckIn',
        states: {
          data: 'single',
          permissions: 'mate-member-approved',
          interactions: 'default',
        },
        variants: {
          phase: 'runtime',
          entry: 'manual',
          validation: 'idle',
          theme,
        },
      })
      : undefined;

    return {
      props: {
        visualQaPhase: phase,
        ...(runtimeState ? {
          visualQaRuntimeStateOverride: runtimeState.props.visualQaStateOverride,
        } : {}),
      },
      captureSelector: phase === 'fallback'
        ? '[data-testid="mate-check-in-page-fallback"]'
        : '[data-testid="mate-check-in"]',
      initialPathname: '/mate/77/check-in',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.check-in-roster': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const permission = requireStateValueFromMap(context, 'permissions', {
      'mate-host': 'mate-host',
      'mate-member-approved': 'mate-member-approved',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const state = resolveDeclaredVariant<'complete' | 'empty' | 'host-only' | 'partial'>(context, 'state', {
      complete: 'complete',
      empty: 'empty',
      'host-only': 'host-only',
      partial: 'partial',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const isDefault = interaction === 'default';
    const targetIsValid = isDefault
      ? context.interactionTargetId === undefined
      : context.interactionTargetId === 'chat';
    const isPressureRepresentative = permission === 'mate-member-approved'
      && state === 'partial'
      && isDefault;
    const validDataState = data === 'single'
      || (['long-korean', 'unbroken-token', 'maximum-supported'].includes(data)
        && isPressureRepresentative);
    if (!validDataState || !targetIsValid || context.states.system !== undefined) {
      throw new Error(
        `지원하지 않는 MateCheckInRosterRuntime state: ${data}:${permission}:${interaction}:${state}:${context.interactionTargetId ?? '<none>'}`,
      );
    }

    const isMaximum = data === 'maximum-supported';
    const otherCount = state === 'partial' || state === 'complete'
      ? isMaximum ? 9 : 2
      : 0;
    const hostName = data === 'long-korean'
      ? '비주얼 QA 호스트 이름이 모바일 카드에서 여러 줄로 표시되어야 하는 매우 긴 한국어 이름'
      : data === 'unbroken-token'
        ? `HOST${'UNBROKEN'.repeat(18)}`
        : '비주얼 QA 호스트';
    const otherCheckIns = Array.from({ length: otherCount }, (_, index) => ({
      id: index + 3,
      partyId: 77,
      userHandle: `@visual_qa_guest_${index}`,
      userName: data === 'long-korean'
        ? `모바일 체크인 로스터에서 여러 줄로 표시되어야 하는 참여자 이름 ${index + 1}`
        : data === 'unbroken-token'
          ? `PARTICIPANT${'UNBROKEN'.repeat(16)}${index + 1}`
          : `참여자 ${index + 1}`,
      location: '잠실야구장',
      checkedInAt: `2026-09-05T17:${String(32 + index).padStart(2, '0')}:00+09:00`,
    }));
    const isHost = permission === 'mate-host';
    const hostCheckedIn = state !== 'empty';
    const isCheckedIn = state === 'partial'
      || state === 'complete'
      || (isHost && state === 'host-only');
    const remainingCount = isMaximum
      ? 1
      : state === 'empty'
        ? 4
        : state === 'host-only'
          ? 3
          : state === 'partial'
            ? isHost ? 3 : 2
            : 0;

    return {
      props: {
        party: {
          id: 77,
          hostId: 11,
          hostHandle: '@visual_qa_host',
          hostName,
          hostBadge: 'TRUSTED',
          hostAverageRating: 4.9,
          hostReviewCount: 27,
          teamId: 'LG',
          cheeringSide: 'HOME',
          gameDate: '2026-09-05',
          gameTime: '18:30:00',
          stadium: '잠실',
          homeTeam: 'LG',
          awayTeam: 'OB',
          section: '1루 내야 101구역',
          maxParticipants: isMaximum ? 12 : 6,
          currentParticipants: isMaximum ? 12 : 6,
          description: 'Visual QA 체크인 roster fixture',
          ticketVerified: true,
          status: state === 'complete' ? 'COMPLETED' : 'MATCHED',
          ticketPrice: 28000,
          reservationDepositAmount: 10000,
          hostTrustMetrics: null,
          createdAt: '2026-08-27T00:00:00+09:00',
        },
        isHost,
        isCheckedIn,
        hostCheckedIn,
        otherCheckIns,
        remainingCount,
        hasAnyCheckIn: state !== 'empty',
        onNavigateToChat: () => {},
      },
      captureSelector: '[data-testid="mate-check-in-roster"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.check-in-status': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const state = resolveDeclaredVariant<'checking' | 'complete' | 'ready' | 'waiting'>(context, 'state', {
      checking: 'checking',
      complete: 'complete',
      ready: 'ready',
      waiting: 'waiting',
    });
    const entry = resolveDeclaredVariant<'manual' | 'qr'>(context, 'entry', {
      manual: 'manual',
      qr: 'qr',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const isDefault = interaction === 'default';
    const expectedTarget = state === 'ready'
      ? 'check-in'
      : state === 'complete'
        ? 'complete'
        : undefined;
    const targetIsValid = isDefault
      ? context.interactionTargetId === undefined
      : context.interactionTargetId === expectedTarget;
    const isPressureRepresentative = state === 'waiting'
      && entry === 'manual'
      && isDefault;
    const validDataState = data === 'single'
      || (['long-korean', 'unbroken-token', 'maximum-supported'].includes(data)
        && isPressureRepresentative);
    if (
      !validDataState
      || !targetIsValid
      || context.states.permissions !== undefined
      || context.states.system !== undefined
    ) {
      throw new Error(
        `지원하지 않는 MateCheckInStatusRuntime state: ${data}:${interaction}:${state}:${entry}:${context.interactionTargetId ?? '<none>'}`,
      );
    }

    const isMaximum = data === 'maximum-supported';
    const totalParticipants = isMaximum ? Number.MAX_SAFE_INTEGER : 4;
    const checkedInCount = isMaximum
      ? Number.MAX_SAFE_INTEGER - 1
      : { checking: 0, complete: 4, ready: 0, waiting: 2 }[state];
    const remainingCount = totalParticipants - checkedInCount;
    const progressValue = Math.round((checkedInCount / totalParticipants) * 100);
    const isCheckedIn = state === 'waiting' || state === 'complete';
    const sessionLabel = data === 'long-korean'
      ? '상세 페이지의 QR 링크를 통해 연결된 매우 긴 한국어 체크인 진입 방식 안내'
      : data === 'unbroken-token'
        ? `SESSION${'UNBROKEN'.repeat(24)}`
        : entry === 'qr'
          ? 'QR 세션 진입'
          : '일반 진입';

    return {
      props: {
        isCheckedIn,
        isChecking: state === 'checking',
        allCheckedIn: state === 'complete',
        checkedInCount,
        totalParticipants,
        remainingCount,
        progressValue,
        sessionLabel,
        ...(isCheckedIn ? {
          myCheckIn: {
            id: 2,
            partyId: 77,
            userHandle: '@visual_qa_member',
            userName: '비주얼 QA 참여자',
            location: '잠실야구장',
            checkedInAt: '2026-09-05T17:31:00+09:00',
          },
        } : {}),
        onCheckIn: () => {},
        onComplete: () => {},
      },
      captureSelector: '[data-testid="mate-check-in-status"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.create': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'long-korean': 'long-korean',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const phase = resolveDeclaredVariant(context, 'phase', {
      'confirm-fallback': 'confirm-fallback',
      'confirm-runtime': 'confirm-runtime',
      'description-fallback': 'description-fallback',
      'description-runtime': 'description-runtime',
      'match-fallback': 'match-fallback',
      'match-runtime': 'match-runtime',
      'seat-fallback': 'seat-fallback',
      'seat-runtime': 'seat-runtime',
      'ticket-fallback': 'ticket-fallback',
      'ticket-runtime': 'ticket-runtime',
      'verification-fallback': 'verification-fallback',
      'verification-runtime': 'verification-runtime',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const step = phase.startsWith('ticket')
      ? 1
      : phase.startsWith('match')
        ? 2
        : phase.startsWith('seat')
          ? 3
          : 4;
    const expectedTargets: Record<string, string[]> = {
      'description-runtime': ['back', 'prev', 'submit'],
      'match-runtime': ['back', 'prev', 'next'],
      'seat-runtime': ['back', 'prev', 'next'],
      'ticket-runtime': ['back', 'next'],
    };
    const targetIsValid = interaction === 'default'
      ? context.interactionTargetId === undefined
      : expectedTargets[phase]?.includes(context.interactionTargetId ?? '') === true;
    const isPressureRepresentative = phase === 'description-runtime'
      && interaction === 'default';
    const validDataState = data === 'single'
      || ((data === 'long-korean' || data === 'unbroken-token') && isPressureRepresentative);
    if (
      !validDataState
      || !targetIsValid
      || context.states.permissions !== undefined
      || context.states.system !== undefined
    ) {
      throw new Error(
        `지원하지 않는 MateCreate state: ${data}:${interaction}:${phase}:${context.interactionTargetId ?? '<none>'}`,
      );
    }

    const noop = () => {};
    const description = data === 'long-korean'
      ? '모바일 화면에서 파티 소개 문장이 자연스럽게 여러 줄로 흐르며 버튼이나 글자 수 안내를 가리지 않는지 확인하기 위한 매우 긴 한국어 설명입니다. 함께 즐겁고 안전하게 응원할 메이트를 찾고 있습니다.'
      : data === 'unbroken-token'
        ? `DESCRIPTION${'UNBROKEN'.repeat(18)}`
        : '즐겁고 안전하게 함께 응원할 직관 메이트를 찾습니다.';
    const blockedStepMessage = data === 'long-korean'
      ? '모바일 화면에서 매우 긴 단계 안내 문장이 카드 너비를 넘지 않고 자연스럽게 줄바꿈되는지 확인합니다.'
      : data === 'unbroken-token'
        ? `BLOCKED${'UNBROKEN'.repeat(20)}`
        : '';
    const formData = {
      gameDate: '2026-09-05',
      gameTime: '18:30',
      homeTeam: 'doosan',
      awayTeam: 'lg',
      stadium: '잠실야구장',
      section: '1루 내야',
      cheeringSide: 'HOME',
      seatCategory: '일반/시야',
      seatDetail: '305블록 12열 15번',
      maxParticipants: 2,
      ticketPrice: 28000,
      reservationDepositAmount: 10000,
      description,
      ticketFile: new File(['visual-qa'], 'visual-qa-ticket.jpg', { type: 'image/jpeg' }),
      reservationNumber: 'VISUAL-QA-2026',
    };
    const isConfirming = phase === 'confirm-fallback' || phase === 'confirm-runtime';
    const showVerificationDialog = phase === 'verification-fallback'
      || phase === 'verification-runtime';

    return {
      props: {
        visualQaStateOverride: {
          phase,
          controller: {
            createStep: step,
            canGoNext: true,
            canGoPrev: step > 1,
            isScanning: false,
            isSubmitting: false,
            isSubmitDisabled: false,
            isLoadingMatches: false,
            isConfirming,
            availableMatches: [{
              id: 'visual-qa-internal-fixture',
              gameTime: '18:30',
              homeTeam: 'doosan',
              awayTeam: 'lg',
              stadium: '잠실야구장',
            }],
            errorType: null,
            formData,
            formErrors: { description: '', ticketFile: '' },
            updateFormData: noop,
            goNext: noop,
            goPrev: noop,
            confirmSubmit: noop,
            cancelSubmit: noop,
            retry: noop,
            availableCategoryKeys: [
              'CHEERING',
              'TABLE',
              'PREMIUM',
              'EXCITING',
              'COMFORT',
              'SPECIAL',
              'OUTFIELD',
            ],
            blockedStepMessage,
            fileErrorMessage: '',
            handleBack: noop,
            handleDescriptionBlur: noop,
            handleDescriptionChange: noop,
            handleFileUpload: noop,
            handleSubmit: noop,
            knownStadiumNames: ['잠실야구장'],
            matchLoadErrorMessage: '',
            progressValue: (step / 4) * 100,
            selectMatch: noop,
            setShowVerificationDialog: noop,
            showVerificationDialog,
          },
        },
      },
      captureSelector: '[data-testid="mate-create"]',
      initialPathname: '/mate/create',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.create-confirm-dialog': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const submission = resolveDeclaredVariant(context, 'submission', {
      idle: 'idle',
      pending: 'pending',
    });
    const deposit = resolveDeclaredVariant(context, 'deposit', {
      none: 'none',
      present: 'present',
    });
    const seat = resolveDeclaredVariant(context, 'seat', {
      detailed: 'detailed',
      'legacy-section': 'legacy-section',
    });
    const time = resolveDeclaredVariant(context, 'time', {
      fallback: 'fallback',
      provided: 'provided',
    });
    const cheeringSide = resolveDeclaredVariant<'AWAY' | 'HOME' | 'NEUTRAL'>(
      context,
      'cheering',
      {
        away: 'AWAY',
        home: 'HOME',
        neutral: 'NEUTRAL',
      },
    );
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const targetIsValid = interaction === 'default'
      ? context.interactionTargetId === undefined
      : submission === 'idle'
        && (context.interactionTargetId === 'cancel' || context.interactionTargetId === 'confirm');
    const isPressureRepresentative = interaction === 'default'
      && submission === 'idle'
      && deposit === 'present'
      && seat === 'detailed'
      && time === 'provided'
      && cheeringSide === 'HOME';
    const validDataState = data === 'single'
      || (data !== 'single' && isPressureRepresentative);
    if (
      !validDataState
      || !targetIsValid
      || context.states.permissions !== undefined
      || context.states.system !== undefined
    ) {
      throw new Error(
        `지원하지 않는 MateCreateConfirmDialog state: ${data}:${interaction}:${submission}:${deposit}:${seat}:${time}:${cheeringSide}:${context.interactionTargetId ?? '<none>'}`,
      );
    }

    const isMaximum = data === 'maximum-supported';
    const stadium = data === 'long-korean'
      ? '서울 지역에서 대중교통으로 이동할 수 있는 매우 긴 이름의 야구 경기장 안내 구역'
      : data === 'unbroken-token'
        ? `STADIUM${'UNBROKEN'.repeat(20)}`
        : isMaximum
          ? '최대길이경기장'.repeat(24)
          : '잠실야구장';
    const seatDetail = data === 'long-korean'
      ? '중앙 테이블석 상단 출입구에서 오른쪽으로 이동한 열두 번째 좌석'
      : data === 'unbroken-token'
        ? `SEAT${'UNBROKEN'.repeat(20)}`
        : isMaximum
          ? '최대길이좌석정보'.repeat(24)
          : '305블록 12열 15번';
    const description = data === 'long-korean'
      ? '모바일 확인 창에서 파티 소개 문장이 자연스럽게 여러 줄로 표시되고 아래 버튼을 가리지 않는지 확인하기 위한 긴 한국어 소개글입니다.'
      : data === 'unbroken-token'
        ? `DESCRIPTION${'UNBROKEN'.repeat(18)}`
        : isMaximum
          ? '가'.repeat(200)
          : '즐겁고 안전하게 함께 응원할 직관 메이트를 찾습니다.';

    return {
      props: {
        formData: {
          gameDate: '2026-09-05',
          gameTime: time === 'provided' ? '18:30' : '',
          homeTeam: 'doosan',
          awayTeam: 'lg',
          stadium,
          section: '1루 내야 101구역',
          cheeringSide,
          seatCategory: '일반/시야',
          seatDetail: seat === 'detailed' ? seatDetail : '',
          maxParticipants: isMaximum ? 4 : 2,
          ticketPrice: isMaximum ? Number.MAX_SAFE_INTEGER : 28000,
          reservationDepositAmount: deposit === 'present'
            ? (isMaximum ? Number.MAX_SAFE_INTEGER : 10000)
            : 0,
          description,
          ticketFile: null,
          reservationNumber: 'VISUAL-QA-2026',
        },
        isSubmitting: submission === 'pending',
        onCancel: () => {},
        onConfirm: () => {},
      },
      captureSelector: '[data-testid="mate-create-confirm-dialog"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.create-description-step': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const validation = resolveDeclaredVariant(context, 'validation', {
      error: 'error',
      none: 'none',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const isTagTarget = /^tag-[0-5]$/.test(context.interactionTargetId ?? '');
    const targetIsValid = interaction === 'default'
      ? context.interactionTargetId === undefined
      : interaction === 'focus-visible'
        ? context.interactionTargetId === 'description' || isTagTarget
        : isTagTarget;
    const isPressureRepresentative = interaction === 'default' && validation === 'none';
    const validDataState = data === 'single'
      || (data !== 'single' && isPressureRepresentative);
    if (
      !validDataState
      || !targetIsValid
      || context.states.permissions !== undefined
      || context.states.system !== undefined
    ) {
      throw new Error(
        `지원하지 않는 MateCreateDescriptionStep state: ${data}:${interaction}:${validation}:${context.interactionTargetId ?? '<none>'}`,
      );
    }

    const styleTags = [
      '#열정응원🔥',
      '#공격때_기립🧍',
      '#조용한관람🤫',
      '#먹방진심🍗',
      '#유니폼필수👕',
      '#직관승요🧚',
    ];
    const descriptions: Record<string, string> = {
      empty: '',
      'long-korean': '모바일 화면에서 소개글과 글자 수 안내가 자연스럽게 줄바꿈되는지 확인하기 위한 긴 한국어 문장입니다. 함께 안전하고 즐겁게 응원할 직관 메이트를 찾으며 경기 시작 전 약속 장소와 관람 성향을 충분히 이야기합니다.'.repeat(3).slice(0, 170),
      'maximum-supported': `${styleTags.join(' ')} ${'가'.repeat(200)}`.slice(0, 200),
      single: `함께 즐겁고 안전하게 응원할 직관 메이트를 찾습니다. ${styleTags[0]}`,
      'unbroken-token': `DESCRIPTION${'UNBROKEN'.repeat(30)}`.slice(0, 200),
    };

    return {
      props: {
        formData: {
          gameDate: '2026-09-05',
          gameTime: '18:30',
          homeTeam: 'doosan',
          awayTeam: 'lg',
          stadium: '잠실야구장',
          section: '1루 내야 101구역',
          cheeringSide: 'HOME',
          seatCategory: '일반/시야',
          seatDetail: '305블록 12열 15번',
          maxParticipants: 2,
          ticketPrice: 28000,
          reservationDepositAmount: 10000,
          description: descriptions[data],
          ticketFile: null,
          reservationNumber: 'VISUAL-QA-2026',
        },
        formErrors: {
          description: validation === 'error'
            ? '소개글에 사용할 수 없는 표현이 포함되어 있습니다.'
            : '',
          ticketFile: '',
        },
        onDescriptionBlur: () => {},
        onDescriptionChange: () => {},
      },
      captureSelector: '[data-testid="mate-create-description-step"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-4 shadow-none',
      theme,
    };
  },
  'mate.create-match-step': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const system = requireStateValueFromMap(context, 'system', {
      offline: 'offline',
      online: 'online',
      timeout: 'timeout',
    });
    const phase = resolveDeclaredVariant(context, 'phase', {
      'date-only': 'date-only',
      error: 'error',
      loading: 'loading',
      'manual-complete': 'manual-complete',
      'manual-empty': 'manual-empty',
      'results-selected': 'results-selected',
      'results-unselected': 'results-unselected',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const isError = phase === 'error';
    const isManual = isError || phase === 'manual-empty' || phase === 'manual-complete';
    const isResults = phase === 'results-selected' || phase === 'results-unselected';
    const target = context.interactionTargetId;
    const targetIsValid = interaction === 'default'
      ? target === undefined
      : interaction === 'focus-visible'
        ? target === 'date'
          || (isError && target === 'retry')
          || (isManual && new Set([
            'manual-time',
            'manual-stadium',
            'manual-away',
            'manual-home',
          ]).has(target ?? ''))
          || (isResults && (target === 'match-first' || target === 'match-last'))
        : (isError && target === 'retry')
          || (isResults && (target === 'match-first' || target === 'match-last'));
    const validSystemState = system === 'online' || isError;
    const isPressureRepresentative = interaction === 'default'
      && (
        (data === 'long-korean' && phase === 'error' && system === 'timeout')
        || (data === 'unbroken-token' && phase === 'results-unselected' && system === 'online')
        || (data === 'maximum-supported' && phase === 'results-selected' && system === 'online')
      );
    const validDataState = data === 'single' || isPressureRepresentative;
    if (
      !targetIsValid
      || !validSystemState
      || !validDataState
      || context.states.permissions !== undefined
    ) {
      throw new Error(
        `지원하지 않는 MateCreateMatchStep state: ${data}:${interaction}:${system}:${phase}:${target ?? '<none>'}`,
      );
    }

    const unbrokenStadium = `STADIUM${'UNBROKEN'.repeat(24)}`;
    const ordinaryMatches = [
      {
        id: 'visual-qa-match-1',
        gameTime: '18:30',
        awayTeam: 'lg',
        homeTeam: 'doosan',
        stadium: data === 'unbroken-token' ? unbrokenStadium : '잠실야구장',
      },
      {
        id: 'visual-qa-match-2',
        gameTime: '18:30',
        awayTeam: 'kt',
        homeTeam: 'hanwha',
        stadium: data === 'unbroken-token'
          ? `${unbrokenStadium}SECOND`
          : '대전 한화생명볼파크',
      },
    ];
    const maximumMatches = Array.from({ length: 12 }, (_, index) => ({
      id: `visual-qa-match-${index + 1}`,
      gameTime: index % 2 === 0 ? '18:30' : '19:00',
      awayTeam: index % 2 === 0 ? 'lg' : 'kt',
      homeTeam: index % 2 === 0 ? 'doosan' : 'hanwha',
      stadium: `최대 경기 목록 ${index + 1}번 구장`,
    }));
    const availableMatches = isResults
      ? (data === 'maximum-supported' ? maximumMatches : ordinaryMatches)
      : [];
    const selectedMatch = availableMatches[0];
    const hasSelectedResult = phase === 'results-selected' && selectedMatch != null;
    const isManualComplete = phase === 'manual-complete';
    const matchLoadErrorMessage = isError
      ? system === 'offline'
        ? '네트워크에 연결할 수 없습니다. 연결 상태를 확인한 뒤 다시 시도해주세요.'
        : system === 'timeout'
          ? data === 'long-korean'
            ? '경기 목록 조회가 제한 시간 안에 완료되지 않았습니다. 모바일 화면에서 이 긴 안내 문구가 다시 시도 버튼과 수동 입력 영역을 밀어내거나 가리지 않는지 확인해주세요.'
            : '경기 목록 조회가 제한 시간 안에 완료되지 않았습니다.'
          : '경기 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
      : '';

    return {
      props: {
        formData: {
          gameDate: phase === 'date-only' ? '' : '2026-09-05',
          gameTime: hasSelectedResult
            ? selectedMatch.gameTime
            : isManualComplete
              ? '18:30'
              : '',
          homeTeam: hasSelectedResult
            ? selectedMatch.homeTeam
            : isManualComplete
              ? 'doosan'
              : '',
          awayTeam: hasSelectedResult
            ? selectedMatch.awayTeam
            : isManualComplete
              ? 'lg'
              : '',
          stadium: hasSelectedResult
            ? selectedMatch.stadium
            : isManualComplete
              ? '잠실야구장'
              : '',
          section: '',
          cheeringSide: '',
          seatCategory: '',
          seatDetail: '',
          maxParticipants: 2,
          ticketPrice: 0,
          reservationDepositAmount: 0,
          description: '',
          ticketFile: null,
          reservationNumber: '',
        },
        matchLoadErrorMessage,
        isLoadingMatches: phase === 'loading',
        availableMatches,
        retry: () => {},
        selectMatch: () => {},
        updateFormData: () => {},
        knownStadiumNames: [
          '잠실야구장',
          '고척스카이돔',
          '대전 한화생명볼파크',
        ],
      },
      captureSelector: '[data-testid="mate-create-match-step"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-4 shadow-none',
      theme,
    };
  },
  'mate.create-page': (context) => {
    requireStateValue(context, 'data', 'single');
    const phase = resolveDeclaredVariant<'fallback' | 'runtime'>(context, 'phase', {
      fallback: 'fallback',
      runtime: 'runtime',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const runtimeState = phase === 'runtime'
      ? adapters['mate.create']({
        componentId: 'src/components/MateCreate.tsx#MateCreate',
        states: {
          data: 'single',
          interactions: 'default',
        },
        variants: {
          phase: 'ticket-runtime',
          theme,
        },
      })
      : undefined;

    return {
      props: {
        visualQaPhase: phase,
        ...(runtimeState ? {
          visualQaRuntimeStateOverride: runtimeState.props.visualQaStateOverride,
        } : {}),
      },
      captureSelector: phase === 'fallback'
        ? '[data-testid="mate-create-page-fallback"]'
        : '[data-testid="mate-create"]',
      initialPathname: '/mate/create',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.detail-page': (context) => {
    requireStateValue(context, 'data', 'single');
    const phase = resolveDeclaredVariant<'fallback' | 'runtime'>(context, 'phase', {
      fallback: 'fallback',
      runtime: 'runtime',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });

    return {
      props: { visualQaPhase: phase },
      captureSelector: phase === 'fallback'
        ? '[data-testid="mate-detail-page-fallback"]'
        : '[data-testid="mate-detail-runtime"][data-phase="error"]',
      initialPathname: '/mate/visual-qa-missing-id',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.detail-action-dialog': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      input: 'input',
      pressed: 'pressed',
      selected: 'selected',
      submitting: 'submitting',
    });
    const dialog = resolveDeclaredVariant<'cancel' | 'sale'>(context, 'dialog', {
      cancel: 'cancel',
      sale: 'sale',
    });
    const pending = resolveDeclaredVariant(context, 'pending', {
      idle: false,
      pending: true,
    });
    const selection = resolveDeclaredVariant<'first' | 'last'>(context, 'selection', {
      first: 'first',
      last: 'last',
    });
    const validation = resolveDeclaredVariant<'error' | 'none'>(context, 'validation', {
      error: 'error',
      none: 'none',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const validPresentation = dialog === 'cancel'
      ? validation === 'none'
      : selection === 'first'
        && !((data === 'long-korean' || data === 'unbroken-token') && validation !== 'error')
        && !(data === 'maximum-supported' && validation !== 'none');
    const cancelTargets = new Set([
      'cancel-close',
      'cancel-reason-first',
      'cancel-reason-last',
      'cancel-memo',
      'cancel-back',
      'cancel-confirm',
    ]);
    const saleTargets = new Set(['sale-close', 'sale-price', 'sale-cancel', 'sale-confirm']);
    const targetId = context.interactionTargetId;
    const isCanonicalInteractionState = data === 'single'
      && !pending
      && validation === 'none'
      && selection === 'first';
    const validInteraction = interaction === 'default'
      ? targetId === undefined
      : (interaction === 'hover' || interaction === 'focus-visible' || interaction === 'pressed')
        ? isCanonicalInteractionState
          && (dialog === 'cancel' ? cancelTargets.has(targetId ?? '') : saleTargets.has(targetId ?? ''))
        : interaction === 'input'
          ? isCanonicalInteractionState
            && targetId === (dialog === 'cancel' ? 'cancel-memo' : 'sale-price')
          : interaction === 'submitting'
            ? isCanonicalInteractionState
              && targetId === (dialog === 'cancel' ? 'cancel-confirm' : 'sale-confirm')
            : interaction === 'selected'
              ? dialog === 'cancel'
                && data === 'single'
                && !pending
                && validation === 'none'
                && (
                  (selection === 'first' && targetId === 'cancel-reason-last')
                  || (selection === 'last' && targetId === 'cancel-reason-first')
                )
              : false;
    if (
      !validPresentation
      || !validInteraction
      || context.states.permissions !== undefined
      || context.states.system !== undefined
    ) {
      throw new Error(
        `지원하지 않는 MateDetailActionDialogs state: ${data}:${interaction}:${dialog}:${pending ? 'pending' : 'idle'}:${selection}:${validation}:${targetId ?? '<none>'}`,
      );
    }

    const productionOptions = [
      {
        value: 'BUYER_CHANGED_MIND',
        label: '단순변심(구매자)',
        description: '직거래 신청 취소(플랫폼 결제/환불 없음)',
      },
      {
        value: 'SELLER_CHANGED_MIND',
        label: '단순변심(판매자)',
        description: '직거래 신청 취소(플랫폼 결제/환불 없음)',
      },
      {
        value: 'OTHER',
        label: '기타 사유',
        description: '사유 확인 후 신청 취소(플랫폼 결제/환불 없음)',
      },
    ];
    const cancelReasonOptions = data === 'long-korean'
      ? productionOptions.map((option, index) => ({
        ...option,
        label: `${index + 1}번째 취소 사유를 모바일 화면에서도 이해할 수 있도록 설명하는 긴 한국어 선택 항목`,
        description: '직거래 취소 정책과 처리 범위를 여러 줄로 확인해도 아래 선택지나 입력 영역을 가리지 않아야 합니다.',
      }))
      : data === 'unbroken-token'
        ? productionOptions.map((option, index) => ({
          ...option,
          label: `CANCELREASON-${index}-${'X'.repeat(96)}`,
          description: `CANCELDESCRIPTION-${index}-${'Y'.repeat(128)}`,
        }))
        : productionOptions;
    const cancelMemo = data === 'long-korean'
      ? '모바일 다이얼로그의 본문과 하단 작업 버튼 사이에서 긴 추가 메모가 자연스럽게 줄바꿈되고 스크롤되는지 확인합니다.'.repeat(3)
      : data === 'unbroken-token'
        ? `CANCELMEMO-${'Z'.repeat(240)}`
        : data === 'maximum-supported'
          ? '가'.repeat(500)
          : '';
    const salePrice = data === 'maximum-supported' ? `${Number.MAX_SAFE_INTEGER}` : '';
    const salePriceError = validation === 'error'
      ? data === 'long-korean'
        ? '판매 가격은 100원 이상의 양의 정수여야 하며 입력값을 다시 확인한 뒤 판매 전환을 진행해주세요.'.repeat(2)
        : data === 'unbroken-token'
          ? `SALEPRICEERROR-${'X'.repeat(180)}`
          : '양의 정수를 입력해주세요.'
      : '';

    return {
      props: {
        showCancelDialog: dialog === 'cancel',
        showSaleDialog: dialog === 'sale',
        isCancelling: dialog === 'cancel' && pending,
        isConvertingToSale: dialog === 'sale' && pending,
        cancelReasonOptions,
        selectedCancelReason: selection === 'last' ? 'OTHER' : 'BUYER_CHANGED_MIND',
        cancelMemo,
        salePrice,
        salePriceError,
        onCloseCancelDialog: () => {},
        onExecuteCancelApplication: () => {},
        onSelectCancelReason: () => {},
        onChangeCancelMemo: () => {},
        onCloseSaleDialog: () => {},
        onConfirmSale: () => {},
        onChangeSalePrice: () => {},
        visualQaStateOverride: { interactive: true },
      },
      captureSelector: dialog === 'cancel'
        ? '[data-testid="mate-detail-cancel-dialog"]'
        : '[data-testid="mate-detail-sale-dialog"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.detail-action-section': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const permission = requireStateValueFromMap(context, 'permissions', {
      disabled: 'disabled',
      'mate-applicant-pending': 'mate-applicant-pending',
      'mate-applicant-rejected': 'mate-applicant-rejected',
      'mate-host': 'mate-host',
      'mate-member-approved': 'mate-member-approved',
      'non-owner': 'non-owner',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      'keyboard-navigation': 'keyboard-navigation',
      open: 'open',
      pressed: 'pressed',
    });
    const actions = resolveDeclaredVariant<'maximum' | 'minimal'>(context, 'actions', {
      maximum: 'maximum',
      minimal: 'minimal',
    });
    const pending = resolveDeclaredVariant<'action' | 'idle' | 'share'>(context, 'pending', {
      action: 'action',
      idle: 'idle',
      share: 'share',
    });
    const surface = resolveDeclaredVariant<'desktop-rail' | 'mobile-bar' | 'mobile-sheet'>(
      context,
      'surface',
      {
        'desktop-rail': 'desktop-rail',
        'mobile-bar': 'mobile-bar',
        'mobile-sheet': 'mobile-sheet',
      },
    );
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const isHost = permission === 'mate-host';
    const isApproved = permission === 'mate-member-approved';
    const isAwaitingApproval = permission === 'mate-applicant-pending';
    const supportsMaximumActions = isHost || isApproved;
    const actionPendingIsVisible = (
      (isHost && actions === 'maximum')
      || (isApproved && actions === 'maximum')
      || isAwaitingApproval
    ) && (surface !== 'mobile-bar' || isAwaitingApproval);
    const sharePendingIsVisible = isHost && surface !== 'mobile-bar';
    const validPresentation = (actions === 'minimal' || supportsMaximumActions)
      && (pending !== 'action' || actionPendingIsVisible)
      && (pending !== 'share' || sharePendingIsVisible)
      && (permission !== 'disabled' || surface === 'desktop-rail');
    const surfaceTargets: Record<typeof surface, Set<string>> = {
      'mobile-bar': new Set(['mobile-primary', 'mobile-summary']),
      'mobile-sheet': new Set([
        'sheet-action-chat',
        'sheet-action-checkin',
        'sheet-action-manage',
        'sheet-action-sale',
        'sheet-close',
        'sheet-share-cheer',
      ]),
      'desktop-rail': new Set([
        'desktop-action-chat',
        'desktop-action-checkin',
        'desktop-action-manage',
        'desktop-action-sale',
        'desktop-browse',
        'desktop-qr',
        'desktop-share-cheer',
        'desktop-share-friend',
      ]),
    };
    const targetId = context.interactionTargetId;
    const canonicalInteractionState = data === 'single'
      && isHost
      && actions === 'maximum'
      && pending === 'idle';
    const validInteraction = interaction === 'default'
      ? targetId === undefined
      : (interaction === 'hover' || interaction === 'focus-visible' || interaction === 'pressed')
        ? canonicalInteractionState && surfaceTargets[surface].has(targetId ?? '')
        : interaction === 'open'
          ? canonicalInteractionState
            && surface === 'mobile-bar'
            && (targetId === 'mobile-summary' || targetId === 'mobile-primary')
          : interaction === 'keyboard-navigation'
            ? canonicalInteractionState
              && surface === 'mobile-sheet'
              && targetId === 'sheet-close'
            : false;
    if (!validPresentation || !validInteraction || context.states.system !== undefined) {
      throw new Error(
        `지원하지 않는 MateDetailActionSection state: ${data}:${permission}:${interaction}:${actions}:${pending}:${surface}:${targetId ?? '<none>'}`,
      );
    }

    const noop = () => {};
    const status = permission === 'mate-member-approved'
      ? 'MATCHED'
      : permission === 'disabled'
        ? 'SELLING'
        : 'PENDING';
    const copy = data === 'long-korean'
      ? {
        eyebrow: '모바일 상세 액션 안내',
        title: '핵심 정보와 참여 조건을 모바일 화면에서도 충분히 이해한 뒤 안전하게 다음 행동을 선택할 수 있습니다.',
        detail: '승인 이후 채팅에서 만날 시간과 장소, 티켓 전달 방식, 체크인 순서를 차근차근 조율합니다.',
        section: '잠실야구장 1루 측 내야 지정석 중 시야와 이동 동선을 함께 확인해야 하는 매우 긴 구역 이름',
        seatDetail: '출입구에서 여러 계단을 지난 뒤 도착하는 101블록 12열 통로 쪽 좌석 상세 안내',
      }
      : data === 'unbroken-token'
        ? {
          eyebrow: `ACTIONEYEBROW-${'X'.repeat(96)}`,
          title: `ACTIONTITLE-${'Y'.repeat(160)}`,
          detail: `ACTIONDETAIL-${'Z'.repeat(220)}`,
          section: `SECTION-${'S'.repeat(140)}`,
          seatDetail: `SEATDETAIL-${'D'.repeat(180)}`,
        }
        : {
          eyebrow: isHost ? '호스트 모드' : '메이트 안내',
          title: isHost ? '신청을 검토하고 파티를 관리하세요.' : '핵심 정보 확인 후 바로 참여할 수 있습니다.',
          detail: '승인 후 채팅에서 거래 시간과 장소를 조율합니다.',
          section: '1루 네이비석',
          seatDetail: '101블록 12열 통로 쪽',
        };
    const maxParticipants = data === 'single' ? 2 : 4;
    const currentParticipants = data === 'single'
      ? 1
      : data === 'unbroken-token'
        ? 3
        : data === 'maximum-supported'
          ? 0
          : 2;
    const maximumAmount = Number.MAX_SAFE_INTEGER;
    const party = {
      id: 9042,
      hostId: 77,
      hostHandle: '@visual-qa-host',
      hostName: data === 'unbroken-token' ? `HOST-${'H'.repeat(80)}` : '비가 호스트',
      hostBadge: 'TRUSTED',
      hostAverageRating: 4.9,
      hostReviewCount: 128,
      teamId: 'lg',
      cheeringSide: 'HOME',
      gameDate: '2026-09-12',
      gameTime: '18:30:00',
      stadium: '잠실야구장',
      homeTeam: 'LG 트윈스',
      awayTeam: '두산 베어스',
      section: copy.section,
      seatDetail: copy.seatDetail,
      maxParticipants,
      currentParticipants,
      description: 'Visual QA 정적 fixture',
      ticketVerified: true,
      status,
      price: data === 'maximum-supported' ? maximumAmount : 78000,
      ticketPrice: data === 'maximum-supported' ? maximumAmount : 18000,
      reservationDepositAmount: data === 'maximum-supported'
        ? maximumAmount
        : data === 'single'
          ? 5000
          : 0,
      favorited: false,
      createdAt: '2026-08-28T00:00:00Z',
    };
    const actionLabel = (key: string, fallback: string) => data === 'long-korean'
      ? `${fallback} — 모바일에서도 행동의 결과를 충분히 이해할 수 있는 긴 한국어 버튼 문구`
      : data === 'unbroken-token'
        ? `${key.toUpperCase()}-${'A'.repeat(150)}`
        : fallback;
    let actionButtons: Array<{
      className?: string;
      disabled?: boolean;
      key: string;
      label: string;
      onClick: () => void;
      variant?: 'default' | 'ghost' | 'outline';
    }>;
    if (isHost) {
      actionButtons = [{
        key: 'manage',
        label: actionLabel('manage', '신청 관리 (2)'),
        onClick: noop,
        className: 'w-full h-14 text-lg font-bold text-white bg-primary',
      }];
      if (actions === 'maximum') {
        actionButtons.push(
          { key: 'chat', label: actionLabel('chat', '채팅방 입장'), onClick: noop, variant: 'outline', className: 'w-full h-12 border-primary text-primary' },
          { key: 'checkin', label: actionLabel('checkin', '체크인 페이지'), onClick: noop, variant: 'outline', className: 'w-full h-12 border-[#5b21b6] text-[#5b21b6]' },
          { key: 'sale', label: actionLabel('sale', '판매 전환'), onClick: noop, variant: 'outline', className: 'w-full h-12 border-orange-400 text-orange-600' },
        );
      }
    } else if (isApproved) {
      actionButtons = [{
        key: 'chat',
        label: actionLabel('chat', '채팅방 입장'),
        onClick: noop,
        className: 'w-full h-14 text-lg font-bold text-white bg-primary',
      }];
      if (actions === 'maximum') {
        actionButtons.push(
          { key: 'checkin', label: actionLabel('checkin', '체크인 페이지'), onClick: noop, variant: 'outline', className: 'w-full h-12 border-[#5b21b6] text-[#5b21b6]' },
          { key: 'cancel', label: actionLabel('cancel', '참여 취소'), onClick: noop, variant: 'outline', className: 'w-full h-10 border-red-200 text-red-500' },
        );
      }
    } else if (isAwaitingApproval) {
      actionButtons = [{ key: 'cancel', label: actionLabel('cancel', '신청 취소'), onClick: noop, variant: 'ghost', className: 'w-full text-red-500' }];
    } else if (permission === 'mate-applicant-rejected') {
      actionButtons = [{ key: 'back', label: actionLabel('back', '다른 파티 보기'), onClick: noop, variant: 'outline', className: 'w-full h-12 border-primary text-primary' }];
    } else if (permission === 'non-owner') {
      actionButtons = [{ key: 'apply', label: actionLabel('apply', '참여하기'), onClick: noop, className: 'w-full h-14 text-xl font-bold text-white bg-primary' }];
    } else {
      actionButtons = [];
    }
    if (pending === 'action') {
      const pendingKey = isHost ? 'sale' : 'cancel';
      actionButtons = actionButtons.map((action) => action.key === pendingKey
        ? {
          ...action,
          disabled: true,
          label: isHost ? '전환 중...' : '취소 중...',
        }
        : action);
    }
    const primaryMobileAction = actionButtons.find((action) => !action.disabled)
      ?? actionButtons[0]
      ?? null;
    const isMobileSurface = surface !== 'desktop-rail';

    return {
      props: {
        party,
        actionContext: {
          eyebrow: copy.eyebrow,
          title: copy.title,
          detail: copy.detail,
        },
        actionButtons,
        isAwaitingApproval,
        primaryMobileAction,
        canAccessCheckIn: actions === 'maximum' && (isHost || isApproved),
        isHost,
        onOpenQrPanel: noop,
        onShare: noop,
        onShareToCheer: noop,
        isShareToCheerPending: pending === 'share',
        onBrowsePartyList: noop,
        visualQaStateOverride: {
          layout: isMobileSurface ? 'mobile' : 'desktop',
          sheetOpen: surface === 'mobile-sheet',
        },
      },
      captureSelector: interaction === 'open'
        ? '[data-testid="mate-detail-action-sheet"]'
        : interaction === 'keyboard-navigation'
          ? '[data-testid="mate-mobile-action-bar"]'
          : surface === 'mobile-bar'
            ? '[data-testid="mate-mobile-action-bar"]'
            : surface === 'mobile-sheet'
              ? '[data-testid="mate-detail-action-sheet"]'
              : '[data-testid="mate-desktop-action-rail"]',
      surfaceClassName: isMobileSurface
        ? 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none'
        : 'block min-h-[844px] w-[360px] max-w-none overflow-visible rounded-none border-0 bg-background p-2 shadow-none',
      theme,
    };
  },
  'mate.detail-hero-block': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      single: 'single',
      'invalid-date': 'invalid-date',
      'long-korean': 'long-korean',
      'unbroken-token': 'unbroken-token',
      'unknown-team': 'unknown-team',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const compact = resolveDeclaredVariant(context, 'layout', {
      compact: true,
      full: false,
    });
    const favorited = resolveDeclaredVariant(context, 'favorite', {
      off: false,
      on: true,
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const targetId = context.interactionTargetId;
    const validInteraction = interaction === 'default'
      ? targetId === undefined
      : data === 'single'
        && compact === false
        && favorited === false
        && targetId === 'favorite';
    if (!validInteraction) {
      throw new Error(
        `지원하지 않는 MateDetailHeroBlock state: ${data}:${interaction}:${context.variants.layout}:${context.variants.favorite}:${targetId ?? '<none>'}`,
      );
    }

    const homeTeam = data === 'unbroken-token'
      ? `TEAM-${'T'.repeat(220)}`
      : data === 'unknown-team'
        ? 'UNKNOWN_HOME'
        : 'LG';
    const awayTeam = data === 'unbroken-token'
      ? `AWAY-${'A'.repeat(220)}`
      : data === 'unknown-team'
        ? 'UNKNOWN_AWAY'
        : 'DOOSAN';
    const stadium = data === 'unbroken-token'
      ? `STADIUM-${'S'.repeat(240)}`
      : data === 'long-korean'
        ? '가장 좁은 모바일 화면에서도 찜 버튼 아래로 숨어버리지 않고 자연스럽게 여러 줄로 표시되어야 하는 매우 긴 한국어 경기장 이름'
        : 'QA 테스트 구장';

    return {
      props: {
        party: {
          id: 2026082805,
          hostId: 7,
          hostHandle: 'qa-host',
          hostName: 'QA 호스트',
          hostBadge: 'VERIFIED',
          hostAverageRating: 4.8,
          hostReviewCount: 12,
          teamId: homeTeam,
          cheeringSide: 'HOME',
          gameDate: data === 'invalid-date' ? 'not-a-date' : '2026-09-01',
          gameTime: '18:30',
          stadium,
          homeTeam,
          awayTeam,
          section: '1루 내야석',
          seatDetail: '101블록 1열',
          maxParticipants: 4,
          currentParticipants: 2,
          description: '모바일 히어로 블록 검증용 파티입니다.',
          ticketVerified: true,
          status: 'PENDING',
          createdAt: '2026-08-28T09:00:00+09:00',
        },
        compact,
        favorited,
        onToggleFavorite: () => undefined,
      },
      captureSelector: '[data-testid="mate-detail-hero-block"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-2 shadow-none',
      theme,
    };
  },
  'mate.detail-host-block': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      single: 'single',
      unverified: 'unverified',
      'broken-image': 'broken-image',
      'long-korean': 'long-korean',
      'unbroken-token': 'unbroken-token',
      'maximum-supported': 'maximum-supported',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const targetId = context.interactionTargetId;
    const validInteraction = interaction === 'default'
      ? targetId === undefined
      : data === 'single' && new Set(['chat', 'profile']).has(targetId ?? '');
    if (!validInteraction) {
      throw new Error(
        `지원하지 않는 MateDetailHostBlock state: ${data}:${interaction}:${targetId ?? '<none>'}`,
      );
    }

    const isSparse = data === 'empty';
    const isMaximum = data === 'maximum-supported';
    const hostName = data === 'unbroken-token'
      ? `HOST-${'Z'.repeat(260)}`
      : data === 'long-korean'
        ? '가장 좁은 모바일 화면에서도 프로필과 평점 및 배지를 밀어내지 않고 여러 줄로 표시되어야 하는 매우 긴 한국어 호스트 이름'
        : isSparse
          ? '신규 호스트'
          : '김호스트';
    const hostProfileImageUrl = data === 'broken-image'
      ? '/__visual-qa__/missing-mate-host-avatar.png'
      : isSparse
        ? undefined
        : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" rx="32" fill="%2316a34a"/%3E%3C/svg%3E';
    const metricValue = isMaximum ? Number.MAX_SAFE_INTEGER : 38;

    return {
      props: {
        party: {
          id: 2026082802,
          hostId: 7,
          hostHandle: 'qa-host',
          hostName,
          hostProfileImageUrl,
          hostBadge: 'VERIFIED',
          hostAverageRating: isSparse ? null : 4.8,
          hostReviewCount: isSparse ? 0 : isMaximum ? Number.MAX_SAFE_INTEGER : 12,
          teamId: 'LG',
          cheeringSide: 'HOME',
          gameDate: '2026-09-01',
          gameTime: '18:30',
          stadium: 'QA 테스트 구장',
          homeTeam: 'LG',
          awayTeam: 'DOOSAN',
          section: '1루 내야석',
          seatDetail: '101블록 1열',
          maxParticipants: 4,
          currentParticipants: 2,
          description: '모바일 호스트 블록 검증용 파티입니다.',
          ticketVerified: data !== 'unverified' && !isSparse,
          status: 'PENDING',
          hostTrustMetrics: isSparse
            ? null
            : {
              averageResponseMinutes: isMaximum ? Number.MAX_SAFE_INTEGER : 25,
              completedMateCount: metricValue,
              recentNoShowCount: isMaximum ? Number.MAX_SAFE_INTEGER : 0,
            },
          createdAt: '2026-08-28T09:00:00+09:00',
        },
        onOpenChat: () => undefined,
        onOpenHostProfile: () => undefined,
      },
      captureSelector: '[data-testid="mate-detail-host-block"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-2 shadow-none',
      theme,
    };
  },
  'mate.detail-intro-block': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      single: 'single',
      unverified: 'unverified',
      'long-korean': 'long-korean',
      'unbroken-token': 'unbroken-token',
      'maximum-supported': 'maximum-supported',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const isMaximum = data === 'maximum-supported';
    const description = data === 'empty'
      ? ''
      : data === 'long-korean'
        ? `${'가장 좁은 모바일 화면에서도 소개 본문과 준비 사항이 카드 밖으로 벗어나지 않고 자연스럽게 여러 줄로 이어져야 합니다. '.repeat(4)}#열정응원 #통로선호 #첫직관환영`
        : data === 'unbroken-token'
          ? `INTRO-${'I'.repeat(260)} #TAG-${'T'.repeat(220)}`
          : isMaximum
            ? '최대 지원 항목을 확인합니다. #열정응원 #통로선호 #첫직관환영'
            : '함께 즐겁게 응원할 메이트를 찾습니다. #열정응원';
    const summaryPolicyText = data === 'unbroken-token'
      ? `POLICY-${'P'.repeat(240)}`
      : data === 'long-korean'
        ? '승인 후 채팅에서 만남 위치와 이동 동선 및 경기 종료 뒤 귀가 계획까지 충분히 조율합니다.'.repeat(3)
        : '승인 후 채팅에서 장소 조율';

    return {
      props: {
        party: {
          id: 2026082803,
          hostId: 7,
          hostHandle: 'qa-host',
          hostName: 'QA 호스트',
          hostBadge: 'VERIFIED',
          hostAverageRating: 4.8,
          hostReviewCount: 12,
          teamId: 'LG',
          cheeringSide: 'HOME',
          gameDate: '2026-09-01',
          gameTime: '18:30',
          stadium: 'QA 테스트 구장',
          homeTeam: 'LG',
          awayTeam: 'DOOSAN',
          section: '1루 내야석',
          seatDetail: '101블록 1열',
          maxParticipants: isMaximum ? Number.MAX_SAFE_INTEGER : 4,
          currentParticipants: data === 'empty'
            ? 0
            : isMaximum
              ? Number.MAX_SAFE_INTEGER
              : 2,
          description,
          ticketVerified: data !== 'empty' && data !== 'unverified',
          status: 'PENDING',
          createdAt: '2026-08-28T09:00:00+09:00',
        },
        summaryPolicyText,
      },
      captureSelector: '[data-testid="mate-detail-intro-block"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-2 shadow-none',
      theme,
    };
  },
  'mate.detail-participation-block': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      zero: 'zero',
      single: 'single',
      full: 'full',
      'roster-provided': 'roster-provided',
      'long-korean': 'long-korean',
      'unbroken-token': 'unbroken-token',
      'maximum-supported': 'maximum-supported',
      'status-matched': 'status-matched',
      'status-failed': 'status-failed',
      'status-selling': 'status-selling',
      'status-sold': 'status-sold',
      'status-checked-in': 'status-checked-in',
      'status-completed': 'status-completed',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const status = ({
      'status-matched': 'MATCHED',
      'status-failed': 'FAILED',
      'status-selling': 'SELLING',
      'status-sold': 'SOLD',
      'status-checked-in': 'CHECKED_IN',
      'status-completed': 'COMPLETED',
    } as const)[data as keyof {
      'status-matched': 'MATCHED';
      'status-failed': 'FAILED';
      'status-selling': 'SELLING';
      'status-sold': 'SOLD';
      'status-checked-in': 'CHECKED_IN';
      'status-completed': 'COMPLETED';
    }] ?? 'PENDING';
    const isZero = data === 'zero';
    const isFull = data === 'full';
    const isMaximum = data === 'maximum-supported';
    const hasRoster = new Set(['roster-provided', 'long-korean', 'unbroken-token']).has(data);
    const role = data === 'unbroken-token'
      ? `ROLE-${'R'.repeat(220)}`
      : data === 'long-korean'
        ? '가장 좁은 모바일 참여 타일에서도 주변 칸을 밀어내지 않고 한 줄 안에서 안전하게 생략되어야 하는 매우 긴 한국어 역할 이름'
        : '호스트';

    return {
      props: {
        party: {
          id: 2026082806,
          hostId: 7,
          hostHandle: 'qa-host',
          hostName: 'QA 호스트',
          hostBadge: 'VERIFIED',
          hostAverageRating: 4.8,
          hostReviewCount: 12,
          teamId: 'LG',
          cheeringSide: 'HOME',
          gameDate: '2026-09-01',
          gameTime: '18:30',
          stadium: 'QA 테스트 구장',
          homeTeam: 'LG',
          awayTeam: 'DOOSAN',
          section: '1루 내야석',
          seatDetail: '101블록 1열',
          maxParticipants: isZero ? 0 : isMaximum ? 5_000 : 4,
          currentParticipants: isZero ? 0 : isMaximum ? 4_999 : isFull ? 4 : hasRoster ? 2 : 1,
          description: '모바일 참여 현황 검증용 파티입니다.',
          ticketVerified: true,
          status,
          members: hasRoster
            ? [
                {
                  initial: 'H',
                  profileImageUrl: data === 'roster-provided' ? '/visual-qa-test-image.png' : null,
                  role,
                  host: true,
                },
                {
                  initial: 'M',
                  profileImageUrl: null,
                  role: data === 'roster-provided' ? '메이트' : role,
                  host: false,
                },
              ]
            : undefined,
          createdAt: '2026-08-28T09:00:00+09:00',
        },
      },
      captureSelector: '[data-testid="mate-detail-participation-block"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-4 shadow-none',
      theme,
    };
  },
  'mate.detail-price-box': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      zero: 'zero',
      missing: 'missing',
      'ticket-only': 'ticket-only',
      'deposit-only': 'deposit-only',
      'deposit-ticket': 'deposit-ticket',
      selling: 'selling',
      'maximum-supported': 'maximum-supported',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const isMissing = data === 'missing';
    const isSelling = data === 'selling' || data === 'maximum-supported';
    const hasDeposit = new Set(['deposit-only', 'deposit-ticket', 'maximum-supported']).has(data);
    const hasTicket = new Set(['ticket-only', 'deposit-ticket', 'selling', 'maximum-supported']).has(data);
    const maximumAmount = Number.MAX_SAFE_INTEGER;

    return {
      props: {
        party: {
          id: 2026082807,
          hostId: 7,
          hostHandle: 'qa-host',
          hostName: 'QA 호스트',
          hostBadge: 'VERIFIED',
          hostAverageRating: 4.8,
          hostReviewCount: 12,
          teamId: 'LG',
          cheeringSide: 'HOME',
          gameDate: '2026-09-01',
          gameTime: '18:30',
          stadium: 'QA 테스트 구장',
          homeTeam: 'LG',
          awayTeam: 'DOOSAN',
          section: '1루 내야석',
          seatDetail: '101블록 1열',
          maxParticipants: 4,
          currentParticipants: 2,
          description: '모바일 가격 박스 검증용 파티입니다.',
          ticketVerified: true,
          status: isSelling ? 'SELLING' : 'PENDING',
          price: isSelling ? (data === 'maximum-supported' ? maximumAmount : 125_000) : undefined,
          ticketPrice: isMissing ? undefined : hasTicket && !isSelling ? 55_000 : 0,
          reservationDepositAmount: isMissing
            ? null
            : hasDeposit
              ? (data === 'maximum-supported' ? maximumAmount : 10_000)
              : 0,
          createdAt: '2026-08-28T09:00:00+09:00',
        },
      },
      captureSelector: '[data-testid="mate-detail-price-box"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-4 shadow-none',
      theme,
    };
  },
  'mate.detail-qr-hint': (context) => {
    const permissions = requireStateValueFromMap(context, 'permissions', {
      locked: 'locked',
      'check-in-access': 'check-in-access',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      hover: 'hover',
      'focus-visible': 'focus-visible',
      pressed: 'pressed',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const targetId = context.interactionTargetId;
    const validInteraction = interaction === 'default'
      ? targetId === undefined
      : permissions === 'check-in-access' && targetId === 'open';
    if (!validInteraction) {
      throw new Error(
        `지원하지 않는 MateDetailQrHint state: ${permissions}:${interaction}:${targetId ?? '<none>'}`,
      );
    }

    return {
      props: {
        canAccessCheckIn: permissions === 'check-in-access',
        onOpenQrPanel: () => undefined,
      },
      captureSelector: '[data-testid="mate-open-qr-panel"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-4 shadow-none',
      theme,
    };
  },
  'mate.detail-reference-card': (context) => {
    const children = requireStateValueFromMap(context, 'data', {
      empty: null,
      single: '메이트 상세 카드',
      'long-korean': '가장 좁은 모바일 화면에서도 카드 안쪽 여백과 테두리를 유지하며 자연스럽게 여러 줄로 표시되어야 하는 긴 한국어 콘텐츠입니다.'.repeat(4),
      'unbroken-token': `CARD-${'K'.repeat(300)}`,
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: { children },
      captureSelector: '[data-testid="mate-detail-reference-card"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-2 shadow-none',
      theme,
    };
  },
  'mate.detail-review-block': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      single: 'single',
      'missing-host-handle': 'missing-host-handle',
      'no-comment': 'no-comment',
      'rating-below-minimum': 'rating-below-minimum',
      'rating-above-maximum': 'rating-above-maximum',
      'long-korean': 'long-korean',
      'unbroken-token': 'unbroken-token',
      'maximum-supported': 'maximum-supported',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const targetId = context.interactionTargetId;
    const validInteraction = interaction === 'default'
      ? targetId === undefined
      : data === 'single' && targetId === 'open-reviews';
    if (!validInteraction) {
      throw new Error(
        `지원하지 않는 MateDetailReviewBlock state: ${data}:${interaction}:${targetId ?? '<none>'}`,
      );
    }

    const isMaximum = data === 'maximum-supported';
    const makeSummary = (index: number) => ({
      label: data === 'unbroken-token'
        ? `LABEL-${'L'.repeat(220)}`
        : data === 'long-korean'
          ? '모바일에서도 숫자를 밀어내지 않고 자연스럽게 말줄임되어야 하는 매우 긴 후기 키워드'
          : isMaximum
            ? `최대 후기 키워드 ${index + 1}`
            : '친절한 안내',
      count: data === 'unbroken-token' || isMaximum ? Number.MAX_SAFE_INTEGER : 12,
    });
    const makeReview = (index: number) => ({
      reviewerHandle: data === 'no-comment'
        ? null
        : data === 'unbroken-token'
          ? `reviewer-${'R'.repeat(220)}`
          : data === 'long-korean'
            ? '모바일에서여러줄로표시되어야하는매우긴후기작성자'
            : `reviewer-${index + 1}`,
      rating: data === 'rating-below-minimum'
        ? 0
        : data === 'rating-above-maximum'
          ? 99
          : 5,
      comment: data === 'no-comment'
        ? null
        : data === 'unbroken-token'
          ? `COMMENT-${'C'.repeat(300)}`
          : data === 'long-korean'
            ? '가장 좁은 모바일 화면에서도 후기 본문이 카드 경계를 벗어나지 않고 자연스럽게 여러 줄로 이어져야 합니다.'.repeat(4)
            : isMaximum
              ? `최대 목록 후기 ${index + 1}`
              : '약속 시간을 잘 지키고 친절하게 안내해주셨어요.',
      createdAt: `2026-08-${String((index % 28) + 1).padStart(2, '0')}T10:00:00+09:00`,
    });
    const reviewKeywordSummary = data === 'empty'
      ? []
      : Array.from({ length: isMaximum ? 50 : 1 }, (_, index) => makeSummary(index));
    const recentHostReviews = data === 'empty'
      ? []
      : Array.from({ length: isMaximum ? 50 : 1 }, (_, index) => makeReview(index));
    const hasHostHandle = data !== 'missing-host-handle';

    return {
      props: {
        party: {
          id: 2026082804,
          hostId: 7,
          hostHandle: hasHostHandle ? 'qa-host' : undefined,
          hostName: 'QA 호스트',
          hostBadge: 'VERIFIED',
          hostAverageRating: 4.8,
          hostReviewCount: data === 'empty' ? 0 : isMaximum ? Number.MAX_SAFE_INTEGER : 12,
          teamId: 'LG',
          cheeringSide: 'HOME',
          gameDate: '2026-09-01',
          gameTime: '18:30',
          stadium: 'QA 테스트 구장',
          homeTeam: 'LG',
          awayTeam: 'DOOSAN',
          section: '1루 내야석',
          seatDetail: '101블록 1열',
          maxParticipants: 4,
          currentParticipants: 2,
          description: '모바일 후기 블록 검증용 파티입니다.',
          ticketVerified: true,
          status: 'PENDING',
          hostTrustMetrics: {
            reviewKeywordSummary,
            recentHostReviews,
          },
          createdAt: '2026-08-28T09:00:00+09:00',
        },
        onOpenHostReviews: hasHostHandle ? () => undefined : undefined,
      },
      captureSelector: '[data-testid="mate-detail-review-block"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-2 shadow-none',
      theme,
    };
  },
  'mate.detail-seat-view': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      single: 'single',
      'long-korean': 'long-korean',
      'unbroken-token': 'unbroken-token',
      'maximum-supported': 'maximum-supported',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const targetId = context.interactionTargetId;
    const validInteraction = interaction === 'default'
      ? targetId === undefined
      : data === 'single'
        && new Set(['photo-gallery', 'official-map']).has(targetId ?? '');
    if (!validInteraction) {
      throw new Error(
        `지원하지 않는 MateDetailSeatViewBlock state: ${data}:${interaction}:${targetId ?? '<none>'}`,
      );
    }

    const section = data === 'unbroken-token'
      ? `SECTION-${'X'.repeat(220)}`
      : data === 'long-korean'
        ? `가장 좁은 모바일 화면에서도 배지와 제목을 밀어내지 않고 자연스럽게 여러 줄로 표시되어야 하는 좌석 구역 ${'가'.repeat(60)}`
        : '1루 내야석';
    const seatDetail = data === 'unbroken-token'
      ? `SEAT-${'Y'.repeat(260)}`
      : data === 'long-korean'
        ? '통로에서 안쪽으로 이동한 뒤 좌석 번호와 열 정보를 확인해야 하는 매우 긴 상세 위치 안내입니다.'.repeat(3)
        : '101블록 1열';
    const visualQaPhotoCountOverride = {
      empty: 0,
      single: 1,
      'long-korean': 3,
      'unbroken-token': 3,
      'maximum-supported': 9,
    }[data];

    return {
      props: {
        party: {
          id: 2026082801,
          hostId: 7,
          hostHandle: 'qa-host',
          hostName: 'QA 호스트',
          hostBadge: 'VERIFIED',
          hostAverageRating: 4.8,
          hostReviewCount: 12,
          teamId: 'LG',
          cheeringSide: 'HOME',
          gameDate: '2026-09-01',
          gameTime: '18:30',
          stadium: 'QA 테스트 구장',
          homeTeam: 'LG',
          awayTeam: 'DOOSAN',
          section,
          seatDetail,
          maxParticipants: 4,
          currentParticipants: 2,
          description: '모바일 좌석 블록 검증용 파티입니다.',
          ticketVerified: true,
          status: 'PENDING',
          createdAt: '2026-08-28T09:00:00+09:00',
        },
        onOpenSeatViewGuide: () => undefined,
        visualQaPhotoCountOverride,
      },
      captureSelector: '[data-testid="mate-detail-seat-view-block"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-2 shadow-none',
      theme,
    };
  },
  'mate.detail-reviews-section': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'error-503': 'error-503',
      loading: 'loading',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      reviewed: 'reviewed',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const permission = requireStateValueFromMap(context, 'permissions', {
      'approved-member': 'approved-member',
      host: 'host',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const system = requireStateValueFromMap(context, 'system', {
      offline: 'offline',
      online: 'online',
      timeout: 'timeout',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const validTransport = data === 'loading'
      ? system === 'timeout'
      : data === 'error-503'
        ? system === 'offline'
        : system === 'online';
    const targetId = context.interactionTargetId;
    const validInteraction = interaction === 'default'
      ? targetId === undefined
      : (data === 'single' && system === 'online' && targetId === 'write-review')
        || (data === 'error-503' && system === 'offline' && targetId === 'retry');
    if (
      !validTransport
      || !validInteraction
      || (data === 'maximum-supported' && permission !== 'host')
    ) {
      throw new Error(
        `지원하지 않는 MateDetailReviewsSection state: ${data}:${permission}:${interaction}:${system}:${targetId ?? '<none>'}`,
      );
    }

    const isHost = permission === 'host';
    const targetHandle = data === 'unbroken-token'
      ? `mate-${'x'.repeat(160)}`
      : data === 'long-korean'
        ? 'mobile-pressure-mate'
        : 'host-kim';
    const targetName = data === 'unbroken-token'
      ? `MATE-${'Z'.repeat(180)}`
      : data === 'long-korean'
        ? `모바일에서도 리뷰 버튼과 배지를 가리지 않고 여러 줄로 표시되어야 하는 메이트 이름 ${'가'.repeat(70)}`
        : isHost
          ? '이메이트'
          : '김호스트';
    const application = (id: number, handle: string, name: string) => ({
      id,
      partyId: 20260828,
      applicantHandle: handle,
      applicantName: name,
      applicantBadge: 'VERIFIED',
      applicantRating: 4.5,
      message: `동행 신청 ${id}`,
      isApproved: true,
      isRejected: false,
      createdAt: '2026-08-28T09:00:00+09:00',
    });
    const applications = !isHost || new Set(['empty', 'error-503', 'loading']).has(data)
      ? []
      : data === 'maximum-supported'
        ? Array.from({ length: 50 }, (_, index) => application(
          index + 1,
          `mate-${String(index + 1).padStart(2, '0')}`,
          `최대 목록 검증 메이트 ${index + 1}`,
        ))
        : [application(1, targetHandle, targetName)];
    const hasReview = new Set(['reviewed', 'long-korean', 'unbroken-token']).has(data);
    const revieweeHandle = targetHandle;
    const reviewComment = data === 'long-korean'
      ? '모바일에서도 별점과 완료 배지 사이에서 후기 전체가 자연스럽게 여러 줄로 표시되어야 합니다.'.repeat(3)
      : data === 'unbroken-token'
        ? `REVIEW-${'Y'.repeat(260)}`
        : '약속 시간을 잘 지키고 친절하게 안내해주셨어요.';
    const reviews = hasReview
      ? [{
        id: 1,
        partyId: 20260828,
        reviewerHandle: 'viewer',
        revieweeHandle,
        rating: 5,
        comment: reviewComment,
        createdAt: '2026-08-28T10:00:00+09:00',
      }]
      : [];
    const isLoading = data === 'loading';
    const isError = data === 'error-503';

    return {
      props: {
        partyId: 20260828,
        partyStatus: 'COMPLETED',
        partyHostHandle: isHost || data === 'empty' ? undefined : targetHandle,
        partyHostName: targetName,
        currentUserId: 7,
        currentUserHandle: 'viewer',
        isHost,
        sectionCardClass: 'border border-gray-200/90 bg-white dark:border-white/15 dark:bg-[#000000]',
        insetPanelClass: 'rounded-13 border border-gray-200/80 bg-gray-50 dark:border-border dark:bg-secondary/70',
        onRequestReview: () => undefined,
        visualQaStateOverride: {
          reviews,
          applications,
          reviewsIsLoading: isLoading,
          applicationsIsLoading: isHost && isLoading,
          reviewsIsError: isError,
          applicationsIsError: isHost && isError,
        },
      },
      captureSelector: '[data-testid="mate-detail-reviews-section"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-2 shadow-none',
      theme,
    };
  },
  'mate.host-reviews-modal': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'error-503': 'error-503',
      loading: 'loading',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const system = requireStateValueFromMap(context, 'system', {
      offline: 'offline',
      online: 'online',
      timeout: 'timeout',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const validTransport = data === 'loading'
      ? system === 'timeout'
      : data === 'error-503'
        ? system === 'offline'
        : system === 'online';
    const targetId = context.interactionTargetId;
    const validInteraction = interaction === 'default'
      ? targetId === undefined
      : data === 'single'
        && system === 'online'
        && new Set(['header-close', 'footer-close']).has(targetId ?? '');
    if (!validTransport || !validInteraction || context.states.permissions !== undefined) {
      throw new Error(
        `지원하지 않는 MateHostReviewsModal state: ${data}:${interaction}:${system}:${targetId ?? '<none>'}`,
      );
    }

    const baseReview = {
      id: 1,
      partyId: 20260828,
      reviewerHandle: 'mate-reviewer',
      revieweeHandle: 'host-kim',
      rating: 5,
      comment: '약속 시간을 잘 지키고 좌석 안내도 친절했어요.',
      createdAt: '2026-08-18T09:30:00+09:00',
    };
    const reviews = data === 'single'
      ? [baseReview]
      : data === 'long-korean'
        ? Array.from({ length: 4 }, (_, index) => ({
          ...baseReview,
          id: index + 1,
          reviewerHandle: `모바일에서도후기작성자를구분할수있는긴한국어핸들-${index + 1}`,
          rating: (index % 5) + 1,
          comment: '경기장 입구에서 만나는 위치와 티켓 전달 순서를 차근차근 설명해주고 긴 대화에도 친절하게 답변해준 호스트였습니다.'.repeat(2),
        }))
        : data === 'unbroken-token'
          ? Array.from({ length: 4 }, (_, index) => ({
            ...baseReview,
            id: index + 1,
            reviewerHandle: `REVIEWER-${index}-${'X'.repeat(96)}`,
            rating: (index % 5) + 1,
            comment: `REVIEWCOMMENT-${index}-${'Y'.repeat(220)}`,
          }))
          : data === 'maximum-supported'
            ? Array.from({ length: 50 }, (_, index) => ({
              ...baseReview,
              id: index + 1,
              reviewerHandle: `mate-${String(index + 1).padStart(2, '0')}`,
              rating: (index % 5) + 1,
              comment: `최대 목록 스크롤 검증용 호스트 후기 ${index + 1}`,
              createdAt: `2026-08-${String((index % 28) + 1).padStart(2, '0')}T09:30:00+09:00`,
            }))
            : [];
    const hostName = data === 'long-korean'
      ? '모바일 화면에서도 후기 제목 전체가 자연스럽게 여러 줄로 표시되어야 하는 호스트 이름'
      : data === 'unbroken-token'
        ? `HOST-${'Z'.repeat(128)}`
        : data === 'maximum-supported'
          ? '후기 50건 보유 호스트'
          : '김호스트';
    const hostHandle = data === 'unbroken-token'
      ? `host-${'q'.repeat(120)}`
      : 'host-kim';

    return {
      props: {
        hostHandle,
        hostName,
        onClose: () => undefined,
        visualQaStateOverride: {
          isError: data === 'error-503',
          isLoading: data === 'loading',
          reviews,
        },
      },
      captureSelector: '[data-testid="mate-host-reviews-dialog"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.create-field-label': (context) => {
    const copy = requireStateValueFromMap(context, 'data', {
      single: '티켓 가격 (1인당)',
      'long-korean': '모바일 화면에서도 필수 입력 여부와 의미가 명확하게 전달되어야 하는 매우 긴 필드 이름',
      'unbroken-token': `FIELDLABEL-${'X'.repeat(160)}`,
    });
    const htmlFor = resolveDeclaredVariant(context, 'association', {
      associated: 'visual-qa-field',
      unassociated: undefined,
    });
    const className = resolveDeclaredVariant(context, 'emphasis', {
      default: undefined,
      prominent: 'text-base font-bold sm:text-lg',
    });
    const required = resolveDeclaredVariant(context, 'required', {
      optional: false,
      required: true,
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const requiredMarker = createElement('span', {
      'aria-hidden': 'true',
      className: 'ml-0.5 shrink-0 text-red-500',
      key: 'required',
    }, '*');

    return {
      props: {
        children: required ? [copy, requiredMarker] : copy,
        className,
        'data-testid': 'mate-create-field-label',
        htmlFor,
      },
      captureSelector: '[data-testid="mate-create-field-label"]',
      surfaceClassName: 'block min-h-28 w-[320px] max-w-none overflow-visible bg-background p-4 shadow-none',
      theme,
    };
  },
  'mate.create-seat-pricing': (context) => {
    const seatCategory = requireStateValueFromMap(context, 'data', {
      empty: '',
      single: '응원석',
      'long-korean': '홈 팀과 함께 열정적으로 응원하는 좌석 구역 중 모바일에서 여러 줄로 표시되는 매우 긴 분류 이름',
      'unbroken-token': `SEATCATEGORY-${'X'.repeat(140)}`,
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      input: 'input',
      'keyboard-navigation': 'keyboard-navigation',
    });
    const maxParticipants = resolveDeclaredVariant(context, 'participants', {
      two: 2,
      three: 3,
      four: 4,
    });
    const ticketPrice = resolveDeclaredVariant(context, 'ticket', {
      empty: 0,
      ordinary: 12_000,
      'maximum-supported': 2_147_483_647,
    });
    const reservationDepositAmount = resolveDeclaredVariant(context, 'deposit', {
      empty: 0,
      ordinary: 5_000,
      'maximum-supported': 2_147_483_647,
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const isCanonicalCopy = context.states.data === 'single';
    const isCanonicalParticipants = context.variants.participants === 'two';
    const hasOrdinaryPrices = context.variants.ticket === 'ordinary'
      && context.variants.deposit === 'ordinary';
    const hasEmptyPrices = context.variants.ticket === 'empty'
      && context.variants.deposit === 'empty';
    const target = context.interactionTargetId;
    const validInteraction = interaction === 'default'
      || (
        interaction === 'focus-visible'
        && isCanonicalCopy
        && isCanonicalParticipants
        && hasOrdinaryPrices
        && ['max-participants', 'ticket-price', 'reservation-deposit'].includes(target ?? '')
      )
      || (
        interaction === 'input'
        && isCanonicalCopy
        && isCanonicalParticipants
        && hasEmptyPrices
        && ['ticket-price', 'reservation-deposit'].includes(target ?? '')
      )
      || (
        interaction === 'keyboard-navigation'
        && isCanonicalCopy
        && isCanonicalParticipants
        && hasOrdinaryPrices
        && target === 'max-participants'
      );
    if (!validInteraction) {
      throw new Error(
        `지원하지 않는 MateCreateSeatPricingFields state: interactions=${interaction}, target=${target ?? '<missing>'}`,
      );
    }

    return {
      props: {
        formData: {
          gameDate: '2026-09-05',
          gameTime: '18:30',
          homeTeam: 'home-team',
          awayTeam: 'away-team',
          stadium: '내부 테스트 구장',
          section: '305블록',
          cheeringSide: 'HOME',
          seatCategory,
          seatDetail: '305블록 12열 15번',
          maxParticipants,
          ticketPrice,
          reservationDepositAmount,
          description: '',
          ticketFile: null,
          reservationNumber: '',
        },
        updateFormData: () => {},
        visualQaInteractive: true,
      },
      captureSelector: '[data-testid="mate-create-seat-pricing-fields"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-4 shadow-none',
      theme,
    };
  },
  'mate.create-seat-selection': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: { homeTeam: '', awayTeam: '', seatDetail: '' },
      single: { homeTeam: 'KT', awayTeam: 'KIA', seatDetail: '305블록 12열 15번' },
      'long-korean': {
        homeTeam: 'KT',
        awayTeam: 'KIA',
        seatDetail: '가족과 함께 편안하게 관람할 수 있는 긴 좌석 구역 '.repeat(10).slice(0, 100),
      },
      'unbroken-token': {
        homeTeam: 'KT',
        awayTeam: 'KIA',
        seatDetail: 'X'.repeat(100),
      },
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
      selected: 'selected',
      input: 'input',
      'keyboard-navigation': 'keyboard-navigation',
    });
    const availableCategoryKeys = resolveDeclaredVariant(context, 'inventory', {
      'jamsil-daegu': ['CHEERING', 'TABLE', 'PREMIUM', 'EXCITING', 'COMFORT', 'OUTFIELD'],
      incheon: ['CHEERING', 'TABLE', 'PREMIUM', 'COMFORT', 'SPECIAL', 'OUTFIELD'],
      'gwangju-all': ['CHEERING', 'TABLE', 'PREMIUM', 'EXCITING', 'COMFORT', 'SPECIAL', 'OUTFIELD'],
      suwon: ['CHEERING', 'PREMIUM', 'EXCITING', 'COMFORT', 'SPECIAL', 'OUTFIELD'],
      changwon: ['CHEERING', 'PREMIUM', 'COMFORT', 'SPECIAL'],
      sajik: ['CHEERING', 'TABLE', 'COMFORT'],
      gocheok: ['CHEERING', 'TABLE', 'PREMIUM', 'COMFORT', 'OUTFIELD'],
      daejeon: ['CHEERING', 'TABLE', 'PREMIUM', 'EXCITING', 'SPECIAL', 'OUTFIELD'],
    });
    const category = resolveDeclaredVariant(context, 'category', {
      none: { key: '', label: '' },
      cheering: { key: 'CHEERING', label: '응원석' },
      table: { key: 'TABLE', label: '테이블석' },
      premium: { key: 'PREMIUM', label: '프리미엄' },
      exciting: { key: 'EXCITING', label: '익사이팅' },
      comfort: { key: 'COMFORT', label: '일반/시야' },
      special: { key: 'SPECIAL', label: '이색좌석' },
      outfield: { key: 'OUTFIELD', label: '외야석' },
    });
    const cheeringSide = resolveDeclaredVariant(context, 'cheering', {
      none: '',
      home: 'HOME',
      neutral: 'NEUTRAL',
      away: 'AWAY',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    if (category.key && !availableCategoryKeys.includes(category.key)) {
      throw new Error(
        `지원하지 않는 MateCreateSeatSelectionFields state: inventory=${context.variants.inventory}, category=${context.variants.category}`,
      );
    }

    const target = context.interactionTargetId;
    const isCanonical = context.states.data === 'single'
      && context.variants.inventory === 'gwangju-all'
      && context.variants.cheering === 'none';
    const selectionTargets = [
      'select-cheer-home',
      'select-cheer-neutral',
      'select-cheer-away',
      'select-category-cheering',
      'select-category-table',
      'select-category-premium',
      'select-category-exciting',
      'select-category-comfort',
      'select-category-special',
      'select-category-outfield',
    ];
    const buttonTargets = [
      'cheer-home',
      'cheer-neutral',
      'cheer-away',
      'category-cheering',
      'category-table',
      'category-premium',
      'category-exciting',
      'category-comfort',
      'category-special',
      'category-outfield',
    ];
    const focusTargets = [...buttonTargets, 'seat-block', 'seat-row', 'seat-seat'];
    const inputTargets = ['seat-block', 'seat-row', 'seat-seat'];
    const clearTarget = category.key ? `clear-category-${context.variants.category}` : '';
    const validInteraction = interaction === 'default'
      ? target === undefined
      : isCanonical && (
        (interaction === 'focus-visible'
          && context.variants.category === 'none'
          && focusTargets.includes(target ?? ''))
        || ((interaction === 'hover' || interaction === 'pressed' || interaction === 'keyboard-navigation')
          && context.variants.category === 'none'
          && buttonTargets.includes(target ?? ''))
        || (interaction === 'input'
          && context.variants.category === 'none'
          && inputTargets.includes(target ?? ''))
        || (interaction === 'selected' && (
          (context.variants.category === 'none' && selectionTargets.includes(target ?? ''))
          || (context.variants.category !== 'none' && target === clearTarget)
        ))
      );
    if (!validInteraction) {
      throw new Error(
        `지원하지 않는 MateCreateSeatSelectionFields state: interactions=${interaction}, target=${target ?? '<missing>'}`,
      );
    }

    return {
      props: {
        formData: {
          gameDate: '2026-09-05',
          gameTime: '18:30',
          homeTeam: data.homeTeam,
          awayTeam: data.awayTeam,
          stadium: '내부 테스트 구장',
          section: '305블록',
          cheeringSide,
          seatCategory: category.label,
          seatDetail: data.seatDetail,
          maxParticipants: 2,
          ticketPrice: 12_000,
          reservationDepositAmount: 5_000,
          description: '',
          ticketFile: null,
          reservationNumber: '',
        },
        availableCategoryKeys,
        updateFormData: () => {},
        visualQaInteractive: true,
      },
      captureSelector: '[data-testid="mate-create-seat-selection-fields"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-4 shadow-none',
      theme,
    };
  },
  'mate.create-seat-step': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const interaction = context.states.interactions;
    const selectionPhase = resolveDeclaredVariant<'fallback' | 'runtime'>(
      context,
      'selection',
      {
        fallback: 'fallback',
        runtime: 'runtime',
      },
    );
    const pricingPhase = resolveDeclaredVariant<'fallback' | 'runtime'>(
      context,
      'pricing',
      {
        fallback: 'fallback',
        runtime: 'runtime',
      },
    );
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const bothFallback = selectionPhase === 'fallback' && pricingPhase === 'fallback';
    if (
      interaction !== 'default'
      || context.interactionTargetId !== undefined
      || context.states.permissions !== undefined
      || context.states.system !== undefined
      || (bothFallback && data !== 'single')
    ) {
      throw new Error(
        `지원하지 않는 MateCreateSeatStep state: ${data}:${interaction}:${selectionPhase}:${pricingPhase}:${context.interactionTargetId ?? '<none>'}`,
      );
    }

    const isEmpty = data === 'empty';
    const isMaximum = data === 'maximum-supported';
    const pressureCopy = data === 'long-korean'
      ? {
        awayTeam: '모바일 화면에서 여러 줄로 표시되는 매우 긴 원정 팀 이름',
        homeTeam: '모바일 화면에서 여러 줄로 표시되는 매우 긴 홈 팀 이름',
        seatCategory: '모바일 화면에서 여러 줄로 표시되는 매우 긴 좌석 분류 이름',
        seatDetail: '가족과 함께 편안하게 관람할 수 있는 긴 좌석 구역 '.repeat(10).slice(0, 100),
      }
      : data === 'unbroken-token'
        ? {
          awayTeam: `AWAY${'UNBROKEN'.repeat(12)}`,
          homeTeam: `HOME${'UNBROKEN'.repeat(12)}`,
          seatCategory: `SEATCATEGORY-${'X'.repeat(140)}`,
          seatDetail: 'X'.repeat(100),
        }
        : {
          awayTeam: 'KIA',
          homeTeam: 'KT',
          seatCategory: isMaximum ? '외야석' : '응원석',
          seatDetail: isMaximum ? '가'.repeat(100) : '305블록 12열 15번',
        };
    const availableCategoryKeys = isMaximum
      ? ['CHEERING', 'TABLE', 'PREMIUM', 'EXCITING', 'COMFORT', 'SPECIAL', 'OUTFIELD']
      : ['CHEERING', 'TABLE', 'PREMIUM', 'COMFORT', 'OUTFIELD'];

    return {
      props: {
        formData: {
          gameDate: '2026-09-05',
          gameTime: '18:30',
          homeTeam: isEmpty ? '' : pressureCopy.homeTeam,
          awayTeam: isEmpty ? '' : pressureCopy.awayTeam,
          stadium: '내부 테스트 구장',
          section: '305블록',
          cheeringSide: isEmpty ? '' : 'HOME',
          seatCategory: isEmpty ? '' : pressureCopy.seatCategory,
          seatDetail: isEmpty ? '' : pressureCopy.seatDetail,
          maxParticipants: isMaximum ? 4 : 2,
          ticketPrice: isEmpty ? 0 : isMaximum ? 2_147_483_647 : 12_000,
          reservationDepositAmount: isEmpty ? 0 : isMaximum ? 2_147_483_647 : 5_000,
          description: '',
          ticketFile: null,
          reservationNumber: '',
        },
        availableCategoryKeys,
        updateFormData: () => {},
        visualQaStateOverride: {
          pricingPhase,
          selectionPhase,
        },
      },
      captureSelector: '[data-testid="mate-create-seat-step"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-4 shadow-none',
      theme,
    };
  },
  'mate.create-ticket-step': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'long-korean': 'long-korean',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const phase = resolveDeclaredVariant(context, 'phase', {
      idle: 'idle',
      'scan-error': 'scan-error',
      scanning: 'scanning',
      'validation-size': 'validation-size',
      'validation-type': 'validation-type',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const validDataSystem = (
      phase === 'idle'
      || (phase === 'scanning' && data === 'single')
      || (phase === 'scan-error' && data !== 'empty')
      || ((phase === 'validation-size' || phase === 'validation-type')
        && (data === 'empty' || data === 'single'))
    );
    const validInteraction = interaction === 'default'
      ? context.interactionTargetId === undefined
      : (
        (phase === 'idle' && data === 'empty' && context.interactionTargetId === 'picker-idle')
        || (phase === 'scan-error'
          && data === 'single'
          && (context.interactionTargetId === 'picker-scan-error' || context.interactionTargetId === 'retry'))
      );
    if (!validDataSystem || !validInteraction) {
      throw new Error(
        `지원하지 않는 MateCreateTicketStep state: ${data}:${interaction}:${phase}:${context.interactionTargetId ?? '<none>'}`,
      );
    }

    const ticketFile = data === 'empty'
      ? null
      : new File(
        ['visual-qa-ticket'],
        data === 'long-korean'
          ? `${'모바일에서 자연스럽게 여러 줄로 표시되어야 하는 예매내역 티켓 이미지 '.repeat(5).trim()}.jpg`
          : data === 'unbroken-token'
            ? `TICKET-${'UNBROKEN'.repeat(28)}.jpg`
            : 'visual-qa-ticket.jpg',
        { type: 'image/jpeg' },
      );
    const fileErrorMessage = phase === 'scan-error'
      ? '이미지 분석에 실패했습니다. 같은 파일 또는 다른 파일로 다시 시도해주세요.'
      : phase === 'validation-size'
        ? '파일 크기는 10MB 이하여야 합니다.'
        : phase === 'validation-type'
          ? '이미지 파일만 업로드 가능합니다.'
          : '';

    return {
      props: {
        errorType: phase === 'scan-error' ? 'scan' : null,
        fileErrorMessage,
        goNext: () => {},
        isScanning: phase === 'scanning',
        onFileUpload: () => {},
        retry: () => {},
        ticketFile,
        updateFormData: () => {},
        visualQaStateOverride: { showDevelopmentFixture: false },
      },
      captureSelector: '[data-testid="mate-create-ticket-step"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-4 shadow-none',
      theme,
    };
  },
  'mate.date-rail-filter': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'boundary-maximum': 8,
      empty: 0,
      'maximum-supported': 14,
      single: 1,
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
      selected: 'selected',
    });
    const expansion = resolveDeclaredVariant<'collapsed' | 'expanded'>(context, 'expansion', {
      collapsed: 'collapsed',
      expanded: 'expanded',
    });
    const selection = resolveDeclaredVariant(context, 'selection', {
      all: 'all',
      eighth: 'eighth',
      first: 'first',
      last: 'last',
      ninth: 'ninth',
      'outside-range': 'outside-range',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const validSelection = selection === 'all'
      || selection === 'outside-range'
      || (selection === 'first' && data >= 1)
      || (selection === 'eighth' && data >= 8)
      || ((selection === 'ninth' || selection === 'last') && data === 14);
    const validExpansion = expansion === 'collapsed' || data === 14;
    const target = context.interactionTargetId;
    const collapsedAllTargets = new Set(['all', 'date-first', 'date-eighth', 'expand']);
    const expandedAllTargets = new Set(['date-ninth', 'date-last', 'collapse']);
    const validInteraction = interaction === 'default'
      ? target === undefined
      : data === 14 && (
        (target === 'clear-outside'
          && expansion === 'collapsed'
          && selection === 'outside-range')
        || (collapsedAllTargets.has(target ?? '')
          && expansion === 'collapsed'
          && selection === (interaction === 'selected' && target === 'all' ? 'first' : 'all'))
        || (expandedAllTargets.has(target ?? '')
          && expansion === 'expanded'
          && selection === 'all')
      );
    if (!validSelection || !validExpansion || !validInteraction) {
      throw new Error(
        `지원하지 않는 MateDateRailFilter state: ${data}:${interaction}:${expansion}:${selection}:${target ?? '<none>'}`,
      );
    }

    const dateItems = Array.from({ length: data }, (_, index) => (
      new Date(2027, 11, 24 + index)
    ));
    const selectedDate = selection === 'all'
      ? null
      : selection === 'outside-range'
        ? new Date(2028, 0, 22)
        : selection === 'first'
          ? dateItems[0]!
          : selection === 'eighth'
            ? dateItems[7]!
            : selection === 'ninth'
              ? dateItems[8]!
              : dateItems.at(-1)!;

    return {
      props: {
        dateItems,
        onDateSelect: () => {},
        selectedDate,
        visualQaStateOverride: {
          expanded: expansion === 'expanded',
          interactive: true,
        },
      },
      captureSelector: '[data-testid="mate-date-rail-filter"]',
      surfaceClassName: 'block min-h-[844px] w-[264px] max-w-none overflow-visible rounded-2xl border border-gray-200/80 bg-background p-4 shadow-none dark:border-white/10',
      theme,
    };
  },
  'mf-fallback.button': (context) => {
    const failClosed = (): never => {
      throw new Error(
        `지원하지 않는 fallback Button state: ${JSON.stringify({ componentId: context.componentId, states: context.states, variants: context.variants, target: context.interactionTargetId })}`,
      );
    };
    if (
      context.componentId !== 'src/components/moduleFederation/fallback/Button.tsx#FallbackDesignSystemButton'
      || Object.keys(context.states).sort().join(',') !== 'data,interactions'
      || Object.keys(context.variants).sort().join(',') !== 'presentation,theme'
    ) {
      return failClosed();
    }
    const data = {
      single: 'single',
      'long-korean': 'long-korean',
      'unbroken-token': 'unbroken-token',
    }[context.states.data ?? ''];
    const interaction = {
      default: 'default',
      hover: 'hover',
      'focus-visible': 'focus-visible',
      pressed: 'pressed',
      selected: 'selected',
      'keyboard-navigation': 'keyboard-navigation',
    }[context.states.interactions ?? ''];
    const presentations = {
      'default-default': { disabled: false, size: 'default', variant: 'default' },
      'destructive-default': { disabled: false, size: 'default', variant: 'destructive' },
      'outline-default': { disabled: false, size: 'default', variant: 'outline' },
      'secondary-default': { disabled: false, size: 'default', variant: 'secondary' },
      'ghost-default': { disabled: false, size: 'default', variant: 'ghost' },
      'link-default': { disabled: false, size: 'default', variant: 'link' },
      'brand-default': { disabled: false, size: 'default', variant: 'brand' },
      'brandOutline-default': { disabled: false, size: 'default', variant: 'brandOutline' },
      'brand-sm': { disabled: false, size: 'sm', variant: 'brand' },
      'brand-lg': { disabled: false, size: 'lg', variant: 'brand' },
      'brand-icon': { disabled: false, size: 'icon', variant: 'brand' },
      'brand-iconTouch': { disabled: false, size: 'iconTouch', variant: 'brand' },
      'brand-touch': { disabled: false, size: 'touch', variant: 'brand' },
      'brand-touchLg': { disabled: false, size: 'touchLg', variant: 'brand' },
      'disabled-default': { disabled: true, size: 'default', variant: 'default' },
    } as const;
    const presentation = context.variants.presentation ?? '';
    const presentationProps = presentations[presentation as keyof typeof presentations];
    const theme = context.variants.theme === 'light' || context.variants.theme === 'dark'
      ? context.variants.theme
      : undefined;
    if (!data || !interaction || !presentationProps || !theme) return failClosed();
    const target = context.interactionTargetId;
    const hoverPresentations: Record<string, string> = {
      default: 'default-default',
      destructive: 'destructive-default',
      outline: 'outline-default',
      secondary: 'secondary-default',
      ghost: 'ghost-default',
      link: 'link-default',
      brand: 'brand-default',
      brandOutline: 'brandOutline-default',
    };
    const validInteraction = interaction === 'default'
      ? target === undefined
        && (data === 'single' || presentation === 'default-default')
      : data === 'single'
        && theme === 'light'
        && (
          (interaction === 'hover' && hoverPresentations[target ?? ''] === presentation)
          || (interaction === 'focus-visible'
            && hoverPresentations[target ?? ''] === presentation
            && (target === 'default' || target === 'destructive'))
          || (interaction === 'pressed' && target === 'brand-touch' && presentation === 'brand-touch')
          || (interaction === 'selected' && target === 'pointer' && presentation === 'default-default')
          || (interaction === 'keyboard-navigation'
            && presentation === 'default-default'
            && (target === 'enter' || target === 'space'))
        );
    if (!validInteraction) return failClosed();
    return {
      props: {
        data,
        disabled: presentationProps.disabled,
        presentation,
        scenarioKey: `${data}:${interaction}:${target ?? 'none'}:${presentation}:${theme}`,
        size: presentationProps.size,
        variant: presentationProps.variant,
      },
      captureSelector: '[data-testid="mf-fallback-button"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-4 shadow-none',
      theme,
    };
  },
  'mf-fallback.modal': (context) => {
    const failClosed = (): never => {
      throw new Error(
        `지원하지 않는 fallback Modal state: ${JSON.stringify({ componentId: context.componentId, states: context.states, variants: context.variants, target: context.interactionTargetId })}`,
      );
    };
    if (
      context.componentId !== 'src/components/moduleFederation/fallback/Modal.tsx#FallbackDesignSystemModal'
      || Object.keys(context.states).sort().join(',') !== 'data,interactions'
      || Object.keys(context.variants).sort().join(',') !== 'phase,theme'
    ) {
      return failClosed();
    }
    const data = {
      empty: 'empty',
      single: 'single',
      'long-korean': 'long-korean',
      'unbroken-token': 'unbroken-token',
    }[context.states.data ?? ''];
    const interaction = {
      default: 'default',
      hover: 'hover',
      'focus-visible': 'focus-visible',
      pressed: 'pressed',
      selected: 'selected',
      'keyboard-navigation': 'keyboard-navigation',
    }[context.states.interactions ?? ''];
    const phase = context.variants.phase === 'open' || context.variants.phase === 'closed'
      ? context.variants.phase
      : undefined;
    const theme = context.variants.theme === 'light' || context.variants.theme === 'dark'
      ? context.variants.theme
      : undefined;
    if (!data || !interaction || !phase || !theme) return failClosed();
    const target = context.interactionTargetId;
    const selectedModes: Record<string, 'both' | 'open-change' | 'close' | 'none'> = {
      'close-both': 'both',
      'backdrop-both': 'both',
      'close-open-change': 'open-change',
      'close-on-close': 'close',
      'close-none': 'none',
    };
    const callbackMode = interaction === 'selected'
      ? selectedModes[target ?? '']
      : 'both';
    const validInteraction = interaction === 'default'
      ? target === undefined && (phase === 'open' || data === 'single')
      : data === 'single'
        && phase === 'open'
        && theme === 'light'
        && (
          ((interaction === 'hover' || interaction === 'focus-visible' || interaction === 'pressed')
            && target === 'close')
          || (interaction === 'selected' && callbackMode !== undefined)
          || (interaction === 'keyboard-navigation'
            && (target === 'escape-close' || target === 'tab-loop' || target === 'shift-tab-loop'))
        );
    if (!validInteraction || !callbackMode) return failClosed();
    return {
      props: {
        callbackMode,
        data,
        initialOpen: phase === 'open',
        scenarioKey: `${data}:${interaction}:${target ?? 'none'}:${phase}:${theme}`,
      },
      captureSelector: 'body',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'image.lightbox': (context) => {
    const failClosed = (): never => {
      throw new Error(
        `지원하지 않는 ImageLightbox state: ${JSON.stringify({ componentId: context.componentId, states: context.states, variants: context.variants, target: context.interactionTargetId })}`,
      );
    };
    if (
      context.componentId !== 'src/components/ImageLightbox.tsx#ImageLightbox'
      || Object.keys(context.states).sort().join(',') !== 'data,interactions'
      || Object.keys(context.variants).sort().join(',') !== 'index,theme'
    ) {
      return failClosed();
    }
    const data = {
      single: 'single',
      populated: 'multiple-three',
      'maximum-supported': 'maximum-supported',
      'broken-image': 'broken-image',
    }[context.states.data ?? ''];
    const interaction = {
      default: 'default',
      hover: 'hover',
      'focus-visible': 'focus-visible',
      pressed: 'pressed',
      selected: 'selected',
      'keyboard-navigation': 'keyboard-navigation',
    }[context.states.interactions ?? ''];
    const index = {
      only: 'only',
      first: 'first',
      middle: 'middle',
      last: 'last',
    }[context.variants.index ?? ''];
    const theme = context.variants.theme === 'light' || context.variants.theme === 'dark'
      ? context.variants.theme
      : undefined;
    if (!data || !interaction || !index || !theme) return failClosed();

    const legalIndexes: Record<string, ReadonlySet<string>> = {
      single: new Set(['only']),
      'multiple-three': new Set(['first', 'middle', 'last']),
      'maximum-supported': new Set(['last']),
      'broken-image': new Set(['only']),
    };
    const pointerTargets = new Set(['close', 'prev', 'next']);
    const selectedTargetIndexes: Record<string, string> = {
      close: 'middle',
      backdrop: 'middle',
      'prev-first-to-last': 'first',
      'prev-middle-to-first': 'middle',
      'next-middle-to-last': 'middle',
      'next-last-to-first': 'last',
    };
    const keyboardTargetIndexes: Record<string, string> = {
      escape: 'middle',
      'arrow-left-first-to-last': 'first',
      'arrow-left-middle-to-first': 'middle',
      'arrow-right-middle-to-last': 'middle',
      'arrow-right-last-to-first': 'last',
      'tab-close-to-prev': 'middle',
      'tab-prev-to-next': 'middle',
      'tab-next-to-close': 'middle',
      'shift-tab-close-to-next': 'middle',
      'enter-close': 'middle',
      'enter-prev': 'middle',
      'enter-next': 'middle',
      'space-close': 'middle',
      'space-prev': 'middle',
      'space-next': 'middle',
    };
    const target = context.interactionTargetId;
    const validInteraction = interaction === 'default'
      ? target === undefined && legalIndexes[data].has(index)
      : data === 'multiple-three'
        && theme === 'light'
        && (
          ((interaction === 'hover' || interaction === 'focus-visible' || interaction === 'pressed')
            && index === 'middle'
            && pointerTargets.has(target ?? ''))
          || (interaction === 'selected' && selectedTargetIndexes[target ?? ''] === index)
          || (interaction === 'keyboard-navigation' && keyboardTargetIndexes[target ?? ''] === index)
        );
    if (!validInteraction) return failClosed();

    const initialIndexes: Record<string, Record<string, number>> = {
      single: { only: 0 },
      'multiple-three': { first: 0, middle: 1, last: 2 },
      'maximum-supported': { last: 9 },
      'broken-image': { only: 0 },
    };
    return {
      props: {
        data,
        initialIndex: initialIndexes[data][index],
        scenarioKey: `${data}:${interaction}:${target ?? 'none'}:${index}:${theme}`,
      },
      captureSelector: 'body',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'ranking.save-dialog': (context) => {
    const failClosed = (): never => {
      throw new Error(
        `지원하지 않는 RankingPredictionSaveDialog state: ${JSON.stringify({ componentId: context.componentId, states: context.states, variants: context.variants, target: context.interactionTargetId })}`,
      );
    };
    if (
      context.componentId !== 'src/components/RankingPredictionSaveDialog.tsx#RankingPredictionSaveDialog'
      || Object.keys(context.states).sort().join(',') !== 'data,interactions'
      || Object.keys(context.variants).sort().join(',') !== 'phase,theme'
      || context.states.data !== 'single'
    ) {
      return failClosed();
    }
    const interaction = {
      default: 'default',
      hover: 'hover',
      'focus-visible': 'focus-visible',
      pressed: 'pressed',
      selected: 'selected',
      'keyboard-navigation': 'keyboard-navigation',
    }[context.states.interactions ?? ''];
    const phase = {
      closed: 'closed',
      idle: 'idle',
      saving: 'saving',
    }[context.variants.phase ?? ''];
    const theme = context.variants.theme === 'light' || context.variants.theme === 'dark'
      ? context.variants.theme
      : undefined;
    if (!interaction || !phase || !theme) return failClosed();
    const target = context.interactionTargetId;
    const pointerTargets: Record<string, ReadonlySet<string>> = {
      hover: new Set(['close', 'cancel', 'confirm']),
      'focus-visible': new Set(['close', 'cancel', 'confirm']),
      pressed: new Set(['close', 'cancel', 'confirm']),
      selected: new Set(['close', 'cancel', 'confirm', 'backdrop']),
      'keyboard-navigation': new Set([
        'escape',
        'tab-close-to-cancel',
        'tab-cancel-to-confirm',
        'shift-tab-close-to-confirm',
        'enter-confirm',
        'space-cancel',
      ]),
    };
    const validInteraction = interaction === 'default'
      ? target === undefined
      : phase === 'idle'
        && theme === 'light'
        && pointerTargets[interaction]?.has(target ?? '') === true;
    if (!validInteraction) return failClosed();
    return {
      props: {
        initialOpen: phase !== 'closed',
        initialSaving: phase === 'saving',
        scenarioKey: `single:${interaction}:${target ?? 'none'}:${phase}:${theme}`,
      },
      captureSelector: 'body',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'ranking.completion-panel': (context) => {
    const failClosed = (): never => {
      throw new Error(
        `지원하지 않는 RankingPredictionCompletionPanel state: ${JSON.stringify({ componentId: context.componentId, states: context.states, variants: context.variants, target: context.interactionTargetId })}`,
      );
    };
    if (
      context.componentId !== 'src/components/RankingPredictionCompletionPanel.tsx#RankingPredictionCompletionPanel'
      || Object.keys(context.states).sort().join(',') !== 'data,interactions'
      || Object.keys(context.variants).sort().join(',') !== 'phase,theme'
    ) {
      return failClosed();
    }
    const data = {
      'null-optional': 'null-optional',
      single: 'single',
      'long-korean': 'long-korean',
      'unbroken-token': 'unbroken-token',
    }[context.states.data ?? ''];
    const interaction = {
      default: 'default',
      hover: 'hover',
      'focus-visible': 'focus-visible',
      pressed: 'pressed',
      selected: 'selected',
      'keyboard-navigation': 'keyboard-navigation',
    }[context.states.interactions ?? ''];
    const phase = {
      complete: 'complete',
      'ready-to-save': 'ready-to-save',
      saved: 'saved',
    }[context.variants.phase ?? ''];
    const theme = context.variants.theme === 'light' || context.variants.theme === 'dark'
      ? context.variants.theme
      : undefined;
    if (!data || !interaction || !phase || !theme) return failClosed();
    const target = context.interactionTargetId;
    const targetPhases: Record<string, string> = {
      'complete-hover': 'complete',
      'save-hover': 'ready-to-save',
      'share-hover': 'saved',
      'complete-focus': 'complete',
      'save-focus': 'ready-to-save',
      'share-focus': 'saved',
      'complete-pressed': 'complete',
      'save-pressed': 'ready-to-save',
      'share-pressed': 'saved',
      'complete-click': 'complete',
      'save-click': 'ready-to-save',
      'share-click': 'saved',
      'complete-enter': 'complete',
      'complete-space': 'complete',
      'save-enter': 'ready-to-save',
      'save-space': 'ready-to-save',
      'share-enter': 'saved',
      'share-space': 'saved',
      'tab-save-share': 'ready-to-save',
      'shift-tab-share-save': 'ready-to-save',
    };
    const validInteraction = interaction === 'default'
      ? target === undefined
      : data === 'single'
        && theme === 'light'
        && targetPhases[target ?? ''] === phase;
    if (!validInteraction) return failClosed();
    return {
      props: {
        data,
        initialPhase: phase,
        scenarioKey: `${data}:${interaction}:${target ?? 'none'}:${phase}:${theme}`,
      },
      captureSelector: '[data-testid="ranking-completion-panel"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-4 shadow-none',
      theme,
    };
  },
  'mate.mobile-date-filter': (context) => {
    const failClosed = (): never => {
      throw new Error(
        `지원하지 않는 MateMobileDateFilter state: ${JSON.stringify({ componentId: context.componentId, states: context.states, variants: context.variants, target: context.interactionTargetId })}`,
      );
    };
    if (
      context.componentId !== 'src/components/MateMobileDateFilter.tsx#MateMobileDateFilter'
      || Object.keys(context.states).sort().join(',') !== 'data,interactions'
      || Object.keys(context.variants).sort().join(',') !== 'selection,theme'
    ) {
      return failClosed();
    }
    const dataMap = {
      empty: 'empty',
      single: 'single',
      'long-korean': 'long-korean',
      'boundary-minimum': 'boundary-minimum',
      'maximum-supported': 'maximum-supported',
    } as const;
    const interactionMap = {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      'keyboard-navigation': 'keyboard-navigation',
      pressed: 'pressed',
      selected: 'selected',
    } as const;
    const selectionMap = {
      all: 'all',
      first: 'first',
      middle: 'middle',
      last: 'last',
      'outside-range': 'outside-range',
    } as const;
    const themeMap = {
      dark: 'dark',
      light: 'light',
    } as const;
    const data = dataMap[context.states.data as keyof typeof dataMap];
    const interaction = interactionMap[
      context.states.interactions as keyof typeof interactionMap
    ];
    const selection = selectionMap[context.variants.selection as keyof typeof selectionMap];
    const theme = themeMap[context.variants.theme as keyof typeof themeMap];
    if (!data || !interaction || !selection || !theme) return failClosed();
    const counts = {
      empty: 0,
      single: 1,
      'long-korean': 1,
      'boundary-minimum': 4,
      'maximum-supported': 14,
    } as const;
    const count = counts[data];
    const validSelection = selection === 'all'
      || selection === 'outside-range'
      || (selection === 'first' && count >= 1)
      || ((selection === 'middle' || selection === 'last') && count >= 4);
    const target = context.interactionTargetId;
    const anchoredTarget = new Set(['all', 'first', 'middle', 'last']);
    const selectedTargets: Record<string, string> = {
      'all-to-first': 'all',
      'first-to-all': 'first',
      'all-to-middle': 'all',
      'all-to-last': 'all',
      'outside-to-all': 'outside-range',
    };
    const validInteraction = interaction === 'default'
      ? target === undefined
      : data === 'maximum-supported'
        && theme === 'light'
        && (
          ((interaction === 'hover' || interaction === 'focus-visible' || interaction === 'pressed')
            && selection === 'all'
            && anchoredTarget.has(target ?? ''))
          || (interaction === 'selected' && selectedTargets[target ?? ''] === selection)
          || (interaction === 'keyboard-navigation'
            && selection === 'all'
            && (target === 'scroll-arrow-right' || target === 'scroller-to-all'))
        );
    if (!validSelection || !validInteraction) return failClosed();

    const dateItems = data === 'long-korean'
      ? [new Date(2027, 11, 31)]
      : Array.from({ length: count }, (_, index) => new Date(2027, 11, 24 + index));
    const initialSelectedDate = selection === 'all'
      ? null
      : selection === 'outside-range'
        ? new Date(2028, 0, 7)
        : selection === 'first'
          ? dateItems[0]!
          : selection === 'middle'
            ? dateItems[Math.floor(dateItems.length / 2)]!
            : dateItems.at(-1)!;

    return {
      props: {
        dateItems,
        initialSelectedDate,
        scenarioKey: `${data}:${interaction}:${target ?? 'none'}:${selection}:${theme}`,
      },
      captureSelector: '[data-testid="mate-mobile-date-filter"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.seat-filter-buttons': (context) => {
    const inputValue = requireStateValueFromMap(context, 'data', {
      empty: '',
      single: '응원석',
      populated: 'lg 오렌지석 레드석',
      'boundary-minimum': 'kt',
      'boundary-maximum': 'hanwha 홈 플레이트 테이블석',
      'long-korean': '삼성 블루존에서 관람할 좌석을 선택합니다',
      'unbroken-token': 'ssg으쓱이존UNBROKENTOKENWITHOUTSPACES',
      'maximum-supported': 'lg 오렌지석 레드석 프리미엄석 테이블석',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      'keyboard-navigation': 'keyboard-navigation',
      pressed: 'pressed',
      selected: 'selected',
    });
    const layout = resolveDeclaredVariant<'rail' | 'toolbar'>(context, 'layout', {
      rail: 'rail',
      toolbar: 'toolbar',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const target = context.interactionTargetId;
    const targets: Record<string, ReadonlySet<string>> = {
      hover: new Set(['orange', 'red', 'premium', 'table']),
      'focus-visible': new Set(['orange', 'red', 'premium', 'table']),
      pressed: new Set(['orange', 'red', 'premium', 'table']),
      selected: new Set(['orange', 'red', 'premium', 'table']),
      'keyboard-navigation': new Set(['orange-to-red']),
    };
    const validInteraction = interaction === 'default'
      ? target === undefined
      : inputValue === 'lg 오렌지석 레드석 프리미엄석 테이블석'
        && layout === 'toolbar'
        && theme === 'light'
        && targets[interaction]?.has(target ?? '') === true;
    if (
      Object.keys(context.states).sort().join(',') !== 'data,interactions'
      || Object.keys(context.variants).sort().join(',') !== 'layout,theme'
      || !validInteraction
    ) {
      throw new Error(
        `지원하지 않는 MateSeatFilterButtons state: ${context.states.data ?? '<none>'}:${interaction}:${layout}:${theme}:${target ?? '<none>'}`,
      );
    }
    return {
      props: {
        initialInputValue: inputValue,
        layout,
        scenarioKey: `${context.states.data}:${interaction}:${target ?? 'none'}:${layout}:${theme}`,
      },
      captureSelector: '[data-testid="mate-seat-filter-buttons"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.sort-dropdown': (context) => {
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      'keyboard-navigation': 'keyboard-navigation',
      open: 'open',
      pressed: 'pressed',
      selected: 'selected',
    });
    const activeSort = resolveDeclaredVariant<'dDay' | 'latest' | 'popular'>(context, 'activeSort', {
      dDay: 'dDay',
      latest: 'latest',
      popular: 'popular',
    });
    const phase = resolveDeclaredVariant<'closed' | 'open'>(context, 'phase', {
      closed: 'closed',
      open: 'open',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const target = context.interactionTargetId;
    const targets: Record<string, ReadonlySet<string>> = {
      hover: new Set(['trigger', 'latest', 'dDay', 'popular']),
      'focus-visible': new Set(['trigger', 'latest', 'dDay', 'popular']),
      pressed: new Set(['trigger', 'latest', 'dDay', 'popular']),
      open: new Set(['trigger']),
      selected: new Set(['latest', 'dDay', 'popular']),
      'keyboard-navigation': new Set(['trigger-to-first-option', 'escape']),
    };
    const validInteraction = interaction === 'default'
      ? target === undefined
      : activeSort === 'latest'
        && phase === 'closed'
        && theme === 'light'
        && targets[interaction]?.has(target ?? '') === true;
    if (
      Object.keys(context.states).sort().join(',') !== 'interactions'
      || Object.keys(context.variants).sort().join(',') !== 'activeSort,phase,theme'
      || !validInteraction
    ) {
      throw new Error(
        `지원하지 않는 MateSortDropdown state: ${interaction}:${activeSort}:${phase}:${theme}:${target ?? '<none>'}`,
      );
    }
    return {
      props: {
        initialActiveSortKey: activeSort,
        initialOpen: phase === 'open',
        scenarioKey: `${interaction}:${target ?? 'none'}:${activeSort}:${phase}:${theme}`,
      },
      captureSelector: '[data-vqa-harness-surface]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.status-tabs': (context) => {
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      'keyboard-navigation': 'keyboard-navigation',
      pressed: 'pressed',
      selected: 'selected',
    });
    const activeTab = resolveDeclaredVariant<'all' | 'matched' | 'recruiting' | 'selling'>(context, 'activeTab', {
      all: 'all',
      matched: 'matched',
      recruiting: 'recruiting',
      selling: 'selling',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const target = context.interactionTargetId;
    const targets: Record<string, ReadonlySet<string>> = {
      hover: new Set(['recruiting', 'matched', 'selling']),
      'focus-visible': new Set(['recruiting']),
      pressed: new Set(['all', 'recruiting', 'matched', 'selling']),
      selected: new Set(['all', 'recruiting', 'matched', 'selling']),
      'keyboard-navigation': new Set(['all-to-recruiting']),
    };
    const validInteraction = interaction === 'default'
      ? target === undefined
      : activeTab === 'all'
        && theme === 'light'
        && targets[interaction]?.has(target ?? '') === true;
    if (
      Object.keys(context.states).sort().join(',') !== 'interactions'
      || Object.keys(context.variants).sort().join(',') !== 'activeTab,theme'
      || !validInteraction
    ) {
      throw new Error(
        `지원하지 않는 MateStatusTabs state: ${interaction}:${activeTab}:${theme}:${target ?? '<none>'}`,
      );
    }
    return {
      props: {
        initialActiveTab: activeTab,
        scenarioKey: `${interaction}:${target ?? 'none'}:${activeTab}:${theme}`,
      },
      captureSelector: '[data-testid="mate-status-tabs"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.page': (context) => {
    requireStateValue(context, 'data', 'single');
    const phase = resolveDeclaredVariant(context, 'phase', {
      'controls-fallback': 'controls-fallback',
      'results-fallback': 'results-fallback',
      runtime: 'runtime',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const noop = () => {};
    const visualQaStateOverride = phase === 'controls-fallback'
      ? { phase }
      : {
        phase,
        controller: {
          activeMobileFilterCount: 0,
          activeSortKey: 'latest',
          activeSortOption: {
            key: 'latest',
            label: '최신순',
            sortBy: 'createdAt',
            sortDir: 'desc',
          },
          activeTab: 'all',
          applySearchTerm: noop,
          applyMobileFilters: noop,
          authUserId: null,
          closeGuide: noop,
          closeMobileFilter: noop,
          dateItems: Array.from({ length: 14 }, (_, index) => (
            new Date(2026, 7, 27 + index, 12, 0, 0)
          )),
          favoriteTeamId: null,
          favoriteUpdatingPartyId: null,
          fetchError: false,
          handleCreatePartyClick: noop,
          handleDateSelect: noop,
          handleMyTeamOnlyChange: noop,
          handlePartyClick: noop,
          handleFavoriteToggle: async () => {},
          handleResetFilters: noop,
          handleRetry: noop,
          handleSearchInputChange: noop,
          handleSortChange: noop,
          handleTabChange: noop,
          hasActiveFilters: false,
          inputValue: '',
          isDesktopListLayout: false,
          isGuideOpen: false,
          isLoading: false,
          isMobileFilterOpen: false,
          mobileFilterButtonLabel: '팀과 좌석 필터 열기',
          myTeamOnly: false,
          openMobileFilter: noop,
          parties: [],
          queryPage: 0,
          selectedDate: null,
          setCurrentPage: noop,
          toggleGuideOpen: noop,
          toggleMyTeamOnly: noop,
          toggleSearchQuery: noop,
          totalPages: 0,
        },
      };

    return {
      props: { visualQaStateOverride },
      captureSelector: '[data-testid="mate-page"]',
      initialPathname: '/mate',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-0 shadow-none',
      theme,
    };
  },
  'mate.ticket-verification': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'long-korean': 'long-korean',
      'null-optional': 'null-optional',
      partial: 'partial',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const phase = resolveDeclaredVariant(context, 'phase', {
      idle: 'idle',
      scanning: 'scanning',
      verified: 'verified',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const targetId = context.interactionTargetId;
    const targetIsValid = interaction === 'default'
      ? targetId === undefined
      : phase === 'idle'
        ? targetId === 'upload'
        : phase === 'verified'
          ? targetId === 'reset'
          : false;
    if (
      (phase !== 'verified' && data !== 'single')
      || (interaction !== 'default' && data !== 'single')
      || !targetIsValid
    ) {
      throw new Error(
        `지원하지 않는 Mate ticket verification state: ${data}:${interaction}:${phase}:${targetId ?? '<none>'}`,
      );
    }

    const baseTicketInfo = {
      date: '2026-09-05',
      time: '18:30',
      stadium: '잠실',
      homeTeam: 'LG',
      awayTeam: 'OB',
      section: '1루 내야 101구역',
      row: '12열',
      seat: '34번',
      peopleCount: 1,
      price: 28000,
      reservationNumber: 'VQA-2026-0905',
      gameId: 77,
      verificationToken: 'visual-qa-ticket-token',
    };
    const ticketInfo = phase !== 'verified' || data === 'null-optional'
      ? null
      : data === 'partial'
        ? {
          ...baseTicketInfo,
          date: null,
          stadium: null,
          section: null,
          row: '12열',
          seat: '34번',
        }
        : data === 'long-korean'
          ? {
            ...baseTicketInfo,
            stadium: '서울특별시 종합운동장 야구장 공식 티켓 인증 구장 명칭이 모바일 카드 안에서 자연스럽게 줄바꿈되는지 확인하는 구장',
            section: '중앙 테이블석과 응원석 사이의 매우 긴 좌석 구역 안내 문구',
            row: '가장 안쪽 통로에서 여러 좌석을 지나야 하는 긴 열 정보',
            seat: '모바일 줄바꿈을 확인하는 긴 좌석 번호 설명',
          }
          : data === 'unbroken-token'
            ? {
              ...baseTicketInfo,
              stadium: `STADIUM-${'UNBROKEN'.repeat(18)}`,
              section: `SECTION-${'UNBROKEN'.repeat(18)}`,
              row: `ROW-${'UNBROKEN'.repeat(12)}`,
              seat: `SEAT-${'UNBROKEN'.repeat(12)}`,
            }
            : baseTicketInfo;

    return {
      props: {
        gameDate: '2026-09-05',
        onReset: () => undefined,
        onVerified: () => undefined,
        ticketInfo,
        ticketVerified: phase === 'verified',
        visualQaStateOverride: {
          isScanning: phase === 'scanning',
        },
      },
      captureSelector: '[data-testid="mate-apply-ticket-panel"]',
      surfaceClassName: 'block w-[320px] max-w-none overflow-visible rounded-none border-0 bg-background p-5 shadow-none',
      theme,
    };
  },
  'mate.today-count-badge': (context) => {
    const props = requireStateValueFromMap(context, 'data', {
      'boundary-maximum': { countOverride: 99 },
      empty: { countOverride: 0 },
      'error-503': { stateOverride: 'error' },
      loading: { stateOverride: 'loading' },
      'maximum-supported': { countOverride: Number.MAX_SAFE_INTEGER },
      overflow: { countOverride: 100 },
      single: { countOverride: 1 },
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props,
      surfaceClassName: 'flex min-h-20 w-full max-w-[320px] items-center justify-start overflow-visible bg-background p-4 shadow-none',
      theme,
    };
  },
  'stadium.favorite-toggle': (context) => {
    const props = requireStateValueFromMap(context, 'data', {
      'error-503': { stateOverride: 'error' },
      loading: { stateOverride: 'loading' },
      empty: { favoriteIdsOverride: [] },
      single: { favoriteIdsOverride: ['visual-qa-stadium'] },
    });
    requireStateValue(context, 'permissions', 'user');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
      submitting: 'submitting',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: {
        ...props,
        onToggleOverride: interaction === 'submitting'
          ? () => new Promise<never>(() => {})
          : () => {},
        stadiumId: 'visual-qa-stadium',
        testId: 'visual-qa-stadium-favorite-toggle',
      },
      surfaceClassName: 'flex min-h-20 w-full max-w-[160px] items-center justify-center overflow-visible bg-background p-4 shadow-none',
      theme,
    };
  },
  'route.not-found': (context) => {
    requireStateValueFromMap(context, 'data', { single: 'single' });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    if (
      interaction !== 'default'
      && context.interactionTargetId !== 'home'
      && context.interactionTargetId !== 'back'
    ) {
      throw new Error(`지원하지 않는 Visual QA interaction target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: {},
      surfaceClassName: 'block min-h-0 w-full max-w-[320px] overflow-visible bg-transparent p-0 shadow-none',
      theme,
    };
  },
  'simple-markdown.content': (context) => {
    const content = requireStateValueFromMap(context, 'data', simpleMarkdownContent);
    const omitFirstHeading = resolveDeclaredVariant(context, 'heading', {
      'keep-first': false,
      'omit-first': true,
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: { content, omitFirstHeading },
      surfaceClassName: 'block min-h-0 w-full max-w-[320px] overflow-visible bg-card p-4 text-card-foreground shadow-none',
      theme,
    };
  },
  'common.end-of-feed': (context) => {
    requireStateValueFromMap(context, 'data', { single: 'single' });
    requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: {},
      surfaceClassName: 'block min-h-0 w-full max-w-[320px] overflow-visible bg-background p-0 text-foreground shadow-none',
      theme,
    };
  },
  'landing.feature-card': (context) => {
    const copy = requireStateValueFromMap(context, 'data', featureCardCopy);
    requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const iconKey = resolveDeclaredVariant(context, 'icon', featureCardIcons);
    const image = resolveDeclaredVariant(context, 'image', featureCardImages);
    const presentation = resolveDeclaredVariant(context, 'presentation', featureCardPresentations);
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: {
        feature: { ...copy, ...image, iconKey },
        index: 0,
        ...presentation,
        onToggle: () => {},
      },
      surfaceClassName: 'block min-h-0 w-full max-w-[320px] overflow-visible bg-background p-0 text-foreground shadow-none',
      theme,
    };
  },
  'landing.laptop-mockup': (context) => {
    const dataState = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    } as const);
    const preset = resolveDeclaredVariant(context, 'feature', laptopFeaturePresets);
    const image = resolveDeclaredVariant(context, 'image', featureCardImages);
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const copy = featureCardCopy[dataState];
    const feature = dataState === 'single'
      ? { ...preset, ...image, guide: copy.guide }
      : {
          ...preset,
          ...image,
          description: copy.description,
          guide: copy.guide,
          title: dataState === 'empty' ? '' : `${preset.title} · ${copy.title}`,
        };
    return {
      props: { activeFeature: 0, features: [feature] },
      surfaceClassName: 'block min-h-0 w-full max-w-[320px] overflow-visible bg-background p-0 text-foreground shadow-none',
      theme,
    };
  },
  'landing.page': (context) => {
    requireStateValue(context, 'data', 'populated');
    requireStateValue(context, 'interactions', 'default');
    return {
      props: {},
      captureSelector: '[data-testid="landing-page"]',
      initialPathname: '/',
      surfaceClassName: landingDirectSurface,
      theme: resolveLandingTheme(context),
    };
  },
  'landing.app-preview': (context) => resolveLandingStatic(
    context,
    '[data-testid="landing-app-preview"]',
    { fixedTheme: true },
  ),
  'landing.capability-showcase': (context) => {
    const visualQaStateOverride = requireStateValueFromMap(context, 'data', {
      populated: undefined,
      'long-korean': {
        description: '경기 전 준비부터 현장 동선과 경기 후 기록까지 모든 기능을 좁은 모바일 화면에서도 차분하게 확인할 수 있도록 설명하는 긴 한국어 소개 문구입니다.',
        heading: '경기 전과 현장과 경기 후의 모든 야구 경험을 한 화면에서 자연스럽게 이어서 확인합니다',
        storyDescriptionSuffix: ' 좁은 화면에서도 세부 설명이 서로 겹치지 않고 여러 줄로 자연스럽게 이어집니다.',
        storyTitleSuffix: ' 모바일 상세 기능 안내',
      },
      'unbroken-token': {
        description: `CAPABILITY-DESCRIPTION-${'UNBROKEN'.repeat(18)}`,
        heading: `CAPABILITY-HEADING-${'UNBROKEN'.repeat(18)}`,
        storyDescriptionSuffix: ` CAPABILITY-STORY-DESCRIPTION-${'UNBROKEN'.repeat(18)}`,
        storyTitleSuffix: ` CAPABILITY-STORY-TITLE-${'UNBROKEN'.repeat(18)}`,
      },
      'broken-image': {
        imageSrc: '/__visual-qa__/missing-capability.webp',
      },
    });
    return {
      props: visualQaStateOverride ? { visualQaStateOverride } : {},
      captureSelector: '[data-testid="landing-capability-showcase"]',
      surfaceClassName: landingDirectSurface,
      theme: resolveLandingTheme(context),
    };
  },
  'landing.closing': (context) => resolveLandingStatic(
    context,
    '[data-testid="landing-closing"]',
    { fixedTheme: true },
  ),
  'landing.feature-section': (context) => {
    const copy = requireStateValueFromMap(context, 'data', {
      populated: {
        description: '9개 KBO 구장의 좌석 뷰와 교통 정보를 한눈에 확인하세요.',
        title: '처음 가는 구장도\n단골처럼',
        visual: '공개 랜딩 기능 미리보기',
      },
      'long-korean': {
        description: '가장 좁은 모바일 화면에서도 기능 설명과 보조 정보가 서로 겹치지 않고 자연스럽게 여러 줄로 표시되어야 하는 긴 한국어 안내입니다.',
        title: '처음 방문하는 야구장에서도 좌석과 교통과 먹거리 정보를 놓치지 않는 아주 긴 기능 제목',
        visual: '모바일 화면에서 여러 줄로 표시되는 긴 한국어 시각 예시 카드',
      },
      'unbroken-token': {
        description: `LANDING-DESCRIPTION-${'UNBROKEN'.repeat(18)}`,
        title: `LANDING-TITLE-${'UNBROKEN'.repeat(18)}`,
        visual: `LANDING-VISUAL-${'UNBROKEN'.repeat(18)}`,
      },
    });
    const number = resolveDeclaredVariant(context, 'number', {
      '01': '01',
      '02': '02',
      '03': '03',
      '04': '04',
      '05': '05',
      '06': '06',
    } as const);
    const visualFirst = resolveDeclaredVariant(context, 'order', {
      'copy-first': false,
      'visual-first': true,
    });
    const tone = resolveDeclaredVariant(context, 'tone', {
      muted: 'muted',
      plain: 'plain',
    } as const);
    const supplement = resolveDeclaredVariant(context, 'supplement', {
      absent: undefined,
      present: createElement(
        'p',
        { className: 'landing-feature-description', 'data-testid': 'landing-copy-supplement' },
        copy.visual,
      ),
    });
    return {
      props: {
        copySupplement: supplement,
        description: copy.description,
        number,
        title: copy.title,
        tone,
        visual: createElement(
          'article',
          { className: 'landing-vignette-card p-5', 'data-testid': 'landing-visual-fixture' },
          copy.visual,
        ),
        visualFirst,
      },
      captureSelector: `[data-testid="landing-feature-${number}"]`,
      surfaceClassName: landingDirectSurface,
      theme: resolveLandingTheme(context),
    };
  },
  'landing.features-runtime': (context) => {
    requireStateValue(context, 'data', 'maximum-supported');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
      selected: 'selected',
    });
    if (
      interaction !== 'default'
      && !/^feature-[0-5]$/.test(context.interactionTargetId ?? '')
    ) {
      throw new Error(`지원하지 않는 Visual QA interaction target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    return {
      props: {},
      captureSelector: '[data-testid="landing-features"]',
      surfaceClassName: landingDirectSurface,
      theme: resolveLandingTheme(context),
    };
  },
  'landing.hero': (context) => {
    requireStateValue(context, 'data', 'populated');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      open: 'open',
      pressed: 'pressed',
    });
    if (interaction !== 'default' && context.interactionTargetId !== 'home') {
      throw new Error(`지원하지 않는 Visual QA interaction target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    return {
      props: {},
      captureSelector: '[data-testid="landing-hero"]',
      initialPathname: '/',
      surfaceClassName: landingDirectSurface,
      theme: resolveLandingTheme(context),
    };
  },
  'landing.offseason': (context) => resolveLandingStatic(
    context,
    '[data-testid="landing-offseason"]',
  ),
  'landing.phone-preview': (context) => resolveLandingStatic(
    context,
    '.landing-phone-frame',
    {
      fixedTheme: true,
      surfaceClassName: 'landing-phone-frame block min-h-0 w-full max-w-[320px] overflow-hidden p-0 shadow-none',
    },
  ),
  'landing.start-guide': (context) => resolveLandingStatic(
    context,
    '[data-testid="landing-start-guide"]',
  ),
  'landing.ticker': (context) => {
    requireStateValue(context, 'data', 'populated');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
      selected: 'selected',
    });
    if (interaction !== 'default' && context.interactionTargetId !== 'toggle') {
      throw new Error(`지원하지 않는 Visual QA interaction target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    return {
      props: {},
      captureSelector: '[data-testid="landing-score-ticker"]',
      surfaceClassName: landingDirectSurface,
    };
  },
  'landing.cheer-vignette': (context) => resolveLandingStatic(
    context,
    '.landing-cheer-vignette',
  ),
  'landing.diary-vignette': (context) => resolveLandingStatic(
    context,
    '.landing-diary-vignette',
  ),
  'landing.game-data-vignette': (context) => resolveLandingStatic(
    context,
    '.landing-game-vignette',
  ),
  'landing.mate-vignette': (context) => resolveLandingStatic(
    context,
    '.landing-mate-vignette',
  ),
  'landing.prediction-vignette': (context) => resolveLandingStatic(
    context,
    '.landing-prediction-vignette',
  ),
  'landing.stadium-chips': (context) => resolveLandingStatic(
    context,
    '.landing-stadium-chips',
  ),
  'landing.stadium-vignette': (context) => resolveLandingStatic(
    context,
    '.landing-stadium-card',
  ),
  'layout.footer': (context) => {
    requireStateValueFromMap(context, 'data', { single: 'single' });
    requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: {},
      surfaceClassName: 'block min-h-0 w-full max-w-[320px] overflow-visible bg-transparent p-0 shadow-none',
      theme,
    };
  },
  'terms-of-service.page': (context) => {
    requireStateValueFromMap(context, 'data', { single: 'single' });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: {},
      surfaceClassName: 'block min-h-0 w-full max-w-none overflow-visible rounded-none border-0 bg-transparent p-0 shadow-none',
      theme,
    };
  },
  'team.logo': (context) => {
    const dataState = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'long-korean': 'long-korean',
      'null-optional': 'null-optional',
      populated: 'populated',
      'unbroken-token': 'unbroken-token',
    });
    const teamVariant = resolveDeclaredVariant(context, 'team', teamLogoPopulatedData);
    if (dataState !== 'populated' && context.variants.team !== 'hanwha') {
      throw new Error(`지원하지 않는 TeamLogo 비정상 데이터 조합: data=${dataState}, team=${context.variants.team}`);
    }
    const data = dataState === 'populated' ? teamVariant : teamLogoStressData[dataState];
    const size = resolveDeclaredVariant(context, 'size', teamLogoSizes);
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: { ...data, ...size },
      surfaceClassName: theme === 'dark'
        ? 'flex min-h-[320px] w-full max-w-sm items-center justify-center overflow-hidden bg-slate-950 p-4'
        : 'flex min-h-[320px] w-full max-w-sm items-center justify-center overflow-hidden bg-slate-100 p-4',
      theme,
    };
  },
  'team-recommendation.test': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'maximum-supported': 'maximum-supported',
      single: 'single',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
      selected: 'selected',
    });
    const presentation = resolveDeclaredVariant(context, 'presentation', teamRecommendationPresentations);
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const isResult = presentation.recommendedTeam !== undefined;
    if ((isResult && data !== 'maximum-supported') || (!isResult && data !== 'single')) {
      throw new Error(`지원하지 않는 팀 추천 화면 데이터 조합: data=${data}, presentation=${context.variants.presentation}`);
    }
    if (isResult && interaction === 'selected') {
      throw new Error(`지원하지 않는 팀 추천 선택 상태: presentation=${context.variants.presentation}`);
    }

    const initialState = isResult
      ? {
          questionTeamScores: Array.from({ length: 7 }, (_, index) => (
            index === 0
              ? Object.fromEntries(FRANCHISE_TEAM_IDS.map((teamId, teamIndex) => [
                  teamId,
                  teamId === presentation.recommendedTeam ? 100 : 80 - teamIndex,
                ]))
              : null
          )),
          recommendedTeam: presentation.recommendedTeam,
          showResult: true,
        }
      : {
          currentQuestion: presentation.questionIndex,
          selectedAnswer: interaction === 'selected' ? 0 : null,
        };

    return {
      props: {
        initialState,
        isOpen: true,
        onClose: () => {},
        onSelectTeam: () => {},
      },
      captureSelector: '[role="dialog"]',
      surfaceClassName: 'block min-h-0 w-full max-w-none overflow-visible rounded-none border-0 bg-transparent p-0 shadow-none',
      theme,
    };
  },
  'theme-toggle.button': (context) => {
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      selected: 'selected',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const usage = resolveDeclaredVariant<'default' | 'menu-panel' | 'private-navbar' | 'public-navbar'>(context, 'usage', {
      default: 'default',
      'menu-panel': 'menu-panel',
      'private-navbar': 'private-navbar',
      'public-navbar': 'public-navbar',
    });
    if (
      interaction !== 'default'
      && interaction !== 'selected'
      && context.interactionTargetId !== 'toggle'
    ) {
      throw new Error(`지원하지 않는 Visual QA theme toggle target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    if (
      interaction === 'selected'
      && context.interactionTargetId !== (theme === 'light' ? 'to-dark' : 'to-light')
    ) {
      throw new Error(`지원하지 않는 Visual QA theme toggle transition: ${context.interactionTargetId ?? '<missing>'}`);
    }

    const usageProps = {
      default: {},
      'menu-panel': {
        className: 'relative h-11 w-11 p-2.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white hover:bg-gray-100 dark:hover:bg-secondary',
        iconClassName: 'h-6 w-6',
      },
      'private-navbar': {
        className: 'relative inline-flex h-10 w-10 shrink-0 transform-gpu items-center justify-center rounded-full p-2 transition-all duration-[220ms] ease-out motion-safe:hover:-translate-y-0.5 motion-safe:focus-visible:-translate-y-0.5 motion-reduce:transform-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 text-gray-500 hover:text-gray-900 dark:text-white dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8',
        iconClassName: 'h-5 w-5',
      },
      'public-navbar': {
        className: 'relative inline-flex h-10 w-10 items-center justify-center rounded-full p-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-500 hover:text-gray-900 dark:text-white dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8',
        iconClassName: 'h-5 w-5',
      },
    }[usage];

    return {
      props: usageProps,
      captureSelector: 'button[aria-label]',
      surfaceClassName: 'flex min-h-32 w-full max-w-[160px] items-center justify-center overflow-visible bg-white dark:bg-slate-950 p-8 shadow-none',
      theme,
    };
  },
  'ticket.upload-modal': (context) => {
    const dataState = requireStateValueFromMap(context, 'data', {
      'broken-image': 'broken-image',
      empty: 'empty',
      'error-503': 'error-503',
      loading: 'loading',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      'null-optional': 'null-optional',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const system = requireStateValueFromMap(context, 'system', {
      offline: 'offline',
      online: 'online',
      timeout: 'timeout',
    });
    requireStateValueFromMap(context, 'interactions', {
      default: true,
      'focus-visible': true,
      input: true,
      selected: true,
    });
    const gameId = resolveDeclaredVariant(context, 'gameMatch', {
      missing: null,
      present: 2026082301,
    });
    const result = dataState === 'single'
      || dataState === 'maximum-supported'
      || dataState === 'long-korean'
      || dataState === 'unbroken-token'
      || dataState === 'null-optional'
      ? ticketResultData[dataState]
      : null;
    const ticketData = result ? {
      ...result,
      gameId,
      peopleCount: dataState === 'maximum-supported' ? Number.MAX_SAFE_INTEGER : 1,
      price: dataState === 'maximum-supported' ? Number.MAX_SAFE_INTEGER : 25000,
      reservationNumber: dataState === 'null-optional' ? null : 'VISUAL-QA-RESERVATION',
      time: dataState === 'null-optional' ? null : '18:30',
      verificationToken: dataState === 'null-optional' ? null : 'visual-qa-token',
    } : null;
    const previewUrl = dataState === 'empty'
      ? null
      : dataState === 'broken-image'
        ? brokenVisualQaImage
        : ticketPreviewDataUrl;
    const analyzeTicketFile = async () => {
      if (system === 'offline') {
        throw new Error('네트워크 연결이 끊어졌습니다. 연결을 확인하고 다시 시도해주세요.');
      }
      if (system === 'timeout') return new Promise<never>(() => {});
      return ticketData ?? {
        ...ticketResultData.single,
        gameId: null,
        peopleCount: 1,
        price: 25000,
        reservationNumber: 'VISUAL-QA-RESERVATION',
        time: '18:30',
        verificationToken: 'visual-qa-token',
      };
    };
    return {
      props: {
        analyzeTicketFile,
        initialState: {
          analysisError: dataState === 'error-503'
            ? '티켓 분석 서비스를 현재 사용할 수 없습니다. 잠시 후 다시 시도해주세요.'
            : null,
          isLoading: dataState === 'loading',
          previewUrl,
          ticketData,
        },
        onConfirm: () => {},
        onOpenChange: () => {},
        onTicketAnalyzed: () => {},
        open: true,
        trigger: null,
      },
      captureSelector: '[data-testid="ticket-upload-dialog"]',
      surfaceClassName: 'block min-h-0 w-full overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'auth.account-deletion-recovery': (context) => {
    const initialStateOverride = requireStateValueFromMap(context, 'data', {
      loading: {
        canRecover: false,
        error: '',
        isLoading: true,
        isRecovered: false,
        isRecovering: false,
        scheduledFor: '',
      },
      single: {
        canRecover: true,
        error: '',
        isLoading: false,
        isRecovered: false,
        isRecovering: false,
        scheduledFor: '2026-08-31T18:30:00+09:00',
      },
      'null-optional': {
        canRecover: true,
        error: '',
        isLoading: false,
        isRecovered: false,
        isRecovering: false,
        scheduledFor: '',
      },
      'long-latin': {
        canRecover: true,
        error: '',
        isLoading: false,
        isRecovered: false,
        isRecovering: false,
        scheduledFor: `ACCOUNT-RECOVERY-SCHEDULE-${'2026-08-31T18:30:00+09:00'.repeat(10)}`,
      },
      'error-400': {
        canRecover: false,
        error: '유효하지 않거나 만료된 복구 링크입니다.',
        isLoading: false,
        isRecovered: false,
        isRecovering: false,
        scheduledFor: '',
      },
      'long-korean': {
        canRecover: false,
        error: '계정 복구 정보를 확인하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요. 같은 문제가 계속되면 로그인 화면으로 돌아가 새 복구 링크를 요청해 주세요.',
        isLoading: false,
        isRecovered: false,
        isRecovering: false,
        scheduledFor: '',
      },
      'unbroken-token': {
        canRecover: false,
        error: `ACCOUNT-RECOVERY-ERROR-${'UNBROKEN'.repeat(28)}`,
        isLoading: false,
        isRecovered: false,
        isRecovering: false,
        scheduledFor: '',
      },
      complete: {
        canRecover: true,
        error: '',
        isLoading: false,
        isRecovered: true,
        isRecovering: false,
        scheduledFor: '2026-08-31T18:30:00+09:00',
      },
    });
    requireStateValue(context, 'permissions', 'anonymous');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
      submitting: 'submitting',
    });
    const system = requireStateValueFromMap(context, 'system', {
      offline: 'offline',
      online: 'online',
      timeout: 'timeout',
    });
    if (interaction !== 'default') {
      const staticTargets = new Set(['back', 'login', 'submit']);
      const expectedClickTarget = `submit-${system}`;
      const validTarget = interaction === 'submitting'
        ? context.interactionTargetId === expectedClickTarget
        : staticTargets.has(context.interactionTargetId ?? '');
      if (!validTarget) {
        throw new Error(`지원하지 않는 Visual QA account recovery target: ${context.interactionTargetId ?? '<missing>'}`);
      }
    }
    const pending = () => new Promise<never>(() => {});
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: {
        initialStateOverride,
        redirectPathOverride: '/mypage?view=accountSettings',
        runtimeOverride: {
          getRecoveryInfo: async () => ({ scheduledFor: '2026-08-31T18:30:00+09:00' }),
          navigate: () => {},
          requestRecovery: async () => {
            if (system === 'offline') {
              throw new Error('네트워크 연결이 끊어졌습니다. 연결을 확인하고 다시 시도해 주세요.');
            }
            if (system === 'timeout') await pending();
          },
        },
        tokenOverride: 'visual-qa-token',
      },
      captureSelector: '[data-testid="auth-shell"]',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-transparent p-0 shadow-none',
      theme,
    };
  },
  'auth.password-reset': (context) => {
    const visualQaStateOverride = requireStateValueFromMap(context, 'data', {
      empty: {
        email: '',
        emailError: '',
        isSubmitted: false,
        isLoading: false,
        error: null,
        successMessage: '',
      },
      single: {
        email: 'mobile@example.com',
        emailError: '',
        isSubmitted: false,
        isLoading: false,
        error: null,
        successMessage: '',
      },
      loading: {
        email: 'mobile@example.com',
        emailError: '',
        isSubmitted: false,
        isLoading: true,
        error: null,
        successMessage: '',
      },
      'error-422': {
        email: 'invalid-email',
        emailError: '올바른 이메일 형식으로 입력해주세요.',
        isSubmitted: false,
        isLoading: false,
        error: null,
        successMessage: '',
      },
      'error-503': {
        email: 'mobile@example.com',
        emailError: '',
        isSubmitted: false,
        isLoading: false,
        error: '비밀번호 재설정 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
        successMessage: '',
      },
      'long-korean': {
        email: 'mobile@example.com',
        emailError: '',
        isSubmitted: false,
        isLoading: false,
        error: '모바일 화면에서도 오류 안내와 입력 영역, 재설정 버튼이 서로 겹치지 않고 자연스럽게 줄바꿈되는지 확인하는 매우 긴 한국어 비밀번호 재설정 안내입니다. 네트워크 상태를 확인한 뒤 잠시 후 다시 시도해주세요.',
        successMessage: '',
      },
      'unbroken-token': {
        email: 'mobile@example.com',
        emailError: '',
        isSubmitted: false,
        isLoading: false,
        error: `PASSWORD-RESET-${'UNBROKEN'.repeat(28)}`,
        successMessage: '',
      },
      complete: {
        email: 'mobile@example.com',
        emailError: '',
        isSubmitted: true,
        isLoading: false,
        error: null,
        successMessage: '입력한 이메일 주소로 비밀번호 재설정 링크를 전송했습니다.',
      },
    });
    requireStateValue(context, 'permissions', 'anonymous');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    if (interaction !== 'default') {
      const targets = new Set(['back', 'email', 'return-login', 'submit']);
      if (!targets.has(context.interactionTargetId ?? '')) {
        throw new Error(`지원하지 않는 Visual QA password-reset target: ${context.interactionTargetId ?? '<missing>'}`);
      }
    }
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: { visualQaStateOverride },
      captureSelector: '[data-testid="auth-shell"]',
      expectedHash: '',
      expectedPathname: '/password/reset',
      expectedSearch: '?redirect=%2Fmate',
      initialPathname: '/password/reset?redirect=%2Fmate',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-transparent p-0 shadow-none',
      theme,
    };
  },
  'auth.login': (context) => {
    const dataState = requireStateValueFromMap(context, 'data', {
      empty: {
        formData: { email: '', password: '' },
        fieldErrors: { email: '', password: '' },
        isLoading: false,
        error: null,
      },
      single: {
        formData: { email: 'mobile@example.com', password: 'VisualQa1!' },
        fieldErrors: { email: '', password: '' },
        isLoading: false,
        error: null,
      },
      loading: {
        formData: { email: 'mobile@example.com', password: 'VisualQa1!' },
        fieldErrors: { email: '', password: '' },
        isLoading: true,
        error: null,
      },
      'error-401': {
        formData: { email: 'mobile@example.com', password: 'VisualQa1!' },
        fieldErrors: { email: '', password: '' },
        isLoading: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다.',
      },
      'error-422': {
        formData: { email: 'invalid-email', password: 'short' },
        fieldErrors: {
          email: '올바른 이메일 형식으로 입력해주세요.',
          password: '비밀번호를 입력해주세요.',
        },
        isLoading: false,
        error: null,
      },
      'error-503': {
        formData: { email: 'mobile@example.com', password: 'VisualQa1!' },
        fieldErrors: { email: '', password: '' },
        isLoading: false,
        error: '로그인 서비스를 현재 사용할 수 없습니다. 잠시 후 다시 시도해주세요.',
      },
      'long-korean': {
        formData: { email: 'mobile@example.com', password: 'VisualQa1!' },
        fieldErrors: { email: '', password: '' },
        isLoading: false,
        error: '모바일 화면에서도 로그인 오류 안내와 입력 영역, 저장 옵션, 비밀번호 보기 버튼, 소셜 로그인 버튼이 서로 겹치지 않고 자연스럽게 줄바꿈되는지 확인하는 매우 긴 한국어 안내입니다. 계정 정보를 확인한 뒤 다시 시도해주세요.',
      },
      'unbroken-token': {
        formData: { email: 'mobile@example.com', password: 'VisualQa1!' },
        fieldErrors: { email: '', password: '' },
        isLoading: false,
        error: `LOGIN-${'UNBROKEN'.repeat(28)}`,
      },
    });
    requireStateValue(context, 'permissions', 'anonymous');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    if (context.states.data === 'loading' && interaction !== 'default') {
      throw new Error(`지원하지 않는 Visual QA login interaction: data=loading, interactions=${interaction}`);
    }
    if (interaction !== 'default') {
      const targets = new Set([
        'email',
        'google',
        'home',
        'kakao',
        'naver',
        'password',
        'password-reset',
        'password-visibility',
        'remember-email',
        'signup',
        'submit',
      ]);
      if (!targets.has(context.interactionTargetId ?? '')) {
        throw new Error(`지원하지 않는 Visual QA login target: ${context.interactionTargetId ?? '<missing>'}`);
      }
    }
    const rememberEmail = resolveDeclaredVariant(context, 'remember-email', {
      checked: true,
      unchecked: false,
    });
    const showPassword = resolveDeclaredVariant(context, 'visibility', {
      hidden: false,
      visible: true,
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: {
        visualQaStateOverride: {
          ...dataState,
          showPassword,
          rememberEmail,
        },
      },
      captureSelector: '[data-testid="auth-shell"]',
      expectedHash: '',
      expectedPathname: '/login',
      expectedSearch: '?redirect=%2Fmate',
      initialPathname: '/login?redirect=%2Fmate',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-transparent p-0 shadow-none',
      theme,
    };
  },
  'auth.oauth-callback': (context) => {
    const visualQaStateOverride = requireStateValueFromMap(context, 'data', {
      loading: {
        phase: 'loading',
      },
      'error-400': {
        phase: 'error',
        errorCode: 'invalid_oauth2_request',
        title: '로그인 요청을 확인할 수 없습니다.',
        description: '로그인 페이지로 돌아가 소셜 로그인을 다시 시작해주세요.',
      },
      'error-401': {
        phase: 'error',
        errorCode: 'oauth2_auth_failed',
        title: '소셜 로그인 인증에 실패했습니다.',
        description: '소셜 계정 상태를 확인한 뒤 다시 시도해주세요.',
      },
      'error-503': {
        phase: 'error',
        errorCode: 'auth_session_not_established',
        title: '로그인 세션을 시작하지 못했습니다.',
        description: '잠시 후 로그인 페이지에서 다시 시도해주세요.',
      },
      'long-korean': {
        phase: 'error',
        errorCode: 'oauth2_auth_failed',
        title: '모바일 화면에서도 소셜 로그인 실패 제목과 안내 문구가 서로 겹치지 않고 자연스럽게 줄바꿈되는지 확인하는 매우 긴 한국어 로그인 처리 실패 안내입니다.',
        description: '로그인 페이지로 돌아가는 버튼과 오류 안내 카드가 작은 화면에서도 분리되어 유지되는지 확인한 뒤 소셜 로그인을 다시 시도해주세요.',
      },
      'unbroken-token': {
        phase: 'error',
        errorCode: 'oauth2_auth_failed',
        title: `OAUTH-CALLBACK-${'UNBROKEN'.repeat(24)}`,
        description: `OAUTH-CALLBACK-DESCRIPTION-${'UNBROKEN'.repeat(20)}`,
      },
    });
    requireStateValue(context, 'permissions', 'anonymous');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const system = requireStateValueFromMap(context, 'system', {
      offline: 'offline',
      online: 'online',
      timeout: 'timeout',
    });
    const data = context.states.data ?? '';
    const expectedSystem = data === 'loading'
      ? 'timeout'
      : data === 'error-503'
        ? 'offline'
        : 'online';
    if (system !== expectedSystem) {
      throw new Error(`지원하지 않는 Visual QA oauth-callback system state: data=${data}, system=${system}`);
    }
    if (data === 'loading' && interaction !== 'default') {
      throw new Error(`지원하지 않는 Visual QA oauth-callback interaction: data=${data}, interactions=${interaction}`);
    }
    if (interaction !== 'default' && context.interactionTargetId !== 'return-login') {
      throw new Error(`지원하지 않는 Visual QA oauth-callback target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: { visualQaStateOverride },
      captureSelector: '[data-testid="auth-shell"]',
      expectedHash: '',
      expectedPathname: '/oauth/callback',
      expectedSearch: '?state=visual-qa-state',
      initialPathname: '/oauth/callback?state=visual-qa-state',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-transparent p-0 shadow-none',
      theme,
    };
  },
  'auth.signup': (context) => {
    const completeFormData = {
      name: '잠실직관러',
      handle: '@visual_qa',
      email: 'mobile@example.com',
      password: 'VisualQa1!abcd',
      confirmPassword: 'VisualQa1!abcd',
      favoriteTeam: 'LG 트윈스',
    };
    const emptyFieldErrors = {
      name: '',
      handle: '',
      email: '',
      password: '',
      confirmPassword: '',
      favoriteTeam: '',
    };
    const availableHandle = {
      state: 'available',
      message: '사용 가능한 핸들입니다.',
      normalized: '@visual_qa',
    };
    const idleEmail = { state: 'idle', message: '' };
    const dataState = requireStateValueFromMap(context, 'data', {
      empty: {
        formData: {
          name: '',
          handle: '@',
          email: '',
          password: '',
          confirmPassword: '',
          favoriteTeam: '',
        },
        fieldErrors: emptyFieldErrors,
        handleAvailability: { state: 'idle', message: '' },
        emailAvailability: idleEmail,
        isLoading: false,
        isSubmitDisabled: true,
        isSuccess: false,
        error: null,
      },
      single: {
        formData: completeFormData,
        fieldErrors: emptyFieldErrors,
        handleAvailability: availableHandle,
        emailAvailability: idleEmail,
        isLoading: false,
        isSubmitDisabled: false,
        isSuccess: false,
        error: null,
      },
      loading: {
        formData: completeFormData,
        fieldErrors: emptyFieldErrors,
        handleAvailability: availableHandle,
        emailAvailability: idleEmail,
        isLoading: true,
        isSubmitDisabled: true,
        isSuccess: false,
        error: null,
      },
      'handle-checking': {
        formData: completeFormData,
        fieldErrors: emptyFieldErrors,
        handleAvailability: {
          state: 'checking',
          message: '핸들 사용 가능 여부를 확인하고 있습니다...',
          normalized: '@visual_qa',
        },
        emailAvailability: idleEmail,
        isLoading: false,
        isSubmitDisabled: true,
        isSuccess: false,
        error: null,
      },
      'handle-taken': {
        formData: completeFormData,
        fieldErrors: emptyFieldErrors,
        handleAvailability: {
          state: 'taken',
          message: '이미 사용 중인 핸들입니다.',
          normalized: '@visual_qa',
        },
        emailAvailability: idleEmail,
        isLoading: false,
        isSubmitDisabled: true,
        isSuccess: false,
        error: '이미 사용 중인 핸들입니다.',
      },
      'handle-error': {
        formData: completeFormData,
        fieldErrors: emptyFieldErrors,
        handleAvailability: {
          state: 'error',
          message: '핸들 중복 확인에 실패했습니다. 잠시 후 다시 시도해주세요.',
          normalized: '@visual_qa',
        },
        emailAvailability: idleEmail,
        isLoading: false,
        isSubmitDisabled: true,
        isSuccess: false,
        error: null,
      },
      'email-taken': {
        formData: completeFormData,
        fieldErrors: emptyFieldErrors,
        handleAvailability: availableHandle,
        emailAvailability: {
          state: 'taken',
          message: '이미 사용 중인 이메일입니다.',
          normalized: 'mobile@example.com',
        },
        isLoading: false,
        isSubmitDisabled: true,
        isSuccess: false,
        error: '이미 사용 중인 이메일입니다.',
      },
      'error-422': {
        formData: {
          name: '',
          handle: '@INVALID!',
          email: 'invalid-email',
          password: 'short',
          confirmPassword: 'different',
          favoriteTeam: '',
        },
        fieldErrors: {
          name: '닉네임을 입력해주세요.',
          handle: '핸들은 영문 소문자, 숫자, 밑줄만 사용할 수 있습니다.',
          email: '올바른 이메일 형식으로 입력해주세요.',
          password: '비밀번호는 12자 이상이며 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다.',
          confirmPassword: '비밀번호가 일치하지 않습니다.',
          favoriteTeam: '응원팀을 선택해주세요.',
        },
        handleAvailability: { state: 'idle', message: '' },
        emailAvailability: idleEmail,
        isLoading: false,
        isSubmitDisabled: true,
        isSuccess: false,
        error: null,
      },
      'error-503': {
        formData: completeFormData,
        fieldErrors: emptyFieldErrors,
        handleAvailability: availableHandle,
        emailAvailability: idleEmail,
        isLoading: false,
        isSubmitDisabled: false,
        isSuccess: false,
        error: '회원가입 서비스를 현재 사용할 수 없습니다. 잠시 후 다시 시도해주세요.',
      },
      'long-korean': {
        formData: completeFormData,
        fieldErrors: emptyFieldErrors,
        handleAvailability: availableHandle,
        emailAvailability: idleEmail,
        isLoading: false,
        isSubmitDisabled: false,
        isSuccess: false,
        error: '모바일 화면에서도 회원가입 오류 안내와 여섯 입력 영역, 중복 확인 안내, 비밀번호 보기 버튼, 응원팀 선택과 하단 작업이 서로 겹치지 않고 자연스럽게 줄바꿈되는지 확인하는 매우 긴 한국어 안내입니다. 입력 내용을 확인한 뒤 다시 시도해주세요.',
      },
      'unbroken-token': {
        formData: completeFormData,
        fieldErrors: emptyFieldErrors,
        handleAvailability: availableHandle,
        emailAvailability: idleEmail,
        isLoading: false,
        isSubmitDisabled: false,
        isSuccess: false,
        error: `SIGNUP-${'UNBROKEN'.repeat(28)}`,
      },
      'no-team': {
        formData: { ...completeFormData, favoriteTeam: '없음' },
        fieldErrors: emptyFieldErrors,
        handleAvailability: availableHandle,
        emailAvailability: idleEmail,
        isLoading: false,
        isSubmitDisabled: false,
        isSuccess: false,
        error: null,
      },
      complete: {
        formData: completeFormData,
        fieldErrors: emptyFieldErrors,
        handleAvailability: availableHandle,
        emailAvailability: idleEmail,
        isLoading: false,
        isSubmitDisabled: true,
        isSuccess: true,
        error: null,
      },
    });
    requireStateValue(context, 'permissions', 'anonymous');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const dataName = context.states.data ?? '';
    if ((dataName === 'loading' || dataName === 'complete') && interaction !== 'default') {
      throw new Error(`지원하지 않는 Visual QA signup interaction: data=${dataName}, interactions=${interaction}`);
    }
    if (interaction !== 'default') {
      const target = context.interactionTargetId ?? '';
      const targets = new Set([
        'confirm-password',
        'confirm-password-visibility',
        'email',
        'favorite-team',
        'handle',
        'login',
        'name',
        'password',
        'password-visibility',
        'submit',
        'team-test',
      ]);
      if (!targets.has(target)) {
        throw new Error(`지원하지 않는 Visual QA signup target: ${target || '<missing>'}`);
      }
      const submitEnabledStates = new Set([
        'error-503',
        'long-korean',
        'no-team',
        'single',
        'unbroken-token',
      ]);
      if (target === 'submit' && !submitEnabledStates.has(dataName)) {
        throw new Error(`지원하지 않는 Visual QA signup submit interaction: data=${dataName}`);
      }
    }
    const visibility = resolveDeclaredVariant(context, 'visibility', {
      hidden: { showPassword: false, showConfirmPassword: false },
      'password-visible': { showPassword: true, showConfirmPassword: false },
      'confirm-visible': { showPassword: false, showConfirmPassword: true },
      'both-visible': { showPassword: true, showConfirmPassword: true },
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: {
        visualQaStateOverride: {
          ...dataState,
          ...visibility,
        },
      },
      captureSelector: '[data-testid="auth-shell"]',
      expectedHash: '',
      expectedPathname: '/signup',
      expectedSearch: '?redirect=%2Fmate',
      initialPathname: '/signup?redirect=%2Fmate',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-transparent p-0 shadow-none',
      theme,
    };
  },
  'auth.password-reset-confirm': (context) => {
    const dataState = requireStateValueFromMap(context, 'data', {
      empty: {
        token: 'visual-qa-token',
        formData: { newPassword: '', confirmPassword: '' },
        fieldErrors: { newPassword: '', confirmPassword: '' },
        isCompleted: false,
        isLoading: false,
        error: null,
      },
      single: {
        token: 'visual-qa-token',
        formData: { newPassword: 'VisualQa1!', confirmPassword: 'VisualQa1!' },
        fieldErrors: { newPassword: '', confirmPassword: '' },
        isCompleted: false,
        isLoading: false,
        error: null,
      },
      loading: {
        token: 'visual-qa-token',
        formData: { newPassword: 'VisualQa1!', confirmPassword: 'VisualQa1!' },
        fieldErrors: { newPassword: '', confirmPassword: '' },
        isCompleted: false,
        isLoading: true,
        error: null,
      },
      'error-400': {
        token: '',
        formData: { newPassword: '', confirmPassword: '' },
        fieldErrors: { newPassword: '', confirmPassword: '' },
        isCompleted: false,
        isLoading: false,
        error: '유효하지 않거나 만료된 비밀번호 재설정 링크입니다.',
      },
      'error-422': {
        token: 'visual-qa-token',
        formData: { newPassword: 'short', confirmPassword: 'different' },
        fieldErrors: {
          newPassword: '비밀번호는 12자 이상이며 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다.',
          confirmPassword: '비밀번호가 일치하지 않습니다.',
        },
        isCompleted: false,
        isLoading: false,
        error: null,
      },
      'error-503': {
        token: 'visual-qa-token',
        formData: { newPassword: 'VisualQa1!', confirmPassword: 'VisualQa1!' },
        fieldErrors: { newPassword: '', confirmPassword: '' },
        isCompleted: false,
        isLoading: false,
        error: '비밀번호 변경 서비스를 현재 사용할 수 없습니다. 잠시 후 다시 시도해주세요.',
      },
      'long-korean': {
        token: 'visual-qa-token',
        formData: { newPassword: 'VisualQa1!', confirmPassword: 'VisualQa1!' },
        fieldErrors: { newPassword: '', confirmPassword: '' },
        isCompleted: false,
        isLoading: false,
        error: '모바일 화면에서도 비밀번호 변경 오류 안내와 두 입력 영역, 보기 버튼, 조건 목록이 서로 겹치지 않고 자연스럽게 줄바꿈되는지 확인하는 매우 긴 한국어 안내입니다. 링크를 다시 확인한 뒤 잠시 후 재시도해주세요.',
      },
      'unbroken-token': {
        token: 'visual-qa-token',
        formData: { newPassword: 'VisualQa1!', confirmPassword: 'VisualQa1!' },
        fieldErrors: { newPassword: '', confirmPassword: '' },
        isCompleted: false,
        isLoading: false,
        error: `PASSWORD-RESET-CONFIRM-${'UNBROKEN'.repeat(28)}`,
      },
      complete: {
        token: 'visual-qa-token',
        formData: { newPassword: 'VisualQa1!', confirmPassword: 'VisualQa1!' },
        fieldErrors: { newPassword: '', confirmPassword: '' },
        isCompleted: true,
        isLoading: false,
        error: null,
      },
    });
    requireStateValue(context, 'permissions', 'anonymous');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    if (interaction !== 'default') {
      const targets = new Set([
        'back',
        'confirm-password',
        'confirm-visibility',
        'login',
        'new-password',
        'new-visibility',
        'submit',
      ]);
      if (!targets.has(context.interactionTargetId ?? '')) {
        throw new Error(`지원하지 않는 Visual QA password-reset-confirm target: ${context.interactionTargetId ?? '<missing>'}`);
      }
    }
    const visibility = resolveDeclaredVariant(context, 'visibility', {
      hidden: { showNewPassword: false, showConfirmPassword: false },
      'new-visible': { showNewPassword: true, showConfirmPassword: false },
      'confirm-visible': { showNewPassword: false, showConfirmPassword: true },
      'both-visible': { showNewPassword: true, showConfirmPassword: true },
    });
    const isStaticVisibilityState = context.states.data === 'error-400'
      || context.states.data === 'complete';
    if (isStaticVisibilityState && context.variants.visibility !== 'hidden') {
      throw new Error(
        `지원하지 않는 Visual QA password-reset-confirm state: data=${context.states.data}, visibility=${context.variants.visibility}`,
      );
    }
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: {
        visualQaStateOverride: {
          ...dataState,
          ...visibility,
        },
      },
      captureSelector: '[data-testid="auth-shell"]',
      expectedHash: '',
      expectedPathname: '/password/reset/confirm',
      expectedSearch: '?token=visual-qa-token&redirect=%2Fmate',
      initialPathname: '/password/reset/confirm?token=visual-qa-token&redirect=%2Fmate',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-transparent p-0 shadow-none',
      theme,
    };
  },
  'auth.bootstrap-gate': (context) => {
    requireStateValue(context, 'permissions', 'anonymous');
    const bootstrap = resolveDeclaredVariant(context, 'bootstrap-state', {
      'defer-persisted': {
        description: '저장된 세션 힌트를 확인하기 위해 공개 화면 인증 초기화를 예약했습니다.',
        pathname: '/home',
        shouldMount: true,
      },
      'immediate-protected': {
        description: '보호된 화면의 인증 상태를 즉시 초기화합니다.',
        pathname: '/messages/@bega',
        shouldMount: true,
      },
      'injected-profile': {
        description: '테스트 인증 프로필을 적용하기 위해 인증 초기화를 마운트했습니다.',
        pathname: '/home',
        shouldMount: true,
      },
      'skip-backoff': {
        description: '최근 인증 실패의 backoff 계약에 따라 자동 초기화를 건너뜁니다.',
        pathname: '/messages/@bega',
        shouldMount: false,
      },
      'skip-public': {
        description: '저장된 인증 신호가 없는 공개 화면에서는 자동 초기화를 건너뜁니다.',
        pathname: '/home',
        shouldMount: false,
      },
    });
    return {
      props: {
        runtimeOverride: createElement(Fragment),
        shouldMountOverride: bootstrap.shouldMount,
      },
      captureSelector: '[data-testid="auth-bootstrap-gate-outcome"]',
      companion: createElement(
        'div',
        {
          className: 'min-w-0 max-w-full break-words rounded-xl border border-border bg-card p-4 text-center text-sm text-foreground [overflow-wrap:anywhere]',
          'data-testid': 'auth-bootstrap-gate-outcome',
          role: 'status',
        },
        bootstrap.description,
      ),
      expectedHash: '',
      expectedPathname: bootstrap.pathname,
      expectedSearch: '',
      initialPathname: bootstrap.pathname,
      surfaceClassName: 'flex min-h-48 w-[320px] max-w-none items-center overflow-visible bg-background p-4 shadow-none',
    };
  },
  'auth.layout': (context) => {
    const copy = requireStateValueFromMap(context, 'data', authLayoutCopy);
    requireStateValueFromMap(context, 'interactions', {
      default: true,
      'focus-visible': true,
      selected: true,
    });
    const showHomeButton = resolveDeclaredVariant(context, 'homeButton', {
      hidden: false,
      shown: true,
    });
    return {
      props: {
        children: createElement(
          'p',
          { className: 'min-w-0 break-words text-body text-foreground' },
          copy,
        ),
        showHomeButton,
      },
      captureSelector: '[data-testid="auth-shell"]',
      surfaceClassName: 'block min-h-0 w-full overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'auth.oauth-email-challenge-panel': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      'error-503': 'error-503',
      loading: 'loading',
      'long-korean': 'long-korean',
      'null-optional': 'null-optional',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const system = requireStateValueFromMap(context, 'system', {
      offline: 'offline',
      online: 'online',
      timeout: 'timeout',
    });
    const presentation = resolveDeclaredVariant(context, 'presentation', {
      expired: 'EXPIRED',
      'email-required': 'EMAIL_REQUIRED',
      'email-sent': 'EMAIL_SENT',
      verified: 'VERIFIED',
    });
    const reason = resolveDeclaredVariant(context, 'reason', {
      'email-required': 'oauth2_email_required',
      'verification-required': 'oauth2_email_verification_required',
    });
    requireStateValueFromMap(context, 'interactions', {
      default: true,
      'focus-visible': true,
      input: true,
      selected: true,
      submitting: true,
    });

    const sentData = data === 'single'
      || data === 'long-korean'
      || data === 'unbroken-token'
      || data === 'null-optional'
      ? oauthEmailSentData[data]
      : oauthEmailSentData.single;
    let currentChallenge = {
      challengeId: oauthEmailChallengeId,
      status: presentation,
      maskedEmail: presentation === 'EMAIL_SENT' ? sentData.maskedEmail : null,
      expiresAt: presentation === 'EMAIL_SENT' ? sentData.expiresAt : null,
    };
    const pending = () => new Promise<never>(() => {});
    const mutate = async () => {
      if (system === 'offline') {
        throw new Error('네트워크 연결이 끊어졌습니다. 연결을 확인하고 다시 시도해주세요.');
      }
      if (system === 'timeout') return pending();
      currentChallenge = {
        challengeId: oauthEmailChallengeId,
        status: 'EMAIL_SENT',
        maskedEmail: oauthEmailSentData.single.maskedEmail,
        expiresAt: oauthEmailSentData.single.expiresAt,
      };
      return { challengeId: oauthEmailChallengeId, status: 'EMAIL_SENT' };
    };
    const challengeClient = {
      getOAuthEmailChallenge: async () => {
        if (data === 'loading') return pending();
        if (data === 'error-503') {
          throw new Error('503: 이메일 확인 상태 서비스를 사용할 수 없습니다.');
        }
        return currentChallenge;
      },
      resendOAuthEmailChallenge: mutate,
      submitOAuthEmailChallengeEmail: mutate,
    };

    return {
      props: {
        challengeClient,
        challengeId: oauthEmailChallengeId,
        onReturnToLogin: () => {},
        reason,
      },
      captureSelector: '[data-testid="oauth-email-challenge-panel"]',
      surfaceClassName: 'block min-h-0 w-full max-w-[480px] overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'auth.oauth-email-confirm': (context) => {
    const visualQaStateOverride = requireStateValueFromMap(context, 'data', {
      loading: { phase: 'confirming', error: null },
      complete: { phase: 'verified', error: null },
      expired: { phase: 'expired', error: null },
      'error-503': {
        phase: 'error',
        error: '이메일 확인 서비스를 현재 사용할 수 없습니다. 잠시 후 다시 시도해주세요.',
      },
      'long-korean': {
        phase: 'error',
        error: '모바일 화면에서도 이메일 확인 오류 안내와 로그인으로 돌아가기 버튼이 서로 겹치지 않고 자연스럽게 줄바꿈되는지 확인하는 매우 긴 한국어 안내입니다. 링크와 네트워크 상태를 확인한 뒤 다시 시도해주세요.',
      },
      'unbroken-token': {
        phase: 'error',
        error: `OAUTH-EMAIL-CONFIRM-${'UNBROKEN'.repeat(24)}`,
      },
    });
    requireStateValue(context, 'permissions', 'anonymous');
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    const system = requireStateValueFromMap(context, 'system', {
      offline: 'offline',
      online: 'online',
      timeout: 'timeout',
    });
    const data = context.states.data ?? '';
    const expectedSystem = data === 'loading'
      ? 'timeout'
      : data === 'error-503'
        ? 'offline'
        : 'online';
    if (system !== expectedSystem) {
      throw new Error(`지원하지 않는 Visual QA oauth-email-confirm system state: data=${data}, system=${system}`);
    }
    if (data === 'loading' && interaction !== 'default') {
      throw new Error(`지원하지 않는 Visual QA oauth-email-confirm interaction: data=${data}, interactions=${interaction}`);
    }
    if (interaction !== 'default' && context.interactionTargetId !== 'return-login') {
      throw new Error(`지원하지 않는 Visual QA oauth-email-confirm target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: { visualQaStateOverride },
      captureSelector: '[data-testid="auth-shell"]',
      expectedHash: '',
      expectedPathname: '/oauth/email/confirm',
      expectedSearch: '?token=visual-qa-token',
      initialPathname: '/oauth/email/confirm?token=visual-qa-token',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-transparent p-0 shadow-none',
      theme,
    };
  },
  'auth.protected-route': (context) => {
    const permission = requireStateValueFromMap(context, 'permissions', {
      anonymous: 'anonymous',
      user: 'user',
    });
    const authState = resolveDeclaredVariant(context, 'auth-state', {
      'auth-loading': 'auth-loading',
      'bootstrap-pending': 'bootstrap-pending',
      ready: 'ready',
    });
    const declaredStates: Record<string, {
      isAuthLoading: boolean;
      isLoggedIn: boolean;
      shouldAttemptBootstrap: boolean;
    }> = {
      'anonymous:auth-loading': {
        isAuthLoading: true,
        isLoggedIn: false,
        shouldAttemptBootstrap: false,
      },
      'anonymous:bootstrap-pending': {
        isAuthLoading: false,
        isLoggedIn: false,
        shouldAttemptBootstrap: true,
      },
      'anonymous:ready': {
        isAuthLoading: false,
        isLoggedIn: false,
        shouldAttemptBootstrap: false,
      },
      'user:auth-loading': {
        isAuthLoading: true,
        isLoggedIn: true,
        shouldAttemptBootstrap: false,
      },
      'user:ready': {
        isAuthLoading: false,
        isLoggedIn: true,
        shouldAttemptBootstrap: false,
      },
    };
    const stateOverride = declaredStates[`${permission}:${authState}`];
    if (stateOverride === undefined) {
      throw new Error(`지원하지 않는 Visual QA route-guard state: ${permission}:${authState}`);
    }
    const isLoading = !stateOverride.isLoggedIn
      && (stateOverride.isAuthLoading || stateOverride.shouldAttemptBootstrap);
    const isLoginRequired = !stateOverride.isLoggedIn && !isLoading;
    const outletOverride = stateOverride.isLoggedIn
      ? createElement(
        'div',
        {
          className: 'min-w-0 break-words rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-emerald-200 [overflow-wrap:anywhere]',
          'data-testid': 'protected-route-outlet',
          role: 'status',
        },
        stateOverride.isAuthLoading
          ? '인증된 사용자는 백그라운드 인증 확인 중에도 보호된 화면을 유지합니다.'
          : '인증된 사용자에게 보호된 화면이 표시됩니다.',
      )
      : undefined;
    return {
      props: {
        outletOverride,
        spinnerMinDurationMs: 0,
        stateOverride,
      },
      captureSelector: isLoading
        ? '[role="status"]'
        : isLoginRequired
          ? '[data-testid="protected-route-login-required"]'
          : '[data-testid="protected-route-outlet"]',
      expectedHash: '#thread',
      expectedPathname: '/messages/@bega',
      expectedSearch: '?from=protected',
      initialPathname: '/messages/@bega?from=protected#thread',
      semanticHost: 'protected-route',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-slate-950 p-0 shadow-none',
      theme: 'dark',
    };
  },
  'auth.public-only-route': (context) => {
    const permission = requireStateValueFromMap(context, 'permissions', {
      anonymous: 'anonymous',
      user: 'user',
    });
    const authState = resolveDeclaredVariant(context, 'auth-state', {
      'auth-loading': 'auth-loading',
      'login-error': 'login-error',
      ready: 'ready',
      'redirect-fallback': 'redirect-fallback',
      'redirect-pending': 'redirect-pending',
      'redirect-query': 'redirect-query',
    });
    const validStates = new Set([
      'anonymous:auth-loading',
      'anonymous:login-error',
      'anonymous:ready',
      'user:auth-loading',
      'user:login-error',
      'user:redirect-fallback',
      'user:redirect-pending',
      'user:redirect-query',
    ]);
    const stateKey = `${permission}:${authState}`;
    if (!validStates.has(stateKey)) {
      throw new Error(`지원하지 않는 Visual QA route-guard state: ${stateKey}`);
    }
    const isLoggedIn = permission === 'user';
    const isLoading = authState === 'auth-loading';
    const isErrorBypass = authState === 'login-error';
    const isRedirect = authState.startsWith('redirect-');
    const initialPathname = authState === 'redirect-query'
      ? '/login?redirect=%2Fmessages%2F%40bega%3Ffrom%3Dlogin%23thread'
      : isErrorBypass
        ? '/login?error=oauth2_auth_failed'
        : '/login';
    const redirectDestination = authState === 'redirect-query'
      ? { hash: '#thread', pathname: '/messages/@bega', search: '?from=login' }
      : authState === 'redirect-pending'
        ? { hash: '#sessions', pathname: '/mypage', search: '?tab=security' }
        : { hash: '', pathname: '/home', search: '' };
    const authStateOverride = {
      authBootstrapMode: 'immediate',
      isAuthLoading: isLoading,
      isLoggedIn,
      pendingLoginRedirect: authState === 'redirect-pending'
        ? '/mypage?tab=security#sessions'
        : null,
    };
    const outletOverride = !isLoading && !isRedirect
      ? createElement(
        'div',
        {
          className: 'min-w-0 break-words rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-center text-sky-200 [overflow-wrap:anywhere]',
          'data-testid': 'public-only-route-outlet',
          role: 'status',
        },
        isErrorBypass && isLoggedIn
          ? '로그인 오류를 확인할 수 있도록 인증된 세션에서도 로그인 화면을 유지합니다.'
          : isErrorBypass
            ? '로그인 오류가 포함된 공개 인증 화면을 표시합니다.'
            : '로그인하지 않은 사용자에게 공개 인증 화면을 표시합니다.',
      )
      : undefined;
    const companion = isRedirect
      ? createElement(
        'div',
        {
          className: 'min-w-0 break-words rounded-xl border border-slate-700 bg-slate-900 p-4 text-center text-slate-200 [overflow-wrap:anywhere]',
          'data-testid': 'public-only-route-redirect-outcome',
          role: 'status',
        },
        authState === 'redirect-query'
          ? '요청한 로그인 후 경로로 이동했습니다.'
          : authState === 'redirect-pending'
            ? '저장된 로그인 후 경로로 이동했습니다.'
            : '기본 로그인 후 화면으로 이동했습니다.',
      )
      : undefined;
    return {
      props: {
        authStateOverride,
        outletOverride,
        spinnerMinDurationMs: 0,
      },
      captureSelector: isLoading
        ? '[role="status"]'
        : isRedirect
          ? '[data-testid="public-only-route-redirect-outcome"]'
          : '[data-testid="public-only-route-outlet"]',
      companion,
      expectedHash: isRedirect ? redirectDestination.hash : '',
      expectedPathname: isRedirect ? redirectDestination.pathname : '/login',
      expectedSearch: isRedirect
        ? redirectDestination.search
        : isErrorBypass
          ? '?error=oauth2_auth_failed'
          : '',
      initialPathname,
      semanticHost: 'public-only-auth-route',
      surfaceClassName: 'flex min-h-[844px] w-[320px] max-w-none items-center overflow-visible bg-slate-950 p-4 shadow-none',
      theme: 'dark',
    };
  },
  'auth.session-boundary': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      single: '인증 세션 경계 안의 앱 콘텐츠입니다.',
      'long-korean': '인증 세션 경계 안에 있는 매우 긴 앱 콘텐츠 안내 문구도 모바일 화면의 가로 폭을 밀어내지 않고 자연스럽게 여러 줄로 표시되어야 합니다.',
      'unbroken-token': `AUTH-SESSION-CHILD-${'UNBROKEN'.repeat(30)}`,
    });
    const permission = requireStateValueFromMap(context, 'permissions', {
      anonymous: 'anonymous',
      user: 'user',
    });
    const dialog = resolveDeclaredVariant(context, 'dialog', {
      closed: 'closed',
      open: 'open',
    });
    if ((permission === 'user' && dialog === 'open')
      || (dialog === 'open' && context.states.data !== 'single')) {
      throw new Error(
        `지원하지 않는 Visual QA auth-session state: ${permission}:${context.states.data}:${dialog}`,
      );
    }
    const isOpen = dialog === 'open';
    return {
      props: {
        children: createElement(
          'main',
          {
            className: 'flex min-h-[844px] w-[320px] min-w-0 items-center justify-center bg-background p-4 text-foreground',
            'data-testid': 'auth-session-boundary-child',
          },
          createElement(
            'div',
            { className: 'min-w-0 max-w-full break-words rounded-2xl border border-border bg-card p-5 text-center [overflow-wrap:anywhere]' },
            data,
          ),
        ),
        stateOverride: {
          pendingLoginRedirect: isOpen ? '/messages/@bega?from=session#thread' : null,
          showLoginRequiredDialog: isOpen,
        },
      },
      captureSelector: isOpen
        ? '[data-testid="prediction-login-required-dialog"]'
        : '[data-testid="auth-session-boundary-child"]',
      initialPathname: '/messages/@bega?from=session#thread',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-background p-0 shadow-none',
    };
  },
  'auth.sign-up-status-panel': (context) => {
    const outcome = resolveDeclaredVariant(context, 'outcome', {
      error: 'error',
      idle: 'idle',
      success: 'success',
    });
    if (outcome === 'error') {
      return {
        props: {
          error: requireStateValueFromMap(context, 'data', signUpStatusErrorCopy),
          isSuccess: false,
        },
        captureSelector: '[data-slot="auth-status-panel"]',
        surfaceClassName: 'block min-h-0 w-full max-w-[480px] overflow-visible bg-transparent p-0 shadow-none',
      };
    }
    requireStateValue(context, 'data', 'single');
    return {
      props: {
        error: null,
        isSuccess: outcome === 'success',
      },
      captureSelector: outcome === 'idle'
        ? '[data-vqa-harness-surface]'
        : '[data-slot="auth-status-panel"]',
      surfaceClassName: 'block min-h-0 w-full max-w-[480px] overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'common.coach-markdown': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: '',
      'long-korean': '## 경기 운영 안내\n\n모바일 화면에서도 문단과 목록이 자연스럽게 이어지는지 확인하기 위한 충분히 긴 한국어 설명입니다.\n\n- 첫 번째 확인 항목\n- 두 번째 확인 항목',
      'maximum-supported': '## 종합 안내\n\n| 구분 | 값 |\n| --- | --- |\n| 상태 | 정상 |\n| 다음 행동 | 계속 진행 |\n\n> 중요한 안내입니다.\n\n1. 첫 번째\n2. 두 번째\n\n[도움말](https://example.invalid/help)과 `inline code`를 함께 표시합니다.',
      single: '간단한 **공통 안내**입니다.',
      'unbroken-token': `MARKDOWN-${'X'.repeat(240)}`,
    });
    const format = resolveDeclaredVariant(context, 'format', {
      paragraph: 'paragraph',
      'rich-gfm': 'rich-gfm',
    });
    return {
      props: {
        children: format === 'paragraph' && data
          ? data.replace(/^##?\s+/gm, '').replace(/^[-\d.]+\s+/gm, '')
          : data,
        className: 'vqa-coach-markdown min-w-0 break-words',
      },
      captureSelector: data ? '.vqa-coach-markdown' : '[data-vqa-harness-surface]',
      surfaceClassName: 'block min-h-0 w-full max-w-[480px] overflow-visible bg-transparent p-4 shadow-none',
    };
  },
  'common.empty-state': (context) => {
    const copy = requireStateValueFromMap(context, 'data', commonCopy);
    requireStateValueFromMap(context, 'interactions', {
      default: true,
      'focus-visible': true,
      selected: true,
    });
    return {
      props: {
        action: resolveDeclaredVariant(context, 'action', {
          missing: undefined,
          present: createElement(
            'button',
            {
              className: 'min-h-11 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'data-testid': 'common-empty-state-action',
              onClick: () => {},
              type: 'button',
            },
            '다시 확인',
          ),
        }),
        description: resolveDeclaredVariant(context, 'description', {
          missing: undefined,
          present: copy.description,
        }),
        icon: resolveDeclaredVariant(context, 'icon', {
          missing: undefined,
          present: createElement('span', { 'aria-hidden': true, className: 'text-2xl font-black' }, '!'),
        }),
        testId: 'common-empty-state',
        title: copy.title,
        tone: resolveDeclaredVariant(context, 'tone', {
          danger: 'danger',
          neutral: 'neutral',
          warning: 'warning',
        }),
      },
      captureSelector: '[data-testid="common-empty-state"]',
      surfaceClassName: 'block min-h-0 w-full max-w-[480px] overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'common.error-boundary': (context) => {
    const message = requireStateValueFromMap(context, 'data', {
      'long-korean': '모바일 화면에서 오류 경계의 긴 진단 문구와 복구 표면을 확인하기 위한 테스트 오류입니다.',
      single: 'Visual QA boundary error',
      'unbroken-token': `BOUNDARY-${'X'.repeat(180)}`,
    });
    const outcome = resolveDeclaredVariant(context, 'outcome', {
      content: 'content',
      'custom-fallback': 'custom-fallback',
      'default-fallback': 'default-fallback',
    });
    if (outcome === 'content') {
      return {
        props: {
          children: createElement('p', { 'data-testid': 'error-boundary-content' }, message),
        },
        captureSelector: '[data-testid="error-boundary-content"]',
      };
    }
    return {
      props: {
        children: createElement(VisualQaThrowingState, { message }),
        fallback: outcome === 'custom-fallback'
          ? createElement(
            'div',
            {
              className: 'max-w-sm rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800',
              'data-testid': 'error-boundary-custom-fallback',
            },
            '사용자 지정 오류 화면',
          )
          : undefined,
      },
      captureSelector: outcome === 'custom-fallback'
        ? '[data-testid="error-boundary-custom-fallback"]'
        : '[data-vqa-harness-surface]',
      surfaceClassName: 'block min-h-0 w-full overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'common.error-boundary-fallback': (context) => ({
    props: {
      errorId: requireStateValueFromMap(context, 'data', {
        'long-korean': '오류-식별자-모바일-장문-상태-2026-08-23',
        'null-optional': undefined,
        single: 'error-1234',
        'unbroken-token': `ERROR-ID-${'X'.repeat(180)}`,
      }),
      onRetry: () => {},
    },
    captureSelector: '[data-vqa-harness-surface]',
    surfaceClassName: 'block min-h-0 w-full overflow-visible bg-transparent p-0 shadow-none',
  }),
  'common.error-feedback-panel': (context) => ({
    props: {
      errorId: requireStateValueFromMap(context, 'data', {
        'long-korean': '오류-식별자-모바일-장문-상태-2026-08-23',
        'null-optional': undefined,
        single: 'error-1234',
        'unbroken-token': `ERROR-FEEDBACK-${'X'.repeat(180)}`,
      }),
      onReload: resolveDeclaredVariant(context, 'reloadAction', {
        missing: null,
        present: () => {},
      }),
      onRetry: resolveDeclaredVariant(context, 'retryAction', {
        missing: undefined,
        present: () => {},
      }),
      source: resolveDeclaredVariant(context, 'source', {
        api: 'api',
        runtime: 'runtime',
        'unhandled-rejection': 'unhandled_rejection',
      }),
      submitFeedback: requireStateValueFromMap(context, 'system', {
        offline: async (): Promise<boolean> => false,
        online: async (): Promise<boolean> => true,
        timeout: (): Promise<boolean> => new Promise<boolean>(() => {}),
      }),
    },
    captureSelector: '[data-testid="error-feedback"]',
    surfaceClassName: 'block min-h-0 w-full max-w-[480px] overflow-visible bg-transparent p-0 shadow-none',
  }),
  'common.lazy-emoji-picker': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      populated: 'populated',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const group = resolveDeclaredVariant(context, 'group', {
      baseball: 'baseball',
      faces: 'faces',
      fun: 'fun',
      reactions: 'reactions',
      recent: 'recent',
    });
    const size = resolveDeclaredVariant(context, 'size', {
      default: { height: 400, width: 300 },
      'minimum-input': { height: 40, width: 40 },
      'oversized-input': { height: 4096, width: 4096 },
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      input: 'input',
      pressed: 'pressed',
      selected: 'selected',
    });

    const isSearchState = ['empty', 'long-korean', 'single', 'unbroken-token'].includes(data);
    if (
      (data === 'maximum-supported' && group !== 'recent')
      || (data === 'populated' && group === 'recent')
      || (isSearchState && group !== 'baseball')
    ) {
      throw new Error(`지원하지 않는 Visual QA variant combination: data=${data}, group=${group}`);
    }

    const recentEmojis = [
      '⚾', '🏟️', '📣', '🔥', '👏', '🙌', '💪', '🏆', '🎯',
      '🚀', '⭐', '🥎', '🎉', '🎊', '🥇', '📢', '😀', '😆',
    ];
    const query = {
      empty: '검색결과없음',
      'long-korean': '이 검색어는 결과 없이 매우 길게 이어져도 모바일 검색 입력 안에서 안전하게 유지됩니다',
      'maximum-supported': '',
      populated: '',
      single: 'baseball',
      'unbroken-token': `EMOJI-SEARCH-${'UNBROKEN'.repeat(18)}`,
    }[data];
    const availableGroups = data === 'maximum-supported'
      ? ['recent', 'baseball', 'faces', 'reactions', 'fun']
      : ['baseball', 'faces', 'reactions', 'fun'];
    const emojiCount = data === 'maximum-supported' ? 18 : data === 'populated' ? 16 : data === 'single' ? 1 : 0;
    const targetId = context.interactionTargetId;
    const groupTarget = targetId?.match(/^group-(recent|baseball|faces|reactions|fun)$/)?.[1];
    const emojiTargetIndex = Number(targetId?.match(/^emoji-(\d+)$/)?.[1]);
    const targetIsValid = interaction === 'default'
      ? targetId === undefined
      : interaction === 'input'
        ? targetId === 'search'
        : targetId === 'search'
          ? ['focus-visible', 'hover'].includes(interaction)
          : groupTarget
            ? availableGroups.includes(groupTarget)
            : Number.isInteger(emojiTargetIndex) && emojiTargetIndex >= 0 && emojiTargetIndex < emojiCount;
    if (!targetIsValid) {
      throw new Error(`지원하지 않는 Visual QA interaction target: ${targetId ?? '<missing>'}`);
    }

    return {
      props: {
        height: size.height,
        isDarkMode: theme === 'dark',
        onEmojiSelect: () => {},
        visualQaStateOverride: {
          activeGroupId: group,
          query,
          recentEmojis: data === 'maximum-supported' ? recentEmojis : [],
        },
        width: size.width,
      },
      captureSelector: '[data-testid="lazy-emoji-picker"]',
      surfaceClassName: 'block min-h-0 w-full overflow-visible bg-transparent p-4 shadow-none',
      theme,
    };
  },
  'common.optimized-image': (context) => {
    const src = requireStateValueFromMap(context, 'data', {
      'broken-image': brokenVisualQaImage,
      populated: validVisualQaImage,
    });
    const dimensions = resolveDeclaredVariant(context, 'dimensions', {
      landscape: { height: 180, width: 320 },
      square: { height: 256, width: 256 },
    });
    const webp = resolveDeclaredVariant(context, 'webp', {
      missing: undefined,
      present: src,
    });
    return {
      props: {
        alt: 'Visual QA image',
        className: 'vqa-optimized-image max-w-full rounded-xl',
        priority: resolveDeclaredVariant(context, 'priority', {
          eager: true,
          lazy: false,
        }),
        src,
        webpSrc: webp,
        ...dimensions,
      },
      captureSelector: '.vqa-optimized-image',
    };
  },
  'common.profile-image': (context) => ({
    props: {
      ...requireStateValueFromMap(context, 'data', {
        'broken-image': { src: brokenVisualQaImage, username: '베가' },
        'missing-image': { src: undefined, username: '베가' },
        'null-optional': { src: null, username: undefined },
        populated: { src: validVisualQaImage, username: '베가' },
      }),
      alt: '베가 프로필',
      className: 'vqa-profile-image ring-1 ring-border',
      size: resolveDeclaredVariant(context, 'size', {
        lg: 'lg',
        md: 'md',
        sm: 'sm',
        xl: 'xl',
        xs: 'xs',
      }),
    },
    captureSelector: '.vqa-profile-image',
  }),
  'common.qr-code': (context) => ({
    props: {
      ...resolveDeclaredVariant(context, 'palette', {
        brand: { bgColor: '#ecfdf5', fgColor: '#1f5c4a' },
        default: { bgColor: '#ffffff', fgColor: '#000000' },
        inverse: { bgColor: '#111827', fgColor: '#ffffff' },
      }),
      className: 'vqa-qr-code max-w-full',
      level: resolveDeclaredVariant(context, 'level', {
        H: 'H',
        L: 'L',
        M: 'M',
        Q: 'Q',
      }),
      size: resolveDeclaredVariant(context, 'size', {
        large: 320,
        small: 96,
        touch: 256,
      }),
      value: requireStateValueFromMap(context, 'data', {
        'long-latin': `https://begabaseball.example/visual-qa/${'segment-'.repeat(16)}`,
        'maximum-supported': `MAX-${'M'.repeat(900)}`,
        single: 'BEGA',
        'unbroken-token': `QR-${'X'.repeat(180)}`,
      }),
    },
    captureSelector: '.vqa-qr-code',
  }),
  'figma.image-with-fallback': (context) => ({
    props: {
      alt: resolveDeclaredVariant(context, 'alt', {
        empty: '',
        'long-korean': '모바일 화면에서도 이미지의 목적을 충분히 설명하는 긴 한국어 대체 문구',
        single: 'Visual QA image',
      }),
      className: 'vqa-figma-image max-w-full rounded-xl',
      src: requireStateValueFromMap(context, 'data', {
        'broken-image': brokenVisualQaImage,
        populated: validVisualQaImage,
      }),
      style: resolveDeclaredVariant(context, 'dimensions', {
        landscape: { height: 180, width: 320 },
        square: { height: 256, width: 256 },
      }),
    },
    captureSelector: '.vqa-figma-image',
  }),
  'cheer-feed.empty': (context) => {
    requireStateValue(context, 'data', 'empty');
    return {
      props: {
        feedTab: resolveDeclaredVariant(context, 'feedTab', {
          all: 'all',
          popular: 'popular',
          following: 'following',
        }),
        teamColor: resolveDeclaredVariant(context, 'teamId', franchiseTeamColors),
        onWriteClick: () => {},
      },
    };
  },
  'cheer-feed.error': (context) => {
    requireStateValue(context, 'data', 'error-503');
    return { props: { onRetry: () => {} } };
  },
  'cheer-feed.login-required': (context) => {
    requireStateValue(context, 'permissions', 'anonymous');
    return {
      props: {
        teamColor: resolveDeclaredVariant(context, 'teamId', franchiseTeamColors),
        onRequireLogin: () => {},
      },
    };
  },
  'leaderboard-page': (context) => {
    const phase = resolveDeclaredVariant(context, 'phase', {
      fallback: 'fallback',
      resolved: 'resolved',
    });
    return {
      props: {
        runtimeLoader: phase === 'fallback'
          ? () => new Promise<never>(() => {})
          : undefined,
      },
      captureSelector: phase === 'fallback'
        ? '[data-testid="leaderboard-page-loading-fallback"]'
        : '[data-vqa-harness-surface]',
      surfaceClassName: 'block min-h-0 w-full overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'leaderboard-page-runtime': (context) => {
    const authPhase = resolveLeaderboardRuntimeAuth(context);
    return {
      props: {
        authStateOverride: {
          currentUserHandle: authPhase === 'public' ? undefined : 'visualqa-user',
          isAuthLoading: authPhase === 'auth-loading',
          isLoggedIn: authPhase !== 'public',
        },
        deferFooter: false,
        authenticatedRuntimeLoader: authPhase === 'authenticated-fallback'
          ? () => new Promise<never>(() => {})
          : undefined,
        authenticatedStateOverride: {
          activePowerups: ['MAGIC_BAT'],
          onUsePowerup: async () => {},
          powerups: {
            GOLDEN_GLOVE: 1,
            MAGIC_BAT: 2,
            SCOUTER: 0,
          },
          stats: {
            accuracy: 91.7,
            correctPredictions: 110,
            currentStreak: 12,
            experiencePoints: 8700,
            handle: 'visualqa-user',
            level: 31,
            maxStreak: 25,
            monthlyScore: 543210,
            nextLevelExp: 10000,
            profileImageUrl: context.states.data === 'broken-image'
              ? 'data:image/png;base64,bm90LXZhbGlk'
              : undefined,
            rank: 1,
            rankTitle: 'HALL_OF_FAME',
            seasonScore: 987654,
            totalPredictions: 120,
            totalScore: 987654,
            userName: '비주얼 QA',
            weeklyScore: 123456,
          },
        },
        leaderboardStateOverride: resolveLeaderboardRuntimeData(context),
      },
      captureSelector: '[data-testid="leaderboard-page-runtime"]',
      surfaceClassName: 'block min-h-0 w-full overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'loading.no-props': () => ({ props: {} }),
  'loading.spinner': (context) => ({
    props: {
      ...resolveLoadingSpinnerCopy(context),
      size: resolveDeclaredVariant(context, 'size', {
        sm: 'sm',
        md: 'md',
        lg: 'lg',
      }),
      variant: resolveDeclaredVariant(context, 'variant', {
        app: 'app',
        auth: 'auth',
        inline: 'inline',
      }),
      fullScreen: resolveDeclaredVariant(context, 'fullScreen', {
        false: false,
        true: true,
      }),
      minDurationMs: resolveDeclaredVariant(context, 'delay', {
        delayed: 60,
        immediate: 0,
      }),
      showTagline: resolveDeclaredVariant(context, 'showTagline', {
        false: false,
        true: true,
      }),
      className: resolveDeclaredVariant(context, 'hostClass', {
        default: '',
        transition: 'transition-colors duration-200',
      }),
    },
    surfaceClassName: 'block min-h-0 w-full overflow-visible p-0',
  }),
  'login-required.dialog': (context) => {
    requireStateValue(context, 'permissions', 'anonymous');
    return {
      props: {
        open: true,
        onOpenChange: () => {},
        onCancel: () => {},
        redirectPath: '/prediction',
      },
      captureSelector: '[data-testid="prediction-login-required-dialog"]',
    };
  },
  'mypage.season-empty': (context) => {
    const content = resolveMyPageSeasonEmptyContent(context);
    const actionPresent = resolveDeclaredVariant(context, 'action', {
      missing: false,
      present: true,
    });
    const descriptionPresent = resolveDeclaredVariant(context, 'description', {
      missing: false,
      present: true,
    });
    const iconPresent = resolveDeclaredVariant(context, 'icon', {
      missing: false,
      present: true,
    });
    return {
      props: {
        title: content.title,
        description: descriptionPresent ? content.description : undefined,
        actionLabel: actionPresent ? content.actionLabel : undefined,
        onAction: actionPresent ? () => {} : undefined,
        icon: iconPresent ? createElement(MyPageTicketIcon) : undefined,
        className: resolveDeclaredVariant(context, 'layout', {
          compact: 'is-compact',
          default: '',
          flush: 'mypage-season-empty--flush',
        }),
        tone: resolveDeclaredVariant(context, 'tone', {
          danger: 'danger',
          default: 'default',
        }),
      },
    };
  },
  'notice.page': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      loading: 'loading',
      single: 'single',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const visualQaStateOverride = data === 'loading'
      ? { phase: 'fallback' as const }
      : {
        phase: 'runtime' as const,
        runtime: {
          phase: 'resolved' as const,
          posts: visualQaNoticePosts.single,
          userRole: undefined,
        },
      };
    return {
      props: { visualQaStateOverride },
      captureSelector: data === 'loading'
        ? '[data-testid="notice-page-fallback"]'
        : '[data-testid="notice-page-runtime"]',
      expectedHash: '',
      expectedPathname: '/notice',
      expectedSearch: '',
      initialPathname: '/notice',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-transparent p-0 shadow-none',
      theme,
    };
  },
  'notice.runtime': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'error-503': 'error-503',
      loading: 'loading',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const userRole = requireStateValueFromMap(context, 'permissions', {
      admin: 'ROLE_ADMIN',
      anonymous: undefined,
      'super-admin': 'ROLE_SUPER_ADMIN',
      user: 'ROLE_USER',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
      selected: 'selected',
    });
    const system = requireStateValueFromMap(context, 'system', {
      offline: 'offline',
      online: 'online',
      timeout: 'timeout',
    });
    const expectedSystem = data === 'loading'
      ? 'timeout'
      : data === 'error-503'
        ? 'offline'
        : 'online';
    if (system !== expectedSystem) {
      throw new Error(`지원하지 않는 Visual QA notice system state: data=${data}, system=${system}`);
    }

    const resolvedData = new Set([
      'empty',
      'long-korean',
      'maximum-supported',
      'single',
      'unbroken-token',
    ]).has(data);
    const postData = new Set([
      'long-korean',
      'maximum-supported',
      'single',
      'unbroken-token',
    ]).has(data);
    const isPrivileged = userRole === 'ROLE_ADMIN' || userRole === 'ROLE_SUPER_ADMIN';
    const allowedTargets = new Set<string>();
    if (data !== 'loading') allowedTargets.add('refresh');
    if (isPrivileged) allowedTargets.add('write');
    if (data === 'maximum-supported') {
      allowedTargets.add('post-page-2-first');
    } else if (postData) {
      allowedTargets.add('post-first');
    }
    if (data === 'maximum-supported') {
      ['previous', 'page-1', 'page-2', 'page-3', 'next'].forEach((target) => allowedTargets.add(target));
    }
    if (interaction === 'selected') {
      if (data !== 'maximum-supported' || context.interactionTargetId !== 'select-page-3') {
        throw new Error(`지원하지 않는 Visual QA notice selected target: ${context.interactionTargetId ?? '<missing>'}`);
      }
    } else if (interaction !== 'default' && !allowedTargets.has(context.interactionTargetId ?? '')) {
      throw new Error(`지원하지 않는 Visual QA notice interaction target: ${context.interactionTargetId ?? '<missing>'}`);
    }

    const visualQaStateOverride = data === 'loading'
      ? { phase: 'loading' as const, userRole }
      : data === 'error-503'
        ? { phase: 'error' as const, userRole }
        : {
          currentPage: data === 'maximum-supported' ? 2 : 1,
          phase: 'resolved' as const,
          posts: visualQaNoticePosts[data as keyof typeof visualQaNoticePosts],
          userRole,
        };
    if (resolvedData && visualQaStateOverride.phase !== 'resolved') {
      throw new Error(`Visual QA notice resolved fixture is missing: ${data}`);
    }
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: { visualQaStateOverride },
      captureSelector: '[data-testid="notice-page-runtime"]',
      expectedHash: '',
      expectedPathname: '/notice',
      expectedSearch: '',
      initialPathname: '/notice',
      surfaceClassName: 'block min-h-[844px] w-[320px] max-w-none overflow-visible bg-transparent p-0 shadow-none',
      theme,
    };
  },
  'offseason.home.page': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      loading: 'loading',
      single: 'single',
    });
    const theme = resolveVisualQaOffseasonTheme(context);
    return {
      props: {
        visualQaStateOverride: data === 'loading'
          ? { phase: 'fallback' as const }
          : {
            phase: 'runtime' as const,
            runtime: {
              currentTime: '2026-02-26T00:00:00.000Z',
              data: {
                movements: visualQaOffseasonMovements.single,
                awards: [makeVisualQaAward(1)],
                rankings: [makeVisualQaRanking(1)],
              },
              isLargeScreen: false,
              phase: 'resolved' as const,
            },
          },
      },
      captureSelector: data === 'loading'
        ? '[data-testid="offseason-home-page-fallback"]'
        : '[data-testid="offseason-home-runtime"]',
      expectedHash: '',
      expectedPathname: '/offseason',
      expectedSearch: '',
      initialPathname: '/offseason',
      surfaceClassName: offseasonMobileSurface,
      theme,
    };
  },
  'offseason.home': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      loading: 'loading',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const system = requireStateValueFromMap(context, 'system', {
      offline: 'offline',
      online: 'online',
      timeout: 'timeout',
    });
    const validSystem = data === 'loading'
      ? system === 'timeout'
      : data === 'empty'
        ? system === 'online' || system === 'offline'
        : system === 'online';
    if (!validSystem) {
      throw new Error(`지원하지 않는 Visual QA offseason home system state: data=${data}, system=${system}`);
    }
    requireOffseasonInteraction(context, ['home-back', 'list-link']);
    const isMobile = resolveVisualQaOffseasonLayout(context);
    const currentTime = resolveDeclaredVariant(context, 'openingState', {
      started: '2026-08-27T00:00:00.000Z',
      upcoming: '2026-02-26T00:00:00.000Z',
    });
    return {
      props: {
        visualQaStateOverride: data === 'loading'
          ? {
            currentTime,
            isLargeScreen: !isMobile,
            phase: 'loading' as const,
          }
          : {
            currentTime,
            data: visualQaOffseasonHomeData(context),
            isLargeScreen: !isMobile,
            phase: 'resolved' as const,
          },
      },
      captureSelector: '[data-testid="offseason-home-runtime"]',
      expectedHash: '',
      expectedPathname: '/offseason',
      expectedSearch: '',
      initialPathname: '/offseason',
      surfaceClassName: offseasonMobileSurface,
      theme: resolveVisualQaOffseasonTheme(context),
    };
  },
  'offseason.home.primary': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      loading: 'loading',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    requireOffseasonInteraction(context, ['home-back', 'list-link']);
    const isMobile = resolveVisualQaOffseasonLayout(context);
    const openingState = resolveDeclaredVariant(context, 'openingState', {
      started: 'started',
      upcoming: 'upcoming',
    });
    const homeData = visualQaOffseasonHomeData(context);
    return {
      props: {
        awards: homeData.awards,
        bigEvents: homeData.movements.filter((movement) => movement.isBigEvent).slice(0, 4),
        daysUntilOpening: openingState === 'started' ? -152 : 30,
        formatRemarks: (value: string) => value,
        getTeamName: (value: string) => value,
        isLargeScreen: !isMobile,
        isLoading: data === 'loading',
        movementsCount: homeData.movements.length,
        onNavigateHome: () => {},
        onNavigateList: () => {},
        rankings: homeData.rankings,
        statusDateLabel: data === 'unbroken-token'
          ? `VISUAL-QA-DATE-${'UNBROKEN'.repeat(14)}`
          : '2026. 8. 27.',
      },
      captureSelector: '[data-testid="offseason-home-primary-runtime"]',
      surfaceClassName: offseasonMobileSurface,
      theme: resolveVisualQaOffseasonTheme(context),
    };
  },
  'offseason.home.news': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      loading: 'loading',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    requireOffseasonInteraction(context, ['list-link']);
    const movements = data === 'loading' ? [] : resolveVisualQaOffseasonMovements(context);
    return {
      props: {
        bigEvents: movements.filter((movement) => movement.isBigEvent).slice(0, 4),
        formatRemarks: (value: string) => value,
        getTeamName: (value: string) => value,
        isLoading: data === 'loading',
        movementsCount: movements.length,
        onNavigateList: () => {},
      },
      captureSelector: '[data-testid="offseason-home-news-runtime"]',
      surfaceClassName: offseasonMobileSurface,
      theme: resolveVisualQaOffseasonTheme(context),
    };
  },
  'offseason.home.highlights': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const homeData = visualQaOffseasonHomeData(context);
    const isMobile = resolveVisualQaOffseasonLayout(context);
    return {
      props: {
        awards: homeData.awards,
        isLargeScreen: !isMobile,
        rankings: homeData.rankings,
      },
      captureSelector: '[data-testid="offseason-home-highlights-runtime"]',
      surfaceClassName: offseasonMobileSurface,
      theme: resolveVisualQaOffseasonTheme(context),
    };
  },
  'offseason.list.page': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      loading: 'loading',
      single: 'single',
    });
    const theme = resolveVisualQaOffseasonTheme(context);
    return {
      props: {
        visualQaStateOverride: data === 'loading'
          ? { phase: 'fallback' as const }
          : {
            phase: 'runtime' as const,
            runtime: {
              isFetching: false,
              isMobile: true,
              movements: visualQaOffseasonMovements.single,
              phase: 'resolved' as const,
            },
          },
      },
      captureSelector: data === 'loading'
        ? '[data-testid="offseason-list-page-fallback"]'
        : '[data-testid="offseason-list-runtime"]',
      expectedHash: '',
      expectedPathname: '/offseason/list',
      expectedSearch: '',
      initialPathname: '/offseason/list',
      surfaceClassName: offseasonMobileSurface,
      theme,
    };
  },
  'offseason.list': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'error-503': 'error-503',
      loading: 'loading',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const system = requireStateValueFromMap(context, 'system', {
      offline: 'offline',
      online: 'online',
      timeout: 'timeout',
    });
    const expectedSystem = data === 'loading'
      ? 'timeout'
      : data === 'error-503'
        ? 'offline'
        : 'online';
    if (system !== expectedSystem) {
      throw new Error(`지원하지 않는 Visual QA offseason list system state: data=${data}, system=${system}`);
    }
    requireOffseasonInteraction(
      context,
      [
        'back',
        'search',
        'team-filter',
        'sort-latest',
        'sort-amount',
        'sort-headline',
        'section-all',
        'section-fa',
        'section-trade',
        'section-foreign',
        'section-release',
        'section-military',
        'big-only',
        'reset',
      ],
      ['default', 'hover', 'focus-visible', 'pressed', 'input', 'selected'],
    );
    const isMobile = resolveVisualQaOffseasonLayout(context);
    const baseOverride = {
      isFetching: false,
      isMobile,
    };
    const visualQaStateOverride = data === 'loading'
      ? { ...baseOverride, phase: 'loading' as const }
      : data === 'error-503'
        ? { ...baseOverride, error: resolveOffseasonError(context), phase: 'error' as const }
        : {
          ...baseOverride,
          movements: resolveVisualQaOffseasonMovements(context),
          phase: 'resolved' as const,
        };
    return {
      props: { visualQaStateOverride },
      captureSelector: '[data-testid="offseason-list-runtime"]',
      expectedHash: '',
      expectedPathname: '/offseason/list',
      expectedSearch: '',
      initialPathname: '/offseason/list',
      surfaceClassName: offseasonMobileSurface,
      theme: resolveVisualQaOffseasonTheme(context),
    };
  },
  'offseason.list.content': (context) => {
    const data = requireStateValueFromMap(context, 'data', {
      empty: 'empty',
      'error-503': 'error-503',
      loading: 'loading',
      'long-korean': 'long-korean',
      'maximum-supported': 'maximum-supported',
      single: 'single',
      'unbroken-token': 'unbroken-token',
    });
    const system = requireStateValueFromMap(context, 'system', {
      offline: 'offline',
      online: 'online',
      timeout: 'timeout',
    });
    const expectedSystem = data === 'loading'
      ? 'timeout'
      : data === 'error-503'
        ? 'offline'
        : 'online';
    if (system !== expectedSystem) {
      throw new Error(`지원하지 않는 Visual QA offseason list content system state: data=${data}, system=${system}`);
    }
    const hasActiveFilters = resolveDeclaredVariant(context, 'activeFilters', {
      absent: false,
      present: true,
    });
    const isMobile = resolveVisualQaOffseasonLayout(context);
    const interactionTargets = data === 'error-503'
      ? ['retry']
      : data === 'empty' && hasActiveFilters
        ? ['reset']
        : ['movement-first'];
    requireOffseasonInteraction(context, interactionTargets, ['default', 'hover', 'focus-visible', 'pressed', 'open']);
    return {
      props: {
        bigOnly: hasActiveFilters,
        error: data === 'error-503' ? resolveOffseasonError(context) : undefined,
        filteredList: new Set(['loading', 'error-503', 'empty']).has(data)
          ? []
          : resolveVisualQaOffseasonMovements(context),
        hasActiveFilters,
        hasSearchTerm: hasActiveFilters,
        isError: data === 'error-503',
        isLoading: data === 'loading',
        isMobile,
        onReset: () => {},
        onRetry: () => {},
        onSortChange: () => {},
        sortOrder: 'latest',
      },
      captureSelector: '[data-testid="offseason-list-content-runtime"]',
      surfaceClassName: offseasonMobileSurface,
      theme: resolveVisualQaOffseasonTheme(context),
    };
  },
  'offseason.list.desktop-table': (context) => {
    const movements = resolveVisualQaOffseasonMovements(context);
    const sortOrder = resolveDeclaredVariant(context, 'sortOrder', {
      amount: 'amount',
      headline: 'headline',
      latest: 'latest',
    });
    requireOffseasonInteraction(context, ['movement-first', 'sort-amount', 'sort-latest'], ['default', 'hover', 'focus-visible', 'pressed', 'selected']);
    return {
      props: {
        movements,
        onSelect: () => {},
        onSortChange: () => {},
        sortOrder,
      },
      captureSelector: '[data-testid="offseason-desktop-table"]',
      surfaceClassName: 'block min-h-[640px] w-[1024px] max-w-none overflow-visible bg-transparent p-0 shadow-none',
      theme: resolveVisualQaOffseasonTheme(context),
    };
  },
  'offseason.list.mobile-cards': (context) => {
    const movements = resolveVisualQaOffseasonMovements(context);
    requireOffseasonInteraction(context, ['movement-first'], ['default', 'hover', 'focus-visible', 'pressed', 'open']);
    return {
      props: { movements, onSelect: () => {} },
      captureSelector: '[data-testid="offseason-mobile-cards"]',
      surfaceClassName: offseasonMobileSurface,
      theme: resolveVisualQaOffseasonTheme(context),
    };
  },
  'offseason.list.insights': (context) => {
    const movements = resolveVisualQaOffseasonMovements(context);
    requireOffseasonInteraction(context, movements.length > 0 ? ['headline-first'] : []);
    return {
      props: { movements, onSelect: () => {} },
      captureSelector: '[data-testid="offseason-insights-panel"]',
      surfaceClassName: offseasonMobileSurface,
      theme: resolveVisualQaOffseasonTheme(context),
    };
  },
  'offseason.list.detail': (context) => {
    const movement = resolveVisualQaOffseasonMovements(context)[0];
    requireOffseasonInteraction(context, ['close', 'source-link']);
    const details = resolveDeclaredVariant(context, 'details', {
      complete: movement,
      minimal: {
        ...movement,
        announcedAt: null,
        contractTerm: null,
        contractValue: null,
        counterpartyDetails: null,
        counterpartyTeam: null,
        optionDetails: null,
        sourceLabel: null,
        sourceUrl: null,
      },
    });
    return {
      props: {
        isMobile: resolveVisualQaOffseasonLayout(context),
        movement: details,
        onOpenChange: () => {},
        open: true,
      },
      captureSelector: '[data-testid="offseason-movement-detail"]',
      surfaceClassName: offseasonMobileSurface,
      theme: resolveVisualQaOffseasonTheme(context),
    };
  },
  'offseason.pill': (context) => ({
    props: {
      children: requireStateValueFromMap(context, 'data', {
        'long-korean': '모바일 화면에서 여러 줄로 표시되어야 하는 매우 긴 Visual QA 배지 문구',
        single: 'Visual QA 배지',
        'unbroken-token': `VISUAL-QA-${'UNBROKEN'.repeat(20)}`,
      }),
      className: 'border border-primary/20 bg-primary/10 px-3 py-1 text-caption font-bold text-primary',
    },
    surfaceClassName: 'flex min-h-24 w-[320px] items-center justify-center overflow-visible bg-transparent p-4',
    theme: resolveVisualQaOffseasonTheme(context),
  }),
  'offseason.section-pill': (context) => {
    requireStateValue(context, 'data', 'single');
    return {
      props: {
        section: resolveDeclaredVariant(context, 'section', {
          fa: 'FA',
          foreign: '외국인',
          military: '군 관련',
          other: '기타',
          release: '방출/웨이버',
          trade: '트레이드',
        }),
      },
      surfaceClassName: 'flex min-h-24 w-[320px] items-center justify-center overflow-visible bg-transparent p-4',
      theme: resolveVisualQaOffseasonTheme(context),
    };
  },
  'offseason.empty': (context) => {
    requireStateValue(context, 'data', 'empty');
    return {
      props: {
        hasSearchTerm: resolveDeclaredVariant(context, 'hasSearchTerm', {
          false: false,
          true: true,
        }),
        hasActiveFilters: resolveDeclaredVariant(context, 'hasActiveFilters', {
          false: false,
          true: true,
        }),
        onReset: () => {},
      },
    };
  },
  'offseason.error': (context) => ({
    props: {
      error: resolveOffseasonError(context),
      onRetry: () => {},
    },
  }),
  'prediction.loading-view': (context) => ({
    props: {
      topNotice: resolveDeclaredVariant(context, 'topNotice', {
        missing: null,
        short: '예측 데이터를 준비하고 있습니다.',
        'long-korean': '경기 데이터 동기화가 진행 중이며 완료되는 즉시 예측 화면을 표시합니다.',
      }),
    },
  }),
  'prediction.matches-error': (context) => ({
    props: {
      ...resolvePredictionMatchesError(context),
      predictionRecoveryPath: '/prediction',
      onReloadMatches: () => {},
    },
  }),
  'ranking.item': (context) => {
    requireStateValueFromMap(context, 'interactions', {
      default: true,
      'focus-visible': true,
      hover: true,
      pressed: true,
    });
    const team = requireStateValueFromMap(context, 'data', {
      empty: null,
      'long-korean': {
        color: TEAM_DATA_BASE.SS.color ?? '#074CA1',
        id: 'SS',
        name: '모바일 화면에서도 팀명과 순위 조작 버튼이 겹치지 않아야 하는 매우 긴 한국어 구단 이름',
        shortName: TEAM_DATA_BASE.SS.name,
      },
      single: {
        color: TEAM_DATA_BASE.SS.color ?? '#074CA1',
        id: 'SS',
        name: TEAM_DATA_BASE.SS.fullName,
        shortName: TEAM_DATA_BASE.SS.name,
      },
      'unbroken-token': {
        color: TEAM_DATA_BASE.SS.color ?? '#074CA1',
        id: 'SS',
        name: `RANKING-ITEM-${'X'.repeat(180)}`,
        shortName: TEAM_DATA_BASE.SS.name,
      },
    });
    const alreadySaved = resolveDeclaredVariant(context, 'mode', {
      editable: false,
      'read-only': true,
    });
    const movement = resolveDeclaredVariant(context, 'movement', {
      dragging: 'dragging',
      idle: 'idle',
      'recently-moved': 'recently-moved',
    });
    const teamId = team?.id ?? null;
    return {
      props: {
        alreadySaved,
        draggedTeamId: movement === 'dragging' ? teamId : null,
        index: resolveDeclaredVariant(context, 'rank', {
          divider: 5,
          first: 0,
          last: 9,
          'playoff-last': 4,
        }),
        lastMovedTeamId: movement === 'recently-moved' ? teamId : null,
        onDragTeamChange: () => {},
        onMoveTeamByStep: () => {},
        onMoveTeamToIndex: () => {},
        onRemove: () => {},
        team,
      },
      captureSelector: '[data-vqa-harness-surface]',
      surfaceClassName: 'block min-h-0 w-full max-w-[480px] overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'ranking.result-panel': (context) => {
    const dataState = context.states.data;
    const baseDetails = dataState === 'maximum-supported'
      ? FRANCHISE_TEAM_IDS.map((teamId) => ({
        teamId,
        teamName: TEAM_DATA_BASE[teamId]?.fullName ?? teamId,
      }))
      : dataState === 'single'
        ? [{ teamId: 'LG', teamName: TEAM_DATA_BASE.LG.fullName }]
        : dataState === 'long-korean'
          ? [{
            teamId: 'SS',
            teamName: '모바일 화면에서도 안전하게 말줄임되는 매우 긴 한국어 구단 표시 이름',
          }]
          : dataState === 'unbroken-token'
            ? [{ teamId: 'KIA', teamName: `RANKING-TEAM-${'X'.repeat(180)}` }]
            : dataState === 'empty' || dataState === 'null-optional'
              ? []
              : (() => {
                throw new Error(`지원하지 않는 Visual QA state: data=${dataState ?? '<missing>'}`);
              })();
    const accuracy = resolveDeclaredVariant(context, 'accuracy', {
      exact: 'exact',
      'missing-rank': 'missing-rank',
      mismatch: 'mismatch',
    });
    const teamDetails = baseDetails.map((detail, index) => ({
      ...detail,
      currentRank: accuracy === 'exact'
        ? index + 1
        : accuracy === 'missing-rank'
          ? null
          : ((index + 1) % Math.max(baseDetails.length, 2)) + 1,
      lastSeasonRank: index + 1,
    }));
    return {
      props: {
        result: {
          createdAt: '2026-08-23T00:00:00Z',
          exactMatchCount: accuracy === 'exact' ? teamDetails.length : 0,
          id: 1,
          seasonYear: resolveDeclaredVariant(context, 'season', {
            'boundary-maximum': 9999,
            current: 2026,
          }),
          settledAt: '2026-08-23T00:00:00Z',
          shareId: 'visual-qa-ranking',
          teamDetails: dataState === 'null-optional' ? undefined : teamDetails,
          teamIdsInOrder: teamDetails.map(({ teamId }) => teamId),
        },
      },
      captureSelector: '[data-testid="ranking-result-panel"]',
      surfaceClassName: 'block min-h-0 w-full max-w-[640px] overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'retro.animated-crown': (context) => ({
    props: {
      children: requireStateValueFromMap(context, 'data', retroAnimatedCrownCopy),
      'data-testid': 'retro-animated-crown',
      style: { animationPlayState: 'paused' },
    },
    captureSelector: '[data-testid="retro-animated-crown"]',
    surfaceClassName: 'flex min-h-24 w-full max-w-[320px] items-center justify-center overflow-hidden bg-[#1a1a2e] p-4 text-[#ffd700]',
  }),
  'retro.combo-animation': (context) => {
    const streakValues = resolveDeclaredVariant(context, 'streakTier', retroComboStreaks);
    return {
      props: {
        autoHideMs: null,
        containerTestId: 'retro-combo-animation',
        onComplete: () => {},
        particleRandom: () => 0.25,
        score: resolveDeclaredVariant(context, 'score', retroComboScores),
        show: true,
        streak: requireStateValueFromMap(context, 'data', streakValues),
      },
      captureSelector: '[data-testid="retro-combo-animation"]',
      surfaceClassName: 'relative block h-[568px] w-full max-w-[320px] overflow-hidden bg-[#1a1a2e] p-0',
    };
  },
  'retro.dot-matrix-text': (context) => ({
    props: {
      children: requireStateValueFromMap(context, 'data', retroDotMatrixCopy),
      'data-testid': 'retro-dot-matrix-text',
      style: { animationPlayState: 'paused' },
    },
    captureSelector: '[data-testid="retro-dot-matrix-text"]',
    surfaceClassName: 'flex min-h-32 w-full max-w-[320px] items-center justify-center overflow-hidden bg-[#1a1a2e] p-4 text-[#ff80ff]',
  }),
  'retro.flicker-text': (context) => ({
    props: {
      $active: resolveDeclaredVariant(context, 'active', {
        false: false,
        true: true,
      }),
      children: requireStateValueFromMap(context, 'data', retroFlickerCopy),
      'data-testid': 'retro-flicker-text',
      style: { animationPlayState: 'paused' },
    },
    captureSelector: '[data-testid="retro-flicker-text"]',
    surfaceClassName: 'flex min-h-24 w-full max-w-[320px] items-center justify-center overflow-hidden bg-[#1a1a2e] p-4 text-[#00ffff]',
  }),
  'retro.glitch-wrapper': (context) => ({
    props: {
      $active: resolveDeclaredVariant(context, 'active', {
        false: false,
        true: true,
      }),
      children: requireStateValueFromMap(context, 'data', retroGlitchCopy),
      'data-testid': 'retro-glitch-wrapper',
      style: {
        animationPlayState: 'paused',
        background: '#10102a',
        border: '2px solid #ff00ff',
        color: '#00ffff',
        padding: '12px',
      },
    },
    captureSelector: '[data-testid="retro-glitch-wrapper"]',
    surfaceClassName: 'flex min-h-32 w-full max-w-[320px] items-center justify-center overflow-hidden bg-[#1a1a2e] p-4',
  }),
  'retro.leaderboard-decorations': () => ({
    props: {},
    captureSelector: '[data-testid="retro-leaderboard-decorations"]',
    surfaceClassName: 'relative block h-[568px] w-full max-w-[320px] overflow-hidden bg-[#1a1a2e] p-0',
  }),
  'retro.leaderboard-footer-panels': (context) => ({
    props: {
      ...resolveDeclaredVariant(context, 'inventory', retroFooterInventories),
      containerTestId: 'retro-leaderboard-footer-panels',
      hotStreaks: requireStateValueFromMap(context, 'data', retroFooterHotStreaks),
      onUsePowerup: resolveDeclaredVariant(context, 'handler', {
        missing: undefined,
        present: async () => {},
      }),
    },
    captureSelector: '[data-testid="retro-leaderboard-footer-panels"]',
    surfaceClassName: 'block w-full max-w-[320px] overflow-hidden bg-[#1a1a2e] p-0',
  }),
  'retro.leaderboard-row': (context) => {
    requireStateValueFromMap(context, 'interactions', {
      default: true,
      hover: true,
    });
    const rank = resolveDeclaredVariant(context, 'rankTier', {
      first: 1,
      other: 42,
      second: 2,
      third: 3,
    });
    return {
      props: {
        containerTestId: 'retro-leaderboard-row',
        entry: {
          ...requireStateValueFromMap(context, 'data', retroLeaderboardRowData),
          rank,
          rankChange: resolveDeclaredVariant(context, 'rankChange', {
            down: -3,
            steady: undefined,
            up: 3,
          }),
        },
        isCurrentUser: resolveDeclaredVariant(context, 'currentUser', {
          false: false,
          true: true,
        }),
        rank,
      },
      captureSelector: '[data-testid="retro-leaderboard-row"]',
      surfaceClassName: 'block w-full max-w-[320px] overflow-visible bg-[#1a1a2e] p-0',
    };
  },
  'retro.leaderboard-rules-overlay': () => ({
    props: { onClose: () => {} },
    captureSelector: '[data-testid="retro-leaderboard-rules-overlay"]',
    surfaceClassName: 'relative block h-[620px] w-full max-w-[320px] overflow-hidden bg-[#1a1a2e] p-0',
  }),
  'retro.level-badge': (context) => {
    const tierValues = resolveDeclaredVariant(context, 'tier', retroLevelValues);
    return {
      props: {
        className: undefined,
        compact: resolveDeclaredVariant(context, 'compact', {
          false: false,
          true: true,
        }),
        containerTestId: 'retro-level-badge',
        level: requireStateValueFromMap(context, 'data', tierValues),
        showTitle: resolveDeclaredVariant(context, 'showTitle', {
          false: false,
          true: true,
        }),
      },
      captureSelector: '[data-testid="retro-level-badge"]',
      surfaceClassName: 'flex min-h-24 w-full items-center justify-center overflow-visible bg-[#1a1a2e] p-4',
    };
  },
  'retro.news-ticker': (context) => {
    requireStateValueFromMap(context, 'interactions', {
      default: true,
      hover: true,
    });
    const text = requireStateValueFromMap(context, 'data', retroTickerCopy);
    const type = resolveDeclaredVariant(context, 'type', {
      fire: 'fire',
      levelup: 'levelup',
      normal: 'normal',
      perfect: 'perfect',
      streak: 'streak',
      upset: 'upset',
    });
    return {
      props: {
        containerTestId: 'retro-news-ticker',
        messages: text === null ? [] : [{ id: 'visual-qa-ticker', text, type }],
        speed: resolveDeclaredVariant(context, 'speed', {
          default: 50,
          fast: 200,
          slow: 10,
        }),
      },
      captureSelector: '[data-testid="retro-news-ticker"]',
      surfaceClassName: 'flex min-h-24 w-full max-w-[320px] items-center justify-center overflow-hidden bg-[#1a1a2e] p-0',
    };
  },
  'retro.pixel-crown': (context) => ({
    props: {
      children: requireStateValueFromMap(context, 'data', retroPixelCrownCopy),
      'data-testid': 'retro-pixel-crown',
      style: { animationPlayState: 'paused' },
    },
    captureSelector: '[data-testid="retro-pixel-crown"]',
    surfaceClassName: 'flex min-h-24 w-full max-w-[320px] items-center justify-center overflow-hidden bg-[#1a1a2e] p-4 text-[#ffd700]',
  }),
  'retro.pixel-empty-state': (context) => ({
    props: {
      children: requireStateValueFromMap(context, 'data', retroEmptyStateCopy),
      'data-testid': 'retro-pixel-empty-state',
      style: { color: '#d4d4e8', fontFamily: "'Galmuri11', 'Galmuri9', sans-serif" },
    },
    captureSelector: '[data-testid="retro-pixel-empty-state"]',
    surfaceClassName: 'block w-full max-w-[320px] overflow-hidden bg-[#1a1a2e] p-4',
  }),
  'retro.pixel-progress-bar': (context) => {
    const progress = requireStateValueFromMap(context, 'data', retroProgressValues);
    const label = resolveDeclaredVariant(context, 'label', {
      default: { label: undefined, showLabel: true },
      hidden: { label: undefined, showLabel: false },
      'long-korean': {
        label: '다음 레벨까지 필요한 경험치 진행 상황을 확인합니다',
        showLabel: true,
      },
      'unbroken-token': {
        label: `PROGRESS-${'X'.repeat(120)}`,
        showLabel: true,
      },
    });
    return {
      props: {
        ...progress,
        ...label,
        color: resolveDeclaredVariant(context, 'color', {
          custom: '#ff00ff',
          default: undefined,
        }),
        containerTestId: 'retro-pixel-progress-bar',
        size: resolveDeclaredVariant(context, 'size', {
          lg: 'lg',
          md: 'md',
          sm: 'sm',
        }),
      },
      captureSelector: '[data-testid="retro-pixel-progress-bar"]',
      surfaceClassName: 'block min-h-20 w-full max-w-[288px] overflow-visible bg-[#1a1a2e] p-4',
    };
  },
  'retro.power-up-inventory': (context) => {
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      open: 'open',
      pressed: 'pressed',
      selected: 'selected',
    });
    const handlerName = context.variants.handler;
    const onUsePowerup = resolveDeclaredVariant(context, 'handler', retroPowerupHandlers);
    if (interaction !== 'default') {
      const expectedSuffix = interaction === 'selected' ? handlerName : interaction;
      const targetPattern = new RegExp(`^(magic-bat|golden-glove|scouter)-${expectedSuffix}$`);
      if (!context.interactionTargetId || !targetPattern.test(context.interactionTargetId)) {
        throw new Error(
          `지원하지 않는 Visual QA interaction target: ${context.interactionTargetId ?? '<missing>'}`,
        );
      }
    }
    const modalCapture = interaction === 'open'
      || (interaction === 'selected' && handlerName !== 'success');
    return {
      props: {
        activePowerups: resolveDeclaredVariant(context, 'activeSet', retroPowerupActiveSets),
        containerTestId: 'retro-powerup-inventory',
        disabled: resolveDeclaredVariant(context, 'disabled', {
          false: false,
          true: true,
        }),
        onUsePowerup,
        powerups: {
          MAGIC_BAT: resolveDeclaredVariant(context, 'magicBatCount', retroPowerupCountValues),
          GOLDEN_GLOVE: resolveDeclaredVariant(context, 'goldenGloveCount', retroPowerupCountValues),
          SCOUTER: resolveDeclaredVariant(context, 'scouterCount', retroPowerupCountValues),
        },
      },
      captureSelector: modalCapture
        ? '[data-testid="retro-powerup-modal-content"]'
        : '[data-testid="retro-powerup-inventory"]',
      surfaceClassName: 'block w-full max-w-[320px] overflow-visible bg-[#1a1a2e] p-0',
    };
  },
  'retro.user-stats-panel': (context) => {
    requireStateValue(context, 'data', 'populated');
    return {
      props: {
        containerTestId: 'retro-user-stats-panel',
        stats: {
          userId: 1,
          ...resolveDeclaredVariant(context, 'identity', retroUserStatsIdentities),
          ...resolveDeclaredVariant(context, 'metrics', retroUserStatsMetrics),
          rank: resolveDeclaredVariant(context, 'rank', retroUserStatsRanks),
          currentStreak: resolveDeclaredVariant(context, 'streak', retroUserStatsStreaks),
          ...resolveDeclaredVariant(context, 'xp', retroUserStatsXp),
        },
      },
      captureSelector: '[data-testid="retro-user-stats-panel"]',
      surfaceClassName: 'block w-full max-w-[320px] overflow-visible bg-[#1a1a2e] p-0',
    };
  },
  'review.dialog': (context) => {
    requireStateValue(context, 'data', 'single');
    requireStateValue(context, 'permissions', 'user');
    requireStateValueFromMap(
      context,
      'interactions',
      reviewDialogInteractionStates,
    );
    resolveDeclaredVariant(context, 'comment', reviewDialogCommentPresets);
    const reviewee = resolveDeclaredVariant(context, 'reviewee', reviewDialogReviewees);
    return {
      props: {
        isOpen: true,
        onClose: () => {},
        onSuccess: () => {},
        partyId: 1,
        reviewee,
        submitReview: context.states.interactions === 'submitting'
          ? () => new Promise(() => {})
          : undefined,
      },
      captureSelector: '[data-testid="review-dialog"]',
    };
  },
  'rolling.number': (context) => {
    const value = requireStateValueFromMap(context, 'data', rollingNumberValues);
    const phase = resolveDeclaredVariant(context, 'phase', {
      stable: 'stable',
      increase: 'increase',
      decrease: 'decrease',
    });
    if (value === Number.MAX_SAFE_INTEGER && phase === 'decrease') {
      throw new Error('지원하지 않는 Visual QA state/variant 조합: maximum-supported/decrease');
    }
    return {
      props: {
        value,
        transitionPreview: phase === 'stable'
          ? undefined
          : {
            from: phase === 'increase' ? value - 1 : value + 1,
            progress: 0.5,
          },
      },
      captureSelector: '[data-testid="rolling-number"]',
      surfaceClassName: 'flex min-h-24 w-full max-w-[320px] items-center justify-center overflow-hidden p-4',
    };
  },
  'root-entry-route': (context) => {
    const routeMode = resolveDeclaredVariant(context, 'routeMode', {
      'cold-start': 'cold-start',
      'persisted-auth': 'persisted-auth',
    });
    const phase = resolveDeclaredVariant(context, 'phase', {
      fallback: 'fallback',
      resolved: 'resolved',
    });
    const shouldUseAuthAwareRoute = routeMode === 'persisted-auth';
    const shouldSuspend = phase === 'fallback';
    return {
      props: {
        shouldUseAuthAwareRouteOverride: shouldUseAuthAwareRoute,
        landingLoader: !shouldUseAuthAwareRoute && shouldSuspend
          ? () => new Promise<never>(() => {})
          : undefined,
        authAwareRouteLoader: shouldUseAuthAwareRoute && shouldSuspend
          ? () => new Promise<never>(() => {})
          : undefined,
        authAwareStateOverride: shouldUseAuthAwareRoute && !shouldSuspend
          ? {
            isAuthBootstrapPending: true,
            isAuthLoading: false,
            isLoggedIn: false,
          }
          : undefined,
        spinnerMinDurationMs: shouldUseAuthAwareRoute && !shouldSuspend ? 0 : undefined,
      },
      captureSelector: shouldSuspend
        ? '[data-testid="root-entry-route-loading-fallback"]'
        : shouldUseAuthAwareRoute
          ? '[data-testid="root-entry-auth-loading"]'
          : '[data-testid="landing-page"]',
      surfaceClassName: 'block min-h-0 w-full overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'root-entry-route-auth-aware': (context) => {
    const permissions = requireStateValueFromMap(context, 'permissions', {
      anonymous: 'anonymous',
      user: 'user',
    });
    const authState = resolveDeclaredVariant(context, 'authState', {
      'auth-loading': 'auth-loading',
      'bootstrap-pending': 'bootstrap-pending',
      ready: 'ready',
    });
    const phase = resolveDeclaredVariant(context, 'phase', {
      fallback: 'fallback',
      resolved: 'resolved',
    });
    const invalidCombination = (
      (permissions === 'user' && (authState !== 'ready' || phase !== 'resolved'))
      || (permissions === 'anonymous' && authState !== 'ready' && phase !== 'resolved')
    );
    if (invalidCombination) {
      throw new Error(
        `지원하지 않는 Visual QA state/variant 조합: permissions=${permissions}, authState=${authState}, phase=${phase}`,
      );
    }
    const isReady = authState === 'ready';
    const isLoggedIn = permissions === 'user';
    return {
      props: {
        authStateOverride: {
          isAuthBootstrapPending: authState === 'bootstrap-pending',
          isAuthLoading: authState === 'auth-loading',
          isLoggedIn,
        },
        landingLoader: !isLoggedIn && isReady && phase === 'fallback'
          ? () => new Promise<never>(() => {})
          : undefined,
        spinnerMinDurationMs: 0,
      },
      captureSelector: isLoggedIn
        ? '[data-vqa-harness-surface]'
        : !isReady
          ? '[data-testid="root-entry-auth-loading"]'
          : phase === 'fallback'
            ? '[data-testid="root-entry-landing-loading"]'
            : '[data-testid="landing-page"]',
      expectedPathname: isLoggedIn ? '/home' : undefined,
      surfaceClassName: isLoggedIn
        ? 'block min-h-48 w-full overflow-visible bg-transparent p-0 shadow-none'
        : 'block min-h-0 w-full overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'retro.pixel-number': (context) => ({
    props: {
      $color: resolveDeclaredVariant(context, 'color', {
        custom: '#00ffff',
        default: undefined,
      }),
      children: requireStateValueFromMap(context, 'data', retroNumericCopy),
      'data-testid': 'retro-pixel-number',
    },
    captureSelector: '[data-testid="retro-pixel-number"]',
    surfaceClassName: 'flex min-h-24 w-full max-w-[320px] items-center justify-center overflow-visible bg-[#1a1a2e] p-4',
  }),
  'retro.rank-badge': (context) => ({
    props: {
      $rank: resolveDeclaredVariant(context, 'rankTier', {
        first: 1,
        other: 4,
        second: 2,
        third: 3,
      }),
      children: requireStateValueFromMap(context, 'data', retroRankBadgeCopy),
      'data-testid': 'retro-rank-badge',
    },
    captureSelector: '[data-testid="retro-rank-badge"]',
    surfaceClassName: 'flex min-h-20 w-full max-w-[320px] items-center justify-center overflow-visible bg-[#1a1a2e] p-4',
  }),
  'retro.retro-button': (context) => {
    requireStateValueFromMap(context, 'interactions', {
      default: true,
      'focus-visible': true,
      hover: true,
      pressed: true,
    });
    return {
      props: {
        $variant: resolveDeclaredVariant(context, 'tone', {
          danger: 'danger',
          primary: 'primary',
          secondary: 'secondary',
        }),
        children: requireStateValueFromMap(context, 'data', retroButtonCopy),
        'data-testid': 'retro-button',
        disabled: resolveDeclaredVariant(context, 'disabled', {
          false: false,
          true: true,
        }),
        onClick: () => {},
        type: 'button',
      },
      surfaceClassName: 'flex min-h-28 w-full max-w-[320px] items-center justify-center overflow-hidden bg-[#1a1a2e] p-4',
    };
  },
  'retro.retro-card': (context) => ({
    props: {
      ...resolveDeclaredVariant(context, 'glow', {
        custom: { $glow: true, $glowColor: '#ff66ff' },
        default: { $glow: true, $glowColor: undefined },
        off: { $glow: false, $glowColor: undefined },
      }),
      children: requireStateValueFromMap(context, 'data', retroCardCopy),
      'data-testid': 'retro-card',
      style: { animationPlayState: 'paused' },
    },
    captureSelector: '[data-testid="retro-card"]',
    surfaceClassName: 'flex min-h-36 w-full max-w-[320px] items-center justify-center overflow-hidden bg-[#1a1a2e] p-4 text-[#d4d4e8]',
  }),
  'retro.retro-container': (context) => ({
    props: {
      children: requireStateValueFromMap(context, 'data', retroContainerCopy),
      'data-testid': 'retro-container',
      style: {
        color: '#d4d4e8',
        fontFamily: "'Galmuri11', 'Galmuri9', sans-serif",
        padding: '16px',
        width: '100%',
      },
    },
    captureSelector: '[data-testid="retro-container"]',
    surfaceClassName: 'flex min-h-32 w-full max-w-[320px] items-center justify-center overflow-hidden bg-[#1a1a2e] p-4',
  }),
  'retro.retro-divider': () => ({
    props: { 'data-testid': 'retro-divider' },
    captureSelector: '[data-testid="retro-divider"]',
    surfaceClassName: 'flex min-h-20 w-full max-w-[320px] items-center overflow-hidden bg-[#1a1a2e] p-4',
  }),
  'retro.score-display': (context) => ({
    props: {
      $animate: resolveDeclaredVariant(context, 'animate', {
        false: false,
        true: true,
      }),
      children: requireStateValueFromMap(context, 'data', retroNumericCopy),
      'data-testid': 'retro-score-display',
    },
    captureSelector: '[data-testid="retro-score-display"]',
    surfaceClassName: 'flex min-h-24 w-full max-w-[320px] items-center justify-center overflow-visible bg-[#1a1a2e] p-4',
  }),
  'retro.streak-counter': (context) => {
    const streakValues = resolveDeclaredVariant(context, 'streakTier', retroStreakValues);
    const streak = requireStateValueFromMap(context, 'data', streakValues);
    return {
      props: {
        $streak: streak,
        children: resolveDeclaredVariant(context, 'label', {
          default: `${streak}연승`,
          'long-korean': '현재 이어지고 있는 연승 기록을 확인합니다',
          'unbroken-token': `STREAK-${'X'.repeat(160)}`,
        }),
        'data-testid': 'retro-streak-counter',
        style: { animationPlayState: 'paused' },
      },
      captureSelector: '[data-testid="retro-streak-counter"]',
      surfaceClassName: 'flex min-h-20 w-full max-w-[320px] items-center justify-center overflow-visible bg-[#1a1a2e] p-4',
    };
  },
  'sajik.first-visit-guide': (context) => {
    requireStateValueFromMap(context, 'interactions', sajikGuideInteractions);
    const data = requireStateValueFromMap(context, 'data', sajikGuideData);
    return {
      props: {
        intent: resolveDeclaredVariant(context, 'intent', {
          accessible: 'accessible',
          all: 'all',
          away_third: 'away_third',
          center_table: 'center_table',
          home_cheer: 'home_cheer',
          outfield: 'outfield',
        }),
        matches: data.matches,
        mode: resolveDeclaredVariant(context, 'mode', {
          dark: 'dark',
          light: 'light',
        }),
        onIntentChange: () => {},
        onQueryChange: () => {},
        onSelectBlock: () => {},
        query: data.query,
      },
      captureSelector: '[data-testid="sajik-first-visit-guide"]',
      surfaceClassName: 'block min-h-0 w-full max-w-[720px] overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'sajik.missing-official-seat-map': (context) => {
    requireStateValue(context, 'data', 'manual-required');
    return {
      props: {
        mode: resolveDeclaredVariant(context, 'mode', {
          dark: 'dark',
          light: 'light',
        }),
      },
      captureSelector: '[data-testid="sajik-official-seatmap-required"]',
      surfaceClassName: 'block min-h-0 w-full max-w-[720px] overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'sajik.path-validation': (context) => {
    const issueCount = requireStateValueFromMap(context, 'data', {
      'error-422': 2,
      complete: 0,
    });
    return {
      props: {
        issues: Array.from({ length: issueCount }, () => ({ code: 'VISUAL_QA_FIXTURE' })),
        label: resolveDeclaredVariant(context, 'label', {
          hitPath: 'hitPath',
          'long-korean': '모바일 화면에서 검증 결과가 길어지는 좌석 경로',
          'unbroken-token': `PATH-${'X'.repeat(120)}`,
          visualPath: 'visualPath',
        }),
      },
      surfaceClassName: 'block min-h-0 w-full max-w-[360px] overflow-visible p-4',
    };
  },
  'sajik.seat-map': (context) => {
    requireStateValue(context, 'data', 'populated');
    requireStateValueFromMap(context, 'interactions', sajikSeatMapInteractions);
    const isLoggedIn = requireStateValueFromMap(context, 'permissions', {
      anonymous: false,
      user: true,
    });
    return {
      props: {
        stateOverride: { isLoggedIn },
      },
      captureSelector: '[data-vqa-harness-surface]',
      surfaceClassName: 'block min-h-[844px] w-full max-w-[1440px] overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'sajik.seat-map-editor': (context) => {
    requireStateValueFromMap(context, 'interactions', sajikSeatMapEditorInteractions);
    const dataState = requireStateValueFromMap(context, 'data', {
      'error-422': 'invalid-hitpath',
      partial: 'dirty-pass',
      single: 'clean',
    });
    const copyStatus = resolveDeclaredVariant(context, 'copyStatus', {
      blocked: 'blocked',
      copied: 'copied',
      failed: 'failed',
      idle: 'idle',
    });
    return {
      props: {
        stateOverride: {
          dataState,
          copyStatus,
          editingTarget: resolveDeclaredVariant(context, 'editingTarget', {
            hitPath: 'hitPath',
            labelPoint: 'labelPoint',
            visualPath: 'visualPath',
          }),
          query: resolveDeclaredVariant(context, 'query', {
            empty: '',
            'long-korean': '접근 가능한 사직야구장 좌석 경로 편집 구역',
            'no-results': '등록되지않은구역',
            'unbroken-token': `SAJIK-${'X'.repeat(160)}`,
          }),
          selectedSectionId: resolveDeclaredVariant(context, 'section', {
            accessibility: '323',
            alias: '011',
            default: '112',
          }),
        },
      },
      captureSelector: '[data-testid="sajik-seatmap-editor"]',
      surfaceClassName: 'block min-h-[844px] w-full max-w-[1680px] overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'sajik.seat-map-svg': (context) => {
    requireStateValueFromMap(context, 'interactions', sajikSeatMapSvgInteractions);
    const selection = resolveDeclaredVariant(context, 'selection', {
      hovered: 'hovered',
      none: 'none',
      selected: 'selected',
    });
    const filter = resolveDeclaredVariant(context, 'filter', {
      'category-filtered': { filterCats: ['CENTRAL_TABLE'], filterLevels: null, filterSides: null },
      'level-filtered': { filterCats: null, filterLevels: ['1F'], filterSides: null },
      none: { filterCats: null, filterLevels: null, filterSides: null },
      'side-filtered': { filterCats: null, filterLevels: null, filterSides: ['FIRST_BASE'] },
    });
    const guideMatched = resolveDeclaredVariant(context, 'guide', {
      inactive: false,
      matched: true,
    });
    const zoom = resolveDeclaredVariant(context, 'zoom', {
      maximum: 2.5,
      middle: 1.75,
      minimum: 1,
    });
    const fullscreen = resolveDeclaredVariant(context, 'fullscreen', {
      absent: undefined,
      present: () => {},
    });
    const imageState = requireStateValueFromMap(context, 'data', {
      'broken-image': 'error',
      loading: 'loading',
      populated: 'loaded',
    });
    return {
      props: {
        mode: resolveDeclaredVariant(context, 'mode', {
          dark: 'dark',
          light: 'light',
        }),
        selected: selection === 'selected' ? sajikSvgReferenceBlock : null,
        setSelected: () => {},
        hover: selection === 'hovered' ? sajikSvgReferenceBlock.id : null,
        setHover: () => {},
        ...filter,
        zoom,
        pan: zoom === 1 ? { x: 0, y: 0 } : { x: 24, y: -18 },
        onPanChange: () => {},
        onZoom: () => {},
        minZoom: 1,
        maxZoom: 2.5,
        zoomStep: 0.25,
        onFullscreen: fullscreen,
        guideMatchedBlockIds: guideMatched ? [sajikSvgReferenceBlock.id] : [],
        guideActive: guideMatched,
        stateOverride: { imageState },
      },
      captureSelector: imageState === 'error'
        ? '[data-testid="sajik-official-seatmap-required"]'
        : '[data-testid="sajik-seatmap-panel"]',
      surfaceClassName: 'block min-h-0 w-full max-w-[720px] overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'stadium-seatmap.error': (context) => {
    requireStateValue(context, 'data', 'error-503');
    return {
      props: {
        stadiumName: resolveDeclaredVariant(context, 'stadiumName', stadiumNames),
        onRetry: () => {},
      },
    };
  },
  'stadium-seatmap.loading': (context) => ({
    props: {
      stadiumName: resolveDeclaredVariant(context, 'stadiumName', stadiumNames),
      label: resolveDeclaredVariant(context, 'label', {
        missing: undefined,
        short: '공식 좌석도',
        'long-korean': '공식 좌석 구역과 선택 가능 블록 정보를 불러오고 있습니다.',
      }),
    },
  }),
  'stadium-seatmap.manual-required': (context) => ({
    props: {
      stadiumName: resolveDeclaredVariant(context, 'stadiumName', stadiumNames),
    },
  }),
  'ui.alert': (context) => {
    const copy = resolveAlertCopy(context);
    const content = resolveDeclaredVariant(context, 'content', {
      both: ['title', 'description'],
      'description-only': ['description'],
      'title-only': ['title'],
    });
    const children = [
      resolveDeclaredVariant(context, 'leadingIcon', {
        missing: null,
        present: alertLeadingIcon(),
      }),
      content.includes('title') ? createElement(AlertTitle, null, copy.title) : null,
      content.includes('description')
        ? createElement(AlertDescription, null, copy.description)
        : null,
    ].filter((child) => child !== null);
    return {
      props: {
        variant: resolveDeclaredVariant(context, 'tone', {
          default: 'default',
          destructive: 'destructive',
        }),
        children,
      },
    };
  },
  'ui.alert-description': (context) => {
    const copy = resolveAlertCopy(context);
    return {
      props: {
        children: resolveDeclaredVariant(context, 'structure', {
          paragraph: createElement('p', null, copy.description),
          text: copy.description,
        }),
      },
    };
  },
  'ui.alert-title': (context) => ({
    props: { children: resolveAlertCopy(context).title },
  }),
  'ui.auth-primitive': (context) => {
    const copy = requireStateValueFromMap(context, 'data', {
      'long-korean': {
        count: 1,
        description: '모바일 화면에서도 계정 확인 절차와 다음 행동을 오해하지 않도록 충분히 길게 작성한 인증 안내 문구입니다.',
        title: '안전하게 계정을 확인하고 계속 진행해 주세요',
      },
      'maximum-supported': {
        count: 4,
        description: '인증 화면에서 지원하는 최대 구성 요소와 안내 문구를 함께 배치한 상태입니다.',
        title: '계정 보안 및 인증 설정',
      },
      single: {
        count: 1,
        description: '계속하려면 정보를 확인해 주세요.',
        title: '로그인',
      },
      'unbroken-token': {
        count: 1,
        description: `AUTH-DESCRIPTION-${'X'.repeat(160)}`,
        title: `AUTH-TITLE-${'Y'.repeat(120)}`,
      },
    });
    const componentName = context.componentId.slice(context.componentId.indexOf('#') + 1);
    const contentCard = (minimumHeight = '') => createElement(
      'div',
      {
        className: `min-w-0 ${minimumHeight} rounded-xl border border-border bg-card p-4 text-card-foreground`,
      },
      createElement('strong', { className: 'block break-words text-lg' }, copy.title),
      createElement('p', { className: 'mt-2 break-words text-sm text-muted-foreground' }, copy.description),
    );
    const captureSelector = `[data-slot="${componentName
      .replace(/^Auth/, 'auth')
      .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}"]`;
    const surfaceClassName = 'block min-h-0 w-full max-w-[480px] overflow-visible bg-transparent p-0 shadow-none';

    if (componentName === 'AuthHeader') {
      return {
        props: {
          title: copy.title,
          description: resolveDeclaredVariant(context, 'description', {
            missing: undefined,
            present: copy.description,
          }),
        },
        captureSelector,
        surfaceClassName,
      };
    }
    if (componentName === 'AuthStatusPanel') {
      const leadingIcon = resolveDeclaredVariant(context, 'leadingIcon', {
        missing: null,
        present: createElement('span', {
          'aria-hidden': true,
          className: 'flex size-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold',
        }, '!'),
      });
      return {
        props: {
          tone: resolveDeclaredVariant(context, 'tone', {
            default: 'default',
            error: 'error',
            success: 'success',
            warning: 'warning',
          }),
          children: [
            leadingIcon,
            createElement(
              'div',
              { className: 'min-w-0', key: 'copy' },
              createElement('strong', { className: 'block' }, copy.title),
              createElement('p', { className: 'mt-1 text-sm' }, copy.description),
            ),
          ].filter((child) => child !== null),
        },
        captureSelector,
        surfaceClassName,
      };
    }
    if (componentName === 'AuthFieldGroup') {
      return {
        props: {
          children: Array.from({ length: copy.count }, (_, index) => createElement(
            'label',
            { className: 'grid min-w-0 gap-2 text-sm font-medium', key: `field-${index}` },
            createElement('span', null, `${copy.title} ${index + 1}`),
            createElement('input', {
              'aria-label': `${copy.title} ${index + 1}`,
              className: 'auth-input w-full px-3',
              defaultValue: index === 0 ? copy.description : '',
            }),
          )),
        },
        captureSelector,
        surfaceClassName,
      };
    }
    if (componentName === 'AuthActionGroup') {
      return {
        props: {
          children: Array.from({ length: copy.count }, (_, index) => createElement(
            'button',
            {
              className: 'min-h-11 w-full rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground',
              key: `action-${index}`,
              type: 'button',
            },
            `${copy.title} ${index + 1}`,
          )),
        },
        captureSelector,
        surfaceClassName,
      };
    }
    if (componentName === 'AuthHeroPanel') {
      return {
        props: {
          children: createElement(
            'div',
            { className: 'relative z-10 min-w-0 text-center' },
            createElement('strong', { className: 'block break-words text-3xl' }, copy.title),
            createElement('p', { className: 'mt-3 break-words text-sm text-white/85' }, copy.description),
          ),
        },
        captureSelector,
        surfaceClassName,
      };
    }
    if (componentName === 'AuthShell') {
      const minimumHeight = resolveDeclaredVariant(context, 'contentHeight', {
        compact: 'min-h-48',
        tall: 'min-h-[900px]',
      });
      return {
        props: { children: contentCard(minimumHeight) },
        captureSelector,
        surfaceClassName: 'block min-h-0 w-full overflow-visible bg-transparent p-0 shadow-none',
      };
    }
    if (componentName === 'AuthFormPanel' || componentName === 'AuthStage') {
      return {
        props: { children: contentCard() },
        captureSelector,
        surfaceClassName,
      };
    }
    throw new Error(`지원하지 않는 Visual QA auth primitive: ${componentName}`);
  },
  'ui.calendar': (context) => {
    const availability = resolveDeclaredVariant<'all-disabled' | 'enabled' | 'partial'>(
      context,
      'availability',
      {
        'all-disabled': 'all-disabled',
        enabled: 'enabled',
        partial: 'partial',
      },
    );
    const baseDate = resolveDeclaredVariant(context, 'monthLayout', {
      'four-weeks': new Date(2026, 1, 15),
      'five-weeks': new Date(2026, 5, 15),
      'six-weeks': new Date(2026, 7, 15),
    });
    const dayState = resolveDeclaredVariant<'none' | 'selected' | 'selected-today' | 'today'>(
      context,
      'dayState',
      {
        none: 'none',
        selected: 'selected',
        'selected-today': 'selected-today',
        today: 'today',
      },
    );
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      'keyboard-navigation': 'keyboard-navigation',
      pressed: 'pressed',
    });
    if (
      availability === 'all-disabled'
      && (interaction === 'keyboard-navigation' || context.interactionTargetId === 'day')
    ) {
      throw new Error('지원하지 않는 Visual QA calendar interaction for all-disabled dates');
    }

    const selected = dayState === 'selected' || dayState === 'selected-today'
      ? baseDate
      : undefined;
    const today = dayState === 'today' || dayState === 'selected-today'
      ? baseDate
      : new Date(2030, 0, 15);
    const disabled = availability === 'all-disabled'
      ? () => true
      : availability === 'partial'
        ? (date: Date) => date.getDate() > 20
        : undefined;

    return {
      props: {
        ariaLabel: 'Visual QA 달력',
        className: 'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card',
        defaultMonth: baseDate,
        disabled,
        onMonthChange: () => {},
        onSelect: () => {},
        selected,
        showOutsideDays: resolveDeclaredVariant(context, 'outsideDays', {
          hidden: false,
          shown: true,
        }),
        today,
      },
      captureSelector: '[aria-label="Visual QA 달력"]',
      surfaceClassName: 'flex min-h-[480px] w-full max-w-[340px] items-start justify-center overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'ui.toaster': (context) => {
    const copy = requireStateValueFromMap(context, 'data', {
      'long-korean': {
        count: 1,
        description: '모바일 화면에서도 처리 결과와 다음 행동을 정확히 이해할 수 있도록 충분히 길게 작성한 알림 설명입니다.',
        title: '요청한 작업이 안전하게 처리되었습니다',
      },
      'maximum-supported': {
        count: 4,
        description: '동시에 표시할 수 있는 최대 알림 묶음입니다.',
        title: '연속 알림',
      },
      single: {
        count: 1,
        description: undefined,
        title: '저장되었습니다',
      },
      'unbroken-token': {
        count: 1,
        description: `TOAST-DESCRIPTION-${'X'.repeat(180)}`,
        title: `TOAST-TITLE-${'Y'.repeat(140)}`,
      },
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
      selected: 'selected',
    });
    const expectedInteractionTarget = interaction === 'selected'
      ? (copy.count === 1 ? 'close-single' : 'close-stack')
      : 'close-button';
    if (interaction !== 'default' && context.interactionTargetId !== expectedInteractionTarget) {
      throw new Error(`지원하지 않는 Visual QA toaster interaction target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    const position = resolveDeclaredVariant(context, 'position', {
      'bottom-center': 'bottom-center',
      'bottom-left': 'bottom-left',
      'bottom-right': 'bottom-right',
      'top-center': 'top-center',
      'top-left': 'top-left',
      'top-right': 'top-right',
    });
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    const tone = resolveDeclaredVariant<VisualQaToastTone>(context, 'tone', {
      default: 'default',
      error: 'error',
      info: 'info',
      loading: 'loading',
      success: 'success',
      warning: 'warning',
    });
    const duration = resolveDeclaredVariant(context, 'duration', {
      persistent: 0,
      timed: 60_000,
    });

    return {
      props: {
        className: 'toaster group vqa-toaster',
        position,
        theme,
      },
      captureSelector: '.vqa-toaster',
      companion: createElement(VisualQaToastSeed, {
        count: copy.count,
        description: copy.description,
        duration,
        title: copy.title,
        tone,
      }),
      surfaceClassName: 'block min-h-[560px] w-full overflow-visible bg-transparent p-0 shadow-none',
      theme,
    };
  },
  'authenticated-layout.chrome': (context) => {
    const permission = requireStateValueFromMap(context, 'permissions', {
      anonymous: 'anonymous',
      user: 'user',
    });
    const chatbot = resolveDeclaredVariant(context, 'chatbot', {
      launcher: 'launcher',
      open: 'open',
    });
    const route = resolveDeclaredVariant(context, 'route', {
      'mate-action': 'mate-action',
      regular: 'regular',
    });
    if (chatbot === 'open' && route === 'mate-action') {
      throw new Error(`지원하지 않는 Visual QA authenticated-layout state: ${chatbot}:${route}`);
    }
    const enableAuthenticatedServices = permission === 'user';
    const isChatBotRequestedOverride = chatbot === 'open';
    const pathname = route === 'mate-action' ? '/mate/visual-qa/apply' : '/home';
    const toasterMounted = enableAuthenticatedServices || isChatBotRequestedOverride;
    const statusCopy = [
      permission === 'user' ? '인증 서비스: 사용' : '인증 서비스: 사용 안 함',
      toasterMounted ? '전역 알림: 마운트' : '전역 알림: 미마운트',
      enableAuthenticatedServices ? '실시간 알림: 마운트' : '실시간 알림: 미마운트',
      chatbot === 'open' ? '챗봇: 열림' : '모바일 런처: 숨김',
      route === 'mate-action' ? 'Mate 하단 액션 간격 적용' : '기본 안전 영역 간격 적용',
    ];
    return {
      props: {
        enableAuthenticatedServices,
        isChatBotRequestedOverride,
        runtimeOverrides: {
          authenticatedLayoutToaster: VisualQaAuthenticatedLayoutNullRuntime,
          authenticatedNotificationSocketBridge: VisualQaAuthenticatedLayoutNullRuntime,
          chatBot: VisualQaAuthenticatedLayoutChatBot,
          chatBotFloatingButton: VisualQaAuthenticatedLayoutLauncher,
        },
      },
      captureSelector: chatbot === 'open'
        ? '[data-testid="authenticated-layout-chatbot-stub"]'
        : '[data-testid="authenticated-layout-chrome-state"]',
      companion: createElement(
        'div',
        {
          className: 'mx-4 mt-4 min-w-0 max-w-[272px] break-words rounded-2xl border border-border bg-card p-4 text-sm text-foreground shadow-sm [overflow-wrap:anywhere]',
          'data-testid': 'authenticated-layout-chrome-state',
          role: 'status',
        },
        ...statusCopy.map((copy) => createElement('p', { className: 'mt-1 first:mt-0', key: copy }, copy)),
      ),
      expectedHash: '',
      expectedPathname: pathname,
      expectedSearch: '',
      initialPathname: pathname,
      surfaceClassName: 'relative block min-h-[844px] w-[320px] max-w-none overflow-hidden bg-background p-0 shadow-none',
    };
  },
  'authenticated-layout.toaster': (context) => {
    requireStateValue(context, 'data', 'single');
    const theme = resolveDeclaredVariant<'dark' | 'light'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    return {
      props: {},
      captureSelector: '.toaster',
      companion: createElement(VisualQaToastSeed, {
        count: 1,
        description: '인증 레이아웃 전역 알림 경계가 모바일 안전 영역 안에서 동작합니다.',
        duration: 0,
        title: '알림 연결 완료',
        tone: 'success',
      }),
      surfaceClassName: 'block min-h-[560px] w-[320px] max-w-none overflow-visible bg-background p-0 shadow-none',
      theme,
    };
  },
  'ui.ui-kit-preview': (context) => {
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
      selected: 'selected',
    });
    const theme = resolveDeclaredVariant<'light' | 'dark'>(context, 'theme', {
      dark: 'dark',
      light: 'light',
    });
    if (
      interaction !== 'default'
      && interaction !== 'selected'
      && context.interactionTargetId !== 'theme-toggle'
    ) {
      throw new Error(`지원하지 않는 Visual QA UI kit interaction target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    if (
      interaction === 'selected'
      && context.interactionTargetId !== (theme === 'light' ? 'to-dark' : 'to-light')
    ) {
      throw new Error(`지원하지 않는 Visual QA UI kit theme transition: ${context.interactionTargetId ?? '<missing>'}`);
    }
    return {
      props: {},
      captureSelector: '[data-testid="ui-kit-preview"]',
      surfaceClassName: 'block min-h-0 w-full max-w-[1024px] overflow-visible bg-transparent p-0 shadow-none',
      theme,
    };
  },
  'ui.card': (context) => {
    const copy = resolveCardCopy(context);
    const composition = resolveDeclaredVariant(context, 'composition', {
      'content-only': 'content-only',
      full: 'full',
      'with-action': 'with-action',
    });
    const children = composition === 'content-only'
      ? [createElement(CardContent, { key: 'content' }, copy.content)]
      : [
        createElement(
          CardHeader,
          { key: 'header' },
          ...cardHeaderChildren(copy, composition === 'with-action'),
        ),
        createElement(CardContent, { key: 'content' }, copy.content),
        createElement(CardFooter, { key: 'footer' }, ...cardFooterChildren(copy)),
      ];
    return {
      props: { children },
      surfaceClassName: 'block min-h-0 w-full max-w-[320px] overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'ui.card-action': (context) => ({
    props: { children: resolveCardCopy(context).action },
    surfaceClassName: cardPrimitiveSurface,
  }),
  'ui.card-content': (context) => ({
    props: { children: resolveCardCopy(context).content },
    surfaceClassName: cardPrimitiveSurface,
  }),
  'ui.card-description': (context) => ({
    props: { children: resolveCardCopy(context).description },
    surfaceClassName: cardPrimitiveSurface,
  }),
  'ui.card-footer': (context) => {
    const copy = resolveCardCopy(context);
    return {
      props: {
        children: cardFooterChildren(copy),
        className: resolveDeclaredVariant(context, 'divider', {
          absent: '',
          present: 'border-t',
        }),
      },
      surfaceClassName: cardPrimitiveSurface,
    };
  },
  'ui.card-header': (context) => {
    const copy = resolveCardCopy(context);
    const includeAction = resolveDeclaredVariant(context, 'action', {
      missing: false,
      present: true,
    });
    return {
      props: {
        children: cardHeaderChildren(copy, includeAction),
        className: resolveDeclaredVariant(context, 'divider', {
          absent: '',
          present: 'border-b',
        }),
      },
      surfaceClassName: cardPrimitiveSurface,
    };
  },
  'ui.card-title': (context) => ({
    props: { children: resolveCardCopy(context).title },
    surfaceClassName: cardPrimitiveSurface,
  }),
  'ui.page-container': (context) => ({
    props: { children: pagePrimitiveChildren(resolvePagePrimitiveCopy(context)) },
    surfaceClassName: pagePrimitiveSurface,
  }),
  'ui.page-cta-group': (context) => {
    const copy = resolvePagePrimitiveCopy(context);
    return {
      props: {
        align: resolveDeclaredVariant(context, 'align', {
          center: 'center',
          start: 'start',
        }),
        children: pageCtaChildren(copy),
      },
      surfaceClassName: pagePrimitiveSurface,
    };
  },
  'ui.page-mockup-frame': (context) => ({
    props: { children: pagePrimitiveChildren(resolvePagePrimitiveCopy(context)) },
    surfaceClassName: pagePrimitiveSurface,
  }),
  'ui.page-section': (context) => ({
    props: { children: pagePrimitiveChildren(resolvePagePrimitiveCopy(context)) },
    surfaceClassName: pagePrimitiveSurface,
  }),
  'ui.page-section-header': (context) => {
    const copy = resolvePagePrimitiveCopy(context);
    return {
      props: {
        align: resolveDeclaredVariant(context, 'align', {
          center: 'center',
          start: 'start',
        }),
        description: resolveDeclaredVariant(context, 'description', {
          missing: undefined,
          present: copy.description,
        }),
        measure: resolveDeclaredVariant(context, 'measure', {
          default: 'default',
          narrow: 'narrow',
        }),
        title: copy.title,
      },
      surfaceClassName: pagePrimitiveSurface,
    };
  },
  'ui.page-stack': (context) => {
    const copy = resolvePagePrimitiveCopy(context);
    return {
      props: {
        children: [0, 1, 2].map((index) => createElement(
          'div',
          {
            className: 'min-w-0 rounded-lg border bg-white p-3 [overflow-wrap:anywhere]',
            key: index,
          },
          `${copy.body} ${index + 1}`,
        )),
        gap: resolveDeclaredVariant(context, 'gap', {
          lg: 'lg',
          md: 'md',
          sm: 'sm',
          xl: 'xl',
        }),
      },
      surfaceClassName: pagePrimitiveSurface,
    };
  },
  'ui.page-text-block': (context) => ({
    props: {
      align: resolveDeclaredVariant(context, 'align', {
        center: 'center',
        start: 'start',
      }),
      children: pagePrimitiveChildren(resolvePagePrimitiveCopy(context)),
      measure: resolveDeclaredVariant(context, 'measure', {
        default: 'default',
        narrow: 'narrow',
      }),
    },
    surfaceClassName: pagePrimitiveSurface,
  }),
  'ui.status-badge': (context) => {
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      hover: 'hover',
    });
    const live = resolveDeclaredVariant(context, 'live', {
      always: { live: true, liveMode: 'always' },
      hover: { live: true, liveMode: 'hover' },
      off: { live: false, liveMode: 'always' },
    });
    if (interaction === 'hover' && context.variants.live !== 'hover') {
      throw new Error(`지원하지 않는 Visual QA interaction state: interactions=${interaction}, live=${context.variants.live ?? '<missing>'}`);
    }
    if (interaction === 'hover' && context.interactionTargetId !== 'hover-scope') {
      throw new Error(`지원하지 않는 Visual QA interaction target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    const customColors = resolveDeclaredVariant(context, 'customColors', {
      custom: { dotColor: '#facc15', filledTextColor: '#f8fafc' },
      default: { dotColor: undefined, filledTextColor: undefined },
    });
    return {
      props: {
        ...customColors,
        'data-testid': 'visual-qa-status-badge',
        label: resolveStatusBadgeLabel(context),
        live: live.live,
        liveMode: live.liveMode,
        marker: resolveDeclaredVariant(context, 'marker', {
          arrow: 'arrow',
          check: 'check',
          dash: 'dash',
          diamond: 'diamond',
          dot: 'dot',
          x: 'x',
        }),
        size: resolveDeclaredVariant(context, 'size', {
          md: 'md',
          sm: 'sm',
          xs: 'xs',
        }),
        tone: resolveDeclaredVariant(context, 'tone', {
          brand: 'brand',
          danger: 'danger',
          info: 'info',
          neutral: 'neutral',
          success: 'success',
          violet: 'violet',
          warning: 'warning',
        }),
        variant: resolveDeclaredVariant(context, 'visualVariant', {
          filled: 'filled',
          line: 'line',
          quiet: 'quiet',
        }),
      },
      captureSelector: '[data-testid="visual-qa-status-badge"]',
      surfaceClassName: statusBadgeSurface,
    };
  },
  'ui.input': (context) => {
    const availability = resolveDeclaredVariant(context, 'availability', {
      disabled: 'disabled',
      enabled: 'enabled',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
    });
    if (interaction !== 'default' && availability === 'disabled') {
      throw new Error(`지원하지 않는 Visual QA interaction state: interactions=${interaction}, availability=${availability}`);
    }
    if (interaction !== 'default' && context.interactionTargetId !== 'field') {
      throw new Error(`지원하지 않는 Visual QA interaction target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    const type = resolveDeclaredVariant(context, 'type', {
      date: 'date',
      'datetime-local': 'datetime-local',
      email: 'email',
      file: 'file',
      number: 'number',
      password: 'password',
      text: 'text',
      time: 'time',
    });
    const data = context.states.data;
    const constrainedDataTypes = new Set(['date', 'datetime-local', 'number', 'time']);
    if ((type === 'file' && data !== 'empty')
      || (constrainedDataTypes.has(type) && data !== 'empty' && data !== 'single')) {
      throw new Error(`지원하지 않는 Visual QA input data/type 조합: data=${data ?? '<missing>'}, type=${type}`);
    }
    const stressCopy = resolveTextControlCopy(context);
    const singleValues: Record<string, string | number> = {
      date: '2026-08-23',
      'datetime-local': '2026-08-23T18:30',
      email: 'qa@example.com',
      number: 42,
      password: 'Example123!',
      text: '입력 내용',
      time: '18:30',
    };
    const defaultValue = type === 'file'
      ? undefined
      : data === 'single'
        ? singleValues[type]
        : stressCopy;
    return {
      props: {
        'aria-invalid': resolveDeclaredVariant(context, 'invalid', {
          false: false,
          true: true,
        }),
        'aria-label': 'Visual QA 입력 필드',
        'data-testid': 'visual-qa-input',
        defaultValue,
        disabled: availability === 'disabled',
        placeholder: data === 'empty' && type !== 'file' ? '입력해 주세요' : undefined,
        type,
      },
      captureSelector: '[data-testid="visual-qa-input"]',
      surfaceClassName: formControlSurface,
    };
  },
  'ui.textarea': (context) => {
    const availability = resolveDeclaredVariant(context, 'availability', {
      disabled: 'disabled',
      enabled: 'enabled',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      input: 'input',
    });
    if (interaction !== 'default' && availability === 'disabled') {
      throw new Error(`지원하지 않는 Visual QA interaction state: interactions=${interaction}, availability=${availability}`);
    }
    if (interaction === 'input' && context.states.data !== 'empty') {
      throw new Error(`지원하지 않는 Visual QA interaction state: interactions=input, data=${context.states.data ?? '<missing>'}`);
    }
    if (interaction !== 'default' && context.interactionTargetId !== 'field') {
      throw new Error(`지원하지 않는 Visual QA interaction target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    return {
      props: {
        'aria-invalid': resolveDeclaredVariant(context, 'invalid', {
          false: false,
          true: true,
        }),
        'aria-label': 'Visual QA 여러 줄 입력 필드',
        'data-testid': 'visual-qa-textarea',
        defaultValue: resolveTextControlCopy(context),
        disabled: availability === 'disabled',
        placeholder: resolveDeclaredVariant(context, 'placeholder', {
          missing: undefined,
          present: '여러 줄 내용을 입력해 주세요',
        }),
      },
      captureSelector: '[data-testid="visual-qa-textarea"]',
      surfaceClassName: formControlSurface,
    };
  },
  'ui.autosize-textarea': (context) => {
    const availability = resolveDeclaredVariant(context, 'availability', {
      disabled: 'disabled',
      enabled: 'enabled',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      input: 'input',
    });
    if (interaction !== 'default' && availability === 'disabled') {
      throw new Error(`지원하지 않는 Visual QA interaction state: interactions=${interaction}, availability=${availability}`);
    }
    if (interaction === 'input' && context.states.data !== 'empty') {
      throw new Error(`지원하지 않는 Visual QA interaction state: interactions=input, data=${context.states.data ?? '<missing>'}`);
    }
    if (interaction !== 'default' && context.interactionTargetId !== 'field') {
      throw new Error(`지원하지 않는 Visual QA interaction target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    const usage = resolveDeclaredVariant(context, 'usage', {
      'comment-modal': {
        className: 'w-full resize-none border-none bg-transparent text-19 leading-relaxed text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-0 min-h-[120px]',
        maxRows: 10,
        minRows: 3,
      },
      composer: {
        className: 'w-full resize-none border-none bg-transparent text-base sm:text-body leading-relaxed text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-0',
        maxRows: 10,
        minRows: 2,
      },
      'write-modal': {
        className: 'w-full resize-none border-none bg-transparent text-base sm:text-19 lg:text-20 leading-relaxed text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-0 min-h-[150px] sm:min-h-[200px] lg:min-h-[300px]',
        maxRows: 15,
        minRows: 8,
      },
    });
    return {
      props: {
        'aria-label': 'Visual QA 자동 높이 입력 필드',
        'data-testid': 'visual-qa-autosize-textarea',
        className: usage.className,
        defaultValue: resolveTextControlCopy(context),
        disabled: availability === 'disabled',
        maxRows: usage.maxRows,
        minRows: usage.minRows,
        placeholder: context.states.data === 'empty' ? '응원 메시지를 입력해 주세요' : undefined,
      },
      captureSelector: '[data-testid="visual-qa-autosize-textarea"]',
      surfaceClassName: formControlSurface,
    };
  },
  'ui.button': (context) => resolveButtonState(context, {
    includeInvalid: true,
    sizes: {
      default: 'default',
      icon: 'icon',
      iconTouch: 'iconTouch',
      lg: 'lg',
      sm: 'sm',
      touch: 'touch',
      touchLg: 'touchLg',
    },
    testId: 'visual-qa-button',
    variants: {
      brand: 'brand',
      brandOutline: 'brandOutline',
      default: 'default',
      destructive: 'destructive',
      ghost: 'ghost',
      link: 'link',
      outline: 'outline',
      secondary: 'secondary',
    },
  }),
  'ui.plain-dialog': (context) => {
    const copy = resolvePlainDialogCopy(context);
    const header = resolveDeclaredVariant(context, 'header', {
      full: { description: copy.description, hideHeader: false, title: copy.title },
      'title-only': { description: undefined, hideHeader: false, title: copy.title },
      'description-only': { description: copy.description, hideHeader: false, title: undefined },
      empty: { description: undefined, hideHeader: false, title: undefined },
      hidden: { description: copy.description, hideHeader: true, title: copy.title },
    });
    const close = resolveDeclaredVariant(context, 'close', {
      hidden: true,
      visible: false,
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    if (interaction !== 'default' && (close || header.hideHeader)) {
      throw new Error(`지원하지 않는 Visual QA plain dialog interaction: interactions=${interaction}`);
    }
    if (interaction !== 'default' && context.interactionTargetId !== 'close') {
      throw new Error(`지원하지 않는 Visual QA interaction target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    return {
      props: {
        ariaLabel: 'Visual QA 대화상자',
        children: plainDialogBody(copy.body),
        contentTestId: 'visual-qa-plain-dialog',
        description: header.description,
        footer: resolveDeclaredVariant(context, 'footer', {
          actions: plainDialogFooter(copy.primary, copy.secondary),
          none: undefined,
        }),
        hideCloseButton: close,
        hideHeader: header.hideHeader,
        onClose: () => {},
        open: true,
        placement: resolveDeclaredVariant(context, 'placement', {
          bottom: 'bottom',
          center: 'center',
          right: 'right',
        }),
        title: header.title,
      },
      captureSelector: '[data-testid="visual-qa-plain-dialog"]',
      surfaceClassName: 'block min-h-0 w-full overflow-visible bg-transparent p-0 shadow-none',
    };
  },
  'ui.plain-menu': (context) => {
    const align = resolveDeclaredVariant(context, 'align', {
      end: 'end',
      start: 'start',
    });
    const count = resolveDeclaredVariant(context, 'density', {
      maximum: 12,
      one: 1,
    });
    const open = resolveDeclaredVariant(context, 'open', {
      closed: false,
      open: true,
    });
    const role = resolveDeclaredVariant<'dialog' | 'menu'>(context, 'role', {
      dialog: 'dialog',
      menu: 'menu',
    });
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      'focus-visible': 'focus-visible',
      hover: 'hover',
      pressed: 'pressed',
    });
    if (!open && (align !== 'start' || count !== 1 || role !== 'menu')) {
      throw new Error('지원하지 않는 Visual QA closed plain menu variant combination');
    }
    if (!open && context.states.data !== 'single') {
      throw new Error(`지원하지 않는 Visual QA closed plain menu data: ${context.states.data ?? '<missing>'}`);
    }
    if (interaction !== 'default' && context.interactionTargetId !== 'trigger') {
      throw new Error(`지원하지 않는 Visual QA interaction target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    return {
      props: {
        align,
        ariaLabel: role === 'dialog' ? 'Visual QA 메뉴 대화상자' : 'Visual QA 작업 메뉴',
        children: plainMenuItems(resolvePlainMenuCopy(context), count, role),
        onOpenChange: () => {},
        open,
        role,
        trigger: createElement('button', {
          'aria-expanded': open,
          'aria-haspopup': role,
          className: 'min-h-11 max-w-full rounded-lg border bg-white px-4 py-2 font-semibold focus-visible:outline-none focus-visible:ring',
          'data-testid': 'visual-qa-plain-menu-trigger',
          type: 'button',
        }, '메뉴 열기'),
      },
      captureSelector: open
        ? '[data-vqa-harness-surface]'
        : '[data-testid="visual-qa-plain-menu-trigger"]',
      surfaceClassName: `flex ${open ? 'min-h-[620px]' : 'min-h-28'} w-full max-w-[320px] items-start ${align === 'start' ? 'justify-start' : 'justify-end'} overflow-visible bg-transparent p-4 shadow-none`,
    };
  },
  'ui.plain-button': (context) => resolveButtonState(context, {
    includeInvalid: false,
    sizes: {
      default: 'default',
      icon: 'icon',
      iconTouch: 'iconTouch',
      sm: 'sm',
      touch: 'touch',
    },
    testId: 'visual-qa-plain-button',
    variants: {
      default: 'default',
      destructive: 'destructive',
      ghost: 'ghost',
      link: 'link',
      outline: 'outline',
      secondary: 'secondary',
    },
  }),
  'ui.profile-avatar': (context) => {
    const ring = resolveDeclaredVariant(context, 'ring', {
      none: { showRing: false },
      default: { ringVariant: 'default', showRing: true },
      cheer: { ringVariant: 'cheer', showRing: true },
      cheerFeed: { ringVariant: 'cheerFeed', showRing: true },
      custom: { ringClassName: 'p-1 bg-amber-300 dark:bg-amber-600', showRing: true },
    });
    return {
      props: {
        ...resolveProfileAvatarData(context),
        ...resolveDeclaredVariant(context, 'dimensions', profileAvatarDimensions),
        ...ring,
        sizes: '(max-width: 640px) 96px, 96px',
        srcSet: `${retroAvatarDataUrl} 1x, ${retroAvatarDataUrl} 2x`,
      },
      captureSelector: ring.showRing
        ? '[data-testid="profile-avatar-frame"]'
        : '[data-testid="profile-avatar-image"], [data-testid="profile-avatar-fallback"]',
      surfaceClassName: 'flex min-h-32 w-full max-w-[320px] items-center justify-center overflow-visible bg-transparent p-4 shadow-none',
    };
  },
  'ui.table': (context) => {
    const copy = resolveTableCopy(context);
    const columnCount = resolveTableColumnCount(context);
    const rowCount = resolveDeclaredVariant(context, 'rows', {
      maximum: 8,
      one: 1,
    });
    const caption = resolveDeclaredVariant(context, 'caption', {
      missing: null,
      present: createElement(TableCaption, { key: 'caption' }, copy.caption),
    });
    return {
      props: {
        children: [
          caption,
          createElement(
            TableHeader,
            { key: 'header' },
            createElement(TableRow, null, ...tableHeadCells(copy, columnCount)),
          ),
          createElement(
            TableBody,
            { key: 'body' },
            ...tableBodyRows(copy, columnCount, rowCount, false),
          ),
        ].filter((child) => child !== null),
      },
      captureSelector: '[data-slot="table-container"]',
      surfaceClassName: tablePrimitiveSurface,
    };
  },
  'ui.table-body': (context) => {
    const copy = resolveTableCopy(context);
    const columnCount = resolveTableColumnCount(context);
    const rowCount = resolveDeclaredVariant(context, 'rows', {
      maximum: 8,
      one: 1,
    });
    const selected = resolveDeclaredVariant(context, 'selected', {
      false: false,
      true: true,
    });
    return {
      props: { children: tableBodyRows(copy, columnCount, rowCount, selected) },
      captureSelector: '[data-slot="table-body"]',
      semanticHost: 'table',
      surfaceClassName: tablePrimitiveSurface,
    };
  },
  'ui.table-caption': (context) => ({
    props: { children: resolveTableCopy(context).caption },
    captureSelector: '[data-slot="table-caption"]',
    semanticHost: 'table',
    surfaceClassName: tablePrimitiveSurface,
  }),
  'ui.table-cell': (context) => {
    const copy = resolveTableCopy(context);
    return {
      props: {
        children: resolveDeclaredVariant(context, 'content', {
          checkbox: tableCheckbox('행 선택'),
          text: copy.cell,
        }),
      },
      captureSelector: '[data-slot="table-cell"]',
      semanticHost: 'table-body-row',
      surfaceClassName: tablePrimitiveSurface,
    };
  },
  'ui.table-footer': (context) => {
    const copy = resolveTableCopy(context);
    const columnCount = resolveTableColumnCount(context);
    return {
      props: {
        children: createElement(
          TableRow,
          null,
          ...tableBodyCells(copy, columnCount),
        ),
      },
      captureSelector: '[data-slot="table-footer"]',
      semanticHost: 'table',
      surfaceClassName: tablePrimitiveSurface,
    };
  },
  'ui.table-head': (context) => {
    const copy = resolveTableCopy(context);
    return {
      props: {
        children: resolveDeclaredVariant(context, 'content', {
          checkbox: tableCheckbox('전체 행 선택'),
          text: copy.head,
        }),
      },
      captureSelector: '[data-slot="table-head"]',
      semanticHost: 'table-header-row',
      surfaceClassName: tablePrimitiveSurface,
    };
  },
  'ui.table-header': (context) => {
    const copy = resolveTableCopy(context);
    return {
      props: {
        children: createElement(
          TableRow,
          null,
          ...tableHeadCells(copy, resolveTableColumnCount(context)),
        ),
      },
      captureSelector: '[data-slot="table-header"]',
      semanticHost: 'table',
      surfaceClassName: tablePrimitiveSurface,
    };
  },
  'ui.table-row': (context) => {
    const copy = resolveTableCopy(context);
    const interaction = requireStateValueFromMap(context, 'interactions', {
      default: 'default',
      hover: 'hover',
    });
    if (interaction === 'hover' && context.interactionTargetId !== 'row') {
      throw new Error(`지원하지 않는 Visual QA interaction target: ${context.interactionTargetId ?? '<missing>'}`);
    }
    const selected = resolveDeclaredVariant(context, 'selected', {
      false: undefined,
      true: 'selected',
    });
    return {
      props: {
        children: tableBodyCells(copy, resolveTableColumnCount(context)),
        'data-state': selected,
        'data-testid': 'visual-qa-table-row',
      },
      captureSelector: '[data-slot="table-row"]',
      semanticHost: 'table-body',
      surfaceClassName: tablePrimitiveSurface,
    };
  },
  'ui.skeleton.loading': (context) => {
    requireStateValue(context, 'data', 'loading');
    const className = resolveDeclaredVariant(context, 'usage', skeletonUsageClasses);
    return {
      props: {
        className,
        'aria-label': '콘텐츠를 불러오는 중',
      },
      surfaceClassName: skeletonSurfaceClassName(className),
    };
  },
  'verification-required.dialog': (context) => {
    const mode = resolveDeclaredVariant(context, 'mode', {
      normal: 'normal',
      security: 'security',
    });
    requireStateValue(
      context,
      'permissions',
      mode === 'security' ? 'user' : 'user-unverified',
    );
    if (mode === 'normal' && context.variants.copyPreset !== 'none') {
      throw new Error(`지원하지 않는 Visual QA state/variant 조합: copyPreset=${context.variants.copyPreset}, mode=${mode}`);
    }
    return {
      props: {
        ...resolveVerificationRequiredDialogCopy(context),
        isOpen: true,
        mode,
        onClose: () => {},
        onConfirm: () => {},
      },
      captureSelector: '[data-testid="verification-required-dialog"]',
    };
  },
  'viewport-deferred': (context) => {
    const phase = resolveDeclaredVariant(context, 'phase', {
      content: 'content',
      fallback: 'fallback',
    });
    return {
      props: {
        ...resolveViewportDeferredSlots(context),
        className: 'w-full min-w-0 overflow-x-clip',
        containerTestId: 'visual-qa-viewport-deferred',
      },
      captureSelector: `[data-testid="visual-qa-viewport-deferred"] [data-vqa-deferred-slot="${phase}"]`,
      surfaceClassName: 'block min-h-0 w-full overflow-visible p-0',
    };
  },
  'welcome-guide': (context) => {
    const dataState = context.states.data;
    if (dataState !== 'populated' && dataState !== 'broken-image') {
      throw new Error(`지원하지 않는 Visual QA state: data=${dataState ?? '<missing>'}`);
    }
    return {
      props: {
        logoSrc: dataState === 'broken-image'
          ? 'data:image/png;base64,bm90LXZhbGlk'
          : undefined,
      },
      captureSelector: '[data-testid="home-onboarding-inline"]',
      surfaceClassName: 'block min-h-0 w-full overflow-visible bg-transparent p-0 shadow-none',
    };
  },
};

export const KNOWN_COMPONENT_STATE_ADAPTER_IDS = Object.freeze(Object.keys(adapters).sort());

export const resolveComponentStateAdapter = (
  adapterId: string,
  context: ComponentStateAdapterContext,
) => {
  const adapter = adapters[adapterId];
  if (!adapter) throw new Error(`등록되지 않은 Visual QA state adapter: ${adapterId}`);
  return adapter(context);
};
