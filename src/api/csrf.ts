const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

export const readCookieValue = (cookieHeader: string, cookieName: string): string | null => {
  const normalizedName = cookieName.trim();
  if (!normalizedName || CONTROL_CHARACTER_PATTERN.test(normalizedName)) {
    return null;
  }

  for (const rawPart of cookieHeader.split(';')) {
    const part = rawPart.trim();
    const separatorIndex = part.indexOf('=');
    if (separatorIndex < 0 || part.slice(0, separatorIndex).trim() !== normalizedName) {
      continue;
    }

    const rawValue = part.slice(separatorIndex + 1);
    if (!rawValue) {
      return null;
    }

    let value: string;
    try {
      value = decodeURIComponent(rawValue);
    } catch {
      return null;
    }

    return value && !CONTROL_CHARACTER_PATTERN.test(value) ? value : null;
  }

  return null;
};

export const getLogoutXsrfToken = (): string | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  try {
    return readCookieValue(document.cookie, 'XSRF-TOKEN');
  } catch {
    return null;
  }
};
