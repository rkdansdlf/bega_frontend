import { Children, isValidElement, type PropsWithChildren, useEffect } from 'react';
import type { ReactNode } from 'react';

type HelmetProps = PropsWithChildren<{
  prioritizeSeoTags?: boolean;
}>;

const MANAGED_ATTR = 'data-bega-helmet';

// Selector for tags this one replaces (prerendered static or another Helmet's), so meta is
// replaced rather than duplicated. Last applied Helmet wins per key.
export const getDedupeSelector = (tag: string, props: Record<string, unknown>): string | null => {
  if (tag === 'meta') {
    const key = props.name ? 'name' : props.property ? 'property' : '';
    return key ? `meta[${key}="${String(props[key])}"]` : null;
  }
  if (tag === 'link') {
    return props.rel === 'canonical' ? 'link[rel="canonical"]' : null;
  }
  return props.type === 'application/ld+json' ? 'script[data-seo-jsonld]' : null;
};

const getElementText = (value: ReactNode): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(getElementText).join('');
  }
  return '';
};

const toManagedElement = (tagName: string, props: Record<string, unknown>): HTMLElement => {
  const element = document.createElement(tagName);
  element.setAttribute(MANAGED_ATTR, 'true');

  Object.entries(props).forEach(([key, value]) => {
    if (value == null || key === 'children' || key === 'dangerouslySetInnerHTML') {
      return;
    }

    if (key === 'className') {
      element.setAttribute('class', String(value));
      return;
    }

    if (typeof value === 'boolean') {
      if (value) {
        element.setAttribute(key, '');
      }
      return;
    }

    element.setAttribute(key, String(value));
  });

  const htmlPayload = props.dangerouslySetInnerHTML as { __html?: string } | undefined;
  if (htmlPayload?.__html) {
    element.innerHTML = htmlPayload.__html;
  } else if (props.children) {
    element.textContent = getElementText(props.children as ReactNode);
  }

  return element;
};

export function HelmetProvider({ children }: PropsWithChildren) {
  return <>{children}</>;
}

export function Helmet({ children }: HelmetProps) {
  useEffect(() => {
    const created: HTMLElement[] = [];
    const nodes = Children.toArray(children);
    for (const node of nodes) {
      if (!isValidElement(node) || typeof node.type !== 'string') {
        continue;
      }

      const tag = node.type.toLowerCase();
      const props = node.props as Record<string, unknown>;

      if (tag === 'html') {
        if (typeof props.lang === 'string') {
          document.documentElement.lang = props.lang;
        }
        continue;
      }

      if (tag === 'title') {
        document.title = getElementText(props.children as ReactNode);
        continue;
      }

      if (tag === 'meta' || tag === 'link' || tag === 'script') {
        const selector = getDedupeSelector(tag, props);
        if (selector) {
          document.head.querySelectorAll(selector).forEach((node) => node.remove());
        }
        const element = toManagedElement(tag, props);
        document.head.appendChild(element);
        created.push(element);
      }
    }

    return () => created.forEach((node) => node.remove());
  }, [children]);

  return null;
}
