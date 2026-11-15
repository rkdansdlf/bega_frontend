import type { ComponentProps } from 'react';

import { AdminAiOperationsPanel } from './AdminAiOperationsPanel';
import './AdminAiPresetCard.css';
import './AdminAiArtifactCard.css';
import './AdminAiHealthWindow.css';

type AdminAiOperationsPanelRuntimeProps = ComponentProps<typeof AdminAiOperationsPanel>;

export default function AdminAiOperationsPanelRuntime(
  props: AdminAiOperationsPanelRuntimeProps,
) {
  return <AdminAiOperationsPanel {...props} />;
}
