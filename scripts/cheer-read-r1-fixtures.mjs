/**
 * Batch-only read fixture for the cheer detail image/comment audit.
 *
 * This module is intentionally separate from reflow-320-fixtures.mjs so the
 * earlier evidence remains reproducible. It contains only local GET payloads;
 * imageAssetForPath() is fulfilled by the audit route handler.
 */

const LONG_AUTHOR = '응원댓글작성자_아주긴표시이름_2026_끝까지함께하는팬';
const LONG_BODY = '이 댓글은 실제 읽기 화면에서 여러 줄로 배치되는 긴 응원 메시지입니다. '.repeat(4);
const UNBREAKABLE_COMMENT = 'https://www.begabaseball.xyz/comments/1234567890?source=cheer-read-r1';

export const READ_R1_IMAGE_PATHS = {
  normal: '/__cheer_read_r1__/image/normal.svg',
  delayed: '/__cheer_read_r1__/image/delayed.svg',
  missing: '/__cheer_read_r1__/image/missing.svg',
};

const post = {
  id: 1,
  teamId: 'HH',
  postType: 'NORMAL',
  author: '응원석 검증 작성자',
  authorId: 501,
  authorHandle: 'cheer_read_r1_author',
  authorProfileImageUrl: null,
  authorTeamId: 'HH',
  content: [
    '이미지와 실제 댓글을 읽는 동안 위치가 유지되는지 확인하는 게시글입니다.',
    '긴 본문도 함께 배치해 상세 화면의 끝과 댓글 영역을 확인합니다.',
  ].join('\n'),
  createdAt: '2026-09-16T09:00:00',
  likes: 12,
  likedByMe: false,
  liked: false,
  comments: 3,
  bookmarkCount: 2,
  isBookmarked: false,
  repostCount: 1,
  repostedByMe: false,
  repostOfId: null,
  repostType: null,
  views: 1234,
  isHot: false,
  isOwner: false,
  imageUrls: [READ_R1_IMAGE_PATHS.normal, READ_R1_IMAGE_PATHS.delayed, READ_R1_IMAGE_PATHS.missing],
};

const comments = [
  {
    id: 901,
    author: LONG_AUTHOR,
    authorHandle: 'cheer_read_r1_commenter_very_long_handle',
    authorProfileImageUrl: null,
    content: `${LONG_BODY}\n${UNBREAKABLE_COMMENT}`,
    timeAgo: '방금 전',
    likes: 3,
    likeCount: 3,
    likedByMe: false,
    replies: [],
  },
  {
    id: 902,
    author: '두 번째 응원 댓글 작성자',
    authorHandle: 'cheer_read_r1_second',
    authorProfileImageUrl: null,
    content: '지연된 이미지가 끝난 뒤에도 이 댓글을 계속 읽을 수 있어야 합니다.\n다음 줄도 확인합니다.',
    timeAgo: '1분 전',
    likes: 0,
    likeCount: 0,
    likedByMe: false,
    replies: [],
  },
  {
    id: 903,
    author: '마지막 댓글 작성자',
    authorHandle: 'cheer_read_r1_last',
    authorProfileImageUrl: null,
    content: '댓글 목록의 마지막 내용까지 실제 DOM에서 확인합니다.',
    timeAgo: '2분 전',
    likes: 1,
    likeCount: 1,
    likedByMe: false,
    replies: [],
  },
];

const page = (content) => ({
  content,
  last: true,
  totalPages: 1,
  totalElements: content.length,
  size: 20,
  number: 0,
});

export const cheerReadR1FixtureForRequest = (requestUrl) => {
  const { pathname } = new URL(requestUrl);
  if (pathname === '/api/cheer/posts/1') return { ...post };
  if (pathname === '/api/cheer/posts/1/comments') return page(comments);
  if (pathname === '/api/cheer/posts/1/images') return [];
  return null;
};

const svg = (background, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" role="img" aria-label="${label}"><rect width="640" height="360" fill="${background}"/><text x="32" y="190" fill="white" font-size="32" font-family="sans-serif">${label}</text></svg>`;

export const imageAssetForPath = (pathname) => {
  if (pathname === READ_R1_IMAGE_PATHS.normal) {
    return { status: 200, contentType: 'image/svg+xml', body: svg('#235789', 'normal image'), delayMs: 0 };
  }
  if (pathname === READ_R1_IMAGE_PATHS.delayed) {
    return { status: 200, contentType: 'image/svg+xml', body: svg('#8f2d56', 'delayed image'), delayMs: 900 };
  }
  if (pathname === READ_R1_IMAGE_PATHS.missing) {
    return { status: 404, contentType: 'text/plain', body: 'fixture image missing', delayMs: 0 };
  }
  return null;
};

