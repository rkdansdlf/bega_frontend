import { createElement, useState, type MouseEvent } from 'react';

import FallbackDesignSystemButton from '../moduleFederation/fallback/Button';
import FallbackDesignSystemModal from '../moduleFederation/fallback/Modal';

const buttonLabels = {
  single: '확인',
  'long-korean': '모바일 화면에서도 문장이 버튼 경계를 벗어나지 않고 자연스럽게 여러 줄로 표시되는 긴 작업 이름',
  'unbroken-token': 'UNBROKENTOKENWITHOUTSPACESUNBROKENTOKENWITHOUTSPACESUNBROKENTOKENWITHOUTSPACES',
} as const;

const modalCopy = {
  empty: { title: undefined, body: '' },
  single: { title: '모달 제목', body: '모달 본문' },
  'long-korean': {
    title: '모바일 화면에서 긴 제목이 닫기 버튼을 가리지 않고 여러 줄로 표시되는 모달 제목',
    body: '모바일 화면에서도 긴 본문이 대화상자 안에서 자연스럽게 줄바꿈되고 필요한 경우 내부에서 세로로 스크롤됩니다. '.repeat(28),
  },
  'unbroken-token': {
    title: 'UNBROKENTITLEWITHOUTSPACES'.repeat(12),
    body: 'UNBROKENBODYWITHOUTSPACES'.repeat(80),
  },
} as const;

type ButtonData = keyof typeof buttonLabels;
type ModalData = keyof typeof modalCopy;
type ModalCallbackMode = 'both' | 'open-change' | 'close' | 'none';

function mfFallbackButtonStatefulHost({
  data,
  disabled,
  presentation,
  scenarioKey,
  size,
  variant,
}: {
  data: ButtonData;
  disabled: boolean;
  presentation: string;
  scenarioKey: string;
  size: string;
  variant: string;
}) {
  const [callbackCount, setCallbackCount] = useState(0);
  const [lastEvent, setLastEvent] = useState('');
  const iconOnly = size === 'icon' || size === 'iconTouch';

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setCallbackCount((current) => current + 1);
    setLastEvent(event.detail === 0 ? 'keyboard' : 'pointer');
  };

  return (
    <div
      data-testid="mf-fallback-button-stateful-host"
      data-vqa-callback-count={callbackCount}
      data-vqa-last-event={lastEvent}
      data-vqa-disabled={disabled}
      data-vqa-presentation={presentation}
      data-vqa-scenario-key={scenarioKey}
    >
      <FallbackDesignSystemButton
        aria-label={iconOnly ? '아이콘 작업' : undefined}
        disabled={disabled}
        onClick={handleClick}
        size={size}
        variant={variant}
      >
        {iconOnly ? '＋' : buttonLabels[data]}
      </FallbackDesignSystemButton>
    </div>
  );
}

export function mfFallbackButtonVisualQaHarness(props: {
  data: ButtonData;
  disabled: boolean;
  presentation: string;
  scenarioKey: string;
  size: string;
  variant: string;
}) {
  return createElement(mfFallbackButtonStatefulHost, {
    ...props,
    key: props.scenarioKey,
  });
}

function mfFallbackModalStatefulHost({
  callbackMode,
  data,
  initialOpen,
  scenarioKey,
}: {
  callbackMode: ModalCallbackMode;
  data: ModalData;
  initialOpen: boolean;
  scenarioKey: string;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [openChangeCount, setOpenChangeCount] = useState(0);
  const [closeCount, setCloseCount] = useState(0);
  const [lastBranch, setLastBranch] = useState('');
  const copy = modalCopy[data];
  const onOpenChange = callbackMode === 'both' || callbackMode === 'open-change'
    ? (nextOpen: boolean) => {
      setOpenChangeCount((current) => current + 1);
      setLastBranch('open-change');
      setOpen(nextOpen);
    }
    : undefined;
  const onClose = callbackMode === 'both' || callbackMode === 'close'
    ? () => {
      setCloseCount((current) => current + 1);
      setLastBranch('close');
      setOpen(false);
    }
    : undefined;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 h-px w-px overflow-hidden"
      data-testid="mf-fallback-modal-stateful-host"
      data-vqa-open-change-count={openChangeCount}
      data-vqa-close-count={closeCount}
      data-vqa-last-branch={lastBranch}
      data-vqa-effective-open={open}
      data-vqa-callback-mode={callbackMode}
      data-vqa-scenario-key={scenarioKey}
    >
      <FallbackDesignSystemModal
        open={open}
        onOpenChange={onOpenChange}
        onClose={onClose}
        title={copy.title}
      >
        <div data-testid="mf-fallback-modal-body" className="min-w-0 max-w-full">
          <p>{copy.body}</p>
          <button
            type="button"
            data-testid="mf-fallback-modal-internal-action"
            className="mt-4 min-h-11 min-w-11 rounded-md border px-4 py-2"
          >
            내부 작업
          </button>
        </div>
      </FallbackDesignSystemModal>
    </div>
  );
}

export function mfFallbackModalVisualQaHarness(props: {
  callbackMode: ModalCallbackMode;
  data: ModalData;
  initialOpen: boolean;
  scenarioKey: string;
}) {
  return createElement(mfFallbackModalStatefulHost, {
    ...props,
    key: props.scenarioKey,
  });
}
