export type HarnessInteractionAction =
  | 'click'
  | 'hover'
  | 'focus-visible'
  | 'pressed'
  | 'fill'
  | 'press-key';

export type HarnessInteractionStep = {
  action: 'click' | 'fill' | 'press-key';
  selector: string;
  value?: string;
  key?: string;
  waitForSelector?: string;
  waitForHiddenSelector?: string;
};

export type HarnessInteractionPlan = {
  action: HarnessInteractionAction;
  selector: string;
  value?: string;
  key?: string;
  setup?: HarnessInteractionStep[];
  waitForSelector?: string;
  waitForHiddenSelector?: string;
};

type InteractionBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HarnessInteractionPage = {
  locator: (selector: string) => {
    first: () => {
      waitFor: (options: { state: 'visible' | 'hidden'; timeout: number }) => Promise<void>;
      hover: () => Promise<void>;
      click: () => Promise<void>;
      fill: (value: string) => Promise<void>;
      inputValue: () => Promise<string>;
      scrollIntoViewIfNeeded: () => Promise<void>;
      boundingBox: () => Promise<InteractionBox | null>;
    };
  };
  keyboard: {
    press: (key: string) => Promise<void>;
  };
  mouse: {
    move: (x: number, y: number) => Promise<void>;
    down: () => Promise<void>;
    up: () => Promise<void>;
  };
  evaluate: (
    fn: (arg: {
      selector: string;
      pseudo?: string;
      mode?: string;
      scrollBlock?: ScrollLogicalPosition;
    }) => unknown,
    arg: {
      selector: string;
      pseudo?: string;
      mode?: string;
      scrollBlock?: ScrollLogicalPosition;
    },
  ) => Promise<unknown>;
};

const noCleanup = async () => {};

const waitForResult = async (
  page: HarnessInteractionPage,
  waitForSelector?: string,
  waitForHiddenSelector?: string,
) => {
  if (waitForSelector) {
    await page.locator(waitForSelector).first().waitFor({ state: 'visible', timeout: 5_000 });
  }
  if (waitForHiddenSelector) {
    await page.locator(waitForHiddenSelector).first().waitFor({ state: 'hidden', timeout: 5_000 });
  }
};

const executeSetupStep = async (
  page: HarnessInteractionPage,
  step: HarnessInteractionStep,
) => {
  const target = page.locator(step.selector).first();
  await target.waitFor({ state: 'visible', timeout: 5_000 });
  if (step.action === 'click') {
    await target.click();
  } else if (step.action === 'fill') {
    if (typeof step.value !== 'string') throw new Error(`interaction setup fill requires value: ${step.selector}`);
    await target.fill(step.value);
    if (await target.inputValue() !== step.value) {
      throw new Error(`interaction setup fill did not preserve value on ${step.selector}`);
    }
  } else {
    if (!step.key) throw new Error(`interaction setup press-key requires key: ${step.selector}`);
    await focusVisibleTarget(page, { action: 'press-key', selector: step.selector, key: step.key });
    await page.keyboard.press(step.key);
  }
  await waitForResult(page, step.waitForSelector, step.waitForHiddenSelector);
};

const waitForInteractionFrames = async (page: HarnessInteractionPage, selector: string) => {
  await page.evaluate(({ mode }) => {
    if (mode !== 'frames') return false;
    return new Promise<void>((resolveFrame) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
    });
  }, { selector, mode: 'frames' });
};

const matchesPseudoState = async (
  page: HarnessInteractionPage,
  selector: string,
  pseudo: ':hover' | ':focus-visible' | ':active',
) => Boolean(await page.evaluate(({ selector: targetSelector, pseudo: targetPseudo }) => {
  const target = document.querySelector(targetSelector);
  return target instanceof Element && target.matches(targetPseudo ?? '');
}, { selector, pseudo }));

const requirePseudoState = async (
  page: HarnessInteractionPage,
  plan: HarnessInteractionPlan,
  pseudo: ':hover' | ':focus-visible' | ':active',
) => {
  if (!await matchesPseudoState(page, plan.selector, pseudo)) {
    throw new Error(`interaction ${plan.action} did not establish ${pseudo} on ${plan.selector}`);
  }
};

const focusVisibleTarget = async (page: HarnessInteractionPage, plan: HarnessInteractionPlan) => {
  await page.evaluate(({ selector, mode, scrollBlock }) => {
    if (mode !== 'reset-focus') return false;
    const target = document.querySelector(selector);
    if (!(target instanceof Element)) {
      throw new Error(`interaction target not found: ${selector}`);
    }
    target.scrollIntoView({ block: scrollBlock ?? 'nearest', inline: 'nearest' });
    const activeElement = document.activeElement;
    if (activeElement && 'blur' in activeElement && typeof activeElement.blur === 'function') {
      activeElement.blur();
    }
    return true;
  }, { selector: plan.selector, mode: 'reset-focus', scrollBlock: 'nearest' });

  for (let attempt = 0; attempt < 256; attempt += 1) {
    await page.keyboard.press('Tab');
    if (await matchesPseudoState(page, plan.selector, ':focus-visible')) {
      await page.mouse.move(-1, -1);
      return;
    }
  }
  throw new Error(`interaction focus-visible could not reach ${plan.selector} by keyboard`);
};

export const executeHarnessInteractionPlan = async (
  page: HarnessInteractionPage,
  plan: HarnessInteractionPlan,
): Promise<() => Promise<void>> => {
  for (const step of plan.setup ?? []) {
    await executeSetupStep(page, step);
  }
  const target = page.locator(plan.selector).first();
  await target.waitFor({ state: 'visible', timeout: 5_000 });
  let cleanup = noCleanup;

  try {
    if (plan.action === 'hover') {
      await target.hover();
    } else if (plan.action === 'click') {
      await target.click();
    } else if (plan.action === 'fill') {
      if (typeof plan.value !== 'string') throw new Error(`interaction fill requires value: ${plan.selector}`);
      await target.fill(plan.value);
      if (await target.inputValue() !== plan.value) {
        throw new Error(`interaction fill did not preserve value on ${plan.selector}`);
      }
    } else if (plan.action === 'press-key') {
      if (!plan.key) throw new Error(`interaction press-key requires key: ${plan.selector}`);
      await focusVisibleTarget(page, plan);
      await page.keyboard.press(plan.key);
    } else if (plan.action === 'focus-visible') {
      await focusVisibleTarget(page, plan);
    } else if (plan.action === 'pressed') {
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      if (!box || box.width <= 0 || box.height <= 0) {
        throw new Error(`interaction pressed target is not measurable: ${plan.selector}`);
      }
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      let held = true;
      cleanup = async () => {
        if (!held) return;
        held = false;
        await page.mouse.move(-1, -1);
        await page.mouse.up();
      };
    }

    await waitForResult(page, plan.waitForSelector, plan.waitForHiddenSelector);
    await waitForInteractionFrames(page, plan.selector);
    if (plan.action === 'click') {
      await page.mouse.move(-1, -1);
      await waitForInteractionFrames(page, plan.selector);
    }
    if (plan.action === 'hover' || plan.action === 'focus-visible' || plan.action === 'pressed') {
      const pseudo = plan.action === 'hover'
        ? ':hover'
        : plan.action === 'focus-visible'
          ? ':focus-visible'
          : ':active';
      await requirePseudoState(page, plan, pseudo);
    }
    return cleanup;
  } catch (error) {
    await cleanup();
    throw error;
  }
};

export const revalidateHarnessInteractionPlan = async (
  page: HarnessInteractionPage,
  plan: HarnessInteractionPlan,
  previousCleanup: () => Promise<void>,
): Promise<() => Promise<void>> => {
  let cleanup = previousCleanup;
  if (plan.action === 'pressed') {
    await previousCleanup();
    cleanup = noCleanup;
  }

  const target = page.locator(plan.selector).first();
  await target.waitFor({ state: 'visible', timeout: 5_000 });

  try {
    if (plan.action === 'hover') {
      await target.hover();
    } else if (plan.action === 'focus-visible') {
      await focusVisibleTarget(page, plan);
    } else if (plan.action === 'pressed') {
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      if (!box || box.width <= 0 || box.height <= 0) {
        throw new Error(`interaction pressed target is not measurable after viewport expansion: ${plan.selector}`);
      }
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      let held = true;
      cleanup = async () => {
        if (!held) return;
        held = false;
        await page.mouse.move(-1, -1);
        await page.mouse.up();
      };
    } else if (plan.action === 'fill') {
      if (typeof plan.value !== 'string' || await target.inputValue() !== plan.value) {
        throw new Error(`interaction fill did not preserve value after viewport expansion on ${plan.selector}`);
      }
    }

    for (const step of plan.setup ?? []) {
      if (step.action === 'fill') {
        const setupTarget = page.locator(step.selector).first();
        if (typeof step.value !== 'string' || await setupTarget.inputValue() !== step.value) {
          throw new Error(`interaction setup fill did not preserve value after viewport expansion on ${step.selector}`);
        }
      }
      await waitForResult(page, step.waitForSelector, step.waitForHiddenSelector);
    }
    await waitForResult(page, plan.waitForSelector, plan.waitForHiddenSelector);
    await waitForInteractionFrames(page, plan.selector);

    if (plan.action === 'hover' || plan.action === 'focus-visible' || plan.action === 'pressed') {
      const pseudo = plan.action === 'hover'
        ? ':hover'
        : plan.action === 'focus-visible'
          ? ':focus-visible'
          : ':active';
      await requirePseudoState(page, plan, pseudo);
    }
    return cleanup;
  } catch (error) {
    await cleanup();
    throw error;
  }
};
