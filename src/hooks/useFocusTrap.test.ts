import assert from 'node:assert/strict';
import test from 'node:test';
import { selectInitialFocus } from './useFocusTrap';

test('initial focus honors a valid preferred control while preserving default and container behavior', () => {
    const container = {} as HTMLElement;
    const header = {} as HTMLElement;
    const close = {} as HTMLElement;
    const outsideOrDisabled = {} as HTMLElement;
    const focusable = [header, close];

    assert.equal(selectInitialFocus(container, focusable, 'first'), header);
    assert.equal(selectInitialFocus(container, focusable, 'first', close), close);
    assert.equal(selectInitialFocus(container, focusable, 'first', null), header);
    assert.equal(selectInitialFocus(container, focusable, 'first', outsideOrDisabled), header);
    assert.equal(selectInitialFocus(container, focusable, 'container', close), container);
    assert.equal(selectInitialFocus(container, [], 'first', outsideOrDisabled), container);
});
