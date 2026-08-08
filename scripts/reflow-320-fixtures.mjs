/**
 * Populated-state fixtures for the 320px reflow gate.
 *
 * The gate stubs the API, which kept every route in its empty or error state —
 * and a table with no rows cannot overflow, so the most overflow-prone surfaces
 * were the ones going unchecked.
 *
 * These deliberately carry worst-case content rather than realistic content.
 * For a reflow gate the question is not "does today's data fit" but "does the
 * layout survive content", so the strings here are long Korean text, long
 * handles, and unbreakable tokens (URLs, emails) — the exact shapes that
 * produced every defect found by hand earlier: a box that cannot shrink or wrap.
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
export const FIXTURES = [
  {
    // Returns the page object bare, not wrapped in {success,data} — confirmed
    // against the live endpoint, which answers {"content":[...]}.
    name: 'cheer feed',
    match: (url) => /\/api\/cheer\/posts(\?|$)/.test(url) || /\/api\/cheer\/posts\/hot/.test(url),
    body: () => page([1, 2, 3, 4, 5].map(post)),
  },
  {
    name: 'notice list',
    match: (url) => /\/api\/notice/.test(url),
    body: () => page([1, 2, 3].map((id) => ({
      ...post(id),
      postType: 'NOTICE',
      content: `[공지] ${LONG_KOREAN} 자세한 내용은 ${UNBREAKABLE_URL} 을 확인해주세요.`,
    }))),
  },
];

/** Some responses are bare arrays or bare objects rather than {success,data}. */
export const findFixture = (url) => FIXTURES.find((f) => f.match(url));
