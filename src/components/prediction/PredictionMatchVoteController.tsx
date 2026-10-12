import { lazy } from 'react';
import type { Dispatch, ReactElement, ReactNode, SetStateAction } from 'react';

import type {
  LoadVoteStatusOptions,
  PredictionFlowEmitter,
  PredictionOverlayController,
  UserVoteRecord,
} from '../../hooks/predictionHookShared';
import type { Game, VoteTeam } from '../../types/prediction';

const PredictionMatchVoteControllerRuntime = lazy(() => import('./PredictionMatchVoteControllerRuntime'));

export type PredictionPendingVoteAction = {
  requestId: number;
  team: VoteTeam;
  game: Game;
  isVoteOpen: boolean;
};

export type PredictionMatchVoteControllerRenderState = {
  handleVote: (team: VoteTeam, game: Game, isVoteOpen: boolean) => Promise<void>;
  isRunInProgress: boolean;
  isRunBannerDismissed: boolean;
  runProgressMessage: string;
  dismissRunProgressBanner: () => void;
  resumeRunProgressBanner: () => void;
};

export type PredictionMatchVoteControllerProps = {
  isAuthLoading: boolean;
  isLoggedIn: boolean;
  currentGameId: string | null;
  userVote: UserVoteRecord;
  setUserVote: Dispatch<SetStateAction<UserVoteRecord>>;
  loadVoteStatus: (gameId: string, options?: LoadVoteStatusOptions) => Promise<boolean>;
  reloadVoteStatus: (gameId: string, options?: LoadVoteStatusOptions) => Promise<boolean>;
  emitFlowEvent: PredictionFlowEmitter;
  showPredictionErrorOverlay: PredictionOverlayController['showPredictionErrorOverlay'];
  confirm: (options: { title: string; description?: string }) => Promise<boolean>;
  pendingVoteAction: PredictionPendingVoteAction | null;
  onPendingVoteHandled: (requestId: number) => void;
  children: (state: PredictionMatchVoteControllerRenderState) => ReactElement;
  visualQaPhase?: 'fallback' | 'resolved';
  visualQaRuntimeOverride?: ReactNode;
};

export default function PredictionMatchVoteController({
  visualQaPhase: requestedVisualQaPhase,
  visualQaRuntimeOverride: visualQaRuntimeOverrideProp,
  ...props
}: PredictionMatchVoteControllerProps) {
  const visualQaPhase = import.meta.env.PROD === true ? undefined : requestedVisualQaPhase;
  const visualQaRuntimeOverride = import.meta.env.PROD === true ? undefined : visualQaRuntimeOverrideProp;
  if (visualQaPhase === 'fallback') {
    return <div data-testid="prediction-match-vote-controller-fallback">투표 기능을 준비하고 있습니다.</div>;
  }
  if (visualQaPhase === 'resolved' && visualQaRuntimeOverride) {
    return <>{visualQaRuntimeOverride}</>;
  }

  return <PredictionMatchVoteControllerRuntime {...props} />;
}
