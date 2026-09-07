import assert from 'node:assert/strict';

import { loadPlaywright } from './reflow-320-audit.mjs';
import { launchVisualQaBrowser, VISUAL_QA_PROBE } from './visual-qa-audit.mjs';

const { chromium } = await loadPlaywright();
let browser;
try {
  browser = await launchVisualQaBrowser(chromium);
  const page = await browser.newPage({ viewport: { width: 320, height: 600 } });
  await page.setContent(`
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 1200px; }
      #wide { width: 400px; height: 1px; }
      #clip { display: block; width: 48px; height: 32px; overflow: hidden; white-space: nowrap; }
      #overlap-a, #overlap-b { position: absolute; top: 80px; width: 48px; height: 48px; }
      #overlap-a { left: 16px; }
      #overlap-b { left: 32px; }
      #tiny { position: absolute; top: 150px; left: 16px; width: 20px; height: 20px; padding: 0; }
      #crowd-a, #crowd-b { position: absolute; top: 240px; width: 40px; height: 40px; }
      #crowd-a { left: 24px; }
      #crowd-b { left: 64px; }
      #sticky { position: sticky; top: 0; width: 100%; height: 200px; background: white; }
      #remember-label { position: absolute; top: 300px; left: 16px; display: flex; align-items: center; width: 140px; min-height: 44px; }
    </style>
    <div id="wide"></div>
    <button id="clip">잘리는 긴 버튼 레이블</button>
    <button id="overlap-a">A</button>
    <button id="overlap-b">B</button>
    <button id="tiny" aria-label="작은 버튼"></button>
    <div><button id="crowd-a">이전</button><button id="crowd-b">다음</button></div>
    <div id="sticky">큰 고정 안내</div>
    <label id="remember-label"><input id="remember" type="checkbox"> 이메일 저장</label>
  `);

  const measurement = await page.evaluate(VISUAL_QA_PROBE);
  assert.ok(measurement.pageOverflow?.overflowPx >= 80);
  assert.equal(measurement.pageOverflow?.selector, '#wide');
  assert.ok(measurement.clipped.some((entry) => entry.selector === '#clip'));
  assert.ok(measurement.overlaps.some((entry) => (
    new Set([entry.selector, entry.relatedSelector]).has('#overlap-a')
    && new Set([entry.selector, entry.relatedSelector]).has('#overlap-b')
  )));
  assert.ok(measurement.smallTargets.some((entry) => entry.selector === '#tiny'));
  assert.ok(measurement.crowdedControls.some((entry) => (
    new Set([entry.selector, entry.relatedSelector]).has('#crowd-a')
    && new Set([entry.selector, entry.relatedSelector]).has('#crowd-b')
  )));
  assert.ok(measurement.fixedObstructions.some((entry) => entry.selector === '#sticky'));
  assert.equal(measurement.smallTargets.some((entry) => entry.selector === '#remember'), false);

  await page.setContent(`
    <style>
      body { margin: 0; }
      #background { position: absolute; left: 16px; top: 40px; width: 400px; height: 44px; }
      #overlay { position: fixed; inset: 0; }
      #surface { width: 100%; height: 100%; background: white; }
      #surface-action { position: absolute; left: 16px; top: 40px; width: 120px; height: 44px; }
    </style>
    <button id="background">가려진 배경 버튼</button>
    <div id="overlay"><section id="surface" role="dialog" aria-modal="true"><button id="surface-action">모달 버튼</button></section></div>
  `);
  const modalMeasurement = await page.evaluate(VISUAL_QA_PROBE);
  assert.equal(modalMeasurement.diagnostics.interactiveCandidates, 1);
  assert.equal(modalMeasurement.pageOverflow, null);
  assert.equal(modalMeasurement.overlaps.length, 0);
  assert.equal(modalMeasurement.fixedObstructions.length, 0);

  await page.setContent(`
    <style>
      body { margin: 0; }
      #scroll-surface { width: 320px; height: 300px; overflow-y: auto; }
      #fold-spacer { height: 700px; }
      #below-fold-wide { width: 400px; height: 44px; }
    </style>
    <section id="scroll-surface" role="dialog" aria-modal="true">
      <div id="fold-spacer"></div>
      <button id="below-fold-wide">스크롤 아래의 넓은 버튼</button>
    </section>
  `);
  const belowFoldModalMeasurement = await page.evaluate(VISUAL_QA_PROBE);
  assert.equal(belowFoldModalMeasurement.pageOverflow?.overflowPx, 80);
  assert.equal(belowFoldModalMeasurement.pageOverflow?.selector, '#below-fold-wide');

  await page.setContent(`
    <style>
      body { margin: 0; }
      #clipped-surface { width: 320px; height: 300px; }
      #clip-wrapper { width: 320px; overflow-x: hidden; }
      #clipped-decoration { width: 400px; height: 44px; }
    </style>
    <section id="clipped-surface" role="dialog" aria-modal="true">
      <div id="clip-wrapper"><div id="clipped-decoration"></div></div>
    </section>
  `);
  const clippedModalMeasurement = await page.evaluate(VISUAL_QA_PROBE);
  assert.equal(clippedModalMeasurement.pageOverflow, null);

  await page.setContent(`
    <style>
      body { margin: 0; }
      #allowed-surface { width: 320px; height: 300px; overflow-x: auto; }
      #allowed-wide { width: 400px; height: 44px; }
    </style>
    <section id="allowed-surface" role="dialog" aria-modal="true" data-vqa-overflow="allowed">
      <div id="allowed-wide"></div>
    </section>
  `);
  const allowedModalMeasurement = await page.evaluate(VISUAL_QA_PROBE);
  assert.equal(allowedModalMeasurement.pageOverflow, null);

  await page.setContent(`
    <style>
      body { margin: 0; }
      #descendant-allowed-surface { width: 320px; height: 300px; }
      #descendant-allowed-wide { width: 400px; height: 44px; }
    </style>
    <section id="descendant-allowed-surface" role="dialog" aria-modal="true">
      <div id="descendant-allowed-wide" data-vqa-overflow="allowed"></div>
    </section>
  `);
  const descendantAllowedMeasurement = await page.evaluate(VISUAL_QA_PROBE);
  assert.equal(descendantAllowedMeasurement.pageOverflow, null);

  await page.setContent(`
    <style>
      body { margin: 0; }
      #direct-text-surface { width: 320px; height: 300px; white-space: nowrap; }
    </style>
    <section id="direct-text-surface" role="dialog" aria-modal="true">
      활성 모달에 직접 포함된 매우 긴 텍스트가 줄바꿈 없이 화면 너비를 넘어가는 경우도 탐지해야 합니다.
    </section>
  `);
  const directTextMeasurement = await page.evaluate(VISUAL_QA_PROBE);
  assert.ok(directTextMeasurement.pageOverflow?.overflowPx > 1);
  assert.equal(directTextMeasurement.pageOverflow?.selector, '#direct-text-surface');

  await page.setContent(`
    <style>
      body { margin: 0; }
      #pseudo-surface { width: 320px; height: 300px; }
      #pseudo-surface::after { content: ''; display: block; width: 400px; height: 1px; }
    </style>
    <section id="pseudo-surface" role="dialog" aria-modal="true"></section>
  `);
  const pseudoMeasurement = await page.evaluate(VISUAL_QA_PROBE);
  assert.equal(pseudoMeasurement.pageOverflow?.overflowPx, 80);
  assert.equal(pseudoMeasurement.pageOverflow?.selector, '#pseudo-surface');

  await page.setContent(`
    <style>
      body { margin: 0; }
      #ignored-surface { width: 320px; height: 300px; white-space: nowrap; }
    </style>
    <section id="ignored-surface" role="dialog" aria-modal="true" data-vqa-ignore>
      이 활성 모달은 Visual QA 전체 detector에서 명시적으로 제외되어야 합니다.
    </section>
  `);
  const ignoredSurfaceMeasurement = await page.evaluate(VISUAL_QA_PROBE);
  assert.equal(ignoredSurfaceMeasurement.pageOverflow, null);

  const onScreenControls = Array.from({ length: 300 }, (_, index) => {
    const left = 2 + (index % 20) * 16;
    const top = 2 + Math.floor(index / 20) * 16;
    return `<button style="position:absolute;left:${left}px;top:${top}px;width:14px;height:14px;padding:0">${index}</button>`;
  }).join('');
  const offScreenControls = Array.from({ length: 300 }, (_, index) => (
    `<button style="position:fixed;left:${-200 - index * 48}px;top:12px;width:44px;height:44px">외부 ${index}</button>`
  )).join('');
  await page.setContent(`<main>${onScreenControls}${offScreenControls}</main>`);

  const largeDomMeasurement = await page.evaluate(VISUAL_QA_PROBE);
  assert.equal(largeDomMeasurement.diagnostics.interactiveCandidates, 600);
  assert.equal(largeDomMeasurement.diagnostics.interactiveCount, 300);
  assert.ok(largeDomMeasurement.diagnostics.overlapComparisons < 10000);
  assert.ok(largeDomMeasurement.diagnostics.crowdedComparisons < 10000);
  console.log('[visual-qa:test] probe DOM fixtures passed');
} finally {
  await browser?.close();
}
