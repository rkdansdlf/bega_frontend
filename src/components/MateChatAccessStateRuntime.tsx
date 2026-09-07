import type { ReactNode } from 'react';

import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.webp';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { useNavigate } from 'react-router-dom';

import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { MateAlertCircleIcon, MateChevronLeftIcon, MateInfoIcon } from './icons/MateFlowIcons';
import {
  mateInsetPanelClass,
  matePageShellClass,
  mateSectionCardClass,
} from '../utils/mateFlowUi';

type MateChatAccessStateRuntimeProps =
  | {
      state: 'partyError';
      message: string;
      partyId?: string;
    }
  | {
      state: 'unauthenticated';
      partyId?: string;
    }
  | {
      state: 'approvalError';
      message: string;
      partyId?: string;
      onRetry: () => void;
    }
  | {
      state: 'notApproved';
      partyId?: string;
    };

function MateChatStateLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${matePageShellClass} min-h-dvh min-w-0 overflow-x-clip`}
      data-testid="mate-chat-access-state"
    >
      <img
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 h-24 w-full object-cover object-top pointer-events-none opacity-30"
      />
      <div className="relative z-10 mx-auto w-full min-w-0 max-w-5xl px-4 py-10 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}

export default function MateChatAccessStateRuntime(props: MateChatAccessStateRuntimeProps) {
  const navigate = useNavigate();
  const detailPath = props.partyId ? `/mate/${props.partyId}` : '/mate';

  if (props.state === 'partyError') {
    return (
      <MateChatStateLayout>
        <Card className={`min-w-0 p-5 sm:p-6 ${mateSectionCardClass}`}>
          <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/25">
            <MateInfoIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="min-w-0 text-red-700 [overflow-wrap:anywhere] dark:text-red-300">
              {props.message}
            </AlertDescription>
          </Alert>
          <Button data-testid="mate-chat-party-error-list" onClick={() => navigate('/mate')} className="mt-4 min-h-11 w-full sm:w-fit">
            목록으로 돌아가기
          </Button>
        </Card>
      </MateChatStateLayout>
    );
  }

  if (props.state === 'unauthenticated') {
    return (
      <MateChatStateLayout>
        <Card className={`min-w-0 p-5 sm:p-6 ${mateSectionCardClass}`}>
          <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/25">
            <MateAlertCircleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="min-w-0 text-red-700 [overflow-wrap:anywhere] dark:text-red-300">
              로그인이 필요합니다. 로그인 후 이용해주세요.
            </AlertDescription>
          </Alert>
          <Button data-testid="mate-chat-login" onClick={() => navigate(buildLoginPath(getCurrentRelativeUrl()))} className="mt-4 min-h-11 w-full sm:w-fit">
            로그인하기
          </Button>
        </Card>
      </MateChatStateLayout>
    );
  }

  if (props.state === 'approvalError') {
    return (
      <MateChatStateLayout>
        <Card className={`min-w-0 p-5 sm:p-6 ${mateSectionCardClass}`}>
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/25">
            <MateAlertCircleIcon className="h-4 w-4 text-amber-700 dark:text-amber-300" />
            <AlertDescription className="min-w-0 text-amber-800 [overflow-wrap:anywhere] dark:text-amber-200">
              {props.message}
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button data-testid="mate-chat-approval-retry" variant="outline" onClick={props.onRetry} className="min-h-11 w-full sm:w-auto">
              다시 시도
            </Button>
            <Button data-testid="mate-chat-approval-detail" onClick={() => navigate(detailPath)} className="min-h-11 w-full sm:w-auto">
              상세로 돌아가기
            </Button>
          </div>
        </Card>
      </MateChatStateLayout>
    );
  }

  return (
    <MateChatStateLayout>
      <Button
        data-testid="mate-chat-not-approved-back"
        variant="ghost"
        onClick={() => navigate(detailPath)}
        className="mb-4 min-h-11 text-gray-800 dark:text-white"
      >
        <MateChevronLeftIcon className="mr-2 h-4 w-4" />
        뒤로
      </Button>
      <Card className={`min-w-0 p-5 sm:p-6 ${mateSectionCardClass}`}>
        <p className="text-body font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">
          Chat Access
        </p>
        <h1 className="mt-2 min-w-0 text-2xl font-black text-gray-900 [overflow-wrap:anywhere] dark:text-white">승인 전에는 채팅이 열리지 않습니다</h1>
        <p className="mt-3 min-w-0 text-body leading-6 text-gray-600 [overflow-wrap:anywhere] dark:text-white">
          호스트의 승인을 기다려주세요. 승인 후에는 이 화면에서 만날 시간, 장소, 체크인 준비를 바로 조율할 수 있습니다.
        </p>
        <div className={`${mateInsetPanelClass} mt-4 min-w-0 p-4 text-body text-gray-600 [overflow-wrap:anywhere] dark:text-white`}>
          승인 전에는 채팅 기록 조회와 메시지 전송이 모두 제한됩니다.
        </div>
        <Button data-testid="mate-chat-not-approved-detail" onClick={() => navigate(detailPath)} className="mt-6 min-h-11 w-full sm:w-fit">
          상세로 돌아가기
        </Button>
      </Card>
    </MateChatStateLayout>
  );
}
