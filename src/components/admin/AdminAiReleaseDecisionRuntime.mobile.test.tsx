import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type {
  ReleaseDecisionArtifactRecord,
  ReleaseDecisionArtifactSummary,
  ReleaseDecisionDraftResponse,
  ReleaseDecisionEvalCase,
  ReleaseDecisionEvaluateResponse,
  ReleaseDecisionPreset,
} from '../../types/admin';
import AdminAiReleaseDecisionRuntime, {
  type AdminAiReleaseDecisionVisualQaState,
} from './AdminAiReleaseDecisionRuntime';

const SCENARIO = 'visual-qa-release';
const PRESSURE = `OPS-${'X'.repeat(260)}`;

const buildDraft = (
  text = '운영 문서 기반 릴리즈 결정',
  decision: 'GO' | 'NO_GO' | 'PENDING' = 'GO',
): ReleaseDecisionDraftResponse => ({
  result: {
    scenario: SCENARIO,
    model: 'mock-release-model',
    task_prompt: text,
    seed_paths: ['docs/qa/release.md'],
    generated_at_utc: '2026-08-28T00:01:00Z',
    response_id: 'MOCK-RESPONSE',
    raw_response_text: text,
    draft: {
      title: text,
      decision,
      summary: text,
      blockers: [text],
      risks: [text],
      next_actions: [text],
      evidence: [{ claim: text, source: text, excerpt: text }],
      confidence: 'high',
    },
    tool_trace: [{ tool_name: 'mock-read', arguments: {}, result_preview: text }],
  },
  markdown: `# ${text}\n\n${text}`,
});

const buildPreset = (text = '운영 문서 기반 릴리즈 결정'): ReleaseDecisionPreset => ({
  scenario: SCENARIO,
  task_prompt: text,
  seed_paths: [text],
  allowed_roots: [text],
});

const buildEvalCase = (text = '운영 문서 기반 릴리즈 결정'): ReleaseDecisionEvalCase => ({
  case_id: 'MOCK-CASE',
  scenario: SCENARIO,
  expected_decision: 'GO',
  required_keywords: [text],
  required_sources: [text],
});

const buildEvaluation = (text = '운영 문서 기반 릴리즈 결정'): ReleaseDecisionEvaluateResponse => ({
  case: buildEvalCase(text),
  evaluation: {
    case_id: 'MOCK-CASE',
    status: 'PASS',
    decision_ok: true,
    keyword_hits: { [text]: true },
    source_hits: { [text]: true },
    missing_keywords: [],
    missing_sources: [],
  },
});

const buildArtifact = (
  index: number,
  text = '운영 문서 기반 릴리즈 결정',
): ReleaseDecisionArtifactSummary => ({
  artifact_id: `MOCK-ARTIFACT-${index}`,
  scenario: SCENARIO,
  decision: index % 3 === 0 ? 'NO_GO' : index % 3 === 1 ? 'GO' : 'PENDING',
  eval_status: index % 2 === 0 ? 'FAIL' : 'PASS',
  saved_at_utc: '2026-08-28T00:02:00Z',
  markdown_filename: `${text}-${index}.md`,
  json_filename: `${text}-${index}.json`,
});

const buildLoadedArtifact = (
  draft: ReleaseDecisionDraftResponse,
  evaluation: ReleaseDecisionEvaluateResponse,
): ReleaseDecisionArtifactRecord => ({
  artifact_id: 'MOCK-ARTIFACT-1',
  saved_at_utc: '2026-08-28T00:02:00Z',
  scenario: SCENARIO,
  task_prompt: draft.result.task_prompt,
  seed_paths: draft.result.seed_paths,
  allowed_roots: ['docs/qa'],
  draft_response: draft.result,
  markdown: draft.markdown,
  evaluation,
});

const buildState = (
  overrides: Partial<AdminAiReleaseDecisionVisualQaState> = {},
): AdminAiReleaseDecisionVisualQaState => {
  const draft = buildDraft();
  const evaluation = buildEvaluation();
  return {
    releasePresets: [buildPreset()],
    releasePresetsLoading: false,
    releaseSelectedScenario: SCENARIO,
    releaseTaskPrompt: draft.result.task_prompt,
    releaseSeedPathsInput: draft.result.seed_paths.join('\n'),
    releaseAllowedRootsInput: 'docs/qa',
    releaseDraftResult: draft,
    releaseDraftLoading: false,
    releaseDraftError: null,
    releaseCopyState: 'done',
    releaseEvalCases: [evaluation.case],
    releaseEvalCasesLoading: false,
    releaseSelectedCaseId: evaluation.case.case_id,
    releaseEvaluationResult: evaluation,
    releaseEvaluationLoading: false,
    releaseEvaluationError: null,
    releaseArtifacts: [buildArtifact(1)],
    releaseArtifactsLoading: false,
    releaseArtifactsError: null,
    releaseLoadedArtifact: buildLoadedArtifact(draft, evaluation),
    releaseSaveLoading: false,
    releaseSaveMessage: 'MOCK 아티팩트가 저장되었습니다.',
    releaseSaveError: null,
    releaseArtifactAction: null,
    ...overrides,
  };
};

const renderRuntime = (state: AdminAiReleaseDecisionVisualQaState) => renderToStaticMarkup(
  createElement(AdminAiReleaseDecisionRuntime, {
    autoBriefPanel: createElement('section', { 'data-testid': 'mock-auto-brief-panel' }, 'Mock auto brief'),
    visualQaStateOverride: state,
  }),
);

test('release decision runtime renders a deterministic populated snapshot', () => {
  const html = renderRuntime(buildState());

  assert.match(html, /data-testid="admin-ai-release-decision-runtime"/);
  assert.match(html, /data-testid="mock-auto-brief-panel"/);
  assert.match(html, />visual-qa-release</);
  assert.match(html, />GO</);
  assert.match(html, />PASS</);
  assert.match(html, />복사됨</);
  assert.match(html, /MOCK 아티팩트가 저장되었습니다/);
  assert.match(html, /data-testid="admin-ai-artifact-MOCK-ARTIFACT-1"/);
  assert.match(html, /loaded: MOCK-ARTIFACT-1/);
});

test('release decision runtime contains pressure copy and maximum lists on mobile', () => {
  const draft = buildDraft(PRESSURE, 'NO_GO');
  draft.result.draft.blockers = Array.from({ length: 50 }, (_, index) => `${PRESSURE}-BLOCKER-${index}`);
  draft.result.draft.next_actions = Array.from({ length: 50 }, (_, index) => `${PRESSURE}-ACTION-${index}`);
  draft.result.draft.evidence = Array.from({ length: 50 }, (_, index) => ({
    claim: `${PRESSURE}-CLAIM-${index}`,
    source: `${PRESSURE}-SOURCE-${index}`,
    excerpt: `${PRESSURE}-EXCERPT-${index}`,
  }));
  const evaluation = buildEvaluation(PRESSURE);
  const artifacts = Array.from({ length: 50 }, (_, index) => buildArtifact(index + 1, PRESSURE));
  const html = renderRuntime(buildState({
    releasePresets: [buildPreset(PRESSURE)],
    releaseTaskPrompt: PRESSURE,
    releaseSeedPathsInput: PRESSURE,
    releaseAllowedRootsInput: PRESSURE,
    releaseDraftResult: draft,
    releaseDraftError: PRESSURE,
    releaseCopyState: 'error',
    releaseEvalCases: [evaluation.case],
    releaseEvaluationResult: evaluation,
    releaseEvaluationError: PRESSURE,
    releaseArtifacts: artifacts,
    releaseArtifactsError: PRESSURE,
    releaseLoadedArtifact: buildLoadedArtifact(draft, evaluation),
    releaseSaveMessage: PRESSURE,
    releaseSaveError: PRESSURE,
  }));

  assert.match(html, /data-testid="admin-ai-release-decision-runtime"[^>]+min-w-0[^>]+overflow-hidden/);
  assert.match(html, /data-testid="admin-ai-task-prompt"/);
  assert.match(html, /data-testid="admin-ai-seed-paths"/);
  assert.match(html, /data-testid="admin-ai-allowed-roots"/);
  assert.match(html, /data-testid="admin-ai-refresh-presets"[^>]+aria-label="릴리즈 프리셋 새로고침"/);
  assert.match(html, /data-testid="admin-ai-refresh-eval-cases"[^>]+aria-label="평가 케이스 새로고침"/);
  assert.match(html, /data-testid="admin-ai-refresh-artifacts"[^>]+aria-label="저장된 아티팩트 새로고침"/);
  assert.match(html, /data-testid="admin-ai-draft-error"[^>]+role="alert"[^>]+overflow-wrap:anywhere/);
  assert.match(html, /data-testid="admin-ai-markdown-draft"[^>]+max-w-full[^>]+whitespace-pre-wrap[^>]+break-all/);
  assert.match(html, /data-testid="admin-ai-artifact-list"[^>]+max-height:60dvh[^>]+overflow-y-auto/);
  assert.match(html, /data-testid="admin-ai-preset-seed-list"[^>]+max-height:60dvh[^>]+overflow-y-auto/);
  assert.match(html, /data-testid="admin-ai-preset-root-list"[^>]+max-height:60dvh[^>]+overflow-y-auto/);
  assert.match(html, /data-testid="admin-ai-required-keyword-list"[^>]+max-height:60dvh[^>]+overflow-y-auto/);
  assert.match(html, /data-testid="admin-ai-missing-keyword-list"[^>]+max-height:60dvh[^>]+overflow-y-auto/);
  assert.match(html, /data-testid="admin-ai-missing-source-list"[^>]+max-height:60dvh[^>]+overflow-y-auto/);
  assert.match(html, /data-testid="admin-ai-blocker-list"[^>]+max-height:60dvh[^>]+overflow-y-auto/);
  assert.match(html, /data-testid="admin-ai-next-action-list"[^>]+max-height:60dvh[^>]+overflow-y-auto/);
  assert.match(html, /data-testid="admin-ai-evidence-list"[^>]+max-height:60dvh[^>]+overflow-y-auto/);
  assert.equal((html.match(/data-testid="admin-ai-artifact-MOCK-ARTIFACT-/g) ?? []).length, 50);
  assert.equal((html.match(/data-testid="admin-ai-evidence-item-/g) ?? []).length, 50);
  assert.match(html, new RegExp(PRESSURE));
});

test('release decision runtime exposes labelled controls and busy semantics', () => {
  const html = renderRuntime(buildState({
    releasePresetsLoading: true,
    releaseDraftLoading: true,
    releaseEvalCasesLoading: true,
    releaseEvaluationLoading: true,
    releaseArtifactsLoading: true,
    releaseSaveLoading: true,
    releaseArtifactAction: { artifactId: 'MOCK-ARTIFACT-1', mode: 'load' },
  }));

  assert.match(html, /data-testid="admin-ai-release-decision-runtime"[^>]+aria-busy="true"/);
  assert.match(html, /for="admin-ai-scenario-trigger"/);
  assert.match(html, /for="admin-ai-task-prompt"/);
  assert.match(html, /for="admin-ai-seed-paths"/);
  assert.match(html, /for="admin-ai-allowed-roots"/);
  assert.match(html, /for="admin-ai-eval-case-trigger"/);
  assert.match(html, /data-testid="admin-ai-copy-markdown"/);
  assert.match(html, /data-testid="admin-ai-save-artifact"/);
  assert.match(html, />초안 생성 중\.\.\.</);
  assert.match(html, />평가 실행 중\.\.\.</);
  assert.match(html, />저장 중\.\.\.</);
  assert.match(html, /저장된 아티팩트 목록을 불러오는 중입니다\./);
});
