import { createElement, useState } from 'react';

import RankingPredictionCompletionPanel from '../RankingPredictionCompletionPanel';

const teamValues = {
  'null-optional': undefined,
  single: 'HH',
  'long-korean': '모바일폭에서여러줄로자연스럽게줄바꿈되어야하는긴한글팀이름',
  'unbroken-token': `UNBROKEN_${'TOKEN'.repeat(36)}`,
} as const;

type CompletionData = keyof typeof teamValues;
type CompletionPhase = 'complete' | 'ready-to-save' | 'saved';

function rankingPredictionCompletionPanelStatefulHost({
  data,
  initialPhase,
  scenarioKey,
}: {
  data: CompletionData;
  initialPhase: CompletionPhase;
  scenarioKey: string;
}) {
  const [phase, setPhase] = useState(initialPhase);
  const [completeCount, setCompleteCount] = useState(0);
  const [saveCount, setSaveCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [saveRequested, setSaveRequested] = useState(false);
  const [shareRequested, setShareRequested] = useState(false);
  const phaseProps = phase === 'complete'
    ? { isPredictionSaved: false, alreadySaved: false }
    : phase === 'ready-to-save'
      ? { isPredictionSaved: true, alreadySaved: false }
      : { isPredictionSaved: true, alreadySaved: true };

  return (
    <div
      data-testid="ranking-completion-stateful-host"
      data-vqa-complete-count={completeCount}
      data-vqa-save-count={saveCount}
      data-vqa-share-count={shareCount}
      data-vqa-effective-phase={phase}
      data-vqa-save-requested={saveRequested}
      data-vqa-share-requested={shareRequested}
      data-vqa-scenario-key={scenarioKey}
    >
      <RankingPredictionCompletionPanel
        topTeamShortName={teamValues[data]}
        {...phaseProps}
        onCompletePrediction={() => {
          setCompleteCount((current) => current + 1);
          setPhase('ready-to-save');
        }}
        onSave={() => {
          setSaveCount((current) => current + 1);
          setSaveRequested(true);
        }}
        onShare={() => {
          setShareCount((current) => current + 1);
          setShareRequested(true);
        }}
      />
    </div>
  );
}

export function rankingPredictionCompletionPanelVisualQaHarness(props: {
  data: CompletionData;
  initialPhase: CompletionPhase;
  scenarioKey: string;
}) {
  return createElement(rankingPredictionCompletionPanelStatefulHost, {
    ...props,
    key: props.scenarioKey,
  });
}
