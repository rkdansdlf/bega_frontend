// CSP contract for HTML responses served from public/_headers (#89).
// - GA4/GTM must be allowed in script-src / img-src / connect-src so gtag.js and its beacons load.
// - script-src must never fall back to 'unsafe-inline'; index.html therefore must not contain
//   inline executable <script> blocks unless their sha256 hash is listed in script-src.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const headersSource = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
const indexHtmlSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const GA_GTM_SCRIPT_SOURCES = ['https://www.googletagmanager.com'];
const GA_GTM_BEACON_SOURCES = [
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
];

export const parseHeadersFile = (source) => {
  const rules = new Map();
  let currentPath = null;
  for (const rawLine of source.split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) {
      continue;
    }
    if (!/^\s/.test(rawLine)) {
      currentPath = rawLine.trim();
      rules.set(currentPath, {});
      continue;
    }
    const separatorIndex = rawLine.indexOf(':');
    if (currentPath && separatorIndex > 0) {
      const name = rawLine.slice(0, separatorIndex).trim().toLowerCase();
      rules.get(currentPath)[name] = rawLine.slice(separatorIndex + 1).trim();
    }
  }
  return rules;
};

export const parseCsp = (policy) => Object.fromEntries(
  policy
    .split(';')
    .map((directive) => directive.trim())
    .filter(Boolean)
    .map((directive) => {
      const [name, ...sources] = directive.split(/\s+/);
      return [name, sources];
    }),
);

const isExecutableInlineScript = (attributes) => {
  if (/\ssrc\s*=/.test(attributes)) {
    return false;
  }
  const typeMatch = attributes.match(/\stype\s*=\s*["']?([^"'\s>]+)/i);
  if (!typeMatch) {
    return true;
  }
  const type = typeMatch[1].toLowerCase();
  return type === 'module' || type === 'text/javascript' || type === 'application/javascript';
};

export const collectInlineScriptHashes = (html) => {
  const hashes = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const [, attributes, content] = match;
    if (!isExecutableInlineScript(` ${attributes}`)) {
      continue;
    }
    hashes.push(`'sha256-${createHash('sha256').update(content, 'utf8').digest('base64')}'`);
  }
  return hashes;
};

const htmlCspRules = (() => {
  const rules = parseHeadersFile(headersSource);
  return ['/', '/*.html'].map((path) => {
    const policy = rules.get(path)?.['content-security-policy'];
    assert.ok(policy, `public/_headers must define Content-Security-Policy for ${path}`);
    return { path, policy, directives: parseCsp(policy) };
  });
})();

test('HTML CSP rules stay identical across "/" and "/*.html"', () => {
  assert.equal(htmlCspRules[0].policy, htmlCspRules[1].policy);
});

test('HTML CSP allows GA4/GTM script and beacon hosts', () => {
  for (const { path, directives } of htmlCspRules) {
    for (const source of GA_GTM_SCRIPT_SOURCES) {
      assert.ok(directives['script-src']?.includes(source), `${path} script-src must allow ${source}`);
    }
    for (const directive of ['img-src', 'connect-src']) {
      for (const source of GA_GTM_BEACON_SOURCES) {
        assert.ok(directives[directive]?.includes(source), `${path} ${directive} must allow ${source}`);
      }
    }
  }
});

test('HTML CSP keeps script-src strict (no unsafe-inline / unsafe-eval / wildcard)', () => {
  for (const { path, directives } of htmlCspRules) {
    const scriptSources = directives['script-src'] ?? [];
    assert.ok(scriptSources.includes("'self'"), `${path} script-src must include 'self'`);
    for (const forbidden of ["'unsafe-inline'", "'unsafe-eval'", '*', 'https:', 'http:']) {
      assert.equal(scriptSources.includes(forbidden), false, `${path} script-src must not include ${forbidden}`);
    }
    assert.equal(directives['default-src']?.join(' '), "'self'");
    assert.deepEqual(directives['frame-ancestors'], ["'none'"]);
  }
});

test('index.html inline executable scripts are covered by a CSP hash (none expected)', () => {
  const inlineHashes = collectInlineScriptHashes(indexHtmlSource);
  for (const { path, directives } of htmlCspRules) {
    for (const hash of inlineHashes) {
      assert.ok(directives['script-src']?.includes(hash), `${path} script-src must include ${hash} for an inline script in index.html`);
    }
  }
  assert.deepEqual(inlineHashes, [], 'prefer self-hosted files in public/ over inline <script> blocks');
});

test('self-hosted scripts referenced by index.html exist in public/', () => {
  const localScripts = [...indexHtmlSource.matchAll(/<script\b[^>]*\ssrc="(\/[^"/][^"]*\.js)"/g)].map((match) => match[1]);
  assert.ok(localScripts.includes('/pretendard-loader.js'));
  for (const scriptPath of localScripts) {
    assert.ok(existsSync(new URL(`../public${scriptPath}`, import.meta.url)), `public${scriptPath} must exist`);
  }
});

test('collectInlineScriptHashes ignores external and JSON-LD scripts', () => {
  const html = [
    '<script src="/a.js"></script>',
    '<script type="application/ld+json">{"a":1}</script>',
    '<script>alert(1)</script>',
  ].join('');
  const expected = `'sha256-${createHash('sha256').update('alert(1)', 'utf8').digest('base64')}'`;
  assert.deepEqual(collectInlineScriptHashes(html), [expected]);
});
