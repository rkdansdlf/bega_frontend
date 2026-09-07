import { useEffect, useState, type ChangeEvent, type FormEvent, type RefObject } from 'react';

import {
  MateCloseIcon,
  MateImageIcon,
  MateInfoIcon,
  MateLoaderIcon,
  MateSendIcon,
} from './icons/MateFlowIcons';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import {
  mateSectionCardClass,
} from '../utils/mateFlowUi';

interface MateChatComposerPanelProps {
  chatImageInputId: string;
  fileInputRef: RefObject<HTMLInputElement>;
  messageText: string;
  imagePreviewUrl: string | null;
  isUploadingImage: boolean;
  isConnected: boolean;
  onMessageTextChange: (value: string) => void;
  onImageSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenImagePicker: () => void;
  onCancelImageSelection: () => void;
  onSubmit: (event: FormEvent) => void;
}

export default function MateChatComposerPanel({
  chatImageInputId,
  fileInputRef,
  messageText,
  imagePreviewUrl,
  isUploadingImage,
  isConnected,
  onMessageTextChange,
  onImageSelect,
  onOpenImagePicker,
  onCancelImageSelection,
  onSubmit,
}: MateChatComposerPanelProps) {
  const [previewLoadFailed, setPreviewLoadFailed] = useState(false);

  useEffect(() => {
    setPreviewLoadFailed(false);
  }, [imagePreviewUrl]);

  return (
    <div data-testid="mate-chat-composer-panel" className="min-w-0 overflow-x-clip">
      <Card className={`mt-4 min-w-0 p-3 sm:p-4 ${mateSectionCardClass}`}>
        {imagePreviewUrl && (
          <div className="relative mb-3 h-24 w-24 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-border dark:bg-secondary/80">
            {previewLoadFailed ? (
              <div
                data-testid="mate-chat-preview-fallback"
                role="img"
                aria-label="선택한 채팅 이미지 미리보기 실패"
                className="flex h-full w-full items-end justify-center px-2 pb-2 text-center text-xs leading-4 text-gray-500 dark:text-white"
              >
                이미지를 미리볼 수 없습니다.
              </div>
            ) : (
              <img
                src={imagePreviewUrl}
                alt="선택한 채팅 이미지 미리보기"
                className="h-full w-full object-cover"
                onError={() => setPreviewLoadFailed(true)}
              />
            )}
            {isUploadingImage ? (
              <div
                role="status"
                aria-label="채팅 이미지 업로드 중"
                className="absolute inset-0 flex items-center justify-center bg-black/40"
              >
                <MateLoaderIcon className="h-6 w-6 animate-spin text-white" />
              </div>
            ) : (
              <Button
                type="button"
                data-testid="mate-chat-composer-cancel"
                variant="ghost"
                size="iconTouch"
                onClick={onCancelImageSelection}
                aria-label="선택한 이미지 제거"
                className="absolute right-1 top-1 rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <MateCloseIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <input
            id={chatImageInputId}
            type="file"
            accept="image/*"
            className="sr-only"
            ref={fileInputRef}
            onChange={onImageSelect}
            onClick={(event) => {
              event.currentTarget.value = '';
            }}
            disabled={isUploadingImage}
            aria-label="채팅 이미지 업로드"
          />
          <Button
            type="button"
            data-testid="mate-chat-composer-upload"
            variant="outline"
            size="icon"
            disabled={isUploadingImage}
            onClick={onOpenImagePicker}
            className="shrink-0"
            aria-label="이미지 업로드"
          >
            <MateImageIcon className="h-4 w-4" />
          </Button>
          <Input
            data-testid="mate-chat-composer-input"
            value={messageText}
            onChange={(event) => onMessageTextChange(event.target.value)}
            placeholder={isConnected ? '메시지를 입력하세요...' : '연결 중… 전송 가능'}
            className="h-11 min-w-0 flex-1"
            disabled={isUploadingImage}
          />
          <Button
            type="submit"
            data-testid="mate-chat-composer-submit"
            disabled={(!messageText.trim() && !imagePreviewUrl) || isUploadingImage}
            aria-label="메시지 전송"
            className="shrink-0 bg-primary px-4 text-white sm:px-6"
          >
            {isUploadingImage ? (
              <MateLoaderIcon className="h-4 w-4 animate-spin" />
            ) : (
              <MateSendIcon className="h-4 w-4" />
            )}
          </Button>
        </form>
      </Card>

      <Alert className={`mt-4 ${mateSectionCardClass}`}>
        <MateInfoIcon className="h-4 w-4" />
        <AlertDescription className="text-body">
          <ul className="list-disc space-y-1 pl-5">
            <li>경기 당일까지 채팅에서 만날 위치와 시간을 확정해두세요.</li>
            <li>개인정보나 결제 민감 정보는 과도하게 공유하지 마세요.</li>
            <li>체크인 단계가 열리면 이 화면 위의 체크인 버튼으로 바로 이어질 수 있습니다.</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
