(function () {
  const recoveryPath = {
    test(pathname) {
      let decoded;
      try { decoded = decodeURIComponent(pathname); } catch { decoded = pathname; }
      return /^\/account\/deletion\/recovery\/*$/i.test(decoded);
    },
  };
  let freshNavigationStage = false;
  const stageRecoveryToken = (token) => {
    const generation = {};
    window.__begaRecoveryToken = token;
    window.__begaRecoveryTokenGeneration = generation;
    freshNavigationStage = true;
    queueMicrotask(() => { freshNavigationStage = false; });
    window.dispatchEvent(new Event('bega:recovery-token'));
    window.setTimeout(() => {
      if (window.__begaRecoveryTokenGeneration === generation) {
        delete window.__begaRecoveryToken;
        delete window.__begaRecoveryTokenGeneration;
      }
    }, 60000);
  };
  const clearStagedRecoveryToken = () => {
    delete window.__begaRecoveryToken;
    delete window.__begaRecoveryTokenGeneration;
  };
  const leaveRecovery = () => {
    clearStagedRecoveryToken();
    window.__begaRecoveryNavigationEpoch = (window.__begaRecoveryNavigationEpoch || 0) + 1;
    window.dispatchEvent(new Event('bega:recovery-token'));
  };
  window.addEventListener('popstate', () => {
    if (!recoveryPath.test(window.location.pathname)) leaveRecovery();
    else {
      const query = new URLSearchParams(window.location.search);
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      if (query.has('token') || fragment.has('token')) window.history.replaceState(window.history.state, '', window.location.href);
      else if (!freshNavigationStage) leaveRecovery();
    }
  });
  window.addEventListener('hashchange', () => {
    if (recoveryPath.test(window.location.pathname)) window.history.replaceState(window.history.state, '', window.location.href);
  });
  window.addEventListener('pagehide', leaveRecovery);
  if (recoveryPath.test(window.location.pathname)) {
    const params = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    if (params.has('token') || fragment.has('token')) {
      stageRecoveryToken(fragment.get('token') ?? params.get('token') ?? '');
      params.delete('token');
      const hasFragmentToken = fragment.has('token');
      fragment.delete('token');
      const remaining = params.toString();
      const remainingFragment = fragment.toString();
      const hash = hasFragmentToken ? (remainingFragment ? '#' + remainingFragment : '') : window.location.hash;
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + (remaining ? '?' + remaining : '') + hash,
      );
    }
  }

  for (const method of ['pushState', 'replaceState']) {
    const original = window.history[method];
    window.history[method] = function (state, unused, target) {
      if (target == null) return original.call(this, state, unused, target);
      let url;
      try { url = new URL(target, window.location.href); } catch { return original.call(this, state, unused, target); }
      if (url.origin !== window.location.origin) return original.call(this, state, unused, target);
      const query = new URLSearchParams(url.search);
      const fragment = new URLSearchParams(url.hash.slice(1));
      const hasToken = recoveryPath.test(url.pathname) && (query.has('token') || fragment.has('token'));
      const token = hasToken ? (fragment.get('token') ?? query.get('token') ?? '') : null;
      if (hasToken) {
        query.delete('token');
        const hasFragmentToken = fragment.has('token');
        fragment.delete('token');
        url.search = query.toString();
        if (hasFragmentToken) url.hash = fragment.toString();
      }
      const result = original.call(this, state, unused, hasToken ? url.href : target);
      if (hasToken) stageRecoveryToken(token);
      else if (!recoveryPath.test(url.pathname)) leaveRecovery();
      return result;
    };
  }

  const normalizeTheme = (value) => {
    if (typeof value !== 'string') {
      return null;
    }

    const stripQuotes = (raw) => {
      const trimmed = raw.trim();
      if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ) {
        return trimmed.slice(1, -1).trim();
      }
      return trimmed;
    };

    const getDirectTheme = (rawValue) => {
      const normalized = stripQuotes(rawValue).toLowerCase();
      if (normalized === 'dark' || normalized === 'light') {
        return normalized;
      }
      return null;
    };

    let normalized = getDirectTheme(value);
    if (normalized) {
      return normalized;
    }

    let candidate = value;
    for (let i = 0; i < 3; i += 1) {
      try {
        const parsed = JSON.parse(candidate);
        if (typeof parsed === 'string') {
          candidate = parsed;
          normalized = getDirectTheme(candidate);
          if (normalized) {
            return normalized;
          }
          continue;
        }

        if (
          parsed &&
          typeof parsed === 'object' &&
          typeof parsed.theme === 'string'
        ) {
          candidate = parsed.theme;
          normalized = getDirectTheme(candidate);
          if (normalized) {
            return normalized;
          }
          continue;
        }
      } catch (error) {
        break;
      }
      break;
    }

    return null;
  };

  const storedTheme = normalizeTheme(localStorage.getItem('kbo-theme'));
  const legacyTheme = normalizeTheme(localStorage.getItem('bega-theme'));
  const previousTheme = normalizeTheme(localStorage.getItem('theme'));
  const migrationTheme = legacyTheme || previousTheme;
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const theme = storedTheme || migrationTheme || (systemPrefersDark ? 'dark' : 'light');
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);

  const bgColor = theme === 'dark' ? '#000000' : '#ffffff';
  root.style.setProperty('--app-shell-bg', bgColor);
  if (theme === 'dark') {
    if (document.body) {
      document.body.style.backgroundColor = '#000000';
      document.body.style.color = '#ffffff';
    }
    root.style.backgroundColor = '#000000';
    root.style.color = '#ffffff';
  } else {
    if (document.body) {
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '';
    }
    root.style.backgroundColor = '';
    root.style.color = '';
  }

  const loader = document.getElementById('app-shell-loader');
  if (loader) {
    loader.style.backgroundColor = bgColor;
  }

  if (!storedTheme && migrationTheme) {
    localStorage.setItem('kbo-theme', migrationTheme);
    localStorage.removeItem('bega-theme');
    localStorage.removeItem('theme');
  } else if (storedTheme && localStorage.getItem('kbo-theme') !== storedTheme) {
    localStorage.setItem('kbo-theme', storedTheme);
  } else if (!storedTheme && !migrationTheme) {
    localStorage.removeItem('kbo-theme');
    localStorage.removeItem('bega-theme');
    localStorage.removeItem('theme');
  }
})();
