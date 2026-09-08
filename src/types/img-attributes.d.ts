/**
 * `@types/react` is on v19 while the `react`/`react-dom` runtime is on v18.3.
 * React 19 types expose the camelCase `fetchPriority` prop, but the React 18 DOM
 * renderer does not recognize it — it logs "React does not recognize the
 * `fetchPriority` prop on a DOM element" and strips the attribute, so the priority
 * hint never reaches the browser.
 *
 * React 18 does pass through unknown *lowercase* attributes verbatim, so we spell it
 * `fetchpriority` (the actual HTML attribute name) and declare it here.
 *
 * Remove this file once the runtime is upgraded to React 19, and switch the call
 * sites back to `fetchPriority`.
 */
import 'react';

declare module 'react' {
  interface ImgHTMLAttributes<T> {
    fetchpriority?: 'high' | 'low' | 'auto';
  }
}
