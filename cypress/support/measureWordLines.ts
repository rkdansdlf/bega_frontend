export function measureWordLines(root: Element, word: string): number[] {
    if (!word) throw new Error('word must not be empty');
    const doc = root.ownerDocument, win = doc.defaultView;
    if (!win) throw new Error('document has no window');
    const walker = doc.createTreeWalker(root, 4); // NodeFilter.SHOW_TEXT
    const nodes: Text[] = [];
    while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (!node.data) continue;
        for (let parent = node.parentElement; parent && parent !== root; parent = parent.parentElement) {
            const style = win.getComputedStyle(parent);
            if (style.display === 'none' || style.visibility !== 'visible' || style.display !== 'inline') {
                throw new Error('unsupported hidden or non-inline descendant');
            }
        }
        nodes.push(node);
    }
    const text = nodes.map((node) => node.data).join('');
    let offset = 0;
    const offsets = nodes.map((node) => { const start = offset; offset += node.length; return start; });
    const result: number[] = [];
    for (let start = text.indexOf(word); start !== -1; start = text.indexOf(word, start + 1)) {
        const end = start + word.length;
        const rects: DOMRect[] = [];
        nodes.forEach((node, index) => {
            const from = Math.max(start, offsets[index]), to = Math.min(end, offsets[index] + node.length);
            if (from >= to) return;
            const range = doc.createRange();
            range.setStart(node, from - offsets[index]); range.setEnd(node, to - offsets[index]);
            rects.push(...Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0));
        });
        const lines: Array<{ top: number; bottom: number }> = [];
        for (const rect of rects.sort((a, b) => a.top - b.top)) {
            const line = lines.find((candidate) => Math.min(candidate.bottom, rect.bottom) > Math.max(candidate.top, rect.top));
            if (line) { line.top = Math.max(line.top, rect.top); line.bottom = Math.min(line.bottom, rect.bottom); }
            else lines.push({ top: rect.top, bottom: rect.bottom });
        }
        result.push(lines.length);
    }
    return result;
}
