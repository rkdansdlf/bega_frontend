import assert from 'node:assert/strict';
import * as moduleApi from 'node:module';
import test from 'node:test';

type ModuleNextLoad = (url: string, context: unknown) => unknown;
type ModuleLoadHook = (url: string, context: unknown, nextLoad: ModuleNextLoad) => unknown;

const { registerHooks } = moduleApi as unknown as {
  registerHooks: (hooks: { load: ModuleLoadHook }) => void;
};

// kakaoMap.ts 가 가져오는 constants.ts 는 이미지 import 와 Vite env 를 써서 node 에서 바로 못 읽습니다.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('/src/utils/constants.ts')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export const KAKAO_API_KEY = "visual-qa-kakao-key"; export const MAP_CONFIG = {};',
      };
    }

    if (url.endsWith('.png')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export default "/visual-qa-asset.png";',
      };
    }

    return nextLoad(url, context);
  },
});

const { loadKakaoMapScript } = await import('./kakaoMap');

type FakeScript = {
  dataset: Record<string, string>;
  src: string;
  async: boolean;
  type: string;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  addEventListener: () => void;
  remove: () => void;
};

type LoadOutcome =
  | { outcome: 'loaded' }
  | { outcome: 'failed'; message?: string; reason?: string };

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

const installFakeDom = () => {
  const scripts: FakeScript[] = [];
  const createScript = (): FakeScript => {
    const script: FakeScript = {
      dataset: {},
      src: '',
      async: false,
      type: '',
      onload: null,
      onerror: null,
      addEventListener: () => undefined,
      remove: () => {
        const index = scripts.indexOf(script);
        if (index >= 0) scripts.splice(index, 1);
      },
    };
    return script;
  };
  const fakeDocument = {
    head: {
      appendChild: (script: FakeScript) => {
        scripts.push(script);
        return script;
      },
    },
    createElement: () => createScript(),
    // kakaoMap.ts 는 이 셀렉터로 기존 SDK 태그만 찾으므로, 테스트에서는 kakao 태그만 DOM 에 둡니다.
    querySelector: () => scripts.find((script) => (
      script.dataset.kakaoMapSdk === 'true' || script.src.includes('dapi.kakao.com/v2/maps/sdk.js')
    )) ?? null,
  };

  Object.defineProperty(globalThis, 'document', { configurable: true, writable: true, value: fakeDocument });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      kakao: undefined,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    },
  });
  return scripts;
};

const requestKakaoMapLoad = () => new Promise<LoadOutcome>((resolve) => {
  loadKakaoMapScript(
    () => resolve({ outcome: 'loaded' }),
    (message, reason) => resolve({ outcome: 'failed', message, reason }),
  );
});

test.afterEach(() => {
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, 'window');
  } else {
    Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: originalWindow });
  }
  if (originalDocument === undefined) {
    Reflect.deleteProperty(globalThis, 'document');
  } else {
    Object.defineProperty(globalThis, 'document', { configurable: true, writable: true, value: originalDocument });
  }
});

test('retry after a script that loads without the Kakao SDK injects a fresh tag', async () => {
  const scripts = installFakeDom();

  const firstAttempt = requestKakaoMapLoad();
  assert.equal(scripts.length, 1);
  const [firstScript] = scripts;
  // SDK 스크립트는 받았지만 window.kakao 가 없는 상황(도메인 미허용 등)입니다.
  firstScript.onload?.();

  const firstResult = await firstAttempt;
  assert.equal(firstResult.outcome, 'failed');
  assert.equal(firstResult.reason, 'unavailable');
  assert.equal(scripts.length, 0, 'the tag that loaded without the SDK must not stay in the DOM');

  const secondAttempt = requestKakaoMapLoad();
  assert.equal(scripts.length, 1, 'a retry must inject exactly one fresh tag');
  const [secondScript] = scripts;
  assert.notEqual(secondScript, firstScript);
  assert.equal(secondScript.dataset.kakaoMapSdk, 'true');

  (globalThis.window as unknown as { kakao: unknown }).kakao = {
    maps: { load: (callback: () => void) => callback() },
  };
  secondScript.onload?.();

  assert.deepEqual(await secondAttempt, { outcome: 'loaded' });
  assert.equal(scripts.length, 1, 'a successfully loaded SDK tag stays in the DOM');
});
