import assert from 'node:assert/strict';
import test from 'node:test';

import {
  forceProductionBuildNodeEnv,
  isProductionBuildCommand,
  resolveBuildOutDirFromArgs,
  shouldEnableCloudflarePlugin,
  validateProductionPublicEnv,
} from '../vite.config.ts';

test('production build mode is detected only for production builds', () => {
  assert.equal(isProductionBuildCommand({ command: 'build', mode: 'production' }), true);
  assert.equal(isProductionBuildCommand({ command: 'build', mode: 'development' }), false);
  assert.equal(isProductionBuildCommand({ command: 'serve', mode: 'production' }), false);
});

test('production build env wins over polluted NODE_ENV values', () => {
  const env = {
    NODE_ENV: 'development',
    VITE_USER_NODE_ENV: 'development',
  };

  forceProductionBuildNodeEnv(env);

  assert.equal(env.NODE_ENV, 'production');
  assert.equal(env.VITE_USER_NODE_ENV, 'production');
});

test('CLI production outDir is shared with the Cloudflare client build', () => {
  assert.equal(
    resolveBuildOutDirFromArgs(['node', 'vite', 'build', '--outDir', '/tmp/frontend-build']),
    '/tmp/frontend-build',
  );
  assert.equal(
    resolveBuildOutDirFromArgs(['node', 'vite', 'build', '--outDir=/tmp/frontend-build-equals']),
    '/tmp/frontend-build-equals',
  );
  assert.equal(resolveBuildOutDirFromArgs(['node', 'vite', 'build']), undefined);
});

test('temporary client builds can explicitly disable Cloudflare without changing the production default', () => {
  assert.equal(shouldEnableCloudflarePlugin('build', undefined), true);
  assert.equal(shouldEnableCloudflarePlugin('build', 'false'), false);
  assert.equal(shouldEnableCloudflarePlugin('serve', undefined), false);
  assert.equal(shouldEnableCloudflarePlugin('serve', 'true'), true);
});

test('public production builds require an absolute API origin', () => {
  assert.throws(
    () => validateProductionPublicEnv({
      VITE_SITE_URL: 'https://www.begabaseball.xyz',
      VITE_API_BASE_URL: '/api',
    }),
    /VITE_API_BASE_URL.*absolute HTTPS URL/,
  );
});

test('public production build env accepts the canonical frontend and API origins', () => {
  assert.doesNotThrow(() => validateProductionPublicEnv({
    VITE_SITE_URL: 'https://www.begabaseball.xyz',
    VITE_API_BASE_URL: 'https://api.begabaseball.xyz',
  }));
});

test('loopback production-like builds may use a relative API path', () => {
  assert.doesNotThrow(() => validateProductionPublicEnv({
    VITE_SITE_URL: 'http://localhost:5176',
    VITE_API_BASE_URL: '/api',
  }));
});

test('loopback production-like builds may use an absolute loopback API origin', () => {
  assert.doesNotThrow(() => validateProductionPublicEnv({
    VITE_SITE_URL: 'http://localhost:5176',
    VITE_API_BASE_URL: 'http://localhost:8080',
  }));
});
