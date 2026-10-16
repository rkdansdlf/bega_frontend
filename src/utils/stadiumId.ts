/**
 * Single source of truth for stadium id shape (URL/path-safe slug).
 * Also mirrored in scripts/seo-dynamic-pages.mjs (plain Node, cannot import TS);
 * scripts/seo-dynamic-pages.test.mjs asserts both stay identical.
 *
 * NOTE: stadium detail pages are prerendered at build time and the worker 404s any
 * non-prerendered id, so adding a new stadium requires a frontend redeploy.
 */
export const STADIUM_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
