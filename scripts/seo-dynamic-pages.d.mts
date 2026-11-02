// Type declarations for scripts/seo-dynamic-pages.mjs (consumed by TS tests).
export interface DynamicStadium {
  stadiumId: string;
  stadiumName?: string | null;
  team?: string | null;
}

export interface StadiumDetailRoute {
  path: string;
  title: string;
  description: string;
  heading: string;
  performanceShell: boolean;
  schemaType: string;
  changefreq: string;
  priority: string;
  lastmodSource: string;
}

export const STADIUM_ID_PATTERN: RegExp;
export function isSafeStadiumId(value: unknown): value is string;
export function filterSafeStadiums<T extends { stadiumId?: unknown }>(
  stadiums: T[],
  options?: { warn?: (message: string) => void },
): T[];
export function resolveMinStadiumCount(env?: Record<string, string | undefined>): number;
export function assertMinStadiumCount(count: number, minCount: number, reason?: string): void;
export function buildStadiumDetailRoute(stadium: DynamicStadium): StadiumDetailRoute;
export function fetchPublicStadiums(options?: { timeoutMs?: number }): Promise<DynamicStadium[]>;
export function prerenderDynamicStadiumPages(options?: {
  fetchStadiums?: () => Promise<DynamicStadium[]>;
}): Promise<Array<Record<string, unknown>>>;
export function resolveApiBaseUrl(): string;
export const projectRoot: string;
