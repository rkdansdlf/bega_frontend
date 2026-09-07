import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { AdminStadium, Place } from '../../api/admin';
import { AdminStadiumsPanel } from './AdminStadiumsPanel';

const baseStadium: AdminStadium = {
  stadiumId: 'MOCK_STADIUM_1',
  stadiumName: 'MOCK 구장',
  team: 'MOCK 팀',
  lat: 37.5,
  lng: 127,
  address: 'MOCK 구장 주소',
  phone: '000-0000-0000',
};

const basePlace: Place = {
  id: 42,
  stadiumName: 'MOCK 구장',
  category: 'MOCK 카테고리',
  name: 'MOCK 장소',
  description: 'MOCK 장소 설명',
  lat: 37.5,
  lng: 127,
  address: 'MOCK 장소 주소',
  phone: '000-1111-2222',
  rating: 4.5,
  openTime: '09:00',
  closeTime: '22:00',
};

const renderPanel = ({
  stadiumError = null,
  selectedStadiumId = baseStadium.stadiumId,
  stadiumsLoading = false,
  stadiums = [baseStadium],
  placesLoading = false,
  places = [basePlace],
}: {
  stadiumError?: string | null;
  selectedStadiumId?: string;
  stadiumsLoading?: boolean;
  stadiums?: AdminStadium[];
  placesLoading?: boolean;
  places?: Place[];
} = {}) => renderToStaticMarkup(createElement(AdminStadiumsPanel, {
  openCreateDialog: () => undefined,
  openEditDialog: () => undefined,
  places,
  placesLoading,
  selectedStadiumId,
  setDeletingPlaceId: () => undefined,
  setSelectedStadiumId: () => undefined,
  stadiumError,
  stadiums,
  stadiumsLoading,
}));

test('admin stadium controls expose persistent names, selection semantics, and mobile targets', () => {
  const selectedHtml = renderPanel();
  const unselectedHtml = renderPanel({ selectedStadiumId: '', places: [] });

  assert.match(selectedHtml, /data-testid="admin-stadiums-panel"/);
  assert.match(selectedHtml, /<label[^>]*for="admin-stadium-select-trigger"[^>]*>[\s\S]*구장 선택/);
  assert.match(selectedHtml, /id="admin-stadium-select-trigger"/);
  assert.ok((selectedHtml.match(/min-h-11/g) ?? []).length >= 4);
  assert.match(selectedHtml, /data-testid="admin-stadium-add-place"/);
  assert.doesNotMatch(
    selectedHtml,
    /data-testid="admin-stadium-add-place"[^>]*disabled/,
  );
  assert.match(
    unselectedHtml,
    /data-testid="admin-stadium-add-place"[^>]*disabled/,
  );
});

test('admin stadium loading, empty, and error states stay visible without a wide table', () => {
  const loadingHtml = renderPanel({ placesLoading: true, places: [] });
  const selectedEmptyHtml = renderPanel({ places: [] });
  const unselectedEmptyHtml = renderPanel({
    selectedStadiumId: '',
    stadiums: [],
    places: [],
  });
  const stadiumLoadingHtml = renderPanel({
    selectedStadiumId: '',
    stadiumsLoading: true,
    stadiums: [],
    places: [],
  });
  const errorHtml = renderPanel({
    stadiumError: `MOCK_${'UNBROKEN'.repeat(24)}`,
    places: [],
  });

  assert.match(loadingHtml, /role="status"[^>]*aria-live="polite"/);
  assert.match(loadingHtml, /장소 목록 로딩 중/);
  assert.doesNotMatch(loadingHtml, /<table/);
  assert.match(selectedEmptyHtml, /role="status"/);
  assert.match(selectedEmptyHtml, /등록된 장소가 없습니다/);
  assert.doesNotMatch(selectedEmptyHtml, /<table/);
  assert.match(unselectedEmptyHtml, /구장을 먼저 선택하세요/);
  assert.doesNotMatch(unselectedEmptyHtml, /<table/);
  assert.match(stadiumLoadingHtml, /id="admin-stadium-select-trigger"[^>]*disabled/);
  assert.match(stadiumLoadingHtml, /구장 목록 로딩 중/);
  assert.match(errorHtml, /role="alert"/);
  assert.match(errorHtml, /title="MOCK_UNBROKEN/);
  assert.match(errorHtml, /line-clamp-3/);
  assert.match(errorHtml, /\[overflow-wrap:anywhere\]/);
});

test('admin stadium rows use a bounded wide table and preserve pressure originals', () => {
  const pressure = `MOCK_${'UNBROKEN'.repeat(24)}`;
  const html = renderPanel({
    places: [{
      ...basePlace,
      category: pressure,
      name: pressure,
      address: pressure,
      phone: pressure,
      openTime: pressure,
      closeTime: pressure,
    }],
  });

  assert.match(html, /data-testid="admin-stadiums-table-region"/);
  assert.match(html, /max-h-\[320px\][^"\n]*overflow-y-auto/);
  assert.match(html, /<table[^>]*aria-label="구장 주변 장소 목록"/);
  assert.match(html, /<table[^>]*min-w-\[1088px\][^>]*table-fixed/);
  assert.match(html, /data-testid="admin-place-row-42"/);
  assert.ok((html.match(/title="MOCK_UNBROKEN/g) ?? []).length >= 5);
  assert.ok((html.match(/truncate/g) ?? []).length >= 5);
});

test('admin stadium row actions have explicit names and 44px mobile targets', () => {
  const html = renderPanel();

  assert.match(html, /aria-label="장소 42번 수정"/);
  assert.match(html, /aria-label="장소 42번 삭제"/);
  assert.ok((html.match(/min-h-11/g) ?? []).length >= 4);
  assert.ok((html.match(/min-w-11/g) ?? []).length >= 2);
});
