import assert from 'node:assert/strict';
import test from 'node:test';
import { acquirePlainDialog } from './plainDialogLifecycle';

const fixture = (overflow = '') => {
  const target = new EventTarget();
  const doc = { body: { style: { overflow } }, defaultView: target } as unknown as Document;
  const key = (value = 'Escape') => {
    const event = new Event('keydown', { cancelable: true });
    Object.defineProperty(event, 'key', { value }); target.dispatchEvent(event); return event;
  };
  return { doc, key };
};

test('single dialog restores the exact initial overflow and removes its handler', () => {
  const { doc, key } = fixture('scroll'); let closes = 0;
  const release = acquirePlainDialog(doc, () => { closes++; });
  assert.equal(doc.body.style.overflow, 'hidden'); key('Enter'); assert.equal(closes, 0);
  key(); assert.equal(closes, 1); release(); release();
  assert.equal(doc.body.style.overflow, 'scroll'); key(); assert.equal(closes, 1);
});

test('one Escape closes only the top dialog even when its callback synchronously releases it', () => {
  const { doc, key } = fixture(); const closed: string[] = [];
  const parent = acquirePlainDialog(doc, () => { closed.push('parent'); parent(); });
  const child = acquirePlainDialog(doc, () => { closed.push('child'); child(); });
  key(); assert.deepEqual(closed, ['child']); assert.equal(doc.body.style.overflow, 'hidden');
  key(); assert.deepEqual(closed, ['child', 'parent']); assert.equal(doc.body.style.overflow, '');
});

test('out-of-order parent unmount keeps child lock then restores original style', () => {
  const { doc, key } = fixture('auto'); let childCloses = 0;
  const parent = acquirePlainDialog(doc, () => assert.fail('removed parent'));
  const child = acquirePlainDialog(doc, () => { childCloses++; });
  parent(); assert.equal(doc.body.style.overflow, 'hidden'); key(); assert.equal(childCloses, 1);
  child(); assert.equal(doc.body.style.overflow, 'auto');
});

test('three levels and repeated registration do not leak listeners or lock state', () => {
  const { doc, key } = fixture('hidden'); let closes = 0;
  for (let i = 0; i < 3; i++) {
    const a = acquirePlainDialog(doc, () => assert.fail('lower a'));
    const b = acquirePlainDialog(doc, () => assert.fail('lower b'));
    const c = acquirePlainDialog(doc, () => { closes++; });
    key(); b(); a(); assert.equal(doc.body.style.overflow, 'hidden'); c();
    key(); assert.equal(closes, i + 1); assert.equal(doc.body.style.overflow, 'hidden');
  }
});

test('independent documents have independent top dialogs and overflow restoration', () => {
  const a = fixture('auto'), b = fixture('scroll'); const closed: string[] = [];
  const releaseA = acquirePlainDialog(a.doc, () => { closed.push('a'); });
  const releaseB = acquirePlainDialog(b.doc, () => { closed.push('b'); });
  a.key(); assert.deepEqual(closed, ['a']); releaseA();
  assert.equal(a.doc.body.style.overflow, 'auto'); assert.equal(b.doc.body.style.overflow, 'hidden');
  b.key(); releaseB(); assert.deepEqual(closed, ['a', 'b']); assert.equal(b.doc.body.style.overflow, 'scroll');
});
