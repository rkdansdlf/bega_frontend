import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./Navbar.tsx', import.meta.url), 'utf8');

type StateEntry = {
  id: string;
  status: string;
  render?: {
    adapterId?: string;
    hostScenarioIds?: string[];
    mode?: string;
  };
};

const manifest = JSON.parse(readFileSync(
  new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
  'utf8',
)) as { components: StateEntry[] };
const entries = new Map(manifest.components.map((entry) => [entry.id, entry]));

test('navbar keeps deterministic mobile state development-only without replacing production hooks', () => {
  assert.match(source, /visualQaStateOverride\?: NavbarVisualQaStateOverride/);
  assert.match(source, /import\.meta\.env\.DEV \? props\.visualQaStateOverride : undefined/);
  assert.match(source, /const liveIsDesktop = useMediaQuery\('\(min-width: 768px\)'\)/);
  assert.match(source, /const liveScrollMetrics = useScrollMetrics\(\)/);
  assert.match(source, /visualQaStateOverride === undefined && authenticatedShell && isLoggedIn/);
  assert.match(source, /enabled: visualQaStateOverride === undefined && authenticatedShell && isLoggedIn/);
  assert.match(source, /<NavbarNotificationControls/);
  assert.match(source, /<PublicNavbarDesktopAuthControls/);
});

test('navbar exposes every mobile interaction surface and contains pressure copy', () => {
  assert.match(source, /data-testid=\{import\.meta\.env\.DEV \? 'navbar-menu-toggle' : undefined\}/);
  assert.match(source, /data-testid=\{import\.meta\.env\.DEV \? 'navbar-menu-theme-toggle' : undefined\}/);
  assert.match(source, /data-testid=\{import\.meta\.env\.DEV \? `navbar-menu-\$\{item\.id\}` : undefined\}/);
  assert.match(source, /data-testid=\{import\.meta\.env\.DEV \? 'navbar-menu-profile' : undefined\}/);
  assert.match(source, /data-testid=\{import\.meta\.env\.DEV \? 'navbar-menu-admin' : undefined\}/);
  assert.match(source, /data-testid=\{import\.meta\.env\.DEV \? 'navbar-menu-login' : undefined\}/);
  assert.match(source, /data-testid=\{import\.meta\.env\.DEV \? 'navbar-menu-logout' : undefined\}/);
  assert.match(source, /data-testid=\{import\.meta\.env\.DEV \? `auth-navbar-bottom-\$\{item\.id\}` : undefined\}/);
  assert.match(source, /flex-1 min-w-0 text-left/);
  assert.match(source, /\[overflow-wrap:anywhere\]/);
  assert.match(source, /max-w-full truncate/);
});

test('navbar direct and Layout hosted contracts reuse executable scenarios', () => {
  const direct = entries.get('src/components/Navbar.tsx#Navbar');
  assert.equal(direct?.status, 'registered');
  assert.equal(direct?.render?.mode, 'direct');
  assert.equal(direct?.render?.adapterId, 'navbar.shell');

  const hosted = entries.get('src/components/Layout.tsx#Navbar');
  assert.equal(hosted?.status, 'registered');
  assert.equal(hosted?.render?.mode, 'hosted');
  assert.equal(hosted?.render?.hostScenarioIds?.length, 24);
  assert.ok(hosted?.render?.hostScenarioIds?.every((id) => (
    id.startsWith('state:src/components/Navbar.tsx#Navbar:')
    && id.includes('variant.shell=authenticated')
  )));
});
