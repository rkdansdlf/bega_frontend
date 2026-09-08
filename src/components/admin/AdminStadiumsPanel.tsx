import { useEffect, useState } from 'react';

import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import type { Place } from '../../api/admin';
import { getStadiumDisplayName } from '../../utils/stadiumDisplay';
import { AdminEditIcon, AdminPlusIcon } from './AdminDetailIcons';
import {
  AdminBadge,
  adminNativeSelectClassName,
} from './AdminPanelPrimitives';
import {
  AdminMapPinIcon,
  AdminTrashIcon,
} from './AdminPanelIcons';

interface StadiumDto {
  stadiumId: string;
  stadiumName: string;
  team: string;
  lat: number;
  lng: number;
  address: string;
  phone: string;
}

interface AdminStadiumsPanelProps {
  stadiumError: string | null;
  selectedStadiumId: string;
  stadiumsLoading: boolean;
  stadiums: StadiumDto[];
  placesLoading: boolean;
  places: Place[];
  setSelectedStadiumId: (stadiumId: string) => void;
  openCreateDialog: () => void;
  openEditDialog: (place: Place) => void;
  setDeletingPlaceId: (placeId: number | null) => void;
  visualQaStateOverride?: AdminStadiumsPanelVisualQaStateOverride;
}

export type AdminStadiumsPanelVisualQaStateOverride = {
  interactive: boolean;
};

const stadiumSelectClassName = `${adminNativeSelectClassName} min-h-11 sm:min-h-9`;
const stadiumRowActionClassName = 'min-h-11 min-w-11 sm:min-h-8 sm:min-w-8';

export function AdminStadiumsPanel({
  stadiumError,
  selectedStadiumId,
  stadiumsLoading,
  stadiums,
  placesLoading,
  places,
  setSelectedStadiumId,
  openCreateDialog,
  openEditDialog,
  setDeletingPlaceId,
  visualQaStateOverride: requestedVisualQaStateOverride,
}: AdminStadiumsPanelProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const visualQaInteractive = visualQaStateOverride?.interactive === true;
  const [visualQaSelectedStadiumId, setVisualQaSelectedStadiumId] = useState(selectedStadiumId);

  useEffect(() => {
    if (visualQaInteractive) {
      setVisualQaSelectedStadiumId(selectedStadiumId);
    }
  }, [selectedStadiumId, visualQaInteractive]);

  const effectiveSelectedStadiumId = visualQaInteractive
    ? visualQaSelectedStadiumId
    : selectedStadiumId;
  const selectStadium = visualQaInteractive
    ? setVisualQaSelectedStadiumId
    : setSelectedStadiumId;

  return (
    <div data-testid="admin-stadiums-panel" className="min-w-0 px-1">
      {stadiumError && (
        <div
          className="mb-4 line-clamp-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-caption text-red-300 [overflow-wrap:anywhere]"
          role="alert"
          title={stadiumError}
        >
          {stadiumError}
        </div>
      )}

      <div className="mb-6 flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-end">
        <label htmlFor="admin-stadium-select-trigger" className="min-w-0 flex-1">
          <span className="mb-1 block text-caption font-medium text-slate-400">구장 선택</span>
          <select
            id="admin-stadium-select-trigger"
            data-testid="admin-stadium-select-trigger"
            value={effectiveSelectedStadiumId}
            onChange={(e) => selectStadium(e.target.value)}
            disabled={stadiumsLoading}
            className={stadiumSelectClassName}
          >
            {!effectiveSelectedStadiumId && (
              <option value="">
                {stadiumsLoading ? '로딩 중...' : '구장을 선택하세요'}
              </option>
            )}
            {stadiums.map((stadium) => (
              <option key={stadium.stadiumId} value={stadium.stadiumId}>
                {getStadiumDisplayName(stadium)}
                {stadium.team ? ` (${stadium.team})` : ''}
              </option>
            ))}
          </select>
        </label>
        <Button
          onClick={openCreateDialog}
          data-testid="admin-stadium-add-place"
          disabled={!effectiveSelectedStadiumId}
          className="min-h-11 w-full rounded-xl bg-amber-500 text-slate-950 shadow-sm hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 sm:min-h-9 sm:w-auto"
        >
          <AdminPlusIcon className="mr-2 h-4 w-4" />
          장소 추가
        </Button>
      </div>

      <div
        data-testid="admin-stadiums-table-region"
        className="max-h-[320px] min-w-0 overflow-y-auto rounded-xl border border-slate-800"
        aria-busy={stadiumsLoading || placesLoading}
      >
        {stadiumsLoading ? (
          <div
            className="flex min-h-40 items-center justify-center gap-3 px-4 text-center text-slate-500"
            role="status"
            aria-live="polite"
          >
            <span
              className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-amber-500 border-t-transparent motion-reduce:animate-none"
              aria-hidden="true"
            />
            구장 목록 로딩 중...
          </div>
        ) : placesLoading ? (
          <div
            className="flex min-h-40 items-center justify-center gap-3 px-4 text-center text-slate-500"
            role="status"
            aria-live="polite"
          >
            <span
              className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-amber-500 border-t-transparent motion-reduce:animate-none"
              aria-hidden="true"
            />
            장소 목록 로딩 중...
          </div>
        ) : places.length === 0 ? (
          <div
            className="flex min-h-40 flex-col items-center justify-center px-4 text-center text-slate-500"
            role="status"
          >
            <AdminMapPinIcon className="mb-3 h-12 w-12 opacity-30" />
            {effectiveSelectedStadiumId
              ? '등록된 장소가 없습니다.'
              : '구장을 먼저 선택하세요.'}
          </div>
        ) : (
          <Table aria-label="구장 주변 장소 목록" className="min-w-[1088px] table-fixed">
            <TableHeader>
              <TableRow className="border-slate-700 bg-slate-800/50 hover:bg-slate-800/50">
                <TableHead className="w-24 font-semibold text-slate-400">ID</TableHead>
                <TableHead className="w-32 font-semibold text-slate-400">카테고리</TableHead>
                <TableHead className="w-56 font-semibold text-slate-400">이름</TableHead>
                <TableHead className="w-56 font-semibold text-slate-400">주소</TableHead>
                <TableHead className="w-40 font-semibold text-slate-400">전화</TableHead>
                <TableHead className="w-24 font-semibold text-slate-400">평점</TableHead>
                <TableHead className="w-40 font-semibold text-slate-400">영업시간</TableHead>
                <TableHead className="w-32 text-right font-semibold text-slate-400">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {places.map((place) => {
                const openingHours = place.openTime && place.closeTime
                  ? `${place.openTime} ~ ${place.closeTime}`
                  : place.openTime || '-';

                return (
                  <TableRow
                    key={place.id}
                    data-testid={`admin-place-row-${place.id}`}
                    className="border-slate-800 transition-colors duration-150 hover:bg-slate-800/30"
                  >
                    <TableCell className="w-24 whitespace-nowrap font-mono text-caption text-slate-300">
                      {place.id}
                    </TableCell>
                    <TableCell className="w-32 whitespace-nowrap">
                      <AdminBadge className="max-w-full truncate border-slate-700 bg-slate-800 text-slate-300">
                        {place.category}
                      </AdminBadge>
                    </TableCell>
                    <TableCell
                      className="w-56 max-w-56 truncate whitespace-nowrap font-semibold text-slate-200"
                      title={place.name}
                    >
                      {place.name}
                    </TableCell>
                    <TableCell
                      className="w-56 max-w-56 truncate whitespace-nowrap text-caption text-slate-400"
                      title={place.address || undefined}
                    >
                      {place.address || '-'}
                    </TableCell>
                    <TableCell
                      className="w-40 max-w-40 truncate whitespace-nowrap text-caption text-slate-400"
                      title={place.phone || undefined}
                    >
                      {place.phone || '-'}
                    </TableCell>
                    <TableCell className="w-24 whitespace-nowrap">
                      {place.rating != null ? (
                        <span className="inline-flex items-center gap-1 text-caption font-semibold text-amber-400">
                          {place.rating.toFixed(1)}
                          <span className="text-amber-500/60">★</span>
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </TableCell>
                    <TableCell
                      className="w-40 max-w-40 truncate whitespace-nowrap text-caption text-slate-400"
                      title={openingHours === '-' ? undefined : openingHours}
                    >
                      {openingHours}
                    </TableCell>
                    <TableCell className="w-32 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`admin-place-edit-${place.id}`}
                          aria-label={`장소 ${place.id}번 수정`}
                          onClick={() => openEditDialog(place)}
                          className={`${stadiumRowActionClassName} rounded-lg text-slate-400 transition-colors duration-150 hover:bg-amber-500/10 hover:text-amber-300`}
                        >
                          <AdminEditIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`admin-place-delete-${place.id}`}
                          aria-label={`장소 ${place.id}번 삭제`}
                          onClick={() => setDeletingPlaceId(place.id)}
                          className={`${stadiumRowActionClassName} rounded-lg text-slate-500 transition-colors duration-150 hover:bg-red-500/10 hover:text-red-400`}
                        >
                          <AdminTrashIcon className="h-4 w-4" />
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
