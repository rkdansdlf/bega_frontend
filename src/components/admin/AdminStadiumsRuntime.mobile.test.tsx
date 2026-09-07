import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createElement,
  Suspense,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { AdminStadium, Place, PlaceFormData } from '../../api/admin';
import type AdminDeletePlaceDialogContent from './AdminDeletePlaceDialogContent';
import type AdminPlaceDialogContent from './AdminPlaceDialogContent';
import type { AdminStadiumsPanel } from './AdminStadiumsPanel';
import AdminStadiumsRuntime from './AdminStadiumsRuntime';

type VisualQaState = {
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
};

type VisualQaRenderers = {
  panel: (props: ComponentProps<typeof AdminStadiumsPanel>) => ReactNode;
  placeDialog: (props: ComponentProps<typeof AdminPlaceDialogContent>) => ReactNode;
  deleteDialog: (props: ComponentProps<typeof AdminDeletePlaceDialogContent>) => ReactNode;
};

type TestableRuntimeProps = ComponentProps<typeof AdminStadiumsRuntime> & {
  visualQaStateOverride: VisualQaState;
  visualQaRenderers: VisualQaRenderers;
};

const TestableAdminStadiumsRuntime = AdminStadiumsRuntime as ComponentType<TestableRuntimeProps>;

const stadium: AdminStadium = {
  stadiumId: 'MOCK_STADIUM_1',
  stadiumName: 'MOCK 모바일 구장',
  team: 'MOCK 모바일 팀',
  lat: 37.5,
  lng: 127,
  address: 'MOCK 구장 주소',
  phone: '000-0000-0000',
};

const place: Place = {
  id: 42,
  stadiumName: stadium.stadiumName,
  category: 'MOCK 카테고리',
  name: 'MOCK 모바일 장소',
  description: 'MOCK 장소 설명',
  lat: 37.5,
  lng: 127,
  address: 'MOCK 장소 주소',
  phone: '000-1111-2222',
  rating: 4.5,
  openTime: '09:00',
  closeTime: '22:00',
};

const placeForm: PlaceFormData = {
  name: place.name,
  category: place.category,
  description: place.description,
  address: place.address,
  phone: place.phone,
  lat: place.lat,
  lng: place.lng,
  rating: place.rating,
  openTime: place.openTime,
  closeTime: place.closeTime,
};

const baseState: VisualQaState = {
  panelPhase: 'resolved',
  dialogPhase: 'closed',
  stadiums: [stadium],
  stadiumsLoading: false,
  selectedStadiumId: stadium.stadiumId,
  places: [place],
  placesLoading: false,
  stadiumError: null,
  placeDialog: null,
  placeForm,
  placeSubmitting: false,
  deletingPlaceId: null,
};

const renderers: VisualQaRenderers = {
  panel: (props) => createElement(
    'div',
    { 'data-testid': 'stadiums-panel-probe' },
    [
      props.stadiums.length,
      props.selectedStadiumId,
      props.stadiumsLoading,
      props.places.length,
      props.placesLoading,
      props.stadiumError ?? 'none',
    ].join(':'),
  ),
  placeDialog: (props) => createElement(
    'div',
    { 'data-testid': 'place-dialog-probe' },
    [
      props.mode,
      props.stadiumName,
      props.placeForm.name,
      props.placeSubmitting,
      props.stadiumError ?? 'none',
    ].join(':'),
  ),
  deleteDialog: () => createElement(
    'div',
    { 'data-testid': 'delete-dialog-probe' },
    'delete',
  ),
};

const renderRuntime = (
  visualQaStateOverride: VisualQaState,
  visualQaRenderers: VisualQaRenderers = renderers,
) => renderToStaticMarkup(createElement(
  Suspense,
  {
    fallback: createElement(
      'div',
      { 'data-testid': 'unexpected-outer-fallback' },
      '상위 fallback',
    ),
  },
  createElement(TestableAdminStadiumsRuntime, {
    visualQaStateOverride,
    visualQaRenderers,
  }),
));

test('stadiums runtime owns an announced and mobile-contained panel fallback', () => {
  const html = renderRuntime({
    ...baseState,
    panelPhase: 'fallback',
    stadiums: [],
    selectedStadiumId: '',
    places: [],
  });

  assert.match(
    html,
    /data-testid="admin-stadiums-runtime"[^>]+aria-busy="true"[^>]+min-w-0[^>]+overflow-hidden/,
  );
  assert.match(
    html,
    /data-testid="admin-stadiums-panel-fallback"[^>]+role="status"[^>]+aria-live="polite"[^>]+aria-busy="true"/,
  );
  assert.doesNotMatch(html, /unexpected-outer-fallback|stadiums-panel-probe/);
});

test('stadiums runtime forwards every owned list state into the resolved panel', () => {
  const html = renderRuntime({
    ...baseState,
    stadiumsLoading: true,
    placesLoading: true,
    stadiumError: 'MOCK 장소 목록 오류',
  });

  assert.match(html, /data-testid="admin-stadiums-runtime"/);
  assert.match(
    html,
    /data-testid="stadiums-panel-probe"[^>]*>1:MOCK_STADIUM_1:true:1:true:MOCK 장소 목록 오류/,
  );
  assert.doesNotMatch(html, /unexpected-outer-fallback/);
});

test('stadiums runtime renders an announced modal shell for every lazy dialog mode', () => {
  const createHtml = renderRuntime({
    ...baseState,
    dialogPhase: 'fallback',
    placeDialog: 'create',
  });
  const editHtml = renderRuntime({
    ...baseState,
    dialogPhase: 'fallback',
    placeDialog: place,
  });
  const deleteHtml = renderRuntime({
    ...baseState,
    dialogPhase: 'fallback',
    deletingPlaceId: place.id,
  });

  assert.match(createHtml, /data-testid="admin-stadiums-create-dialog-fallback"/);
  assert.match(createHtml, /role="dialog"[^>]+aria-modal="true"[^>]+aria-busy="true"[^>]+aria-label="장소 추가"/);
  assert.match(editHtml, /data-testid="admin-stadiums-edit-dialog-fallback"/);
  assert.match(editHtml, /aria-label="장소 수정"/);
  assert.match(deleteHtml, /data-testid="admin-stadiums-delete-dialog-fallback"/);
  assert.match(deleteHtml, /aria-label="장소 삭제"/);
  assert.match(deleteHtml, /role="status"[^>]+aria-live="polite"/);
  assert.doesNotMatch(`${createHtml}${editHtml}${deleteHtml}`, /place-dialog-probe|delete-dialog-probe/);
});

test('stadiums runtime routes create, edit, and delete state to the matching resolved dialog', () => {
  const createHtml = renderRuntime({
    ...baseState,
    dialogPhase: 'resolved',
    placeDialog: 'create',
    placeForm: { ...placeForm, name: 'MOCK 새 장소' },
    placeSubmitting: true,
  });
  const editHtml = renderRuntime({
    ...baseState,
    dialogPhase: 'resolved',
    placeDialog: place,
    stadiumError: 'MOCK 저장 오류',
  });
  const deleteHtml = renderRuntime({
    ...baseState,
    dialogPhase: 'resolved',
    deletingPlaceId: place.id,
  });

  assert.match(
    createHtml,
    /place-dialog-probe[^>]*>create:MOCK 모바일 구장:MOCK 새 장소:true:none/,
  );
  assert.match(
    editHtml,
    /place-dialog-probe[^>]*>edit:MOCK 모바일 구장:MOCK 모바일 장소:false:MOCK 저장 오류/,
  );
  assert.match(deleteHtml, /delete-dialog-probe[^>]*>delete/);
  assert.doesNotMatch(createHtml, /delete-dialog-probe/);
  assert.doesNotMatch(deleteHtml, /place-dialog-probe/);
});

test('stadiums runtime fails closed when a visible dialog phase has no dialog state', () => {
  assert.throws(
    () => renderToStaticMarkup(createElement(TestableAdminStadiumsRuntime, {
      visualQaStateOverride: {
        ...baseState,
        dialogPhase: 'resolved',
      },
      visualQaRenderers: renderers,
    })),
    /Visual QA dialog state is required/,
  );
});
