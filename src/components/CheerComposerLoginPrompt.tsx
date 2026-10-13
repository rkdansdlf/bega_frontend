interface CheerComposerLoginPromptProps {
    teamColor: string;
    teamContrastText: string;
    onRequireLogin: (replace?: boolean) => void;
}

export default function CheerComposerLoginPrompt({
    teamColor,
    teamContrastText,
    onRequireLogin,
}: CheerComposerLoginPromptProps) {
    return (
        <div
            data-testid="cheer-composer-login-required"
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
            <div className="flex min-w-0 items-center gap-3">
                <div
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-lg font-black text-secondary-foreground"
                >
                    !
                </div>
                <div className="min-w-0">
                    <p className="text-15 font-bold text-foreground">로그인하고 응원에 참여해보세요</p>
                    <p className="mt-1 text-13 font-semibold leading-relaxed text-muted-foreground">
                        응원글을 작성하고 다른 팬들과 이야기를 나눌 수 있어요.
                    </p>
                </div>
            </div>
            <button
                type="button"
                data-testid="cheer-composer-login"
                onClick={() => onRequireLogin(false)}
                className="min-h-11 shrink-0 rounded-full px-5 py-2 text-15 font-bold transition-transform active:scale-[0.98]"
                style={{ backgroundColor: teamColor, color: teamContrastText }}
            >
                로그인하기
            </button>
        </div>
    );
}
