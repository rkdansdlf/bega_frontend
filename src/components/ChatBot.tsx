import { lazy, Suspense } from 'react';

const ChatBotRuntime = lazy(() => import('./ChatBotRuntime'));

interface ChatBotProps {
  autoOpen?: boolean;
  onClosed?: () => void;
  returnFocusTo?: HTMLElement | null;
}

export default function ChatBot({ autoOpen = false, onClosed, returnFocusTo }: ChatBotProps) {
  return (
    <Suspense fallback={null}>
      <ChatBotRuntime autoOpen={autoOpen} onClosed={onClosed} returnFocusTo={returnFocusTo} />
    </Suspense>
  );
}
