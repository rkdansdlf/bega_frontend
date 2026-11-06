import assert from 'node:assert/strict';
import test from 'node:test';
import { revealAdminUserControlFocus } from './adminUserFocusVisibility';

function subject() {
  const state = { covered: false, keyboard: true, chatbot: true };
  const scrolls: ScrollIntoViewOptions[] = [];
  let frame: FrameRequestCallback | undefined;
  const target = {
    isConnected: true,
    matches: (selector: string) => { assert.equal(selector, ':focus-visible'); return state.keyboard; },
    getBoundingClientRect: () => ({ left: 100, top: 700, width: 44, height: 44 }),
    scrollIntoView: (options: ScrollIntoViewOptions) => scrolls.push(options),
  };
  const document = {
    activeElement: target as typeof target | null,
    elementFromPoint: (x: number, y: number) => {
      assert.equal(x, 122); assert.equal(y, 722);
      return state.covered ? { closest: (selector: string) => {
        assert.equal(selector, '[data-testid="chatbot-request-launcher"]');
        return state.chatbot ? {} : null;
      } } : null;
    },
    defaultView: { requestAnimationFrame: (callback: FrameRequestCallback) => { frame = callback; return 1; } },
  };
  Object.assign(target, { ownerDocument: document });
  return { target: target as unknown as HTMLElement, state, scrolls, document,
    frame: () => { assert.ok(frame); frame(0); } };
}

test('reveals keyboard focus covered by the chatbot without moving a now-visible target twice', () => {
  const s = subject(); s.state.covered = true;
  revealAdminUserControlFocus(s.target);
  assert.deepEqual(s.scrolls, [{ block: 'center', inline: 'nearest', behavior: 'instant' }]);
  s.state.covered = false; s.frame();
  assert.equal(s.scrolls.length, 1);
});

test('rechecks after native focus scrolling on the next frame', () => {
  const s = subject(); revealAdminUserControlFocus(s.target);
  assert.equal(s.scrolls.length, 0);
  s.state.covered = true; s.frame();
  assert.equal(s.scrolls.length, 1);
});

test('pointer focus never moves a covered control', () => {
  const s = subject(); s.state.covered = true; s.state.keyboard = false;
  revealAdminUserControlFocus(s.target); s.frame();
  assert.equal(s.scrolls.length, 0);
});

test('unmounted controls and focus that moved elsewhere are ignored', () => {
  for (const detached of [false, true]) {
    const s = subject(); revealAdminUserControlFocus(s.target);
    s.state.covered = true;
    if (detached) Object.assign(s.target, { isConnected: false });
    else s.document.activeElement = null;
    s.frame(); assert.equal(s.scrolls.length, 0);
  }
});

test('visible controls and unrelated overlays retain ordinary scrolling', () => {
  for (const covered of [false, true]) {
    const s = subject(); s.state.covered = covered; s.state.chatbot = false;
    revealAdminUserControlFocus(s.target); s.frame();
    assert.equal(s.scrolls.length, 0);
  }
});
