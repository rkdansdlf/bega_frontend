import assert from 'node:assert/strict';
import * as moduleApi from 'node:module';
import test from 'node:test';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';

type ModuleNextLoad = (url: string, context: unknown) => unknown;
type ModuleLoadHook = (url: string, context: unknown, nextLoad: ModuleNextLoad) => unknown;

const { registerHooks } = moduleApi as unknown as {
  registerHooks: (hooks: { load: ModuleLoadHook }) => void;
};

type MockKakaoMap = {
  loadKakaoMapScript: (
    onLoad?: () => void,
    onError?: (message?: string, reason?: string) => void,
  ) => void;
  searchNearbyPlaces: () => void;
  updateMapMarkers: () => void;
};

declare global {
  // eslint-disable-next-line no-var
  var __mockKakaoMap: MockKakaoMap | undefined;
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.png') || url.endsWith('.webp')) {
      return { format: 'module', shortCircuit: true, source: 'export default "/test.png";' };
    }
    if (url.endsWith('.css')) {
      return { format: 'module', shortCircuit: true, source: 'export default {};' };
    }
    if (url.endsWith('/src/utils/constants.ts')) {
      return {
        format: 'module',
        shortCircuit: true,
        source:
          'export const KAKAO_API_KEY = "test-key"; export const MAP_CONFIG = { DEFAULT_LEVEL: 3 }; export const THEME_COLORS = {}; export const CATEGORY_CONFIGS = {};',
      };
    }
    if (url.includes('react-router-dom')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export const useNavigate = () => () => {}; export const useParams = () => ({});',
      };
    }
    if (url.includes('@tanstack/react-query')) {
      return {
        format: 'module',
        shortCircuit: true,
        source:
          'const STABLE = { data: undefined, isPending: false, isError: false, isSuccess: false }; export const useQuery = () => STABLE;',
      };
    }
    if (url.endsWith('/src/hooks/useKakaoMap.ts')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: `
          const STABLE_MAP = {
            mapContainer: { current: null },
            map: null,
            markersRef: { current: [] },
            infowindowsRef: { current: [] },
            clearMarkers: () => {},
            initializeMap: () => {},
          };
          export const useKakaoMap = () => STABLE_MAP;
        `,
      };
    }
    if (url.endsWith('/src/utils/kakaoMap.ts')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: `
          export const loadKakaoMapScript = (...args) => globalThis.__mockKakaoMap?.loadKakaoMapScript(...args);
          export const searchNearbyPlaces = (...args) => globalThis.__mockKakaoMap?.searchNearbyPlaces(...args);
          export const updateMapMarkers = (...args) => globalThis.__mockKakaoMap?.updateMapMarkers(...args);
        `,
      };
    }
    return nextLoad(url, context);
  },
});

const { useStadiumGuide } = await import('./useStadiumGuide');

class FakeNode {
  nodeType = 1;
  nodeName = 'DIV';
  tagName = 'DIV';
  style = {};
  childNodes: FakeNode[] = [];
  ownerDocument: unknown = null;
  setAttribute() {}
  removeAttribute() {}
  appendChild<T extends FakeNode>(child: T): T {
    this.childNodes.push(child);
    return child;
  }
  removeChild<T extends FakeNode>(child: T): T {
    const idx = this.childNodes.indexOf(child);
    if (idx >= 0) this.childNodes.splice(idx, 1);
    return child;
  }
  insertBefore<T extends FakeNode>(child: T): T {
    this.childNodes.push(child);
    return child;
  }
  addEventListener() {}
  removeEventListener() {}
}

const setupFakeDom = () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  const windowTarget = new EventTarget();
  const fakeWindow = Object.assign(windowTarget, {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    HTMLIFrameElement: class extends FakeNode {},
    HTMLElement: FakeNode,
    Element: FakeNode,
    Node: FakeNode,
  });

  const fakeDocument = {
    nodeType: 9,
    nodeName: '#document',
    ownerDocument: null,
    activeElement: null,
    defaultView: fakeWindow,
    addEventListener() {},
    removeEventListener() {},
    createElement(tag: string) {
      const el = new FakeNode();
      el.nodeName = tag.toUpperCase();
      el.tagName = tag.toUpperCase();
      el.ownerDocument = fakeDocument;
      return el;
    },
    createTextNode(text: string) {
      return { nodeType: 3, nodeName: '#text', nodeValue: text, ownerDocument: fakeDocument };
    },
    body: null as unknown as FakeNode,
    documentElement: null as unknown as FakeNode,
  };

  const container = new FakeNode();
  container.ownerDocument = fakeDocument;
  fakeDocument.body = container;
  fakeDocument.documentElement = container;

  (fakeWindow as unknown as { document: unknown }).document = fakeDocument;

  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: fakeWindow,
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    writable: true,
    value: fakeDocument,
  });
  Object.defineProperty(globalThis, 'HTMLIFrameElement', {
    configurable: true,
    writable: true,
    value: fakeWindow.HTMLIFrameElement,
  });
  Object.defineProperty(globalThis, 'HTMLElement', {
    configurable: true,
    writable: true,
    value: FakeNode,
  });
  Object.defineProperty(globalThis, 'Element', {
    configurable: true,
    writable: true,
    value: FakeNode,
  });
  Object.defineProperty(globalThis, 'Node', {
    configurable: true,
    writable: true,
    value: FakeNode,
  });

  const cleanup = () => {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, 'window');
    } else {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        writable: true,
        value: originalWindow,
      });
    }
    if (originalDocument === undefined) {
      Reflect.deleteProperty(globalThis, 'document');
    } else {
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        writable: true,
        value: originalDocument,
      });
    }
    delete globalThis.__mockKakaoMap;
  };

  return { container, fakeWindow, cleanup };
};

function Probe() {
  useStadiumGuide();
  return null;
}

test('useStadiumGuide: offline 실패 시 online 이벤트로 재시도하고, 성공 후 리스너를 정리한다', () => {
  const { container, fakeWindow, cleanup } = setupFakeDom();

  try {
    let loadCalls = 0;
    globalThis.__mockKakaoMap = {
      loadKakaoMapScript(onLoad, onError) {
        loadCalls += 1;
        if (loadCalls === 1) {
          // 첫 시도는 오프라인으로 실패
          onError?.('네트워크 연결 끊김', 'offline');
        } else {
          // 재시도는 성공
          onLoad?.();
        }
      },
      searchNearbyPlaces() {},
      updateMapMarkers() {},
    };

    const root = createRoot(container as unknown as HTMLElement);
    act(() => {
      root.render(createElement(Probe));
    });

    assert.equal(loadCalls, 1, '컴포넌트 마운트 시 카카오맵 스크립트를 1회 요청해야 한다');

    // (a) dispatching 'online' calls the SDK loader exactly once more
    act(() => {
      fakeWindow.dispatchEvent(new Event('online'));
    });

    assert.equal(loadCalls, 2, 'online 이벤트 발생 시 SDK 로더가 정확히 1회 더 호출되어야 한다');

    // (b) after that retry succeeds, the 'online' listener is removed, so another 'online' event does not trigger another load
    act(() => {
      fakeWindow.dispatchEvent(new Event('online'));
    });

    assert.equal(
      loadCalls,
      2,
      '재시도 성공 후에는 online 리스너가 제거되어 추가 online 이벤트가 발생해도 SDK 로드를 호출하지 않아야 한다',
    );

    act(() => {
      root.unmount();
    });
  } finally {
    cleanup();
  }
});
