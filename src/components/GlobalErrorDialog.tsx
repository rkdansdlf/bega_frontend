import {
    lazy,
    Suspense,
    useEffect,
    useState,
    type ComponentProps,
    type ReactNode,
} from 'react';
import type { ErrorModalState, GlobalApiErrorDetail } from '../types/error';
import { shouldIgnoreGlobalApiError } from './contexts/errorModalGuards';

const LazyGlobalErrorDialogContent = lazy(() => import('./GlobalErrorDialogContent'));

type GlobalErrorDialogVisualQaState = {
    active: true;
    onClose?: () => void;
    phase: 'fallback' | 'resolved';
    state: ErrorModalState;
};

type GlobalErrorDialogVisualQaRenderers = {
    content: (props: ComponentProps<typeof LazyGlobalErrorDialogContent>) => ReactNode;
};

interface GlobalErrorDialogProps {
    visualQaRenderers?: GlobalErrorDialogVisualQaRenderers;
    visualQaStateOverride?: GlobalErrorDialogVisualQaState;
}

const initialState: ErrorModalState = {
    isOpen: false,
    message: '',
    statusCode: null,
    errorId: null,
    source: 'api',
    onRetry: null,
};

const isVisualQaErrorState = (value: unknown): value is ErrorModalState => {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<ErrorModalState>;
    return typeof candidate.isOpen === 'boolean'
        && typeof candidate.message === 'string'
        && (candidate.statusCode === null || typeof candidate.statusCode === 'number')
        && (candidate.errorId === null || typeof candidate.errorId === 'string')
        && ['api', 'runtime', 'unhandled_rejection'].includes(candidate.source ?? '')
        && (candidate.onRetry === null || typeof candidate.onRetry === 'function');
};

const resolveVisualQaState = (
    requestedState: GlobalErrorDialogVisualQaState | undefined,
    renderers: GlobalErrorDialogVisualQaRenderers | undefined,
): GlobalErrorDialogVisualQaState | null => {
    if (import.meta.env?.PROD === true || !requestedState || requestedState.active !== true) return null;
    if (!['fallback', 'resolved'].includes(requestedState.phase)) return null;
    if (!isVisualQaErrorState(requestedState.state)) return null;
    if (requestedState.onClose !== undefined && typeof requestedState.onClose !== 'function') return null;
    if (requestedState.phase === 'resolved' && typeof renderers?.content !== 'function') return null;
    return requestedState;
};

const globalErrorDialogContentFallback = (
    <div
        data-testid="global-error-dialog-content-fallback"
        role="status"
        aria-busy="true"
        aria-live="polite"
        className="fixed top-1/2 z-[80] min-w-0 max-w-full -translate-y-1/2 rounded-xl border bg-white p-5 text-center text-gray-700 shadow-dialog [overflow-wrap:anywhere] dark:border-border dark:bg-card dark:text-white"
        style={{ left: '1rem', right: '1rem' }}
    >
        오류 안내를 불러오는 중...
    </div>
);

export default function GlobalErrorDialog({
    visualQaRenderers,
    visualQaStateOverride,
}: GlobalErrorDialogProps = {}) {
    const visualQaState = resolveVisualQaState(visualQaStateOverride, visualQaRenderers);
    const [state, setState] = useState<ErrorModalState>(() => visualQaState?.state ?? initialState);
    const getPrefixText = (code: number | null): string => {
        if (!code) return '⛔ 요청 실패';
        if (code === 404 || code === 409) return '⚠️ 오류 발생';
        if (code >= 500) return '🚨 시스템 오류';
        return '⛔ 요청 실패';
    };

    useEffect(() => {
        const handleGlobalError = (event: Event) => {
            const customEvent = event as CustomEvent<GlobalApiErrorDetail | undefined>;
            const errorData = customEvent.detail;
            if (shouldIgnoreGlobalApiError(errorData, window.location.pathname)) {
                return;
            }

            setState({
                isOpen: true,
                message: (errorData?.message || '').toString(),
                statusCode: errorData?.statusCode ?? null,
                errorId: errorData?.errorId ?? null,
                source: errorData?.source ?? 'api',
                onRetry: errorData?.onRetry ?? null,
            });
        };

        window.addEventListener('global-api-error', handleGlobalError);
        return () => {
            window.removeEventListener('global-api-error', handleGlobalError);
        };
    }, []);

    const closeErrorModal = () => {
        visualQaState?.onClose?.();
        setState(initialState);
    };

    if (!state.isOpen || (typeof window !== 'undefined' && window.Cypress)) return null;

    const handleRetry = state.onRetry
        ? async () => {
            closeErrorModal();
            await state.onRetry?.();
        }
        : null;

    const contentProps: ComponentProps<typeof LazyGlobalErrorDialogContent> = {
        isOpen: state.isOpen,
        message: state.message,
        statusCode: state.statusCode,
        errorId: state.errorId,
        source: state.source,
        prefixText: getPrefixText(state.statusCode),
        onRetry: handleRetry,
        closeErrorModal,
    };

    return (
        <Suspense fallback={globalErrorDialogContentFallback}>
            {visualQaState?.phase === 'fallback'
                ? globalErrorDialogContentFallback
                : visualQaState?.phase === 'resolved'
                    ? visualQaRenderers?.content(contentProps)
                    : <LazyGlobalErrorDialogContent {...contentProps} />}
        </Suspense>
    );
}
