import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { fetchNoticePosts } from '../api/noticePublic';
import type { CheerPost } from '../api/cheerApi';
import { isAdminRole, useAuthProfileSnapshot } from '../store/authStore';
import {
  NoticeChevronLeftIcon as ChevronLeftIcon,
  NoticeChevronRightIcon as ChevronRightIcon,
  NoticeHeartIcon as HeartIcon,
  NoticeMegaphoneIcon as MegaphoneIcon,
  NoticeMessageSquareIcon as MessageSquareIcon,
  NoticePenSquareIcon as PenSquareIcon,
  NoticeRefreshIcon as RefreshIcon,
} from './icons/NoticePageIcons';
import { Button } from './ui/button';
import StateBlock from './status/StateBlock';

const ITEMS_PER_PAGE = 15;

export type NoticePageVisualQaStateOverride = {
  currentPage?: number;
  phase: 'error' | 'loading' | 'resolved';
  posts?: CheerPost[];
  userRole?: string;
};

interface NoticePageRuntimeProps {
  visualQaStateOverride?: NoticePageVisualQaStateOverride;
}

export default function NoticePageRuntime(props: NoticePageRuntimeProps = {}) {
  const navigate = useNavigate();
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : props.visualQaStateOverride;
  const [currentPage, setCurrentPage] = useState(visualQaStateOverride?.currentPage ?? 1);
  const { userRole } = useAuthProfileSnapshot();
  const isAdmin = isAdminRole(visualQaStateOverride?.userRole ?? userRole);

  const {
    data: queriedNoticeData,
    isLoading: isQueryLoading,
    isError: isQueryError,
    isFetching: isQueryFetching,
    refetch,
  } = useQuery({
    queryKey: ['noticePostsPage'],
    queryFn: () => fetchNoticePosts(0, 100),
    enabled: visualQaStateOverride === undefined,
    staleTime: 1000 * 60 * 5,
  });

  const noticeData = visualQaStateOverride?.phase === 'resolved'
    ? { content: visualQaStateOverride.posts ?? [] }
    : queriedNoticeData;
  const isLoading = visualQaStateOverride?.phase === 'loading'
    || (visualQaStateOverride === undefined && isQueryLoading);
  const isError = visualQaStateOverride?.phase === 'error'
    || (visualQaStateOverride === undefined && isQueryError);

  const posts = useMemo(() => {
    return (noticeData?.content ?? []).filter((post: CheerPost) => post.postType === 'NOTICE');
  }, [noticeData]);

  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return posts.slice(startIndex, endIndex);
  }, [posts, currentPage]);

  const totalPages = Math.ceil(posts.length / ITEMS_PER_PAGE);

  const handlePostClick = (postId: number) => {
    navigate(`/cheer/${postId}`);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className="min-h-screen bg-white transition-colors duration-200 dark:bg-background"
      data-testid="notice-page-runtime"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <MegaphoneIcon className="h-7 w-7 shrink-0 text-primary" />
            <h1 className="min-w-0 text-primary">공지사항</h1>
          </div>
          <div
            className="flex w-full min-w-0 items-center gap-2 sm:w-auto"
            data-testid="notice-page-actions"
          >
            <Button
              onClick={() => {
                if (visualQaStateOverride === undefined) void refetch();
              }}
              variant="outline"
              size="touch"
              className="min-w-0 flex-1 border-gray-300 dark:border-border dark:text-white dark:hover:bg-input/50"
              disabled={isLoading}
              data-testid="notice-page-refresh"
            >
              <RefreshIcon className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            {isAdmin && (
              <Button
                onClick={() => navigate('/cheer/write')}
                size="touch"
                className="min-w-0 flex-1 bg-primary text-white"
                data-testid="notice-page-write"
              >
                <PenSquareIcon className="mr-2 h-4 w-4" />
                글쓰기
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4" data-testid="notice-page-loading" role="status" aria-busy="true">
            <span className="sr-only">공지사항을 불러오고 있어요</span>
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                aria-hidden="true"
                className="animate-pulse rounded-xl border border-border/80 bg-white p-4 dark:border-border dark:bg-card"
                data-testid="notice-page-skeleton"
              >
                {/* 공지 행과 같은 구조: 아이콘 원 · 제목 한 줄 · 작성자/시간/반응 한 줄 */}
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 shrink-0 rounded-full bg-gray-200 dark:bg-zinc-700" />
                  <div className="min-w-0 flex-1 space-y-2.5 pt-1">
                    <div className={`h-5 rounded bg-gray-200 dark:bg-secondary ${['w-2/3', 'w-1/2', 'w-3/5', 'w-2/5', 'w-1/2'][idx]}`} />
                    <div className="flex items-center gap-3">
                      <div className="h-3.5 w-20 rounded bg-gray-100 dark:bg-secondary" />
                      <div className="h-3.5 w-14 rounded bg-gray-100 dark:bg-secondary" />
                      <div className="hidden h-3.5 w-16 rounded bg-gray-100 dark:bg-secondary sm:block" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <StateBlock
            kind="error"
            title="공지사항을 불러오지 못했어요"
            description="잠시 연결이 불안정했어요. 다시 시도하면 최신 공지를 불러와요."
            onRetry={() => {
              if (visualQaStateOverride === undefined) void refetch();
            }}
            isRetrying={visualQaStateOverride === undefined && isQueryFetching}
            testId="notice-page-error"
          />
        ) : posts.length === 0 ? (
          <StateBlock
            kind="filtered"
            icon={<MegaphoneIcon className="h-5 w-5" />}
            title="아직 등록된 공지가 없어요"
            description="서비스 점검이나 새 기능 소식이 생기면 이곳에 올려 드릴게요."
            testId="notice-page-empty"
          />
        ) : (
          <div className="space-y-4">
            {paginatedPosts.map((post: CheerPost) => (
              <button
                key={post.id}
                type="button"
                onClick={() => handlePostClick(post.id)}
                className="w-full min-w-0 rounded-xl border border-border/80 bg-white p-4 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] dark:border-border dark:bg-card"
                data-testid={`notice-post-${post.id}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <MegaphoneIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 break-words text-base text-zinc-900 [overflow-wrap:anywhere] dark:text-white">
                      {post.content?.split('\n')[0]?.slice(0, 60) || '공지사항'}
                    </h3>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-body text-gray-500 dark:text-white">
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{post.author}</span>
                      <span>•</span>
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{post.timeAgo}</span>
                      <span className="hidden sm:inline">•</span>
                      <div className="hidden items-center gap-1 sm:flex">
                        <MessageSquareIcon className="h-4 w-4" />
                        <span>{post.commentCount}</span>
                      </div>
                      <div className="hidden items-center gap-1 sm:flex">
                        <HeartIcon className="h-4 w-4" />
                        <span>{post.likeCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!isLoading && !isError && posts.length > 0 && (
          <nav
            aria-label="공지사항 페이지"
            className="mt-8 flex min-w-0 items-center justify-center gap-1 sm:gap-2"
            data-testid="notice-page-pagination"
          >
            <Button
              variant="outline"
              size="iconTouch"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="min-h-11 w-11 px-0"
              aria-label="이전 공지사항 페이지"
              data-testid="notice-page-previous"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
                .map((page, index, array) => {
                  const isGap = index > 0 && page - array[index - 1] > 1;
                  const isActive = currentPage === page;
                  return (
                    <div key={page} className="flex items-center">
                      {isGap && <span className="mx-1 text-gray-400 dark:text-white">...</span>}
                      <Button
                        variant={isActive ? 'default' : 'outline'}
                        size="iconTouch"
                        onClick={() => handlePageChange(page)}
                        className={`min-h-11 w-11 px-0 ${isActive ? 'border-primary bg-primary font-bold text-white' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={`공지사항 ${page}페이지`}
                        data-testid={`notice-page-${page}`}
                      >
                        {page}
                      </Button>
                    </div>
                  );
                })}
            </div>
            <Button
              variant="outline"
              size="iconTouch"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="min-h-11 w-11 px-0"
              aria-label="다음 공지사항 페이지"
              data-testid="notice-page-next"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </nav>
        )}
      </div>
    </div>
  );
}
