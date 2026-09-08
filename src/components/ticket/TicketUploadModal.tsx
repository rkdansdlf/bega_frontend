import React, { cloneElement, isValidElement, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { analyzeTicket, TicketInfo } from '@/api/ticket';
import {
    TicketUploadCheckCircleIcon as SharedCheckCircleIcon,
    TicketUploadLoaderIcon as SharedLoaderIcon,
    TicketUploadTicketIcon as SharedTicketIcon,
    TicketUploadUploadIcon as SharedUploadIcon,
} from '@/components/icons/TicketUploadIcons';
import { toast } from 'sonner';
import PlainDialog from '@/components/ui/plain-dialog';

interface TicketUploadInitialState {
    isLoading?: boolean;
    ticketData?: TicketInfo | null;
    previewUrl?: string | null;
    analysisError?: string | null;
}

interface TicketUploadModalProps {
    onTicketAnalyzed?: (data: TicketInfo) => void;
    onConfirm?: (data: TicketInfo) => void;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    analyzeTicketFile?: typeof analyzeTicket;
    initialState?: TicketUploadInitialState;
}

const mobileBodyScrollStyle = { scrollPaddingBlock: '6rem' } as const;

export function TicketUploadModal({
    onTicketAnalyzed,
    onConfirm,
    trigger,
    open,
    onOpenChange,
    analyzeTicketFile = analyzeTicket,
    initialState = {},
}: TicketUploadModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(initialState.isLoading ?? false);
    const [ticketData, setTicketData] = useState<TicketInfo | null>(initialState.ticketData ?? null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialState.previewUrl ?? null);
    const [analysisError, setAnalysisError] = useState<string | null>(initialState.analysisError ?? null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isControlled = open !== undefined;
    const resolvedOpen = isControlled ? open : internalOpen;
    const defaultTrigger = (
        <Button variant="outline" className="gap-2">
            <SharedTicketIcon className="w-4 h-4" />
            티켓 등록하기
        </Button>
    );
    const triggerContent = trigger === undefined ? defaultTrigger : trigger;

    const handleOpenChange = (newOpen: boolean) => {
        if (!isControlled) {
            setInternalOpen(newOpen);
        }
        onOpenChange?.(newOpen);
    };

    useEffect(() => {
        return () => {
            if (previewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (previewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }

        // Create preview
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setTicketData(null);
        setAnalysisError(null);

        // Upload and analyze
        setIsLoading(true);
        try {
            const data = await analyzeTicketFile(file);
            setTicketData(data);
            toast.success('티켓 분석이 완료되었습니다!');
            if (onTicketAnalyzed) {
                onTicketAnalyzed(data);
            }
        } catch (error) {
            console.error('Ticket analysis failed:', error);
            const fallback = '티켓 분석에 실패했습니다. 이미지를 다시 확인해주세요.';
            setAnalysisError(error instanceof Error && error.message.trim() ? error.message : fallback);
            toast.error(fallback);
            setTicketData(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFieldChange = (field: keyof TicketInfo, value: string | number | null) => {
        if (!ticketData) return;
        setTicketData({
            ...ticketData,
            [field]: value
        });
    };

    const handleConfirm = () => {
        if (!ticketData) return;
        if (onConfirm) {
            onConfirm(ticketData);
        }
        handleOpenChange(false);
    };

    const resetForm = () => {
        if (previewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        setTicketData(null);
        setPreviewUrl(null);
        setAnalysisError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const renderTrigger = () => {
        if (triggerContent === null) {
            return null;
        }

        if (triggerContent && isValidElement<{ onClick?: (event: MouseEvent<HTMLElement>) => void }>(triggerContent)) {
            const originalOnClick = triggerContent.props.onClick;
            return cloneElement(triggerContent, {
                onClick: (event: MouseEvent<HTMLElement>) => {
                    originalOnClick?.(event);
                    if (!event.defaultPrevented) {
                        handleOpenChange(true);
                    }
                },
            });
        }

        return (
            <span className="contents" onClick={() => handleOpenChange(true)}>
                {triggerContent}
            </span>
        );
    };

    return (
        <>
            {renderTrigger()}
            <PlainDialog
                open={resolvedOpen}
                onClose={() => handleOpenChange(false)}
                title="티켓 이미지 업로드"
                description="티켓 이미지를 올리면 날짜, 좌석, 매치업 정보를 자동으로 추출합니다."
                contentTestId="ticket-upload-dialog"
                className="sm:max-w-md"
                bodyStyle={mobileBodyScrollStyle}
                footer={(
                    <>
                        <Button
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            data-testid="ticket-upload-cancel"
                        >
                            취소
                        </Button>
                        {ticketData ? (
                            <Button
                                onClick={handleConfirm}
                                className="bg-primary hover:bg-primary/90 text-white font-bold"
                                data-testid="ticket-upload-confirm"
                            >
                                기록하러 가기
                            </Button>
                        ) : (
                            <Button
                                disabled={!previewUrl || isLoading}
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-primary hover:bg-primary/90 text-white font-bold"
                                data-testid="ticket-upload-analyze"
                            >
                                이미지 분석하기
                            </Button>
                        )}
                    </>
                )}
            >
                <div className="flex flex-col gap-6 pb-20 pt-1 sm:pb-1">
                    {/* Upload Area */}
                    <div className="grid w-full items-center gap-1.5">
                        {!previewUrl ? (
                            <button
                                type="button"
                                className="flex min-h-44 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center text-muted-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-12"
                                onClick={() => fileInputRef.current?.click()}
                                data-testid="ticket-upload-dropzone"
                            >
                                <SharedUploadIcon className="w-10 h-10 mb-4 opacity-50" />
                                <p className="text-body font-semibold">티켓 이미지를 업로드하세요</p>
                                <p className="text-body text-muted-foreground mt-1">또는 클릭하여 촬영</p>
                            </button>
                        ) : (
                            <div className="relative rounded-lg overflow-hidden border border-border aspect-video bg-black/5">
                                <img src={previewUrl} alt="Ticket Preview" className="w-full h-full object-contain" />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 bg-black/20 hover:bg-black/40 text-white rounded-full"
                                    onClick={resetForm}
                                    aria-label="선택한 티켓 이미지 제거"
                                    data-testid="ticket-upload-reset"
                                >
                                    ✕
                                </Button>
                            </div>
                        )}
                        <Input
                            ref={fileInputRef}
                            id="ticket-image"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Analysis Result */}
                    {isLoading && (
                        <div
                            className="flex items-center justify-center py-8 flex-col gap-3 text-muted-foreground"
                            role="status"
                            data-testid="ticket-upload-loading"
                        >
                            <SharedLoaderIcon className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-body font-semibold animate-pulse">AI가 티켓 정보를 분석 중입니다...</p>
                        </div>
                    )}

                    {!isLoading && analysisError && (
                        <div
                            className="min-w-0 break-words rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-body font-semibold text-destructive"
                            role="alert"
                            data-testid="ticket-upload-error"
                        >
                            {analysisError}
                        </div>
                    )}

                    {!isLoading && ticketData && (
                        <div
                            className="bg-muted/30 rounded-lg p-4 space-y-4 border border-border"
                            data-testid="ticket-upload-result"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/50">
                                <div className="flex items-center gap-2 text-green-600 font-bold">
                                    <SharedCheckCircleIcon className="w-4 h-4" />
                                    분석 완료
                                </div>
                                {ticketData.gameId && (
                                        <span className="max-w-full break-words rounded-full bg-primary/10 px-2 py-0.5 text-center text-body font-bold text-primary">
                                        경기 일정 매칭됨
                                    </span>
                                )}
                            </div>

                            <div className="grid gap-4">
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                                    <label htmlFor="date" className="text-left text-body sm:text-right">날짜</label>
                                    <Input
                                        id="date"
                                        value={ticketData.date || ''}
                                        onChange={(e) => handleFieldChange('date', e.target.value)}
                                        className="h-11 text-body sm:h-8 sm:col-span-3"
                                        placeholder="YYYY-MM-DD"
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                                    <label htmlFor="stadium" className="text-left text-body sm:text-right">구장</label>
                                    <Input
                                        id="stadium"
                                        value={ticketData.stadium || ''}
                                        onChange={(e) => handleFieldChange('stadium', e.target.value)}
                                        className="h-11 text-body sm:h-8 sm:col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                                    <label htmlFor="away-team" className="text-left text-body sm:text-right">매치업</label>
                                    <div className="flex min-w-0 flex-col items-stretch gap-2 sm:col-span-3 sm:flex-row sm:items-center">
                                        <Input
                                            id="away-team"
                                            value={ticketData.awayTeam || ''}
                                            onChange={(e) => handleFieldChange('awayTeam', e.target.value)}
                                            className="h-11 min-w-0 text-body sm:h-8"
                                            placeholder="원정"
                                        />
                                        <span className="text-center text-body">vs</span>
                                        <Input
                                            id="home-team"
                                            value={ticketData.homeTeam || ''}
                                            onChange={(e) => handleFieldChange('homeTeam', e.target.value)}
                                            className="h-11 min-w-0 text-body sm:h-8"
                                            placeholder="홈"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4">
                                    <label htmlFor="section" className="text-left text-body sm:text-right">좌석</label>
                                    <div className="grid grid-cols-1 gap-2 sm:col-span-3 sm:grid-cols-3">
                                        <Input
                                            id="section"
                                            value={ticketData.section || ''}
                                            onChange={(e) => handleFieldChange('section', e.target.value)}
                                            className="h-11 min-w-0 px-2 text-body sm:h-8"
                                            placeholder="구역"
                                        />
                                        <Input
                                            id="row"
                                            value={ticketData.row || ''}
                                            onChange={(e) => handleFieldChange('row', e.target.value)}
                                            className="h-11 min-w-0 px-2 text-body sm:h-8"
                                            placeholder="열"
                                        />
                                        <Input
                                            id="seat"
                                            value={ticketData.seat || ''}
                                            onChange={(e) => handleFieldChange('seat', e.target.value)}
                                            className="h-11 min-w-0 px-2 text-body sm:h-8"
                                            placeholder="번호"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </PlainDialog>
        </>
    );
}
