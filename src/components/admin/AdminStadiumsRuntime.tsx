import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';

import type { AdminStadium, Place, PlaceFormData } from '../../api/admin';
import {
  createPlace,
  deletePlace,
  fetchAdminPlaces,
  fetchAdminStadiums,
  updatePlace,
} from '../../api/admin';
import { getStadiumDisplayName } from '../../utils/stadiumDisplay';
import type AdminDeletePlaceDialogContentComponent from './AdminDeletePlaceDialogContent';
import type AdminPlaceDialogContentComponent from './AdminPlaceDialogContent';
import type { AdminStadiumsPanel as AdminStadiumsPanelComponent } from './AdminStadiumsPanel';

const AdminStadiumsPanel = lazy(() =>
  import('./AdminStadiumsPanel').then((module) => ({ default: module.AdminStadiumsPanel })),
);
const AdminPlaceDialogContent = lazy(() => import('./AdminPlaceDialogContent'));
const AdminDeletePlaceDialogContent = lazy(() => import('./AdminDeletePlaceDialogContent'));

type AdminStadiumsDialogMode = 'create' | 'edit' | 'delete';

export interface AdminStadiumsRuntimeVisualQaState {
  panelPhase: 'fallback' | 'resolved';
  dialogPhase: 'closed' | 'fallback' | 'resolved';
  stadiums: AdminStadium[];
  stadiumsLoading: boolean;
  selectedStadiumId: string;
  places: Place[];
  placesLoading: boolean;
  stadiumError: string | null;
  placeDialog: null | 'create' | Place;
  placeForm: PlaceFormData;
  placeSubmitting: boolean;
  deletingPlaceId: number | null;
}

export interface AdminStadiumsRuntimeVisualQaRenderers {
  panel: (props: ComponentProps<typeof AdminStadiumsPanelComponent>) => ReactNode;
  placeDialog: (props: ComponentProps<typeof AdminPlaceDialogContentComponent>) => ReactNode;
  deleteDialog: (
    props: ComponentProps<typeof AdminDeletePlaceDialogContentComponent>,
  ) => ReactNode;
}

export interface AdminStadiumsRuntimeProps {
  visualQaStateOverride?: AdminStadiumsRuntimeVisualQaState;
  visualQaRenderers?: AdminStadiumsRuntimeVisualQaRenderers;
}

const PLACE_CATEGORIES = [
  '음식점',
  '카페',
  '편의점',
  '주차장',
  '대중교통',
  '숙박',
  '관광명소',
  '기타',
] as const;

const emptyForm = (): PlaceFormData => ({
  name: '',
  category: '',
  description: '',
  address: '',
  phone: '',
  lat: 0,
  lng: 0,
  rating: undefined,
  openTime: '',
  closeTime: '',
});

const dialogLabels: Record<AdminStadiumsDialogMode, string> = {
  create: '장소 추가',
  edit: '장소 수정',
  delete: '장소 삭제',
};

const AdminStadiumsPanelFallback = () => (
  <div
    data-testid="admin-stadiums-panel-fallback"
    role="status"
    aria-live="polite"
    aria-busy="true"
    className="flex min-h-40 min-w-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/70 px-4 text-center text-slate-400 [overflow-wrap:anywhere]"
  >
    구장 관리 패널 로딩 중...
  </div>
);

const AdminStadiumsDialogFallback = ({ mode }: { mode: AdminStadiumsDialogMode }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
    <div
      data-testid={`admin-stadiums-${mode}-dialog-fallback`}
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={dialogLabels[mode]}
      className="min-w-0 w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 px-4 py-8 text-center text-slate-300 shadow-xl [overflow-wrap:anywhere]"
    >
      <p role="status" aria-live="polite">
        {dialogLabels[mode]} 창 로딩 중...
      </p>
    </div>
  </div>
);

export default function AdminStadiumsRuntime({
  visualQaStateOverride: requestedVisualQaStateOverride,
  visualQaRenderers: requestedVisualQaRenderers,
}: AdminStadiumsRuntimeProps = {}) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const visualQaRenderers = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaRenderers;
  const [stadiums, setStadiums] = useState<AdminStadium[]>(
    visualQaStateOverride?.stadiums ?? [],
  );
  const [stadiumsLoading, setStadiumsLoading] = useState(
    visualQaStateOverride?.stadiumsLoading ?? false,
  );
  const [selectedStadiumId, setSelectedStadiumId] = useState<string>(
    visualQaStateOverride?.selectedStadiumId ?? '',
  );
  const [places, setPlaces] = useState<Place[]>(visualQaStateOverride?.places ?? []);
  const [placesLoading, setPlacesLoading] = useState(
    visualQaStateOverride?.placesLoading ?? false,
  );
  const [stadiumError, setStadiumError] = useState<string | null>(
    visualQaStateOverride?.stadiumError ?? null,
  );
  const [placeDialog, setPlaceDialog] = useState<null | 'create' | Place>(
    visualQaStateOverride?.placeDialog ?? null,
  );
  const [placeForm, setPlaceForm] = useState<PlaceFormData>(
    visualQaStateOverride?.placeForm ?? emptyForm(),
  );
  const [placeSubmitting, setPlaceSubmitting] = useState(
    visualQaStateOverride?.placeSubmitting ?? false,
  );
  const [deletingPlaceId, setDeletingPlaceId] = useState<number | null>(
    visualQaStateOverride?.deletingPlaceId ?? null,
  );

  useEffect(() => {
    if (visualQaStateOverride) {
      return undefined;
    }

    let cancelled = false;

    setStadiumsLoading(true);
    fetchAdminStadiums()
      .then((data) => {
        if (cancelled) {
          return;
        }

        setStadiums(data);
        if (data.length > 0) {
          setSelectedStadiumId((current) => current || data[0].stadiumId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStadiumError('구장 목록을 불러올 수 없습니다.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setStadiumsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [visualQaStateOverride]);

  const loadPlaces = useCallback(async (stadiumId: string) => {
    if (visualQaStateOverride || !stadiumId) {
      return;
    }

    setPlacesLoading(true);
    setStadiumError(null);
    try {
      const data = await fetchAdminPlaces(stadiumId);
      setPlaces(data);
    } catch {
      setStadiumError('장소 목록을 불러올 수 없습니다.');
    } finally {
      setPlacesLoading(false);
    }
  }, [visualQaStateOverride]);

  useEffect(() => {
    if (visualQaStateOverride) {
      return;
    }
    if (selectedStadiumId) {
      void loadPlaces(selectedStadiumId);
    }
  }, [loadPlaces, selectedStadiumId, visualQaStateOverride]);

  const openCreateDialog = () => {
    setPlaceForm(emptyForm());
    setPlaceDialog('create');
  };

  const openEditDialog = (place: Place) => {
    setPlaceForm({
      name: place.name,
      category: place.category,
      description: place.description ?? '',
      address: place.address ?? '',
      phone: place.phone ?? '',
      lat: place.lat,
      lng: place.lng,
      rating: place.rating,
      openTime: place.openTime ?? '',
      closeTime: place.closeTime ?? '',
    });
    setPlaceDialog(place);
  };

  const handlePlaceSubmit = async () => {
    if (!selectedStadiumId) {
      return;
    }

    if (visualQaStateOverride) {
      setPlaceDialog(null);
      return;
    }

    setPlaceSubmitting(true);
    setStadiumError(null);
    try {
      if (placeDialog === 'create') {
        await createPlace(selectedStadiumId, placeForm);
      } else if (placeDialog && typeof placeDialog === 'object') {
        await updatePlace(placeDialog.id, placeForm);
      }
      setPlaceDialog(null);
      await loadPlaces(selectedStadiumId);
    } catch (error) {
      setStadiumError(error instanceof Error ? error.message : '저장 실패');
    } finally {
      setPlaceSubmitting(false);
    }
  };

  const handleDeletePlace = async () => {
    if (deletingPlaceId == null) {
      return;
    }

    if (visualQaStateOverride) {
      setDeletingPlaceId(null);
      return;
    }

    setStadiumError(null);
    try {
      await deletePlace(deletingPlaceId);
      setDeletingPlaceId(null);
      await loadPlaces(selectedStadiumId);
    } catch (error) {
      setStadiumError(error instanceof Error ? error.message : '삭제 실패');
    }
  };

  const selectedStadium = stadiums.find((stadium) => stadium.stadiumId === selectedStadiumId) ?? null;
  const stadiumName = selectedStadium ? getStadiumDisplayName(selectedStadium) : '';

  const panelProps: ComponentProps<typeof AdminStadiumsPanelComponent> = {
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
    visualQaStateOverride: visualQaStateOverride ? { interactive: true } : undefined,
  };
  const placeDialogProps: ComponentProps<typeof AdminPlaceDialogContentComponent> | null = (
    placeDialog === null
      ? null
      : {
          open: true,
          mode: placeDialog === 'create' ? 'create' : 'edit',
          stadiumName,
          categories: PLACE_CATEGORIES,
          stadiumError,
          placeForm,
          setPlaceForm,
          placeSubmitting,
          onOpenChange: (open) => {
            if (!open) {
              setPlaceDialog(null);
            }
          },
          onSubmit: handlePlaceSubmit,
          visualQaStateOverride: visualQaStateOverride ? { interactive: true } : undefined,
        }
  );
  const deleteDialogProps: ComponentProps<typeof AdminDeletePlaceDialogContentComponent> = {
    open: true,
    onOpenChange: (open) => {
      if (!open) {
        setDeletingPlaceId(null);
      }
    },
    onConfirm: handleDeletePlace,
  };
  const dialogMode: AdminStadiumsDialogMode | null = placeDialog === 'create'
    ? 'create'
    : placeDialog !== null
      ? 'edit'
      : deletingPlaceId !== null
        ? 'delete'
        : null;

  if (visualQaStateOverride) {
    if (visualQaStateOverride.panelPhase === 'resolved' && !visualQaRenderers?.panel) {
      throw new Error('AdminStadiumsRuntime Visual QA panel renderer is required.');
    }
    if (placeDialog !== null && deletingPlaceId !== null) {
      throw new Error('AdminStadiumsRuntime Visual QA dialog state must be exclusive.');
    }
    if (visualQaStateOverride.dialogPhase !== 'closed' && dialogMode === null) {
      throw new Error('AdminStadiumsRuntime Visual QA dialog state is required.');
    }
    if (visualQaStateOverride.dialogPhase === 'closed' && dialogMode !== null) {
      throw new Error('AdminStadiumsRuntime Visual QA closed dialog state must be empty.');
    }
    if (
      visualQaStateOverride.dialogPhase !== 'closed'
      && visualQaStateOverride.panelPhase !== 'resolved'
    ) {
      throw new Error('AdminStadiumsRuntime Visual QA dialog requires the resolved panel.');
    }
    if (
      visualQaStateOverride.dialogPhase === 'resolved'
      && dialogMode !== 'delete'
      && !visualQaRenderers?.placeDialog
    ) {
      throw new Error('AdminStadiumsRuntime Visual QA place dialog renderer is required.');
    }
    if (
      visualQaStateOverride.dialogPhase === 'resolved'
      && dialogMode === 'delete'
      && !visualQaRenderers?.deleteDialog
    ) {
      throw new Error('AdminStadiumsRuntime Visual QA delete dialog renderer is required.');
    }
  }

  const renderResolvedPanel = (): ReactNode => visualQaStateOverride
    ? visualQaRenderers?.panel(panelProps)
    : <AdminStadiumsPanel {...panelProps} />;
  const panelContent = visualQaStateOverride?.panelPhase === 'fallback'
    ? <AdminStadiumsPanelFallback />
    : visualQaStateOverride?.panelPhase === 'resolved'
      ? renderResolvedPanel()
      : (
        <Suspense fallback={<AdminStadiumsPanelFallback />}>
          {renderResolvedPanel()}
        </Suspense>
      );

  const renderResolvedDialog = (): ReactNode => {
    if (dialogMode === 'delete') {
      return visualQaStateOverride
        ? visualQaRenderers?.deleteDialog(deleteDialogProps)
        : <AdminDeletePlaceDialogContent {...deleteDialogProps} />;
    }
    if (placeDialogProps === null) {
      return null;
    }
    return visualQaStateOverride
      ? visualQaRenderers?.placeDialog(placeDialogProps)
      : <AdminPlaceDialogContent {...placeDialogProps} />;
  };

  const dialogContent = dialogMode === null
    ? null
    : visualQaStateOverride?.dialogPhase === 'fallback'
      ? <AdminStadiumsDialogFallback mode={dialogMode} />
      : visualQaStateOverride?.dialogPhase === 'resolved'
        ? renderResolvedDialog()
        : (
          <Suspense fallback={<AdminStadiumsDialogFallback mode={dialogMode} />}>
            {renderResolvedDialog()}
          </Suspense>
        );

  return (
    <section
      data-testid="admin-stadiums-runtime"
      aria-busy={visualQaStateOverride?.panelPhase === 'fallback' || stadiumsLoading || undefined}
      className="min-w-0 overflow-hidden"
    >
      {panelContent}
      {dialogContent}
    </section>
  );
}
