import { readWithTimeout } from './stream';

export interface SseEvent {
  event: string;
  data: string;
}

export interface ConsumeSseStreamOptions {
  timeoutMs: number;
  acceptDoneSentinel: boolean;
  signal?: AbortSignal;
  onEvent: (event: SseEvent) => void | Promise<void>;
  isTerminalEvent?: (event: SseEvent) => boolean;
}

export interface ConsumeSseStreamResult {
  sawDone: boolean;
}

export async function consumeSseStream(
  body: ReadableStream<Uint8Array>,
  options: ConsumeSseStreamOptions,
): Promise<ConsumeSseStreamResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let currentEvent = 'message';
  let sawDone = false;

  const processLine = async (line: string) => {
    const trimmedLine = line.trim();

    if (trimmedLine === '') {
      currentEvent = 'message';
      return;
    }

    if (trimmedLine.startsWith('event:')) {
      currentEvent = trimmedLine.slice(6).trim() || 'message';
      return;
    }

    if (trimmedLine.startsWith(':')) {
      return;
    }

    if (!trimmedLine.startsWith('data:')) {
      return;
    }

    const data = trimmedLine.slice(5).trim();
    if (data === '[DONE]' && options.acceptDoneSentinel) {
      sawDone = true;
      return;
    }

    const sseEvent = {
      event: currentEvent,
      data,
    };
    await options.onEvent(sseEvent);
    if (options.isTerminalEvent?.(sseEvent)) {
      sawDone = true;
    }
  };

  const abortReason = () => options.signal?.reason ?? new DOMException('aborted', 'AbortError');
  // 대기 중인 읽기를 바로 깨워 취소가 읽기 타임아웃까지 밀리지 않게 하고, 연결도 함께 닫는다.
  const onAbort = () => {
    void reader.cancel(abortReason()).catch(() => undefined);
  };
  if (options.signal?.aborted) onAbort();
  options.signal?.addEventListener('abort', onAbort, { once: true });

  try {
    while (!sawDone) {
      if (options.signal?.aborted) {
        throw abortReason();
      }
      let result: ReadableStreamReadResult<Uint8Array>;
      try {
        result = await readWithTimeout(() => reader.read(), options.timeoutMs);
      } catch (error) {
        // 읽기가 멈춘 본문은 취소해야 네트워크 연결이 남지 않는다.
        await reader.cancel(error).catch(() => undefined);
        throw error;
      }
      if (options.signal?.aborted) {
        throw abortReason();
      }
      const { done, value } = result;
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        await processLine(line);
        if (sawDone) break;
      }
    }

    if (!sawDone) {
      const remainingLines = buffer.split('\n');
      for (const line of remainingLines) {
        await processLine(line);
        if (sawDone) break;
      }
    }

    if (sawDone) {
      await reader.cancel('SSE completed');
    }
  } finally {
    options.signal?.removeEventListener('abort', onAbort);
    reader.releaseLock();
  }

  return { sawDone };
}
