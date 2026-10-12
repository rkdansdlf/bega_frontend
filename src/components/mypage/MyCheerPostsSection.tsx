import { useNavigate } from 'react-router-dom';

import {
  useMyCheerPosts,
  type MyCheerPostsVisualQaStateOverride,
} from '../../hooks/useMyCheerPosts';
import CheerCard from '../CheerCard';
import LoadingSpinner from '../LoadingSpinner';

function MyCheerPostsContent({ visualQaStateOverride }: {
  visualQaStateOverride?: MyCheerPostsVisualQaStateOverride;
}) {
  const navigate = useNavigate();
  const {
    posts,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isError,
    isEmpty,
    emptyMessage,
    errorMessage,
  } = useMyCheerPosts(visualQaStateOverride);

  if (isLoading) {
    return (
      <LoadingSpinner size="md" text="응원석 글을 불러오는 중..." fullScreen={false} />
    );
  }

  if (isError) {
    return (
      <div className="mypage-season-empty" data-testid="mypage-cheer-posts-error">
        <strong className="mypage-season-empty-title">{errorMessage}</strong>
        <p className="mypage-season-empty-copy">잠시 후 다시 시도해주세요.</p>
        <button
          type="button"
          className="mypage-season-empty-action"
          data-testid="mypage-cheer-posts-retry"
          onClick={() => void refetch()}
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="mypage-season-empty" data-testid="mypage-cheer-posts-empty">
        <strong className="mypage-season-empty-title">{emptyMessage}</strong>
        <p className="mypage-season-empty-copy">응원석에 첫 글을 남기고 팬들과 이야기를 시작해보세요.</p>
        <button
          type="button"
          className="mypage-season-empty-action"
          data-testid="mypage-cheer-posts-empty-write"
          onClick={() => navigate('/cheer/write')}
        >
          첫 응원글 쓰기
        </button>
      </div>
    );
  }

  return (
    <div className="mypage-season-cheer-list">
      {posts.map((post) => (
        <CheerCard key={post.id} post={post} />
      ))}
      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mypage-season-ghost-button disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isFetchingNextPage ? '불러오는 중...' : '더보기'}
          </button>
        </div>
      )}
    </div>
  );
}

export interface MyCheerPostsSectionProps {
  visualQaStateOverride?: MyCheerPostsVisualQaStateOverride;
}

export default function MyCheerPostsSection({
  visualQaStateOverride: requestedVisualQaStateOverride,
}: MyCheerPostsSectionProps = {}) {
  const visualQaStateOverride = import.meta.env.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  return (
    <section data-screen-label="응원석 글">
      <div className="mypage-season-head">
        <div>
          <h1>응원석 글</h1>
          <p>내가 작성한 응원석 게시글을 확인해요</p>
        </div>
      </div>

      <div className="mypage-season-panel">
        <MyCheerPostsContent visualQaStateOverride={visualQaStateOverride} />
      </div>
    </section>
  );
}
