import { useRef, type MouseEvent } from 'react';

import { Button } from './ui/button';
import TeamLogo from './TeamLogo';
import firstPlaceImage from '../assets/f552d9266ac817e0c86b657dead0069395c6da11.webp';

interface RankingPredictionCompletionPanelProps {
  topTeamShortName?: string;
  isPredictionSaved: boolean;
  alreadySaved: boolean;
  onCompletePrediction: () => void;
  onSave: () => void;
  onShare: () => void;
}

export default function RankingPredictionCompletionPanel({
  topTeamShortName,
  isPredictionSaved,
  alreadySaved,
  onCompletePrediction,
  onSave,
  onShare,
}: RankingPredictionCompletionPanelProps) {
  const completeTransitionClick = useRef(false);
  const handleComplete = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail > 1) return;
    completeTransitionClick.current = true;
    onCompletePrediction();
  };
  const handlePostCompleteAction = (
    event: MouseEvent<HTMLButtonElement>,
    callback: () => void,
  ) => {
    if (completeTransitionClick.current && event.detail > 1) {
      completeTransitionClick.current = false;
      return;
    }
    completeTransitionClick.current = false;
    callback();
  };

  return (
    <div
      data-testid="ranking-completion-panel"
      className="min-w-0 overflow-hidden animate-fade-in-up motion-reduce:animate-none"
    >
      <div className="mb-4 mx-auto w-[60px]">
        <img
          src={firstPlaceImage}
          alt="1위 트로피"
          loading="lazy"
          decoding="async"
          className="w-full h-auto object-contain"
        />
      </div>

      <p className="mb-4 text-2xl font-black text-[#2d5f4f] dark:text-emerald-200">
        1위
      </p>

      {topTeamShortName ? (
        <div className="mb-6 flex min-w-0 justify-center overflow-hidden">
          <TeamLogo
            team={topTeamShortName}
            size={140}
            className="max-w-full overflow-hidden break-all text-center"
          />
        </div>
      ) : null}

      <p className="mb-4 text-body font-semibold text-slate-600 dark:text-white/75">모든 팀이 배치되었습니다!</p>

      {!isPredictionSaved && !alreadySaved ? (
        <Button
          onClick={handleComplete}
          data-testid="ranking-complete-btn"
          className="min-h-11 w-full bg-[#2d5f4f] text-white hover:bg-[#2f6c5c]"
        >
          예측 완료
        </Button>
      ) : alreadySaved ? (
        <div className="space-y-2">
          <Button
            onClick={(event) => handlePostCompleteAction(event, onShare)}
            data-testid="ranking-share-btn"
            variant="outline"
            className="min-h-11 w-full border border-emerald-200 text-[#2d5f4f] hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-200 dark:hover:bg-primary/20"
          >
            공유하기
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            onClick={(event) => handlePostCompleteAction(event, onSave)}
            data-testid="ranking-save-btn"
            className="min-h-11 w-full bg-[#2d5f4f] text-white hover:bg-[#2f6c5c]"
          >
            저장하기
          </Button>
          <Button
            onClick={(event) => handlePostCompleteAction(event, onShare)}
            data-testid="ranking-share-btn"
            variant="outline"
            className="min-h-11 w-full border border-emerald-200 text-[#2d5f4f] hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-200 dark:hover:bg-primary/20"
          >
            공유하기
          </Button>
        </div>
      )}
    </div>
  );
}
