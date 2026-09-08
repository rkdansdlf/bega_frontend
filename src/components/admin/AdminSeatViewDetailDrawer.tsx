import { useEffect, useState } from 'react';

import type { AdminSeatView } from '../../types/admin';
import { formatStadiumDisplayName } from '../../utils/stadiumDisplay';
import { Button } from '../ui/button';
import PlainDialog from '../ui/plain-dialog';

interface AdminSeatViewDetailDrawerProps {
  selectedSeatViewId: number;
  selectedSeatViewDetail: AdminSeatView | null;
  seatViewDetailLoading: boolean;
  adminMemo: string;
  setAdminMemo: (value: string) => void;
  closeSeatViewDetail: () => void;
  handleSeatViewAction: (
    seatViewId: number,
    payload: {
      adminLabel: 'SEAT_VIEW' | 'TICKET' | 'OTHER' | 'INAPPROPRIATE';
      moderationStatus: 'APPROVED' | 'REJECTED';
      adminMemo?: string;
    }
  ) => Promise<void>;
  visualQaStateOverride?: AdminSeatViewDetailDrawerVisualQaStateOverride;
}
export type AdminSeatViewDetailDrawerVisualQaStateOverride = {
  interactive: boolean;
};

const actionClassName = 'min-h-11 w-full whitespace-normal px-3 py-2 leading-tight [overflow-wrap:anywhere] sm:min-h-9';
const valueClassName = 'mt-1 min-w-0 text-slate-200 [overflow-wrap:anywhere]';

export default function AdminSeatViewDetailDrawer({
  selectedSeatViewId,
  selectedSeatViewDetail,
  seatViewDetailLoading,
  adminMemo,
  setAdminMemo,
  closeSeatViewDetail,
  handleSeatViewAction,
  visualQaStateOverride: requestedVisualQaStateOverride,
}: AdminSeatViewDetailDrawerProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const visualQaInteractive = visualQaStateOverride?.interactive === true;
  const [visualQaAdminMemo, setVisualQaAdminMemo] = useState(adminMemo);
  const effectiveAdminMemo = visualQaInteractive ? visualQaAdminMemo : adminMemo;
  const updateAdminMemo = visualQaInteractive ? setVisualQaAdminMemo : setAdminMemo;
  const submissionTags = selectedSeatViewDetail?.tags ?? [];
  const hasSubmissionDetails = Boolean(
    selectedSeatViewDetail
      && (selectedSeatViewDetail.rating != null || selectedSeatViewDetail.comment || submissionTags.length > 0),
  );

  useEffect(() => {
    if (visualQaInteractive) {
      setVisualQaAdminMemo(adminMemo);
    }
  }, [adminMemo, visualQaInteractive]);

  const actions = selectedSeatViewDetail && !seatViewDetailLoading ? (
    <div className="grid w-full grid-cols-2 gap-2">
      <Button
        type="button"
        data-testid="admin-seat-view-action-approve"
        aria-label="시야뷰 승인 처리 (SEAT_VIEW)"
        onClick={() => handleSeatViewAction(selectedSeatViewDetail.id, {
          adminLabel: 'SEAT_VIEW',
          moderationStatus: 'APPROVED',
          adminMemo: effectiveAdminMemo,
        })}
        className={`${actionClassName} bg-emerald-600 text-white hover:bg-emerald-700`}
      >
        시야뷰 승인
      </Button>
      <Button
        type="button"
        data-testid="admin-seat-view-action-ticket"
        aria-label="티켓 이미지로 분류 (TICKET)"
        onClick={() => handleSeatViewAction(selectedSeatViewDetail.id, {
          adminLabel: 'TICKET',
          moderationStatus: 'REJECTED',
          adminMemo: effectiveAdminMemo,
        })}
        className={`${actionClassName} bg-amber-600 text-slate-950 hover:bg-amber-400`}
      >
        티켓 이미지
      </Button>
      <Button
        type="button"
        data-testid="admin-seat-view-action-other"
        aria-label="기타 이미지로 분류 (OTHER)"
        onClick={() => handleSeatViewAction(selectedSeatViewDetail.id, {
          adminLabel: 'OTHER',
          moderationStatus: 'REJECTED',
          adminMemo: effectiveAdminMemo,
        })}
        className={`${actionClassName} bg-slate-700 text-white hover:bg-slate-600`}
      >
        기타 이미지
      </Button>
      <Button
        type="button"
        data-testid="admin-seat-view-action-inappropriate"
        aria-label="부적절 이미지로 분류 (INAPPROPRIATE)"
        onClick={() => handleSeatViewAction(selectedSeatViewDetail.id, {
          adminLabel: 'INAPPROPRIATE',
          moderationStatus: 'REJECTED',
          adminMemo: effectiveAdminMemo,
        })}
        className={`${actionClassName} bg-red-600 text-white hover:bg-red-700`}
      >
        부적절 이미지
      </Button>
    </div>
  ) : undefined;

  return (
    <PlainDialog
      open
      onClose={closeSeatViewDetail}
      placement="right"
      initialFocus="container"
      title={(
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-white [overflow-wrap:anywhere]">
          <span>시야뷰 후보 상세</span>
          <span className="font-mono text-base text-slate-300">Seat View #{selectedSeatViewId}</span>
        </span>
      )}
      description="좌석 시야와 제출 정보를 검토한 뒤 적절한 분류를 선택하세요."
      contentTestId="admin-seat-view-detail-drawer"
      className="max-w-xl border-slate-700 bg-slate-900 text-slate-100 focus:outline-none"
      bodyClassName="p-4 sm:p-5"
      footer={actions}
    >
      <div
        className="min-w-0 [overflow-wrap:anywhere]"
        aria-busy={seatViewDetailLoading}
      >
        {seatViewDetailLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg border border-slate-800 bg-slate-800/40 px-4 py-6 text-center text-slate-300"
          >
            상세 정보를 불러오는 중...
          </div>
        ) : !selectedSeatViewDetail ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg border border-slate-800 bg-slate-800/40 px-4 py-6 text-center text-slate-300"
          >
            상세 정보를 찾을 수 없습니다.
          </div>
        ) : (
          <div className="space-y-5">
            <img
              src={selectedSeatViewDetail.photoUrl}
              alt={`시야뷰 후보 ${selectedSeatViewDetail.id}번 좌석 시야`}
              className="aspect-video w-full rounded-xl border border-slate-800 bg-slate-950 object-contain"
            />

            <dl className="grid grid-cols-1 gap-3 text-caption sm:grid-cols-2">
              <div className="min-w-0 rounded-lg border border-slate-800 p-3">
                <dt className="text-slate-500">상태</dt>
                <dd className={valueClassName}>{selectedSeatViewDetail.moderationStatus || '미제출'}</dd>
              </div>
              <div className="min-w-0 rounded-lg border border-slate-800 p-3">
                <dt className="text-slate-500">관리자 라벨</dt>
                <dd className={valueClassName}>{selectedSeatViewDetail.adminLabel || '-'}</dd>
              </div>
              <div className="min-w-0 rounded-lg border border-slate-800 p-3">
                <dt className="text-slate-500">AI 추천</dt>
                <dd className={valueClassName}>
                  {selectedSeatViewDetail.aiSuggestedLabel || '-'}
                  {selectedSeatViewDetail.aiConfidence != null
                    ? ` (${Math.round(selectedSeatViewDetail.aiConfidence * 100)}%)`
                    : null}
                </dd>
              </div>
              <div className="min-w-0 rounded-lg border border-slate-800 p-3">
                <dt className="text-slate-500">티켓 인증</dt>
                <dd className={valueClassName}>{selectedSeatViewDetail.ticketVerified ? '완료' : '미인증'}</dd>
              </div>
            </dl>

            <section className="min-w-0 rounded-lg border border-slate-800 p-3 text-caption">
              <h3 className="mb-3 text-slate-400">좌석 및 처리 정보</h3>
              <dl className="grid min-w-0 gap-3">
                <div className="min-w-0">
                  <dt className="text-slate-500">구장</dt>
                  <dd className={valueClassName}>{formatStadiumDisplayName(selectedSeatViewDetail.stadium)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-slate-500">좌석</dt>
                  <dd className={valueClassName}>
                    {[selectedSeatViewDetail.section, selectedSeatViewDetail.block, selectedSeatViewDetail.seatRow, selectedSeatViewDetail.seatNumber]
                      .filter(Boolean)
                      .join(' / ') || '-'}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-slate-500">업로드 타입</dt>
                  <dd className={valueClassName}>{selectedSeatViewDetail.sourceType || '-'}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-slate-500">다이어리 ID</dt>
                  <dd className={valueClassName}>{selectedSeatViewDetail.diaryId ?? '-'}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-slate-500">리워드 지급</dt>
                  <dd className={valueClassName}>{selectedSeatViewDetail.rewardGranted ? '완료' : '미지급'}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-slate-500">AI 사유</dt>
                  <dd className="mt-1 min-w-0 whitespace-pre-wrap text-slate-200 [overflow-wrap:anywhere]">
                    {selectedSeatViewDetail.aiReason || '-'}
                  </dd>
                </div>
              </dl>
            </section>

            {hasSubmissionDetails ? (
              <section
                data-testid="admin-seat-view-submission-details"
                className="min-w-0 rounded-lg border border-slate-800 p-3 text-caption"
              >
                <h3 className="mb-3 text-slate-400">사용자 제출 정보</h3>
                <dl className="grid min-w-0 gap-3">
                  <div className="min-w-0">
                    <dt className="text-slate-500">제출 별점</dt>
                    <dd className={valueClassName}>
                      {selectedSeatViewDetail.rating != null ? `${selectedSeatViewDetail.rating}점` : '-'}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-slate-500">한줄평</dt>
                    <dd className="mt-1 min-w-0 whitespace-pre-wrap text-slate-200 [overflow-wrap:anywhere]">
                      {selectedSeatViewDetail.comment || '-'}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 min-w-0">
                  <p className="text-slate-500">태그</p>
                  <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                    {submissionTags.length > 0 ? submissionTags.map((tag) => (
                      <span
                        key={tag}
                        className="max-w-full rounded-full bg-slate-800 px-2 py-1 text-slate-200 [overflow-wrap:anywhere]"
                      >
                        {tag}
                      </span>
                    )) : <span className="text-slate-200">-</span>}
                  </div>
                </div>
              </section>
            ) : null}

            <div className="min-w-0 rounded-lg border border-slate-800 p-3">
              <label
                htmlFor="admin-seat-view-admin-memo"
                className="mb-2 block text-caption text-slate-400"
              >
                관리자 메모
              </label>
              <textarea
                id="admin-seat-view-admin-memo"
                value={effectiveAdminMemo}
                onChange={(event) => updateAdminMemo(event.target.value)}
                className="min-h-24 w-full min-w-0 resize-none rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-base text-slate-100 [overflow-wrap:anywhere] placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="분류 근거를 입력하세요."
              />
            </div>
          </div>
        )}
      </div>
    </PlainDialog>
  );
}
