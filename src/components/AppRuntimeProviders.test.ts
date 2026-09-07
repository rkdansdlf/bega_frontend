import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (fileName: string) => readFileSync(
  new URL(fileName, import.meta.url),
  'utf8',
);

type StateManifestEntry = {
  id: string;
  status: string;
  render?: {
    mode?: string;
    hostScenarioIds?: string[];
  };
};

const readStateManifestEntries = () => {
  const manifest = JSON.parse(readSource('../../contracts/visual-qa-component-states-v1.json')) as {
    components: StateManifestEntry[];
  };
  return new Map(manifest.components.map((entry) => [entry.id, entry]));
};

test('app query provider preserves provider, outlet, guard, and global error bindings', () => {
  const source = readSource('./AppQueryProvider.tsx');

  assert.match(source, /<QueryClientProvider client=\{queryClient\}>/);
  assert.match(source, /<ConfirmDialogProvider>/);
  assert.match(source, /<PredictionQueryGuard \/>/);
  assert.match(source, /\{children \?\? <Outlet \/>\}/);
  assert.match(source, /<GlobalErrorDialog \/>/);
});

test('authenticated chrome keeps deterministic runtime seams development-only', () => {
  const source = readSource('./AuthenticatedLayoutChrome.tsx');

  assert.match(source, /import\.meta\.env\.DEV/);
  assert.match(source, /isChatBotRequestedOverride/);
  assert.match(source, /runtimeOverrides/);
  assert.match(source, /max-md:hidden/);
  assert.match(source, /mobile-content-safe-bottom/);
  assert.match(source, /<ChatBotComponent/);
  assert.match(source, /<ChatBotFloatingButtonComponent/);
  assert.match(source, /<AuthenticatedNotificationSocketBridgeComponent \/>/);
  assert.match(source, /<AuthenticatedLayoutToasterComponent \/>/);
});

test('app provider caller bindings reuse only executable direct host scenarios', () => {
  const expectedHosts = new Map<string, string[]>([
    [
      'src/components/AppRoutes.tsx#AppQueryProvider',
      [
        'state:src/components/AppQueryProvider.tsx#AppQueryProvider:data=single|variant.content=outlet',
      ],
    ],
    [
      'src/components/Layout.tsx#AuthenticatedLayoutChrome',
      [
        'state:src/components/AuthenticatedLayoutChrome.tsx#AuthenticatedLayoutChrome:permissions=anonymous|variant.chatbot=launcher|variant.route=mate-action',
        'state:src/components/AuthenticatedLayoutChrome.tsx#AuthenticatedLayoutChrome:permissions=anonymous|variant.chatbot=launcher|variant.route=regular',
        'state:src/components/AuthenticatedLayoutChrome.tsx#AuthenticatedLayoutChrome:permissions=anonymous|variant.chatbot=open|variant.route=regular',
        'state:src/components/AuthenticatedLayoutChrome.tsx#AuthenticatedLayoutChrome:permissions=user|variant.chatbot=launcher|variant.route=mate-action',
        'state:src/components/AuthenticatedLayoutChrome.tsx#AuthenticatedLayoutChrome:permissions=user|variant.chatbot=launcher|variant.route=regular',
        'state:src/components/AuthenticatedLayoutChrome.tsx#AuthenticatedLayoutChrome:permissions=user|variant.chatbot=open|variant.route=regular',
      ],
    ],
    [
      'src/components/MatePage.tsx#AppQueryProvider',
      [
        'state:src/components/AppQueryProvider.tsx#AppQueryProvider:data=single|variant.content=provided',
      ],
    ],
    [
      'src/components/prediction/PredictionRuntime.tsx#AppQueryProvider',
      [
        'state:src/components/AppQueryProvider.tsx#AppQueryProvider:data=single|variant.content=provided',
      ],
    ],
  ]);
  const entries = readStateManifestEntries();

  for (const [id, hostScenarioIds] of expectedHosts) {
    const entry = entries.get(id);
    assert.equal(entry?.status, 'registered', `${id} must be registered`);
    assert.equal(entry?.render?.mode, 'hosted');
    assert.deepEqual(entry?.render?.hostScenarioIds, hostScenarioIds);
  }

  const appRoutes = readSource('./AppRoutes.tsx');
  assert.match(appRoutes, /const AppQueryProvider = lazy\(\(\) =>/);
  assert.match(appRoutes, /<Route element=\{<AppQueryProvider \/>\}>/);

  const matePage = readSource('./MatePage.tsx');
  assert.match(matePage, /const AppQueryProvider = lazy\(\(\) => import\('\.\/AppQueryProvider'\)\)/);
  assert.match(matePage, /<AppQueryProvider>\s*<MateRuntime \/>\s*<\/AppQueryProvider>/);

  const predictionRuntime = readSource('./prediction/PredictionRuntime.tsx');
  assert.match(predictionRuntime, /const AppQueryProvider = lazy\(\(\) => import\('\.\.\/AppQueryProvider'\)\)/);
  assert.match(predictionRuntime, /<AppQueryProvider>[\s\S]*<\/AppQueryProvider>/);

  const layout = readSource('./Layout.tsx');
  assert.match(layout, /const AuthenticatedLayoutChrome = lazy\(\(\) => import\('\.\/AuthenticatedLayoutChrome'\)\)/);
  assert.match(layout, /shouldMountChatChrome && authenticatedLayoutChromePhase === 'resolved' && \(/);
  assert.match(layout, /<AuthenticatedLayoutChromeComponent enableAuthenticatedServices=\{authenticated\} \/>/);
});
