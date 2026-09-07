import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { requestLoadTrace } from '../utils/requestLoadTrace';

const PublicNavbar = lazy(() => import('./PublicNavbar'));
const Navbar = lazy(() => import('./Navbar'));
const AuthenticatedLayoutChrome = lazy(() => import('./AuthenticatedLayoutChrome'));
const Footer = lazy(() => import('./Footer'));
const HOME_FIRST_CARD_READY_EVENT = 'bega:home-first-card-ready';
const PUBLIC_HOME_CHROME_MIN_DEFER_DELAY_MS = 1200;
const PUBLIC_HOME_CHROME_IDLE_TIMEOUT_MS = 1200;
const PUBLIC_HOME_CHROME_FALLBACK_DELAY_MS = 5000;
const PUBLIC_HOME_FOOTER_FALLBACK_DELAY_MS = 5000;
const PUBLIC_HOME_CHAT_CHROME_DEFER_DELAY_MS = 3200;
const PUBLIC_HOME_CHROME_NAV_READY_STAGE = 1;
const PUBLIC_HOME_CHROME_CHAT_READY_STAGE = 2;

type HomeFirstCardReadyWindow = Window & {
  __begaHomeFirstCardReadyPathname?: string;
};

type LayoutProps = {
  authenticated?: boolean;
  visualQaOutletOverride?: ReactNode;
  visualQaRuntimeOverrides?: {
    authenticatedLayoutChrome?: ComponentType<{ enableAuthenticatedServices?: boolean }>;
    footer?: ComponentType;
    navbar?: ComponentType<{ authenticatedShell?: boolean }>;
    publicNavbar?: ComponentType;
  };
  visualQaRuntimePhases?: {
    authenticatedLayoutChrome?: 'loading' | 'resolved';
    footer?: 'loading' | 'resolved';
    navbar?: 'loading' | 'resolved';
    publicNavbar?: 'loading' | 'resolved';
  };
  visualQaStateOverride?: {
    isFooterRequested: boolean;
    publicHomeChromeReadyStage: 0 | 1 | 2;
  };
};

function PublicNavbarFallback() {
  return (
    <header
      aria-hidden="true"
      className="sticky top-0 z-[60] px-3 py-2 md:px-4 md:py-1.5 relative overflow-x-clip"
    >
      <div className="pointer-events-none absolute inset-0 bg-gray-50 dark:bg-background" />
      <div className="relative flex h-12 items-center gap-2 rounded-full border border-white/80 bg-white/72 px-3 shadow-navbar-capsule backdrop-blur-xl md:left-1/2 md:h-16 md:w-full md:max-w-5xl md:-translate-x-1/2 md:px-4 dark:border-white/8 dark:bg-black/65 dark:shadow-navbar-capsule-dark">
        <div className="flex min-h-11 shrink-0 items-center gap-2 rounded-full px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-13 font-black text-white md:h-9 md:w-9">
            B
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="font-black text-17 tracking-widest text-primary dark:text-primary-light">
              BEGA
            </span>
            <span className="hidden text-10 font-bold tracking-tight text-muted-foreground md:block dark:text-white">
              BASEBALL GUIDE
            </span>
          </div>
        </div>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <span className="h-8 w-16 rounded-full bg-muted" />
          <span className="h-8 w-16 rounded-full bg-muted" />
          <span className="h-8 w-16 rounded-full bg-muted" />
        </div>
        <div className="ml-auto h-10 w-10 rounded-full bg-muted md:hidden" />
      </div>
    </header>
  );
}

export default function Layout(props: LayoutProps) {
  const { authenticated = true } = props;
  const visualQaStateOverride = import.meta.env.DEV ? props.visualQaStateOverride : undefined;
  const visualQaRuntimePhases = import.meta.env.DEV ? props.visualQaRuntimePhases : undefined;
  const visualQaRuntimeOverrides = import.meta.env.DEV ? props.visualQaRuntimeOverrides : undefined;
  const visualQaOutletOverride = import.meta.env.DEV ? props.visualQaOutletOverride : undefined;
  const [liveIsFooterRequested, setLiveIsFooterRequested] = useState(false);
  const isFooterRequested = visualQaStateOverride?.isFooterRequested ?? liveIsFooterRequested;
  const location = useLocation();
  const isPublicHomeRoute = !authenticated && /^\/home\/?$/.test(location.pathname);
  const [livePublicHomeChromeReadyStage, setLivePublicHomeChromeReadyStage] = useState(() => (
    isPublicHomeRoute ? 0 : PUBLIC_HOME_CHROME_CHAT_READY_STAGE
  ));
  const publicHomeChromeReadyStage = visualQaStateOverride?.publicHomeChromeReadyStage
    ?? livePublicHomeChromeReadyStage;
  const PublicNavbarComponent = visualQaRuntimeOverrides?.publicNavbar ?? PublicNavbar;
  const NavbarComponent = visualQaRuntimeOverrides?.navbar ?? Navbar;
  const FooterComponent = visualQaRuntimeOverrides?.footer ?? Footer;
  const AuthenticatedLayoutChromeComponent = visualQaRuntimeOverrides?.authenticatedLayoutChrome
    ?? AuthenticatedLayoutChrome;
  const navbarPhase = visualQaRuntimePhases?.navbar ?? 'resolved';
  const publicNavbarPhase = visualQaRuntimePhases?.publicNavbar ?? 'resolved';
  const footerPhase = visualQaRuntimePhases?.footer ?? 'resolved';
  const authenticatedLayoutChromePhase = visualQaRuntimePhases?.authenticatedLayoutChrome
    ?? 'resolved';

  const shouldShowChatLauncher = authenticated || isPublicHomeRoute;
  const shouldMountChatChrome = shouldShowChatLauncher && (
    !isPublicHomeRoute || publicHomeChromeReadyStage >= PUBLIC_HOME_CHROME_CHAT_READY_STAGE
  );
  const shouldMountPublicNavbar = !isPublicHomeRoute || publicHomeChromeReadyStage >= PUBLIC_HOME_CHROME_NAV_READY_STAGE;

  useEffect(() => {
    requestLoadTrace(`Layout mount authenticated=${authenticated}`);

    return () => {
      requestLoadTrace(`Layout unmount authenticated=${authenticated}`);
    };
  }, [authenticated]);

  useEffect(() => {
    if (visualQaStateOverride !== undefined) {
      return undefined;
    }

    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
    let fallbackTimeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
    let idleId: number | undefined;
    let hasRequestedFooter = false;
    let homeFirstCardReady = (window as HomeFirstCardReadyWindow).__begaHomeFirstCardReadyPathname === location.pathname;

    const requestFooter = () => {
      if (hasRequestedFooter) {
        return;
      }
      hasRequestedFooter = true;
      setLiveIsFooterRequested(true);
    };

    const requestFooterWhenReady = () => {
      if (!homeFirstCardReady || hasRequestedFooter) {
        return;
      }
      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(requestFooter, { timeout: PUBLIC_HOME_CHROME_IDLE_TIMEOUT_MS });
        return;
      }
      requestFooter();
    };

    if (isPublicHomeRoute) {
      setLiveIsFooterRequested(false);

      const handleHomeFirstCardReady = () => {
        const readyPathname = (window as HomeFirstCardReadyWindow).__begaHomeFirstCardReadyPathname;
        if (readyPathname !== location.pathname) {
          return;
        }
        homeFirstCardReady = true;
        requestFooterWhenReady();
      };

      window.addEventListener(HOME_FIRST_CARD_READY_EVENT, handleHomeFirstCardReady);
      requestFooterWhenReady();

      fallbackTimeoutId = globalThis.setTimeout(() => {
        homeFirstCardReady = true;
        requestFooterWhenReady();
      }, PUBLIC_HOME_FOOTER_FALLBACK_DELAY_MS);

      return () => {
        window.removeEventListener(HOME_FIRST_CARD_READY_EVENT, handleHomeFirstCardReady);
        if (idleId !== undefined && 'cancelIdleCallback' in window) {
          window.cancelIdleCallback(idleId);
        }
        if (fallbackTimeoutId !== undefined) {
          globalThis.clearTimeout(fallbackTimeoutId);
        }
      };
    }

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(requestFooter, { timeout: PUBLIC_HOME_CHROME_IDLE_TIMEOUT_MS });
    } else {
      timeoutId = globalThis.setTimeout(requestFooter, 450);
    }

    return () => {
      if (idleId !== undefined && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  }, [isPublicHomeRoute, location.pathname, visualQaStateOverride]);

  useEffect(() => {
    if (visualQaStateOverride !== undefined) {
      return undefined;
    }

    if (!isPublicHomeRoute) {
      setLivePublicHomeChromeReadyStage(PUBLIC_HOME_CHROME_CHAT_READY_STAGE);
      return undefined;
    }

    setLivePublicHomeChromeReadyStage(0);

    let minDelayTimeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
    let chatDelayTimeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
    let fallbackTimeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
    let chromeIdleId: number | undefined;
    let chatChromeIdleId: number | undefined;
    let hasRequestedChrome = false;
    let hasRequestedChatChrome = false;
    let minDelayElapsed = false;
    let chatDelayElapsed = false;
    let homeFirstCardReady = (window as HomeFirstCardReadyWindow).__begaHomeFirstCardReadyPathname === location.pathname;

    const requestChrome = () => {
      if (hasRequestedChrome) {
        return;
      }
      hasRequestedChrome = true;
      setLivePublicHomeChromeReadyStage((stage) => Math.max(stage, PUBLIC_HOME_CHROME_NAV_READY_STAGE));
    };

    const requestChatChrome = () => {
      if (hasRequestedChatChrome) {
        return;
      }
      hasRequestedChatChrome = true;
      setLivePublicHomeChromeReadyStage(PUBLIC_HOME_CHROME_CHAT_READY_STAGE);
    };

    const requestChromeWhenReady = () => {
      if (!minDelayElapsed || !homeFirstCardReady || hasRequestedChrome) {
        return;
      }
      if ('requestIdleCallback' in window) {
        chromeIdleId = window.requestIdleCallback(requestChrome, { timeout: PUBLIC_HOME_CHROME_IDLE_TIMEOUT_MS });
        return;
      }
      requestChrome();
    };

    const requestChatChromeWhenReady = () => {
      if (!chatDelayElapsed || !homeFirstCardReady || hasRequestedChatChrome) {
        return;
      }
      if ('requestIdleCallback' in window) {
        chatChromeIdleId = window.requestIdleCallback(requestChatChrome, { timeout: PUBLIC_HOME_CHROME_IDLE_TIMEOUT_MS });
        return;
      }
      requestChatChrome();
    };

    const handleHomeFirstCardReady = () => {
      const readyPathname = (window as HomeFirstCardReadyWindow).__begaHomeFirstCardReadyPathname;
      if (readyPathname !== location.pathname) {
        return;
      }
      homeFirstCardReady = true;
      requestChromeWhenReady();
      requestChatChromeWhenReady();
    };

    window.addEventListener(HOME_FIRST_CARD_READY_EVENT, handleHomeFirstCardReady);

    minDelayTimeoutId = globalThis.setTimeout(() => {
      minDelayElapsed = true;
      requestChromeWhenReady();
    }, PUBLIC_HOME_CHROME_MIN_DEFER_DELAY_MS);

    chatDelayTimeoutId = globalThis.setTimeout(() => {
      chatDelayElapsed = true;
      requestChatChromeWhenReady();
    }, PUBLIC_HOME_CHAT_CHROME_DEFER_DELAY_MS);

    fallbackTimeoutId = globalThis.setTimeout(() => {
      minDelayElapsed = true;
      chatDelayElapsed = true;
      homeFirstCardReady = true;
      requestChromeWhenReady();
      requestChatChromeWhenReady();
    }, PUBLIC_HOME_CHROME_FALLBACK_DELAY_MS);

    return () => {
      window.removeEventListener(HOME_FIRST_CARD_READY_EVENT, handleHomeFirstCardReady);
      if (chromeIdleId !== undefined && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(chromeIdleId);
      }
      if (chatChromeIdleId !== undefined && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(chatChromeIdleId);
      }
      if (minDelayTimeoutId !== undefined) {
        globalThis.clearTimeout(minDelayTimeoutId);
      }
      if (chatDelayTimeoutId !== undefined) {
        globalThis.clearTimeout(chatDelayTimeoutId);
      }
      if (fallbackTimeoutId !== undefined) {
        globalThis.clearTimeout(fallbackTimeoutId);
      }
    };
  }, [isPublicHomeRoute, location.pathname, visualQaStateOverride]);

  const authenticatedNavbarFallback = <PublicNavbarFallback />;
  const footerFallback = <div className="border-t border-zinc-200 dark:border-gray-800" />;

  return (
    <>
      {authenticated ? (
        navbarPhase === 'loading' ? authenticatedNavbarFallback : (
          <Suspense fallback={authenticatedNavbarFallback}>
            <NavbarComponent authenticatedShell />
          </Suspense>
        )
      ) : shouldMountPublicNavbar ? (
        publicNavbarPhase === 'loading' ? <PublicNavbarFallback /> : (
          <Suspense fallback={<PublicNavbarFallback />}>
            <PublicNavbarComponent />
          </Suspense>
        )
      ) : (
        <PublicNavbarFallback />
      )}
      <main className="min-h-screen bg-background text-base font-sans leading-relaxed text-foreground antialiased transition-colors duration-200 max-lg:mobile-chrome-safe-bottom">
        {visualQaOutletOverride !== undefined ? visualQaOutletOverride : <Outlet />}
      </main>
      {isFooterRequested ? (
        footerPhase === 'loading' ? footerFallback : (
          <Suspense fallback={footerFallback}>
            <FooterComponent />
          </Suspense>
        )
      ) : null}
      {shouldMountChatChrome && authenticatedLayoutChromePhase === 'resolved' && (
        <Suspense fallback={null}>
          <AuthenticatedLayoutChromeComponent enableAuthenticatedServices={authenticated} />
        </Suspense>
      )}
    </>
  );
}
