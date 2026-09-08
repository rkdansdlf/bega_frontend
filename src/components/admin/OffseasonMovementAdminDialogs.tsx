import { useEffect, useState } from 'react';

import { AdminBadge } from './AdminPanelPrimitives';
import { FRANCHISE_TEAM_IDS, TEAM_DATA } from '../../constants/teams';
import type { AdminOffseasonMovement, AdminOffseasonMovementPayload } from '../../types/admin';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import PlainDialog from '../ui/plain-dialog';
import { Textarea } from '../ui/textarea';
import { AdminEditIcon, AdminPlusIcon, AdminRefreshIcon } from './AdminDetailIcons';

const NONE_VALUE = '__NONE__';
const SECTION_OPTIONS = ['FA', '트레이드', '외국인', '방출/웨이버', '군 관련', '기타'];

const TEAM_OPTIONS = FRANCHISE_TEAM_IDS.map((code) => ({
  code,
  name: TEAM_DATA[code]?.name || code,
  fullName: TEAM_DATA[code]?.fullName || code,
}));

const adminDialogSelectClassName =
  'min-h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-base text-slate-100 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60';

const adminDialogControlClassName = 'min-h-11 min-w-11 text-base';

const adminOffseasonCloseTouchStyle = `
[data-testid="admin-offseason-dialog"] button[aria-label="닫기"],
[data-testid="admin-offseason-delete-dialog"] button[aria-label="닫기"] {
  min-width: 44px;
  min-height: 44px;
  transition: transform 150ms ease;
}
[data-testid="admin-offseason-dialog"] button[aria-label="닫기"]:active,
[data-testid="admin-offseason-delete-dialog"] button[aria-label="닫기"]:active {
  transform: scale(0.98);
}
[data-testid="admin-offseason-dialog-cancel"],
[data-testid="admin-offseason-dialog-submit"],
[data-testid="admin-offseason-delete-cancel"],
[data-testid="admin-offseason-delete-confirm"] {
  transition: background-color 150ms ease, transform 150ms ease;
}
[data-testid="admin-offseason-dialog-cancel"]:active,
[data-testid="admin-offseason-dialog-submit"]:active,
[data-testid="admin-offseason-delete-cancel"]:active,
[data-testid="admin-offseason-delete-confirm"]:active {
  transform: scale(0.98);
}
[data-testid="admin-offseason-dialog-submit"]:active {
  background-color: rgb(110 231 183);
}
[data-testid="admin-offseason-delete-confirm"]:active {
  background-color: rgb(252 165 165);
}
.admin-offseason-preview-section {
  max-width: 45%;
}
`;

const adminFieldLabelClassName =
  'text-caption font-semibold text-slate-400';

const getSectionBadgeClass = (section: string) => {
  if (section.includes('FA')) {
    return 'bg-sky-500/20 text-sky-300 border-0';
  }
  if (section.includes('트레이드')) {
    return 'bg-orange-500/20 text-orange-300 border-0';
  }
  if (section.includes('외국인')) {
    return 'bg-amber-500/20 text-amber-300 border-0';
  }
  if (section.includes('방출') || section.includes('웨이버')) {
    return 'bg-slate-700 text-slate-200 border-0';
  }
  if (section.includes('군')) {
    return 'bg-emerald-500/20 text-emerald-300 border-0';
  }

  return 'bg-slate-700 text-slate-200 border-0';
};

export interface OffseasonMovementAdminDialogsProps {
  dialogOpen: boolean;
  editingMovement: AdminOffseasonMovement | null;
  deleteTarget: AdminOffseasonMovement | null;
  submitting: boolean;
  formData: AdminOffseasonMovementPayload;
  onDialogClose: () => void;
  onDeleteTargetChange: (movement: AdminOffseasonMovement | null) => void;
  onUpdateField: (field: keyof AdminOffseasonMovementPayload, value: string) => void;
  onSubmit: () => void;
  onDelete: () => void;
  visualQaControlledState?: true;
}

export default function OffseasonMovementAdminDialogs({
  dialogOpen,
  editingMovement,
  deleteTarget,
  submitting,
  formData: requestedFormData,
  onDialogClose,
  onDeleteTargetChange,
  onUpdateField,
  onSubmit,
  onDelete,
  visualQaControlledState,
}: OffseasonMovementAdminDialogsProps) {
  const useVisualQaControlledState = visualQaControlledState === true
    && import.meta.env?.PROD !== true;
  const [visualQaFormData, setVisualQaFormData] = useState(requestedFormData);
  const [visualQaUpdateEvidence, setVisualQaUpdateEvidence] = useState({
    count: 0,
    field: '',
    value: '',
  });
  const formData = useVisualQaControlledState ? visualQaFormData : requestedFormData;
  const handleUpdateField = useVisualQaControlledState
    ? (field: keyof AdminOffseasonMovementPayload, value: string) => {
      setVisualQaFormData((current) => ({ ...current, [field]: value }));
      onUpdateField(field, value);
      setVisualQaUpdateEvidence((current) => ({
        count: current.count + 1,
        field,
        value,
      }));
    }
    : onUpdateField;

  useEffect(() => {
    if (!dialogOpen && !deleteTarget) return;
    const closeButtons = document.querySelectorAll<HTMLElement>(
      '[data-testid="admin-offseason-dialog"] button[aria-label="닫기"], '
      + '[data-testid="admin-offseason-delete-dialog"] button[aria-label="닫기"]',
    );
    closeButtons.forEach((button) => button.setAttribute('data-vqa-min-touch', '44'));
  }, [deleteTarget, dialogOpen]);

  return (
    <>
      <style>{adminOffseasonCloseTouchStyle}</style>
      {useVisualQaControlledState ? (
        <span
          hidden
          data-testid="admin-offseason-dialogs-vqa-evidence"
          data-vqa-update-field-count={visualQaUpdateEvidence.count}
          data-vqa-update-field={visualQaUpdateEvidence.field}
          data-vqa-update-field-value={visualQaUpdateEvidence.value}
        />
      ) : null}
      <PlainDialog
        open={dialogOpen}
        onClose={onDialogClose}
        title={editingMovement ? '스토브리그 이동 수정' : '스토브리그 이동 추가'}
        description="`summary`는 목록에, `details`는 상세 패널 원문 메모에 노출됩니다."
        contentTestId="admin-offseason-dialog"
        className="sm:max-w-4xl border-slate-800 bg-slate-950 text-slate-100"
        bodyClassName="max-h-[70vh] overflow-y-auto p-5"
        footer={(
          <>
            <Button
              type="button"
              variant="outline"
              data-testid="admin-offseason-dialog-cancel"
              data-vqa-min-touch="44"
              onClick={onDialogClose}
              className={`${adminDialogControlClassName} border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800`}
            >
              취소
            </Button>
            <Button type="button" data-testid="admin-offseason-dialog-submit" data-vqa-min-touch="44" onClick={onSubmit} disabled={submitting} className={`${adminDialogControlClassName} bg-emerald-500 text-slate-950 hover:bg-emerald-400`}>
              {submitting ? (
                <>
                  <AdminRefreshIcon className="mr-2 h-4 w-4 animate-spin" />
                  저장 중
                </>
              ) : (
                <>
                  {editingMovement ? <AdminEditIcon className="mr-2 h-4 w-4" /> : <AdminPlusIcon className="mr-2 h-4 w-4" />}
                  {editingMovement ? '수정 저장' : '이동 등록'}
                </>
              )}
            </Button>
          </>
        )}
      >
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <p className={adminFieldLabelClassName}>이동 날짜</p>
              <Input
                aria-label="이동 날짜"
                type="date"
                data-testid="admin-offseason-movement-date"
                data-vqa-min-touch="44"
                value={formData.movementDate}
                onChange={(event) => handleUpdateField('movementDate', event.target.value)}
                className={`${adminDialogControlClassName} bg-slate-900 border-slate-700 text-slate-100`}
              />
            </div>
            <div className="space-y-2">
              <p className={adminFieldLabelClassName}>구분</p>
              <select
                aria-label="구분"
                data-testid="admin-offseason-dialog-section-trigger"
                data-vqa-min-touch="44"
                value={formData.section}
                onChange={(event) => handleUpdateField('section', event.target.value)}
                className={adminDialogSelectClassName}
              >
                {SECTION_OPTIONS.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <p className={adminFieldLabelClassName}>팀 코드</p>
              <select
                aria-label="팀 코드"
                data-testid="admin-offseason-dialog-team-trigger"
                data-vqa-min-touch="44"
                value={formData.teamCode}
                onChange={(event) => handleUpdateField('teamCode', event.target.value)}
                className={adminDialogSelectClassName}
              >
                {TEAM_OPTIONS.map((team) => (
                  <option key={team.code} value={team.code}>
                    {team.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <p className={adminFieldLabelClassName}>선수명</p>
              <Input
                aria-label="선수명"
                data-testid="admin-offseason-player-name"
                data-vqa-min-touch="44"
                value={formData.playerName}
                onChange={(event) => handleUpdateField('playerName', event.target.value)}
                className={`${adminDialogControlClassName} bg-slate-900 border-slate-700 text-slate-100`}
                placeholder="예: 박민재"
              />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_0.9fr]">
            <div className="space-y-2">
              <p className={adminFieldLabelClassName}>요약</p>
              <Textarea
                aria-label="요약"
                data-testid="admin-offseason-summary"
                data-vqa-min-touch="44"
                value={formData.summary}
                onChange={(event) => handleUpdateField('summary', event.target.value)}
                className={`${adminDialogControlClassName} min-h-[96px] bg-slate-900 border-slate-700 text-slate-100`}
                placeholder="예: 4년 총액 80억에 원소속팀 잔류"
              />
            </div>
            <div className="space-y-2">
              <p className={adminFieldLabelClassName}>상세 메모</p>
              <Textarea
                aria-label="상세 메모"
                data-testid="admin-offseason-details"
                data-vqa-min-touch="44"
                value={formData.details}
                onChange={(event) => handleUpdateField('details', event.target.value)}
                className={`${adminDialogControlClassName} min-h-[96px] bg-slate-900 border-slate-700 text-slate-100`}
                placeholder="계약 조건이나 공시 문구를 조금 더 길게 입력"
              />
            </div>
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="space-y-2">
                <p className={adminFieldLabelClassName}>계약 기간</p>
                <Input
                  aria-label="계약 기간"
                  data-testid="admin-offseason-contract-term"
                  data-vqa-min-touch="44"
                  value={formData.contractTerm}
                  onChange={(event) => handleUpdateField('contractTerm', event.target.value)}
                  className={`${adminDialogControlClassName} bg-slate-950 border-slate-700 text-slate-100`}
                  placeholder="4년"
                />
              </div>
              <div className="space-y-2">
                <p className={adminFieldLabelClassName}>계약 규모</p>
                <Input
                  aria-label="계약 규모"
                  data-testid="admin-offseason-contract-value"
                  value={formData.contractValue}
                  onChange={(event) => handleUpdateField('contractValue', event.target.value)}
                  className={`${adminDialogControlClassName} bg-slate-950 border-slate-700 text-slate-100`}
                  placeholder="4년 80억"
                />
              </div>
              <div className="space-y-2">
                <p className={adminFieldLabelClassName}>옵션</p>
                <Input
                  aria-label="옵션"
                  data-testid="admin-offseason-option-details"
                  value={formData.optionDetails}
                  onChange={(event) => handleUpdateField('optionDetails', event.target.value)}
                  className={`${adminDialogControlClassName} bg-slate-950 border-slate-700 text-slate-100`}
                  placeholder="옵션 5억 포함"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr_0.8fr_1fr]">
            <div className="space-y-2">
              <p className={adminFieldLabelClassName}>상대 구단</p>
              <select
                aria-label="상대 구단"
                data-testid="admin-offseason-counterparty-trigger"
                value={formData.counterpartyTeam || NONE_VALUE}
                onChange={(event) => handleUpdateField('counterpartyTeam', event.target.value === NONE_VALUE ? '' : event.target.value)}
                className={adminDialogSelectClassName}
              >
                <option value={NONE_VALUE}>없음</option>
                {TEAM_OPTIONS.map((team) => (
                  <option key={team.code} value={team.code}>
                    {team.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <p className={adminFieldLabelClassName}>반대급부</p>
              <Input
                aria-label="반대급부"
                data-testid="admin-offseason-counterparty-details"
                value={formData.counterpartyDetails}
                onChange={(event) => handleUpdateField('counterpartyDetails', event.target.value)}
                className={`${adminDialogControlClassName} bg-slate-900 border-slate-700 text-slate-100`}
                placeholder="예: 보상선수 없음 / 2대1 트레이드"
              />
            </div>
            <div className="space-y-2">
              <p className={adminFieldLabelClassName}>출처명</p>
              <Input
                aria-label="출처명"
                data-testid="admin-offseason-source-label"
                value={formData.sourceLabel}
                onChange={(event) => handleUpdateField('sourceLabel', event.target.value)}
                className={`${adminDialogControlClassName} bg-slate-900 border-slate-700 text-slate-100`}
                placeholder="구단 발표"
              />
            </div>
            <div className="space-y-2">
              <p className={adminFieldLabelClassName}>발표 시각</p>
              <Input
                aria-label="발표 시각"
                type="datetime-local"
                data-testid="admin-offseason-announced-at"
                value={formData.announcedAt}
                onChange={(event) => handleUpdateField('announcedAt', event.target.value)}
                className={`${adminDialogControlClassName} bg-slate-900 border-slate-700 text-slate-100`}
              />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_1.8fr]">
            <div className="space-y-2">
              <p className={adminFieldLabelClassName}>출처 URL</p>
              <Input
                aria-label="출처 URL"
                data-testid="admin-offseason-source-url"
                data-vqa-min-touch="44"
                value={formData.sourceUrl}
                onChange={(event) => handleUpdateField('sourceUrl', event.target.value)}
                className={`${adminDialogControlClassName} bg-slate-900 border-slate-700 text-slate-100`}
                placeholder="https://..."
              />
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className={adminFieldLabelClassName}>미리보기</p>
                <div className="mt-3 space-y-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="admin-offseason-preview-section inline-flex min-w-0" title={formData.section || '구분 없음'}>
                    <AdminBadge className={`${getSectionBadgeClass(formData.section)} max-w-full truncate`}>{formData.section || '구분 없음'}</AdminBadge>
                  </span>
                  <span title={TEAM_DATA[formData.teamCode]?.fullName || formData.teamCode} className="min-w-0 truncate text-caption text-slate-400">{TEAM_DATA[formData.teamCode]?.fullName || formData.teamCode}</span>
                </div>
                <p title={formData.playerName || '선수명'} className="text-lg font-semibold text-white [overflow-wrap:anywhere]">{formData.playerName || '선수명'}</p>
                <p title={formData.summary?.trim() || formData.details?.trim() || '요약을 입력하면 카드와 표에 이렇게 노출됩니다.'} className="text-caption leading-relaxed text-slate-300 [overflow-wrap:anywhere]">
                  {formData.summary?.trim() || formData.details?.trim() || '요약을 입력하면 카드와 표에 이렇게 노출됩니다.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </PlainDialog>

      <PlainDialog
        open={Boolean(deleteTarget)}
        onClose={() => onDeleteTargetChange(null)}
        title="스토브리그 이동 삭제"
        description={
          deleteTarget
            ? `${deleteTarget.playerName} · ${TEAM_DATA[deleteTarget.teamCode]?.fullName || deleteTarget.teamCode} 이동 정보를 삭제합니다.`
            : '선택한 이동 정보를 삭제합니다.'
        }
        contentTestId="admin-offseason-delete-dialog"
        className="sm:max-w-md border-slate-800 bg-slate-950 text-slate-100"
        footer={(
          <>
            <Button
              type="button"
              variant="outline"
              data-testid="admin-offseason-delete-cancel"
              data-vqa-min-touch="44"
              onClick={() => onDeleteTargetChange(null)}
              className={`${adminDialogControlClassName} border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800`}
            >
              취소
            </Button>
            <Button
              type="button"
              data-testid="admin-offseason-delete-confirm"
              data-vqa-min-touch="44"
              onClick={onDelete}
              disabled={submitting}
              className={`${adminDialogControlClassName} bg-red-500 text-white hover:bg-red-400`}
            >
              삭제
            </Button>
          </>
        )}
      >
        {deleteTarget ? (
          <p className="text-caption text-slate-400">
            삭제 후에는 동일한 이동 정보를 다시 입력해야 하며, 목록과 공개 페이지에서도 즉시 사라집니다.
          </p>
        ) : null}
      </PlainDialog>
    </>
  );
}
