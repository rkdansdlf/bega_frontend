/**
 * Stadium detail title/description, matching scripts/seo-dynamic-pages.mjs
 * buildStadiumDetailRoute so the runtime head equals the prerendered head.
 * Lives outside routeSeo.ts so it stays in the stadium route chunk, not the shared entry chunk.
 */
export interface StadiumSeoInput {
  stadiumId: string;
  stadiumName?: string | null;
  team?: string | null;
}

export const buildStadiumDetailSeo = (stadium: StadiumSeoInput) => {
  const name = stadium.stadiumName?.trim() || stadium.stadiumId;
  const teamSuffix = stadium.team ? ` (${stadium.team})` : '';
  return {
    title: `${name} 구장 가이드 | BEGA`,
    description: `${name}${teamSuffix}의 좌석·주변 시설·방문 정보를 BEGA 구장 가이드에서 확인하세요.`,
  };
};

/**
 * /stadium (listing) copy. Must equal seo-routes.json headOnlyIndexableRoutes[/stadium]
 * (asserted in stadiumDetailSeo.test.ts). Not imported from the JSON on purpose: a shared JSON
 * import would pull the entry into the shared entry chunk.
 */
export const STADIUM_INDEX_SEO = {
  title: 'KBO 구장 가이드 | BEGA',
  description: 'KBO 구장별 좌석·주변 맛집·편의시설 정보를 한곳에서 확인하세요.',
};
