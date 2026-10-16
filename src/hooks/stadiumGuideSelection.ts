import type { Stadium } from '../types/stadium';

/** Stadium ids are URL/path-safe slugs only. */
export const STADIUM_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export const isValidStadiumId = (value: unknown): value is string => (
  typeof value === 'string' && STADIUM_ID_PATTERN.test(value)
);

/**
 * True when the URL names a stadium id that is not in the loaded list.
 * Such routes must render NotFound (+ noindex) instead of silently showing another stadium.
 */
export const isUnknownRouteStadium = (
  stadiums: Stadium[],
  routeStadiumId?: string | null,
): boolean => {
  const routeId = routeStadiumId?.trim();
  if (!routeId) {
    return false;
  }
  if (!isValidStadiumId(routeId)) {
    return true;
  }
  return !stadiums.some((stadium) => stadium.stadiumId === routeId);
};

export const resolveSelectedStadium = (
  stadiums: Stadium[],
  previousSelected: Stadium | null,
  preferredStadiumId?: string | null,
): Stadium | null => {
  if (stadiums.length === 0) {
    return null;
  }

  const preferredId = preferredStadiumId?.trim();
  if (preferredId) {
    // Unknown route id: never fall back to another stadium (soft-404 guard).
    return stadiums.find((stadium) => stadium.stadiumId === preferredId) ?? null;
  }

  return stadiums.find((stadium) => stadium.stadiumId === previousSelected?.stadiumId) ?? stadiums[0];
};
