import { useEffect, useState } from 'react';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import type { AdminReport, AdminReportFilters } from '../../types/admin';
import { getTimeAgo } from '../../utils/formatters';
import { AdminEyeIcon } from './AdminDetailIcons';
import { AdminStatusBadge, adminNativeSelectClassName } from './AdminPanelPrimitives';

type AdminReportAction =
  | 'TAKE_DOWN'
  | 'REQUIRE_MODIFICATION'
  | 'WARNING'
  | 'DISMISS'
  | 'RESTORE';

interface AdminReportsPanelProps {
  reportFilters: AdminReportFilters;
  reportsLoading: boolean;
  reports: AdminReport[];
  updateReportFilters: (next: Partial<AdminReportFilters>) => void;
  resetReportFilters: () => void;
  openReportDetail: (reportId: number) => void;
  handleReportAction: (
    reportId: number,
    action: AdminReportAction,
    adminMemo?: string
  ) => void | Promise<void>;
  visualQaStateOverride?: AdminReportsPanelVisualQaStateOverride;
}

export type AdminReportsPanelVisualQaStateOverride = {
  interactive: boolean;
};

const reportStatusLabel: Record<string, string> = {
  PENDING: '대기',
  IN_REVIEW: '검토중',
  RESOLVED: '완료',
  CLOSED: '종결',
};

const defaultReportFilters: AdminReportFilters = {
  status: 'all',
  reason: 'all',
  fromDate: '',
  toDate: '',
};
const filterLabelClassName = 'mb-1 block text-caption font-medium text-slate-400';
const reportSelectClassName = `${adminNativeSelectClassName} min-h-11 sm:min-h-9`;
const reportRowActionClassName = 'min-h-11 min-w-11 whitespace-normal [overflow-wrap:anywhere] sm:min-h-8 sm:min-w-8';

export function AdminReportsPanel({
  reportFilters,
  reportsLoading,
  reports,
  updateReportFilters,
  resetReportFilters,
  openReportDetail,
  handleReportAction,
  visualQaStateOverride: requestedVisualQaStateOverride,
}: AdminReportsPanelProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const visualQaInteractive = visualQaStateOverride?.interactive === true;
  const [visualQaReportFilters, setVisualQaReportFilters] = useState(reportFilters);

  useEffect(() => {
    if (visualQaInteractive) {
      setVisualQaReportFilters(reportFilters);
    }
  }, [reportFilters, visualQaInteractive]);

  const effectiveReportFilters = visualQaInteractive ? visualQaReportFilters : reportFilters;
  const applyReportFilters = visualQaInteractive
    ? (next: Partial<AdminReportFilters>) => {
        setVisualQaReportFilters((previous) => ({ ...previous, ...next }));
      }
    : updateReportFilters;
  const clearReportFilters = visualQaInteractive
    ? () => setVisualQaReportFilters(defaultReportFilters)
    : resetReportFilters;

  return (
    <div data-testid="admin-reports-panel" className="min-w-0 px-1">
      <div className="mb-4 grid min-w-0 grid-cols-1 items-end gap-2 md:grid-cols-5">
        <label htmlFor="admin-reports-status-filter" className="min-w-0">
          <span className={filterLabelClassName}>상태</span>
          <select
            id="admin-reports-status-filter"
            value={effectiveReportFilters.status}
            data-testid="admin-reports-status-filter"
            onChange={(e) => applyReportFilters({ status: e.target.value })}
            className={reportSelectClassName}
          >
            <option value="all">상태 전체</option>
            <option value="PENDING">PENDING</option>
            <option value="IN_REVIEW">IN_REVIEW</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </label>
        <label htmlFor="admin-reports-reason-filter" className="min-w-0">
          <span className={filterLabelClassName}>사유</span>
          <select
            id="admin-reports-reason-filter"
            value={effectiveReportFilters.reason}
            data-testid="admin-reports-reason-filter"
            onChange={(e) => applyReportFilters({ reason: e.target.value })}
            className={reportSelectClassName}
          >
            <option value="all">사유 전체</option>
            <option value="SPAM">SPAM</option>
            <option value="INAPPROPRIATE_CONTENT">INAPPROPRIATE_CONTENT</option>
            <option value="ABUSIVE_LANGUAGE">ABUSIVE_LANGUAGE</option>
            <option value="ADVERTISEMENT">ADVERTISEMENT</option>
            <option value="COPYRIGHT_INFRINGEMENT">COPYRIGHT_INFRINGEMENT</option>
            <option value="FAKE_INFORMATION">FAKE_INFORMATION</option>
            <option value="OTHER">OTHER</option>
          </select>
        </label>
        <label htmlFor="admin-reports-from-date-filter" className="min-w-0">
          <span className={filterLabelClassName}>시작일</span>
          <Input
            id="admin-reports-from-date-filter"
            data-testid="admin-reports-from-date-filter"
            type="date"
            value={effectiveReportFilters.fromDate}
            onChange={(e) => applyReportFilters({ fromDate: e.target.value })}
            className="border-slate-700 bg-slate-800/50 text-slate-200"
          />
        </label>
        <label htmlFor="admin-reports-to-date-filter" className="min-w-0">
          <span className={filterLabelClassName}>종료일</span>
          <Input
            id="admin-reports-to-date-filter"
            data-testid="admin-reports-to-date-filter"
            type="date"
            value={effectiveReportFilters.toDate}
            onChange={(e) => applyReportFilters({ toDate: e.target.value })}
            className="border-slate-700 bg-slate-800/50 text-slate-200"
          />
        </label>
        <Button
          variant="outline"
          data-testid="admin-reports-reset-filters"
          className="min-h-11 w-full border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 sm:min-h-9"
          onClick={clearReportFilters}
        >
          필터 초기화
        </Button>
      </div>

      <div
        data-testid="admin-reports-table-region"
        className="max-h-[320px] min-w-0 overflow-y-auto rounded-xl border border-slate-800"
        aria-busy={reportsLoading}
      >
        {reportsLoading ? (
          <div
            className="flex min-h-40 items-center justify-center px-4 text-center text-slate-500"
            role="status"
            aria-live="polite"
          >
            신고 목록 로딩 중...
          </div>
        ) : reports.length === 0 ? (
          <div
            className="flex min-h-40 items-center justify-center px-4 text-center text-slate-500"
            role="status"
          >
            신고 케이스가 없습니다.
          </div>
        ) : (
          <Table aria-label="신고 목록" className="min-w-[1088px] table-fixed">
            <TableHeader>
              <TableRow className="border-slate-700 bg-slate-800/50 hover:bg-slate-800/50">
                <TableHead className="w-24 font-semibold text-slate-400">ID</TableHead>
                <TableHead className="w-40 font-semibold text-slate-400">사유</TableHead>
                <TableHead className="w-28 font-semibold text-slate-400">상태</TableHead>
                <TableHead className="w-56 font-semibold text-slate-400">게시물</TableHead>
                <TableHead className="w-40 font-semibold text-slate-400">신고자</TableHead>
                <TableHead className="w-28 font-semibold text-slate-400">접수일</TableHead>
                <TableHead className="w-56 text-right font-semibold text-slate-400">상세/조치</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow
                  key={report.id}
                  data-testid={`admin-report-row-${report.id}`}
                  className="cursor-pointer border-slate-800 transition-colors duration-200 hover:bg-slate-800/30"
                  onClick={() => openReportDetail(report.id)}
                >
                  <TableCell className="w-24 whitespace-nowrap font-mono text-caption text-slate-300">
                    {report.id}
                  </TableCell>
                  <TableCell
                    className="w-40 max-w-40 truncate whitespace-nowrap text-slate-300 [overflow-wrap:anywhere]"
                    title={report.reason || undefined}
                  >
                    {report.reason || '-'}
                  </TableCell>
                  <TableCell className="w-28 whitespace-nowrap">
                    <AdminStatusBadge
                      status={report.status || 'PENDING'}
                      label={report.status ? (reportStatusLabel[report.status] || report.status) : '대기'}
                    />
                  </TableCell>
                  <TableCell
                    className="w-56 max-w-56 truncate whitespace-nowrap text-slate-300"
                    title={report.postPreview || undefined}
                  >
                    {report.postPreview || '-'}
                  </TableCell>
                  <TableCell
                    className="w-40 max-w-40 truncate whitespace-nowrap text-slate-300 [overflow-wrap:anywhere]"
                    title={report.reporterHandle || undefined}
                  >
                    {report.reporterHandle || '-'}
                  </TableCell>
                  <TableCell className="w-28 whitespace-nowrap text-caption text-slate-400">
                    {getTimeAgo(report.createdAt)}
                  </TableCell>
                  <TableCell className="w-56 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid={`admin-report-detail-${report.id}`}
                        aria-label={`신고 ${report.id} 상세 보기`}
                        className={`${reportRowActionClassName} text-slate-300 hover:bg-slate-700 hover:text-white`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openReportDetail(report.id);
                        }}
                      >
                        <AdminEyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid={`admin-report-take-down-${report.id}`}
                        aria-label={`신고 ${report.id} 게시물 비공개`}
                        className={`${reportRowActionClassName} text-red-300 hover:bg-red-500/10 hover:text-red-200`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReportAction(report.id, 'TAKE_DOWN', '정책 위반 게시물 비공개');
                        }}
                      >
                        비공개
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid={`admin-report-dismiss-${report.id}`}
                        aria-label={`신고 ${report.id} 기각`}
                        className={`${reportRowActionClassName} text-slate-300 hover:bg-slate-700 hover:text-white`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReportAction(report.id, 'DISMISS', '검토 결과 위반 아님');
                        }}
                      >
                        기각
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
