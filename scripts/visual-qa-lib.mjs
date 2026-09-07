const ISSUE_META = {
  'horizontal-overflow': {
    severity: 'major',
    confidence: 0.99,
    description: '페이지가 뷰포트보다 넓어 가로 스크롤이 생깁니다.',
    likelyCause: '고정 너비, 최소 너비 또는 뷰포트 밖으로 이동한 자식 요소',
    suggestedFix: '고정 너비를 유동 너비로 바꾸고 min-width: 0 및 overflow 경계를 확인하세요.',
  },
  'content-clipping': {
    severity: 'major',
    confidence: 0.92,
    description: '콘텐츠가 컨테이너 안에서 잘립니다.',
    likelyCause: '고정 높이·너비와 overflow hidden/clip 조합',
    suggestedFix: '불필요한 고정 크기를 제거하고 줄바꿈, min-width: 0, 가변 높이를 적용하세요.',
  },
  'element-overlap': {
    severity: 'major',
    confidence: 0.9,
    description: '서로 독립된 조작 요소가 겹쳐 일부를 가립니다.',
    likelyCause: 'fixed/absolute 요소의 위치 또는 하단 safe-area 여백 부족',
    suggestedFix: '요소 위치와 z-index를 조정하고 dock·safe-area를 포함한 충분한 간격을 확보하세요.',
  },
  'small-touch-target': {
    severity: 'minor',
    confidence: 0.96,
    description: '모바일 조작 영역이 권장 터치 크기보다 작습니다.',
    likelyCause: '아이콘 크기를 버튼의 실제 클릭 영역으로 사용',
    suggestedFix: '시각 크기는 유지하되 padding 또는 최소 44px 클릭 영역을 제공하세요.',
  },
  'crowded-controls': {
    severity: 'minor',
    confidence: 0.84,
    description: '인접한 조작 요소 사이의 간격이 너무 좁습니다.',
    likelyCause: 'gap 또는 margin이 없거나 음수 여백을 사용',
    suggestedFix: '요소 사이에 최소 4px 이상의 명확한 간격을 확보하세요.',
  },
  'viewport-obstruction': {
    severity: 'major',
    confidence: 0.88,
    description: '고정 요소가 화면의 큰 영역을 차지해 콘텐츠를 가릴 가능성이 있습니다.',
    likelyCause: '모바일에서 데스크톱 크기의 fixed/sticky 요소를 그대로 사용',
    suggestedFix: '모바일 크기를 축소하고 가장자리 위치, safe-area, 닫기 동작을 확인하세요.',
  },
};

const round = (value, digits = 2) => Number(Number(value).toFixed(digits));

const selectorText = (entry) => entry.selector || 'document.documentElement';

const evidenceFor = (type, entry) => {
  switch (type) {
    case 'horizontal-overflow':
      return `페이지 너비가 뷰포트를 ${Math.round(entry.overflowPx)}px 초과합니다.`;
    case 'content-clipping':
      return `${entry.axis === 'y' ? '세로' : '가로'} 콘텐츠가 ${Math.round(entry.overflowPx)}px 잘립니다.${entry.text ? ` 텍스트: “${entry.text}”` : ''}`;
    case 'element-overlap':
      return `${entry.relatedSelector}와 ${Math.round(entry.overlapWidth)}×${Math.round(entry.overlapHeight)}px 겹칩니다.`;
    case 'small-touch-target':
      return `실제 조작 영역은 ${Math.round(entry.width)}×${Math.round(entry.height)}px입니다.${entry.text ? ` 레이블: “${entry.text}”` : ''}`;
    case 'crowded-controls':
      return `${entry.relatedSelector}와의 간격이 ${round(entry.gapPx)}px입니다.`;
    case 'viewport-obstruction':
      return `뷰포트 면적의 ${Math.round(entry.viewportAreaRatio * 100)}%를 차지합니다.`;
    default:
      return '';
  }
};

const severityFor = (type, entry) => {
  if (type === 'small-touch-target' && (entry.width < 24 || entry.height < 24)) return 'major';
  if (type === 'element-overlap' && entry.overlapRatio < 0.2) return 'minor';
  return ISSUE_META[type].severity;
};

const entriesFor = (measurement, type) => {
  if (type === 'horizontal-overflow') return measurement.pageOverflow ? [measurement.pageOverflow] : [];
  if (type === 'content-clipping') return measurement.clipped ?? [];
  if (type === 'element-overlap') return measurement.overlaps ?? [];
  if (type === 'small-touch-target') return measurement.smallTargets ?? [];
  if (type === 'crowded-controls') return measurement.crowdedControls ?? [];
  if (type === 'viewport-obstruction') return measurement.fixedObstructions ?? [];
  return [];
};

const stableRouteHash = (route) => {
  let hash = 2166136261;
  for (const character of route) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
};

const truncateUtf8 = (value, maxBytes) => {
  let bytes = 0;
  let truncated = '';
  for (const character of value) {
    const characterBytes = Buffer.byteLength(character, 'utf8');
    if (bytes + characterBytes > maxBytes) break;
    truncated += character;
    bytes += characterBytes;
  }
  return truncated;
};

export const scenarioSlug = (route, width) => {
  if (route === '/') return `root-${width}`;
  const rawRoutePart = route.replace(/^\/+|\/+$/g, '');
  const routePart = rawRoutePart.replace(/[^a-zA-Z0-9가-힣]+/g, '-').replace(/^-|-$/g, '') || 'root';
  const filesystemRoutePart = truncateUtf8(routePart, 200);
  const disambiguator = filesystemRoutePart === rawRoutePart && routePart !== 'root'
    ? ''
    : `-${stableRouteHash(route)}`;
  return `${filesystemRoutePart}${disambiguator}-${width}`;
};

export const parseViewportWidths = (value) => {
  const widths = String(value)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (!/^\d+$/.test(part)) throw new Error(`Viewport width must be a positive integer: ${part}`);
      return Number(part);
    });
  if (widths.length === 0) throw new Error('Provide at least one viewport width.');
  for (const width of widths) {
    if (width < 320 || width > 2560) throw new Error(`Viewport width must be between 320 and 2560: ${width}`);
  }
  return [...new Set(widths)].sort((a, b) => a - b);
};

export const buildIssues = ({ route, viewport, measurement = {} }) => {
  const issues = [];
  const seen = new Set();
  for (const type of Object.keys(ISSUE_META)) {
    const meta = ISSUE_META[type];
    for (const entry of entriesFor(measurement, type)) {
      const selector = selectorText(entry);
      const key = [type, selector, entry.relatedSelector ?? ''].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push({
        id: `vqa-${scenarioSlug(route, viewport.width)}-${issues.length + 1}`,
        severity: severityFor(type, entry),
        type,
        route,
        viewport: { ...viewport },
        selector,
        description: meta.description,
        evidence: evidenceFor(type, entry),
        likelyCause: meta.likelyCause,
        suggestedFix: meta.suggestedFix,
        confidence: meta.confidence,
      });
    }
  }
  return issues;
};

export const buildReport = ({ baseUrl, routes, viewports, states = [], scenarios, generatedAt = new Date().toISOString() }) => {
  const severity = {};
  const types = {};
  let issues = 0;
  let affectedScenarios = 0;
  let scanErrors = 0;
  for (const scenario of scenarios) {
    if (scenario.status === 'error') scanErrors += 1;
    if ((scenario.issues?.length ?? 0) > 0) affectedScenarios += 1;
    for (const issue of scenario.issues ?? []) {
      issues += 1;
      severity[issue.severity] = (severity[issue.severity] ?? 0) + 1;
      types[issue.type] = (types[issue.type] ?? 0) + 1;
    }
  }
  return {
    schemaVersion: 1,
    generatedAt,
    baseUrl,
    coverage: { routes, viewports, states },
    summary: {
      scenarios: scenarios.length,
      affectedScenarios,
      issues,
      severity,
      types,
      scanErrors,
    },
    scenarios,
  };
};

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const issueCard = (issue) => `
  <article class="issue issue-${escapeHtml(issue.severity)}">
    <div class="issue-heading"><strong>${escapeHtml(issue.severity)}</strong><code>${escapeHtml(issue.type)}</code><span>${Math.round((issue.confidence ?? 0) * 100)}%</span></div>
    <p>${escapeHtml(issue.description)}</p>
    <dl>
      <dt>Selector</dt><dd><code>${escapeHtml(issue.selector)}</code></dd>
      <dt>Evidence</dt><dd>${escapeHtml(issue.evidence)}</dd>
      <dt>Likely cause</dt><dd>${escapeHtml(issue.likelyCause)}</dd>
      <dt>Suggested fix</dt><dd>${escapeHtml(issue.suggestedFix)}</dd>
    </dl>
  </article>`;

export const renderHtmlReport = (report) => {
  const scenarioCards = report.scenarios.map((scenario) => {
    const stateLabel = scenario.state?.name ? ` · ${scenario.state.name}` : '';
    const title = `${scenario.route}${stateLabel} · ${scenario.viewport.width}×${scenario.viewport.height}`;
    const screenshot = scenario.screenshot
      ? `<a class="shot" href="${escapeHtml(scenario.screenshot)}"><img loading="lazy" src="${escapeHtml(scenario.screenshot)}" alt="${escapeHtml(title)} screenshot"></a>`
      : '';
    const error = scenario.error ? `<p class="error">${escapeHtml(scenario.error)}</p>` : '';
    const issues = (scenario.issues ?? []).map(issueCard).join('');
    return `<section class="scenario"><header><h2>${escapeHtml(title)}</h2><span class="status status-${escapeHtml(scenario.status)}">${escapeHtml(scenario.status)}</span></header>${error}${screenshot}${issues}</section>`;
  }).join('\n');

  const types = Object.entries(report.summary.types).map(([type, count]) => `<li><code>${escapeHtml(type)}</code><strong>${count}</strong></li>`).join('');
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BEGA Visual QA</title>
<style>
:root{color-scheme:light;font-family:Pretendard,Inter,system-ui,sans-serif;color:#172033;background:#f4f6fa}*{box-sizing:border-box}body{margin:0}.wrap{width:min(1180px,calc(100% - 32px));margin:32px auto 80px}h1,h2,p{margin-top:0}.meta{color:#59657a}.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:24px 0}.metric,.scenario{background:#fff;border:1px solid #dfe4ec;border-radius:16px;box-shadow:0 8px 24px rgba(28,39,60,.06)}.metric{padding:16px}.metric strong{display:block;font-size:28px}.types{display:flex;flex-wrap:wrap;gap:8px;padding:0;list-style:none}.types li{display:flex;gap:8px;padding:7px 10px;border-radius:999px;background:#e9edf5}.scenario{padding:18px;margin:18px 0}.scenario>header{display:flex;justify-content:space-between;gap:16px;align-items:center}.scenario h2{font-size:18px}.status{padding:5px 9px;border-radius:999px;background:#e9edf5}.status-issues,.status-error{background:#ffeadf;color:#9b3214}.shot{display:block;margin:14px 0}.shot img{display:block;max-width:min(100%,560px);max-height:620px;object-fit:contain;object-position:top;border:1px solid #dfe4ec;border-radius:12px}.issue{margin-top:12px;padding:14px;border-left:4px solid #e2a83b;background:#fffaf0;border-radius:10px}.issue-major{border-color:#d84a28;background:#fff5f2}.issue-heading{display:flex;gap:9px;align-items:center}.issue-heading span{margin-left:auto;color:#59657a}.issue dl{display:grid;grid-template-columns:110px 1fr;gap:7px 12px;margin:12px 0 0}.issue dt{font-weight:700}.issue dd{margin:0;min-width:0;overflow-wrap:anywhere}.error{padding:12px;color:#9b1c1c;background:#fff1f1;border-radius:10px}@media(max-width:600px){.wrap{width:min(100% - 20px,1180px);margin-top:18px}.scenario{padding:14px}.issue dl{grid-template-columns:1fr}.issue dd{margin-bottom:5px}}
</style></head><body><main class="wrap"><h1>BEGA Visual QA</h1><p class="meta">${escapeHtml(report.generatedAt)} · ${escapeHtml(report.baseUrl)} · ${report.coverage.routes.map(escapeHtml).join(', ')} · ${report.coverage.states?.length ?? 0} interaction states</p>
<section class="summary"><div class="metric"><span>Scenarios</span><strong>${report.summary.scenarios}</strong></div><div class="metric"><span>Affected</span><strong>${report.summary.affectedScenarios}</strong></div><div class="metric"><span>Issues</span><strong>${report.summary.issues}</strong></div><div class="metric"><span>Scan errors</span><strong>${report.summary.scanErrors}</strong></div></section>
<ul class="types">${types}</ul>${scenarioCards}</main></body></html>`;
};
