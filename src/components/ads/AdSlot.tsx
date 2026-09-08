import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';

import { loadAdSenseScript, requestAdSenseFill } from '../../api/ads';
import {
  getAdSenseClient,
  getAdSenseSlotUnit,
  getAdSlotConfig,
  isAdSenseTestMode,
  isAdSlotEnabled,
} from '../../config/adSlots';
import {
  createSlotExposureId,
  getAdExperimentVariant,
  trackAdEvent,
  type AdCreativeType,
  type AdExperimentVariant,
  type AdRolloutWave,
} from '../../utils/adAnalytics';

type AdSlotRenderMode = 'filled' | 'no_fill';

interface AdSlotRuntime {
  adClient: string;
  adSlotUnit: string;
  enabled: boolean;
  variant: AdExperimentVariant;
  testMode: boolean;
  loadScript: typeof loadAdSenseScript;
  requestFill: typeof requestAdSenseFill;
  trackEvent: typeof trackAdEvent;
}

interface AdSlotProps {
  slotId: string;
  pageType: string;
  contentId?: string | null;
  listIndex?: number | null;
  creativeType?: AdCreativeType;
  className?: string;
  minHeight?: number | string;
  disabled?: boolean;
  loggedIn?: boolean;
  userId?: string | null;
  wave?: AdRolloutWave;
  hideInControl?: boolean;
  renderMode?: AdSlotRenderMode;
  noFillReason?: string;
  children?: ReactNode;
  runtime?: AdSlotRuntime | null;
}

const VIEWABLE_THRESHOLD = 0.5;
const VIEWABLE_DELAY_MS = 1000;

const CREATIVE_STYLES: Record<AdCreativeType, string> = {
  native_card: 'rounded-20 border border-slate-200/80 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-[#000000]',
  sponsor_card: 'rounded-20 border border-slate-200/80 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-[#000000]',
  banner: 'rounded-20 border border-slate-200/80 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-[#000000]',
};

const joinClassNames = (...values: Array<string | undefined | false>): string => {
  return values.filter(Boolean).join(' ');
};

const getMinHeightStyle = (minHeight: number | string | undefined): CSSProperties | undefined => {
  if (minHeight === undefined) {
    return undefined;
  }

  return {
    minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
  };
};

export default function AdSlot({
  slotId,
  pageType,
  contentId = null,
  listIndex = null,
  creativeType,
  className,
  minHeight,
  disabled = false,
  loggedIn = false,
  userId = null,
  wave = 'ads_wave1',
  hideInControl = true,
  renderMode,
  noFillReason = 'adsense_no_fill',
  children,
  runtime = null,
}: AdSlotProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const adRef = useRef<HTMLElement | null>(null);
  const exposureIdRef = useRef<string>(createSlotExposureId(slotId));
  const requestedRef = useRef(false);
  const terminalRef = useRef(false);
  const viewTrackedRef = useRef(false);
  const viewTimerRef = useRef<number | null>(null);
  const lastViewportPctRef = useRef(0);

  const slotConfig = useMemo(() => getAdSlotConfig(slotId), [slotId]);
  const resolvedWave = slotConfig?.wave ?? wave;
  const configuredVariant = useMemo(() => getAdExperimentVariant(resolvedWave), [resolvedWave]);
  const variant = runtime?.variant ?? configuredVariant;
  const resolvedCreativeType = creativeType ?? slotConfig?.creativeType ?? 'banner';
  const resolvedRenderMode = renderMode ?? 'filled';
  const resolvedMinHeight = minHeight ?? slotConfig?.minHeight ?? 140;
  const adClient = runtime?.adClient ?? getAdSenseClient();
  const adSlotUnit = runtime?.adSlotUnit ?? getAdSenseSlotUnit(slotId);
  const isEnabledByConfig = runtime?.enabled ?? isAdSlotEnabled(slotId);
  const loadScript = runtime?.loadScript ?? loadAdSenseScript;
  const requestFill = runtime?.requestFill ?? requestAdSenseFill;
  const trackEvent = runtime?.trackEvent ?? trackAdEvent;
  const testMode = runtime?.testMode ?? isAdSenseTestMode();
  const isControlGroup = hideInControl && variant === 'control';
  const shouldTrack = !disabled && isEnabledByConfig && !isControlGroup;
  const canRequestAd = shouldTrack && resolvedRenderMode === 'filled' && Boolean(adClient) && Boolean(adSlotUnit);

  useEffect(() => {
    exposureIdRef.current = createSlotExposureId(slotId);
    requestedRef.current = false;
    terminalRef.current = false;
    viewTrackedRef.current = false;
    lastViewportPctRef.current = 0;

    if (viewTimerRef.current !== null) {
      window.clearTimeout(viewTimerRef.current);
      viewTimerRef.current = null;
    }

    if (adRef.current) {
      delete adRef.current.dataset.adsenseRequested;
      adRef.current.removeAttribute('data-adsbygoogle-status');
      adRef.current.innerHTML = '';
    }
  }, [slotId, pageType, contentId, listIndex, variant]);

  useEffect(() => {
    if (!shouldTrack || requestedRef.current) {
      return;
    }

    requestedRef.current = true;
    trackEvent('ad_slot_requested', {
      slotId,
      slotExposureId: exposureIdRef.current,
      pageType,
      contentId,
      listIndex,
      creativeType: resolvedCreativeType,
      variant,
      loggedIn,
      userId,
      requestProvider: 'adsense',
    });

    if (canRequestAd || terminalRef.current) {
      return;
    }

    terminalRef.current = true;
    trackEvent('ad_slot_no_fill', {
      slotId,
      slotExposureId: exposureIdRef.current,
      pageType,
      contentId,
      listIndex,
      creativeType: resolvedCreativeType,
      variant,
      loggedIn,
      userId,
      requestProvider: 'adsense',
      reason: !adClient || !adSlotUnit ? 'adsense_config_missing' : noFillReason,
    });
  }, [
    adClient,
    adSlotUnit,
    canRequestAd,
    contentId,
    listIndex,
    loggedIn,
    noFillReason,
    pageType,
    resolvedCreativeType,
    shouldTrack,
    slotId,
    trackEvent,
    userId,
    variant,
  ]);

  useEffect(() => {
    if (!canRequestAd || !adRef.current || terminalRef.current) {
      return;
    }

    let cancelled = false;

    void loadScript(adClient)
      .then(() => {
        if (cancelled || !adRef.current || terminalRef.current) {
          return;
        }

        const didRequest = requestFill(adRef.current);
        if (!didRequest) {
          terminalRef.current = true;
          trackEvent('ad_slot_no_fill', {
            slotId,
            slotExposureId: exposureIdRef.current,
            pageType,
            contentId,
            listIndex,
            creativeType: resolvedCreativeType,
            variant,
            loggedIn,
            userId,
            requestProvider: 'adsense',
            reason: 'adsense_push_failed',
          });
          return;
        }

        terminalRef.current = true;
        trackEvent('ad_slot_rendered', {
          slotId,
          slotExposureId: exposureIdRef.current,
          pageType,
          contentId,
          listIndex,
          creativeType: resolvedCreativeType,
          variant,
          loggedIn,
          userId,
          requestProvider: 'adsense',
          adProvider: 'google_adsense',
          creativeId: adSlotUnit,
        });
      })
      .catch(() => {
        if (cancelled || terminalRef.current) {
          return;
        }

        terminalRef.current = true;
        trackEvent('ad_slot_no_fill', {
          slotId,
          slotExposureId: exposureIdRef.current,
          pageType,
          contentId,
          listIndex,
          creativeType: resolvedCreativeType,
          variant,
          loggedIn,
          userId,
          requestProvider: 'adsense',
          reason: 'adsense_script_load_failed',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    adClient,
    adSlotUnit,
    canRequestAd,
    contentId,
    listIndex,
    loadScript,
    loggedIn,
    pageType,
    resolvedCreativeType,
    requestFill,
    slotId,
    trackEvent,
    userId,
    variant,
  ]);

  useEffect(() => {
    if (!canRequestAd || !rootRef.current || viewTrackedRef.current) {
      return;
    }

    const node = rootRef.current;

    const clearViewTimer = () => {
      if (viewTimerRef.current !== null) {
        window.clearTimeout(viewTimerRef.current);
        viewTimerRef.current = null;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }

        lastViewportPctRef.current = Math.round(entry.intersectionRatio * 100);

        if (entry.intersectionRatio >= VIEWABLE_THRESHOLD) {
          if (viewTimerRef.current === null) {
            viewTimerRef.current = window.setTimeout(() => {
              if (viewTrackedRef.current) {
                return;
              }

              viewTrackedRef.current = true;
              viewTimerRef.current = null;
              trackEvent('ad_slot_viewable', {
                slotId,
                slotExposureId: exposureIdRef.current,
                pageType,
                contentId,
                listIndex,
                creativeType: resolvedCreativeType,
                variant,
                loggedIn,
                userId,
                adProvider: 'google_adsense',
                creativeId: adSlotUnit,
                viewportPct: lastViewportPctRef.current,
                viewableMs: VIEWABLE_DELAY_MS,
              });
            }, VIEWABLE_DELAY_MS);
          }
          return;
        }

        clearViewTimer();
      },
      {
        threshold: [0, VIEWABLE_THRESHOLD, 1],
      },
    );

    observer.observe(node);

    return () => {
      clearViewTimer();
      observer.disconnect();
    };
  }, [
    adSlotUnit,
    canRequestAd,
    contentId,
    listIndex,
    loggedIn,
    pageType,
    resolvedCreativeType,
    slotId,
    trackEvent,
    userId,
    variant,
  ]);

  if (!canRequestAd) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className={joinClassNames(
        'overflow-hidden',
        CREATIVE_STYLES[resolvedCreativeType],
        className,
      )}
      style={getMinHeightStyle(resolvedMinHeight)}
      data-ad-slot={slotId}
      data-ad-variant={variant}
    >
      <div className="mb-3 flex items-center justify-between gap-2 text-15 font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-white">
        <span className="shrink-0">광고</span>
        <span className="min-w-0 truncate text-right">{slotId}</span>
      </div>
      {children ? <div className="mb-3">{children}</div> : null}
      <ins
        ref={(node) => {
          adRef.current = node;
        }}
        className="adsbygoogle block w-full"
        style={{ display: 'block', minHeight: typeof resolvedMinHeight === 'number' ? resolvedMinHeight - 28 : undefined }}
        data-ad-client={adClient}
        data-ad-slot={adSlotUnit}
        data-ad-format={slotConfig?.adFormat ?? 'auto'}
        data-ad-layout={slotConfig?.adLayout}
        data-full-width-responsive={slotConfig?.fullWidthResponsive ? 'true' : 'false'}
        data-adtest={testMode ? 'on' : undefined}
      />
    </div>
  );
}
