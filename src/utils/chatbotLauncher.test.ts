import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CHATBOT_OPEN_REQUEST_EVENT,
  PENDING_CHATBOT_OPEN_REQUEST_TTL_MS,
  consumePendingChatbotOpenRequest,
  requestChatbotOpen,
} from './chatbotLauncher';

test('requestChatbotOpen dispatches the shared launcher event', () => {
  const target = new EventTarget();
  let requestCount = 0;
  target.addEventListener(CHATBOT_OPEN_REQUEST_EVENT, () => {
    requestCount += 1;
  });

  requestChatbotOpen(target);

  assert.equal(requestCount, 1);
});

test('an open request remains pending until a late-mounted listener consumes it', () => {
  const target = new EventTarget();

  requestChatbotOpen(target);

  assert.equal(consumePendingChatbotOpenRequest(target), true);
  assert.equal(consumePendingChatbotOpenRequest(target), false);
});

test('a pending request is rejected after navigation or its short TTL', () => {
  const target = new EventTarget();

  requestChatbotOpen(target, '/home', 1_000);
  assert.equal(consumePendingChatbotOpenRequest(target, '/cheer', 1_001), false);

  requestChatbotOpen(target, '/home', 2_000);
  assert.equal(
    consumePendingChatbotOpenRequest(
      target,
      '/home',
      2_000 + PENDING_CHATBOT_OPEN_REQUEST_TTL_MS + 1,
    ),
    false,
  );
});
