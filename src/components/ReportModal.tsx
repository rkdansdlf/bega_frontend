import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ReportReason, ReportReasonLabels, reportPost } from '../api/cheerApi';
import { toast } from 'sonner';
import PlainDialog from './ui/plain-dialog';

export type ReportModalVisualQaStateOverride = {
    reason?: ReportReason;
    description?: string;
    sourceUrl?: string;
    ownerContact?: string;
    license?: string;
    evidenceUrl?: string;
    requestedAction?: string;
    hasRightEvidence?: boolean;
    isSubmitting?: boolean;
    onSubmit?: () => void | Promise<void>;
};

interface ReportModalProps {
    postId: number | null;
    isOpen: boolean;
    onClose: () => void;
    visualQaStateOverride?: ReportModalVisualQaStateOverride;
}

export default function ReportModal({
    postId,
    isOpen,
    onClose,
    visualQaStateOverride: requestedVisualQaStateOverride,
}: ReportModalProps) {
    const visualQaStateOverride = import.meta.env?.PROD === true
        ? undefined
        : requestedVisualQaStateOverride;
    const [reason, setReason] = useState<ReportReason>(visualQaStateOverride?.reason ?? ReportReason.SPAM);
    const [description, setDescription] = useState(visualQaStateOverride?.description ?? '');
    const [sourceUrl, setSourceUrl] = useState(visualQaStateOverride?.sourceUrl ?? '');
    const [ownerContact, setOwnerContact] = useState(visualQaStateOverride?.ownerContact ?? '');
    const [license, setLicense] = useState(visualQaStateOverride?.license ?? '');
    const [evidenceUrl, setEvidenceUrl] = useState(visualQaStateOverride?.evidenceUrl ?? '');
    const [requestedAction, setRequestedAction] = useState(visualQaStateOverride?.requestedAction ?? '');
    const [hasRightEvidence, setHasRightEvidence] = useState(visualQaStateOverride?.hasRightEvidence ?? false);
    const [isSubmitting, setIsSubmitting] = useState(visualQaStateOverride?.isSubmitting ?? false);

    const handleSubmit = async () => {
        if (!postId) return;

        setIsSubmitting(true);
        try {
            if (visualQaStateOverride?.onSubmit) {
                await visualQaStateOverride.onSubmit();
            } else {
                const result = await reportPost(postId, {
                    reason,
                    description,
                    sourceUrl: sourceUrl || undefined,
                    ownerContact: ownerContact || undefined,
                    license: license || undefined,
                    evidenceUrl: evidenceUrl || undefined,
                    requestedAction: requestedAction || undefined,
                    requestedReason: description || undefined,
                    hasRightEvidence,
                });
                toast.success(`신고가 접수되었습니다. 케이스 ID: ${result.caseId}`);
            }
            onClose();
            // Reset form
            setReason(ReportReason.SPAM);
            setDescription('');
            setSourceUrl('');
            setOwnerContact('');
            setLicense('');
            setEvidenceUrl('');
            setRequestedAction('');
            setHasRightEvidence(false);
        } catch (error) {
            console.error('Failed to report post:', error);
            toast.error('신고 접수 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <PlainDialog
            open={isOpen}
            onClose={onClose}
            title="게시글 신고"
            className="max-w-[425px]"
            contentTestId="report-modal"
            footer={(
                <>
                    <Button
                        variant="outline"
                        data-testid="report-modal-cancel"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        취소
                    </Button>
                    <Button data-testid="report-modal-submit" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? '접수 중...' : '신고하기'}
                    </Button>
                </>
            )}
        >
            <p className="text-body text-gray-600 dark:text-white">
                신고 사유를 선택해주세요. 허위 신고 시 불이익을 받을 수 있습니다.
            </p>
            <div className="grid gap-4 py-4">
                <fieldset>
                    <legend className="mb-2 text-body font-semibold text-gray-700 dark:text-white">신고 사유 선택</legend>
                    <div className="grid gap-3" aria-label="신고 사유">
                        {Object.entries(ReportReasonLabels).map(([key, label]) => (
                            <label key={key} htmlFor={`r-${key}`} className="flex items-center space-x-2 text-body text-gray-700 dark:text-white">
                                <input
                                    id={`r-${key}`}
                                    type="radio"
                                    data-testid={`report-modal-reason-${key}`}
                                    name="report-reason"
                                    value={key}
                                    checked={reason === key}
                                    onChange={() => setReason(key as ReportReason)}
                                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                                />
                                <span>{label}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                <div className="grid gap-2">
                    <label htmlFor="description" className="text-body font-semibold text-gray-700 dark:text-white">추가 설명 (선택)</label>
                        <Textarea
                            id="description"
                            data-testid="report-modal-description"
                            placeholder="상세 내용을 입력해주세요."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <label htmlFor="sourceUrl" className="text-body font-semibold text-gray-700 dark:text-white">원문 URL (선택)</label>
                        <Textarea
                            id="sourceUrl"
                            data-testid="report-modal-source-url"
                            placeholder="원문 URL을 붙여넣으세요"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <label htmlFor="ownerContact" className="text-body font-semibold text-gray-700 dark:text-white">권리자/대리인 연락처 (선택)</label>
                        <Textarea
                            id="ownerContact"
                            data-testid="report-modal-owner-contact"
                            placeholder="이메일 또는 연락 가능한 정보"
                        value={ownerContact}
                        onChange={(e) => setOwnerContact(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <label htmlFor="license" className="text-body font-semibold text-gray-700 dark:text-white">라이선스 정보 (선택)</label>
                        <Textarea
                            id="license"
                            data-testid="report-modal-license"
                            placeholder="예: CC BY 4.0"
                        value={license}
                        onChange={(e) => setLicense(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <label htmlFor="evidenceUrl" className="text-body font-semibold text-gray-700 dark:text-white">증빙 링크 (선택)</label>
                        <Textarea
                            id="evidenceUrl"
                            data-testid="report-modal-evidence-url"
                            placeholder="증빙 자료 링크"
                        value={evidenceUrl}
                        onChange={(e) => setEvidenceUrl(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <label htmlFor="requestedAction" className="text-body font-semibold text-gray-700 dark:text-white">요청 조치 (선택)</label>
                        <Textarea
                            id="requestedAction"
                            data-testid="report-modal-requested-action"
                            placeholder="예: TAKE_DOWN"
                        value={requestedAction}
                        onChange={(e) => setRequestedAction(e.target.value)}
                    />
                </div>
                <label className="flex items-center gap-2 text-body text-gray-700 dark:text-white">
                    <input
                        type="checkbox"
                        data-testid="report-modal-right-evidence"
                        checked={hasRightEvidence}
                        onChange={(e) => setHasRightEvidence(e.target.checked)}
                    />
                    권리자 또는 대리인 증빙을 보유하고 있습니다.
                </label>
            </div>
        </PlainDialog>
    );
}
