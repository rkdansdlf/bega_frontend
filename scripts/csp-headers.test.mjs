import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
const expectedOrigins = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    'https://static.cloudflareinsights.com',
    'https://dapi.kakao.com',
    'https://t1.kakaocdn.net',
    'https://pagead2.googlesyndication.com',
    'https://www.googletagmanager.com',
  ],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
  'font-src': ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://*.ociobjectstorage.ap-chuncheon-1.oci.customer-oci.com',
    'https://*.googleusercontent.com',
    'https://*.kakaocdn.net',
    'https://*.pstatic.net',
    'https://*.naver.com',
    'https://*.naver.net',
  ],
  'connect-src': [
    "'self'",
    'https://api.begabaseball.xyz',
    'wss://api.begabaseball.xyz',
    'https://dapi.kakao.com',
    'https://kapi.kakao.com',
    'https://pagead2.googlesyndication.com',
    'https://www.google-analytics.com',
    'https://region1.google-analytics.com',
    'https://stats.g.doubleclick.net',
    'https://googleads.g.doubleclick.net',
  ],
  'frame-src': [
    "'self'",
    'https://googleads.g.doubleclick.net',
    'https://tpc.googlesyndication.com',
  ],
};

function cspPolicies() {
  return [...headers.matchAll(/Content-Security-Policy:\s*([^\r\n]+)/g)]
    .map((match) => match[1]);
}

function directive(policy, name) {
  const source = policy.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `));
  assert.ok(source, `missing ${name}`);
  return source.split(/\s+/).slice(1);
}

test('production HTML and root CSP allow only the active provider origins', () => {
  const policies = cspPolicies();
  assert.equal(policies.length, 2, 'HTML and root response policies must stay aligned');

  for (const policy of policies) {
    for (const [name, origins] of Object.entries(expectedOrigins)) {
      const sources = directive(policy, name);
      assert.deepEqual([...sources].sort(), [...origins].sort(), `${name} must stay minimal`);
      if (['script-src', 'connect-src', 'frame-src'].includes(name)) {
        assert.ok(!sources.some((source) => source.includes('*')), `${name} must not use wildcards`);
      }
      if (name !== 'style-src') assert.ok(!sources.includes("'unsafe-inline'"));
      assert.ok(!sources.includes("'unsafe-eval'"));
    }

    assert.ok(policy.includes("frame-ancestors 'none'"));
    assert.ok(policy.includes("base-uri 'self'"));
    assert.ok(policy.includes("form-action 'self'"));
  }
});
