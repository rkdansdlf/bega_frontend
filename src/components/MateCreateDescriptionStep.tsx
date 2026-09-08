import { MateCreateAlertCircleIcon as MateAlertCircleIcon } from './icons/MateCreateIcons';
import { Alert, AlertDescription } from './ui/alert';
import { Textarea } from './ui/textarea';
import { FieldLabel } from './MateCreatePrimitives';
import type { MateCreateFormErrors, PartyFormData } from '../utils/mateCreateDraft';

interface MateCreateDescriptionStepProps {
  formData: PartyFormData;
  formErrors: MateCreateFormErrors;
  onDescriptionChange: (text: string) => void;
  onDescriptionBlur: () => void;
}

const STYLE_TAGS = ['#열정응원🔥', '#공격때_기립🧍', '#조용한관람🤫', '#먹방진심🍗', '#유니폼필수👕', '#직관승요🧚'];

export default function MateCreateDescriptionStep({
  formData,
  formErrors,
  onDescriptionChange,
  onDescriptionBlur,
}: MateCreateDescriptionStepProps) {
  return (
    <div
      className="min-w-0 space-y-6"
      data-testid="mate-create-description-step"
    >
      <h2 className="mb-4 text-xl text-primary sm:mb-6 sm:text-2xl">
        파티 소개
      </h2>

      <div className="space-y-2">
        <FieldLabel htmlFor="description">소개글 <span className="text-red-500 ml-0.5">*</span></FieldLabel>
        <Textarea
          id="description"
          data-testid="mate-create-description-input"
          value={formData.description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          onBlur={onDescriptionBlur}
          placeholder="함께 야구를 즐길 메이트에게 하고 싶은 말을 작성해주세요..."
          className="min-h-[150px] min-w-0 [overflow-wrap:anywhere]"
          aria-describedby="description-hint description-count"
        />
        <div className="mt-2 flex min-w-0 flex-wrap gap-2">
          {STYLE_TAGS.map((tag, index) => {
            const isSelected = formData.description.includes(tag);
            return (
              <button
                type="button"
                key={tag}
                data-testid={`mate-create-description-tag-${index}`}
                aria-pressed={isSelected}
                className={`inline-flex min-h-11 max-w-full items-center justify-center whitespace-normal rounded-md px-3 py-2 text-body transition-colors [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  isSelected
                    ? 'bg-primary/10 font-semibold text-primary dark:bg-primary/15'
                    : 'bg-gray-100 text-gray-600 hover:bg-primary/10 hover:text-primary dark:bg-card dark:text-white dark:hover:bg-primary/30'
                }`}
                onClick={() => {
                  if (!isSelected) {
                    onDescriptionChange(`${formData.description} ${tag}`.trim());
                  }
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-1 text-body sm:flex-row sm:items-center sm:justify-between">
          <span
            id="description-hint"
            className={`min-w-0 [overflow-wrap:anywhere] ${
              formErrors.description ? 'text-red-500' : 'text-gray-500'
            }`}
          >
            {formErrors.description || '10자 이상 200자 이하'}
          </span>
          <span
            id="description-count"
            className={
              formData.description.length > 190
                ? 'min-w-0 font-semibold text-red-500 [overflow-wrap:anywhere]'
                : formData.description.length > 160
                  ? 'min-w-0 text-amber-500 [overflow-wrap:anywhere]'
                  : 'min-w-0 text-gray-500 [overflow-wrap:anywhere]'
            }
            aria-live="polite"
            aria-atomic="true"
          >
            {formData.description.length}/200자
          </span>
        </div>
      </div>

      <Alert className="min-w-0">
        <MateAlertCircleIcon className="w-4 h-4" />
        <AlertDescription className="min-w-0">
          <ul className="list-inside list-disc space-y-1 text-body [overflow-wrap:anywhere]">
            <li>금칙어나 비방 표현은 사용할 수 없습니다</li>
            <li>전화번호, 이메일 등 연락처는 입력할 수 없습니다</li>
            <li>매칭 후 채팅을 통해 소통할 수 있습니다</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
