import { createElement, lazy, Suspense, useState, type ReactNode } from 'react';

import { FRANCHISE_TEAM_IDS, TEAM_DATA } from '../../constants/teams';
import { cn } from '../../lib/utils';
import type { AdminOffseasonMovement, AdminOffseasonMovementPayload } from '../../types/admin';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  AdminDownloadIcon,
  AdminPlusIcon,
  AdminRefreshIcon,
  AdminUploadIcon,
} from './AdminDetailIcons';
import {
  AdminNewspaperIcon,
  AdminSearchIcon,
} from './AdminPanelIcons';

const ALL_VALUE = 'ALL';

const SECTION_OPTIONS = ['FA', '트레이드', '외국인', '방출/웨이버', '군 관련', '기타'];

const TEAM_OPTIONS = FRANCHISE_TEAM_IDS.map((code) => ({
  code,
  name: TEAM_DATA[code]?.name || code,
  fullName: TEAM_DATA[code]?.fullName || code,
}));

const adminNativeSelectClassName =
  'min-h-11 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 text-base text-slate-200 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60';

const adminMobileControlClassName = 'min-h-11 text-base';
const adminMobileIconControlClassName = 'min-h-11 min-w-11 text-base';

const adminFieldLabelClassName =
  'text-caption font-semibold text-slate-400';

export const createOffseasonMovementVisualQaControlledCallback = <Args extends unknown[]>(
  updateLocalState: (...args: Args) => void,
  forwardPublicCallback: (...args: Args) => void,
  recordEvidence: (...args: Args) => void,
) => (...args: Args) => {
  updateLocalState(...args);
  forwardPublicCallback(...args);
  recordEvidence(...args);
};

const offseasonMovementAdminFallback = ({ kind }: { kind: 'dialogs' | 'results' }) => (
  kind === 'results' ? (
    <div
      aria-busy="true"
      aria-live="polite"
      data-testid="admin-offseason-results-fallback"
      role="status"
      className="flex items-center justify-center gap-3 py-16 text-slate-400"
    >
      <div className="h-8 w-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin motion-reduce:animate-none" />
      <span>스토브리그 결과를 불러오는 중...</span>
    </div>
  ) : (
    <div
      aria-busy="true"
      aria-live="polite"
      data-testid="admin-offseason-dialogs-fallback"
      role="status"
      className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-16 text-center text-slate-400"
    >
      스토브리그 입력 창을 불러오는 중...
    </div>
  )
);

const renderOffseasonMovementAdminFallback = (kind: 'dialogs' | 'results') => (
  createElement(offseasonMovementAdminFallback, { kind })
);

export type CsvImportReport = {
  fileName: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  errors: string[];
};

export type QualityOption = {
  value: string;
  label: string;
  hint: string;
};

const OffseasonMovementAdminDialogs = lazy(() => import('./OffseasonMovementAdminDialogs'));
const OffseasonMovementAdminResultsRuntime = lazy(() => import('./OffseasonMovementAdminResultsRuntime'));

export interface OffseasonMovementAdminPanelContentVisualQaState {
  resultsPhase: 'fallback' | 'resolved';
  dialogsPhase: 'fallback' | 'resolved';
}

export interface OffseasonMovementAdminPanelContentVisualQaRenderers {
  results: (props: import('./OffseasonMovementAdminResultsRuntime').OffseasonMovementAdminResultsRuntimeProps) => ReactNode;
  dialogs: (props: import('./OffseasonMovementAdminDialogs').OffseasonMovementAdminDialogsProps) => ReactNode;
}

export interface OffseasonMovementAdminPanelContentProps {
  successMessage: string | null;
  error: string | null;
  movements: AdminOffseasonMovement[];
  filteredMovements: AdminOffseasonMovement[];
  loading: boolean;
  importingCsv: boolean;
  submitting: boolean;
  csvReport: CsvImportReport | null;
  search: string;
  sectionFilter: string;
  teamFilter: string;
  fromDate: string;
  toDate: string;
  qualityFilter: string;
  qualityOptions: QualityOption[];
  activeQualityOption: QualityOption;
  qualityCounts: Record<string, number>;
  summaryCount: number;
  detailsCount: number;
  structuredCount: number;
  sourcedCount: number;
  dialogOpen: boolean;
  editingMovement: AdminOffseasonMovement | null;
  deleteTarget: AdminOffseasonMovement | null;
  formData: AdminOffseasonMovementPayload;
  onSearchChange: (value: string) => void;
  onSectionFilterChange: (value: string) => void;
  onTeamFilterChange: (value: string) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onQualityFilterChange: (value: string) => void;
  onRefresh: () => void;
  onDownloadCsvTemplate: () => void;
  onOpenCsvImport: () => void;
  onOpenCreateDialog: () => void;
  onOpenEditDialog: (movement: AdminOffseasonMovement) => void;
  onDeleteTargetChange: (movement: AdminOffseasonMovement | null) => void;
  onDialogClose: () => void;
  onUpdateField: (field: keyof AdminOffseasonMovementPayload, value: string) => void;
  onSubmit: () => void;
  onDelete: () => void;
  visualQaStateOverride?: OffseasonMovementAdminPanelContentVisualQaState;
  visualQaRenderers?: OffseasonMovementAdminPanelContentVisualQaRenderers;
  visualQaControlledState?: true;
}

export default function OffseasonMovementAdminPanelContent({
  successMessage,
  error,
  movements,
  filteredMovements,
  loading,
  importingCsv,
  submitting,
  csvReport,
  search: requestedSearch,
  sectionFilter: requestedSectionFilter,
  teamFilter: requestedTeamFilter,
  fromDate: requestedFromDate,
  toDate: requestedToDate,
  qualityFilter,
  qualityOptions,
  activeQualityOption,
  qualityCounts,
  summaryCount,
  detailsCount,
  structuredCount,
  sourcedCount,
  dialogOpen: requestedDialogOpen,
  editingMovement: requestedEditingMovement,
  deleteTarget: requestedDeleteTarget,
  formData: requestedFormData,
  onSearchChange,
  onSectionFilterChange,
  onTeamFilterChange,
  onFromDateChange,
  onToDateChange,
  onApplyFilters,
  onResetFilters,
  onQualityFilterChange,
  onRefresh,
  onDownloadCsvTemplate,
  onOpenCsvImport,
  onOpenCreateDialog,
  onOpenEditDialog,
  onDeleteTargetChange,
  onDialogClose,
  onUpdateField,
  onSubmit,
  onDelete,
  visualQaStateOverride,
  visualQaRenderers,
  visualQaControlledState,
}: OffseasonMovementAdminPanelContentProps) {
  const useVisualQaControlledState = visualQaControlledState === true
    && import.meta.env?.PROD !== true;
  const [visualQaSearch, setVisualQaSearch] = useState(requestedSearch);
  const [visualQaSectionFilter, setVisualQaSectionFilter] = useState(requestedSectionFilter);
  const [visualQaTeamFilter, setVisualQaTeamFilter] = useState(requestedTeamFilter);
  const [visualQaFromDate, setVisualQaFromDate] = useState(requestedFromDate);
  const [visualQaToDate, setVisualQaToDate] = useState(requestedToDate);
  const [visualQaDialogOpen, setVisualQaDialogOpen] = useState(requestedDialogOpen);
  const [visualQaEditingMovement, setVisualQaEditingMovement] = useState(requestedEditingMovement);
  const [visualQaDeleteTarget, setVisualQaDeleteTarget] = useState(requestedDeleteTarget);
  const [visualQaFormData, setVisualQaFormData] = useState(requestedFormData);
  const [visualQaCallbackEvidence, setVisualQaCallbackEvidence] = useState({
    searchChangeCount: 0,
    searchChangeValue: '',
    teamFilterChangeCount: 0,
    teamFilterChangeValue: '',
    updateFieldCount: 0,
    updateField: '',
    updateFieldValue: '',
  });
  const search = useVisualQaControlledState ? visualQaSearch : requestedSearch;
  const sectionFilter = useVisualQaControlledState ? visualQaSectionFilter : requestedSectionFilter;
  const teamFilter = useVisualQaControlledState ? visualQaTeamFilter : requestedTeamFilter;
  const fromDate = useVisualQaControlledState ? visualQaFromDate : requestedFromDate;
  const toDate = useVisualQaControlledState ? visualQaToDate : requestedToDate;
  const dialogOpen = useVisualQaControlledState ? visualQaDialogOpen : requestedDialogOpen;
  const editingMovement = useVisualQaControlledState
    ? visualQaEditingMovement
    : requestedEditingMovement;
  const deleteTarget = useVisualQaControlledState ? visualQaDeleteTarget : requestedDeleteTarget;
  const formData = useVisualQaControlledState ? visualQaFormData : requestedFormData;
  const noVisualQaEvidence = () => undefined;
  const handleSearchChange = useVisualQaControlledState
    ? createOffseasonMovementVisualQaControlledCallback(
      setVisualQaSearch,
      onSearchChange,
      (value: string) => setVisualQaCallbackEvidence((current) => ({
        ...current,
        searchChangeCount: current.searchChangeCount + 1,
        searchChangeValue: value,
      })),
    )
    : onSearchChange;
  const handleSectionFilterChange = useVisualQaControlledState
    ? createOffseasonMovementVisualQaControlledCallback(
      setVisualQaSectionFilter,
      onSectionFilterChange,
      noVisualQaEvidence,
    )
    : onSectionFilterChange;
  const handleTeamFilterChange = useVisualQaControlledState
    ? createOffseasonMovementVisualQaControlledCallback(
      setVisualQaTeamFilter,
      onTeamFilterChange,
      (value: string) => setVisualQaCallbackEvidence((current) => ({
        ...current,
        teamFilterChangeCount: current.teamFilterChangeCount + 1,
        teamFilterChangeValue: value,
      })),
    )
    : onTeamFilterChange;
  const handleFromDateChange = useVisualQaControlledState
    ? createOffseasonMovementVisualQaControlledCallback(
      setVisualQaFromDate,
      onFromDateChange,
      noVisualQaEvidence,
    )
    : onFromDateChange;
  const handleToDateChange = useVisualQaControlledState
    ? createOffseasonMovementVisualQaControlledCallback(
      setVisualQaToDate,
      onToDateChange,
      noVisualQaEvidence,
    )
    : onToDateChange;
  const handleOpenCreateDialog = useVisualQaControlledState
    ? createOffseasonMovementVisualQaControlledCallback(
      () => {
        setVisualQaEditingMovement(null);
        setVisualQaDialogOpen(true);
      },
      onOpenCreateDialog,
      noVisualQaEvidence,
    )
    : onOpenCreateDialog;
  const handleOpenEditDialog = useVisualQaControlledState
    ? createOffseasonMovementVisualQaControlledCallback(
      (movement: AdminOffseasonMovement) => {
        setVisualQaEditingMovement(movement);
        setVisualQaFormData({
          movementDate: movement.movementDate,
          section: movement.section,
          teamCode: movement.teamCode,
          playerName: movement.playerName,
          summary: movement.summary ?? '',
          details: movement.details ?? '',
          contractTerm: movement.contractTerm ?? '',
          contractValue: movement.contractValue ?? '',
          optionDetails: movement.optionDetails ?? '',
          counterpartyTeam: movement.counterpartyTeam ?? '',
          counterpartyDetails: movement.counterpartyDetails ?? '',
          sourceLabel: movement.sourceLabel ?? '',
          sourceUrl: movement.sourceUrl ?? '',
          announcedAt: movement.announcedAt ?? '',
        });
        setVisualQaDialogOpen(true);
      },
      onOpenEditDialog,
      noVisualQaEvidence,
    )
    : onOpenEditDialog;
  const handleDeleteTargetChange = useVisualQaControlledState
    ? createOffseasonMovementVisualQaControlledCallback(
      setVisualQaDeleteTarget,
      onDeleteTargetChange,
      noVisualQaEvidence,
    )
    : onDeleteTargetChange;
  const handleDialogClose = useVisualQaControlledState
    ? createOffseasonMovementVisualQaControlledCallback(
      () => setVisualQaDialogOpen(false),
      onDialogClose,
      noVisualQaEvidence,
    )
    : onDialogClose;
  const handleUpdateField = useVisualQaControlledState
    ? createOffseasonMovementVisualQaControlledCallback(
      (field: keyof AdminOffseasonMovementPayload, value: string) => {
        setVisualQaFormData((current) => ({ ...current, [field]: value }));
      },
      onUpdateField,
      (field: keyof AdminOffseasonMovementPayload, value: string) => {
        setVisualQaCallbackEvidence((current) => ({
          ...current,
          updateFieldCount: current.updateFieldCount + 1,
          updateField: field,
          updateFieldValue: value,
        }));
      },
    )
    : onUpdateField;
  const shouldRenderDialogs = dialogOpen || Boolean(deleteTarget);
  const resultsProps = {
    csvReport,
    movements,
    filteredMovements,
    loading,
    activeQualityOption,
    onOpenEditDialog: handleOpenEditDialog,
    onDeleteTargetChange: handleDeleteTargetChange,
  };
  const dialogProps = {
    dialogOpen,
    editingMovement,
    deleteTarget,
    submitting,
    formData,
    onDialogClose: handleDialogClose,
    onDeleteTargetChange: handleDeleteTargetChange,
    onUpdateField: handleUpdateField,
    onSubmit,
    onDelete,
  };
  const resultsContent = visualQaStateOverride
    ? visualQaStateOverride.resultsPhase === 'fallback'
      ? (
        renderOffseasonMovementAdminFallback('results')
      )
      : visualQaRenderers?.results(resultsProps)
    : (
      <Suspense
        fallback={renderOffseasonMovementAdminFallback('results')}
      >
        <OffseasonMovementAdminResultsRuntime {...resultsProps} />
      </Suspense>
    );
  const dialogsContent = !shouldRenderDialogs
    ? null
    : visualQaStateOverride
      ? visualQaStateOverride.dialogsPhase === 'fallback'
        ? (
          renderOffseasonMovementAdminFallback('dialogs')
        )
        : visualQaRenderers?.dialogs(dialogProps)
      : (
        <Suspense fallback={renderOffseasonMovementAdminFallback('dialogs')}>
          <OffseasonMovementAdminDialogs {...dialogProps} />
        </Suspense>
      );

  if (visualQaStateOverride?.resultsPhase === 'resolved' && !visualQaRenderers?.results) {
    throw new Error('OffseasonMovementAdminPanelContent Visual QA resolved results renderer is required.');
  }
  if (
    visualQaStateOverride?.dialogsPhase === 'resolved'
    && shouldRenderDialogs
    && !visualQaRenderers?.dialogs
  ) {
    throw new Error('OffseasonMovementAdminPanelContent Visual QA resolved dialogs renderer is required.');
  }

  return (
    <div
      data-testid="admin-offseason-content"
      data-vqa-search-change-count={useVisualQaControlledState
        ? visualQaCallbackEvidence.searchChangeCount
        : undefined}
      data-vqa-search-change-value={useVisualQaControlledState
        ? visualQaCallbackEvidence.searchChangeValue
        : undefined}
      data-vqa-team-filter-change-count={useVisualQaControlledState
        ? visualQaCallbackEvidence.teamFilterChangeCount
        : undefined}
      data-vqa-team-filter-change-value={useVisualQaControlledState
        ? visualQaCallbackEvidence.teamFilterChangeValue
        : undefined}
      data-vqa-update-field-count={useVisualQaControlledState
        ? visualQaCallbackEvidence.updateFieldCount
        : undefined}
      data-vqa-update-field={useVisualQaControlledState
        ? visualQaCallbackEvidence.updateField
        : undefined}
      data-vqa-update-field-value={useVisualQaControlledState
        ? visualQaCallbackEvidence.updateFieldValue
        : undefined}
      className="min-w-0 max-w-full space-y-6"
    >
      {successMessage && (
        <div role="status" aria-live="polite" title={successMessage} className="line-clamp-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-caption text-emerald-300 [overflow-wrap:anywhere]">
          {successMessage}
        </div>
      )}

      {error && (
        <div role="alert" title={error} className="line-clamp-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-caption text-red-300 [overflow-wrap:anywhere]">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/90 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <AdminNewspaperIcon className="h-5 w-5 text-emerald-300" />
                스토브리그 이동 관리
              </h3>
              <p className="mt-1 text-caption leading-relaxed text-slate-400">
                공개 `/offseason/list`에 노출되는 이동 데이터와 구조화 상세 필드를 여기서 직접 관리합니다.
              </p>
            </div>
            <Button
              type="button"
              onClick={onRefresh}
              data-testid="admin-offseason-refresh"
              disabled={loading}
              className={cn(adminMobileControlClassName, 'bg-emerald-500 text-slate-950 hover:bg-emerald-400')}
            >
              <AdminRefreshIcon className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className={adminFieldLabelClassName}>노출 행</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-white">{filteredMovements.length}</p>
              <p className="mt-1 text-caption text-slate-500">원본 조회 결과 {movements.length}건</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className={adminFieldLabelClassName}>요약 입력</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-emerald-300">{summaryCount}</p>
              <p className="mt-1 text-caption text-slate-500">미입력 {qualityCounts.MISSING_SUMMARY}건</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className={adminFieldLabelClassName}>출처 연결</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-sky-300">{sourcedCount}</p>
              <p className="mt-1 text-caption text-slate-500">미입력 {qualityCounts.MISSING_SOURCE}건</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <p className={adminFieldLabelClassName}>구조화 입력률</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-caption font-semibold text-slate-200">구조화 상세 입력</p>
              <p className="mt-2 text-2xl font-black text-amber-300">{structuredCount}</p>
              <p className="mt-1 text-caption text-slate-500">계약 기간, 금액, 옵션, 상대 구단, 반대급부 중 1개 이상</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-caption font-semibold text-slate-200">운영 메모</p>
              <p className="mt-2 text-caption leading-relaxed text-slate-400">
                `summary`는 표와 카드에 노출되고, `details`는 상세 패널 원문 메모로 사용됩니다.
              </p>
              <p className="mt-2 text-caption text-slate-500">상세 메모 입력 {detailsCount}건 · 미입력 {qualityCounts.MISSING_DETAILS}건</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_180px_180px_180px_180px_auto]">
          <div className="relative">
            <AdminSearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              aria-label="스토브리그 이동 검색"
              data-testid="admin-offseason-search"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="선수명, 요약, 계약 조건, 출처 검색"
              className={cn(adminMobileControlClassName, 'pl-10 bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-xl')}
            />
          </div>
          <select
            aria-label="스토브리그 이동 구분 필터"
            data-testid="admin-offseason-section-trigger"
            value={sectionFilter}
            onChange={(event) => handleSectionFilterChange(event.target.value)}
            className={adminNativeSelectClassName}
          >
            <option value={ALL_VALUE}>구분 전체</option>
            {SECTION_OPTIONS.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
          <select
            aria-label="스토브리그 이동 팀 필터"
            data-testid="admin-offseason-team-trigger"
            value={teamFilter}
            onChange={(event) => handleTeamFilterChange(event.target.value)}
            className={adminNativeSelectClassName}
          >
            <option value={ALL_VALUE}>팀 전체</option>
            {TEAM_OPTIONS.map((team) => (
              <option key={team.code} value={team.code}>
                {team.fullName}
              </option>
            ))}
          </select>
          <Input
            aria-label="조회 시작 날짜"
            type="date"
            data-testid="admin-offseason-from-date"
            value={fromDate}
            onChange={(event) => handleFromDateChange(event.target.value)}
            className={cn(adminMobileControlClassName, 'bg-slate-800/50 border-slate-700 text-slate-200 rounded-xl')}
          />
          <Input
            aria-label="조회 종료 날짜"
            type="date"
            data-testid="admin-offseason-to-date"
            value={toDate}
            onChange={(event) => handleToDateChange(event.target.value)}
            className={cn(adminMobileControlClassName, 'bg-slate-800/50 border-slate-700 text-slate-200 rounded-xl')}
          />
          <div className="flex gap-2">
            <Button type="button" data-testid="admin-offseason-apply-filters" onClick={onApplyFilters} className={cn(adminMobileControlClassName, 'bg-sky-500 text-slate-950 hover:bg-sky-400')}>
              조회
            </Button>
            <Button type="button" data-testid="admin-offseason-reset-filters" variant="outline" onClick={onResetFilters} className={cn(adminMobileControlClassName, 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800')}>
              초기화
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
          <p className="text-caption text-slate-400">
            조회 결과 <span className="font-semibold text-white">{movements.length}</span>건 중
            품질 보기 <span className="font-semibold text-emerald-300">{activeQualityOption.label}</span> 적용 후
            <span className="ml-1 font-semibold text-white">{filteredMovements.length}</span>건 표시
          </p>
            <p className="mt-1 text-caption text-slate-500">{activeQualityOption.hint}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              data-testid="admin-offseason-download-template"
              onClick={onDownloadCsvTemplate}
              className={cn(adminMobileControlClassName, 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800')}
            >
              <AdminDownloadIcon className="mr-2 h-4 w-4" />
              템플릿 CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid="admin-offseason-import-csv"
              onClick={onOpenCsvImport}
              disabled={importingCsv}
              className={cn(adminMobileControlClassName, 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800')}
            >
              <AdminUploadIcon className="mr-2 h-4 w-4" />
              {importingCsv ? '업로드 중' : 'CSV 업로드'}
            </Button>
            <Button
              type="button"
              data-testid="admin-offseason-open-create"
              onClick={handleOpenCreateDialog}
              className={cn(adminMobileControlClassName, 'bg-emerald-500 text-slate-950 shadow-sm hover:bg-emerald-400')}
            >
              <AdminPlusIcon className="mr-2 h-4 w-4" />
              이동 추가
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {qualityOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant="outline"
                data-testid={`admin-offseason-quality-${option.value}`}
                onClick={() => onQualityFilterChange(option.value)}
                className={cn(
                  adminMobileIconControlClassName,
                  'rounded-full border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800',
                  qualityFilter === option.value && 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15',
                )}
              >
                {option.label}
                <span className="rounded-full bg-slate-950/80 px-2 py-0.5 text-12 font-semibold text-slate-400">
                  {qualityCounts[option.value]}
                </span>
              </Button>
            ))}
          </div>
          <p className="mt-3 text-caption text-slate-500">
            날짜, 구분, 팀 조회로 먼저 범위를 좁힌 뒤 품질 보기로 `요약`, `상세 메모`, `출처`, `구조화 상세` 누락 건만 따로 볼 수 있습니다.
            CSV는 `id`를 채우면 수정, 비워두면 신규 등록으로 처리합니다.
          </p>
        </div>
      </div>

      {resultsContent}
      {dialogsContent}
    </div>
  );
}
