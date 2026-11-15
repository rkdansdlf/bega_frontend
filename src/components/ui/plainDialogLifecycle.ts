interface DialogEntry {
  close: () => void;
}

interface DialogState {
  entries: DialogEntry[];
  previousOverflow: string;
  handleKeyDown: (event: KeyboardEvent) => void;
}

const documents = new WeakMap<Document, DialogState>();

export function acquirePlainDialog(doc: Document, close: () => void): () => void {
  let state = documents.get(doc);
  if (!state) {
    const entries: DialogEntry[] = [];
    state = {
      entries,
      previousOverflow: doc.body.style.overflow,
      handleKeyDown: (event) => {
        if (event.key === 'Escape') {
          // Read the top once: synchronous dismissal must not deliver the same key to its parent.
          entries[entries.length - 1]?.close();
        }
      },
    };
    documents.set(doc, state);
    doc.body.style.overflow = 'hidden';
    doc.defaultView?.addEventListener('keydown', state.handleKeyDown);
  }

  const entry = { close };
  state.entries.push(entry);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const index = state.entries.indexOf(entry);
    if (index !== -1) state.entries.splice(index, 1);
    if (state.entries.length === 0) {
      doc.body.style.overflow = state.previousOverflow;
      doc.defaultView?.removeEventListener('keydown', state.handleKeyDown);
      documents.delete(doc);
    }
  };
}
