import type { Stadium } from '../types/stadium';

export const resolveSelectedStadium = (
  stadiums: Stadium[],
  previousSelected: Stadium | null,
): Stadium | null => {
  if (stadiums.length === 0) {
    return null;
  }

  return stadiums.find((stadium) => stadium.stadiumId === previousSelected?.stadiumId) ?? stadiums[0];
};
