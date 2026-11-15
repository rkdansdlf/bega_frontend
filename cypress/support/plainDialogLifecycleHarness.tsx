import { createElement, Fragment, StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import PlainDialog from '../../src/components/ui/plain-dialog';

export interface PlainDialogLifecycleHarness {
    open: (parent: boolean, child: boolean) => void;
    rerender: () => void;
    calls: () => Array<{ id: string; version: number }>;
    effects: () => { setup: number; cleanup: number };
    unmount: () => void;
}

function EffectProbe({ counts }: { counts: { setup: number; cleanup: number } }) {
    useEffect(() => { counts.setup++; return () => { counts.cleanup++; }; }, [counts]);
    return null;
}

export function mountPlainDialogLifecycleHarness(container: Element, strict: boolean, nested: boolean): PlainDialogLifecycleHarness {
    const root = createRoot(container);
    let parent = false, child = false, version = 0;
    const calls: Array<{ id: string; version: number }> = [];
    const effects = { setup: 0, cleanup: 0 };
    const render = () => {
        const currentVersion = version;
        const close = (id: 'parent' | 'child') => {
            calls.push({ id, version: currentVersion });
            if (id === 'parent') parent = false; else child = false;
            render();
        };
        const childDialog = child ? createElement(PlainDialog, {
            open: true, onClose: () => close('child'), title: '합성 하위 창', contentTestId: 'lifecycle-dialog-child',
            contentStyle: { width: 280, height: 220, backgroundColor: '#e2e8f0' },
            children: createElement('p', null, '합성 하위 창 본문'),
        }) : null;
        const parentDialog = parent ? createElement(PlainDialog, {
            open: true, onClose: () => close('parent'), title: '합성 상위 창', contentTestId: 'lifecycle-dialog-parent',
            contentStyle: { width: 280, height: 220, backgroundColor: '#cbd5e1' },
            children: createElement(Fragment, null, createElement('p', null, '합성 상위 창 본문'), nested ? childDialog : null),
        }) : null;
        root.render(createElement(strict ? StrictMode : Fragment, null,
            createElement(EffectProbe, { counts: effects }),
            createElement('button', { 'data-testid': 'lifecycle-opener', type: 'button' }, '합성 열기 기준점'),
            parentDialog, nested ? null : childDialog,
        ));
    };
    render();
    return {
        open(p, c) { parent = p; child = c; version++; render(); },
        rerender() { version++; render(); },
        calls: () => calls.map((call) => ({ ...call })),
        effects: () => ({ ...effects }),
        unmount: () => root.unmount(),
    };
}
