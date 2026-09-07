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
              className="min-w-0 flex-1 border-gray-300 dark:border-border dark:text-white dark:hover:bg-secondary"
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
          <div className="space-y-4" data-testid="notice-page-loading" role="status">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="animate-pulse rounded-xl border border-border/80 p-4 dark:border-border dark:bg-card"
                data-testid="notice-page-skeleton"
              >
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-zinc-700" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-secondary" />
                    <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-secondary" />
                    <div className="h-3 w-2/3 rounded bg-gray-100 dark:bg-secondary" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div
            className="min-w-0 break-words rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-600 [overflow-wrap:anywhere] dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
            data-testid="notice-page-error"
            role="alert"
          >
            공지사항을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </div>
        ) : posts.length === 0 ? (
          <div
            className="min-w-0 break-words rounded-lg border-2 border-dashed border-gray-200 px-4 py-12 text-center text-gray-500 [overflow-wrap:anywhere] sm:p-12 dark:border-white/10 dark:text-white"
            data-testid="notice-page-empty"
          >
            <MegaphoneIcon className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-white" />
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-white">등록된 공지사항이 없습니다.</h3>
          </div>
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
