/**
 * Populated-state fixtures for the 320px reflow gate.
 *
 * The gate stubs the API, which kept every route in its empty or error state —
 * and a table with no rows cannot overflow, so the most overflow-prone surfaces
 * were the ones going unchecked.
 *
 * These carry worst-case content rather than typical content. For a reflow gate
 * the question is not "does today's data fit" but "does the layout survive
 * content", so the strings here are long free text, long handles, and
 * unbreakable tokens (URLs, emails) — the exact shapes behind every defect found
 * by hand earlier: a box that cannot shrink or wrap.
 *
 * Worst case still has to be *plausible*. Fields users control freely (post
 * bodies, nicknames, handles) get the long treatment; fields with real-world
 * limits do not. A player name stays short, because `break-keep` deliberately
 * refuses to split a Korean name mid-word and an 11-character unbroken name
 * would fail the gate on content that cannot exist.
 *
 * Shapes follow the wire types the app normalizes, not the normalized types.
 */

const LONG_KOREAN = '한화이글스팬으로서오늘경기는정말치열했고9회말역전까지숨막히는승부였습니다다음경기도꼭이기길바랍니다';
const LONG_HANDLE = 'baseballguide_supporter_2026_longhandle';
const UNBREAKABLE_URL = 'https://www.begabaseball.xyz/cheer/posts/1234567890/detail?utm_source=stress';
const UNBREAKABLE_EMAIL = 'baseballguide251021@gmail.com';

const post = (id) => ({
  id,
  teamId: 'HH',
  postType: 'NORMAL',
  author: '아주긴닉네임을가진응원단장님',
  authorId: 500 + id,
  authorHandle: LONG_HANDLE,
  authorProfileImageUrl: null,
  authorTeamId: 'HH',
  content: `${LONG_KOREAN} ${UNBREAKABLE_URL} ${UNBREAKABLE_EMAIL} #한화이글스 #직관후기 #끝까지간다`,
  createdAt: '2026-08-06T09:00:00',
  updatedAt: '2026-08-06T09:00:00',
  likes: 1234,
  likedByMe: false,
  liked: false,
  comments: 567,
  bookmarkCount: 89,
  isBookmarked: false,
  repostCount: 12,
  repostedByMe: false,
  repostOfId: null,
  repostType: null,
  views: 98765,
  isHot: true,
  isOwner: false,
  imageUrls: [],
});

const page = (items) => ({
  content: items,
  last: true,
  totalPages: 1,
  totalElements: items.length,
  size: items.length,
  number: 0,
});

/**
 * Endpoint pattern -> response body. Checked in order; the first match wins,
 * and anything unmatched keeps the existing 503 so its empty state is still
 * exercised.
 */
const envelope = (data) => ({ success: true, data });

const auditParty = {
  id: 1,
  hostId: 123,
  hostHandle: 'testuser',
  hostName: '비주얼 QA 호스트',
  hostBadge: 'VERIFIED',
  hostAverageRating: 4.8,
  hostReviewCount: 15,
  hostProfileImageUrl: null,
  hostFavoriteTeam: 'HH',
  status: 'CHECKED_IN',
  gameDate: '2026-08-06',
  gameTime: '18:30',
  stadium: '대전 한화생명볼파크',
  teamId: 'HH',
  homeTeam: 'HH',
  awayTeam: 'LT',
  section: '3루 내야지정석',
  seatDetail: '312블록 14열',
  maxParticipants: 4,
  currentParticipants: 2,
  ticketPrice: 26000,
  reservationDepositAmount: 10000,
  ticketVerified: true,
  description: `${LONG_KOREAN} #직관메이트 #함께응원`,
  members: [
    { initial: '비', profileImageUrl: null, role: '호스트', host: true },
    { initial: '참', profileImageUrl: null, role: '참여자', host: false },
  ],
  createdAt: '2026-08-01T09:00:00',
};

const auditPartyForRoute = (pagePathname = '') => {
  if (pagePathname.endsWith('/apply')) {
    return {
      ...auditParty,
      hostId: 999,
      hostHandle: 'visualqa_host',
      status: 'PENDING',
      gameDate: '2026-09-20',
      currentParticipants: 1,
      members: [auditParty.members[0]],
    };
  }
  return auditParty;
};

export const FIXTURES = [
  {
    name: 'stadium guide list',
    match: (url) => /\/api\/stadiums(?:\?|$)/.test(url) && !/\/places(?:\?|$)/.test(url),
    body: () => [{
      stadiumId: 'JAMSIL',
      stadiumName: '서울 · 잠실야구장',
      team: 'LG/두산',
      lat: 37.5122,
      lng: 127.0719,
      address: '서울특별시 송파구 올림픽로 25',
      phone: null,
    }],
  },
  {
    name: 'stadium guide places',
    match: (url) => /\/api\/stadiums\/JAMSIL\/places(?:\?|$)/.test(url),
    body: () => [{
      id: 1,
      stadiumName: '잠실야구장',
      category: 'food',
      name: '비주얼 QA 야구장 먹거리',
      description: '합성 검증용 장소 데이터',
      lat: 37.5124,
      lng: 127.0721,
      address: '서울 송파구 올림픽로 25',
      phone: null,
      rating: 4.5,
      openTime: null,
      closeTime: null,
    }],
  },
  {
    name: 'my page diary entries',
    match: (url) => /\/api\/diary\/entries(?:\?|$)/.test(url),
    body: () => [],
  },
  {
    name: 'my page diary statistics',
    match: (url) => /\/api\/diary\/statistics(?:\?|$)/.test(url),
    body: () => ({
      totalCount: 1,
      totalWins: 1,
      totalLosses: 0,
      totalDraws: 0,
      winRate: 100,
      monthlyCount: 1,
      yearlyCount: 1,
      yearlyWins: 1,
      yearlyWinRate: 100,
      mostVisitedStadium: '서울 · 잠실야구장',
      mostVisitedCount: 1,
      monthlyVisitCounts: { 8: 1 },
      stadiumVisitCounts: { '서울 · 잠실야구장': 1 },
      homeVisitCount: 1,
      awayVisitCount: 0,
      scheduledCount: 0,
      happiestMonth: '8월',
      happiestCount: 1,
      firstDiaryDate: '2026-08-01',
      cheerPostCount: 0,
      mateParticipationCount: 0,
      currentWinStreak: 1,
      longestWinStreak: 1,
      currentLossStreak: 0,
      opponentWinRates: {},
      bestOpponent: '',
      worstOpponent: '',
      dayOfWeekStats: {},
      luckyDay: '',
      earnedBadges: [],
    }),
  },
  {
    name: 'cheer post detail',
    match: (url) => /\/api\/cheer\/posts\/1(\?|$)/.test(url),
    body: () => ({ ...post(1), isOwner: true }),
  },
  {
    name: 'cheer post comments',
    match: (url) => /\/api\/cheer\/posts\/1\/comments(\?|$)/.test(url),
    body: () => page([]),
  },
  {
    name: 'cheer post images',
    match: (url) => /\/api\/cheer\/posts\/1\/images(\?|$)/.test(url),
    body: () => [],
  },
  {
    name: 'public profile',
    match: (url) => /\/api\/users\/profile\/(?:%40)?testuser(\?|$)/i.test(url),
    body: () => envelope({
      name: 'TestUser',
      handle: 'testuser',
      favoriteTeam: 'HH',
      profileImageUrl: null,
      bio: LONG_KOREAN,
      cheerPoints: 12345,
    }),
  },
  {
    name: 'public profile follow counts',
    match: (url) => /\/api\/users\/profile\/(?:%40)?testuser\/follow-counts(\?|$)/i.test(url),
    body: () => ({
      followerCount: 128,
      followingCount: 42,
      isFollowedByMe: false,
      notifyNewPosts: false,
      blockedByMe: false,
      blockingMe: false,
    }),
  },
  {
    name: 'public profile posts',
    match: (url) => /\/api\/cheer\/user\/testuser\/posts(\?|$)/i.test(url),
    body: () => page([1, 2, 3].map(post)),
  },
  {
    name: 'mate party detail',
    match: (url) => /\/api\/parties\/1(\?|$)/.test(url),
    body: (_url, context = {}) => auditPartyForRoute(context.pagePathname),
  },
  {
    name: 'mate party applications',
    match: (url) => /\/api\/applications\/party\/1(\?|$)/.test(url),
    body: () => [{
      id: 11,
      partyId: 1,
      applicantId: 456,
      applicantHandle: 'visualparticipant',
      applicantName: '비주얼 참여자',
      applicantBadge: 'TRUSTED',
      applicantRating: 4.7,
      message: '함께 즐겁게 응원하겠습니다.',
      depositAmount: 10000,
      paymentType: 'DEPOSIT',
      paymentStatus: 'PAID',
      settlementStatus: 'PENDING',
      isApproved: true,
      isRejected: false,
      ticketVerified: true,
      createdAt: '2026-08-02T10:00:00Z',
    }],
  },
  {
    name: 'mate current application',
    match: (url) => /\/api\/applications\/party\/1\/mine(\?|$)/.test(url),
    body: () => null,
  },
  {
    name: 'mate check-ins',
    match: (url) => /\/api\/checkin\/party\/1(\?|$)/.test(url),
    body: () => [
      { id: 21, partyId: 1, userHandle: 'testuser', userName: 'TestUser', location: '대전', checkedInAt: '2026-08-06T17:40:00Z' },
      { id: 22, partyId: 1, userHandle: 'visualparticipant', userName: '비주얼 참여자', location: '대전', checkedInAt: '2026-08-06T17:45:00Z' },
    ],
  },
  {
    name: 'mate chat messages',
    match: (url) => /\/api\/chat\/party\/1(\?|$)/.test(url),
    body: () => [
      { id: 31, partyId: 1, senderId: 123, senderName: 'TestUser', message: '경기 시작 전에 3루 출입구에서 만나요.', createdAt: '2026-08-06T08:00:00Z' },
      { id: 32, partyId: 1, senderId: 456, senderName: '비주얼 참여자', message: LONG_KOREAN, createdAt: '2026-08-06T08:05:00Z' },
    ],
  },
  {
    name: 'mate party reviews',
    match: (url) => /\/api\/reviews\/party\/1(\?|$)/.test(url),
    body: () => [],
  },
  {
    // Returns the page object bare, not wrapped in {success,data} — confirmed
    // against the live endpoint, which answers {"content":[...]}.
    //
    // /notice reads this same endpoint with postType=NOTICE rather than a
    // /api/notice of its own, so both routes are served from here.
    name: 'cheer feed and notices',
    match: (url) => /\/api\/cheer\/posts(\/hot)?(\?|$)/.test(url),
    body: (url) => {
      const notice = /postType=NOTICE/.test(url);
      return page([1, 2, 3, 4, 5].map((id) => (notice
        ? { ...post(id), postType: 'NOTICE', content: `[공지] ${LONG_KOREAN} 자세한 내용은 ${UNBREAKABLE_URL} 을 확인해주세요.` }
        : post(id))));
    },
  },
  {
    // Page-shaped and bare, like the cheer feed — not {success,data}.
    name: 'leaderboard table',
    match: (url) => /\/api\/leaderboard(\?|$)/.test(url),
    body: () => page(Array.from({ length: 12 }, (_, i) => ({
      rank: i + 1,
      handle: LONG_HANDLE,
      userName: '아주긴닉네임을가진예측왕님',
      profileImageUrl: null,
      level: 42,
      rankTitle: '전설의예측가등급최상위',
      score: 1234567,
      streak: 15,
      maxStreak: 28,
      accuracy: 87.6,
      rankChange: -3,
    }))),
  },
  {
    // publicGet<OffseasonMovement[]> — a bare array, not {success,data}.
    name: 'offseason movements',
    match: (url) => /\/api\/kbo\/offseason\/movements/.test(url),
    body: () => (Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      date: '2026-01-15',
      section: 'FA 계약',
      team: '한화 이글스',
      player: '김현수정',
      summary: LONG_KOREAN,
      remarks: `${LONG_KOREAN} 출처: ${UNBREAKABLE_URL}`,
      contractTerm: '4년',
      contractValue: '총액 170억원(보장 130억 옵션 40억)',
      optionDetails: '출장 옵션 및 성적 옵션 포함',
      counterpartyTeam: 'LG 트윈스',
      counterpartyDetails: '보상선수 및 보상금 포함',
      sourceLabel: '구단 공식 발표',
      sourceUrl: UNBREAKABLE_URL,
      announcedAt: '2026-01-15T10:00:00',
      isBigEvent: true,
    }))),
  },
  {
    // Envelope confirmed by curling the live endpoint earlier: the bootstrap
    // answers this object bare, with a loadState the client checks for fallback.
    name: 'home bootstrap',
    match: (url) => /\/api\/home\/bootstrap/.test(url),
    body: () => {
      const game = (i) => ({
        gameId: `2026080${i}HHLT0`,
        time: '18:30',
        stadium: '대전 한화생명볼파크',
        gameStatus: 'SCHEDULED',
        gameStatusKr: '경기 예정',
        gameInfo: '선발 문동주 vs 박세웅',
        leagueType: 'REGULAR',
        homeTeam: 'HH',
        homeTeamFull: '한화 이글스',
        awayTeam: 'LT',
        awayTeamFull: '롯데 자이언츠',
        gameDate: '2026-08-06',
        sourceDate: '2026-08-06',
        leagueBadge: '정규시즌',
        liveLastEventSeq: null,
        liveLastUpdatedAt: null,
      });
      const games = [1, 2, 3, 4, 5].map(game);
      return {
        selectedDate: '2026-08-06',
        leagueStartDates: { regularSeasonStart: '2026-03-28', postseasonStart: '2026-10-06', koreanSeriesStart: '2026-10-26' },
        navigation: { prevGameDate: '2026-08-05', nextGameDate: '2026-08-07', hasPrev: true, hasNext: true },
        games,
        scheduledGamesWindow: games,
        loadState: { isFallback: false, timedOut: false, timedOutSections: [], failedSections: [], failureReason: null, manualDataRequest: null },
      };
    },
  },
  {
    // The last piece of /home: without this the widgets region stayed on its
    // error state, so the rank snapshot and hot-post rail went unmeasured.
    name: 'home widgets',
    match: (url) => /\/api\/home\/widgets/.test(url),
    body: () => ({
      hotCheerPosts: [1, 2, 3].map(post),
      featuredMates: [],
      rankingSnapshot: {
        rankingSeasonYear: 2026,
        rankingSourceMessage: '2026 정규시즌 기준 순위입니다',
        isOffSeason: false,
        rankings: ['HH', 'LG', 'OB', 'LT', 'SS', 'KT', 'NC', 'SK', 'HT', 'WO'].map((teamId, i) => ({
          rank: i + 1,
          teamId,
          teamName: `${['한화 이글스', 'LG 트윈스', '두산 베어스', '롯데 자이언츠', '삼성 라이온즈', 'KT 위즈', 'NC 다이노스', 'SSG 랜더스', 'KIA 타이거즈', '키움 히어로즈'][i]}`,
          shortName: teamId,
          wins: 80 - i * 4,
          losses: 50 + i * 4,
          draws: 3,
          winRate: (0.615 - i * 0.03).toFixed(3),
          games: 133,
          gamesBehind: i * 4,
          recentForm: ['W', 'L', 'W', 'W', 'D'],
        })),
      },
    }),
  },
  {
    // privateGet<DiaryEntry[]> and privateGet<DiaryStatistics> — both bare.
    name: 'diary entries',
    match: (url) => /\/api\/diary\/entries/.test(url),
    body: () => (Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      date: '2026-08-06',
      type: 'DIRECT',
      emoji: '🔥',
      emojiName: '불타는응원',
      winningName: 'WIN',
      gameId: 1000 + i,
      memo: `${LONG_KOREAN} ${UNBREAKABLE_URL}`,
      photos: [],
      team: '한화 이글스',
      stadium: '대전 한화생명볼파크',
      section: '3루 내야지정석',
      block: '312',
      seatRow: '14',
      seatNumber: '7',
      ticketVerified: true,
    }))),
  },
  {
    name: 'diary statistics',
    match: (url) => /\/api\/diary\/statistics/.test(url),
    body: () => ({
      totalCount: 128, totalWins: 77, totalLosses: 44, totalDraws: 7, winRate: 63.6,
      monthlyCount: 9, yearlyCount: 52, yearlyWins: 31, yearlyWinRate: 59.6,
      mostVisitedStadium: '대전 한화생명볼파크', mostVisitedCount: 41,
    }),
  },
  {
    name: 'DM inbox',
    match: (url) => /\/api\/dm\/rooms\/my/.test(url),
    body: () => envelope(Array.from({ length: 6 }, (_, i) => ({
      roomId: i + 1,
      targetUser: { id: 900 + i, name: '아주긴닉네임을가진상대방님', handle: LONG_HANDLE, profileImageUrl: null },
      lastMessage: { content: `${LONG_KOREAN} ${UNBREAKABLE_URL}`, createdAt: '2026-08-06T09:00:00', senderId: 900 + i },
      hasUnread: true,
    }))),
  },
];

/** Some responses are bare arrays or bare objects rather than {success,data}. */
export const findFixture = (url) => FIXTURES.find((f) => f.match(url));
