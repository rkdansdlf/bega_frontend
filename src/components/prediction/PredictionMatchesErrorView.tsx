import { Button } from '../ui/button';
import { Card } from '../ui/card';
import StateBlock from '../status/StateBlock';
import { isManualBaseballDataRequiredCode } from '../../utils/errorUtils';
import { PredictionTrendingUpIcon } from './PredictionShellIcons';
import { PREDICTION_SURFACE_CARD_CLASS } from './predictionUiTokens';

interface PredictionMatchesErrorViewProps {
  /** 서버 원문 메시지 — 화면에는 쓰지 않습니다 (진단용으로만 전달). */
  matchesLoadErrorMessage: string | null;
  matchesLoadErrorCode: string | null;
  predictionRecoveryPath: string;
  /** 특정 경기로 들어온 경우에만 전체 목록으로 돌아가는 버튼을 보여줍니다. */
  showRecoveryLink?: boolean;
  onReloadMatches: () => void;
}

export default function PredictionMatchesErrorView({
  matchesLoadErrorCode,
  predictionRecoveryPath,
  showRecoveryLink = false,
  onReloadMatches,
}: PredictionMatchesErrorViewProps) {
  const isManualDataRequired = isManualBaseballDataRequiredCode(matchesLoadErrorCode);
  const title = isManualDataRequired
    ? '야구 데이터 준비가 필요합니다'
    : '경기 일정을 불러오지 못했어요';
  const description = isManualDataRequired
    ? '운영자가 데이터를 제공하면 다시 확인할 수 있습니다.'
    : '잠시 연결이 불안정했어요. 다시 불러오면 경기 일정을 확인할 수 있어요.';

  return (
    <Card
      data-testid="prediction-empty-state"
      className={`${PREDICTION_SURFACE_CARD_CLASS} overflow-hidden rounded-2xl p-0`}
    >
      <StateBlock
        kind={isManualDataRequired ? 'gated' : 'error'}
        bare
        icon={isManualDataRequired ? <PredictionTrendingUpIcon className="h-5 w-5" /> : undefined}
        title={title}
        description={description}
        onRetry={onReloadMatches}
        retryLabel="다시 불러오기"
        retryTestId="prediction-empty-retry"
        className="py-10"
        testId="prediction-empty-state-content"
        action={showRecoveryLink ? (
          <Button
            data-testid="prediction-empty-recovery"
            size="sm"
            variant="outline"
            className="rounded-10 border-slate-200 bg-white px-3 text-13 font-bold text-slate-700 hover:bg-slate-50 dark:border-border dark:bg-card dark:text-white"
            onClick={() => {
              window.location.href = predictionRecoveryPath;
            }}
          >
            전체 경기 목록 보기
          </Button>
        ) : undefined}
      />
    </Card>
  );
}
