import { useEffect, useRef, useState } from 'react';

import type { AdminReport, AdminReportAppealDecision } from '../../types/admin';
import { getTimeAgo } from '../../utils/formatters';
import { useConfirmDialog } from '../contexts/ConfirmDialogContext';
import { Button } from '../ui/button';
import PlainDialog from '../ui/plain-dialog';
import './AdminReportDetailDrawer.css';

type AdminReportAction = 'TAKE_DOWN' | 'REQUIRE_MODIFICATION' | 'WARNING' | 'DISMISS' | 'RESTORE';

interface AdminReportDetailDrawerProps {
  selectedReportId: number;
  selectedReportDetail: AdminReport | null;
  reportDetailLoading: boolean;
  reportDetailError?: string | null;
  adminMemo: string;
  setAdminMemo: (value: string) => void;
  closeReportDetail: () => void;
  handleReportAction: (
    reportId: number,
    action: AdminReportAction,
    adminMemo?: string
  ) => Promise<void>;
  handleAppealDecision: (reportId: number, decision: AdminReportAppealDecision) => Promise<void>;
  appealDecisionLoading: boolean;
  visualQaStateOverride?: AdminReportDetailDrawerVisualQaStateOverride;
}
export type AdminReportDetailDrawerVisualQaStateOverride = {
  interactive: boolean;
};

const actionClassName = 'min-h-11 w-full whitespace-normal px-3 py-2 leading-tight [overflow-wrap:anywhere] sm:min-h-11';
const valueClassName = 'mt-1 min-w-0 text-slate-200 [overflow-wrap:anywhere]';

export default function AdminReportDetailDrawer({
  selectedReportId,
  selectedReportDetail,
  reportDetailLoading,
  reportDetailError = null,
  adminMemo,
  setAdminMemo,
  closeReportDetail,
  handleReportAction,
  handleAppealDecision,
  appealDecisionLoading,
  visualQaStateOverride: requestedVisualQaStateOverride,
}: AdminReportDetailDrawerProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const visualQaInteractive = visualQaStateOverride?.interactive === true;
  const { confirm } = useConfirmDialog();
  const [visualQaAdminMemo, setVisualQaAdminMemo] = useState(adminMemo);
  const appealDecisionInFlightRef = useRef(false);
  const effectiveAdminMemo = visualQaInteractive ? visualQaAdminMemo : adminMemo;
  const updateAdminMemo = visualQaInteractive ? setVisualQaAdminMemo : setAdminMemo;

  const runAppealDecision = async (decision: AdminReportAppealDecision) => {
    if (!selectedReportDetail || appealDecisionLoading || appealDecisionInFlightRef.current) {
      return;
    }
    appealDecisionInFlightRef.current = true;
    try {
      const currentStatus = selectedReportDetail.appealStatus;
      const isTerminalDecision = decision === 'ACCEPTED' || decision === 'REJECTED';
      if (isTerminalDecision) {
        const isRetry = currentStatus === decision;
        const confirmed = await confirm({
          title: isRetry ? '종결 건 비식별 재시도' : '이의제기 종결 확인',
          description: isRetry
            ? '이미 종결된 결정을 다시 확인합니다. 삭제 완료 계정이며 관련 신고·이의제기가 모두 종결된 경우 게시글·댓글 비식별과 삭제 대상 계정 소유 미디어 원본·스테이징 객체 삭제를 멱등 재시도합니다. 원문은 복구되지 않습니다.'
            : '삭제 완료 계정에서 마지막 관련 신고·이의제기를 종결하면 게시글·댓글이 비식별 처리되고 삭제 대상 계정 소유 미디어 원본·스테이징 객체가 삭제될 수 있습니다. ACCEPTED 결정도 원문을 복구하지 않습니다.',
          confirmLabel: isRetry ? '재검증' : decision === 'ACCEPTED' ? '승인하고 종결' : '기각하고 종결',
          variant: 'destructive',
          theme: 'dark',
          touchTargets: true,
        });
        if (!confirmed) {
          return;
        }
      }
      await handleAppealDecision(selectedReportDetail.id, decision);
    } finally {
      appealDecisionInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (visualQaInteractive) {
      setVisualQaAdminMemo(adminMemo);
    }
  }, [adminMemo, visualQaInteractive]);

  const appealStatus = selectedReportDetail?.appealStatus;
  const hasOpenAppeal = appealStatus === 'REQUESTED' || appealStatus === 'REVIEWING';
  const isTerminalAppeal = appealStatus === 'ACCEPTED' || appealStatus === 'REJECTED';

  const actions = selectedReportDetail && !reportDetailLoading && !reportDetailError ? (
    <div className="w-full space-y-3">
      {appealStatus && appealStatus !== 'NONE' && (
        <div className="space-y-2">
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
            {appealStatus === 'REQUESTED' && (
              <Button
                type="button"
                data-testid="admin-report-appeal-review"
                onClick={() => runAppealDecision('REVIEWING')}
                disabled={appealDecisionLoading}
                className={`${actionClassName} bg-indigo-600 text-white hover:bg-indigo-500`}
              >
                검토 중으로 전환
              </Button>
            )}
            {hasOpenAppeal && (
              <>
                <Button
                  type="button"
                  data-testid="admin-report-appeal-accept"
                  onClick={() => runAppealDecision('ACCEPTED')}
                  disabled={appealDecisionLoading}
                  className={`${actionClassName} bg-emerald-700 text-white hover:bg-emerald-600`}
                >
                  이의제기 승인
                </Button>
                <Button
                  type="button"
                  data-testid="admin-report-appeal-reject"
                  onClick={() => runAppealDecision('REJECTED')}
                  disabled={appealDecisionLoading}
                  className={`${actionClassName} bg-rose-700 text-white hover:bg-rose-600`}
                >
                  이의제기 기각
                </Button>
              </>
            )}
            {isTerminalAppeal && (
              <Button
                type="button"
                data-testid="admin-report-appeal-retry-anonymization"
                onClick={() => runAppealDecision(
                  appealStatus === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED',
                )}
                disabled={appealDecisionLoading}
                className={`${actionClassName} bg-amber-600 text-slate-950 hover:bg-amber-500`}
              >
                종결 건 비식별 재시도
              </Button>
            )}
          </div>
        </div>
      )}
      <p
        data-testid="admin-report-appeal-deletion-policy"
        className="rounded-lg border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-caption text-amber-100 [overflow-wrap:anywhere]"
      >
        탈퇴 완료 계정의 마지막 관련 신고·이의제기를 종결하면 게시글·댓글을 비식별 처리하고 계정 소유 미디어 원본·스테이징 객체를 물리 삭제합니다. 이의제기가 승인되어도 원문은 복구되지 않습니다.
      </p>
      <div className="grid w-full grid-cols-2 gap-2">
        <Button
          type="button"
          data-testid="admin-report-action-take-down"
          aria-label="게시물 비공개 처리 (TAKE_DOWN)"
          onClick={() => handleReportAction(selectedReportDetail.id, 'TAKE_DOWN', effectiveAdminMemo)}
          className={`${actionClassName} bg-red-600 text-white hover:bg-red-700`}
        >
          게시물 비공개
        </Button>
        <Button
          type="button"
          data-testid="admin-report-action-dismiss"
          aria-label="신고 기각 처리 (DISMISS)"
          onClick={() => handleReportAction(selectedReportDetail.id, 'DISMISS', effectiveAdminMemo)}
          className={`${actionClassName} bg-slate-700 text-white hover:bg-slate-600`}
        >
          신고 기각
        </Button>
        <Button
          type="button"
          data-testid="admin-report-action-restore"
          aria-label="게시물 복원 처리 (RESTORE)"
          onClick={() => handleReportAction(selectedReportDetail.id, 'RESTORE', effectiveAdminMemo)}
          className={`${actionClassName} bg-emerald-600 text-white hover:bg-emerald-700`}
        >
          게시물 복원
        </Button>
        <Button
          type="button"
          data-testid="admin-report-action-require-modification"
          aria-label="수정 요청 처리 (REQUIRE_MODIFICATION)"
          onClick={() => handleReportAction(selectedReportDetail.id, 'REQUIRE_MODIFICATION', effectiveAdminMemo)}
          className={`${actionClassName} bg-amber-600 text-slate-950 hover:bg-amber-400`}
        >
          수정 요청
        </Button>
        <Button
          type="button"
          data-testid="admin-report-action-warning"
          aria-label="경고 처리 (WARNING)"
          onClick={() => handleReportAction(selectedReportDetail.id, 'WARNING', effectiveAdminMemo)}
          className={`${actionClassName} col-span-2 bg-sky-600 text-white hover:bg-sky-400`}
        >
          경고
        </Button>
      </div>
    </div>
  ) : undefined;

  return (
    <PlainDialog
      open
      onClose={closeReportDetail}
      placement="right"
      initialFocus="container"
      title={(
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-white [overflow-wrap:anywhere]">
          <span>신고 케이스 상세</span>
          <span className="font-mono text-base text-slate-300">Case #{selectedReportId}</span>
        </span>
      )}
      description="신고 내용과 이의 제기 내역을 검토한 뒤 필요한 조치를 선택하세요."
      contentTestId="admin-report-detail-drawer"
      className="max-w-xl dark admin-report-detail-dialog border-slate-700 text-slate-100 focus:outline-none"
      bodyClassName="p-4 sm:p-5"
      footer={actions}
    >
      <div
        className="min-w-0 [overflow-wrap:anywhere]"
        aria-busy={reportDetailLoading}
      >
        {reportDetailLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg border border-slate-800 bg-slate-800/40 px-4 py-6 text-center text-slate-300"
          >
            상세 정보를 불러오는 중...
          </div>
        ) : reportDetailError ? (
          <p
            data-testid="admin-report-detail-error"
            className="rounded-lg border border-slate-800 bg-slate-800/40 px-4 py-6 text-center text-slate-300 [overflow-wrap:anywhere]"
          >
            {reportDetailError}
          </p>
        ) : !selectedReportDetail ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg border border-slate-800 bg-slate-800/40 px-4 py-6 text-center text-slate-300"
          >
            상세 정보를 찾을 수 없습니다.
          </div>
        ) : (
          <div className="space-y-5">
            <dl className="grid grid-cols-1 gap-3 text-caption sm:grid-cols-2">
              <div className="min-w-0 rounded-lg border border-slate-800 p-3">
                <dt className="text-slate-500">상태</dt>
                <dd className={valueClassName}>{selectedReportDetail.status || '-'}</dd>
              </div>
              <div className="min-w-0 rounded-lg border border-slate-800 p-3">
                <dt className="text-slate-500">사유</dt>
                <dd className={valueClassName}>{selectedReportDetail.reason || '-'}</dd>
              </div>
              <div className="min-w-0 rounded-lg border border-slate-800 p-3">
                <dt className="text-slate-500">신고자</dt>
                <dd className={valueClassName}>{selectedReportDetail.reporterHandle || '-'}</dd>
              </div>
              <div className="min-w-0 rounded-lg border border-slate-800 p-3">
                <dt className="text-slate-500">처리 시각</dt>
                <dd className={valueClassName}>
                  {selectedReportDetail.handledAt ? getTimeAgo(selectedReportDetail.handledAt) : '-'}
                </dd>
              </div>
            </dl>

            <section className="min-w-0 rounded-lg border border-slate-800 p-3 text-caption">
              <h3 className="mb-1 text-slate-500">게시물 미리보기</h3>
              <p className="min-w-0 whitespace-pre-wrap text-slate-200 [overflow-wrap:anywhere]">
                {selectedReportDetail.postPreview || '-'}
              </p>
            </section>

            <section className="min-w-0 rounded-lg border border-slate-800 p-3 text-caption">
              <h3 className="mb-3 text-slate-500">이의 제기 및 증빙</h3>
              <dl className="grid min-w-0 gap-3">
                <div className="min-w-0">
                  <dt className="text-slate-500">요청 조치</dt>
                  <dd className={valueClassName}>{selectedReportDetail.requestedAction || '-'}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-slate-500">이의 제기 상태</dt>
                  <dd className={valueClassName}>{selectedReportDetail.appealStatus || '-'}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-slate-500">이의 제기 사유</dt>
                  <dd className={valueClassName}>{selectedReportDetail.appealReason || '-'}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-slate-500">이의 제기 횟수</dt>
                  <dd className={valueClassName}>{selectedReportDetail.appealCount ?? 0}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-slate-500">증빙 URL</dt>
                  <dd className={valueClassName}>{selectedReportDetail.evidenceUrl || '-'}</dd>
                </div>
              </dl>
            </section>

            <div className="min-w-0 rounded-lg border border-slate-800 p-3">
              <label
                htmlFor="admin-report-admin-memo"
                className="mb-2 block text-caption text-slate-400"
              >
                관리자 메모
              </label>
              <textarea
                id="admin-report-admin-memo"
                value={effectiveAdminMemo}
                onChange={(event) => updateAdminMemo(event.target.value)}
                className="min-h-24 w-full min-w-0 resize-none rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-base text-slate-100 [overflow-wrap:anywhere] placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="조치 근거를 입력하세요."
              />
            </div>
          </div>
        )}
      </div>
    </PlainDialog>
  );
}
