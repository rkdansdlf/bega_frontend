import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useAuthStore } from '../store/authStore';
import type { Application, Party } from '../types/mate';
import { isPartyHostedByUser, normalizeMateListReturnTo } from '../utils/mate';
import {
  getMatePartyApplicationsQueryOptions,
  getMatePartyMyApplicationQueryOptions,
} from './mateQueryOptions';
import { useMatePartyFromRoute } from './useMatePartyFromRoute';
import { useViewerQueryScope } from './useViewerQueryScope';

export type MateDetailControllerVisualQaStateOverride = {
  canAccessCheckIn?: boolean;
  currentUserHandle?: string;
  currentUserId?: number | null;
  fallbackCheckInUrl?: string;
  hostApplications?: Application[];
  id?: string;
  isApproved?: boolean;
  isHost?: boolean;
  isLoading?: boolean;
  isRevalidating?: boolean;
  myApplication?: Application | null;
  party: Party | null;
  partyError?: string | null;
  partyStatusCode?: number | null;
};

interface UseMateDetailControllerParams {
  id?: string;
  variant?: 'page' | 'panel';
  onClose?: () => void;
  visualQaStateOverride?: MateDetailControllerVisualQaStateOverride;
}

export function useMateDetailController({
  id: idProp,
  variant = 'page',
  onClose,
  visualQaStateOverride: requestedVisualQaStateOverride,
}: UseMateDetailControllerParams = {}) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams<{ id: string }>();
  const id = visualQaStateOverride?.id ?? idProp ?? routeId;
  const isPanel = variant === 'panel';
  const [showQrPanel, setShowQrPanel] = useState(false);
  const [showSeatViewGuide, setShowSeatViewGuide] = useState(false);
  const missingPartyRedirectRef = useRef<string | null>(null);
  const returnTo = useMemo(() => {
    if (!location.state || typeof location.state !== 'object') return '/mate';
    return normalizeMateListReturnTo((location.state as { returnTo?: unknown }).returnTo);
  }, [location.state]);

  const handleClose = useCallback(() => {
    if (isPanel && onClose) {
      onClose();
      return;
    }
    navigate(returnTo);
  }, [isPanel, navigate, onClose, returnTo]);

  const {
    party,
    isLoading: isPartyLoading,
    isRevalidating: isPartyRevalidating,
    error: partyError,
    statusCode: partyStatusCode,
  } = useMatePartyFromRoute(visualQaStateOverride ? undefined : id);
  const currentUser = useAuthStore((state) => state.user);
  const viewerScope = useViewerQueryScope();
  const currentUserId = visualQaStateOverride
    ? (visualQaStateOverride.currentUserId ?? null)
    : (currentUser?.id ?? null);
  const currentUserHandle = visualQaStateOverride
    ? visualQaStateOverride.currentUserHandle
    : currentUser?.handle;
  const resolvedParty = visualQaStateOverride ? visualQaStateOverride.party : party;
  const partyId = resolvedParty?.id;
  const isHost = visualQaStateOverride?.isHost ?? isPartyHostedByUser(resolvedParty, { id: currentUserId, handle: currentUserHandle });

  const myApplicationQuery = useQuery({
    ...(partyId != null
      ? getMatePartyMyApplicationQueryOptions(partyId, currentUserId, viewerScope)
      : getMatePartyMyApplicationQueryOptions('unknown', currentUserId, viewerScope)),
    enabled: !visualQaStateOverride && Boolean(partyId && currentUserId && !isHost),
  });
  const hostApplicationsQuery = useQuery({
    ...(partyId != null
      ? getMatePartyApplicationsQueryOptions(partyId, viewerScope)
      : getMatePartyApplicationsQueryOptions('unknown', viewerScope)),
    enabled: !visualQaStateOverride && Boolean(partyId && isHost),
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (partyStatusCode !== 404 || !id || resolvedParty) {
      missingPartyRedirectRef.current = null;
      return;
    }
    if (missingPartyRedirectRef.current === id) {
      return;
    }

    missingPartyRedirectRef.current = id;
    toast.info('존재하지 않는 파티입니다. 목록으로 이동합니다.');
    const redirectTimer = window.setTimeout(() => {
      handleClose();
    }, 1600);

    return () => window.clearTimeout(redirectTimer);
  }, [handleClose, id, partyStatusCode, resolvedParty]);

  useEffect(() => {
    setShowQrPanel(false);
    setShowSeatViewGuide(false);
  }, [partyId]);

  const myApplication = visualQaStateOverride?.myApplication ?? myApplicationQuery.data ?? null;
  const hostApplications = visualQaStateOverride?.hostApplications ?? hostApplicationsQuery.data ?? [];
  const isApproved = visualQaStateOverride?.isApproved ?? (myApplication?.isApproved || false);
  const canAccessCheckIn = visualQaStateOverride?.canAccessCheckIn ?? (Boolean(resolvedParty) &&
    (isHost || isApproved) &&
    resolvedParty?.status !== 'CHECKED_IN' &&
    resolvedParty?.status !== 'COMPLETED' &&
    resolvedParty?.status !== 'FAILED');

  const fallbackCheckInUrl = useMemo(() => {
    if (visualQaStateOverride?.fallbackCheckInUrl) return visualQaStateOverride.fallbackCheckInUrl;
    if (!id && !resolvedParty?.id) {
      return typeof window === 'undefined' ? '/mate' : window.location.href;
    }
    const path = `/mate/${id ?? resolvedParty?.id}/checkin`;
    if (typeof window === 'undefined') {
      return path;
    }
    return new URL(path, window.location.origin).toString();
  }, [id, resolvedParty?.id, visualQaStateOverride?.fallbackCheckInUrl]);

  const handleApply = useCallback(() => navigate(`/mate/${id}/apply`, { state: { returnTo } }), [id, navigate, returnTo]);
  const handleBrowsePartyList = handleClose;
  const handleCheckIn = useCallback((targetUrl?: string) => {
    const fallbackPath = `/mate/${id}/checkin`;
    try {
      const parsedUrl = new URL(targetUrl || fallbackCheckInUrl || fallbackPath, window.location.origin);
      navigate(`${parsedUrl.pathname}${parsedUrl.search}`);
      return;
    } catch (error) {
      console.error('체크인 URL 파싱 실패:', error);
    }

    navigate(fallbackPath);
  }, [fallbackCheckInUrl, id, navigate]);
  const handleManageParty = useCallback(() => navigate(`/mate/${id}/manage`), [id, navigate]);
  const handleOpenChat = useCallback(() => navigate(`/mate/${id}/chat`), [id, navigate]);

  return {
    canAccessCheckIn,
    currentUserHandle,
    currentUserId,
    fallbackCheckInUrl,
    handleApply,
    handleBrowsePartyList,
    handleCheckIn,
    handleClose,
    handleManageParty,
    handleOpenChat,
    hostApplications,
    hostApplicationsQuery,
    id,
    isApproved,
    isHost,
    isPanel,
    isPartyLoading: visualQaStateOverride?.isLoading ?? isPartyLoading,
    isPartyRevalidating: visualQaStateOverride?.isRevalidating ?? isPartyRevalidating,
    myApplication,
    myApplicationQuery,
    party: resolvedParty,
    partyError: visualQaStateOverride?.partyError ?? partyError,
    partyId,
    partyStatusCode: visualQaStateOverride?.partyStatusCode ?? partyStatusCode,
    setShowQrPanel,
    setShowSeatViewGuide,
    showQrPanel,
    showSeatViewGuide,
  };
}

export type UseMateDetailControllerReturn = ReturnType<typeof useMateDetailController>;
