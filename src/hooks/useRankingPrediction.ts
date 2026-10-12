import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { useAuthSession } from '../store/authStore';
import { getInitialPredictionState, usePredictionStore, Team } from '../store/predictionStore';
import {
  fetchRankingPredictionInit,
  fetchSavedPrediction,
  saveRankingPrediction,
} from '../api/ranking';
import type { SavedPredictionResponse } from '../types/ranking';
import {
  restoreTeamsFromIds,
  isRankingComplete,
  extractTeamIds,
  generateRankingText,
  isKakaoSDKReady,
  initializeKakaoSDK,
} from '../utils/ranking';
import { KAKAO_APP_KEY } from '../constants/ranking';
import { getApiErrorMessage, parseError } from '../utils/errorUtils';
import { buildLoginPath } from '../utils/loginRedirect';
import {
  resolveRankingPredictionInitFailure,
  type RankingPredictionInitState,
} from '../utils/rankingPredictionState';
import { isViewerQueryScopeCurrent, type ViewerQueryScope } from '../utils/viewerQueryScope';

export const useRankingPrediction = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, isAuthLoading, userId, sessionEpoch } = useAuthSession();
  const viewerScope: ViewerQueryScope = { viewerId: userId, sessionEpoch };
  const redirectToLogin = (replace = true) => {
    toast.error('로그인이 필요한 서비스입니다.');
    navigate(buildLoginPath(`${location.pathname}${location.search}${location.hash}`), { replace });
  };

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [currentSeason, setCurrentSeason] = useState<number | null>(null);
  const [initState, setInitState] = useState<RankingPredictionInitState>('loading');
  const [initErrorMessage, setInitErrorMessage] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [previousSeasonResult, setPreviousSeasonResult] = useState<SavedPredictionResponse | null>(null);
  const [pageViewerId, setPageViewerId] = useState(userId);
  const initRequestGenerationRef = useRef(0);

  const storedPredictionState = usePredictionStore(
    useShallow((state) => ({
      viewerId: state.viewerId,
      rankings: state.rankings,
      availableTeams: state.availableTeams,
      isPredictionSaved: state.isPredictionSaved,
      allTeams: state.allTeams,
    }))
  );
  const activePredictionState = storedPredictionState.viewerId === userId
    ? storedPredictionState
    : getInitialPredictionState(userId);
  const { rankings, availableTeams, isPredictionSaved, allTeams } = activePredictionState;
  const isPageViewerReady = pageViewerId === userId;

  const { addTeamToRanking, removeTeamFromRanking, moveTeam, resetRankings, completePrediction, setRankings, setIsPredictionSaved } = usePredictionStore(
    useShallow((state) => ({
      addTeamToRanking: state.addTeamToRanking,
      removeTeamFromRanking: state.removeTeamFromRanking,
      moveTeam: state.moveTeam,
      resetRankings: state.resetRankings,
      completePrediction: state.completePrediction,
      setRankings: state.setRankings,
      setIsPredictionSaved: state.setIsPredictionSaved,
    }))
  );

  useEffect(() => {
    void initializeKakaoSDK(KAKAO_APP_KEY);
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      redirectToLogin(true);
    }
  }, [isLoggedIn, isAuthLoading, location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    const generation = ++initRequestGenerationRef.current;
    const scope = viewerScope;
    const isCurrentRequest = () => (
      generation === initRequestGenerationRef.current
      && isViewerQueryScopeCurrent(scope)
    );

    setPageViewerId(userId);
    setCurrentSeason(null);
    setInitState('loading');
    setInitErrorMessage(null);
    setShareId(null);
    setPreviousSeasonResult(null);
    setAlreadySaved(false);

    if (isAuthLoading || !isLoggedIn || userId === null) {
      return () => {
        if (initRequestGenerationRef.current === generation) initRequestGenerationRef.current += 1;
      };
    }

    void (async () => {
      await usePredictionStore.persist.rehydrate();
      if (!isCurrentRequest()) return;

      const currentStore = usePredictionStore.getState();
      if (currentStore.viewerId !== userId) {
        currentStore.setViewerId(userId);
      }
      await initializePage(isCurrentRequest, userId);
    })();

    return () => {
      if (initRequestGenerationRef.current === generation) initRequestGenerationRef.current += 1;
    };
  }, [isAuthLoading, isLoggedIn, sessionEpoch, userId]);

  const loadPreviousSeasonResult = async (
    previousSeasonYear: number,
    isCurrentRequest: () => boolean,
  ) => {
    try {
      const previousPrediction = await fetchSavedPrediction(previousSeasonYear);
      if (!isCurrentRequest()) return;
      setPreviousSeasonResult(previousPrediction?.settledAt ? previousPrediction : null);
    } catch {
      if (!isCurrentRequest()) return;
      // 결과 표시는 부가 기능이므로 실패해도 메인 예측 플로우에는 영향 없음
      setPreviousSeasonResult(null);
    }
  };

  const initializePage = async (
    isCurrentRequest: () => boolean,
    viewerId: number,
  ) => {
    setInitState('loading');
    setInitErrorMessage(null);

    try {
      const initData = await fetchRankingPredictionInit();
      if (!isCurrentRequest()) return;
      setCurrentSeason(initData.seasonYear);
      void loadPreviousSeasonResult(initData.seasonYear - 1, isCurrentRequest);

      const currentStore = usePredictionStore.getState();
      if (currentStore.viewerId !== viewerId) currentStore.setViewerId(viewerId);

      if (initData.saved) {
        setAlreadySaved(true);
        setIsPredictionSaved(true);
        setShareId(initData.saved.shareId);

        const restoredRankings = restoreTeamsFromIds(initData.saved.teamIdsInOrder, allTeams);
        setRankings(restoredRankings);
        toast.info(`${initData.seasonYear} 시즌 순위 예측을 불러왔습니다.`);
      } else {
        setAlreadySaved(false);
        setShareId(null);
        resetRankings();
        setIsPredictionSaved(false);
      }
    } catch (error: unknown) {
      if (!isCurrentRequest()) return;
      setShareId(null);

      const failure = resolveRankingPredictionInitFailure(error);
      if (failure === 'redirect-auth') {
        redirectToLogin(true);
        return;
      }

      if (failure === 'closed') {
        setAlreadySaved(false);
        setInitState('closed');
        return;
      }

      const errorMessage = getApiErrorMessage(error, '데이터를 불러오는데 실패했습니다.');
      setAlreadySaved(false);
      setInitErrorMessage(errorMessage);
      setInitState('error');
      toast.error(errorMessage);
      return;
    }

    if (isCurrentRequest()) setInitState('ready');
  };

  const isComplete = isRankingComplete(rankings);

  const handleTeamClick = (team: Team) => {
    if (!isPageViewerReady) return;
    if (alreadySaved) {
      toast.warning('이미 저장된 예측은 수정할 수 없습니다.');
      return;
    }
    addTeamToRanking(team);
  };

  const handleRemoveTeam = (index: number) => {
    if (!isPageViewerReady) return;
    if (alreadySaved) {
      toast.warning('이미 저장된 예측은 수정할 수 없습니다.');
      return;
    }
    removeTeamFromRanking(index);
  };

  const handleCompletePrediction = () => {
    if (!isPageViewerReady) return;
    if (isComplete) {
      completePrediction();
      toast.success('순위 예측이 완료되었습니다!');
    }
  };

  const handleSave = () => {
    if (!isPageViewerReady) return;
    if (alreadySaved) {
      toast.error('이미 순위 예측을 저장하셨습니다.');
      return;
    }
    setShowSaveDialog(true);
  };

  const confirmSave = async () => {
    const scope = viewerScope;
    if (!isPageViewerReady || scope.viewerId === null || isSaving || alreadySaved || !currentSeason) return;
    if (!isRankingComplete(rankings)) {
      toast.error('10개 팀을 모두 배치한 후 저장할 수 있습니다.');
      return;
    }

    setIsSaving(true);

    try {
      const teamIds = extractTeamIds(rankings);

      const savedPrediction = await saveRankingPrediction({
        seasonYear: currentSeason,
        teamIdsInOrder: teamIds,
      });
      if (!isViewerQueryScopeCurrent(scope)) return;

      toast.success(`${currentSeason} 시즌 예측이 저장되었습니다!`);
      setShowSaveDialog(false);
      setAlreadySaved(true);
      setIsPredictionSaved(true);
      setShareId(savedPrediction.shareId);
    } catch (error: unknown) {
      if (!isViewerQueryScopeCurrent(scope)) return;
      const parsedError = parseError(error);
      if (parsedError.type === 'AUTH') {
        setShowSaveDialog(false);
        redirectToLogin(true);
        return;
      }

      if (parsedError.responseCode === 'RANKING_PREDICTION_ALREADY_EXISTS') {
        setShowSaveDialog(false);
        await initializePage(() => isViewerQueryScopeCurrent(scope), scope.viewerId);
        if (!isViewerQueryScopeCurrent(scope)) return;
        toast.error(parsedError.message || '이미 저장된 예측입니다.');
        return;
      }

      if (parsedError.responseCode === 'RANKING_PREDICTION_CLOSED') {
        setShowSaveDialog(false);
        setInitState('closed');
        toast.error(parsedError.message || '현재는 순위 예측 기간이 아닙니다.');
        return;
      }

      const errorMessage = getApiErrorMessage(error, '저장에 실패했습니다.');
      toast.error(errorMessage);
    } finally {
      if (isViewerQueryScopeCurrent(scope)) setIsSaving(false);
    }
  };

  const handleShare = async () => {
    const scope = viewerScope;
    if (!isPageViewerReady || scope.viewerId === null) return;
    const sdkReady = isKakaoSDKReady() || await initializeKakaoSDK(KAKAO_APP_KEY);
    if (!isViewerQueryScopeCurrent(scope)) return;
    if (!sdkReady) {
      toast.error('카카오톡 공유 기능을 불러올 수 없습니다.');
      return;
    }

    const kakaoShare = window.Kakao?.Share;
    if (!kakaoShare) {
      toast.error('카카오톡 공유 기능을 사용할 수 없습니다.');
      return;
    }

    if (!isComplete) {
      toast.warning('10개 팀을 모두 배치한 후 공유할 수 있습니다.');
      return;
    }

    if (!alreadySaved || !shareId || !currentSeason) {
      toast.warning('예측을 저장한 뒤 공유할 수 있습니다.');
      return;
    }

    try {
      const rankingText = generateRankingText(rankings);
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const shareUrl = `${baseUrl}/predictions/ranking/share/${shareId}/${currentSeason}`;

      window.Kakao?.Share?.sendDefault({
        objectType: 'feed',
        content: {
          title: `${currentSeason} KBO 시즌 순위 예측`,
          description: rankingText,
          imageUrl: `${baseUrl}/favicon.png`,
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
        buttons: [
          {
            title: '나도 예측하기',
            link: {
              mobileWebUrl: `${baseUrl}/prediction`,
              webUrl: `${baseUrl}/prediction`,
            },
          },
        ],
      });

      toast.success('카카오톡 공유 창이 열렸습니다!');
    } catch (error) {
      console.error('카카오톡 공유 실패:', error);
      toast.error('카카오톡 공유에 실패했습니다.');
    }
  };

  const retryInitialize = () => {
    const scope = viewerScope;
    if (!isPageViewerReady || scope.viewerId === null) return;
    void initializePage(() => isViewerQueryScopeCurrent(scope), scope.viewerId);
  };

  return {
    showSaveDialog: isPageViewerReady && showSaveDialog,
    setShowSaveDialog,
    isSaving: isPageViewerReady && isSaving,
    alreadySaved: isPageViewerReady && alreadySaved,
    currentSeason: isPageViewerReady ? currentSeason : null,
    isPredictionPeriod: !isPageViewerReady || initState !== 'closed',
    isLoading: !isPageViewerReady || initState === 'loading',
    initState: isPageViewerReady ? initState : 'loading',
    initErrorMessage: isPageViewerReady ? initErrorMessage : null,
    isAuthLoading,
    isLoggedIn,
    shareId: isPageViewerReady ? shareId : null,
    previousSeasonResult: isPageViewerReady ? previousSeasonResult : null,
    rankings,
    availableTeams,
    isPredictionSaved,
    allTeams,
    moveTeam,
    resetRankings,
    isComplete,
    handleTeamClick,
    handleRemoveTeam,
    handleCompletePrediction,
    handleSave,
    confirmSave,
    handleShare,
    retryInitialize,
  };
};
