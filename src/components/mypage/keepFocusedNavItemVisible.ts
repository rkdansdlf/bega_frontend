import type { FocusEvent } from 'react';

const INLINE_SCROLL_GUTTER_PX = 12;

export const keepFocusedNavItemVisible = (event: FocusEvent<HTMLElement>) => {
  const scrollport = event.currentTarget;
  const focusedItem = event.target;

  if (!(focusedItem instanceof HTMLElement)) {
    return;
  }

  const scrollportRect = scrollport.getBoundingClientRect();
  const focusedItemRect = focusedItem.getBoundingClientRect();
  const visibleLeft = scrollportRect.left + scrollport.clientLeft + INLINE_SCROLL_GUTTER_PX;
  const visibleRight = scrollportRect.left + scrollport.clientLeft
    + scrollport.clientWidth - INLINE_SCROLL_GUTTER_PX;

  if (focusedItemRect.left < visibleLeft) {
    scrollport.scrollLeft += focusedItemRect.left - visibleLeft;
  } else if (focusedItemRect.right > visibleRight) {
    scrollport.scrollLeft += focusedItemRect.right - visibleRight;
  }
};
