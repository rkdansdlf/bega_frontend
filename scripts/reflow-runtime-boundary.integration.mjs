import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runReflowAudit } from './reflow-320-audit.mjs';
process.env.REFLOW_SETTLE_MS = '350';
process.env.REFLOW_SETTLE_CAP_MS = '500';
const boundary = '<div id="boundary"><h1>문제가 발생했습니다</h1><div data-testid="error-feedback"><textarea id="error-feedback-runtime"></textarea></div></div>';
const tempDir = await mkdtemp(join(tmpdir(), 'reflow-boundary-'));
const server = createServer((req, res) => {
  if (req.url === '/fail') { req.socket.destroy(); return; }
  if (req.url === '/signup') { res.writeHead(302, {location:'/login'}); res.end(); return; }
  if (req.url === '/notfound') { res.writeHead(404, {'content-type':'text/html'}); res.end('<main>합성 404</main>'); return; }
  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});
  const body = req.url === '/error' ? boundary : req.url === '/transient' ? `${boundary}<script>setTimeout(()=>document.querySelector('#boundary').remove(),250)</script>` : req.url === '/hidden' ? `<div style="display:none">${boundary}</div><h1>정상 페이지</h1>` : '<div><h1>문제가 발생했습니다</h1><div data-testid="error-feedback"><textarea id="error-feedback-api"></textarea></div></div>';
  const handler = `document.querySelector('#root').innerHTML=${JSON.stringify(boundary)}`.replaceAll("'", '&#39;');
  const interactive = req.url === '/mypage/@testuser' ? '<h1>합성 프로필</h1><script>history.replaceState({},"","/profile/@testuser")</script>' : req.url === '/go-404' ? '<main>이동 중</main><script>location.assign("/notfound")</script>' : req.url === '/home' ? `<button aria-label="메뉴 열기" onclick='${handler}'>열기</button>` : req.url === '/login' ? `<form><input onfocus='${handler}'><button type="submit">로그인</button></form>` : body;
  const guard = req.url === '/login' ? `<script>if(localStorage.getItem('auth-bootstrap-hint')) document.querySelector('#root').innerHTML=${JSON.stringify(boundary)}</script>` : '';
  res.end(`<!doctype html><html><body><main><div id="root">${interactive}</div></main>${guard}</body></html>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  const port = server.address().port;
  const reportPath = join(tempDir, 'report.json');
  const code = await runReflowAudit({baseUrl:`http://127.0.0.1:${port}`, routes:['/error','/transient','/hidden','/normal','/fragment#first','/fragment#second','/fail','/after-fail','/go-404','/notfound#again','/mypage/@testuser','/home','/login#first','/login#second','/login','/signup'], reportPath});
  const report = JSON.parse(await readFile(reportPath,'utf8'));
  const status = Object.fromEntries(report.results.map(result => [result.route,result.status]));
  assert.deepEqual(status, {'/error':'untrusted','/transient':'untrusted','/hidden':'pass','/normal':'pass','/fragment#first':'pass','/fragment#second':'pass','/fail':'untrusted','/after-fail':'pass','/go-404':'untrusted','/notfound#again':'untrusted','/mypage/@testuser':'pass','/home':'pass','/login#first':'pass','/login#second':'pass','/login':'pass','/signup':'untrusted','/home (mobile nav drawer)':'untrusted','/login (login submit vs keyboard)':'untrusted','/signup (signup submit vs keyboard)':'untrusted'});
  assert.equal(code,1);
  console.log(JSON.stringify({code,status}));
} finally {server.close(); await rm(tempDir, {recursive:true, force:true});}
