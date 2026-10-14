import { getLuminance } from '../../utils/teamColors';

export type CheerTabKey = 'all' | 'popular' | 'following' | 'live';
export type CheerContentFeedTabKey = Exclude<CheerTabKey, 'live'>;
export type CheerSurface = 'feed' | 'search' | 'live';
export type LinkedPostTarget =
  | { postType: 'CHECKIN'; diaryId: number }
  | { postType: 'RECRUITMENT'; partyId: number };

const CHEER_TAB_KEYS: readonly CheerTabKey[] = ['all', 'popular', 'following', 'live'];
const CHEER_LIGHT_TEXT = '#FFFFFF';
const CHEER_DARK_TEXT = '#0F172A';

const parsePositiveRouteId = (value: string | null): number | null => {
  if (value === null || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

export const parseLinkedTarget = (
  postType: string | null,
  diaryId: string | null,
  partyId: string | null,
): LinkedPostTarget | null => {
  if (postType === 'CHECKIN' && partyId === null) {
    const parsedDiaryId = parsePositiveRouteId(diaryId);
    return parsedDiaryId === null ? null : { postType, diaryId: parsedDiaryId };
  }
  if (postType === 'RECRUITMENT' && diaryId === null) {
    const parsedPartyId = parsePositiveRouteId(partyId);
    return parsedPartyId === null ? null : { postType, partyId: parsedPartyId };
  }
  return null;
};

const parseHexColor = (value: string): string | null => {
  const compact = value.trim().replace(/^#/, '');
  const normalized = compact.length === 3
    ? compact.split('').map((character) => character.repeat(2)).join('')
    : compact;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return `#${normalized}`;
};

const contrastRatio = (first: number, second: number): number => (
  (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
);

export const getAccessibleCheerTextColor = (backgroundColor: string): string => {
  const parsedBackground = parseHexColor(backgroundColor);
  if (!parsedBackground) return CHEER_DARK_TEXT;

  const backgroundLuminance = getLuminance(parsedBackground);
  const lightContrast = contrastRatio(backgroundLuminance, 1);
  const darkContrast = contrastRatio(backgroundLuminance, getLuminance(CHEER_DARK_TEXT));
  return lightContrast >= darkContrast ? CHEER_LIGHT_TEXT : CHEER_DARK_TEXT;
};

export const normalizeCheerSearchQuery = (value: string): string => (
  value.trim().replace(/\s+/g, ' ')
);

export const resolveCheerSurface = (
  activeTab: CheerTabKey,
  searchQuery: string,
): CheerSurface => {
  if (normalizeCheerSearchQuery(searchQuery)) {
    return 'search';
  }

  return activeTab === 'live' ? 'live' : 'feed';
};

export const resolveCheerTabFromParam = (value: string | null): CheerTabKey => (
  CHEER_TAB_KEYS.includes(value as CheerTabKey) ? value as CheerTabKey : 'all'
);

export const resolveCheerContentFeedTab = (tab: CheerTabKey): CheerContentFeedTabKey => (
  tab === 'live' ? 'all' : tab
);
