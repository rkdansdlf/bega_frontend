import { createElement, useState } from 'react';

import RankingPredictionSaveDialog from '../RankingPredictionSaveDialog';

function rankingPredictionSaveDialogStatefulHost({
  initialOpen,
  initialSaving,
  scenarioKey,
}: {
  initialOpen: boolean;
  initialSaving: boolean;
  scenarioKey: string;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [saving, setSaving] = useState(initialSaving);
  const [closeCount, setCloseCount] = useState(0);
  const [confirmCount, setConfirmCount] = useState(0);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 h-px w-px overflow-hidden"
      data-testid="ranking-save-dialog-stateful-host"
      data-vqa-close-count={closeCount}
      data-vqa-confirm-count={confirmCount}
      data-vqa-effective-open={open}
      data-vqa-effective-saving={saving}
      data-vqa-scenario-key={scenarioKey}
    >
      <RankingPredictionSaveDialog
        open={open}
        isSaving={saving}
        onClose={() => {
          setCloseCount((current) => current + 1);
          setOpen(false);
        }}
        onConfirm={() => {
          setConfirmCount((current) => current + 1);
          setSaving(true);
        }}
      />
    </div>
  );
}

export function rankingPredictionSaveDialogVisualQaHarness(props: {
  initialOpen: boolean;
  initialSaving: boolean;
  scenarioKey: string;
}) {
  return createElement(rankingPredictionSaveDialogStatefulHost, {
    ...props,
    key: props.scenarioKey,
  });
}
