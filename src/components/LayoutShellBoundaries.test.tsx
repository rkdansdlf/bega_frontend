import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./Layout.tsx', import.meta.url), 'utf8');

type HostedEntry = {
  id: string;
  status: string;
  render?: {
    mode?: string;
    hostScenarioIds?: string[];
  };
};

const manifest = JSON.parse(readFileSync(
  new URL('../../contracts/visual-qa-component-states-v1.json', import.meta.url),
  'utf8',
)) as { components: HostedEntry[] };
const entries = new Map(manifest.components.map((entry) => [entry.id, entry]));

test('layout keeps deterministic shell state and runtime seams development-only', () => {
  assert.match(source, /import\.meta\.env\.DEV \? props\.visualQaStateOverride : undefined/);
  assert.match(source, /import\.meta\.env\.DEV \? props\.visualQaRuntimePhases : undefined/);
  assert.match(source, /import\.meta\.env\.DEV \? props\.visualQaRuntimeOverrides : undefined/);
  assert.match(source, /import\.meta\.env\.DEV \? props\.visualQaOutletOverride : undefined/);
  assert.match(source, /if \(visualQaStateOverride !== undefined\) \{\s*return undefined;\s*\}/);
});

test('layout preserves every production shell binding and fallback', () => {
  assert.match(source, /const PublicNavbar = lazy\(\(\) => import\('\.\/PublicNavbar'\)\)/);
  assert.match(source, /const Navbar = lazy\(\(\) => import\('\.\/Navbar'\)\)/);
  assert.match(source, /const AuthenticatedLayoutChrome = lazy\(\(\) => import\('\.\/AuthenticatedLayoutChrome'\)\)/);
  assert.match(source, /const Footer = lazy\(\(\) => import\('\.\/Footer'\)\)/);
  assert.match(source, /<NavbarComponent authenticatedShell \/>/);
  assert.match(source, /<PublicNavbarComponent \/>/);
  assert.match(source, /<FooterComponent \/>/);
  assert.match(source, /<AuthenticatedLayoutChromeComponent enableAuthenticatedServices=\{authenticated\} \/>/);
  assert.match(source, /<PublicNavbarFallback \/>/);
  assert.match(source, /const authenticatedNavbarFallback = <PublicNavbarFallback \/>/);
  assert.match(source, /border-t border-zinc-200/);
});

test('layout footer and public fallback bindings reuse executable direct hosts', () => {
  const footer = entries.get('src/components/Layout.tsx#Footer');
  assert.equal(footer?.status, 'registered');
  assert.equal(footer?.render?.mode, 'hosted');
  assert.equal(footer?.render?.hostScenarioIds?.length, 14);
  assert.ok(footer?.render?.hostScenarioIds?.every((id) => (
    id.startsWith('state:src/components/Footer.tsx#Footer:')
  )));

  const publicFallback = entries.get('src/components/Layout.tsx#PublicNavbarFallback');
  assert.equal(publicFallback?.status, 'registered');
  assert.equal(publicFallback?.render?.mode, 'hosted');
  assert.equal(publicFallback?.render?.hostScenarioIds?.length, 6);
  assert.ok(publicFallback?.render?.hostScenarioIds?.every((id) => (
    id.startsWith('state:src/components/Layout.tsx#Layout:')
    && id.includes('variant.navbar=fallback')
  )));
});
