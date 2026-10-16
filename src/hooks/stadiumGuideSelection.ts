import type { Stadium } from '../types/stadium';

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
    const preferred = stadiums.find((stadium) => stadium.stadiumId === preferredId);
    if (preferred) {
      return preferred;
    }
  }

  return stadiums.find((stadium) => stadium.stadiumId === previousSelected?.stadiumId) ?? stadiums[0];
};
