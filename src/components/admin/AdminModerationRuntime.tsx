import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import {
  fetchAdminReportDetail,
  fetchAdminReports,
  fetchAdminSeatViewDetail,
  fetchAdminSeatViews,
  decideAdminReportAppeal,
  handleAdminReport,
  handleAdminSeatView,
} from '../../api/admin';
import type {
  AdminReport,
  AdminReportAppealDecision,
  AdminReportFilters,
  AdminSeatView,
  AdminSeatViewPage,
  AdminSeatViewFilters,
} from '../../types/admin';
import type { AdminTabValue } from './adminPageTabs';
import { normalizeAdminSeatViewPageNumber } from './adminSeatViewPagination';

const OffseasonMovementAdminPanel = lazy(() =>
  import('./OffseasonMovementAdminPanel').then((module) => ({
    default: module.OffseasonMovementAdminPanel,
  })),
);
const ClientErrorAdminPanel = lazy(() =>
  import('./ClientErrorAdminPanel').then((module) => ({ default: module.ClientErrorAdminPanel })),
);
const AdminReportsPanel = lazy(() =>
  import('./AdminReportsPanel').then((module) => ({ default: module.AdminReportsPanel })),
);
const AdminGameStatusRepairPanel = lazy(() =>
  import('./AdminGameStatusRepairPanel').then((module) => ({
    default: module.AdminGameStatusRepairPanel,
  })),
);
const AdminSeatViewsPanel = lazy(() =>
  import('./AdminSeatViewsPanel').then((module) => ({ default: module.AdminSeatViewsPanel })),
);
const AdminReportDetailDrawer = lazy(() => import('./AdminReportDetailDrawer'));
const AdminSeatViewDetailDrawer = lazy(() => import('./AdminSeatViewDetailDrawer'));

type AdminReportAction =
  | 'TAKE_DOWN'
  | 'REQUIRE_MODIFICATION'
  | 'WARNING'
  | 'DISMISS'
  | 'RESTORE';

const DEFAULT_REPORT_FILTERS: AdminReportFilters = {
  status: 'all',
  reason: 'all',
  fromDate: '',
  toDate: '',
};

const DEFAULT_SEAT_VIEW_FILTERS: AdminSeatViewFilters = {
  moderationStatus: 'all',
  stadium: '',
  aiSuggestedLabel: 'all',
  adminLabel: 'all',
  ticketVerified: 'all',
};

const EMPTY_SEAT_VIEW_PAGE: AdminSeatViewPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  size: 20,
  number: 0,
  last: true,
};
const ADMIN_SEAT_VIEW_PAGE_SIZE = 20;

interface AdminModerationRuntimeProps {
  activeTab: AdminTabValue;
  onErrorChange: (next: string | null) => void;
  onSuccessMessageChange: (next: string | null) => void;
  visualQaPhase?: 'fallback' | 'resolved';
  visualQaRuntimeOverride?: ReactNode;
}

export default function AdminModerationRuntime({
  activeTab,
  onErrorChange,
  onSuccessMessageChange,
  visualQaPhase: requestedVisualQaPhase,
  visualQaRuntimeOverride: visualQaRuntimeOverrideProp,
}: AdminModerationRuntimeProps) {
  const visualQaPhase = import.meta.env.PROD === true ? undefined : requestedVisualQaPhase;
  const visualQaRuntimeOverride = import.meta.env.PROD === true ? undefined : visualQaRuntimeOverrideProp;
  if (visualQaPhase === 'fallback') {
    return <div data-testid="admin-moderation-runtime-fallback">관리자 검수 화면을 준비하고 있습니다.</div>;
  }
  if (visualQaPhase === 'resolved' && visualQaRuntimeOverride) {
    return <>{visualQaRuntimeOverride}</>;
  }

  const [reports, setReports] = useState<AdminReport[]>([]);
  const [seatViews, setSeatViews] = useState<AdminSeatView[]>([]);
  const [seatViewsPage, setSeatViewsPage] = useState<AdminSeatViewPage>(EMPTY_SEAT_VIEW_PAGE);
  const [seatViewsPageNumber, setSeatViewsPageNumber] = useState(0);
  const [reportFilters, setReportFilters] = useState<AdminReportFilters>(DEFAULT_REPORT_FILTERS);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const reportsErrorRequestRef = useRef(0);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [selectedReportDetail, setSelectedReportDetail] = useState<AdminReport | null>(null);
  const [reportDetailLoading, setReportDetailLoading] = useState(false);
  const [reportDetailError, setReportDetailError] = useState<string | null>(null);
  const reportDetailErrorRequestRef = useRef(0);
  const appealDecisionInFlightRef = useRef(false);
  const [appealDecisionLoading, setAppealDecisionLoading] = useState(false);
  const [seatViewFilters, setSeatViewFilters] = useState<AdminSeatViewFilters>(DEFAULT_SEAT_VIEW_FILTERS);
  const [seatViewsLoading, setSeatViewsLoading] = useState(false);
  const [seatViewsError, setSeatViewsError] = useState<string | null>(null);
  const seatViewsErrorRequestRef = useRef(0);
  const [selectedSeatViewId, setSelectedSeatViewId] = useState<number | null>(null);
  const [selectedSeatViewDetail, setSelectedSeatViewDetail] = useState<AdminSeatView | null>(null);
  const [seatViewDetailLoading, setSeatViewDetailLoading] = useState(false);
  const [seatViewDetailError, setSeatViewDetailError] = useState<string | null>(null);
  const seatViewDetailErrorRequestRef = useRef(0);
  const [adminMemo, setAdminMemo] = useState('');
  const [hasMountedGameStatusRuntime, setHasMountedGameStatusRuntime] = useState(
    activeTab === 'gameStatus',
  );

  const updateReportFilters = (next: Partial<AdminReportFilters>) => {
    setReportFilters((prev) => ({ ...prev, ...next }));
  };

  const resetReportFilters = () => {
    setReportFilters(DEFAULT_REPORT_FILTERS);
  };

  const updateSeatViewFilters = (next: Partial<AdminSeatViewFilters>) => {
    setSeatViewsPageNumber(0);
    setSeatViewFilters((prev) => ({ ...prev, ...next }));
  };

  const resetSeatViewFilters = () => {
    setSeatViewsPageNumber(0);
    setSeatViewFilters(DEFAULT_SEAT_VIEW_FILTERS);
  };

  const loadReports = useCallback(async () => {
    const errorRequest = ++reportsErrorRequestRef.current;
    setReportsLoading(true);
    setReportsError(null);
    onErrorChange(null);
    try {
      const data = await fetchAdminReports({
        status: reportFilters.status !== 'all' ? reportFilters.status : undefined,
        reason: reportFilters.reason !== 'all' ? reportFilters.reason : undefined,
        fromDate: reportFilters.fromDate || undefined,
        toDate: reportFilters.toDate || undefined,
        page: 0,
        size: 100,
      });
      setReports(data.content || []);
      if (errorRequest === reportsErrorRequestRef.current) setReportsError(null);
    } catch (error) {
      console.error('신고 조회 오류:', error);
      if (errorRequest === reportsErrorRequestRef.current) setReportsError('신고 목록을 불러오는데 실패했습니다.');
      onErrorChange('신고 목록을 불러오는데 실패했습니다.');
    } finally {
      setReportsLoading(false);
    }
  }, [onErrorChange, reportFilters]);

  const openReportDetail = async (reportId: number) => {
    const errorRequest = ++reportDetailErrorRequestRef.current;
    setSelectedReportId(reportId);
    setSelectedReportDetail(null);
    setReportDetailError(null);
    setReportDetailLoading(true);
    try {
      const detail = await fetchAdminReportDetail(reportId);
      setSelectedReportDetail(detail);
      if (errorRequest === reportDetailErrorRequestRef.current) setReportDetailError(null);
    } catch (error) {
      console.error('신고 상세 조회 오류:', error);
      if (errorRequest === reportDetailErrorRequestRef.current) setReportDetailError('신고 상세를 불러오는데 실패했습니다.');
      onErrorChange('신고 상세를 불러오는데 실패했습니다.');
    } finally {
      setReportDetailLoading(false);
    }
  };

  const closeReportDetail = () => {
    reportDetailErrorRequestRef.current++;
    setSelectedReportId(null);
    setSelectedReportDetail(null);
    setReportDetailError(null);
  };

  const refreshSelectedReportDetail = useCallback(async () => {
    if (!selectedReportId) {
      return;
    }

    const errorRequest = ++reportDetailErrorRequestRef.current;
    setReportDetailError(null);
    setReportDetailLoading(true);
    try {
      const detail = await fetchAdminReportDetail(selectedReportId);
      setSelectedReportDetail(detail);
      if (errorRequest === reportDetailErrorRequestRef.current) setReportDetailError(null);
    } catch (error) {
      console.error('신고 상세 재조회 오류:', error);
      setSelectedReportDetail(null);
      if (errorRequest === reportDetailErrorRequestRef.current) setReportDetailError('신고 상세를 갱신하지 못했습니다.');
      onErrorChange('신고 상세를 갱신하지 못했습니다.');
    } finally {
      setReportDetailLoading(false);
    }
  }, [onErrorChange, selectedReportId]);

  const handleReportAction = async (
    reportId: number,
    action: AdminReportAction,
    nextAdminMemo?: string,
  ) => {
    try {
      await handleAdminReport(reportId, { action, adminMemo: nextAdminMemo });
      onSuccessMessageChange('신고 케이스가 처리되었습니다.');
      await loadReports();
      if (selectedReportId === reportId) {
        await refreshSelectedReportDetail();
      }
      window.setTimeout(() => onSuccessMessageChange(null), 3000);
    } catch (error) {
      console.error('신고 처리 오류:', error);
      onErrorChange('신고 처리에 실패했습니다.');
    }
  };

  const handleAppealDecision = async (
    reportId: number,
    decision: AdminReportAppealDecision,
  ) => {
    if (appealDecisionInFlightRef.current) return;
    appealDecisionInFlightRef.current = true;
    setAppealDecisionLoading(true);

    try {
      await decideAdminReportAppeal(reportId, decision);
      onSuccessMessageChange('이의제기 상태가 갱신되었습니다.');
      await loadReports();
      if (selectedReportId === reportId) {
        await refreshSelectedReportDetail();
      }
      window.setTimeout(() => onSuccessMessageChange(null), 3000);
    } catch (error) {
      console.error('이의제기 처리 오류:', error);
      onErrorChange('이의제기 결정에 실패했습니다.');
    } finally {
      appealDecisionInFlightRef.current = false;
      setAppealDecisionLoading(false);
    }
  };

  const loadSeatViews = useCallback(async () => {
    const errorRequest = ++seatViewsErrorRequestRef.current;
    setSeatViewsLoading(true);
    setSeatViewsError(null);
    onErrorChange(null);
    try {
      const data = await fetchAdminSeatViews({
        moderationStatus:
          seatViewFilters.moderationStatus !== 'all'
            ? seatViewFilters.moderationStatus
            : undefined,
        stadium: seatViewFilters.stadium || undefined,
        aiSuggestedLabel:
          seatViewFilters.aiSuggestedLabel !== 'all'
            ? seatViewFilters.aiSuggestedLabel
            : undefined,
        adminLabel:
          seatViewFilters.adminLabel !== 'all' ? seatViewFilters.adminLabel : undefined,
        ticketVerified:
          seatViewFilters.ticketVerified === 'all'
            ? undefined
            : seatViewFilters.ticketVerified === 'verified',
        page: seatViewsPageNumber,
        size: ADMIN_SEAT_VIEW_PAGE_SIZE,
      });
      const validPageNumber = normalizeAdminSeatViewPageNumber(seatViewsPageNumber, data.totalPages);
      if (validPageNumber !== seatViewsPageNumber) {
        setSeatViewsPageNumber(validPageNumber);
        return;
      }
      setSeatViews(data.content || []);
      setSeatViewsPage(data);
      if (errorRequest === seatViewsErrorRequestRef.current) setSeatViewsError(null);
    } catch (error) {
      console.error('시야뷰 후보 조회 오류:', error);
      if (errorRequest === seatViewsErrorRequestRef.current) setSeatViewsError('시야뷰 후보를 불러오는데 실패했습니다.');
      onErrorChange('시야뷰 후보를 불러오는데 실패했습니다.');
    } finally {
      setSeatViewsLoading(false);
    }
  }, [onErrorChange, seatViewFilters, seatViewsPageNumber]);

  const openSeatViewDetail = async (seatViewId: number) => {
    const errorRequest = ++seatViewDetailErrorRequestRef.current;
    setSelectedSeatViewId(seatViewId);
    setSeatViewDetailError(null);
    setSeatViewDetailLoading(true);
    try {
      const detail = await fetchAdminSeatViewDetail(seatViewId);
      setSelectedSeatViewDetail(detail);
      if (errorRequest === seatViewDetailErrorRequestRef.current) setSeatViewDetailError(null);
    } catch (error) {
      console.error('시야뷰 후보 상세 조회 오류:', error);
      if (errorRequest === seatViewDetailErrorRequestRef.current) setSeatViewDetailError('시야뷰 후보 상세를 불러오는데 실패했습니다.');
      onErrorChange('시야뷰 후보 상세를 불러오는데 실패했습니다.');
    } finally {
      setSeatViewDetailLoading(false);
    }
  };

  const closeSeatViewDetail = () => {
    seatViewDetailErrorRequestRef.current++;
    setSelectedSeatViewId(null);
    setSelectedSeatViewDetail(null);
    setSeatViewDetailError(null);
  };

  const refreshSelectedSeatViewDetail = useCallback(async () => {
    if (!selectedSeatViewId) {
      return;
    }

    const errorRequest = ++seatViewDetailErrorRequestRef.current;
    setSeatViewDetailError(null);
    setSeatViewDetailLoading(true);
    try {
      const detail = await fetchAdminSeatViewDetail(selectedSeatViewId);
      setSelectedSeatViewDetail(detail);
      if (errorRequest === seatViewDetailErrorRequestRef.current) setSeatViewDetailError(null);
    } catch (error) {
      console.error('시야뷰 후보 상세 재조회 오류:', error);
      if (errorRequest === seatViewDetailErrorRequestRef.current) setSeatViewDetailError('시야뷰 후보 상세를 갱신하지 못했습니다.');
      onErrorChange('시야뷰 후보 상세를 갱신하지 못했습니다.');
    } finally {
      setSeatViewDetailLoading(false);
    }
  }, [onErrorChange, selectedSeatViewId]);

  const handleSeatViewAction = async (
    seatViewId: number,
    payload: {
      adminLabel: 'SEAT_VIEW' | 'TICKET' | 'OTHER' | 'INAPPROPRIATE';
      moderationStatus: 'APPROVED' | 'REJECTED';
      adminMemo?: string;
    },
  ) => {
    try {
      await handleAdminSeatView(seatViewId, payload);
      onSuccessMessageChange('시야뷰 후보가 처리되었습니다.');
      await loadSeatViews();
      if (selectedSeatViewId === seatViewId) {
        await refreshSelectedSeatViewDetail();
      }
      window.setTimeout(() => onSuccessMessageChange(null), 3000);
    } catch (error) {
      console.error('시야뷰 후보 처리 오류:', error);
      onErrorChange('시야뷰 후보 처리에 실패했습니다.');
    }
  };

  useEffect(() => {
    if (selectedReportDetail) {
      setAdminMemo(selectedReportDetail.adminMemo || '');
    }
  }, [selectedReportDetail]);

  useEffect(() => {
    if (selectedSeatViewDetail) {
      setAdminMemo(selectedSeatViewDetail.adminMemo || '');
    }
  }, [selectedSeatViewDetail]);

  useEffect(() => {
    if (activeTab === 'reports') {
      void loadReports();
    }
  }, [activeTab, loadReports]);

  useEffect(() => {
    if (activeTab === 'seatViews') {
      void loadSeatViews();
    }
  }, [activeTab, loadSeatViews]);

  useEffect(() => {
    if (activeTab === 'gameStatus') {
      setHasMountedGameStatusRuntime(true);
    }
  }, [activeTab]);

  return (
    <>
      {activeTab === 'reports' && (
        <div className="p-6">
          <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">신고 관리 로딩 중...</div>}>
            <AdminReportsPanel
              reportFilters={reportFilters}
              reportsLoading={reportsLoading}
              reportsError={reportsError}
              reports={reports}
              updateReportFilters={updateReportFilters}
              resetReportFilters={resetReportFilters}
              openReportDetail={openReportDetail}
              handleReportAction={handleReportAction}
            />
          </Suspense>
        </div>
      )}

      {hasMountedGameStatusRuntime && (
        <div className={activeTab === 'gameStatus' ? 'px-3 py-4 sm:p-6' : 'hidden'}>
          <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">경기 복구 패널 로딩 중...</div>}>
            <AdminGameStatusRepairPanel active={activeTab === 'gameStatus'} />
          </Suspense>
        </div>
      )}

      {activeTab === 'clientErrors' && (
        <div className="px-3 py-4 sm:p-6">
          <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">클라이언트 에러 관제 로딩 중...</div>}>
            <ClientErrorAdminPanel active />
          </Suspense>
        </div>
      )}

      {activeTab === 'seatViews' && (
        <div className="p-6">
          <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">시야뷰 관리 로딩 중...</div>}>
            <AdminSeatViewsPanel
              seatViewFilters={seatViewFilters}
              seatViewsLoading={seatViewsLoading}
              seatViewsError={seatViewsError}
              seatViews={seatViews}
              seatViewsPage={seatViewsPage}
              onSeatViewsPageChange={setSeatViewsPageNumber}
              updateSeatViewFilters={updateSeatViewFilters}
              resetSeatViewFilters={resetSeatViewFilters}
              openSeatViewDetail={openSeatViewDetail}
              handleSeatViewAction={handleSeatViewAction}
            />
          </Suspense>
        </div>
      )}

      {activeTab === 'offseason' && (
        <div className="px-0 py-4 sm:p-6">
          <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">스토브리그 관리 로딩 중...</div>}>
            <OffseasonMovementAdminPanel active />
          </Suspense>
        </div>
      )}

      {selectedReportId && (
        <Suspense fallback={null}>
          <AdminReportDetailDrawer
            selectedReportId={selectedReportId}
            selectedReportDetail={selectedReportDetail}
            reportDetailLoading={reportDetailLoading}
            reportDetailError={reportDetailError}
            adminMemo={adminMemo}
            setAdminMemo={setAdminMemo}
            closeReportDetail={closeReportDetail}
            handleReportAction={handleReportAction}
            handleAppealDecision={handleAppealDecision}
            appealDecisionLoading={appealDecisionLoading}
          />
        </Suspense>
      )}

      {selectedSeatViewId && (
        <Suspense fallback={null}>
          <AdminSeatViewDetailDrawer
            selectedSeatViewId={selectedSeatViewId}
            selectedSeatViewDetail={selectedSeatViewDetail}
            seatViewDetailLoading={seatViewDetailLoading}
            seatViewDetailError={seatViewDetailError}
            adminMemo={adminMemo}
            setAdminMemo={setAdminMemo}
            closeSeatViewDetail={closeSeatViewDetail}
            handleSeatViewAction={handleSeatViewAction}
          />
        </Suspense>
      )}
    </>
  );
}
