import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { peekInitialRecoveryToken, withoutRecoveryToken } from '../utils/accountRecoveryToken';
import { clearInitialRecoveryToken, recoveryNavigationEpoch, recoveryTokenGeneration, stageFallbackRecoveryToken } from '../utils/accountRecoveryTokenStage';

const AccountDeletionRecovery = lazy(() => import('./AccountDeletionRecovery'));

export default function RecoveryEntry() {
  const location = useLocation();
  const navigate = useNavigate();
  const [capture, setCapture] = useState(() => ({ token: peekInitialRecoveryToken() ?? '', version: 0, epoch: recoveryNavigationEpoch() }));
  const [ready, setReady] = useState(false);
  const [, setTokenRevision] = useState(0);
  const query = new URLSearchParams(location.search);
  const fragment = new URLSearchParams(location.hash.slice(1));
  const containsToken = query.has('token') || fragment.has('token');
  const stagedToken = peekInitialRecoveryToken();
  const stagedGeneration = recoveryTokenGeneration();
  const epoch = recoveryNavigationEpoch();

  useEffect(() => {
    const handleToken = () => setTokenRevision((value) => value + 1);
    const discardOnPageHide = () => {
      clearInitialRecoveryToken();
      setCapture((previous) => ({ token: '', version: previous.version + 1, epoch: recoveryNavigationEpoch() }));
    };
    const discardOnPopState = () => {
      const query = new URLSearchParams(window.location.search);
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      if (!query.has('token') && !fragment.has('token') && peekInitialRecoveryToken() === null) {
        setCapture((previous) => ({ token: '', version: previous.version + 1, epoch: recoveryNavigationEpoch() }));
      }
    };
    window.addEventListener('bega:recovery-token', handleToken);
    window.addEventListener('pagehide', discardOnPageHide);
    window.addEventListener('popstate', discardOnPopState);
    return () => {
      window.removeEventListener('bega:recovery-token', handleToken);
      window.removeEventListener('pagehide', discardOnPageHide);
      window.removeEventListener('popstate', discardOnPopState);
    };
  }, []);

  useLayoutEffect(() => {
    if (containsToken && stagedToken === null) {
      const generation = stageFallbackRecoveryToken(fragment.get('token') ?? query.get('token') ?? '');
      const safeUrl = withoutRecoveryToken(location.pathname, location.search, location.hash);
      window.history.replaceState(window.history.state, '', safeUrl);
      queueMicrotask(() => {
        if (`${window.location.pathname}${window.location.search}${window.location.hash}` === safeUrl) {
          navigate(safeUrl, { replace: true, state: location.state });
        } else {
          clearInitialRecoveryToken(generation);
        }
      });
      return;
    }
    if (containsToken || stagedToken !== null) {
      if (stagedGeneration && !clearInitialRecoveryToken(stagedGeneration)) {
        setTokenRevision((value) => value + 1);
        return;
      }
      const token = stagedToken ?? fragment.get('token') ?? query.get('token') ?? '';
      setCapture((previous) => ({ token, version: previous.version + 1, epoch }));
    } else if (capture.epoch !== epoch) {
      setCapture((previous) => ({ token: '', version: previous.version + 1, epoch }));
    }
    if (containsToken) {
      const safeUrl = withoutRecoveryToken(location.pathname, location.search, location.hash);
      window.history.replaceState(window.history.state, '', safeUrl);
      navigate(safeUrl, { replace: true, state: location.state });
    }
    setReady(true);
  }, [location.pathname, location.search, location.hash, location.state, location.key, navigate, containsToken, stagedToken, stagedGeneration, capture.epoch, epoch]);

  if (!ready || containsToken || stagedToken !== null || capture.epoch !== epoch) return null;
  return <Suspense fallback={null}><AccountDeletionRecovery key={capture.version} tokenOverride={capture.token} /></Suspense>;
}
