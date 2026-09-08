import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import VisualQaHarnessApp from './VisualQaHarnessApp';
import '../index.css';

const root = document.getElementById('visual-qa-root');
if (!root) throw new Error('Visual QA harness root is missing.');

createRoot(root).render(
  <StrictMode>
    <VisualQaHarnessApp />
  </StrictMode>,
);
