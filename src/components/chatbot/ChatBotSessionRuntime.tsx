import { lazy, Suspense, type FormEvent } from 'react';

import type {
  ChatFavoriteItem,
  ChatQueueStatus,
  ChatSessionSummary,
  Message,
} from '../../types/chatbot';

import { ChatBotSessionSpinnerIcon as SpinnerIcon } from './ChatBotSessionIcons';

const ChatBotSessionStateRuntime = lazy(() => import('./ChatBotSessionStateRuntime'));

export type ChatBotSessionVisualQaStateOverride = {
  activeTab?: 'conversation' | 'history' | 'favorites';
  currentSessionId?: number | null;
  currentSessionTitle?: string;
  messages?: Message[];
  inputMessage?: string;
  isTyping?: boolean;
  isProcessing?: boolean;
  rateLimitActive?: boolean;
  rateLimitCountdown?: number;
  rateLimitStage?: number;
  queueStatus?: ChatQueueStatus | null;
  pendingMessage?: string;
  isLoadingMessages?: boolean;
  sessionListVersion?: number;
  favoritesVersion?: number;
  hasOpenedHistoryTab?: boolean;
  hasOpenedFavoritesTab?: boolean;
  handleSendMessage?: (event: FormEvent) => Promise<void> | void;
  handleRetrySend?: () => Promise<void> | void;
  handleRestorePendingMessage?: () => void;
  handleCancelStream?: () => void;
  handleCreateNewSession?: () => Promise<ChatSessionSummary | null> | ChatSessionSummary | null;
  handleSelectSession?: (sessionId: number, title?: string) => Promise<void> | void;
  handleDeleteSession?: (sessionId: number) => Promise<boolean> | boolean;
  handleToggleFavorite?: (message: Message) => Promise<void> | void;
  handleUseFavoritePrompt?: (favorite: ChatFavoriteItem) => void;
  historyStateOverride?: {
    sessions: ChatSessionSummary[];
    isLoadingSessions: boolean;
  };
  favoritesStateOverride?: {
    favorites: ChatFavoriteItem[];
    isLoadingFavorites: boolean;
  };
};

export interface ChatBotSessionRuntimeProps {
  isOpen: boolean;
  onRequestClose: () => void;
  visualQaStateOverride?: ChatBotSessionVisualQaStateOverride;
}

export default function ChatBotSessionRuntime({
  isOpen,
  onRequestClose,
  visualQaStateOverride,
}: ChatBotSessionRuntimeProps) {
  const chatBotSessionFallback = (
    <div className="flex h-full items-center justify-center text-body text-muted-foreground">
      <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
      세션 패널을 불러오는 중입니다.
    </div>
  );

  return (
    <Suspense fallback={chatBotSessionFallback}>
      <ChatBotSessionStateRuntime
        isOpen={isOpen}
        onRequestClose={onRequestClose}
        visualQaStateOverride={visualQaStateOverride}
      />
    </Suspense>
  );
}
