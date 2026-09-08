import { useState } from 'react';
import { AdminBadge } from './AdminPanelPrimitives';
import { Button } from '../ui/button';
import PlainDialog from '../ui/plain-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import TeamLogo from '../TeamLogo';
import { TEAM_DATA } from '../../constants/teams';
import { getTimeAgo } from '../../utils/formatters';
import { AdminMessageSquareIcon, AdminTrashIcon } from './AdminPanelIcons';

interface AdminPost {
  id: number;
  team: string;
  content?: string;
  author: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  isHot?: boolean;
}

interface PostsAdminPanelProps {
  posts: AdminPost[];
  handleDeletePost: (postId: number) => void;
  tableClassName?: string;
}

export function PostsAdminPanel({ posts, handleDeletePost, tableClassName }: PostsAdminPanelProps) {
  const [pendingDeletePost, setPendingDeletePost] = useState<AdminPost | null>(null);

  return (
    <>
      <div
        data-testid="admin-posts-panel"
        className="min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-800"
      >
        {posts.length === 0 ? (
          <div
            data-testid="admin-posts-empty"
            role="status"
            aria-live="polite"
            className="flex min-h-40 flex-col items-center justify-center py-10 text-slate-500"
          >
            <AdminMessageSquareIcon className="mb-3 h-12 w-12 opacity-30" />
            게시글이 없습니다.
          </div>
        ) : (
          <Table aria-label="커뮤니티 게시글 목록" className={tableClassName ?? 'min-w-[860px]'}>
          <TableHeader>
            <TableRow className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/50">
              <TableHead className="text-slate-400 font-semibold">ID</TableHead>
              <TableHead className="text-slate-400 font-semibold">팀</TableHead>
              <TableHead className="text-slate-400 font-semibold">내용</TableHead>
              <TableHead className="text-slate-400 font-semibold">작성자</TableHead>
              <TableHead className="text-slate-400 font-semibold">작성 시간</TableHead>
              <TableHead className="text-slate-400 font-semibold">좋아요</TableHead>
              <TableHead className="text-slate-400 font-semibold">댓글</TableHead>
              <TableHead className="text-slate-400 font-semibold text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => (
                <TableRow
                  key={post.id}
                  data-testid={`admin-post-row-${post.id}`}
                  className="border-slate-800 transition-colors duration-150 hover:bg-slate-800/30"
                >
                  <TableCell className="text-slate-300 font-mono text-caption">{post.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <TeamLogo team={post.team} size={24} />
                      <span className="text-slate-300">{TEAM_DATA[post.team]?.name || post.team}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span title={post.content} className="block max-w-[220px] truncate whitespace-nowrap text-slate-200">
                        {post.content?.slice(0, 40) || '-'}
                      </span>
                      {post.isHot && (
                        <AdminBadge className="animate-pulse border-0 bg-red-500/20 px-1.5 py-0 text-11 text-red-200 motion-reduce:animate-none">
                          HOT
                        </AdminBadge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    <span title={post.author} className="block max-w-[140px] truncate whitespace-nowrap">{post.author}</span>
                  </TableCell>
                  <TableCell className="text-slate-400 text-caption">{getTimeAgo(post.createdAt)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-rose-400 whitespace-nowrap">
                      <span className="text-lg">♥</span>
                      <span className="font-semibold">{post.likeCount}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex min-w-8 items-center justify-center whitespace-nowrap rounded-lg bg-slate-800 px-2 py-1 text-emerald-400 font-semibold text-caption">
                      {post.commentCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`admin-post-delete-${post.id}`}
                      aria-label={`게시글 ${post.id} 삭제`}
                      className="min-w-11 rounded-lg text-slate-500 transition-colors duration-150 hover:bg-red-500/10 hover:text-red-400 sm:min-w-8"
                      onClick={() => setPendingDeletePost(post)}
                    >
                      <AdminTrashIcon className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
            ))}
          </TableBody>
          </Table>
        )}
      </div>

      <PlainDialog
        open={Boolean(pendingDeletePost)}
        onClose={() => setPendingDeletePost(null)}
        title="게시글을 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 게시글과 관련된 모든 데이터가 영구적으로 삭제됩니다."
        contentTestId="admin-post-delete-dialog"
        className="sm:max-w-md border-slate-800 bg-slate-900 text-slate-100"
        footer={(
          <>
            <Button
              variant="outline"
              data-testid="admin-post-delete-cancel"
              onClick={() => setPendingDeletePost(null)}
              className="min-h-11 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 sm:min-h-9"
            >
              취소
            </Button>
            <Button
              data-testid="admin-post-delete-confirm"
              onClick={() => {
                if (!pendingDeletePost) return;
                handleDeletePost(pendingDeletePost.id);
                setPendingDeletePost(null);
              }}
              className="min-h-11 bg-red-500 text-white border-0 shadow-sm hover:bg-red-600 sm:min-h-9"
            >
              삭제
            </Button>
          </>
        )}
      >
        {pendingDeletePost ? (
          <p className="text-caption text-slate-400">
            <span className="font-semibold text-slate-200">#{pendingDeletePost.id}</span> 게시글을 삭제합니다.
          </p>
        ) : null}
      </PlainDialog>
    </>
  );
}
