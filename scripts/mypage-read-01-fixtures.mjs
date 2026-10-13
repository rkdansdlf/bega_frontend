/**
 * Batch-local, read-only fixtures for the /mypage profile/statistics audit.
 * These are intentionally separate from the repository-wide reflow registry so
 * the previous evidence remains immutable and this batch's data states are
 * identifiable on their own.
 */

const LONG_NAME = '모바일 화면에서 확인하는 아주 긴 사용자 이름입니다';
const LONG_HANDLE = 'mypage_read_01_long_handle_for_reflow_check';
const LONG_STADIUM = '서울특별시 송파구 올림픽로 25 잠실종합운동장 야구장';
const LONG_MEMO = '직관 기록의 긴 메모가 통계 화면의 주변 레이아웃을 밀어내지 않는지 확인하기 위한 로컬 fixture입니다.';

const makeEntry = (id, date, gameScope = 'home') => ({
  id,
  date,
  type: 'attended',
  emoji: '😊',
  emojiName: '행복',
  winningName: id % 3 === 0 ? 'DRAW' : 'WIN',
  gameId: 20260000 + id,
  memo: LONG_MEMO,
  photos: [],
  gameScope,
  team: 'HH',
  stadium: LONG_STADIUM,
  section: '내야 지정석',
  block: '312',
  seatRow: '14',
  seatNumber: String(id),
  ticketVerified: true,
});

const scoped = ({ totalCount, wins, draws, losses, stadium = LONG_STADIUM, monthly, home, away, opponent, emoji }) => ({
  totalCount,
  totalWins: wins,
  totalLosses: losses,
  totalDraws: draws,
  winRate: totalCount ? (wins / totalCount) * 100 : 0,
  mostVisitedStadium: totalCount ? stadium : null,
  mostVisitedCount: totalCount ? Math.max(1, totalCount - 2) : 0,
  monthlyVisitCounts: monthly,
  stadiumVisitCounts: totalCount ? {
    [stadium]: Math.max(1, totalCount - 2),
    '대전 한화생명볼파크': 2,
  } : {},
  homeVisitCount: home,
  awayVisitCount: away,
  scheduledCount: 0,
  emojiCounts: emoji,
  opponentWinRates: opponent,
});

const normalOpponent = {
  'LG': { wins: 7, draws: 1, losses: 2, winRate: 70 },
  '두산': { wins: 4, draws: 1, losses: 5, winRate: 40 },
};

const normalScoped = {
  all: scoped({
    totalCount: 24,
    wins: 13,
    draws: 2,
    losses: 9,
    monthly: { 3: 2, 4: 3, 5: 4, 6: 2, 7: 3, 8: 5, 9: 3, 10: 2 },
    home: 14,
    away: 10,
    opponent: normalOpponent,
    emoji: { '행복': 12, '신남': 7, '아쉬움': 5 },
  }),
  home: scoped({
    totalCount: 14,
    wins: 8,
    draws: 1,
    losses: 5,
    monthly: { 3: 1, 4: 2, 5: 2, 6: 2, 7: 2, 8: 3, 9: 1, 10: 1 },
    home: 14,
    away: 0,
    opponent: normalOpponent,
    emoji: { '행복': 7, '신남': 4, '아쉬움': 3 },
  }),
  away: scoped({
    totalCount: 10,
    wins: 5,
    draws: 1,
    losses: 4,
    monthly: { 3: 1, 4: 1, 5: 2, 6: 0, 7: 1, 8: 2, 9: 2, 10: 1 },
    home: 0,
    away: 10,
    opponent: normalOpponent,
    emoji: { '행복': 5, '신남': 3, '아쉬움': 2 },
  }),
};

const zeroScoped = {
  all: scoped({ totalCount: 0, wins: 0, draws: 0, losses: 0, monthly: {}, home: 0, away: 0, opponent: {}, emoji: {} }),
  home: scoped({ totalCount: 0, wins: 0, draws: 0, losses: 0, monthly: {}, home: 0, away: 0, opponent: {}, emoji: {} }),
  away: scoped({ totalCount: 0, wins: 0, draws: 0, losses: 0, monthly: {}, home: 0, away: 0, opponent: {}, emoji: {} }),
};

const makeStatistics = (scope) => {
  const all = scope.all;
  return {
    ...all,
    monthlyCount: all.totalCount,
    yearlyCount: all.totalCount,
    yearlyWins: all.totalWins,
    yearlyWinRate: all.winRate,
    happiestMonth: '8월',
    happiestCount: 5,
    firstDiaryDate: '2026-03-01',
    cheerPostCount: 12345,
    mateParticipationCount: 6789,
    currentWinStreak: 3,
    longestWinStreak: 8,
    currentLossStreak: 0,
    opponentWinRates: all.opponentWinRates || {},
    bestOpponent: 'LG',
    worstOpponent: '두산',
    dayOfWeekStats: {},
    luckyDay: '토요일',
    earnedBadges: [],
    scopedStatistics: scope,
  };
};

const PROFILE = {
  id: 123,
  email: 'mypage-read-01@example.test',
  name: LONG_NAME,
  handle: LONG_HANDLE,
  favoriteTeam: 'HH',
  role: 'ROLE_USER',
  provider: 'LOCAL',
  hasPassword: true,
  profileImageUrl: null,
  bio: LONG_MEMO,
  cheerPoints: 9876543,
};

export const MYPAGE_READ_01_FIXTURES = {
  populated: {
    profile: PROFILE,
    followCounts: { followerCount: 999999, followingCount: 888888, isFollowedByMe: false, notifyNewPosts: false },
    entries: Array.from({ length: 8 }, (_, index) => makeEntry(index + 1, `2026-${String(index + 3).padStart(2, '0')}-01`, index % 2 ? 'away' : 'home')),
    statistics: makeStatistics(normalScoped),
  },
  zero: {
    profile: { ...PROFILE, name: '기록이 없는 사용자', handle: 'empty_stats_user' },
    followCounts: { followerCount: 0, followingCount: 0, isFollowedByMe: false, notifyNewPosts: false },
    entries: [],
    statistics: makeStatistics(zeroScoped),
  },
  error: {
    profile: { ...PROFILE, name: '통계 오류 확인 사용자', handle: 'stats_error_user' },
    followCounts: { followerCount: 12, followingCount: 3, isFollowedByMe: false, notifyNewPosts: false },
    entries: [],
    statistics: null,
  },
};

export const MYPAGE_READ_01_REQUESTS = {
  profile: /^\/api\/auth\/mypage(?:\?|$)/,
  followCounts: /^\/api\/users\/me\/follow-counts(?:\?|$)/,
  entries: /^\/api\/diary\/entries(?:\?|$)/,
  statistics: /^\/api\/diary\/statistics(?:\?|$)/,
};

export const jsonResponse = (body, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

