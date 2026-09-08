import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { updateChatReadTimestamp } from '../api/mate';
import { getApiErrorStatus } from '../api/errorStatus';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  getMatePartyMessagesQueryOptions,
  MATE_KEYS,
} from '../hooks/mateChatRoute';
import { type ChatMessage, type Party } from '../types/mate';
import {
  matePageShellClass,
  mateSectionCardClass,
} from '../utils/mateFlowUi';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';

const LazyMateChatViewRuntime = lazy(() => import('./MateChatViewRuntime'));

let mateChatApiModulePromise: Promise<typeof import('../api/mate')> | null = null;
let mateValidationModulePromise: Promise<typeof import('../utils/mateValidation')> | null = null;

const loadMateChatApiModule = () => {
  if (!mateChatApiModulePromise) {
    mateChatApiModulePromise = import('../api/mate');
  }
  return mateChatApiModulePromise;
};

const loadMateValidationModule = () => {
  if (!mateValidationModulePromise) {
    mateValidationModulePromise = import('../utils/mateValidation');
  }
  return mateValidationModulePromise;
};

const CHAT_UNREAD_UPDATED_EVENT = 'chat-unread-updated';
const CHAT_HISTORY_PAGE_SIZE = 50;

export type MateChatApprovedVisualQaStateOverride = {
  chatLoadError: string | null;
  hasOlderMessages: boolean;
  isConnected: boolean;
  isLoadingOlderMessages: boolean;
  isUploadingImage: boolean;
  imagePreviewUrl: string | null;
  messageText: string;
  messages: ChatMessage[];
  messagesPending: boolean;
  nowIso: string;
  viewPhase: 'messages-loading' | 'runtime' | 'view-fallback';
};

type MateChatApprovedRuntimeProps = {
  party: Party;
  partyId: string;
  currentUser: {
    id: number;
    name: string;
  };
  isHost: boolean;
  isPartyRevalidating: boolean;
  visualQaStateOverride?: MateChatApprovedVisualQaStateOverride;
};

export default function MateChatApprovedRuntime({
  party,
  partyId,
  currentUser,
  isHost,
  isPartyRevalidating,
  visualQaStateOverride: visualQaStateOverrideProp,
}: MateChatApprovedRuntimeProps) {
  const visualQaStateOverride = import.meta.env?.PROD === true
    ? undefined
    : visualQaStateOverrideProp;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState(visualQaStateOverride?.messageText ?? '');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(visualQaStateOverride?.imagePreviewUrl ?? null);
  const [isUploadingImage, setIsUploadingImage] = useState(visualQaStateOverride?.isUploadingImage ?? false);
  const [hasOlderMessages, setHasOlderMessages] = useState(visualQaStateOverride?.hasOlderMessages ?? false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(
    visualQaStateOverride?.isLoadingOlderMessages ?? false,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const historyPartyIdRef = useRef<number | null>(null);
  const currentUserIdRef = useRef<number | null>(currentUser.id);
  const pendingWsSendsRef = useRef<Array<{
    payload: {
      partyId: number;
      message: string;
      imageUrl?: string;
      clientMessageId: string;
    };
    timer: ReturnType<typeof setTimeout>;
  }>>([]);

  const appendUniqueMessage = useCallback((base: ChatMessage[], incoming: ChatMessage): ChatMessage[] => {
    if (base.some((item) =>
      item.id === incoming.id
      || (
        incoming.clientMessageId
        && item.clientMessageId
        && item.clientMessageId === incoming.clientMessageId
      )
      || (
        Number(item.senderId) === Number(incoming.senderId)
        && item.message === incoming.message
        && (item.imageUrl || '') === (incoming.imageUrl || '')
        && Math.abs(new Date(item.createdAt).getTime() - new Date(incoming.createdAt).getTime()) < 5000
      )
    )) {
      return base;
    }
    return [...base, incoming];
  }, []);

  const updateMessageCache = useCallback((updater: (current: ChatMessage[]) => ChatMessage[]) => {
    queryClient.setQueryData<ChatMessage[]>(MATE_KEYS.partyMessages(party.id), (current) => {
      const safeCurrent = Array.isArray(current) ? current : [];
      return updater(safeCurrent);
    });
  }, [party.id, queryClient]);

  const handleMessageReceived = useCallback((message: ChatMessage) => {
    const pendingIndex = pendingWsSendsRef.current.findIndex((pending) =>
      pending.payload.clientMessageId === message.clientMessageId
    );
    if (pendingIndex >= 0) {
      clearTimeout(pendingWsSendsRef.current[pendingIndex].timer);
      pendingWsSendsRef.current.splice(pendingIndex, 1);
    }

    updateMessageCache((prev) => appendUniqueMessage(prev, message));
  }, [appendUniqueMessage, updateMessageCache]);

  const notifyChatUnreadCount = useCallback((count: number) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(CHAT_UNREAD_UPDATED_EVENT, {
        detail: { count: Math.max(0, count) },
      }),
    );
  }, []);

  useEffect(() => {
    currentUserIdRef.current = currentUser.id;
  }, [currentUser.id]);

  useEffect(() => {
    return () => {
      pendingWsSendsRef.current.forEach((pending) => clearTimeout(pending.timer));
      pendingWsSendsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (visualQaStateOverride) {
      return;
    }

    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl, visualQaStateOverride]);

  const messagesQuery = useQuery({
    ...getMatePartyMessagesQueryOptions(party.id),
    enabled: visualQaStateOverride == null,
  });
  const messages = visualQaStateOverride?.messages ?? messagesQuery.data ?? [];
  const chatLoadError = visualQaStateOverride?.chatLoadError ?? (
    messagesQuery.error
      ? (getApiErrorStatus(messagesQuery.error) === 403
        ? '승인된 참여자와 호스트만 채팅 기록을 조회할 수 있습니다.'
        : '이전 메시지를 불러오지 못했습니다. 다시 시도해주세요.')
      : null
  );
  const messagesPending = visualQaStateOverride?.messagesPending ?? messagesQuery.isPending;

  useEffect(() => {
    if (visualQaStateOverride) {
      return;
    }

    if (historyPartyIdRef.current === party.id || messagesQuery.isPending || messagesQuery.error) {
      return;
    }

    historyPartyIdRef.current = party.id;
    setHasOlderMessages(messages.length === CHAT_HISTORY_PAGE_SIZE);
  }, [messages.length, messagesQuery.error, messagesQuery.isPending, party.id, visualQaStateOverride]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (visualQaStateOverride) {
      return;
    }

    if (messagesQuery.error && getApiErrorStatus(messagesQuery.error) !== 403) {
      toast.error('이전 메시지를 불러오지 못했습니다.');
    }
  }, [messagesQuery.error, visualQaStateOverride]);

  useEffect(() => {
    const element = scrollAreaRef.current;
    if (!element) {
      return;
    }

    const isNearBottom = element.scrollHeight - (element.scrollTop + element.clientHeight) < 100;
    if (isNearBottom) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (visualQaStateOverride) {
      return;
    }

    const markAsRead = async () => {
      try {
        await updateChatReadTimestamp(party.id);
        notifyChatUnreadCount(0);
      } catch (error) {
        console.error('읽음 처리 실패', error);
      }
    };

    const timer = setTimeout(markAsRead, 500);
    return () => clearTimeout(timer);
  }, [messages, notifyChatUnreadCount, party.id, visualQaStateOverride]);

  const mergeMessages = useCallback((current: ChatMessage[], older: ChatMessage[]) => {
    const merged = older.reduce<ChatMessage[]>(
      (result, message) => appendUniqueMessage(result, message),
      [...current],
    );

    return merged.sort((left, right) => {
      const createdAtDifference = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      if (createdAtDifference !== 0) {
        return createdAtDifference;
      }
      return Number(left.id) - Number(right.id);
    });
  }, [appendUniqueMessage]);

  const handleLoadOlderMessages = useCallback(async () => {
    if (isLoadingOlderMessages || !hasOlderMessages) {
      return;
    }

    const oldestMessage = messagesRef.current[0];
    const beforeId = Number(oldestMessage?.id);
    if (!Number.isFinite(beforeId)) {
      setHasOlderMessages(false);
      return;
    }

    const scrollArea = scrollAreaRef.current;
    const previousScrollHeight = scrollArea?.scrollHeight ?? 0;
    const previousScrollTop = scrollArea?.scrollTop ?? 0;
    setIsLoadingOlderMessages(true);

    try {
      const { fetchPartyMessages } = await loadMateChatApiModule();
      const olderMessages = await fetchPartyMessages(party.id, {
        limit: CHAT_HISTORY_PAGE_SIZE,
        beforeId,
      });

      if (olderMessages.length < CHAT_HISTORY_PAGE_SIZE) {
        setHasOlderMessages(false);
      }

      queryClient.setQueryData<ChatMessage[]>(MATE_KEYS.partyMessages(party.id), (current) => (
        mergeMessages(Array.isArray(current) ? current : [], olderMessages)
      ));

      requestAnimationFrame(() => {
        if (!scrollArea) {
          return;
        }
        scrollArea.scrollTop = previousScrollTop + (scrollArea.scrollHeight - previousScrollHeight);
      });
    } catch {
      toast.error('이전 메시지를 불러오지 못했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoadingOlderMessages(false);
    }
  }, [hasOlderMessages, isLoadingOlderMessages, mergeMessages, party.id, queryClient]);

  const handleConnectionRestored = useCallback(() => {
    void (async () => {
      try {
        const { fetchPartyMessages } = await loadMateChatApiModule();
        const latestMessages = await fetchPartyMessages(party.id, {
          limit: CHAT_HISTORY_PAGE_SIZE,
        });
        queryClient.setQueryData<ChatMessage[]>(MATE_KEYS.partyMessages(party.id), (current) => (
          mergeMessages(Array.isArray(current) ? current : [], latestMessages)
        ));
      } catch (error) {
        console.warn('채팅 재연결 후 최신 메시지 동기화에 실패했습니다.', error);
      }
    })();
  }, [mergeMessages, party.id, queryClient]);

  const { sendMessage: sendWebSocketMessage, isConnected: liveIsConnected } = useWebSocket({
    partyId: party.id,
    onMessageReceived: handleMessageReceived,
    onConnectionRestored: handleConnectionRestored,
    enabled: visualQaStateOverride == null,
  });
  const isConnected = visualQaStateOverride?.isConnected ?? liveIsConnected;

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setSelectedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const cancelImageSelection = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openImagePicker = () => {
    if (isUploadingImage) {
      return;
    }

    const input = fileInputRef.current;
    if (!input) {
      return;
    }

    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof pickerInput.showPicker === 'function') {
      try {
        pickerInput.showPicker();
        return;
      } catch (error) {
        console.warn('showPicker 호출에 실패하여 click fallback을 사용합니다.', error);
      }
    }

    input.click();
  };

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!messageText.trim() && !selectedImage) {
      return;
    }

    if (messageText.trim()) {
      const { validateMateChatMessage } = await loadMateValidationModule();
      const validationError = validateMateChatMessage(messageText);
      if (validationError) {
        toast.warning(validationError);
        return;
      }
    }

    let finalImagePath: string | undefined;

    if (selectedImage) {
      setIsUploadingImage(true);
      try {
        const { uploadChatImage } = await loadMateChatApiModule();
        const uploadResult = await uploadChatImage(selectedImage);
        finalImagePath = uploadResult.path;
      } catch {
        toast.error('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }

    const clientMessageId = globalThis.crypto?.randomUUID?.()
      ?? `mate-chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const newMessage = {
      partyId: party.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      message: messageText.trim() || (finalImagePath ? '(사진 전송)' : ''),
      ...(finalImagePath && { imageUrl: finalImagePath }),
      clientMessageId,
    };

    const persistViaHttp = async () => {
      const { sendChatMessage } = await loadMateChatApiModule();
      const savedMessage = await sendChatMessage(newMessage);
      updateMessageCache((prev) => appendUniqueMessage(prev, savedMessage));
    };

    const wsSent = isConnected && sendWebSocketMessage(newMessage);
    if (wsSent) {
      const pendingEntry = {
        payload: newMessage,
        timer: setTimeout(async () => {
          const pendingIndex = pendingWsSendsRef.current.findIndex((pending) => pending === pendingEntry);
          if (pendingIndex < 0) {
            return;
          }
          pendingWsSendsRef.current.splice(pendingIndex, 1);

          const hasSameRecentOwnMessage = messagesRef.current.some((item) =>
            item.clientMessageId === pendingEntry.payload.clientMessageId
            || (
              Number(item.senderId) === Number(currentUserIdRef.current)
              && item.message === pendingEntry.payload.message
              && (item.imageUrl || '') === (pendingEntry.payload.imageUrl || '')
              && Date.now() - new Date(item.createdAt).getTime() < 7000
            )
          );
          if (hasSameRecentOwnMessage) {
            return;
          }

          try {
            await persistViaHttp();
          } catch {
            toast.error('메시지 전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
          }
        }, 1500),
      };
      pendingWsSendsRef.current.push(pendingEntry);
    } else {
      try {
        await persistViaHttp();
      } catch {
        toast.error('메시지 전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
    }

    setMessageText('');
    cancelImageSelection();
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date(visualQaStateOverride?.nowIso ?? Date.now());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '오늘';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return '어제';
    }
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
    });
  };

  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  messages.forEach((message) => {
    const dateStr = formatMessageDate(message.createdAt);
    const existingGroup = groupedMessages.find((group) => group.date === dateStr);
    if (existingGroup) {
      existingGroup.messages.push(message);
    } else {
      groupedMessages.push({ date: dateStr, messages: [message] });
    }
  });

  const canAccessCheckIn = ['MATCHED', 'CHECKED_IN', 'COMPLETED'].includes(party.status);
  const mateChatViewFallback = (
    <div
      data-testid="mate-chat-approved-runtime-fallback"
      role="status"
      aria-busy="true"
      aria-label="메이트 채팅 데이터 준비 중"
      className={`${matePageShellClass} min-h-dvh min-w-0 overflow-x-clip`}
    >
      <div className="relative z-10 mx-auto w-full max-w-5xl min-w-0 px-4 py-4 pb-6 sm:px-6 lg:px-8">
        <Card className={`min-w-0 p-0 ${mateSectionCardClass}`}>
          <div className="p-5 sm:p-6">
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="h-14 w-14 shrink-0 rounded-3xl dark:bg-white/10" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-24 max-w-full dark:bg-white/10" />
                <Skeleton className="h-7 w-40 max-w-full dark:bg-white/10" />
                <Skeleton className="h-4 w-56 max-w-full dark:bg-white/10" />
              </div>
            </div>
          </div>
        </Card>
        <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Card key={`mate-chat-summary-fallback-${index}`} className={`min-w-0 p-4 ${mateSectionCardClass}`}>
              <Skeleton className="h-4 w-16 max-w-full dark:bg-white/10" />
              <Skeleton className="mt-3 h-5 w-24 max-w-full dark:bg-white/10" />
              <Skeleton className="mt-2 h-4 w-full dark:bg-white/10" />
            </Card>
          ))}
        </div>
        <Card className={`mt-4 min-w-0 flex-1 overflow-hidden p-3 sm:p-4 ${mateSectionCardClass}`}>
          <Skeleton className="h-5 w-24 max-w-full dark:bg-white/10" />
          <Skeleton className="mt-2 h-4 w-56 max-w-full dark:bg-white/10" />
          <div className="mt-4 space-y-4">
            {[0, 1, 2].map((index) => (
              <div key={`mate-chat-thread-fallback-${index}`} className="flex min-w-0 justify-start">
                <div className="min-w-0 max-w-[70%] space-y-2">
                  <Skeleton className="h-4 w-20 max-w-full dark:bg-white/10" />
                  <Skeleton className="h-12 w-48 max-w-full rounded-3xl dark:bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  if ((messagesPending && messages.length === 0) || visualQaStateOverride?.viewPhase === 'messages-loading') {
    return mateChatViewFallback;
  }

  if (visualQaStateOverride?.viewPhase === 'view-fallback') {
    return mateChatViewFallback;
  }

  return (
    <Suspense fallback={mateChatViewFallback}>
      <LazyMateChatViewRuntime
        party={party}
        currentUserId={currentUser.id}
        isHost={isHost}
        isConnected={isConnected}
        isPartyRevalidating={isPartyRevalidating}
        canAccessCheckIn={canAccessCheckIn}
        groupedMessages={groupedMessages}
        chatLoadError={chatLoadError}
        hasOlderMessages={visualQaStateOverride?.hasOlderMessages ?? hasOlderMessages}
        isLoadingOlderMessages={visualQaStateOverride?.isLoadingOlderMessages ?? isLoadingOlderMessages}
        messageText={messageText}
        imagePreviewUrl={imagePreviewUrl}
        isUploadingImage={isUploadingImage}
        fileInputRef={fileInputRef}
        scrollAreaRef={scrollAreaRef}
        onMessageTextChange={setMessageText}
        onImageSelect={handleImageSelect}
        onOpenImagePicker={openImagePicker}
        onCancelImageSelection={cancelImageSelection}
        onSubmit={handleSendMessage}
        onNavigateBack={() => navigate(isHost ? `/mate/${partyId}/manage` : `/mate/${partyId}`)}
        onNavigateDetail={() => navigate(`/mate/${partyId}`)}
        onNavigateManage={() => navigate(`/mate/${partyId}/manage`)}
        onNavigateCheckIn={() => navigate(`/mate/${partyId}/checkin`)}
        onRefetchMessages={() => void messagesQuery.refetch()}
        onLoadOlderMessages={() => void handleLoadOlderMessages()}
        formatMessageTime={formatMessageTime}
      />
    </Suspense>
  );
}
