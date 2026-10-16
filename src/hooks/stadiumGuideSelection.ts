import type { Stadium } from '../types/stadium';
import { STADIUM_ID_PATTERN } from '../utils/stadiumId';

export { STADIUM_ID_PATTERN };

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
  _previousSelected: Stadium | null,
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

  // No id in the URL (/stadium): the URL is the source of truth, so going back from
  // /stadium/<id> resets to the default (first) stadium instead of keeping the old one.
  return stadiums[0];
};
