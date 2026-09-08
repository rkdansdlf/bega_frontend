import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import { useLocation } from 'react-router-dom';

import {
  CHATBOT_OPEN_REQUEST_EVENT,
  consumePendingChatbotOpenRequest,
} from '../utils/chatbotLauncher';

const AuthenticatedLayoutToaster = lazy(() => import('./AuthenticatedLayoutToaster'));
const AuthenticatedNotificationSocketBridge = lazy(() => import('./AuthenticatedNotificationSocketBridge'));
const ChatBot = lazy(() => import('./ChatBot'));
const ChatBotFloatingButton = lazy(() => import('./ChatBotFloatingButton'));

type AuthenticatedLayoutChromeProps = {
  enableAuthenticatedServices?: boolean;
  isChatBotRequestedOverride?: boolean;
  runtimeOverrides?: {
    authenticatedLayoutToaster?: ComponentType;
    authenticatedNotificationSocketBridge?: ComponentType;
    chatBot?: ComponentType<{
      autoOpen?: boolean;
      onClosed?: () => void;
    }>;
    chatBotFloatingButton?: ComponentType<{
      className?: string;
      compactOnMobile?: boolean;
      onClick: () => void;
      testId?: string;
    }>;
  };
};

export default function AuthenticatedLayoutChrome(props: AuthenticatedLayoutChromeProps) {
  const { enableAuthenticatedServices = true } = props;
  const [liveChatBotRequested, setLiveChatBotRequested] = useState(false);
  const usesChatBotOverride = import.meta.env.DEV
    && props.isChatBotRequestedOverride !== undefined;
  const isChatBotRequested = usesChatBotOverride
    ? props.isChatBotRequestedOverride
    : liveChatBotRequested;
  const AuthenticatedLayoutToasterComponent = import.meta.env.DEV
    && props.runtimeOverrides?.authenticatedLayoutToaster
    ? props.runtimeOverrides.authenticatedLayoutToaster
    : AuthenticatedLayoutToaster;
  const AuthenticatedNotificationSocketBridgeComponent = import.meta.env.DEV
    && props.runtimeOverrides?.authenticatedNotificationSocketBridge
    ? props.runtimeOverrides.authenticatedNotificationSocketBridge
    : AuthenticatedNotificationSocketBridge;
  const ChatBotComponent = import.meta.env.DEV && props.runtimeOverrides?.chatBot
    ? props.runtimeOverrides.chatBot
    : ChatBot;
  const ChatBotFloatingButtonComponent = import.meta.env.DEV
    && props.runtimeOverrides?.chatBotFloatingButton
    ? props.runtimeOverrides.chatBotFloatingButton
    : ChatBotFloatingButton;
  const location = useLocation();
  const shouldMountToaster = enableAuthenticatedServices || isChatBotRequested;
  const isMateBottomActionRoute = /^\/mate(?:\/create|\/[^/]+(?:\/(apply|manage|checkin|chat))?)$/.test(location.pathname);
  const mobileBottomNavOffsetClass =
    'bottom-[var(--mobile-content-safe-bottom)] sm:bottom-[calc(1.125rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]';
  const chatBotOffsetClass = isMateBottomActionRoute
    ? 'bottom-[calc(var(--mobile-content-safe-bottom)+2.25rem)] sm:bottom-[calc(1.125rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]'
    : mobileBottomNavOffsetClass;
  const chatBotHorizontalClass = isMateBottomActionRoute
    ? 'lg:left-[calc(1.5rem+env(safe-area-inset-left))] lg:right-auto xl:left-auto xl:right-[calc(1.5rem+env(safe-area-inset-right))]'
    : 'lg:right-[calc(1.5rem+env(safe-area-inset-right))]';

  useEffect(() => {
    if (usesChatBotOverride) {
      return;
    }

    const handleChatBotOpenRequest = () => {
      consumePendingChatbotOpenRequest(window);
      setLiveChatBotRequested(true);
    };
    window.addEventListener(CHATBOT_OPEN_REQUEST_EVENT, handleChatBotOpenRequest);
    if (consumePendingChatbotOpenRequest(window)) {
      setLiveChatBotRequested(true);
    }

    return () => {
      window.removeEventListener(CHATBOT_OPEN_REQUEST_EVENT, handleChatBotOpenRequest);
    };
  }, [usesChatBotOverride]);

  return (
    <>
      {shouldMountToaster || enableAuthenticatedServices ? (
        <Suspense fallback={null}>
          {shouldMountToaster ? <AuthenticatedLayoutToasterComponent /> : null}
          {enableAuthenticatedServices ? <AuthenticatedNotificationSocketBridgeComponent /> : null}
        </Suspense>
      ) : null}
      {isChatBotRequested ? (
        <Suspense fallback={null}>
          <ChatBotComponent
            autoOpen
            onClosed={() => {
              if (!usesChatBotOverride) {
                setLiveChatBotRequested(false);
              }
            }}
          />
        </Suspense>
      ) : (
        <Suspense fallback={null}>
          <ChatBotFloatingButtonComponent
            testId="chatbot-request-launcher"
            onClick={() => {
              if (!usesChatBotOverride) {
                setLiveChatBotRequested(true);
              }
            }}
            compactOnMobile
            className={`max-md:hidden right-[calc(1rem+env(safe-area-inset-right))]
                        sm:right-[calc(1.125rem+env(safe-area-inset-right))]
                        ${chatBotHorizontalClass} ${chatBotOffsetClass}`}
          />
        </Suspense>
      )}
    </>
  );
}
