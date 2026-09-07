import { Button } from '../ui/button';
import PlainDialog from '../ui/plain-dialog';

interface AdminDeletePlaceDialogContentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function AdminDeletePlaceDialogContent({
  open,
  onOpenChange,
  onConfirm,
}: AdminDeletePlaceDialogContentProps) {
  return (
    <PlainDialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={(
        <span className="text-foreground [overflow-wrap:anywhere]">
          장소를 삭제하시겠습니까?
        </span>
      )}
      description={(
        <span className="text-muted-foreground [overflow-wrap:anywhere]">
          이 작업은 되돌릴 수 없습니다. 해당 장소 정보가 영구적으로 삭제됩니다.
        </span>
      )}
      contentTestId="admin-delete-place-dialog"
      className="sm:max-w-md"
      footer={(
        <>
          <Button
            data-testid="admin-delete-place-cancel"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            취소
          </Button>
          <Button
            data-testid="admin-delete-place-confirm"
            variant="destructive"
            onClick={onConfirm}
            className="w-full border-0 shadow-sm sm:w-auto"
          >
            삭제
          </Button>
        </>
      )}
    >
      <div className="text-caption text-muted-foreground [overflow-wrap:anywhere]">
        선택한 장소 정보가 완전히 제거됩니다.
      </div>
    </PlainDialog>
  );
}
