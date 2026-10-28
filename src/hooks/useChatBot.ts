import { startTransition, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { normalizeAiDataSources, normalizeAiToolCalls } from '../api/aiMeta';
import {
  CHATBOT_STATUS_RATE_LIMIT,
  CHATBOT_STATUS_SERVICE_UNAVAILABLE,
  CHATBOT_STREAM_INCOMPLETE_ERROR,
  CHATBOT_STREAM_TEMPORARY_ERROR,
  CHATBOT_STREAM_TIMEOUT_ERROR,
  isChatStreamStatusError,
  isStreamAbortError,
} from '../api/stream';
import { useAuthSession } from '../store/authStore';
import {
  getViewerScopedStorageKey,
  type ViewerId,
} from '../utils/viewerScopedDraftStorage';
import { isViewerQueryScopeCurrent, type ViewerQueryScope } from '../utils/viewerQueryScope';
import {
  ChatFavoriteItem,
  ChatMeta,
  ChatMessageStatus,
  ChatQueueStatus,
  ChatSessionSummary,
  Message,
  StoredChatMessage,
} from '../types/chatbot';
import { appendTextToBotMessage, buildHistoryPayload } from '../utils/chatbot';

const GREETING_TEXT = '안녕하세요! 야구 가이드 BEGA입니다. 무엇을 도와드릴까요?';
const CURRENT_SESSION_STORAGE_KEY = 'chatbot_current_session_id';
const CURRENT_SESSION_TITLE_STORAGE_KEY = 'chatbot_current_session_title';
const PENDING_MESSAGE_STORAGE_KEY = 'last_pending_msg';
const DEFAULT_RETRY_SECONDS = 10;
const MAX_BACKOFF_SECONDS = 40;
const JITTER_MIN_SECONDS = 1;
const JITTER_MAX_SECONDS = 2;
const SESSION_TITLE_LIMIT = 60;
const SESSION_PREVIEW_LIMIT = 220;
const STREAMING_BUFFER_FLUSH_INTERVAL_MS = 64;

export const getChatBotCurrentSessionStorageKey = (viewerId: ViewerId): string | null =>
  getViewerScopedStorageKey(CURRENT_SESSION_STORAGE_KEY, viewerId);
export const getChatBotCurrentSessionTitleStorageKey = (viewerId: ViewerId): string | null =>
  getViewerScopedStorageKey(CURRENT_SESSION_TITLE_STORAGE_KEY, viewerId);
export const getChatBotPendingMessageStorageKey = (viewerId: ViewerId): string | null =>
  getViewerScopedStorageKey(PENDING_MESSAGE_STORAGE_KEY, viewerId);

type QueuedMessage = {
  viewerScope: ViewerQueryScope;
  sessionId: number;
  historyPayload: Array<{ role: 'user' | 'assistant'; content: string }> | null;
  userMessage: Message;
};

type RateLimitLikeError = Error & {
  retryAfterSeconds?: number;
};

type ChatStreamEventLikeError = Error & {
  detail?: string | null;
  eventCode?: string;
  upstreamMessage?: string;
  upstreamMessageIsPublic?: boolean;
};

let chatSessionsModulePromise: Promise<typeof import('../api/chatSessions')> | null = null;
let chatBotStreamModulePromise: Promise<typeof import('../api/chatbot')> | null = null;

const loadChatSessionsModule = () => {
  if (!chatSessionsModulePromise) {
    chatSessionsModulePromise = import('../api/chatSessions');
  }
  return chatSessionsModulePromise;
};

const loadChatBotStreamModule = () => {
  if (!chatBotStreamModulePromise) {
    chatBotStreamModulePromise = import('../api/chatbot');
  }
  return chatBotStreamModulePromise;
};

const isRateLimitLikeError = (error: unknown): error is RateLimitLikeError =>
  error instanceof Error
  && error.name === 'RateLimitError'
  && typeof (error as RateLimitLikeError).retryAfterSeconds === 'number';

const isChatStreamEventLikeError = (error: unknown): error is ChatStreamEventLikeError => {
  if (!(error instanceof Error) || error.name !== 'ChatStreamEventError') {
    return false;
  }
  const candidate = error as ChatStreamEventLikeError;
  return (candidate.detail == null || typeof candidate.detail === 'string')
    && (candidate.upstreamMessage === undefined || typeof candidate.upstreamMessage === 'string')
    && (candidate.upstreamMessageIsPublic === undefined
      || typeof candidate.upstreamMessageIsPublic === 'boolean');
};

const createMessageId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const readStoredSessionId = (viewerId: ViewerId): number | null => {
  const storageKey = getChatBotCurrentSessionStorageKey(viewerId);
  if (!storageKey) return null;

  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const readStoredSessionTitle = (viewerId: ViewerId): string => {
  const storageKey = getChatBotCurrentSessionTitleStorageKey(viewerId);
  if (!storageKey) return AiChatSessionTitleFallback;

  try {
    const raw = sessionStorage.getItem(storageKey);
    return raw && raw.trim().length > 0 ? raw : AiChatSessionTitleFallback;
  } catch {
    return AiChatSessionTitleFallback;
  }
};

const persistSessionState = (sessionId: number | null, title: string, viewerId: ViewerId): void => {
  const sessionStorageKey = getChatBotCurrentSessionStorageKey(viewerId);
  const titleStorageKey = getChatBotCurrentSessionTitleStorageKey(viewerId);
  if (!sessionStorageKey || !titleStorageKey) return;

  try {
    if (sessionId === null) {
      sessionStorage.removeItem(sessionStorageKey);
      sessionStorage.removeItem(titleStorageKey);
      return;
    }
    sessionStorage.setItem(sessionStorageKey, String(sessionId));
    sessionStorage.setItem(titleStorageKey, title);
  } catch {
    // sessionStorage 사용 실패 시 무시
  }
};

const readStoredPendingMessage = (viewerId: ViewerId): string => {
  const storageKey = getChatBotPendingMessageStorageKey(viewerId);
  if (!storageKey) return '';

  try {
    return sessionStorage.getItem(storageKey) ?? '';
  } catch {
    return '';
  }
};

const clearStoredChatUiState = (viewerId: ViewerId): void => {
  const sessionStorageKey = getChatBotCurrentSessionStorageKey(viewerId);
  const titleStorageKey = getChatBotCurrentSessionTitleStorageKey(viewerId);
  const pendingMessageStorageKey = getChatBotPendingMessageStorageKey(viewerId);
  if (!sessionStorageKey || !titleStorageKey || !pendingMessageStorageKey) return;

  try {
    sessionStorage.removeItem(sessionStorageKey);
    sessionStorage.removeItem(titleStorageKey);
    sessionStorage.removeItem(pendingMessageStorageKey);
  } catch {
    // storage 사용 실패 시 무시
  }
};

const trimPreview = (text: string, limit: number): string => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit - 3).trim()}...`;
};

const buildSessionTitle = (text: string): string => trimPreview(text, SESSION_TITLE_LIMIT);
const buildSessionPreview = (text: string): string => trimPreview(text, SESSION_PREVIEW_LIMIT);

const sortSessions = (items: ChatSessionSummary[]): ChatSessionSummary[] => [...items].sort(
  (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
);

const normalizeStoredMessage = (message: StoredChatMessage): Message => ({
  id: `stored-${message.messageId}`,
  serverId: message.messageId,
  sessionId: message.sessionId,
  text: message.content,
  sender: message.role === 'USER' ? 'user' : 'bot',
  timestamp: new Date(message.createdAt),
  status: message.status,
  isError: message.status === 'ERROR',
  cancelled: message.cancelled || message.status === 'CANCELLED',
  favorite: message.favorite,
  verified: message.verified ?? undefined,
  cached: message.cached ?? undefined,
  citations: normalizeAiDataSources(message.citations ?? undefined),
  toolCalls: normalizeAiToolCalls(message.toolCalls ?? undefined),
  intent: message.intent ?? undefined,
  strategy: message.strategy ?? undefined,
  plannerMode: message.plannerMode ?? undefined,
  plannerCacheHit: message.plannerCacheHit ?? undefined,
  toolExecutionMode: message.toolExecutionMode ?? undefined,
  fallbackReason: message.fallbackReason ?? undefined,
  finishReason: message.finishReason ?? undefined,
  errorCode: message.errorCode ?? undefined,
  metadata: message.metadata ?? null,
});

const createOptimisticUserMessage = (stored: StoredChatMessage): Message => normalizeStoredMessage(stored);

const createBotPlaceholder = (sessionId: number, botMessageId: string): Message => ({
  id: botMessageId,
  sessionId,
  text: '',
  sender: 'bot',
  timestamp: new Date(),
  status: 'COMPLETED',
  cancelled: false,
  isError: false,
});

const createSystemGreeting = (): Message => ({
  id: createMessageId(),
  text: '',
  sender: 'bot',
  timestamp: new Date(),
  isSystem: true,
  status: 'COMPLETED',
});

const buildAssistantPersistencePayload = (
  content: string,
  status: ChatMessageStatus,
  meta: ChatMeta | null,
  overrides?: Partial<{
    cancelled: boolean;
    errorCode: string | null;
  }>,
): Record<string, unknown> => ({
  content,
  status,
  verified: meta?.verified ?? false,
  cached: meta?.cached ?? false,
  intent: meta?.intent,
  strategy: meta?.strategy,
  finishReason: meta?.finish_reason,
  cancelled: overrides?.cancelled ?? meta?.cancelled ?? status === 'CANCELLED',
  errorCode: overrides?.errorCode ?? meta?.error ?? null,
  plannerMode: meta?.plannerMode,
  plannerCacheHit: meta?.plannerCacheHit,
  toolExecutionMode: meta?.toolExecutionMode,
  fallbackReason: meta?.fallbackReason,
  metadata: {
    verified: meta?.verified ?? false,
    cached: meta?.cached ?? false,
    intent: meta?.intent,
    strategy: meta?.strategy,
    finish_reason: meta?.finish_reason,
    cancelled: overrides?.cancelled ?? meta?.cancelled ?? status === 'CANCELLED',
    error: overrides?.errorCode ?? meta?.error ?? null,
    planner_mode: meta?.plannerMode,
    planner_cache_hit: meta?.plannerCacheHit,
    tool_execution_mode: meta?.toolExecutionMode,
    fallback_reason: meta?.fallbackReason,
    perf: meta?.perf,
    data_sources: meta?.dataSources ?? [],
    tool_calls: meta?.toolCalls ?? [],
  },
  citations: meta?.dataSources ?? [],
  toolCalls: meta?.toolCalls ?? [],
});

export const resolveChatBotFailureText = (error: unknown): string => {
  if (isRateLimitLikeError(error) || isChatStreamStatusError(error, CHATBOT_STATUS_RATE_LIMIT)) {
    return '요청이 많아 잠시 후 다시 시도해주세요.';
  }
  if (isChatStreamStatusError(error, CHATBOT_STATUS_SERVICE_UNAVAILABLE)) {
    return '서비스 점검 중이거나 일시적인 오류입니다.';
  }
  if (isChatStreamStatusError(error, CHATBOT_STREAM_TIMEOUT_ERROR)) {
    return '응답 시간이 초과되었습니다.';
  }
  if (isChatStreamStatusError(error, CHATBOT_STREAM_INCOMPLETE_ERROR)) {
    return '응답이 중단되었습니다. 다시 시도해주세요.';
  }
  if (isChatStreamEventLikeError(error) || isChatStreamStatusError(error, CHATBOT_STREAM_TEMPORARY_ERROR)) {
    return isChatStreamEventLikeError(error)
      ? error.detail
        || (error.upstreamMessageIsPublic ? error.upstreamMessage : null)
        || '일시적인 오류가 발생했습니다. 다시 시도해주세요.'
      : '일시적인 오류가 발생했습니다. 다시 시도해주세요.';
  }
  return '응답 중 오류가 발생했습니다. 다시 시도해주세요.';
};

export const useChatBot = (initialOpen = false) => {
  const { isLoggedIn, userId, sessionEpoch } = useAuthSession();
  const viewerScope: ViewerQueryScope = { viewerId: userId, sessionEpoch };
  const previousViewerScopeRef = useRef<ViewerQueryScope>(viewerScope);

  const [isOpen, setIsOpen] = useState(initialOpen);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(() => readStoredSessionId(userId));
  const [currentSessionTitle, setCurrentSessionTitle] = useState<string>(() => readStoredSessionTitle(userId));
  const [sessionViewerId, setSessionViewerId] = useState(userId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
  const [rateLimitActive, setRateLimitActive] = useState(false);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [queueStatus, setQueueStatus] = useState<ChatQueueStatus | null>(null);
  const [failureCount, setFailureCount] = useState(0);
  const [pendingMessage, setPendingMessage] = useState(() => readStoredPendingMessage(userId));
  const [isLoadingMessages, setIsLoadingMessages] = useState(() => readStoredSessionId(userId) !== null);
  const [sessionListVersion, setSessionListVersion] = useState(0);
  const [favoritesVersion, setFavoritesVersion] = useState(0);
  const isViewerStateReady = sessionViewerId === userId;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const currentSessionIdRef = useRef<number | null>(currentSessionId);
  const currentSessionTitleRef = useRef<string>(currentSessionTitle);
  const locallyCreatedSessionIdRef = useRef<number | null>(null);
  const activeStreamAbortControllerRef = useRef<AbortController | null>(null);
  const activeBotMessageIdRef = useRef<string | null>(null);
  const activeBotMessageIndexRef = useRef<number | null>(null);
  const activeRequestSeqRef = useRef(0);
  const streamingBuffer = useRef('');
  const streamingFlushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateBotMessageById = (
    botMessageId: string | null | undefined,
    updater: (message: Message) => Message,
    options?: { deferred?: boolean },
  ) => {
    const applyUpdate = () => setMessages((prev) => {
      if (prev.length === 0) {
        return prev;
      }

      const knownIndex = activeBotMessageIndexRef.current;
      const targetIndex = botMessageId && knownIndex !== null && prev[knownIndex]?.id === botMessageId
        ? knownIndex
        : (() => {
          for (let index = prev.length - 1; index >= 0; index -= 1) {
            if (prev[index].sender === 'bot' && (!botMessageId || prev[index].id === botMessageId)) {
              return index;
            }
          }
          return -1;
        })();

      if (targetIndex < 0) {
        return prev;
      }

      const current = prev[targetIndex];
      if (current.sender !== 'bot') {
        return prev;
      }

      const next = prev.slice();
      next[targetIndex] = updater(current);
      activeBotMessageIndexRef.current = targetIndex;
      return next;
    });

    if (options?.deferred) {
      startTransition(applyUpdate);
      return;
    }

    applyUpdate();
  };

  const clearScheduledStreamingFlush = () => {
    if (streamingFlushTimeoutRef.current) {
      clearTimeout(streamingFlushTimeoutRef.current);
      streamingFlushTimeoutRef.current = null;
    }
  };

  const flushStreamingBuffer = (botMessageId?: string | null) => {
    clearScheduledStreamingFlush();

    if (!streamingBuffer.current) {
      return;
    }

    const bufferedText = streamingBuffer.current;
    streamingBuffer.current = '';
    updateBotMessageById(
      botMessageId ?? activeBotMessageIdRef.current,
      (message) => appendTextToBotMessage(message, bufferedText),
      { deferred: true },
    );
  };

  const scheduleStreamingFlush = (botMessageId?: string | null) => {
    if (!streamingBuffer.current || streamingFlushTimeoutRef.current) {
      return;
    }

    streamingFlushTimeoutRef.current = setTimeout(() => {
      streamingFlushTimeoutRef.current = null;
      flushStreamingBuffer(botMessageId);
    }, STREAMING_BUFFER_FLUSH_INTERVAL_MS);
  };

  useEffect(() => () => {
    clearScheduledStreamingFlush();
  }, []);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    currentSessionTitleRef.current = currentSessionTitle;
  }, [currentSessionTitle]);

  useEffect(() => {
    const previousScope = previousViewerScopeRef.current;
    if (previousScope.viewerId === viewerScope.viewerId
      && previousScope.sessionEpoch === viewerScope.sessionEpoch) {
      return;
    }

    activeRequestSeqRef.current += 1;
    activeStreamAbortControllerRef.current?.abort(new DOMException('viewer changed', 'AbortError'));
    activeStreamAbortControllerRef.current = null;
    activeBotMessageIdRef.current = null;
    activeBotMessageIndexRef.current = null;
    clearScheduledStreamingFlush();
    streamingBuffer.current = '';
    setIsLoadingMessages(false);
    setMessages([]);
    setCurrentSessionId(null);
    setCurrentSessionTitle(AiChatSessionTitleFallback);
    currentSessionIdRef.current = null;
    currentSessionTitleRef.current = AiChatSessionTitleFallback;
    setMessageQueue([]);
    setQueueStatus(null);
    setPendingMessage('');
    setInputMessage('');
    setIsProcessing(false);
    setIsTyping(false);
    setRateLimitActive(false);
    setRateLimitUntil(null);
    setRateLimitCountdown(0);
    setFailureCount(0);

    if (previousScope.viewerId !== null && viewerScope.viewerId === null) {
      clearStoredChatUiState(previousScope.viewerId);
    }

    setSessionViewerId(viewerScope.viewerId);
    if (viewerScope.viewerId !== null) {
      const storedSessionId = readStoredSessionId(viewerScope.viewerId);
      const storedSessionTitle = readStoredSessionTitle(viewerScope.viewerId);
      const storedMessage = readStoredPendingMessage(viewerScope.viewerId);
      currentSessionIdRef.current = storedSessionId;
      currentSessionTitleRef.current = storedSessionTitle;
      setCurrentSessionId(storedSessionId);
      setCurrentSessionTitle(storedSessionTitle);
      setPendingMessage(storedMessage);
      setInputMessage(storedMessage);
      setIsLoadingMessages(storedSessionId !== null);
    }

    previousViewerScopeRef.current = viewerScope;
  }, [userId, sessionEpoch]);

  useEffect(() => {
    if (isViewerStateReady && isOpen && !isLoadingMessages && messages.length === 0) {
      setMessages([createSystemGreeting()]);
      streamingBuffer.current += GREETING_TEXT;
      scheduleStreamingFlush(null);
    }
  }, [isViewerStateReady, isOpen, isLoadingMessages, messages.length]);

  useEffect(() => {
    if (!rateLimitUntil) {
      setRateLimitCountdown(0);
      setRateLimitActive(false);
      return;
    }

    const updateCountdown = () => {
      const remainingSeconds = Math.max(0, Math.ceil((rateLimitUntil - Date.now()) / 1000));
      setRateLimitCountdown(remainingSeconds);
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);
    return () => clearInterval(intervalId);
  }, [rateLimitUntil]);

  useEffect(() => {
    if (sessionViewerId !== userId) return;
    persistSessionState(currentSessionId, currentSessionTitle, userId);
  }, [currentSessionId, currentSessionTitle, sessionViewerId, userId]);

  useEffect(() => {
    const bootstrapChatMessages = async () => {
      const scope = viewerScope;
      const isCurrentViewer = () => isViewerQueryScopeCurrent(scope);
      if (!isViewerStateReady) return;
      if (!isLoggedIn || userId === null) {
        setIsLoadingMessages(false);
        return;
      }

      if (currentSessionId === null) {
        setIsLoadingMessages(false);
        return;
      }

      if (locallyCreatedSessionIdRef.current === currentSessionId) {
        locallyCreatedSessionIdRef.current = null;
        setIsLoadingMessages(false);
        return;
      }

      setIsLoadingMessages(true);

      try {
        const chatSessionsApi = await loadChatSessionsModule();
        if (!isCurrentViewer()) return;
        const storedMessages = await chatSessionsApi.getChatSessionMessages(currentSessionId);
        if (!isCurrentViewer()) return;
        setMessages(storedMessages.map(normalizeStoredMessage));
      } catch {
        if (!isCurrentViewer()) return;
        setMessages([]);
        setCurrentSessionId(null);
        setCurrentSessionTitle(AiChatSessionTitleFallback);
        currentSessionIdRef.current = null;
        currentSessionTitleRef.current = AiChatSessionTitleFallback;
        toast.error('대화 내용을 불러오지 못했습니다.');
      } finally {
        if (isCurrentViewer()) setIsLoadingMessages(false);
      }
    };

    void bootstrapChatMessages();
  }, [currentSessionId, isLoggedIn, isViewerStateReady, sessionEpoch, sessionViewerId, userId]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const replacePlaceholderWithStoredMessage = (placeholderId: string, storedMessage: StoredChatMessage) => {
    const normalized = normalizeStoredMessage(storedMessage);
    setMessages((prev) => {
      const replacedIndex = prev.findIndex((message) => message.id === placeholderId);
      if (replacedIndex >= 0) {
        const next = prev.slice();
        next[replacedIndex] = normalized;
        activeBotMessageIndexRef.current = replacedIndex;
        return next;
      }

      if (prev.some((message) => message.id === normalized.id)) {
        return prev;
      }

      return [...prev, normalized];
    });
  };

  const syncCurrentSessionTitleFromContent = (sessionId: number, content: string) => {
    if (sessionId !== currentSessionIdRef.current) {
      return;
    }

    setCurrentSessionTitle((prev) => {
      if (prev !== AiChatSessionTitleFallback) {
        return prev;
      }

      const nextTitle = buildSessionTitle(content);
      currentSessionTitleRef.current = nextTitle;
      return nextTitle;
    });
  };

  const persistAssistantOutcome = async (
    sessionId: number,
    placeholderId: string,
    content: string,
    status: ChatMessageStatus,
    meta: ChatMeta | null,
    viewerScope: ViewerQueryScope,
    overrides?: Partial<{ cancelled: boolean; errorCode: string | null }>,
  ): Promise<boolean> => {
    if (!isViewerQueryScopeCurrent(viewerScope)) return false;
    const { saveAssistantChatMessage } = await loadChatSessionsModule();
    if (!isViewerQueryScopeCurrent(viewerScope)) return false;
    const stored = await saveAssistantChatMessage(
      sessionId,
      buildAssistantPersistencePayload(content, status, meta, overrides),
    );
    if (!isViewerQueryScopeCurrent(viewerScope)) return false;
    replacePlaceholderWithStoredMessage(placeholderId, stored);
    syncCurrentSessionTitleFromContent(sessionId, stored.content);
    setSessionListVersion((prev) => prev + 1);
    return true;
  };

  const loadSessionMessages = async (sessionId: number, title?: string) => {
    const scope = viewerScope;
    const isCurrentViewer = () => isViewerQueryScopeCurrent(scope);
    setIsLoadingMessages(true);
    try {
      const { getChatSessionMessages } = await loadChatSessionsModule();
      if (!isCurrentViewer()) return;
      const storedMessages = await getChatSessionMessages(sessionId);
      if (!isCurrentViewer()) return;
      setMessages(storedMessages.map(normalizeStoredMessage));
      currentSessionIdRef.current = sessionId;
      currentSessionTitleRef.current = title && title.trim().length > 0 ? title : AiChatSessionTitleFallback;
      setCurrentSessionId(sessionId);
      setCurrentSessionTitle(title && title.trim().length > 0 ? title : AiChatSessionTitleFallback);
      activeBotMessageIdRef.current = null;
      activeBotMessageIndexRef.current = null;
      clearScheduledStreamingFlush();
      streamingBuffer.current = '';
    } catch {
      if (isCurrentViewer()) toast.error('대화 내용을 불러오지 못했습니다.');
    } finally {
      if (isCurrentViewer()) setIsLoadingMessages(false);
    }
  };

  const abortActiveStream = () => {
    const controller = activeStreamAbortControllerRef.current;
    const activeBotMessageId = activeBotMessageIdRef.current;

    if (!controller || controller.signal.aborted) {
      return false;
    }

    activeRequestSeqRef.current += 1;
    flushStreamingBuffer(activeBotMessageId);
    updateBotMessageById(activeBotMessageId, (message) => ({
      ...message,
      text: message.text.trim().length > 0 ? message.text : '응답을 취소했습니다.',
      status: 'CANCELLED',
      cancelled: true,
      isError: false,
    }));
    setIsProcessing(false);
    setIsTyping(false);

    controller.abort(new DOMException('chat stream cancelled', 'AbortError'));
    activeStreamAbortControllerRef.current = null;
    activeBotMessageIdRef.current = null;
    activeBotMessageIndexRef.current = null;
    setQueueStatus(null);
    return true;
  };

  const processMessage = async ({ viewerScope, sessionId, historyPayload, userMessage }: QueuedMessage) => {
    const isCurrentViewer = () => isViewerQueryScopeCurrent(viewerScope);
    if (!isCurrentViewer()) return;
    setIsTyping(true);
    setQueueStatus(null);
    flushStreamingBuffer(activeBotMessageIdRef.current);

    const botMessageId = createMessageId();
    const streamAbortController = new AbortController();
    const requestSeq = activeRequestSeqRef.current + 1;
    const isCurrentRequest = () => isCurrentViewer() && activeRequestSeqRef.current === requestSeq;

    activeRequestSeqRef.current = requestSeq;
    activeBotMessageIdRef.current = botMessageId;
    activeStreamAbortControllerRef.current = streamAbortController;

    let assistantText = '';
    let assistantMeta: ChatMeta | null = null;

    try {
      setMessages((prev) => {
        if (prev.some((message) => message.id === botMessageId)) {
          return prev;
        }
        const next = [...prev, createBotPlaceholder(sessionId, botMessageId)];
        activeBotMessageIndexRef.current = next.length - 1;
        return next;
      });

      const { sendChatMessageStream } = await loadChatBotStreamModule();
      if (streamAbortController.signal.aborted) {
        throw streamAbortController.signal.reason ?? new DOMException('chat stream cancelled', 'AbortError');
      }
      if (!isCurrentRequest()) return;
      await sendChatMessageStream(
        { question: userMessage.text, history: historyPayload },
        (delta) => {
          if (!isCurrentRequest()) {
            return;
          }
          assistantText += delta;
          streamingBuffer.current += delta;
          scheduleStreamingFlush(botMessageId);
        },
        (meta) => {
          if (!isCurrentRequest()) {
            return;
          }
          assistantMeta = meta;
          updateBotMessageById(botMessageId, (message) => ({
            ...message,
            verified: meta.verified,
            cached: meta.cached,
            citations: meta.dataSources,
            toolCalls: meta.toolCalls,
            intent: meta.intent,
            strategy: meta.strategy,
            plannerMode: meta.plannerMode,
            plannerCacheHit: meta.plannerCacheHit,
            toolExecutionMode: meta.toolExecutionMode,
            fallbackReason: meta.fallbackReason,
            finishReason: meta.finish_reason,
            cancelled: meta.cancelled ?? false,
            isError: meta.error === 'temporary_generation_issue' || meta.finish_reason === 'error',
            metadata: meta.perf ?? null,
          }));
        },
        {
          signal: streamAbortController.signal,
          onQueueStatus: (status) => {
            if (!isCurrentRequest()) {
              return;
            }
            setQueueStatus(status.state === 'queued' ? status : null);
          },
        },
      );

      if (!isCurrentRequest()) return;

      flushStreamingBuffer(botMessageId);

      const finalContent = assistantText.trim().length > 0
        ? assistantText
        : '응답이 비어 있습니다. 다시 시도해주세요.';
      const resolvedAssistantMeta = assistantMeta as ChatMeta | null;
      const finalStatus: ChatMessageStatus = resolvedAssistantMeta?.cancelled || resolvedAssistantMeta?.finish_reason === 'cancelled'
        ? 'CANCELLED'
        : resolvedAssistantMeta?.error || resolvedAssistantMeta?.finish_reason === 'error'
          ? 'ERROR'
          : 'COMPLETED';

      const persisted = await persistAssistantOutcome(
        sessionId,
        botMessageId,
        finalContent,
        finalStatus,
        resolvedAssistantMeta,
        viewerScope,
      );
      if (!persisted || !isCurrentRequest()) return;

      setFailureCount(0);
      setRateLimitActive(false);
      setRateLimitUntil(null);
      setQueueStatus(null);
      setPendingMessage('');
      const pendingMessageStorageKey = getChatBotPendingMessageStorageKey(viewerScope.viewerId);
      if (pendingMessageStorageKey) {
        try {
          sessionStorage.removeItem(pendingMessageStorageKey);
        } catch {
          // The response is complete even if draft cleanup is unavailable.
        }
      }
    } catch (error) {
      if (!isCurrentViewer()) return;
      setQueueStatus(null);
      flushStreamingBuffer(botMessageId);

      if (isStreamAbortError(error)) {
        const cancelledText = assistantText.trim().length > 0 ? assistantText : '응답을 취소했습니다.';
        const resolvedAssistantMeta = assistantMeta as ChatMeta | null;
        try {
          await persistAssistantOutcome(
            sessionId,
            botMessageId,
            cancelledText,
            'CANCELLED',
            resolvedAssistantMeta,
            viewerScope,
            {
              cancelled: true,
              errorCode: resolvedAssistantMeta?.error ?? 'cancelled',
            },
          );
          if (!isCurrentViewer()) return;
        } catch {
          if (!isCurrentViewer()) return;
          updateBotMessageById(botMessageId, (message) => ({
            ...message,
            text: cancelledText,
            status: 'CANCELLED',
            cancelled: true,
            isError: false,
          }));
        }
      } else {
        const failureText = resolveChatBotFailureText(error);
        const errorCode = isRateLimitLikeError(error) || isChatStreamStatusError(error, CHATBOT_STATUS_RATE_LIMIT)
          ? 'rate_limit'
          : isChatStreamEventLikeError(error)
            ? error.eventCode || 'temporary_error'
            : error instanceof Error
              ? error.message
              : 'chat_stream_error';

        if (isRateLimitLikeError(error) || isChatStreamStatusError(error, CHATBOT_STATUS_RATE_LIMIT)) {
          const nextFailureCount = Math.min(failureCount + 1, 3);
          const backoffSeconds = Math.min(DEFAULT_RETRY_SECONDS * Math.pow(2, nextFailureCount - 1), MAX_BACKOFF_SECONDS);
          const retryAfterSeconds = isRateLimitLikeError(error)
            ? error.retryAfterSeconds ?? DEFAULT_RETRY_SECONDS
            : DEFAULT_RETRY_SECONDS;
          const jitterSeconds = Math.floor(Math.random() * (JITTER_MAX_SECONDS - JITTER_MIN_SECONDS + 1)) + JITTER_MIN_SECONDS;
          const waitSeconds = Math.min(MAX_BACKOFF_SECONDS, Math.max(retryAfterSeconds, backoffSeconds) + jitterSeconds);

          setFailureCount(nextFailureCount);
          setRateLimitActive(true);
          setRateLimitUntil(Date.now() + waitSeconds * 1000);
        } else if (isChatStreamStatusError(error, CHATBOT_STATUS_SERVICE_UNAVAILABLE)) {
          toast.error('서비스 점검 중이거나 일시적인 오류입니다.');
        } else if (isChatStreamStatusError(error, CHATBOT_STREAM_TIMEOUT_ERROR)) {
          toast.error('응답 시간이 초과되었습니다.');
        } else if (isChatStreamStatusError(error, CHATBOT_STREAM_INCOMPLETE_ERROR)) {
          toast.error('응답이 중단되었습니다. 다시 시도해주세요.');
        } else if (isChatStreamEventLikeError(error) || isChatStreamStatusError(error, CHATBOT_STREAM_TEMPORARY_ERROR)) {
          toast.error(failureText);
        } else {
          toast.error('응답 중 오류가 발생했습니다.');
        }

        try {
          await persistAssistantOutcome(
            sessionId,
            botMessageId,
            failureText,
            'ERROR',
            assistantMeta,
            viewerScope,
            { errorCode },
          );
          if (!isCurrentViewer()) return;
        } catch {
          if (!isCurrentViewer()) return;
          updateBotMessageById(botMessageId, (message) => ({
            ...message,
            text: failureText,
            status: 'ERROR',
            isError: true,
            cancelled: false,
            errorCode,
          }));
        }

        if (!(isRateLimitLikeError(error) || isChatStreamStatusError(error, CHATBOT_STATUS_RATE_LIMIT))) {
          setInputMessage(pendingMessage);
        }
      }
    } finally {
      if (activeStreamAbortControllerRef.current === streamAbortController) {
        activeStreamAbortControllerRef.current = null;
        activeBotMessageIdRef.current = null;
        activeBotMessageIndexRef.current = null;
        if (isCurrentViewer()) {
          setIsProcessing(false);
          setIsTyping(false);
        }
      }
    }
  };

  useEffect(() => {
    if (!isProcessing && messageQueue.length > 0) {
      const [nextMessage, ...rest] = messageQueue;
      setMessageQueue(rest);
      setIsProcessing(true);
      void processMessage(nextMessage);
    }
  }, [messageQueue, isProcessing]);

  const ensureActiveSession = async (scope: ViewerQueryScope): Promise<ChatSessionSummary | null> => {
    if (!isViewerQueryScopeCurrent(scope)) return null;
    if (currentSessionIdRef.current !== null) {
      return {
        sessionId: currentSessionIdRef.current,
        title: currentSessionTitleRef.current,
        messageCount: 0,
        latestMessagePreview: null,
        createdAt: '',
        updatedAt: '',
        lastMessageAt: '',
      };
    }

    const { createChatSession } = await loadChatSessionsModule();
    if (!isViewerQueryScopeCurrent(scope)) return null;
    const created = await createChatSession();
    if (!isViewerQueryScopeCurrent(scope)) return null;
    currentSessionIdRef.current = created.sessionId;
    currentSessionTitleRef.current = created.title || AiChatSessionTitleFallback;
    locallyCreatedSessionIdRef.current = created.sessionId;
    setCurrentSessionId(created.sessionId);
    setCurrentSessionTitle(created.title || AiChatSessionTitleFallback);
    setMessages([]);
    activeBotMessageIdRef.current = null;
    activeBotMessageIndexRef.current = null;
    clearScheduledStreamingFlush();
    streamingBuffer.current = '';
    setSessionListVersion((prev) => prev + 1);
    return created;
  };

  // 저장이 끝나기 전에 들어온 두 번째 전송(더블 클릭·연속 Enter)이 같은 문장을 다시 저장하지 않도록
  // 렌더링과 무관하게 동기적으로 막는다. isProcessing 상태는 저장 중에는 아직 true가 아니다.
  const submitInFlightRef = useRef(false);
  const submitMessage = async (trimmedInput: string) => {
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    try {
      await submitMessageOnce(trimmedInput);
    } finally {
      submitInFlightRef.current = false;
    }
  };

  const submitMessageOnce = async (trimmedInput: string) => {
    const scope = viewerScope;
    const pendingMessageStorageKey = getChatBotPendingMessageStorageKey(scope.viewerId);
    if (!isViewerStateReady || !trimmedInput || !isLoggedIn || scope.viewerId === null || !pendingMessageStorageKey) return;
    if (rateLimitActive && rateLimitCountdown > 0) return;

    if (isProcessing) {
      abortActiveStream();
    }

    setPendingMessage(trimmedInput);
    try {
      sessionStorage.setItem(pendingMessageStorageKey, trimmedInput);
    } catch {
      // Sending remains available when session storage is disabled.
    }

    try {
      const activeSession = await ensureActiveSession(scope);
      if (!activeSession || !isViewerQueryScopeCurrent(scope)) return;
      const historyPayload = buildHistoryPayload(messages);
      const { saveUserChatMessage } = await loadChatSessionsModule();
      if (!isViewerQueryScopeCurrent(scope)) return;
      const storedUserMessage = await saveUserChatMessage(activeSession.sessionId, trimmedInput);
      if (!isViewerQueryScopeCurrent(scope)) return;
      const normalizedUserMessage = createOptimisticUserMessage(storedUserMessage);

      setMessages((prev) => [...prev.filter((message) => !message.isSystem), normalizedUserMessage]);
      syncCurrentSessionTitleFromContent(activeSession.sessionId, trimmedInput);
      setMessageQueue((prev) => [...prev, {
        viewerScope: scope,
        sessionId: activeSession.sessionId,
        historyPayload,
        userMessage: normalizedUserMessage,
      }]);
      setInputMessage('');
    } catch {
      if (!isViewerQueryScopeCurrent(scope)) return;
      toast.error('메시지를 저장하지 못했습니다.');
      setInputMessage(trimmedInput);
    }
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const submittedInput = event.currentTarget instanceof HTMLFormElement
      ? new FormData(event.currentTarget).get('message')
      : null;
    const trimmedInput = typeof submittedInput === 'string'
      ? submittedInput.trim()
      : inputMessage.trim();

    await submitMessage(trimmedInput);
  };

  const handleRetrySend = async () => {
    if (!isViewerStateReady || rateLimitCountdown > 0) return;
    const retryText = inputMessage.trim() || pendingMessage.trim();
    if (!retryText) return;
    setRateLimitActive(false);
    setRateLimitUntil(null);
    setQueueStatus(null);
    await submitMessage(retryText);
  };

  const handleRestorePendingMessage = () => {
    if (!isViewerStateReady || !pendingMessage.trim()) return;
    setInputMessage(pendingMessage);
  };

  const handleCancelStream = () => {
    if (!isProcessing && !activeStreamAbortControllerRef.current) {
      return;
    }
    abortActiveStream();
  };

  const handleCreateNewSession = async () => {
    const scope = viewerScope;
    if (!isViewerStateReady || !isLoggedIn || scope.viewerId === null) return null;
    if (isProcessing) {
      abortActiveStream();
    }
    setMessageQueue([]);
    setQueueStatus(null);
    try {
      const { createChatSession } = await loadChatSessionsModule();
      if (!isViewerQueryScopeCurrent(scope)) return null;
      const session = await createChatSession();
      if (!isViewerQueryScopeCurrent(scope)) return null;
      currentSessionIdRef.current = session.sessionId;
      currentSessionTitleRef.current = session.title || AiChatSessionTitleFallback;
      setCurrentSessionId(session.sessionId);
      setCurrentSessionTitle(session.title || AiChatSessionTitleFallback);
      setMessages([]);
      activeBotMessageIdRef.current = null;
      activeBotMessageIndexRef.current = null;
      clearScheduledStreamingFlush();
      streamingBuffer.current = '';
      setSessionListVersion((prev) => prev + 1);
      return session;
    } catch {
      if (!isViewerQueryScopeCurrent(scope)) return null;
      toast.error('새 대화를 시작하지 못했습니다.');
      return null;
    }
  };

  const handleSelectSession = async (sessionId: number, title?: string) => {
    if (!isViewerStateReady || !isLoggedIn) return;
    if (sessionId === currentSessionIdRef.current) return;
    if (isProcessing) {
      abortActiveStream();
    }
    setMessageQueue([]);
    setQueueStatus(null);
    await loadSessionMessages(sessionId, title);
  };

  const handleDeleteSession = async (sessionId: number) => {
    const scope = viewerScope;
    if (!isViewerStateReady || !isLoggedIn || scope.viewerId === null) return false;
    if (isProcessing && sessionId === currentSessionId) {
      abortActiveStream();
    }

    try {
      const { deleteChatSession } = await loadChatSessionsModule();
      if (!isViewerQueryScopeCurrent(scope)) return false;
      await deleteChatSession(sessionId);
      if (!isViewerQueryScopeCurrent(scope)) return false;
      if (sessionId === currentSessionIdRef.current) {
        currentSessionIdRef.current = null;
        currentSessionTitleRef.current = AiChatSessionTitleFallback;
        setCurrentSessionId(null);
        setCurrentSessionTitle(AiChatSessionTitleFallback);
        setMessages([]);
        activeBotMessageIdRef.current = null;
        activeBotMessageIndexRef.current = null;
        clearScheduledStreamingFlush();
        streamingBuffer.current = '';
      }
      setSessionListVersion((prev) => prev + 1);
      setFavoritesVersion((prev) => prev + 1);
      return true;
    } catch {
      if (!isViewerQueryScopeCurrent(scope)) return false;
      toast.error('대화를 삭제하지 못했습니다.');
      return false;
    }
  };

  const handleToggleFavorite = async (message: Message) => {
    const scope = viewerScope;
    if (!isViewerStateReady || scope.viewerId === null) return;
    if (!message.serverId || message.sender !== 'bot' || message.status !== 'COMPLETED') {
      return;
    }

    try {
      if (message.favorite) {
        const { removeChatFavorite } = await loadChatSessionsModule();
        if (!isViewerQueryScopeCurrent(scope)) return;
        await removeChatFavorite(message.serverId);
        if (!isViewerQueryScopeCurrent(scope)) return;
        setMessages((prev) => prev.map((item) => (
          item.serverId === message.serverId ? { ...item, favorite: false } : item
        )));
        setFavoritesVersion((prev) => prev + 1);
        return;
      }

      const { addChatFavorite } = await loadChatSessionsModule();
      if (!isViewerQueryScopeCurrent(scope)) return;
      await addChatFavorite(message.serverId);
      if (!isViewerQueryScopeCurrent(scope)) return;
      setMessages((prev) => prev.map((item) => (
        item.serverId === message.serverId ? { ...item, favorite: true } : item
      )));
      setFavoritesVersion((prev) => prev + 1);
    } catch {
      if (!isViewerQueryScopeCurrent(scope)) return;
      toast.error('즐겨찾기를 변경하지 못했습니다.');
    }
  };

  const handleUseFavoritePrompt = (favorite: ChatFavoriteItem) => {
    if (!isViewerStateReady || !favorite.prompt) return;
    setInputMessage(favorite.prompt);
  };

  const setViewerInputMessage: typeof setInputMessage = (value) => {
    if (isViewerStateReady) setInputMessage(value);
  };

  useEffect(() => {
    return () => {
      abortActiveStream();
    };
  }, []);

  return {
    isOpen,
    setIsOpen,
    currentSessionId: isViewerStateReady ? currentSessionId : null,
    currentSessionTitle: isViewerStateReady ? currentSessionTitle : AiChatSessionTitleFallback,
    messages: isViewerStateReady ? messages : [],
    inputMessage: isViewerStateReady ? inputMessage : '',
    setInputMessage: setViewerInputMessage,
    isTyping: isViewerStateReady && isTyping,
    isProcessing: isViewerStateReady && isProcessing,
    rateLimitActive: isViewerStateReady && rateLimitActive,
    rateLimitCountdown: isViewerStateReady ? rateLimitCountdown : 0,
    rateLimitStage: isViewerStateReady ? Math.min(Math.max(failureCount, 1), 3) : 1,
    queueStatus: isViewerStateReady ? queueStatus : null,
    pendingMessage: isViewerStateReady ? pendingMessage : '',
    isLoadingMessages: !isViewerStateReady || isLoadingMessages,
    sessionListVersion,
    favoritesVersion,
    messagesEndRef,
    messagesContainerRef,
    handleSendMessage,
    handleRetrySend,
    handleRestorePendingMessage,
    handleCancelStream,
    handleCreateNewSession,
    handleSelectSession,
    handleDeleteSession,
    handleToggleFavorite,
    handleUseFavoritePrompt,
  };
};

const AiChatSessionTitleFallback = '새 대화';
