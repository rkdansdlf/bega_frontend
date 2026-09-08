import { EndOfFeedCheckIcon } from './icons/EndOfFeedIcons';

export default function EndOfFeed() {
  return (
    <div data-testid="end-of-feed" className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-300">
        <EndOfFeedCheckIcon className="h-6 w-6" />
      </div>
      <h3 className="text-body font-bold text-slate-900 dark:text-slate-100">모든 응원을 확인했습니다</h3>
      <p className="mt-1 text-body text-slate-500 dark:text-slate-400">
        새로운 소식이 올라올 때까지 잠시만 기다려주세요!
      </p>
      <button
        type="button"
        data-testid="end-of-feed-top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="mt-4 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 text-body font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
      >
        처음으로 돌아가기
      </button>
    </div>
  );
}
