import chatBotIcon from '../../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { lazy, Suspense, useEffect, useState, type KeyboardEvent } from 'react';

import { useChatBot } from '../../hooks/useChatBot';
import type { ChatFavoriteItem } from '../../types/chatbot';
import {
  ChatBotSessionCloseIcon as ChatBotCloseIcon,
  ChatBotSessionHistoryIcon as ChatBotHistoryIcon,
  ChatBotSessionMessageSquareTextIcon as ChatBotMessageSquareTextIcon,
  ChatBotSessionSpinnerIcon as ChatBotSpinnerIcon,
  ChatBotSessionStarIcon as ChatBotStarIcon,
} from './ChatBotSessionIcons';
import type {
  ChatBotSessionRuntimeProps,
  ChatBotSessionVisualQaStateOverride,
} from './ChatBotSessionRuntime';

const ChatBotConversationRuntime = lazy(() => import('./ChatBotConversationRuntime'));
const ChatBotHistoryTab = lazy(() => import('./ChatBotHistoryTab'));
const ChatBotFavoritesTab = lazy(() => import('./ChatBotFavoritesTab'));

const CHATBOT_TABS = [
  { value: 'conversation', label: '대화', icon: ChatBotMessageSquareTextIcon, testId: 'chatbot-tab-conversation' },
  { value: 'history', label: '히스토리', icon: ChatBotHistoryIcon, testId: 'chatbot-tab-history' },
  { value: 'favorites', label: '즐겨찾기', icon: ChatBotStarIcon, testId: 'chatbot-tab-favorites' },
] as const;

type ChatbotTab = (typeof CHATBOT_TABS)[number]['value'];

export default function ChatBotSessionStateRuntime({
  isOpen,
  onRequestClose,
  visualQaStateOverride: requestedVisualQaStateOverride,
}: ChatBotSessionRuntimeProps) {
  const visualQaStateOverride: ChatBotSessionVisualQaStateOverride | undefined = import.meta.env?.PROD === true
    ? undefined
    : requestedVisualQaStateOverride;
  const liveSessionState = useChatBot(true);
  const [visualQaInputMessage, setVisualQaInputMessage] = useState(
    visualQaStateOverride?.inputMessage ?? '',
  );
  const currentSessionId = visualQaStateOverride?.currentSessionId !== undefined
    ? visualQaStateOverride.currentSessionId
    : liveSessionState.currentSessionId;
  const currentSessionTitle = visualQaStateOverride?.currentSessionTitle ?? liveSessionState.currentSessionTitle;
  const messages = visualQaStateOverride?.messages ?? liveSessionState.messages;
  const inputMessage = visualQaStateOverride ? visualQaInputMessage : liveSessionState.inputMessage;
  const setInputMessage = visualQaStateOverride ? setVisualQaInputMessage : liveSessionState.setInputMessage;
  const isTyping = visualQaStateOverride?.isTyping ?? liveSessionState.isTyping;
  const isProcessing = visualQaStateOverride?.isProcessing ?? liveSessionState.isProcessing;
  const rateLimitActive = visualQaStateOverride?.rateLimitActive ?? liveSessionState.rateLimitActive;
  const rateLimitCountdown = visualQaStateOverride?.rateLimitCountdown ?? liveSessionState.rateLimitCountdown;
  const rateLimitStage = visualQaStateOverride?.rateLimitStage ?? liveSessionState.rateLimitStage;
  const queueStatus = visualQaStateOverride?.queueStatus ?? liveSessionState.queueStatus;
  const pendingMessage = visualQaStateOverride?.pendingMessage ?? liveSessionState.pendingMessage;
  const isLoadingMessages = visualQaStateOverride?.isLoadingMessages ?? liveSessionState.isLoadingMessages;
  const sessionListVersion = visualQaStateOverride?.sessionListVersion ?? liveSessionState.sessionListVersion;
  const favoritesVersion = visualQaStateOverride?.favoritesVersion ?? liveSessionState.favoritesVersion;
  const { messagesEndRef, messagesContainerRef } = liveSessionState;
  const handleSendMessage = visualQaStateOverride?.handleSendMessage ?? liveSessionState.handleSendMessage;
  const handleRetrySend = visualQaStateOverride?.handleRetrySend ?? liveSessionState.handleRetrySend;
  const handleRestorePendingMessage = visualQaStateOverride?.handleRestorePendingMessage ?? liveSessionState.handleRestorePendingMessage;
  const handleCancelStream = visualQaStateOverride?.handleCancelStream ?? liveSessionState.handleCancelStream;
  const handleCreateNewSession = visualQaStateOverride?.handleCreateNewSession ?? liveSessionState.handleCreateNewSession;
  const handleSelectSession = visualQaStateOverride?.handleSelectSession ?? liveSessionState.handleSelectSession;
  const handleDeleteSession = visualQaStateOverride?.handleDeleteSession ?? liveSessionState.handleDeleteSession;
  const handleToggleFavorite = visualQaStateOverride?.handleToggleFavorite ?? liveSessionState.handleToggleFavorite;
  const handleUseFavoritePrompt = visualQaStateOverride?.handleUseFavoritePrompt ?? liveSessionState.handleUseFavoritePrompt;

  const [activeTab, setActiveTab] = useState<ChatbotTab>(visualQaStateOverride?.activeTab ?? 'conversation');
  const [hasOpenedHistoryTab, setHasOpenedHistoryTab] = useState(
    visualQaStateOverride?.hasOpenedHistoryTab ?? visualQaStateOverride?.activeTab === 'history',
  );
  const [hasOpenedFavoritesTab, setHasOpenedFavoritesTab] = useState(
    visualQaStateOverride?.hasOpenedFavoritesTab ?? visualQaStateOverride?.activeTab === 'favorites',
  );

  useEffect(() => {
    if (activeTab === 'history') {
      setHasOpenedHistoryTab(true);
    }
    if (activeTab === 'favorites') {
      setHasOpenedFavoritesTab(true);
    }
  }, [activeTab]);

  const handleClose = () => {
    if (isProcessing) {
      handleCancelStream();
    }
    onRequestClose();
  };

  const handleOpenSession = async (sessionId: number, title?: string) => {
    await handleSelectSession(sessionId, title);
    setActiveTab('conversation');
  };

  const handleFavoritePromptClick = (favorite: ChatFavoriteItem) => {
    handleUseFavoritePrompt(favorite);
    setActiveTab('conversation');
  };

  const handleFavoriteSessionClick = async (favorite: ChatFavoriteItem) => {
    await handleOpenSession(favorite.sessionId, favorite.sessionTitle);
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % CHATBOT_TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + CHATBOT_TABS.length) % CHATBOT_TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = CHATBOT_TABS.length - 1;
    else return;

    event.preventDefault();
    setActiveTab(CHATBOT_TABS[nextIndex].value);
    const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs?.[nextIndex]?.focus();
  };

  const handleCopyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard API not available
    }
  };

  const chatbotTabFallback = (
    <div className="flex h-full items-center justify-center text-body text-muted-foreground">
      <ChatBotSpinnerIcon className="mr-2 h-4 w-4 animate-spin" />
      탭을 불러오는 중입니다.
    </div>
  );

  return (
    <>
      <div
        className="grid w-full min-w-0 grid-cols-[3.5rem_minmax(0,1fr)_2.75rem] items-center gap-x-3 gap-y-2 border-b border-gray-200 bg-primary p-3 dark:border-white/10 md:flex md:items-center md:justify-between md:p-4"
        data-testid="chatbot-session-state"
      >
        <span className="col-start-1 row-start-1 grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary p-0.5 md:order-1 md:col-auto md:row-auto">
          <img
            src={chatBotIcon}
            alt="BEGA"
            className="pointer-events-none block h-13 w-13 rounded-full object-contain object-center"
            loading="eager"
            aria-hidden="true"
            decoding="async"
          />
        </span>
        <button
          type="button"
          onClick={handleClose}
          data-testid="chatbot-session-close"
          className="col-start-3 row-start-1 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border-none bg-transparent p-2 text-white/80 transition-colors hover:text-white focus:outline-none focus-visible:outline-none focus:ring-0 md:order-3 md:col-auto md:row-auto"
          aria-label="챗봇 닫기"
        >
          <ChatBotCloseIcon className="w-5 h-5" />
        </button>
        <div className="col-span-3 row-start-2 min-w-0 md:order-2 md:col-auto md:row-auto md:flex-1">
          <div className="flex min-w-0 flex-col items-start gap-y-1 md:flex-row md:flex-wrap md:items-center md:gap-x-2">
            <h3 className="m-0 w-full min-w-0 break-words text-body font-bold text-white [overflow-wrap:anywhere] md:w-auto md:text-17">야구 가이드 BEGA</h3>
            <span className="inline-flex shrink-0 items-center rounded-full border border-white/30 bg-white/20 px-2 py-0.5 text-body font-semibold text-white">
              Beta
            </span>
          </div>
          <p
            data-testid="chatbot-session-title"
            className="m-0 max-w-[220px] truncate text-body font-semibold text-white/80"
          >
            {currentSessionTitle}
          </p>
        </div>
      </div>

      <div className="flex h-full flex-col gap-0">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-white/10">
          <div
            className="flex w-full rounded-2xl border border-gray-200 bg-gray-100 p-1 dark:border-white/10 dark:bg-white/5"
            role="tablist"
            aria-label="챗봇 보기"
          >
            {CHATBOT_TABS.map(({ value, label, icon: Icon, testId }, index) => {
              const isActive = activeTab === value;
              return (
                <button
                  key={value}
                  type="button"
                  data-testid={testId}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(value)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0 py-2 text-body font-semibold transition-colors ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-white/15 dark:text-white'
                      : 'text-gray-600 hover:bg-white/70 dark:text-white dark:hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="block w-full min-w-0 whitespace-normal text-center leading-tight [overflow-wrap:anywhere]">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'conversation' && (
          <Suspense fallback={chatbotTabFallback}>
            <ChatBotConversationRuntime
              isPanelOpen={isOpen}
              messages={messages}
              isLoadingMessages={isLoadingMessages}
              isTyping={isTyping}
              isProcessing={isProcessing}
              rateLimitActive={rateLimitActive}
              rateLimitCountdown={rateLimitCountdown}
              rateLimitStage={rateLimitStage}
              queueStatus={queueStatus}
              pendingMessage={pendingMessage}
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              messagesEndRef={messagesEndRef}
              messagesContainerRef={messagesContainerRef}
              handleSendMessage={handleSendMessage}
              handleRetrySend={handleRetrySend}
              handleRestorePendingMessage={handleRestorePendingMessage}
              handleCancelStream={handleCancelStream}
              handleToggleFavorite={handleToggleFavorite}
              onRequestClose={handleClose}
            />
          </Suspense>
        )}

        {hasOpenedHistoryTab ? (
          <div className={activeTab === 'history' ? 'min-h-0 flex-1 p-4' : 'hidden'}>
            <Suspense fallback={chatbotTabFallback}>
              <ChatBotHistoryTab
                currentSessionId={currentSessionId}
                refreshKey={sessionListVersion}
                onCreateNewSession={async () => {
                  const session = await handleCreateNewSession();
                  if (session) {
                    setActiveTab('conversation');
                  }
                  return session;
                }}
                onOpenSession={handleOpenSession}
                onDeleteSession={handleDeleteSession}
                visualQaStateOverride={visualQaStateOverride?.historyStateOverride}
              />
            </Suspense>
          </div>
        ) : null}

        {hasOpenedFavoritesTab ? (
          <div className={activeTab === 'favorites' ? 'min-h-0 flex-1 p-4' : 'hidden'}>
            <Suspense fallback={chatbotTabFallback}>
              <ChatBotFavoritesTab
                refreshKey={favoritesVersion}
                onCopyMessage={handleCopyMessage}
                onReaskFavorite={handleFavoritePromptClick}
                onOpenFavoriteSession={handleFavoriteSessionClick}
                visualQaStateOverride={visualQaStateOverride?.favoritesStateOverride}
              />
            </Suspense>
          </div>
        ) : null}
      </div>
    </>
  );
}
