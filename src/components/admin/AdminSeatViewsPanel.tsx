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
import type { AdminSeatView, AdminSeatViewFilters } from '../../types/admin';
import { formatStadiumDisplayName } from '../../utils/stadiumDisplay';
import { AdminEyeIcon } from './AdminDetailIcons';
import { AdminBadge, adminNativeSelectClassName } from './AdminPanelPrimitives';

type SeatViewModerationPayload = {
  adminLabel: 'SEAT_VIEW' | 'TICKET' | 'OTHER' | 'INAPPROPRIATE';
  moderationStatus: 'APPROVED' | 'REJECTED';
  adminMemo?: string;
};

interface AdminSeatViewsPanelProps {
  seatViewFilters: AdminSeatViewFilters;
  seatViewsLoading: boolean;
  seatViews: AdminSeatView[];
  updateSeatViewFilters: (next: Partial<AdminSeatViewFilters>) => void;
  resetSeatViewFilters: () => void;
  openSeatViewDetail: (seatViewId: number) => void;
  handleSeatViewAction: (
    seatViewId: number,
    payload: SeatViewModerationPayload
  ) => void | Promise<void>;
  visualQaStateOverride?: AdminSeatViewsPanelVisualQaStateOverride;
}

export type AdminSeatViewsPanelVisualQaStateOverride = {
  interactive: boolean;
};

const defaultSeatViewFilters: AdminSeatViewFilters = {
  moderationStatus: 'all',
  stadium: '',
  aiSuggestedLabel: 'all',
  adminLabel: 'all',
  ticketVerified: 'all',
};
const filterLabelClassName = 'mb-1 block text-caption font-medium text-slate-400';
const seatViewSelectClassName = `${adminNativeSelectClassName} min-h-11 sm:min-h-9`;
const seatViewRowActionClassName = 'min-h-11 min-w-11 whitespace-normal [overflow-wrap:anywhere] sm:min-h-8 sm:min-w-8';

export function AdminSeatViewsPanel({
  seatViewFilters,
  seatViewsLoading,
  seatViews,
  updateSeatViewFilters,
  resetSeatViewFilters,
  openSeatViewDetail,
  handleSeatViewAction,
  visualQaStateOverride: requestedVisualQaStateOverride,
}: AdminSeatViewsPanelProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const visualQaInteractive = visualQaStateOverride?.interactive === true;
  const [visualQaSeatViewFilters, setVisualQaSeatViewFilters] = useState(seatViewFilters);

  useEffect(() => {
    if (visualQaInteractive) {
      setVisualQaSeatViewFilters(seatViewFilters);
    }
  }, [seatViewFilters, visualQaInteractive]);

  const effectiveSeatViewFilters = visualQaInteractive
    ? visualQaSeatViewFilters
    : seatViewFilters;
  const applySeatViewFilters = visualQaInteractive
    ? (next: Partial<AdminSeatViewFilters>) => {
        setVisualQaSeatViewFilters((previous) => ({ ...previous, ...next }));
      }
    : updateSeatViewFilters;
  const clearSeatViewFilters = visualQaInteractive
    ? () => setVisualQaSeatViewFilters(defaultSeatViewFilters)
    : resetSeatViewFilters;

  return (
    <div data-testid="admin-seat-views-panel" className="min-w-0 px-1">
      <div className="mb-4 grid min-w-0 grid-cols-1 items-end gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <label htmlFor="admin-seat-views-status-filter" className="min-w-0">
          <span className={filterLabelClassName}>상태</span>
          <select
            id="admin-seat-views-status-filter"
            value={effectiveSeatViewFilters.moderationStatus}
            data-testid="admin-seat-views-status-filter"
            onChange={(e) => applySeatViewFilters({ moderationStatus: e.target.value })}
            className={seatViewSelectClassName}
          >
            <option value="all">상태 전체</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </label>
        <label htmlFor="admin-seat-views-stadium-filter" className="min-w-0">
          <span className={filterLabelClassName}>구장</span>
          <Input
            id="admin-seat-views-stadium-filter"
            data-testid="admin-seat-views-stadium-filter"
            value={effectiveSeatViewFilters.stadium}
            onChange={(e) => applySeatViewFilters({ stadium: e.target.value })}
            placeholder="구장명 필터"
            className="min-h-11 border-slate-700 bg-slate-800/50 text-slate-200 sm:min-h-9"
          />
        </label>
        <label htmlFor="admin-seat-views-ai-filter" className="min-w-0">
          <span className={filterLabelClassName}>AI 라벨</span>
          <select
            id="admin-seat-views-ai-filter"
            value={effectiveSeatViewFilters.aiSuggestedLabel}
            data-testid="admin-seat-views-ai-filter"
            onChange={(e) => applySeatViewFilters({ aiSuggestedLabel: e.target.value })}
            className={seatViewSelectClassName}
          >
            <option value="all">AI 라벨 전체</option>
            <option value="SEAT_VIEW">SEAT_VIEW</option>
            <option value="TICKET">TICKET</option>
            <option value="OTHER">OTHER</option>
            <option value="INAPPROPRIATE">INAPPROPRIATE</option>
          </select>
        </label>
        <label htmlFor="admin-seat-views-admin-filter" className="min-w-0">
          <span className={filterLabelClassName}>관리자 라벨</span>
          <select
            id="admin-seat-views-admin-filter"
            value={effectiveSeatViewFilters.adminLabel}
            data-testid="admin-seat-views-admin-filter"
            onChange={(e) => applySeatViewFilters({ adminLabel: e.target.value })}
            className={seatViewSelectClassName}
          >
            <option value="all">관리자 라벨 전체</option>
            <option value="SEAT_VIEW">SEAT_VIEW</option>
            <option value="TICKET">TICKET</option>
            <option value="OTHER">OTHER</option>
            <option value="INAPPROPRIATE">INAPPROPRIATE</option>
          </select>
        </label>
        <label htmlFor="admin-seat-views-ticket-filter" className="min-w-0">
          <span className={filterLabelClassName}>티켓 인증</span>
          <select
            id="admin-seat-views-ticket-filter"
            value={effectiveSeatViewFilters.ticketVerified}
            data-testid="admin-seat-views-ticket-filter"
            onChange={(e) => applySeatViewFilters({ ticketVerified: e.target.value })}
            className={seatViewSelectClassName}
          >
            <option value="all">티켓 인증 전체</option>
            <option value="verified">인증 완료</option>
            <option value="unverified">미인증</option>
          </select>
        </label>
        <Button
          variant="outline"
          data-testid="admin-seat-views-reset-filters"
          className="min-h-11 w-full border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 sm:min-h-9"
          onClick={clearSeatViewFilters}
        >
          필터 초기화
        </Button>
      </div>

      <div
        data-testid="admin-seat-views-table-region"
        className="max-h-[320px] min-w-0 overflow-y-auto rounded-xl border border-slate-800"
        aria-busy={seatViewsLoading}
      >
        {seatViewsLoading ? (
          <div
            className="flex min-h-40 items-center justify-center px-4 text-center text-slate-500"
            role="status"
            aria-live="polite"
          >
            시야뷰 후보 로딩 중...
          </div>
        ) : seatViews.length === 0 ? (
          <div
            className="flex min-h-40 items-center justify-center px-4 text-center text-slate-500"
            role="status"
          >
            시야뷰 후보가 없습니다.
          </div>
        ) : (
        <Table aria-label="시야뷰 후보 목록" className="min-w-[1088px] table-fixed">
          <TableHeader>
            <TableRow className="border-slate-700 bg-slate-800/50 hover:bg-slate-800/50">
              <TableHead className="w-24 font-semibold text-slate-400">ID</TableHead>
              <TableHead className="w-28 font-semibold text-slate-400">사진</TableHead>
              <TableHead className="w-56 font-semibold text-slate-400">구장/좌석</TableHead>
              <TableHead className="w-40 font-semibold text-slate-400">AI</TableHead>
              <TableHead className="w-28 font-semibold text-slate-400">인증</TableHead>
              <TableHead className="w-40 font-semibold text-slate-400">상태</TableHead>
              <TableHead className="w-56 text-right font-semibold text-slate-400">상세/조치</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {seatViews.map((seatView) => {
              const stadiumName = formatStadiumDisplayName(seatView.stadium);
              const seatPosition = [
                seatView.section,
                seatView.block,
                seatView.seatRow,
                seatView.seatNumber,
              ].filter(Boolean).join(' / ') || '-';
              const aiLabel = seatView.aiSuggestedLabel || '-';
              const moderationStatus = seatView.moderationStatus || '미제출';

              return (
                <TableRow
                  key={seatView.id}
                  data-testid={`admin-seat-view-row-${seatView.id}`}
                  className="cursor-pointer border-slate-800 transition-colors duration-200 hover:bg-slate-800/30"
                  onClick={() => openSeatViewDetail(seatView.id)}
                >
                  <TableCell className="w-24 whitespace-nowrap font-mono text-caption text-slate-300">
                    {seatView.id}
                  </TableCell>
                  <TableCell className="w-28">
                    <img
                      src={seatView.photoUrl}
                      alt={`시야뷰 후보 ${seatView.id}번`}
                      loading="lazy"
                      className="h-14 w-14 rounded-lg border border-slate-800 object-cover"
                    />
                  </TableCell>
                  <TableCell className="w-56 max-w-56 text-caption text-slate-300">
                    <div className="truncate" title={stadiumName}>{stadiumName}</div>
                    <div className="truncate text-slate-500" title={seatPosition}>
                      {seatPosition}
                    </div>
                  </TableCell>
                  <TableCell className="w-40 max-w-40 text-caption text-slate-300">
                    <div className="truncate" title={aiLabel}>{aiLabel}</div>
                    <div className="text-slate-500">
                      {seatView.aiConfidence != null ? `${Math.round(seatView.aiConfidence * 100)}%` : '미분류'}
                    </div>
                  </TableCell>
                  <TableCell className="w-28 whitespace-nowrap">
                    <AdminBadge className={seatView.ticketVerified ? 'max-w-full truncate border-0 bg-emerald-500/20 text-emerald-300' : 'max-w-full truncate border-0 bg-slate-700 text-slate-300'}>
                      {seatView.ticketVerified ? '인증 완료' : '미인증'}
                    </AdminBadge>
                  </TableCell>
                  <TableCell className="w-40 whitespace-nowrap">
                    <span className="block min-w-0" title={moderationStatus}>
                      <AdminBadge
                        className={
                          seatView.moderationStatus === 'APPROVED'
                            ? 'max-w-full truncate border-0 bg-emerald-500/20 text-emerald-300'
                            : seatView.moderationStatus === 'REJECTED'
                              ? 'max-w-full truncate border-0 bg-red-500/20 text-red-300'
                              : 'max-w-full truncate border-0 bg-amber-500/20 text-amber-300'
                        }
                      >
                        {moderationStatus}
                      </AdminBadge>
                    </span>
                  </TableCell>
                  <TableCell className="w-56 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid={`admin-seat-view-detail-${seatView.id}`}
                        aria-label={`시야뷰 ${seatView.id}번 상세 보기`}
                        className={`${seatViewRowActionClassName} text-slate-300 hover:bg-slate-700 hover:text-white`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openSeatViewDetail(seatView.id);
                        }}
                      >
                        <AdminEyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid={`admin-seat-view-approve-${seatView.id}`}
                        aria-label={`시야뷰 ${seatView.id}번 승인`}
                        className={`${seatViewRowActionClassName} text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSeatViewAction(seatView.id, {
                            adminLabel: 'SEAT_VIEW',
                            moderationStatus: 'APPROVED',
                            adminMemo: '관리자 승인',
                          });
                        }}
                      >
                        승인
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        )}
      </div>
    </div>
  );
}
