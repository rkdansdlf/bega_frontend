import ErrorFeedbackPanel from './common/ErrorFeedbackPanel';
import { Button } from './ui/button';
import PlainDialog from './ui/plain-dialog';
import type { ErrorSource } from '../types/error';

interface GlobalErrorDialogContentProps {
    isOpen: boolean;
    message: string;
    statusCode: number | null;
    errorId: string | null;
    source: ErrorSource | null;
    prefixText: string;
    onRetry: (() => Promise<void>) | null;
    closeErrorModal: () => void;
    visualQaSubmitFeedback?: (input: {
        eventId: string;
        comment: string;
        actionTaken: string;
    }) => Promise<boolean>;
}

export default function GlobalErrorDialogContent({
    isOpen,
    message,
    statusCode,
    errorId,
    source,
    prefixText,
    onRetry,
    closeErrorModal,
    visualQaSubmitFeedback,
}: GlobalErrorDialogContentProps) {
    const staticFeedbackSubmitter = import.meta.env?.PROD === true
        ? undefined
        : typeof visualQaSubmitFeedback === 'function'
            ? visualQaSubmitFeedback
            : undefined;
    const sourceNotice = source === 'runtime'
        ? '브라우저 실행 중 감지됨'
        : source === 'unhandled_rejection'
            ? '비동기 작업 처리 중 감지됨'
            : null;

    return (
        <PlainDialog
            open={isOpen}
            onClose={closeErrorModal}
            title={(
                <span
                    data-testid="global-error-dialog-title"
                    className="block min-w-0 max-w-full text-xl font-bold text-red-600 [overflow-wrap:anywhere]"
                >
                    {prefixText} (HTTP {statusCode || 0})
                </span>
            )}
            description={message}
            contentTestId="global-error-dialog-content"
            className="min-w-0 max-w-full border-red-500 sm:max-w-lg"
            bodyClassName="min-w-0 max-w-full [overflow-wrap:anywhere]"
            bodyStyle={{ overflowWrap: 'anywhere' }}
            footer={(
                <Button
                    type="button"
                    data-testid="global-error-dialog-confirm"
                    className="min-h-11"
                    onClick={closeErrorModal}
                >
                    확인
                </Button>
            )}
        >
            {sourceNotice ? (
                <p
                    data-testid="global-error-dialog-source"
                    className="min-w-0 max-w-full [overflow-wrap:anywhere]"
                    style={{
                        margin: '0 0 1rem',
                        padding: '0.625rem 0.75rem',
                        border: '1px solid var(--border)',
                        borderRadius: '0.75rem',
                        background: 'var(--muted)',
                        color: 'var(--foreground)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        lineHeight: '1.25rem',
                    }}
                >
                    {sourceNotice}
                </p>
            ) : null}
            <ErrorFeedbackPanel
                errorId={errorId}
                source={source ?? 'api'}
                onRetry={onRetry}
                submitFeedback={staticFeedbackSubmitter}
            />
        </PlainDialog>
    );
}
