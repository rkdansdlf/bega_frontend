import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import LazyEmojiPicker from './LazyEmojiPicker';

const recentEmojis = [
  '⚾', '🏟️', '📣', '🔥', '👏', '🙌', '💪', '🏆', '🎯',
  '🚀', '⭐', '🥎', '🎉', '🎊', '🥇', '📢', '😀', '😆',
];

test('lazy emoji picker clamps unsafe dimensions and renders the maximum recent inventory', () => {
  const markup = renderToStaticMarkup(createElement(
    LazyEmojiPicker,
    {
      height: 40,
      isDarkMode: true,
      onEmojiSelect: () => undefined,
      visualQaStateOverride: {
        activeGroupId: 'recent',
        query: '',
        recentEmojis,
      },
      width: 40,
    },
  ));

  assert.match(markup, /data-testid="lazy-emoji-picker"/);
  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-label="이모지 선택기"/);
  assert.match(markup, /style="[^"]*width:280px[^"]*height:320px/);
  assert.equal(markup.match(/data-testid="lazy-emoji-picker-emoji-[0-9]+"/g)?.length, 18);
  assert.equal(markup.match(/data-vqa-min-touch="44"/g)?.length, 24);
  assert.match(markup, /aria-pressed="true" data-testid="lazy-emoji-picker-group-recent"/);
  assert.match(markup, /min-h-11 shrink-0 rounded-full px-2 py-2 text-label/);
  assert.match(markup, /data-testid="lazy-emoji-picker-selection-status"/);
});

test('lazy emoji picker exposes labelled search, empty feedback, and mobile-safe grid classes', () => {
  const emptyMarkup = renderToStaticMarkup(createElement(
    LazyEmojiPicker,
    {
      isDarkMode: false,
      onEmojiSelect: () => undefined,
      visualQaStateOverride: {
        activeGroupId: 'baseball',
        query: `NO-RESULT-${'UNBROKEN'.repeat(18)}`,
        recentEmojis: [],
      },
    },
  ));
  const populatedMarkup = renderToStaticMarkup(createElement(
    LazyEmojiPicker,
    {
      isDarkMode: false,
      onEmojiSelect: () => undefined,
      visualQaStateOverride: {
        activeGroupId: 'baseball',
        query: 'baseball',
        recentEmojis: [],
      },
    },
  ));

  assert.match(emptyMarkup, /data-testid="lazy-emoji-picker-search"/);
  assert.match(emptyMarkup, /aria-label="이모지 검색"/);
  assert.match(emptyMarkup, /data-vqa-min-touch="44"/);
  assert.match(emptyMarkup, /role="status"/);
  assert.match(emptyMarkup, /검색 결과가 없습니다/);
  assert.match(
    populatedMarkup,
    /grid-template-columns:repeat\(auto-fit, minmax\(2\.75rem, 1fr\)\)/,
  );
  assert.match(populatedMarkup, /min-h-0 flex-1 overflow-y-auto/);
});

test('emoji picker callers keep the trigger reachable and anchor the mobile popup inside the dialog', async () => {
  const [pickerSource, commentSource, writeSource] = await Promise.all([
    readFile(new URL('./LazyEmojiPicker.tsx', import.meta.url), 'utf8'),
    readFile(new URL('./CommentModal.tsx', import.meta.url), 'utf8'),
    readFile(new URL('./CheerWriteModal.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(pickerSource, /import\.meta\.env\?\.PROD === true/);
  assert.match(commentSource, /aria-label="이모지 선택"/);
  assert.match(commentSource, /h-11 w-11[^"\n]*focus-visible:ring-2/);
  assert.match(writeSource, /absolute top-full left-0 z-50 mt-2 sm:left-auto sm:right-0/);
});
