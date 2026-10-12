import { useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { fetchMyCheerPosts, type CheerPost } from '../api/cheerApi';
import { getApiErrorStatus } from '../api/errorStatus';
import { useAuthSession } from '../store/authStore';
import { getNextPageParamFromPageResponse } from '../utils/pageResponsePagination';
import { PRIVATE_QUERY_KEYS } from '../utils/privateQueryKeys';
import { useViewerQueryScope } from './useViewerQueryScope';

const MY_CHEER_POSTS_PAGE_SIZE = 10;

export interface MyCheerPostsVisualQaStateOverride {
  posts: CheerPost[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  isError: boolean;
  isEmpty: boolean;
  emptyMessage: string;
  errorMessage: string;
  fetchNextPage?: () => unknown;
  refetch?: () => unknown;
}

export const useMyCheerPosts = (visualQaStateOverride?: MyCheerPostsVisualQaStateOverride) => {
  const viewerScope = useViewerQueryScope();
  const { isLoggedIn, isAuthLoading, userId } = useAuthSession();
  const canLoadMyPosts = isLoggedIn && !isAuthLoading && userId !== null && userId > 0;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    error,
    isError,
  } = useInfiniteQuery({
    queryKey: PRIVATE_QUERY_KEYS.cheerMyPosts({ size: MY_CHEER_POSTS_PAGE_SIZE }, viewerScope),
    queryFn: ({ pageParam = 0 }) => fetchMyCheerPosts({
      page: pageParam as number,
      size: MY_CHEER_POSTS_PAGE_SIZE,
    }),
    enabled: visualQaStateOverride === undefined && canLoadMyPosts,
    getNextPageParam: getNextPageParamFromPageResponse,
    initialPageParam: 0,
    retry: false,
  });

  useEffect(() => {
    if (!error) {
      return;
    }
    if (getApiErrorStatus(error) === 403) {
      return;
    }

    toast.error('응원석 글을 불러오는데 실패했습니다.');
  }, [error]);

  const queryPosts = useMemo(
    () => data?.pages.flatMap((page) => page.content) ?? [],
    [data],
  );
  const errorStatus = getApiErrorStatus(error);
  const posts = visualQaStateOverride?.posts ?? queryPosts;

  return {
    posts,
    isLoading: visualQaStateOverride?.isLoading ?? isLoading,
    isFetchingNextPage: visualQaStateOverride?.isFetchingNextPage ?? isFetchingNextPage,
    hasNextPage: visualQaStateOverride?.hasNextPage ?? Boolean(hasNextPage),
    fetchNextPage: visualQaStateOverride?.fetchNextPage ?? fetchNextPage,
    refetch: visualQaStateOverride?.refetch ?? refetch,
    isError: visualQaStateOverride?.isError ?? isError,
    isEmpty: visualQaStateOverride?.isEmpty ?? posts.length === 0,
    emptyMessage: visualQaStateOverride?.emptyMessage ?? '작성한 응원석 글이 없습니다',
    errorMessage: visualQaStateOverride?.errorMessage ?? (errorStatus === 404
      ? '응원석 글 조회 경로를 찾을 수 없습니다.'
      : '응원석 글을 불러오지 못했습니다.'),
  };
};
