import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import SajikSeatMap from './SajikSeatMap';
import SajikSeatMapEditor, { PathValidationStatus } from './SajikSeatMapEditor';
import SajikSeatMapSvg, { MissingOfficialSeatMap } from './SajikSeatMapSvg';
import {
  SAJIK_CANONICAL_SEATMAP_SUMMARY,
  validateSajikCanonicalSeatMap,
} from '../../data/sajikCanonicalSeatMap';

const svgBaseProps = {
  mode: 'light' as const,
  selected: null,
  setSelected: () => undefined,
  hover: null,
  setHover: () => undefined,
  filterCats: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  onPanChange: () => undefined,
  onZoom: () => undefined,
  minZoom: 1,
  maxZoom: 2.5,
  zoomStep: 0.25,
};

test('SajikSeatMap은 canonical 1151x1367 단일 좌석도를 렌더링한다', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(SajikSeatMap)));
  const seatPathMatches = html.match(/data-testid="sajik-seat-block-/g) ?? [];
  const markerMatches = html.match(/data-testid="sajik-accessibility-marker-stage/g) ?? [];

  assert.deepEqual(validateSajikCanonicalSeatMap(), []);
  assert.match(html, /data-testid="stadium-seat-map"/);
  assert.match(html, /부산 사직야구장/);
  assert.match(html, /사직 기준 좌석도/);
  assert.match(html, /data-testid="sajik-seatmap-panel"/);
  assert.match(html, /data-source-id="SAJIK_CANONICAL_2026"/);
  assert.match(html, /data-coordinate-source="operator-reference-1151x1367"/);
  assert.match(html, /viewBox="0 0 1151 1367"/);
  assert.match(html, /sajik-seatmap-operator-reference-2026\.webp/);
  assert.match(html, /처음 사직 가이드/);
  assert.match(html, /블록\/좌석 검색/);
  assert.match(html, /data-testid="sajik-seat-section-layer"/);
  assert.match(html, /data-testid="sajik-accessibility-markers-layer"/);
  assert.match(html, /data-linked-marker-count="8"/);
  assert.equal(seatPathMatches.length, SAJIK_CANONICAL_SEATMAP_SUMMARY.activeSeatSections);
  assert.equal(markerMatches.length, SAJIK_CANONICAL_SEATMAP_SUMMARY.accessibilityMarkers);
  assert.doesNotMatch(html, /data-testid="sajik-seatmap-source-tabs"/);
  assert.doesNotMatch(html, /data-testid="sajik-seatmap-source-OPERATOR_REFERENCE_2026"/);
  assert.doesNotMatch(html, /data-testid="sajik-seatmap-source-LOTTE_OFFICIAL_2026"/);
  assert.doesNotMatch(html, /sajik-lotte-seatmap-official-2026\.webp/);
  assert.doesNotMatch(html, /<svg[^>]+viewBox="0 0 960 640"/);
  assert.doesNotMatch(html, /data-testid="sajik-operator-reference-preview-layer"/);
  assert.doesNotMatch(html, /data-testid="sajik-official-seatmap-required"/);
  assert.doesNotMatch(html, /MANUAL_BASEBALL_DATA_REQUIRED/);
});

test('SajikSeatMap state override는 선택·전체화면·로그인 사용자 업로드 화면을 첫 렌더에 재현한다', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const StateDrivenSajikSeatMap = SajikSeatMap as unknown as ComponentType<{
    stateOverride: {
      guideIntent: 'all';
      guideQuery: string;
      isFullscreenOpen: boolean;
      isLoggedIn: boolean;
      isSectionFinderOpen: boolean;
      selectedBlockId: string;
      uploadBlockId: string;
    };
  }>;
  const html = renderToStaticMarkup(createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(
      MemoryRouter,
      null,
      createElement(StateDrivenSajikSeatMap, {
        stateOverride: {
          guideIntent: 'all',
          guideQuery: '',
          isFullscreenOpen: true,
          isLoggedIn: true,
          isSectionFinderOpen: false,
          selectedBlockId: 'sajik-canonical-322',
          uploadBlockId: 'sajik-canonical-322',
        },
      }),
    ),
  ));

  assert.match(html, /3루 내야상단석A 322블록/);
  assert.match(html, /data-testid="sajik-seatmap-fullscreen"/);
  assert.match(html, /data-testid="seat-view-direct-upload-modal"/);
  assert.doesNotMatch(html, /data-testid="sajik-section-finder"/);
  queryClient.clear();
});

test('사직 가이드와 지도 오버레이의 모바일 조작부는 44px 터치 영역을 유지한다', () => {
  const mapHtml = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(SajikSeatMap)));
  const svgHtml = renderToStaticMarkup(createElement(SajikSeatMapSvg, svgBaseProps));

  assert.match(mapHtml, /data-testid="sajik-guide-search"[^>]+class="[^"]*h-11/);
  assert.match(mapHtml, /data-testid="sajik-guide-intent-all"[^>]+class="[^"]*min-h-11/);
  assert.match(mapHtml, /data-testid="sajik-guide-result-[^"]+"[^>]+class="[^"]*max-w-/);
  assert.match(mapHtml, /class="[^"]*\[overflow-wrap:anywhere\][^"]*"/);
  assert.match(svgHtml, /data-testid="sajik-seatmap-zoom-in"[^>]+class="[^"]*h-11[^"]*w-11/);
  assert.match(svgHtml, /data-testid="sajik-seatmap-zoom-reset"[^>]+class="[^"]*min-h-11[^"]*min-w-11/);
  assert.match(svgHtml, /data-testid="sajik-seatmap-zoom-out"[^>]+class="[^"]*h-11[^"]*w-11/);
  assert.ok(
    svgHtml.indexOf('data-testid="sajik-seatmap-zoom-in"')
      < svgHtml.indexOf('data-testid="sajik-seatmap-viewport"'),
    'mobile controls must be laid out before the map viewport instead of covering seat geometry',
  );
});

test('사직 SVG의 이미지 준비·완료·오류 상태는 첫 렌더에서 결정적으로 재현된다', () => {
  const StateDrivenSajikSeatMapSvg = SajikSeatMapSvg as unknown as ComponentType<{
    stateOverride: { imageState: 'loading' | 'loaded' | 'error' };
  } & typeof svgBaseProps>;
  const loadingHtml = renderToStaticMarkup(createElement(StateDrivenSajikSeatMapSvg, {
    ...svgBaseProps,
    stateOverride: { imageState: 'loading' },
  }));
  const loadedHtml = renderToStaticMarkup(createElement(StateDrivenSajikSeatMapSvg, {
    ...svgBaseProps,
    stateOverride: { imageState: 'loaded' },
  }));
  const errorHtml = renderToStaticMarkup(createElement(StateDrivenSajikSeatMapSvg, {
    ...svgBaseProps,
    stateOverride: { imageState: 'error' },
  }));

  assert.match(loadingHtml, /<rect[^>]+fill="#e5e7eb"/);
  assert.match(loadingHtml, /opacity:0/);
  assert.doesNotMatch(loadedHtml, /<rect[^>]+fill="#e5e7eb"/);
  assert.match(loadedHtml, /opacity:1/);
  assert.match(errorHtml, /data-testid="sajik-official-seatmap-required"/);
});

test('사직 이미지 누락 상태와 path validator는 독립 렌더와 모바일 긴 문구를 지원한다', () => {
  const missingHtml = renderToStaticMarkup(createElement(MissingOfficialSeatMap, { mode: 'dark' }));
  const passHtml = renderToStaticMarkup(createElement(PathValidationStatus, {
    label: 'visualPath',
    issues: [],
  }));
  const failHtml = renderToStaticMarkup(createElement(PathValidationStatus, {
    label: `hitPath-${'X'.repeat(120)}`,
    issues: [{} as never, {} as never],
  }));

  assert.match(missingHtml, /data-testid="sajik-official-seatmap-required"/);
  assert.match(missingHtml, /\[overflow-wrap:anywhere\]/);
  assert.match(passHtml, /validator-pass/);
  assert.match(passHtml, />PASS</);
  assert.match(failHtml, /validator-fail/);
  assert.match(failHtml, />2 ISSUES</);
  assert.match(failHtml, /min-w-0/);
  assert.match(failHtml, /break-all/);
});

test('SajikSeatMapSvg는 canonical section과 marker만 활성 runtime layer로 렌더링한다', () => {
  const html = renderToStaticMarkup(createElement(SajikSeatMapSvg, svgBaseProps));
  const seatPathMatches = html.match(/data-testid="sajik-seat-block-/g) ?? [];
  const markerMatches = html.match(/data-testid="sajik-accessibility-marker-stage/g) ?? [];

  assert.match(html, /data-source-id="SAJIK_CANONICAL_2026"/);
  assert.match(html, /data-map-version="BUSAN_SAJIK_2026_CANONICAL_OPERATOR_REFERENCE_V1"/);
  assert.match(html, /data-seat-path-count="78"/);
  assert.match(html, /viewBox="0 0 1151 1367"/);
  assert.match(html, /data-testid="sajik-canonical-seatmap-image"/);
  assert.match(html, /<image[^>]+href="[^"]*sajik-seatmap-operator-reference-2026\.webp"/);
  assert.match(html, /<image[^>]+width="1151"[^>]+height="1367"/);
  assert.equal(seatPathMatches.length, SAJIK_CANONICAL_SEATMAP_SUMMARY.activeSeatSections);
  assert.equal(markerMatches.length, SAJIK_CANONICAL_SEATMAP_SUMMARY.accessibilityMarkers);
  assert.match(html, /data-testid="sajik-seat-block-sajik-canonical-322"/);
  assert.match(html, /data-testid="sajik-seat-block-sajik-canonical-323"/);
  assert.match(html, /data-testid="sajik-seat-block-sajik-canonical-921"/);
  assert.match(html, /role="button"[^>]+aria-label="3루 내야상단석A 323블록 323 접근성 marker"[^>]+data-testid="sajik-accessibility-marker-stage03-wheelchair-05"[^>]+data-marker-interaction-status="LINKED_SECTION_SELECTABLE"[^>]+data-related-section-id="323"/);
  assert.match(html, /data-testid="sajik-accessibility-marker-stage02-wheelchair-02"[^>]+data-marker-interaction-status="DISPLAY_ONLY"[^>]+data-related-section-id="127"/);
  assert.match(html, /data-testid="sajik-accessibility-marker-visual-stage02-wheelchair-01"[^>]+pointer-events="none"/);
  assert.doesNotMatch(html, /data-testid="sajik-seatmap-source-tabs"/);
  assert.doesNotMatch(html, /data-testid="sajik-operator-reference-preview-block-/);
  assert.doesNotMatch(html, /sajik-lotte-seatmap-official-2026\.webp/);
});

test('SajikSeatMapSvg source는 legacy source selector/runtime branch를 다시 포함하지 않는다', () => {
  const svgSource = readFileSync(resolve(process.cwd(), 'src/components/sajik/SajikSeatMapSvg.tsx'), 'utf8');

  [
    'SourceTabs',
    'resolveSeatMapSourceImageUrl',
    'handleLegacySourceTabChange',
    'activeSourceReference',
    'isReferenceSource',
    'showOperatorReferenceDebugOverlay',
    'sajik-seatmap-source-tabs',
    'sajik-seatmap-source-OPERATOR_REFERENCE_2026',
    'sajik-seatmap-source-LOTTE_OFFICIAL_2026',
    'sajik-reference-seatmap-panel',
    'sajik-operator-reference-preview-layer',
    'sajik-operator-reference-debug-overlay',
    'SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET',
    'SAJIK_SEATMAP_SOURCE_REFERENCES',
    'SajikSeatMapSourceId',
  ].forEach((forbiddenText) => {
    assert.equal(svgSource.includes(forbiddenText), false, `legacy Sajik source runtime text must stay removed: ${forbiddenText}`);
  });
});

test('SajikSeatMapEditor는 dev-only editor/export shell 계약을 렌더링한다', () => {
  const html = renderToStaticMarkup(createElement(SajikSeatMapEditor));

  assert.match(html, /data-testid="sajik-seatmap-editor"/);
  assert.match(html, /Internal seatmap editor v1.7/);
  assert.match(html, /data-summary-total-sections="89"/);
  assert.match(html, /data-summary-enabled-sections="87"/);
  assert.match(html, /data-summary-alias-only-sections="2"/);
  assert.match(html, /data-summary-markers="3"/);
  assert.match(html, /data-testid="sajik-editor-svg"/);
  assert.match(html, /viewBox="0 0 960 640"/);
  assert.match(html, /data-testid="sajik-editor-official-image"/);
  assert.match(html, /data-testid="sajik-editor-section-112"/);
  assert.match(html, /data-testid="sajik-editor-marker-/);
  assert.match(html, /data-testid="sajik-editor-draft-controls"/);
  assert.match(html, /data-testid="sajik-editor-validator-pass"/);
  assert.match(html, /VALIDATOR PASS/);
  assert.match(html, /data-testid="sajik-editor-patch-status-pass"/);
  assert.match(html, /PATCH PASS/);
  assert.match(html, /data-testid="sajik-editor-dataset-json"/);
  assert.match(html, /BUSAN_SAJIK_2026_MANUAL_POLYGON_V2/);
});

test('SajikSeatMapEditor는 clean·dirty·invalid 상태와 모바일 reflow를 결정적으로 렌더링한다', () => {
  const StateDrivenSajikSeatMapEditor = SajikSeatMapEditor as unknown as ComponentType<{
    stateOverride: {
      dataState: 'clean' | 'dirty-pass' | 'invalid-hitpath';
      editingTarget?: 'visualPath' | 'hitPath' | 'labelPoint';
      query?: string;
      selectedSectionId?: string;
    };
  }>;
  const cleanHtml = renderToStaticMarkup(createElement(StateDrivenSajikSeatMapEditor, {
    stateOverride: { dataState: 'clean' },
  }));
  const dirtyHtml = renderToStaticMarkup(createElement(StateDrivenSajikSeatMapEditor, {
    stateOverride: { dataState: 'dirty-pass' },
  }));
  const invalidHtml = renderToStaticMarkup(createElement(StateDrivenSajikSeatMapEditor, {
    stateOverride: {
      dataState: 'invalid-hitpath',
      editingTarget: 'labelPoint',
      query: `SAJIK-${'X'.repeat(120)}`,
      selectedSectionId: '112',
    },
  }));

  assert.match(cleanHtml, /data-testid="sajik-editor-draft-status"[^>]*>draft clean</);
  assert.match(dirtyHtml, /data-testid="sajik-editor-draft-status"[^>]*>draft dirty</);
  assert.match(dirtyHtml, /data-testid="sajik-editor-patch-status-pass"/);
  assert.match(invalidHtml, /data-testid="sajik-editor-patch-status-fail"/);
  assert.match(invalidHtml, /data-testid="sajik-editor-labelpoint-handle"/);
  assert.match(invalidHtml, /overflow-x-hidden/);
  assert.match(invalidHtml, /grid-cols-2[^\"]*sm:grid-cols-4/);
  assert.match(invalidHtml, /data-testid="sajik-editor-reset-draft"[^>]+class="[^"]*min-h-11/);
  assert.match(invalidHtml, /data-testid="sajik-editor-nudge-y-minus"[^>]+class="[^"]*h-11[^\"]*w-11/);
  assert.match(invalidHtml, /data-testid="sajik-editor-patch-json"[^>]+class="[^"]*h-48[^\"]*min-w-0[^\"]*xl:h-auto/);
  assert.match(invalidHtml, /data-testid="sajik-editor-dataset-json"[^>]+class="[^"]*h-48[^\"]*min-w-0[^\"]*xl:h-auto/);
});

test('SajikSeatMapEditor route는 production navigation에 노출되지 않는 dev-only 내부 route다', () => {
  const appRoutesSource = readFileSync(resolve(process.cwd(), 'src/components/AppRoutes.tsx'), 'utf8');
  const publicNavSource = readFileSync(resolve(process.cwd(), 'src/components/publicNavbarNavItems.ts'), 'utf8');

  assert.match(appRoutesSource, /const SajikSeatMapEditor = import\.meta\.env\.DEV/);
  assert.match(appRoutesSource, /path="\/internal\/sajik-seatmap-editor"/);
  assert.match(appRoutesSource, /import\.meta\.env\.DEV && SajikSeatMapEditor/);
  assert.doesNotMatch(publicNavSource, /sajik-seatmap-editor/);
});
