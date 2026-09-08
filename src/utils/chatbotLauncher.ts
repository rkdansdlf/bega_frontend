export const CHATBOT_OPEN_REQUEST_EVENT = 'chatbot-open-requested';
export const PENDING_CHATBOT_OPEN_REQUEST_TTL_MS = 10_000;

type PendingChatbotOpenRequest = {
  contextKey?: string;
  requestedAt: number;
};

const pendingChatbotOpenRequests = new WeakMap<EventTarget, PendingChatbotOpenRequest>();

const getCurrentContextKey = (target: EventTarget) => (
  typeof window !== 'undefined' && target === window ? window.location.pathname : undefined
);

export const requestChatbotOpen = (
  target: EventTarget = window,
  contextKey = getCurrentContextKey(target),
  requestedAt = Date.now(),
) => {
  pendingChatbotOpenRequests.set(target, { contextKey, requestedAt });
  target.dispatchEvent(new Event(CHATBOT_OPEN_REQUEST_EVENT));
};

export const consumePendingChatbotOpenRequest = (
  target: EventTarget = window,
  contextKey = getCurrentContextKey(target),
  consumedAt = Date.now(),
) => {
  const pendingRequest = pendingChatbotOpenRequests.get(target);
  pendingChatbotOpenRequests.delete(target);
  if (!pendingRequest) {
    return false;
  }

  const isSameContext = pendingRequest.contextKey === undefined
    || pendingRequest.contextKey === contextKey;
  const isFresh = consumedAt - pendingRequest.requestedAt <= PENDING_CHATBOT_OPEN_REQUEST_TTL_MS;
  return isSameContext && isFresh;
};
