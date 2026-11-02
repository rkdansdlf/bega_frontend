// Test-only helper. Browser tests start their own Vite dev servers; servers that share the default
// node_modules/.vite cache re-optimize dependencies underneath each other, and a page then gets
// "504 Outdated Optimize Dep" for react.js and never mounts (frontend-unit CI, GlobalErrorDialog).
// Give every test file its own cache directory (shared by that file's sequential servers so only the
// first one pays the cold dependency optimization), removed when the test process exits.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directories = new Map<string, string>();
let exitHookInstalled = false;

export const createViteCacheDir = (name: string): string => {
  const existing = directories.get(name);
  if (existing) return existing;
  const directory = mkdtempSync(join(tmpdir(), `${name}-vite-`));
  directories.set(name, directory);
  if (!exitHookInstalled) {
    exitHookInstalled = true;
    process.once('exit', () => {
      for (const entry of directories.values()) rmSync(entry, { recursive: true, force: true });
    });
  }
  return directory;
};
