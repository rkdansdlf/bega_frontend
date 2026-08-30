import assert from 'node:assert/strict';
import test from 'node:test';

const loadSubject = async () => {
  try {
    return await import('./visual-qa-harness-interactions');
  } catch {
    return null;
  }
};

const createPage = (focusAt = 2) => {
  const events: string[] = [];
  let focusAttempts = 0;
  let pseudoState: string | null = null;
  let inputValue = '';
  const target = {
    first: () => target,
    waitFor: async (options: { state: 'visible' | 'hidden' }) => { events.push(options.state); },
    hover: async () => {
      events.push('hover');
      pseudoState = ':hover';
    },
    click: async () => { events.push('click'); },
    fill: async (value: string) => {
      events.push(`fill:${value}`);
      inputValue = value;
    },
    selectOption: async (value: string) => {
      events.push(`select-option:${value}`);
      inputValue = value;
      return [value];
    },
    inputValue: async () => inputValue,
    scrollIntoViewIfNeeded: async () => { events.push('scroll-into-view'); },
    boundingBox: async () => ({ x: 10, y: 20, width: 40, height: 44 }),
  };
  return {
    clearPseudoState: () => { pseudoState = null; },
    events,
    page: {
      locator: () => target,
      keyboard: {
        press: async (key: string) => {
          events.push(`key:${key}`);
          focusAttempts += 1;
          if (focusAttempts === focusAt) pseudoState = ':focus-visible';
        },
      },
      mouse: {
        move: async (x: number, y: number) => { events.push(`move:${x},${y}`); },
        down: async () => {
          events.push('down');
          pseudoState = ':active';
        },
        up: async () => {
          events.push('up');
          pseudoState = null;
        },
      },
      evaluate: async (
        _fn: unknown,
        arg?: { pseudo?: string; mode?: string; scrollBlock?: ScrollLogicalPosition },
      ) => {
        if (arg?.mode === 'reset-focus') {
          events.push(`reset-focus:${arg.scrollBlock ?? '<missing>'}`);
          return true;
        }
        if (arg?.mode === 'frames') {
          events.push('frames');
          return true;
        }
        return arg?.pseudo === pseudoState;
      },
    },
  };
};

test('hover interaction verifies the real hover pseudo-state', async () => {
  const subject = await loadSubject();
  assert.ok(subject, 'visual QA interaction executor must exist');
  const { page, events } = createPage();

  const cleanup = await subject.executeHarnessInteractionPlan(page, {
    action: 'hover',
    selector: 'button',
  });

  assert.deepEqual(events, ['visible', 'hover', 'frames']);
  await cleanup();
  assert.deepEqual(events, ['visible', 'hover', 'frames']);
});

test('ordered click setup runs before resolving and hovering a newly opened target', async () => {
  const subject = await loadSubject();
  assert.ok(subject, 'visual QA interaction executor must exist');
  const { page, events } = createPage();

  await subject.executeHarnessInteractionPlan(page, {
    action: 'hover',
    selector: '[data-testid="dialog-confirm"]',
    setup: [{
      action: 'click',
      selector: '[data-testid="open-dialog"]',
      waitForSelector: '[role="dialog"]',
    }],
  });

  assert.deepEqual(events, ['visible', 'click', 'visible', 'visible', 'hover', 'frames']);
});

test('click interaction waits for visible and hidden result selectors before capture', async () => {
  const subject = await loadSubject();
  assert.ok(subject, 'visual QA interaction executor must exist');
  const { page, events } = createPage();

  await subject.executeHarnessInteractionPlan(page, {
    action: 'click',
    selector: '[data-testid="confirm"]',
    waitForSelector: '[role="alert"]',
    waitForHiddenSelector: '[data-testid="loading"]',
  });

  assert.deepEqual(events, [
    'visible',
    'click',
    'visible',
    'hidden',
    'frames',
    'move:-1,-1',
    'frames',
  ]);
});

test('fill interaction writes and verifies the exact controlled input value', async () => {
  const subject = await loadSubject();
  assert.ok(subject, 'visual QA interaction executor must exist');
  const { page, events } = createPage();

  await subject.executeHarnessInteractionPlan(page, {
    action: 'fill',
    selector: 'textarea',
    value: '모바일 후기 입력',
  });

  assert.deepEqual(events, ['visible', 'fill:모바일 후기 입력', 'frames']);
});

test('press-key interaction reaches the target by keyboard before exercising roving state', async () => {
  const subject = await loadSubject();
  assert.ok(subject, 'visual QA interaction executor must exist');
  const { page, events } = createPage();

  await subject.executeHarnessInteractionPlan(page, {
    action: 'press-key',
    selector: '[data-testid="review-rating-1"]',
    key: 'ArrowRight',
    waitForSelector: '[data-testid="review-rating-2"][aria-checked="true"]',
  });

  assert.deepEqual(events, [
    'visible',
    'reset-focus:nearest',
    'key:Tab',
    'key:Tab',
    'move:-1,-1',
    'key:ArrowRight',
    'visible',
    'frames',
  ]);
});

test('focus-visible interaction uses keyboard traversal until the target owns focus', async () => {
  const subject = await loadSubject();
  assert.ok(subject, 'visual QA interaction executor must exist');
  const { page, events } = createPage();

  await subject.executeHarnessInteractionPlan(page, {
    action: 'focus-visible',
    selector: 'button',
  });

  assert.deepEqual(events, [
    'visible',
    'reset-focus:nearest',
    'key:Tab',
    'key:Tab',
    'move:-1,-1',
    'frames',
  ]);
});

test('focus-visible traversal reaches controls after a dense SVG seat-map tab sequence', async () => {
  const subject = await loadSubject();
  assert.ok(subject, 'visual QA interaction executor must exist');
  const { page, events } = createPage(80);

  await subject.executeHarnessInteractionPlan(page, {
    action: 'focus-visible',
    selector: '[data-testid="seatmap-control-after-svg"]',
  });

  assert.equal(events.filter((event) => event === 'key:Tab').length, 80);
});

test('pressed interaction holds the pointer through capture and releases during cleanup', async () => {
  const subject = await loadSubject();
  assert.ok(subject, 'visual QA interaction executor must exist');
  const { page, events } = createPage();

  const cleanup = await subject.executeHarnessInteractionPlan(page, {
    action: 'pressed',
    selector: 'button',
  });

  assert.deepEqual(events, ['visible', 'scroll-into-view', 'move:30,42', 'down', 'frames']);
  await cleanup();
  assert.deepEqual(events, [
    'visible',
    'scroll-into-view',
    'move:30,42',
    'down',
    'frames',
    'move:-1,-1',
    'up',
  ]);
});

test('post-expansion hover and focus evidence is re-established before capture', async () => {
  const subject = await loadSubject();
  assert.ok(subject, 'visual QA interaction executor must exist');
  assert.equal(typeof subject.revalidateHarnessInteractionPlan, 'function');
  const hover = createPage();
  const hoverCleanup = await subject.executeHarnessInteractionPlan(hover.page, {
    action: 'hover',
    selector: '[data-testid="edit"]',
  });
  hover.clearPseudoState();
  hover.events.length = 0;

  await subject.revalidateHarnessInteractionPlan(hover.page, {
    action: 'hover',
    selector: '[data-testid="edit"]',
  }, hoverCleanup);
  assert.deepEqual(hover.events, ['visible', 'hover', 'frames']);

  const focus = createPage(1);
  const focusCleanup = async () => {};
  await subject.revalidateHarnessInteractionPlan(focus.page, {
    action: 'focus-visible',
    selector: '[data-testid="team"]',
  }, focusCleanup);
  assert.deepEqual(focus.events, [
    'visible',
    'reset-focus:nearest',
    'key:Tab',
    'move:-1,-1',
    'frames',
  ]);
});

test('post-expansion pressed evidence releases the old hold and safely presses again', async () => {
  const subject = await loadSubject();
  assert.ok(subject, 'visual QA interaction executor must exist');
  assert.equal(typeof subject.revalidateHarnessInteractionPlan, 'function');
  const { page, events, clearPseudoState } = createPage();
  const previousCleanup = await subject.executeHarnessInteractionPlan(page, {
    action: 'pressed',
    selector: 'button',
  });
  clearPseudoState();
  events.length = 0;

  const cleanup = await subject.revalidateHarnessInteractionPlan(page, {
    action: 'pressed',
    selector: 'button',
  }, previousCleanup);
  assert.deepEqual(events, [
    'move:-1,-1',
    'up',
    'visible',
    'scroll-into-view',
    'move:30,42',
    'down',
    'frames',
  ]);
  await cleanup();
  assert.deepEqual(events.slice(-2), ['move:-1,-1', 'up']);
});

test('post-expansion fill and press-key results are revalidated without repeating mutations', async () => {
  const subject = await loadSubject();
  assert.ok(subject, 'visual QA interaction executor must exist');
  assert.equal(typeof subject.revalidateHarnessInteractionPlan, 'function');
  const fill = createPage();
  await subject.executeHarnessInteractionPlan(fill.page, {
    action: 'fill',
    selector: 'textarea',
    value: '보존된 값',
  });
  fill.events.length = 0;
  await subject.revalidateHarnessInteractionPlan(fill.page, {
    action: 'fill',
    selector: 'textarea',
    value: '보존된 값',
  }, async () => {});
  assert.deepEqual(fill.events, ['visible', 'frames']);

  const change = createPage(1);
  change.events.length = 0;
  await subject.revalidateHarnessInteractionPlan(change.page, {
    action: 'press-key',
    selector: 'select',
    key: 'End',
    waitForSelector: 'option[value="LG"]:checked',
  }, async () => {});
  assert.deepEqual(change.events, ['visible', 'frames']);
  assert.equal(change.events.includes('key:End'), false);
});

test('post-expansion click and Escape verify only final state without replaying hidden mutations', async () => {
  const subject = await loadSubject();
  assert.ok(subject, 'visual QA interaction executor must exist');
  const events: string[] = [];
  const page = {
    locator: (selector: string) => ({
      first: () => ({
        waitFor: async ({ state }: { state: 'visible' | 'hidden' }) => {
          events.push(`${selector}:${state}`);
        },
        hover: async () => {},
        click: async () => { events.push(`${selector}:click`); },
        fill: async () => {},
        selectOption: async () => [],
        inputValue: async () => '',
        scrollIntoViewIfNeeded: async () => {},
        boundingBox: async () => ({ x: 0, y: 0, width: 44, height: 44 }),
      }),
    }),
    keyboard: { press: async (key: string) => { events.push(`key:${key}`); } },
    mouse: {
      move: async () => {},
      down: async () => {},
      up: async () => {},
    },
    evaluate: async (_fn: unknown, arg?: { mode?: string }) => {
      if (arg?.mode === 'frames') events.push('frames');
      return true;
    },
  };

  await subject.revalidateHarnessInteractionPlan(page, {
    action: 'click',
    selector: '[data-testid="mate-sort-option-popular"]',
    setup: [{
      action: 'click',
      selector: '[data-testid="mate-sort-trigger"]',
      waitForSelector: '[role="menu"]',
    }],
    waitForSelector: '[data-vqa-callback-count="1"]',
    waitForHiddenSelector: '[role="menu"]',
  }, async () => {});
  assert.deepEqual(events, [
    '[data-vqa-callback-count="1"]:visible',
    '[role="menu"]:hidden',
    'frames',
  ]);

  events.length = 0;
  await subject.revalidateHarnessInteractionPlan(page, {
    action: 'press-key',
    selector: '[data-testid="mate-sort-trigger"]',
    key: 'Escape',
    setup: [{
      action: 'click',
      selector: '[data-testid="mate-sort-trigger"]',
      waitForSelector: '[role="menu"]',
    }],
    waitForHiddenSelector: '[role="menu"]',
  }, async () => {});
  assert.deepEqual(events, ['[role="menu"]:hidden', 'frames']);
  assert.equal(events.some((event) => event.endsWith(':click') || event.startsWith('key:')), false);
});

test('post-expansion click and press-key fail closed without a mandatory final verifier', async () => {
  const subject = await loadSubject();
  assert.ok(subject, 'visual QA interaction executor must exist');

  for (const action of ['click', 'press-key'] as const) {
    await assert.rejects(
      subject.revalidateHarnessInteractionPlan(createPage().page, {
        action,
        selector: 'button',
        ...(action === 'press-key' ? { key: 'Escape' } : {}),
      }, async () => {}),
      /requires waitForSelector or waitForHiddenSelector/,
    );
  }
});

test('select-option changes a real select once and only revalidates its exact result after expansion', async () => {
  const subject = await loadSubject();
  assert.ok(subject, 'visual QA interaction executor must exist');
  const selected = createPage();

  const cleanup = await subject.executeHarnessInteractionPlan(selected.page, {
    action: 'select-option',
    selector: '[data-testid="team"]',
    value: 'LG',
    waitForSelector: '[data-testid="team"]:has(option[value="LG"]:checked)',
  });
  assert.deepEqual(selected.events, [
    'visible',
    'select-option:LG',
    'visible',
    'frames',
  ]);

  selected.events.length = 0;
  await subject.revalidateHarnessInteractionPlan(selected.page, {
    action: 'select-option',
    selector: '[data-testid="team"]',
    value: 'LG',
    waitForSelector: '[data-testid="team"]:has(option[value="LG"]:checked)',
  }, cleanup);
  assert.deepEqual(selected.events, ['visible', 'visible', 'frames']);
  assert.equal(selected.events.includes('select-option:LG'), false);
});

test('select-option fails closed without both an exact value and selected-result verifier', async () => {
  const subject = await loadSubject();
  assert.ok(subject, 'visual QA interaction executor must exist');

  await assert.rejects(
    subject.executeHarnessInteractionPlan(createPage().page, {
      action: 'select-option',
      selector: 'select',
      value: 'LG',
    }),
    /requires value and waitForSelector/,
  );
  await assert.rejects(
    subject.executeHarnessInteractionPlan(createPage().page, {
      action: 'select-option',
      selector: 'select',
      waitForSelector: 'option[value="LG"]:checked',
    }),
    /requires value and waitForSelector/,
  );
});
