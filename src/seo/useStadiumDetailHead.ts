import { useEffect } from 'react';

import type { buildStadiumDetailSeo } from './stadiumDetailSeo';

type StadiumDetailSeo = ReturnType<typeof buildStadiumDetailSeo>;

const HEAD_KEYS: Array<[attr: 'name' | 'property', key: string, field: keyof StadiumDetailSeo]> = [
  ['name', 'description', 'description'],
  ['property', 'og:title', 'title'],
  ['property', 'og:description', 'description'],
  ['name', 'twitter:title', 'title'],
  ['name', 'twitter:description', 'description'],
];

/**
 * Sets the stadium detail title/description in place (updates the prerendered tags, or creates
 * them on client-side navigation) so nothing is duplicated. Also owns canonical + robots. Lives in the stadium route chunk;
 * For /stadium/:id SeoHead emits no tags (routeSeo headOnly rule), keeping prerendered values.
 * On unmount the tags are removed so the next route's SeoHead tags don't duplicate them.
 */
const upsert = (selector: string, tag: string, attrs: Record<string, string>) => {
  let element = document.head.querySelector<HTMLElement>(selector);
  if (!element) {
    element = document.createElement(tag);
    document.head.appendChild(element);
  }
  Object.entries(attrs).forEach(([key, value]) => element!.setAttribute(key, value));
  return element;
};

export const useStadiumDetailHead = (seo: StadiumDetailSeo | null, canonicalUrl?: string) => {
  const title = seo?.title;
  const description = seo?.description;

  useEffect(() => {
    if (!title || !description || typeof document === 'undefined') {
      return undefined;
    }
    const values: StadiumDetailSeo = { title, description };
    document.title = title;
    const touched = HEAD_KEYS.map(([attr, key, field]) => (
      upsert(`meta[${attr}="${key}"]`, 'meta', { [attr]: key, content: values[field] })
    ));
    touched.push(upsert('meta[name="robots"]', 'meta', { name: 'robots', content: 'index,follow' }));
    if (canonicalUrl) {
      touched.push(upsert('link[rel="canonical"]', 'link', { rel: 'canonical', href: canonicalUrl }));
    }
    return () => touched.forEach((element) => element.remove());
  }, [title, description, canonicalUrl]);
};
