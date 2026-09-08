import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import type { PlaceFormData } from '../../api/admin';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import PlainDialog from '../ui/plain-dialog';
import { AdminMapPinIcon } from './AdminPanelIcons';

interface AdminPlaceDialogContentProps {
  open: boolean;
  mode: 'create' | 'edit';
  stadiumName: string;
  categories: readonly string[];
  stadiumError: string | null;
  placeForm: PlaceFormData;
  setPlaceForm: Dispatch<SetStateAction<PlaceFormData>>;
  placeSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  visualQaStateOverride?: AdminPlaceDialogVisualQaStateOverride;
}

export type AdminPlaceDialogVisualQaStateOverride = {
  interactive: boolean;
};

const selectClassName = 'h-11 min-w-0 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-base text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 sm:h-9 sm:text-body';

export default function AdminPlaceDialogContent({
  open,
  mode,
  stadiumName,
  categories,
  stadiumError,
  placeForm,
  setPlaceForm,
  placeSubmitting,
  onOpenChange,
  onSubmit,
  visualQaStateOverride: requestedVisualQaStateOverride,
}: AdminPlaceDialogContentProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const visualQaInteractive = visualQaStateOverride?.interactive === true;
  const [visualQaPlaceForm, setVisualQaPlaceForm] = useState(placeForm);
  const effectivePlaceForm = visualQaInteractive ? visualQaPlaceForm : placeForm;
  const updatePlaceForm = visualQaInteractive ? setVisualQaPlaceForm : setPlaceForm;
  const isCreate = mode === 'create';
  const dialogDescription = isCreate
    ? `${stadiumName} 구장에 새 장소를 추가합니다.`
    : '장소 정보를 수정합니다.';

  useEffect(() => {
    if (visualQaInteractive) {
      setVisualQaPlaceForm(placeForm);
    }
  }, [placeForm, visualQaInteractive]);

  return (
    <PlainDialog
      open={open}
      onClose={() => onOpenChange(false)}
      initialFocus="container"
      title={(
        <span className="flex min-w-0 items-center gap-2 text-white [overflow-wrap:anywhere]">
          <AdminMapPinIcon className="h-5 w-5 shrink-0 text-amber-300" />
          {isCreate ? '장소 추가' : '장소 수정'}
        </span>
      )}
      description={(
        <span className="line-clamp-3 [overflow-wrap:anywhere]" title={dialogDescription}>
          {dialogDescription}
        </span>
      )}
      contentTestId="admin-place-dialog"
      className="max-w-lg border-slate-800 bg-slate-900 text-slate-100 focus:outline-none"
      footer={(
        <>
          <Button
            type="button"
            data-testid="admin-place-cancel"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full min-h-11 border-slate-700 text-slate-300 hover:bg-slate-800 sm:min-h-9 sm:w-auto"
          >
            취소
          </Button>
          <Button
            type="button"
            data-testid="admin-place-submit"
            onClick={onSubmit}
            disabled={placeSubmitting || !effectivePlaceForm.name || !effectivePlaceForm.category}
            className="w-full min-h-11 bg-amber-500 text-slate-950 shadow-sm hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 sm:min-h-9 sm:w-auto"
          >
            {placeSubmitting ? '저장 중...' : (isCreate ? '추가' : '저장')}
          </Button>
        </>
      )}
    >
      <div className="min-w-0 [overflow-wrap:anywhere]">
        {stadiumError && (
          <p
            role="alert"
            aria-live="polite"
            className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-caption text-red-300 [overflow-wrap:anywhere]"
          >
            {stadiumError}
          </p>
        )}

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <label htmlFor="admin-place-name" className="text-caption text-slate-400">이름 *</label>
            <Input
              id="admin-place-name"
              value={effectivePlaceForm.name}
              onChange={(e) => updatePlaceForm((form) => ({ ...form, name: e.target.value }))}
              placeholder="장소 이름"
              className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="admin-place-category" className="text-caption text-slate-400">카테고리 *</label>
            <select
              id="admin-place-category"
              data-testid="admin-place-category-trigger"
              value={effectivePlaceForm.category}
              onChange={(e) => updatePlaceForm((form) => ({ ...form, category: e.target.value }))}
              className={selectClassName}
            >
              <option value="">카테고리 선택</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="admin-place-description" className="text-caption text-slate-400">설명</label>
            <Input
              id="admin-place-description"
              value={effectivePlaceForm.description ?? ''}
              onChange={(e) => updatePlaceForm((form) => ({ ...form, description: e.target.value }))}
              placeholder="장소 설명"
              className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="admin-place-address" className="text-caption text-slate-400">주소</label>
            <Input
              id="admin-place-address"
              value={effectivePlaceForm.address ?? ''}
              onChange={(e) => updatePlaceForm((form) => ({ ...form, address: e.target.value }))}
              placeholder="도로명 주소"
              className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="admin-place-phone" className="text-caption text-slate-400">전화번호</label>
            <Input
              id="admin-place-phone"
              type="tel"
              value={effectivePlaceForm.phone ?? ''}
              onChange={(e) => updatePlaceForm((form) => ({ ...form, phone: e.target.value }))}
              placeholder="대표 전화번호"
              className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="admin-place-lat" className="text-caption text-slate-400">위도 *</label>
              <Input
                id="admin-place-lat"
                type="number"
                step="any"
                value={effectivePlaceForm.lat}
                onChange={(e) => updatePlaceForm((form) => ({ ...form, lat: parseFloat(e.target.value) || 0 }))}
                placeholder="37.5121"
                className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="admin-place-lng" className="text-caption text-slate-400">경도 *</label>
              <Input
                id="admin-place-lng"
                type="number"
                step="any"
                value={effectivePlaceForm.lng}
                onChange={(e) => updatePlaceForm((form) => ({ ...form, lng: parseFloat(e.target.value) || 0 }))}
                placeholder="127.0719"
                className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="admin-place-rating" className="text-caption text-slate-400">평점 (0.0 ~ 5.0)</label>
            <Input
              id="admin-place-rating"
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={effectivePlaceForm.rating ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                updatePlaceForm((form) => ({ ...form, rating: value === '' ? undefined : parseFloat(value) }));
              }}
              placeholder="4.3"
              className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="admin-place-open-time" className="text-caption text-slate-400">오픈 시간</label>
              <Input
                id="admin-place-open-time"
                value={effectivePlaceForm.openTime ?? ''}
                onChange={(e) => updatePlaceForm((form) => ({ ...form, openTime: e.target.value }))}
                placeholder="09:00"
                className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="admin-place-close-time" className="text-caption text-slate-400">마감 시간</label>
              <Input
                id="admin-place-close-time"
                value={effectivePlaceForm.closeTime ?? ''}
                onChange={(e) => updatePlaceForm((form) => ({ ...form, closeTime: e.target.value }))}
                placeholder="22:00"
                className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </PlainDialog>
  );
}
