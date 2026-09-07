import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div data-testid="not-found-page" className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md min-w-0 w-full text-center">
        {/* 404 숫자 */}
        <div className="relative mb-6">
          <span className="text-120 sm:text-160 font-black leading-none tracking-tighter text-gray-100 dark:text-white select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <span className="text-4xl font-black leading-none text-emerald-600 dark:text-emerald-400" aria-hidden="true">?</span>
            </div>
          </div>
        </div>

        {/* 메시지 */}
        <h1 className="break-words text-2xl font-bold text-gray-900 dark:text-white mb-2 [overflow-wrap:anywhere]">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="break-words text-gray-500 dark:text-white mb-8 [overflow-wrap:anywhere]">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>

        {/* 액션 버튼 */}
        <div className="flex w-full flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            data-testid="not-found-home"
            onClick={() => navigate('/home')}
            className="min-h-11 w-full sm:w-auto rounded-xl bg-emerald-600 px-6 py-2.5 text-base font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 active:scale-[0.98]"
          >
            홈으로 이동
          </button>
          <button
            type="button"
            data-testid="not-found-back"
            onClick={() => navigate(-1)}
            className="min-h-11 w-full sm:w-auto rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-6 py-2.5 text-base font-semibold text-gray-700 dark:text-white transition hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 active:scale-[0.98]"
          >
            이전 페이지로
          </button>
        </div>
      </div>
    </div>
  );
}
